/**
 * Token storage utilities for OAuth 2.0 tokens
 * Handles secure storage and retrieval of access tokens, refresh tokens, and metadata
 */

export interface StoredTokenData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null; // Timestamp in milliseconds
  clientId: string;
  redirectUri: string;
  createdAt: number; // Timestamp in milliseconds
}

export const STORAGE_KEY = "gitlab_oauth_tokens";

/**
 * Save OAuth tokens to localStorage
 * @param data - Token data to store
 */
export function saveTokensToStorage(data: StoredTokenData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save tokens to localStorage:", error);
    // Don't throw - allow app to continue even if storage fails
  }
}

/**
 * Load OAuth tokens from localStorage
 * @returns StoredTokenData if valid tokens exist, null otherwise
 */
export function loadTokensFromStorage(): StoredTokenData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);

    // Validate data structure
    if (
      !data ||
      typeof data.accessToken !== "string" ||
      typeof data.clientId !== "string" ||
      typeof data.redirectUri !== "string" ||
      typeof data.createdAt !== "number"
    ) {
      console.warn("Invalid token data structure in localStorage");
      clearTokensFromStorage();
      return null;
    }

    return data as StoredTokenData;
  } catch (error) {
    console.error("Failed to load tokens from localStorage:", error);
    clearTokensFromStorage();
    return null;
  }
}

/**
 * Clear OAuth tokens from localStorage
 */
export function clearTokensFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear tokens from localStorage:", error);
  }
}
