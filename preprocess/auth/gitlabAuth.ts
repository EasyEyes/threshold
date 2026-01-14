/**
 * GitLab OAuth 2.0 PKCE Authentication
 * Main orchestrator for the authorization code with PKCE flow
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  storeCodeVerifier,
  generateState,
  storeState,
  retrieveState,
  retrieveCodeVerifier,
  exchangeCodeForToken,
} from "../pkceUtils";
import { GitLabAuthConfig } from "./config";
import { GitLabOAuthClient } from "./gitlabOAuthClient";

/**
 * Main authentication class for handling GitLab OAuth 2.0 with PKCE
 */
export class GitLabAuth {
  private clientId: string;
  private redirectUri: string;
  private scopes: string[];
  private baseUrl: string;

  /**
   * Create a new GitLabAuth instance
   * @param config - Authentication configuration
   */
  constructor(config: GitLabAuthConfig) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes || ["api"];
    this.baseUrl = config.baseUrl || "https://gitlab.pavlovia.org";
  }

  /**
   * Start the PKCE authorization flow
   * Generates PKCE parameters, state for CSRF protection, and redirects to GitLab
   * @param returnUrl - Optional URL to return to after OAuth completes (defaults to current URL)
   */
  async startAuthorization(returnUrl?: string): Promise<void> {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Generate state parameter for CSRF protection
    const state = generateState();

    // Store verifier and state in sessionStorage for callback
    storeCodeVerifier(codeVerifier);
    storeState(state);

    // Store return URL for post-OAuth redirect
    const finalReturnUrl = returnUrl || window.location.href;
    sessionStorage.setItem("oauth_return_url", finalReturnUrl);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      state: state,
      scope: this.scopes.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Redirect to GitLab OAuth authorization
    window.location.href = `${this.baseUrl}/oauth/authorize?${params}`;
  }

  /**
   * Handle OAuth callback after user authorizes the application
   * Validates state parameter, exchanges authorization code for tokens
   * @returns Object with GitLabOAuthClient and return URL
   * @throws Error if state validation fails or token exchange fails
   */
  async handleCallback(): Promise<{
    client: GitLabOAuthClient;
    returnUrl: string;
  }> {
    // Parse callback URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    // Check for OAuth errors
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error("No authorization code in callback URL");
    }

    // CRITICAL: Validate state parameter to prevent CSRF attacks
    const savedState = retrieveState();
    if (!savedState || state !== savedState) {
      throw new Error(
        "Invalid state parameter - possible CSRF attack. Please try logging in again.",
      );
    }

    // Retrieve code verifier from sessionStorage
    const codeVerifier = retrieveCodeVerifier();
    if (!codeVerifier) {
      throw new Error("Code verifier not found in session storage");
    }

    // Retrieve return URL from sessionStorage
    const returnUrl =
      sessionStorage.getItem("oauth_return_url") || "/compiler/";
    sessionStorage.removeItem("oauth_return_url");

    // Exchange authorization code for tokens
    const tokenData = await this.exchangeCode(code, codeVerifier);

    // Create and return GitLabOAuthClient with tokens
    const client = new GitLabOAuthClient({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: tokenData.expires_in
        ? Date.now() + tokenData.expires_in * 1000
        : null,
      baseUrl: this.baseUrl,
    });

    return { client, returnUrl };
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param code - Authorization code from callback
   * @param codeVerifier - PKCE code verifier
   * @returns Token response from GitLab
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    created_at?: number;
  }> {
    return exchangeCodeForToken(
      code,
      codeVerifier,
      this.redirectUri,
      this.clientId,
    );
  }
}
