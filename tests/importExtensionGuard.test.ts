// Regression guard: an import specifier ending in .js whose target exists
// only as .ts resolves under tsc and jest (both map .js→.ts) but NOT under
// vite, which serves the runtime — the page dies with a 500 on threshold.js
// (bit 2026-09-11: trialCounter.js imported ./multiple-displays/utils.js).
// Scan all runtime entries for exactly this mismatch.
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
const ENTRIES = [path.join(ROOT, "threshold.js")];
const COMPONENTS = walk(path.join(ROOT, "components")).filter((f) =>
  /\.(js|ts|tsx)$/.test(f),
);

describe("import specifiers resolve for vite too (.js must not mask .ts)", () => {
  const bad: string[] = [];
  beforeAll(() => {
    const files = [...ENTRIES, ...COMPONENTS];
    const specRe = /from\s+["'](\.[^"']+)["']/g;
    for (const file of files) {
      // Only .js importers are the hazard: vite applies TypeScript's
      // .js→.ts mapping for TS importers (e.g. fixation.ts imports
      // globals.js fine), but NOT for plain .js importers — those 500.
      if (!file.endsWith(".js")) continue;
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(specRe)) {
        const spec = m[1];
        if (!spec.endsWith(".js")) continue; // extensionless: many modes, skip
        const base = path.resolve(path.dirname(file), spec);
        if (fs.existsSync(base)) continue; // literal target exists
        if (fs.existsSync(base.slice(0, -3) + ".ts")) {
          bad.push(`${path.relative(ROOT, file)}: ${spec} (target is .ts)`);
        }
      }
    }
  });

  it("no .js import masks an existing .ts file", () => {
    expect(bad).toEqual([]);
  });
});
