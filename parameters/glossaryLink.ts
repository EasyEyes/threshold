/**
 * Links from compiler-error parameter mentions to the published glossary
 * spreadsheet, so one click shows the parameter's row (explanation, type,
 * default, example).
 *
 * Row numbers are read from the published glossary CSV itself — the same rows
 * the published HTML viewer shows — so links can never drift from what the
 * scientist sees. The CSV is fetched once per session, kicked off alongside
 * the compile (never at page load), and every failure path degrades to
 * linking the whole glossary, never to blocking or breaking the compile.
 *
 * The published viewer has no scroll-to-row API; `range` renders ONLY that
 * range, so the link targets the parameter's full row — its complete entry
 * (explanation, type, default, categories).
 */
import Papa from "papaparse";
import { getGlossary } from "./glossaryRegistry";

// The published ("Publish to web") glossary document and its InputParameters
// tab; derive every URL from these so they can't fall out of sync.
const GLOSSARY_PUB_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8QswX_5h_oNS2Ly6VgoONGIxJHqDFjdZqWY_HUxH2Nr_LNkGDBL8FXz74l9BxVNR2AIXGhHir9GAd/";
const GLOSSARY_TAB_GID = "1287694458";

export const GLOSSARY_SHEET_URL = `${GLOSSARY_PUB_BASE}pubhtml?gid=${GLOSSARY_TAB_GID}&single=true`;
const GLOSSARY_CSV_URL = `${GLOSSARY_PUB_BASE}pub?gid=${GLOSSARY_TAB_GID}&single=true&output=csv`;

/** Header of the parameter-name column in the published glossary. */
const NAME_COLUMN_HEADER = "INPUT PARAMETER";
/** Bound the row-map fetch so it can never delay showing errors. */
const FETCH_TIMEOUT_MS = 4000;

/** Minimal fetch shape, injectable for tests. */
type FetchLike = (
  url: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; text(): Promise<string> }>;

/** name → 1-based sheet row, once loaded. */
let rowMap: Map<string, number> | null = null;
/** Last data column of the sheet (e.g. "G"), learned from the CSV header. */
let lastColumnLetter: string | null = null;
/** In-flight fetch, so concurrent callers share one request. */
let pending: Promise<Map<string, number> | null> | null = null;

/** 1-based column count → spreadsheet column letter(s): 1 → A, 27 → AA. */
const columnCountToLetter = (count: number): string => {
  let letters = "";
  let n = count;
  while (n > 0) {
    n -= 1;
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26);
  }
  return letters || "A";
};

/**
 * Index a published-glossary CSV: every parameter name → its 1-based sheet
 * row (CSV row N is sheet row N). The name column is located by its header,
 * not by position. Returns null when the text is not the glossary (e.g. an
 * error page), so callers can treat that as "no rows available".
 */
export const parseGlossaryCsv = (
  csvText: string,
): Map<string, number> | null => {
  const rows = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: false,
  }).data;
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const header = rows[0].map((cell) =>
    String(cell ?? "")
      .trim()
      .toUpperCase(),
  );
  const nameColumn = header.indexOf(NAME_COLUMN_HEADER);
  if (nameColumn < 0) return null;
  lastColumnLetter = columnCountToLetter(header.length);

  const map = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const name = String(rows[i]?.[nameColumn] ?? "").trim();
    if (name) map.set(name, i + 1);
  }
  return map;
};

/**
 * Fetch the published glossary CSV and index its rows (once per session;
 * concurrent callers share the request). Resolves null on any failure —
 * offline, blocked, slow, or non-CSV body — and a later call may retry.
 * Never throws.
 */
export const loadGlossaryRows = async (
  fetcher: FetchLike = (url, init) => fetch(url, init),
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Map<string, number> | null> => {
  if (rowMap) return rowMap;
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(GLOSSARY_CSV_URL, {
          signal: controller.signal,
        });
        if (!response.ok) return null;
        const map = parseGlossaryCsv(await response.text());
        if (map) rowMap = map; // cache success for the session
        return map;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
        pending = null; // a failed load may be retried on the next compile
      }
    })();
  }
  return pending;
};

/** URL of the parameter's glossary entry, or null if it is not a glossary
 * parameter (e.g. a file name). Unknown row → whole glossary. */
export const glossaryParameterUrl = (name: string): string | null => {
  let isParameter = false;
  try {
    isParameter = !!getGlossary()[name];
  } catch {
    // Glossary not initialized (e.g. before the first compile) — don't link.
    return null;
  }
  if (!isParameter) return null;
  const row = rowMap?.get(name);
  if (typeof row !== "number" || row < 1) return GLOSSARY_SHEET_URL;
  // The parameter's full row, spanning all data columns.
  const lastColumn = lastColumnLetter ?? "Z";
  return `${GLOSSARY_SHEET_URL}&range=A${row}:${lastColumn}${row}`;
};

/**
 * Wrap every `<span class="error-parameter">name</span>` in `html` with a
 * glossary link — the standard markup emitted by the error factories for
 * parameter mentions, wherever the HTML ultimately renders on the website.
 * Spans naming non-parameters are left as they are.
 */
export const linkGlossaryParameters = (html: string): string =>
  html.replace(
    /<span class="error-parameter">([^<]+)<\/span>/g,
    (span, name: string) => {
      const href = glossaryParameterUrl(name);
      return href
        ? `<a class="error-parameter-link" href="${href}" target="_blank" rel="noopener noreferrer">${span}</a>`
        : span;
    },
  );

/** Test-only: forget the cached rows and any in-flight fetch. */
export const __resetGlossaryRowsForTests = (): void => {
  rowMap = null;
  lastColumnLetter = null;
  pending = null;
};
