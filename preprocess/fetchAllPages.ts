import * as sentry from "../components/sentry";
import type { GitLabOAuthClient } from "./auth/gitlabOAuthClient";

const SAFETY_LIMIT = 10000;

interface FetchAllPagesOptions {
  /** Use X-Total-Pages to fetch remaining pages concurrently when available. */
  parallel?: boolean;
  /** Maximum requests in flight after the first page. */
  maxConcurrent?: number;
  /** Cancel this listing when the owning operation is superseded. */
  signal?: AbortSignal;
}

const nextEndpointFromLink = (response: Response): string | null => {
  const linkHeader = response.headers.get("Link");
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      const nextUrl = new URL(match[1]);
      return nextUrl.pathname.replace(/^\/api\/v4/, "") + nextUrl.search;
    }
  }
  return null;
};

/**
 * Fetch all pages of a paginated GitLab API endpoint. Link navigation remains
 * the fallback. With `parallel`, a valid X-Total-Pages header lets the first
 * response schedule all remaining pages through a bounded worker pool.
 */
export const fetchAllPages = async (
  endpoint: string,
  client: GitLabOAuthClient,
  options: FetchAllPagesOptions = {},
): Promise<Response[]> => {
  const visitedEndpoints = new Set<string>();
  let pageCount = 0;

  const fetchEndpoint = async (nextEndpoint: string): Promise<Response> => {
    if (visitedEndpoints.has(nextEndpoint)) {
      const error = new Error(
        `Infinite loop detected: revisited endpoint ${nextEndpoint}`,
      );
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
    return options.signal
      ? client.apiRequest(nextEndpoint, { signal: options.signal })
      : client.apiRequest(nextEndpoint);
  };

  const url = new URL(`https://placeholder.invalid/api/v4${endpoint}`);
  if (!url.searchParams.has("per_page"))
    url.searchParams.set("per_page", "100");
  const endpointOf = (pageUrl: URL) =>
    pageUrl.pathname.replace(/^\/api\/v4/, "") + pageUrl.search;

  const firstPage = Number(url.searchParams.get("page") ?? "1");
  const firstResponse = await fetchEndpoint(endpointOf(url));

  if (options.parallel) {
    const totalPages = Number(firstResponse.headers.get("X-Total-Pages"));
    if (
      Number.isInteger(totalPages) &&
      totalPages > firstPage &&
      totalPages < SAFETY_LIMIT
    ) {
      const pages = Array.from(
        { length: totalPages - firstPage },
        (_, index) => firstPage + index + 1,
      );
      const remainingResponses = new Array<Response>(pages.length);
      const requestedConcurrency = options.maxConcurrent ?? 4;
      const concurrency = Number.isFinite(requestedConcurrency)
        ? Math.max(1, Math.floor(requestedConcurrency))
        : 4;
      const nextLink = nextEndpointFromLink(firstResponse);
      const pageTemplate = nextLink
        ? new URL(`https://placeholder.invalid/api/v4${nextLink}`)
        : new URL(url);
      let nextIndex = 0;

      const worker = async () => {
        while (nextIndex < pages.length) {
          const index = nextIndex++;
          const pageUrl = new URL(pageTemplate);
          pageUrl.searchParams.set("page", String(pages[index]));
          remainingResponses[index] = await fetchEndpoint(endpointOf(pageUrl));
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(concurrency, pages.length) }, () =>
          worker(),
        ),
      );
      return [firstResponse, ...remainingResponses];
    }
  }

  // Without a trustworthy total-page count, follow Link headers sequentially.
  const responses = [firstResponse];
  let nextEndpoint = nextEndpointFromLink(firstResponse);
  while (nextEndpoint) {
    const response = await fetchEndpoint(nextEndpoint);
    responses.push(response);
    nextEndpoint = nextEndpointFromLink(response);
  }
  return responses;
};
