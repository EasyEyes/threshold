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
    clientId: "63785db109412d3b2a6179ada78be8a3411936184b467f678c8251fda96d8c14",

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
