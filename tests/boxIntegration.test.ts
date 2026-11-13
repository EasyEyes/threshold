/**
 * @jest-environment node
 *
 * Snapshot upload (Box). A failed upload must never throw into the caller: it
 * reports to Sentry and resolves to null so a snapshot failure cannot abort a
 * participant's run.
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

const captureError = jest.fn();
const getEasyEyesBaseUrl = jest.fn(async () => "https://easyeyes.app");

jest.mock("../../source/sentry", () => ({ captureError }));
jest.mock("../components/easyeyesBaseUrl", () => ({ getEasyEyesBaseUrl }));

import { saveSnapshot } from "../components/save-snapshots/boxIntegration";

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const errorResponse = (status: number, body: unknown) => ({
  ok: false,
  status,
  statusText: `status ${status}`,
  json: async () => body,
});

let fetchMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = jest.fn();
  (globalThis as any).fetch = fetchMock;
});

describe("saveSnapshot", () => {
  test("posts the image + ids to the box-api function and returns its body", async () => {
    fetchMock.mockResolvedValue(okResponse({ url: "https://box/1.png" }));
    const result = await saveSnapshot(
      "data:image/png;base64,AAA",
      "exp-1",
      "p-1",
    );

    expect(result).toEqual({ url: "https://box/1.png" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://easyeyes.app/.netlify/functions/box-api");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      image: "data:image/png;base64,AAA",
      experimentID: "exp-1",
      participantID: "p-1",
    });
  });

  test("a rejected upload reports to sentry and resolves null", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(413, { error: "image too large" }),
    );
    const result = await saveSnapshot("data:image/png;base64,AAA", "e", "p");

    expect(result).toBeNull();
    expect(captureError).toHaveBeenCalledTimes(1);
    const [error, context] = captureError.mock.calls[0] as [Error, string];
    expect(context).toBe("Snapshot upload error");
    expect(error.message).toBe(
      "Box upload failed: image too large (Status: 413)",
    );
  });

  test("a non-JSON error body still yields a usable message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });
    const result = await saveSnapshot("img", "e", "p");
    expect(result).toBeNull();
    const [error] = captureError.mock.calls[0] as [Error, string];
    expect(error.message).toContain("Internal Server Error");
    expect(error.message).toContain("500");
  });

  test("a network failure is reported, not thrown", async () => {
    const boom = new Error("offline");
    fetchMock.mockRejectedValue(boom);
    await expect(saveSnapshot("img", "e", "p")).resolves.toBeNull();
    expect(captureError).toHaveBeenCalledWith(boom, "Snapshot upload error");
  });
});
