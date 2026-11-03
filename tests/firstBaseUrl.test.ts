/** @jest-environment jsdom */

import { jest } from "@jest/globals";

jest.mock("../components/timeoutUtils.js", () => ({ initProgress: {} }));
jest.mock("../components/sentry", () => ({}));
jest.mock("../components/loadingScreenText", () => ({
  localizeLoadingScreen: jest.fn(),
}));

import { getBaseUrl } from "../first.js";

beforeEach(() => {
  window.history.pushState({}, "", "/examples/generated/test/index.html");
  (global as any).fetch = jest.fn();
});

test("uses the local backend when its probe answers", async () => {
  (global as any).fetch.mockResolvedValue({});

  await expect(getBaseUrl()).resolves.toBe("http://localhost:8888");
  expect((global as any).fetch).toHaveBeenCalledWith("http://localhost:8888", {
    method: "HEAD",
    mode: "no-cors",
  });
});

test("falls back to production when no local backend answers", async () => {
  (global as any).fetch.mockRejectedValue(new Error("connection refused"));

  await expect(getBaseUrl()).resolves.toBe("https://easyeyes.app");
});

test("preview-deploy bypasses the localhost probe", async () => {
  window.history.pushState(
    {},
    "",
    "/examples/generated/test/index.html?preview-deploy=http://localhost:5701",
  );

  await expect(getBaseUrl()).resolves.toBe("http://localhost:5701");
  expect((global as any).fetch).not.toHaveBeenCalled();
});
