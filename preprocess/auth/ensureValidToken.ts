import { GitLabOAuthClient } from "./gitlabOAuthClient";
import { getAuthConfig } from "./config";

/**
 * Gate that must be called at compiler entry points before any Pavlovia API
 * chain begins. Transparently refreshes an expired access token; triggers
 * `onAuthFailure` (e.g. OAuth re-authorisation) when the session cannot be
 * recovered.
 *
 * @returns `true` if the session is valid and the caller may proceed;
 *          `false` if `onAuthFailure` was invoked and the caller should abort.
 */
export async function ensureValidToken(onAuthFailure: () => void): Promise<boolean> {
  const { clientId, redirectUri } = getAuthConfig();
  const client = GitLabOAuthClient.loadFromStorage(clientId, redirectUri);

  if (!client) {
    onAuthFailure();
    return false;
  }

  try {
    await client.ensureValidToken();
    return true;
  } catch {
    onAuthFailure();
    return false;
  }
}
