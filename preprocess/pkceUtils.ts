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
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
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
