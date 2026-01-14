/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth2 flow
 * Implements RFC 7636 for secure authorization code flow
 */

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 * @returns Base64URL-encoded random string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * @param verifier - The code verifier string
 * @returns Base64URL-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64URL encode a byte array (without padding)
 * @param buffer - Uint8Array to encode
 * @returns Base64URL-encoded string
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Store PKCE code verifier in session storage for later retrieval
 * @param verifier - The code verifier to store
 */
export function storeCodeVerifier(verifier: string): void {
  sessionStorage.setItem("pkce_code_verifier", verifier);
}

/**
 * Retrieve and remove PKCE code verifier from session storage
 * @returns The stored code verifier, or null if not found
 */
export function retrieveCodeVerifier(): string | null {
  const verifier = sessionStorage.getItem("pkce_code_verifier");
  if (verifier) {
    sessionStorage.removeItem("pkce_code_verifier");
  }
  return verifier;
}

/**
 * Exchange authorization code for access token using GitLab OAuth2 endpoint
 * @param code - Authorization code from OAuth callback
 * @param codeVerifier - PKCE code verifier
 * @param redirectUri - Redirect URI used in authorization request
 * @param clientId - GitLab application client ID
 * @returns Access token response
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}> {
  const tokenEndpoint = "https://gitlab.pavlovia.org/oauth/token";

  const params = new URLSearchParams({
    client_id: clientId,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: decodeURIComponent(redirectUri),
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const tokenData = await response.json();

  // Validate response has required fields
  if (!tokenData.access_token || !tokenData.refresh_token) {
    throw new Error(
      `Invalid token response from GitLab: ${JSON.stringify(tokenData)}`,
    );
  }

  // Store tokens for future use
  storeTokens(tokenData);

  return tokenData;
}

/**
 * Token storage interface
 */
interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
}

/**
 * Store access token and refresh token in localStorage
 * @param tokenResponse - Token response from OAuth server
 */
export function storeTokens(tokenResponse: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): void {
  const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

  const tokens: StoredTokens = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: expiresAt,
  };

  localStorage.setItem("gitlab_tokens", JSON.stringify(tokens));
}

/**
 * Retrieve stored tokens from localStorage
 * @returns Stored tokens or null if not found
 */
export function getStoredTokens(): StoredTokens | null {
  const tokensStr = localStorage.getItem("gitlab_tokens");
  if (!tokensStr) return null;

  try {
    return JSON.parse(tokensStr);
  } catch (error) {
    console.error("Failed to parse stored tokens:", error);
    return null;
  }
}

/**
 * Check if stored access token is still valid
 * @returns true if token exists and hasn't expired
 */
export function isTokenValid(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;

  // Add 60 second buffer to refresh before actual expiration
  return Date.now() < tokens.expires_at - 60000;
}

/**
 * Refresh access token using refresh token
 * @param clientId - GitLab application client ID
 * @returns New access token response
 */
export async function refreshAccessToken(
  clientId: string,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
} | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) {
    console.warn("No refresh token available");
    return null;
  }

  const tokenEndpoint = "https://gitlab.pavlovia.org/oauth/token";

  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token",
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
      // Clear invalid tokens
      clearStoredTokens();
      return null;
    }

    const tokenData = await response.json();

    // Validate response has required fields
    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error("Invalid token response from GitLab:", tokenData);
      clearStoredTokens();
      return null;
    }

    // Store new tokens
    storeTokens(tokenData);

    return tokenData;
  } catch (error) {
    console.error("Token refresh error:", error);
    clearStoredTokens();
    return null;
  }
}

/**
 * Clear stored tokens from localStorage
 */
export function clearStoredTokens(): void {
  localStorage.removeItem("gitlab_tokens");
}

/**
 * Validate access token by checking with GitLab's token info endpoint
 * This properly detects if the user has logged out or revoked access
 * @param accessToken - Access token to validate
 * @returns true if token is valid and user is still logged in, false otherwise
 */
export async function validateAccessToken(
  accessToken: string,
): Promise<boolean> {
  try {
    // Use GitLab's token info endpoint which checks token validity AND session status
    const response = await fetch(
      "https://gitlab.pavlovia.org/oauth/token/info",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      console.log(
        "Token validation failed:",
        response.status,
        response.statusText,
      );
      return false;
    }

    // Parse token info to verify it's active
    const tokenInfo = await response.json();

    // Check if token info indicates it's still active
    // GitLab returns token details if valid, or error if revoked/logged out
    if (!tokenInfo || !tokenInfo.resource_owner_id) {
      console.log("Token is not associated with an active user session");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

/**
 * Get a valid access token - either from storage, by refreshing, or return null
 * @param clientId - GitLab application client ID
 * @param validateWithServer - Whether to validate token with GitLab API (default: true)
 * @returns Valid access token or null if re-authentication needed
 */
export async function getValidAccessToken(
  clientId: string,
  validateWithServer: boolean = true,
): Promise<string | null> {
  // Check if current token exists and hasn't expired
  if (isTokenValid()) {
    const tokens = getStoredTokens();
    const accessToken = tokens?.access_token;

    if (!accessToken) return null;

    // Validate token with GitLab server to ensure it's not revoked
    if (validateWithServer) {
      const isValid = await validateAccessToken(accessToken);
      if (!isValid) {
        console.log(
          "Stored token is invalid (possibly revoked or logged out), clearing...",
        );
        clearStoredTokens();
        return null;
      }
    }

    return accessToken;
  }

  // Try to refresh the token
  console.log("Access token expired, attempting refresh...");
  const refreshedTokens = await refreshAccessToken(clientId);

  return refreshedTokens?.access_token || null;
}
