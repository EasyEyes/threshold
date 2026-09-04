/**
 * Glossary links in compiler error messages.
 *
 * Every parameter mentioned in an error links to its row in the published
 * glossary spreadsheet. Row numbers are read from the published CSV itself
 * (same rows the published HTML viewer shows), fetched once per session,
 * concurrently with the compile, so it adds nothing to page load or compile
 * time and can never drift from the published view.
 */

import { initGlossary } from "../parameters/glossaryRegistry";
import {
  GLOSSARY_SHEET_URL,
  glossaryParameterUrl,
  linkGlossaryParameters,
  loadGlossaryRows,
  parseGlossaryCsv,
  __resetGlossaryRowsForTests,
} from "../parameters/glossaryLink";
import type { GlossaryData } from "../../source/components/types";

// A realistic published-glossary CSV: header row, separator rows, a quoted
// cell with an embedded newline+comma, and trailing blank row.
const CSV = [
  "INPUT PARAMETER,NOW,TYPE,DEFAULT,EXPLANATION,EXAMPLE,CATEGORIES",
  "__,now,text,,,,",
  "__ %,now,text,,,,",
  '_about,now,text,,"Says what, exactly,\nthe study is",,',
  "font,now,text,Open Sans,,,",
  'fontTolerateFaults,now,categorical,"",,, missingCharacters',
  "readingCorpus,now,text,,,,",
].join("\n");

const initTestGlossary = () =>
  initGlossary({
    version: "test",
    glossary: Object.fromEntries(
      ["font", "fontTolerateFaults", "readingCorpus", "_about"].map((name) => [
        name,
        {
          name,
          availability: "now",
          type: "string",
          default: "",
          explanation: "",
          example: "",
          categories: [],
        },
      ]),
    ),
    glossaryFull: [],
    superMatchingParams: [],
  } as unknown as GlossaryData);

beforeEach(() => {
  __resetGlossaryRowsForTests();
  initTestGlossary();
});

/** Wrap CSV text in the minimal Response shape the loader expects. */
const csvResponse = (text: string) => ({ ok: true, text: async () => text });

describe("parseGlossaryCsv", () => {
  it("maps every parameter to its exact sheet row (1-based)", () => {
    const map = parseGlossaryCsv(CSV)!;
    expect(map).not.toBeNull();
    expect(map.get("font")).toBe(5);
    expect(map.get("fontTolerateFaults")).toBe(6);
    expect(map.get("readingCorpus")).toBe(7);
    expect(map.get("_about")).toBe(4); // quoted cell with newline parsed as ONE row
  });

  it("finds the parameter column by header name, not fixed position", () => {
    const reordered = [
      "NOW,INPUT PARAMETER",
      "now,font",
      "now,readingCorpus",
    ].join("\n");
    const map = parseGlossaryCsv(reordered)!;
    expect(map.get("font")).toBe(2);
    expect(map.get("readingCorpus")).toBe(3);
  });

  it("returns null for content that is not the glossary (e.g. an error page)", () => {
    expect(parseGlossaryCsv("<html><body>Error</body></html>")).toBeNull();
    expect(parseGlossaryCsv("")).toBeNull();
  });
});

describe("glossaryParameterUrl", () => {
  it("links to the parameter's exact row once rows are loaded", async () => {
    await loadGlossaryRows(async () => csvResponse(CSV));
    expect(glossaryParameterUrl("fontTolerateFaults")).toBe(
      `${GLOSSARY_SHEET_URL}&range=A6:G6`,
    );
  });

  it("falls back to the whole glossary while rows are unavailable", () => {
    expect(glossaryParameterUrl("font")).toBe(GLOSSARY_SHEET_URL);
  });

  it("targets the parameter's full row across the CSV's last column", async () => {
    // 7-column CSV → G; a 2-column CSV → B.
    await loadGlossaryRows(async () => csvResponse(CSV));
    expect(glossaryParameterUrl("_about")).toBe(
      `${GLOSSARY_SHEET_URL}&range=A4:G4`,
    );
    const twoRowCsv = ["INPUT PARAMETER,TYPE", "font,now"].join("\n");
    __resetGlossaryRowsForTests();
    await loadGlossaryRows(async () => csvResponse(twoRowCsv));
    expect(glossaryParameterUrl("font")).toBe(
      `${GLOSSARY_SHEET_URL}&range=A2:B2`,
    );
  });

  it("returns null for names that are not glossary parameters", () => {
    expect(glossaryParameterUrl("notAParameter")).toBeNull();
    expect(glossaryParameterUrl("myFont.ttf")).toBeNull();
  });

  it("returns null when the glossary registry is not initialized", () => {
    jest.resetModules();
    const {
      glossaryParameterUrl: fresh,
    } = require("../parameters/glossaryLink");
    expect(fresh("font")).toBeNull();
  });
});

describe("loadGlossaryRows", () => {
  it("fetches once and caches for the session", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return csvResponse(CSV);
    };
    await loadGlossaryRows(fetcher);
    await loadGlossaryRows(fetcher);
    expect(calls).toBe(1);
    expect(glossaryParameterUrl("font")).toBe(
      `${GLOSSARY_SHEET_URL}&range=A5:G5`,
    );
  });

  it("shares one request between concurrent callers", async () => {
    let calls = 0;
    let resolveFetch: (csv: string) => void = () => {};
    const fetcher = () =>
      new Promise<{ ok: boolean; text(): Promise<string> }>((resolve) => {
        calls += 1;
        resolveFetch = (csv) => resolve(csvResponse(csv));
      });
    const first = loadGlossaryRows(fetcher);
    const second = loadGlossaryRows(fetcher);
    resolveFetch(CSV);
    expect(await first).not.toBeNull();
    expect(await second).not.toBeNull();
    expect(calls).toBe(1);
  });

  it("resolves null on failure and allows a retry on the next compile", async () => {
    let calls = 0;
    const failing = async () => {
      calls += 1;
      throw new Error("offline");
    };
    await expect(loadGlossaryRows(failing)).resolves.toBeNull();
    expect(glossaryParameterUrl("font")).toBe(GLOSSARY_SHEET_URL);
    await loadGlossaryRows(async () => csvResponse(CSV));
    expect(glossaryParameterUrl("font")).toBe(
      `${GLOSSARY_SHEET_URL}&range=A5:G5`,
    );
    expect(calls).toBe(1);
  });

  it("resolves null when the response is not ok", async () => {
    await expect(
      loadGlossaryRows(async () => ({ ok: false, text: async () => CSV })),
    ).resolves.toBeNull();
    expect(glossaryParameterUrl("font")).toBe(GLOSSARY_SHEET_URL);
  });

  it("aborts a fetch that outlives its timeout, resolving null", async () => {
    const slow = (_url: string, init?: RequestInit) =>
      new Promise<{ ok: boolean; text(): Promise<string> }>((_res, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("AbortError")),
        );
      });
    await expect(loadGlossaryRows(slow, 20)).resolves.toBeNull();
    expect(glossaryParameterUrl("font")).toBe(GLOSSARY_SHEET_URL);
  });
});

describe("linkGlossaryParameters", () => {
  it("wraps parameter spans in glossary links", async () => {
    await loadGlossaryRows(async () => csvResponse(CSV));
    expect(
      linkGlossaryParameters(
        `Check <span class="error-parameter">font</span> in column C.`,
      ),
    ).toBe(
      `Check <a class="error-parameter-link" href="${GLOSSARY_SHEET_URL}&range=A5:G5" target="_blank" rel="noopener noreferrer"><span class="error-parameter">font</span></a> in column C.`,
    );
  });

  it("leaves spans that are not glossary parameters untouched", async () => {
    await loadGlossaryRows(async () => csvResponse(CSV));
    const html = `File <span class="error-parameter">myFont.ttf</span> is missing.`;
    expect(linkGlossaryParameters(html)).toBe(html);
  });

  it("links every parameter span in a longer hint", async () => {
    await loadGlossaryRows(async () => csvResponse(CSV));
    const out = linkGlossaryParameters(
      `Set <span class="error-parameter">font</span> or add to <span class="error-parameter">fontTolerateFaults</span>.`,
    );
    expect(out).toContain("range=A5:G5");
    expect(out).toContain("range=A6:G6");
    expect(out.match(/<a class="error-parameter-link"/g)).toHaveLength(2);
  });

  it("returns HTML without parameter spans unchanged", () => {
    expect(linkGlossaryParameters(`Plain <b>bold</b> text.`)).toBe(
      `Plain <b>bold</b> text.`,
    );
  });
});
