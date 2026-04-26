/**
 * GitLab OAuth Client with automatic token refresh
 * Manages access tokens, refresh tokens, and provides authenticated API requests
 */

import { refreshAccessToken } from "../pkceUtils";
import {
  saveTokensToStorage,
  loadTokensFromStorage,
  clearTokensFromStorage,
  StoredTokenData,
} from "./storage";

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
   * Automatically refreshes the access token if it has expired, and retries
   * once on a 401 response. Returns the raw `Response` so callers can choose
   * how to consume the body (`.json()`, `.text()`, `.blob()`, …) and inspect
   * headers (e.g. `x-total-pages`, `Link`).
   *
   * Caller-supplied `options.headers` (any `HeadersInit` form: plain object,
   * `Headers` instance, or `[name, value][]` tuples) are merged with the
   * bearer token. The Authorization header is always set by this method —
   * callers cannot override it.
   *
   * @param endpoint - API endpoint, e.g. '/user' or '/projects?per_page=100'
   * @param options - Standard fetch options (method, headers, body, …)
   * @returns The raw `Response`. On non-2xx status (other than the 401 that
   *          triggers an internal refresh-and-retry), throws.
   */
  async apiRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    await this.ensureValidToken();

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.accessToken}`);

    const response = await fetch(`${this.baseUrl}/api/v4${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token might be invalid
    if (response.status === 401) {
      // If we have a refresh token, try refreshing and retrying once
      if (this.refreshToken && !this.refreshPromise) {
        try {
          await this.performTokenRefresh();
          // Retry request with new token
          return this.apiRequest(endpoint, options);
        } catch (refreshError) {
          // Refresh failed, throw auth error
          throw new Error("AUTH_TOKEN_INVALID");
        }
      } else {
        // No refresh token or already tried refreshing
        throw new Error("AUTH_TOKEN_INVALID");
      }
    }

    // Handle other errors. Attach status/statusText to the thrown Error so
    // callers can rebuild more specific messages without re-fetching.
    if (!response.ok) {
      const err: Error & { status?: number; statusText?: string } = new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
      err.status = response.status;
      err.statusText = response.statusText;
      throw err;
    }

    return response;
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
