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

const SENSITIVE_KEY =
  /token|authorization|password|secret|spreadsheet|workbook|content|participant/i;

const sanitize = (value, depth = 0) => {
  if (depth > 4) return "[Truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string")
    return value
      .replace(
        /(access_token|oauthToken|authorization)=([^&\s]+)/gi,
        "$1=[Filtered]",
      )
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [Filtered]");
  if (["number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value))
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (typeof value !== "object") return String(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[Filtered]" : sanitize(item, depth + 1),
    ]),
  );
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
    extra: sanitize(extra),
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
  Sentry.captureMessage(message, { level, extra: sanitize(extra) });
}

export function recordCompilerPhase(context, phase, details = {}) {
  const data = { ...context, phase, ...sanitize(details) };
  Sentry.setTag("compiler.phase", phase);
  Sentry.setContext("compiler", data);
  Sentry.addBreadcrumb({
    category: "compiler",
    message: `${context.operation}.${phase}`,
    level: "info",
    data,
  });
}

export function captureCompilerFailure(
  error,
  context,
  phase,
  details = {},
  classification = "compiler-defect",
) {
  const data = sanitize({ ...context, phase, classification, ...details });
  console.error(`[Compiler:${phase}]`, error);
  Sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    {
      tags: {
        "compiler.operation": context.operation,
        "compiler.operation_id": context.operationId,
        "compiler.phase": phase,
        "compiler.classification": classification,
      },
      contexts: { compiler: data },
    },
  );
}

export function getHttpErrorDetails(error) {
  return sanitize({
    endpoint: error?.endpoint,
    method: error?.method,
    responseStatus: error?.status,
    responseStatusText: error?.statusText,
    responseMessage: error?.responseMessage,
  });
}
