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
 * @returns Access token response including refresh_token and created_at
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
  refresh_token?: string;
  created_at?: number;
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

  return response.json();
}

/**
 * Generate a cryptographically secure random state parameter for CSRF protection
 * @returns Hex-encoded random string (64 characters)
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Store state parameter in session storage for later validation
 * @param state - The state parameter to store
 */
export function storeState(state: string): void {
  sessionStorage.setItem("oauth_state", state);
}

/**
 * Retrieve and remove state parameter from session storage
 * @returns The stored state parameter, or null if not found
 */
export function retrieveState(): string | null {
  const state = sessionStorage.getItem("oauth_state");
  if (state) {
    sessionStorage.removeItem("oauth_state");
  }
  return state;
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - The refresh token
 * @param clientId - GitLab application client ID
 * @param redirectUri - Redirect URI (must match original authorization request)
 * @returns New token response
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  redirectUri: string,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  created_at: number;
}> {
  const tokenEndpoint = "https://gitlab.pavlovia.org/oauth/token";

  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    redirect_uri: redirectUri,
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
      `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Get information about an access token (validates token and returns metadata)
 * @param accessToken - The access token to check
 * @returns Token information including resource_owner_id, scope, expires_in, etc.
 */
export async function getTokenInfo(accessToken: string): Promise<{
  resource_owner_id: number;
  scope: string[];
  expires_in: number | null;
  application: { uid: string };
  created_at: number;
}> {
  const response = await fetch(
    "https://gitlab.pavlovia.org/oauth/token/info",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get token info: ${response.status}`);
  }

  return response.json();
}
