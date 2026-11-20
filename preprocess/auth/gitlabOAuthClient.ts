/**
 * GitLab OAuth Client with automatic token refresh
 * Manages access tokens, refresh tokens, and provides authenticated API requests
 */

import { refreshAccessToken } from "../pkceUtils";
import {
  getRetryDelayMs,
  parseRetryAfterMs,
  waitForRetryDelay as wait,
} from "../retry";
import {
  saveTokensToStorage,
  loadTokensFromStorage,
  clearTokensFromStorage,
  StoredTokenData,
} from "./storage";

async function readAllowlistedErrorMessage(
  response: Response,
): Promise<string | undefined> {
  try {
    const data = await response.clone().json();
    return typeof data?.message === "string"
      ? data.message.slice(0, 200)
      : undefined;
  } catch {
    return undefined;
  }
}

const API_REQUEST_MAX_FETCHES = 6;
const API_REQUEST_BUDGET_MS = 30_000;

const responseError = async (
  response: Response,
  endpoint: string,
  method: string,
): Promise<Error> => {
  const responseMessage = await readAllowlistedErrorMessage(response);
  return Object.assign(
    new Error(`API request failed: ${response.status} ${response.statusText}`),
    {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      method,
      responseMessage,
    },
  );
};

export interface OAuthClientConfig {
  clientId: string;
  redirectUri: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  baseUrl?: string;
}

/**
 * OAuth client for managing tokens and making authenticated API requests
 */
export class GitLabOAuthClient {
  private clientId: string;
  private redirectUri: string;
  private accessToken: string;
  private refreshToken: string | null;
  private expiresAt: number | null;
  private baseUrl: string;
  private refreshPromise: Promise<void> | null = null; // Prevent concurrent refreshes

  /**
   * Create a new GitLabOAuthClient instance
   * @param config - Client configuration with tokens
   */
  constructor(config: OAuthClientConfig) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.expiresAt = config.expiresAt;
    this.baseUrl = config.baseUrl || "https://gitlab.pavlovia.org";
  }

  /**
   * Get the current access token
   * @returns Current access token
   */
  getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Get the current refresh token
   * @returns Current refresh token or null if not available
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Get the token expiration timestamp
   * @returns Expiration timestamp in milliseconds or null if no expiration
   */
  getExpiresAt(): number | null {
    return this.expiresAt;
  }

  /**
   * Check if the access token has expired
   * @returns true if token is expired, false otherwise
   */
  isTokenExpired(): boolean {
    if (!this.expiresAt) {
      // No expiration time means token doesn't expire (or we don't know)
      return false;
    }
    // Add 60 second buffer to refresh before actual expiration
    return Date.now() >= this.expiresAt - 60000;
  }

  /**
   * Ensure the access token is valid, refreshing if necessary
   * This method is called before every API request
   */
  async ensureValidToken(): Promise<void> {
    // If already refreshing, wait for that to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // If token is not expired, nothing to do
    if (!this.isTokenExpired()) {
      return;
    }

    // If we don't have a refresh token, we can't refresh
    if (!this.refreshToken) {
      throw new Error("AUTH_TOKEN_EXPIRED_NO_REFRESH");
    }

    // Start refresh (store promise to prevent concurrent refreshes)
    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   * @private
   */
  private async performTokenRefresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const tokenData = await refreshAccessToken(
        this.refreshToken,
        this.clientId,
        this.redirectUri,
      );

      // Update tokens
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      this.expiresAt = Date.now() + tokenData.expires_in * 1000;

      // Save to storage
      this.saveTokens();
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw new Error("AUTH_TOKEN_REFRESH_FAILED");
    }
  }

  /**
   * Make an authenticated API request to GitLab.
   *
   * Retries 429, 5xx, and network TypeError within a six-fetch, 30-second
   * retry/GET-stall budget. Non-GET requests have no timeout, but caller
   * cancellation is honored. A 401 triggers at most one token refresh per
   * request and does not reset that budget; a repeated 401 is an
   * authentication failure. Throws immediately on 403, 404, 409, 422, and
   * any other 4xx.
   * Status codes listed in `expectedStatuses` are returned as a raw Response
   * rather than thrown.
   *
   * When the server returns a `Retry-After` header, that delay is used instead
   * of exponential back-off.
   *
   * @param endpoint - API endpoint, e.g. '/user' or '/projects?per_page=100'
   * @param options - Standard fetch options plus optional `expectedStatuses`
   * @returns The raw `Response`.
   */
  async apiRequest(
    endpoint: string,
    options: RequestInit & { expectedStatuses?: number[] } = {},
  ): Promise<Response> {
    const {
      expectedStatuses = [],
      signal: callerSignal,
      ...fetchOptions
    } = options;
    const callerAbortError = () =>
      callerSignal?.reason ??
      Object.assign(new Error("Request cancelled by caller"), {
        name: "AbortError",
      });
    const throwIfCallerAborted = () => {
      if (callerSignal?.aborted) throw callerAbortError();
    };
    const startedAt = Date.now();
    throwIfCallerAborted();
    await this.ensureValidToken();
    throwIfCallerAborted();

    const url = `${this.baseUrl}/api/v4${endpoint}`;

    const buildHeaders = () => {
      const h = new Headers(fetchOptions.headers);
      h.set("Authorization", `Bearer ${this.accessToken}`);
      return h;
    };

    const isGet =
      !fetchOptions.method || fetchOptions.method.toUpperCase() === "GET";
    let attempt = 0;
    let fetchCount = 0;
    let refreshedAfter401 = false;
    const method = fetchOptions.method ?? "GET";
    const elapsed = () => Date.now() - startedAt;
    const budgetError = () =>
      Object.assign(
        new Error(
          `API request exceeded the ${API_REQUEST_BUDGET_MS} ms request budget`,
        ),
        { code: "API_REQUEST_TIMEOUT", endpoint, method },
      );
    const canRetryAfter = (delayMs: number) =>
      fetchCount < API_REQUEST_MAX_FETCHES &&
      elapsed() + delayMs < API_REQUEST_BUDGET_MS;

    while (true) {
      throwIfCallerAborted();
      if (fetchCount >= API_REQUEST_MAX_FETCHES) throw budgetError();
      const remainingMs = API_REQUEST_BUDGET_MS - elapsed();
      if (remainingMs <= 0) throw budgetError();
      fetchCount++;
      let controller: AbortController | undefined;
      let timerId: ReturnType<typeof setTimeout> | undefined;
      let removeCallerAbortListener = () => {};
      if (isGet || callerSignal) {
        controller = new AbortController();
        if (callerSignal) {
          const abort = () => controller!.abort(callerSignal.reason);
          if (callerSignal.aborted) abort();
          else {
            callerSignal.addEventListener("abort", abort, { once: true });
            removeCallerAbortListener = () =>
              callerSignal.removeEventListener("abort", abort);
          }
        }
      }
      if (isGet) {
        controller = new AbortController();
        timerId = setTimeout(
          () => controller!.abort(),
          Math.min(15_000, remainingMs),
        );
      }

      try {
        let response: Response;
        try {
          response = await fetch(url, {
            ...fetchOptions,
            headers: buildHeaders(),
            ...(controller ? { signal: controller.signal } : {}),
          });
        } catch (e) {
          if (callerSignal?.aborted) throw e;
          if (
            e instanceof TypeError ||
            (e instanceof DOMException && e.name === "AbortError")
          ) {
            const delayMs = getRetryDelayMs(attempt++);
            if (!canRetryAfter(delayMs)) throw e;
            await wait(delayMs);
            continue;
          }
          throw e;
        }

        const { status } = response;

        if (expectedStatuses.includes(status)) return response;
        if (response.ok) return response;

        if (status === 401) {
          if (
            refreshedAfter401 ||
            fetchCount >= API_REQUEST_MAX_FETCHES ||
            elapsed() >= API_REQUEST_BUDGET_MS
          )
            throw new Error("AUTH_TOKEN_INVALID");
          refreshedAfter401 = true;
          if (!this.refreshPromise) {
            this.refreshPromise = this.performTokenRefresh().finally(() => {
              this.refreshPromise = null;
            });
          }
          try {
            await this.refreshPromise;
          } catch {
            throw new Error("AUTH_TOKEN_INVALID");
          }
          // Re-enter the sole fetch/response path so the refreshed request gets
          // the same timeout, network, 429, and 5xx handling as every other try.
          continue;
        }

        if (status === 429 || (status >= 500 && status <= 599)) {
          const retryAfterHeader = response.headers.get("Retry-After");
          const delay =
            parseRetryAfterMs(retryAfterHeader) ?? getRetryDelayMs(attempt);
          attempt++;
          if (!canRetryAfter(delay))
            throw await responseError(response, endpoint, method);
          await wait(delay);
          continue;
        }

        throw await responseError(response, endpoint, method);
      } finally {
        clearTimeout(timerId);
        removeCallerAbortListener();
      }
    }
  }

  /**
   * Save tokens to localStorage
   */
  saveTokens(): void {
    const data: StoredTokenData = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      createdAt: Date.now(),
    };

    saveTokensToStorage(data);
  }

  /**
   * Clear tokens from localStorage and reset client state
   */
  clearTokens(): void {
    clearTokensFromStorage();
    this.accessToken = "";
    this.refreshToken = null;
    this.expiresAt = null;
  }

  /**
   * Load an existing OAuth client from localStorage
   * @param clientId - GitLab application client ID
   * @param redirectUri - Redirect URI
   * @returns GitLabOAuthClient instance or null if no valid tokens found
   */
  static loadFromStorage(
    clientId: string,
    redirectUri: string,
  ): GitLabOAuthClient | null {
    const stored = loadTokensFromStorage();

    if (!stored) {
      return null;
    }

    // Validate that clientId matches
    if (stored.clientId !== clientId) {
      console.warn("Client ID mismatch in stored tokens");
      clearTokensFromStorage();
      return null;
    }

    // Create new client instance with stored data
    return new GitLabOAuthClient({
      clientId: stored.clientId,
      redirectUri: stored.redirectUri,
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      expiresAt: stored.expiresAt,
    });
  }
}
