/**
 * Centralized authentication configuration for GitLab OAuth 2.0 PKCE flow
 */

export interface GitLabAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  baseUrl: string;
}

/**
 * Get authentication configuration based on environment
 * @returns GitLabAuthConfig object with client ID, redirect URI, scopes, and base URL
 */
export const getAuthConfig = (): GitLabAuthConfig => {
  // eslint-disable-next-line no-undef
  const isDevelopment = process.env.debug;

  return {
    // GitLab application client ID (same for dev and prod)
    clientId:
      "c48e73399b971c00e284e135c1ce3447515a8d7d5182a4a8abc115f9891e8610",

    // Redirect URI - MUST match what's registered in GitLab OAuth application
    redirectUri: isDevelopment
      ? "http://localhost:5500/redirect"
      : "https://easyeyes.app/redirect",

    // OAuth scopes - 'api' gives full API access
    scopes: ["api"],

    // GitLab instance base URL
    baseUrl: "https://gitlab.pavlovia.org",
  };
};
