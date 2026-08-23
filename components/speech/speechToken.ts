import { getEasyEyesBaseUrl } from "../easyeyesBaseUrl";
import { TranscriberError } from "./transcriber";

export type SpeechProvider = "elevenlabs" | "deepgram";

export interface SpeechTokenRequestContext {
  readonly experimentFullPath: string;
  readonly pavloviaSessionToken: string;
}

export interface SpeechTokenProviderOptions {
  readonly requestContext: () => SpeechTokenRequestContext;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

const SPEECH_TOKEN_PATH = "/.netlify/functions/speech-token";
const SPEECH_TOKEN_PROTOCOL_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 5000;
const PRODUCTION_ORIGIN = "https://easyeyes.app";
const NETLIFY_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+--easyeyes\.netlify\.app$/;
const LOCAL_DEVELOPMENT_ORIGIN = /^http:\/\/localhost:\d+$/;

export const buildSpeechTokenEndpoint = (baseUrl: string): string => {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new TranscriberError(
      "invalidConfiguration",
      "The speech credential service URL is invalid.",
    );
  }

  const trusted =
    base.origin === PRODUCTION_ORIGIN ||
    NETLIFY_PREVIEW_ORIGIN.test(base.origin) ||
    LOCAL_DEVELOPMENT_ORIGIN.test(base.origin);
  if (!trusted || base.username || base.password) {
    throw new TranscriberError(
      "invalidConfiguration",
      "The speech credential service URL is not trusted.",
    );
  }

  return `${base.origin}${SPEECH_TOKEN_PATH}`;
};

export const createSpeechTokenProvider = (
  provider: SpeechProvider,
  options: SpeechTokenProviderOptions,
): (() => Promise<string>) => {
  if (!options || typeof options.requestContext !== "function") {
    throw new TranscriberError(
      "invalidConfiguration",
      "A Pavlovia session context provider is required.",
    );
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TranscriberError(
      "invalidConfiguration",
      "Token request timeout must be a finite positive number.",
    );
  }

  return async () => {
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new TranscriberError(
        "unsupported",
        "Credential requests are unavailable in this browser.",
      );
    }
    const endpoint =
      options.endpoint ?? buildSpeechTokenEndpoint(await getEasyEyesBaseUrl());
    const context = options.requestContext();
    if (
      !context.experimentFullPath.trim() ||
      !context.pavloviaSessionToken.trim()
    ) {
      throw new TranscriberError(
        "credentialFailure",
        "The active Pavlovia session is unavailable.",
      );
    }

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(
      () => controller.abort(),
      timeoutMs,
    );
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocolVersion: SPEECH_TOKEN_PROTOCOL_VERSION,
          provider,
          experimentFullPath: context.experimentFullPath,
          pavloviaSessionToken: context.pavloviaSessionToken,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new TranscriberError(
          "credentialFailure",
          "A realtime transcription credential could not be issued.",
          { retryable: response.status === 429 || response.status >= 500 },
        );
      }
      const body = (await response.json()) as { token?: unknown };
      if (typeof body.token !== "string" || !body.token.trim()) {
        throw new TranscriberError(
          "credentialFailure",
          "The credential service returned an invalid response.",
          { retryable: true },
        );
      }
      return body.token;
    } catch (error) {
      if (error instanceof TranscriberError) throw error;
      throw new TranscriberError(
        "credentialFailure",
        "The realtime transcription credential request failed.",
        { retryable: true, originalError: error },
      );
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  };
};
