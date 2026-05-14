import * as sentry from "../components/sentry";
import type { GitLabOAuthClient } from "./auth/gitlabOAuthClient";

const SAFETY_LIMIT = 10000;

/**
 * Fetch all pages of a paginated GitLab API endpoint via Link header navigation.
 *
 * @param endpoint - API path after /api/v4, e.g. "/projects/1/repository/tree"
 * @param client - Authenticated client; each page is fetched via client.apiRequest,
 *                 which provides token refresh and transient-failure retry.
 */
export const fetchAllPages = async (
  endpoint: string,
  client: GitLabOAuthClient,
): Promise<Response[]> => {
  const responses: Response[] = [];
  const visitedEndpoints = new Set<string>();

  const url = new URL(`https://placeholder.invalid/api/v4${endpoint}`);
  if (!url.searchParams.has("per_page")) {
    url.searchParams.set("per_page", "100");
  }

  let nextEndpoint: string | null = url.pathname.replace(/^\/api\/v4/, "") + url.search;
  let pageCount = 0;

  while (nextEndpoint) {
    if (visitedEndpoints.has(nextEndpoint)) {
      const error = new Error(`Infinite loop detected: revisited endpoint ${nextEndpoint}`);
      sentry.captureError(error, "fetchAllPages infinite loop");
      throw error;
    }
    visitedEndpoints.add(nextEndpoint);

    pageCount++;
    if (pageCount >= SAFETY_LIMIT) {
      const error = new Error(
        `Safety limit reached: ${SAFETY_LIMIT} pages. This indicates an API malfunction.`,
      );
      sentry.captureError(error, "fetchAllPages safety limit");
      throw error;
    }

    const response: Response = await client.apiRequest(nextEndpoint);
    responses.push(response);

    const linkHeader: string | null = response.headers.get("Link");
    nextEndpoint = null;
    if (linkHeader) {
      for (const part of linkHeader.split(",")) {
        const match: RegExpMatchArray | null = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          const nextUrl: URL = new URL(match[1]);
          nextEndpoint =
            nextUrl.pathname.replace(/^\/api\/v4/, "") + nextUrl.search;
          break;
        }
      }
    }
  }

  return responses;
};
