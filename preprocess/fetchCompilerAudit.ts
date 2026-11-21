import { getEasyEyesBaseUrl } from "../components/easyeyesBaseUrl";

const AUDIT_TIMEOUT_MS = 15_000;

export async function fetchCompilerAudit<T>(
  endpoint: "glossary-audit-compiler" | "study-phrase-analysis",
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Compiler audit timed out"));
    }, AUDIT_TIMEOUT_MS);
  });

  const request = async () => {
    const baseUrl = await getEasyEyesBaseUrl();
    if (controller.signal.aborted) throw new Error("Compiler audit timed out");
    const response = await fetch(`${baseUrl}/.netlify/functions/${endpoint}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Audit unavailable: ${response.status}`);
    return response.json() as Promise<T>;
  };

  try {
    // Include endpoint discovery and reading the response body in the deadline.
    return await Promise.race([request(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
