/**
 * Regression guard for EASYEYES-EXPERIMENT-AK.
 *
 * `core/index.js` participates in a cycle through GUI -> threshold.js ->
 * trialRoutines.js. Reading `core.PsychoJS` during module evaluation throws
 * when the export has not been initialized yet. A named import is a live
 * binding, so it is not read until a trial routine actually uses it.
 *
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";

const trialRoutinesSource = fs.readFileSync(
  path.join(__dirname, "../components/trialRoutines.js"),
  "utf8",
);

describe("trialRoutines PsychoJS import cycle", () => {
  it("does not eagerly read PsychoJS from the core module namespace", () => {
    expect(trialRoutinesSource).toMatch(
      /import\s*\{\s*PsychoJS\s*\}\s*from\s*["']\.\.\/psychojs\/src\/core\/index\.js["']/,
    );
    expect(trialRoutinesSource).not.toMatch(
      /const\s*\{\s*PsychoJS\s*\}\s*=\s*core/,
    );
  });
});
