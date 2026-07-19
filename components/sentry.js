/**
 * Sentry Error Tracking Initialization
 *
 * Initializes Sentry for error tracking.
 * This should be imported at the very top of the application entry point.
 *
 * Environment Variables:
 * - SENTRY_ENVIRONMENT: Environment name (development/production)
 */

import * as Sentry from "@sentry/browser";

export function initSentry(
  dsn = process.env.SENTRY_DSN,
  environment = process.env.SENTRY_ENVIRONMENT || "development",
) {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
  });
}

initSentry();

const getRuntimeContext = () => {
  if (typeof window === "undefined") return {};
  return { studyPath: window.location?.pathname ?? "unknown" };
};

// Export Sentry for manual error capturing
export { Sentry };

/**
 * Capture and log an error to Sentry
 * Use this in catch blocks instead of just console.error()
 *
 * @param {unknown} error - The error object to capture
 * @param {string} context - Descriptive context (e.g., "Login failed")
 * @param {Object} extra - Additional data to send with error
 *
 * @example
 * try {
 *   await loginUser(email, password);
 * } catch (error) {
 *   captureError(error, "User login", { email });
 * }
 */
export function captureError(error, context = "", extra = {}) {
  console.error(context, error);
  Sentry.captureException(error, {
    tags: { context },
    extra: { ...getRuntimeContext(), ...extra },
  });
}

/**
 * Capture a message to Sentry (for non-error events)
 *
 * @param {string} message - The message to log
 * @param {string} level - Log level: "info", "warning", "error"
 * @param {Object} extra - Additional context data
 *
 * @example
 * if (experimentDidNotComplete) {
 *   captureMessage("Experiment terminated early", "warning", { reason });
 * }
 */
export function captureMessage(message, level = "info", extra = {}) {
  if (level === "error") {
    console.error(message, extra);
  } else {
    console.log(message, extra);
  }
  Sentry.captureMessage(message, {
    level,
    extra: { ...getRuntimeContext(), ...extra },
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("easyeyes-language-issue", (event) => {
    captureMessage("Remote calibrator language fallback used", "warning", {
      requestedLanguage: event.detail?.requestedLanguage,
      resolvedLanguage: event.detail?.resolvedLanguage,
      reason: event.detail?.reason,
    });
  });
}
