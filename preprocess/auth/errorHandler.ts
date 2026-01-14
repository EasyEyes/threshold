/**
 * Global authentication error handler
 * Handles authentication failures and triggers re-authentication flow
 */

import { clearTokensFromStorage } from "./storage";
import { tempAccessToken } from "../global";

/**
 * Custom authentication error class
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Check if an error is an authentication error
 * @param error - Error object to check
 * @returns true if error is authentication-related
 */
export function isAuthenticationError(error: any): boolean {
  return (
    error instanceof AuthenticationError ||
    error?.message?.includes("AUTH_TOKEN_INVALID") ||
    error?.message?.includes("AUTH_TOKEN_EXPIRED_NO_REFRESH") ||
    error?.message?.includes("AUTH_TOKEN_REFRESH_FAILED") ||
    error?.message?.includes("401") ||
    error?.status === 401
  );
}

/**
 * Handle authentication errors by clearing tokens and redirecting to login
 * @param error - The authentication error
 */
export async function handleAuthError(error: any): Promise<void> {
  if (!isAuthenticationError(error)) {
    // Not an auth error, re-throw
    throw error;
  }

  console.warn("Authentication error detected, clearing session:", error);

  // Clear stored tokens from localStorage
  clearTokensFromStorage();

  // Clear in-memory token (for backward compatibility with existing code)
  tempAccessToken.t = undefined;

  // Redirect to login flow
  // Dynamic import to avoid circular dependencies
  const { redirectToOauth2 } = await import("../user");
  await redirectToOauth2();
}

/**
 * Wrap an async function with authentication error handling
 * @param fn - Async function to wrap
 * @returns Wrapped function that handles auth errors
 */
export function withAuthErrorHandling<T>(
  fn: (...args: any[]) => Promise<T>,
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isAuthenticationError(error)) {
        await handleAuthError(error);
        // handleAuthError redirects, so this line shouldn't be reached
        throw error;
      }
      throw error;
    }
  };
}
