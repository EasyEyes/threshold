/**
 * Migration guards for the fontLeftToRightBool → fontDirection replacement.
 *
 * These tests pin the MIGRATION CONTRACT (not runtime behavior):
 *  - B4: the example reading table uses fontDirection, not fontLeftToRightBool
 *  - B5: no fontLeftToRightBool literal remains in runtime code
 *  - B6: PsychoJS TextStim plumbs `direction` like it already plumbs `language`
 *
 * All three are RED against the pre-migration codebase (the opposite of the
 * desired state) and GREEN once the migration is complete.
 *
 * @jest-environment node
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function listDir(rel: string, recursive = true): string[] {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else {
        out.push(full);
      }
    }
  };
  walk(abs);
  return out;
}

describe("B4: example reading table migrated to fontDirection", () => {
  const csv = readFile("examples/tables/readingExperiment.csv");

  it("has a fontDirection row", () => {
    expect(/^\s*fontDirection\s*,/m.test(csv)).toBe(true);
  });

  it("has NO fontLeftToRightBool row", () => {
    expect(/^\s*fontLeftToRightBool\s*,/m.test(csv)).toBe(false);
  });
});

describe("B5: no fontLeftToRightBool read remains in runtime code", () => {
  // Runtime JS/TS that previously read fontLeftToRightBool. The contract is that
  // no code READS the old param — i.e. the quoted string literal used as a
  // .read("fontLeftToRightBool", …) argument is gone. Documentation comments
  // referencing the old param name are allowed and kept.
  const targets: string[] = [...listDir("components"), "threshold.js"].filter(
    (f) => /\.(js|ts)$/i.test(f),
  );

  it("covers a non-empty set of files", () => {
    expect(targets.length).toBeGreaterThan(0);
  });

  it.each(targets)("has no read of the old param: %s", (file) => {
    const src = fs.readFileSync(file, "utf8");
    // The old param as a DOUBLE-QUOTED string literal — the form every actual
    // .read("fontLeftToRightBool", …) / getParamValueForBlockOrCondition(…)
    // call used. Doc comments reference it with backticks, which are allowed.
    expect(src).not.toContain('"fontLeftToRightBool"');
  });
});

describe("B6: PsychoJS TextStim plumbs `direction` like `language`", () => {
  // We cannot instantiate a real TextStim in a node/jsdom test (it transitively
  // imports the whole threshold app via components/global.js, which has browser
  // side effects — see tests/textStimTextContract.test.ts for the same
  // constraint). Instead we assert the SOURCE CONTRACT: TextStim must declare a
  // `direction` constructor option + `_addAttribute`, and apply it at the same
  // two canvas sites it already applies `lang`. This mirrors the existing
  // language plumbing exactly (see notes/PLAN-fontDirection... §4.4).
  const src = readFile("psychojs/src/visual/TextStim.js");

  it("accepts a `direction` constructor option", () => {
    expect(src).toMatch(/direction\s*=\s*["']ltr["']/);
  });

  it("registers direction via _addAttribute (alongside language)", () => {
    expect(src).toMatch(/_addAttribute\(\s*["']direction["']/);
  });

  it("applies dir/direction at the text-metrics canvas site (like lang)", () => {
    expect(src).toContain('setAttribute("lang"');
    // After migration, the same site also sets dir attribute + ctx.direction
    expect(src).toContain('setAttribute("dir"');
    expect(src).toMatch(/ctx\.direction\s*=/);
  });

  // The dir computation is centralized in one pure helper used by both
  // canvas sites (no duplicated `=== "rtl" ? "rtl" : "ltr"` inline), and its
  // body is the spec mapping (only rtl → rtl, else ltr). We assert the body
  // by inspection because TextStim cannot be instantiated in jsdom (it pulls
  // in the full PsychoJS util.mix chain — same constraint documented in
  // tests/textStimTextContract.test.ts).
  it("centralizes the dir mapping in a _dirFromDirection() helper with the spec body", () => {
    expect(src).toMatch(/_dirFromDirection\(\)/);
    expect(src).toMatch(/this\._direction === "rtl" \? "rtl" : "ltr"/);
  });
});
