/**
 * @jest-environment jsdom
 */

import {
  buildSpeechTokenEndpoint,
  createSpeechTokenProvider,
  createSpeechCredentialProvider,
} from "../components/speech/speechToken";
import { TranscriberError } from "../components/speech/transcriber";

describe("buildSpeechTokenEndpoint", () => {
  it.each([
    [
      "https://easyeyes.app",
      "https://easyeyes.app/.netlify/functions/speech-token",
    ],
    [
      "https://deploy-preview-123--easyeyes.netlify.app",
      "https://deploy-preview-123--easyeyes.netlify.app/.netlify/functions/speech-token",
    ],
    [
      "http://localhost:8888",
      "http://localhost:8888/.netlify/functions/speech-token",
    ],
  ])("accepts a trusted EasyEyes service origin", (base, expected) => {
    expect(buildSpeechTokenEndpoint(base)).toBe(expected);
  });

  it.each([
    "https://attacker.example",
    "https://easyeyes.app.attacker.example",
    "http://easyeyes.app",
    "https://user:password@easyeyes.app",
    "not a URL",
  ])("rejects an untrusted service origin", (base) => {
    expect(() => buildSpeechTokenEndpoint(base)).toThrow(TranscriberError);
  });
});

describe("createSpeechTokenProvider", () => {
  it("returns the relay address only for Chirp 3", async () => {
    const provider = createSpeechCredentialProvider("chirp3", {
      endpoint: "https://easyeyes.app/.netlify/functions/speech-token",
      requestContext: () => ({
        experimentFullPath: "owner/test",
        pavloviaSessionToken: "session",
      }),
      fetchImpl: jest.fn(async () => ({
        ok: true,
        json: async () => ({
          token: "ticket",
          websocketUrl: "wss://relay.run.app/v1/stream",
        }),
      })) as unknown as typeof fetch,
    });
    await expect(provider()).resolves.toEqual({
      token: "ticket",
      websocketUrl: "wss://relay.run.app/v1/stream",
    });
  });

  it.each([
    "ws://relay.run.app/v1/stream",
    "wss://user:secret@relay.run.app/v1/stream",
    "wss://relay.run.app/v1/stream?token=secret",
  ])("rejects an unsafe relay address %s", async (websocketUrl) => {
    const provider = createSpeechCredentialProvider("chirp3", {
      endpoint: "https://easyeyes.app/.netlify/functions/speech-token",
      requestContext: () => ({
        experimentFullPath: "owner/test",
        pavloviaSessionToken: "session",
      }),
      fetchImpl: jest.fn(async () => ({
        ok: true,
        json: async () => ({ token: "ticket", websocketUrl }),
      })) as unknown as typeof fetch,
    });
    await expect(provider()).rejects.toMatchObject({
      code: "credentialFailure",
    });
  });
  it("does not send a Pavlovia session to an untrusted default endpoint", async () => {
    window.history.replaceState(
      {},
      "",
      "/?preview-deploy=https%3A%2F%2Fattacker.example",
    );
    const fetchImpl = jest.fn();
    const provider = createSpeechTokenProvider("elevenlabs", {
      requestContext: () => ({
        experimentFullPath: "scientist/study",
        pavloviaSessionToken: "private-session-token",
      }),
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(provider()).rejects.toMatchObject({
      code: "invalidConfiguration",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
