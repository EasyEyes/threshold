/**
 * Compiler-side validation of fontPreRender (categorical none/cache/buffer
 * in the glossary, so the generic type check accepts all three): "cache" is
 * a spec'd but unimplemented category — the Dec 2024 attempt (25abceb1)
 * was reverted (f6570ca7) because its re-render path still re-rasterized.
 * The runtime would silently ignore "cache" and behave as "none"; the
 * compiler must say so up front (all errors at once). "buffer" (raster
 * once, copy/rescale thereafter), "auto" (per-trial measured choice
 * between the two), and the default "none" are implemented.
 *
 * @jest-environment node
 */
import Papa from "papaparse";
import { loadGlossaryForTests } from "./helpers/glossary";
import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";

function parse(csv: string): ExperimentTable {
  const p = Papa.parse(csv, { skipEmptyLines: true });
  return new ExperimentTable(p.data as readonly (readonly string[])[]);
}

const tableWith = (fontPreRender?: string) =>
  parse(`_about,test,,
fontPreRender,,${fontPreRender ? `"${fontPreRender}"` : ""}
block,,1,1
conditionName,,condA,condA
conditionTrials,,4,4`);

const preRenderErrors = (t: ExperimentTable) =>
  validateExperimentTable(t).filter((e) =>
    e.parameters.includes("fontPreRender"),
  );

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("fontPreRender compiler validation", () => {
  it("accepts an empty cell (default none)", () => {
    expect(preRenderErrors(tableWith())).toHaveLength(0);
  });

  it('accepts "none"', () => {
    expect(preRenderErrors(tableWith("none"))).toHaveLength(0);
  });

  it('accepts "buffer" (implemented reuse behavior)', () => {
    expect(preRenderErrors(tableWith("buffer"))).toHaveLength(0);
  });

  it('flags "cache" as not yet implemented', () => {
    const errs = preRenderErrors(tableWith("cache"));
    expect(errs).toHaveLength(1);
    expect(errs[0].parameters).toContain("fontPreRender");
    expect(errs[0].message).toMatch(/cache/i);
    expect(errs[0].message).toMatch(/not yet implemented/i);
  });

  it('accepts "auto" once the glossary lists it', async () => {
    // auto is implemented at runtime (per-trial measured choice between
    // none and buffer; components/fontPreRenderAuto.ts) — the compiler
    // needs no code change, only the sheet listing "auto" in
    // fontPreRender's categories. Patch the registry to simulate the
    // updated sheet and prove the generic categorical check passes it.
    // (Runs last: the patched registry persists for this file.)
    const { getGlossary, initGlossary, getGlossaryVersion } = await import(
      "../parameters/glossaryRegistry"
    );
    const glossary = { ...getGlossary() };
    const entry = glossary["fontPreRender"];
    glossary["fontPreRender"] = {
      ...entry,
      categories: [...entry.categories, "auto"],
    };
    initGlossary({
      version: getGlossaryVersion() ?? "",
      glossary,
      glossaryFull: Object.values(glossary),
      superMatchingParams: [],
    });
    expect(preRenderErrors(tableWith("auto"))).toHaveLength(0);
  });
});
