/**
 * Source contracts for stim teardown at replacement sites that unit tests
 * cannot reach cheaply (heavy constructors / the threshold trial loop).
 * Pattern precedent: tests/trialScheduling.sourceContracts.test.ts.
 *
 * A memory baseline established
 * that replacing stims without release() leaks them (pixi keeps every
 * rendered geometry until disposed; Text stims keep canvas rasters). These
 * contracts pin the replacement sites that rebuild stims per page/trial:
 *  - Paragraph._spawnStims (reading: every setText/setFont/setHeight)
 *  - threshold.js repeatedLettersConfig.stims (every repeatedLetters trial)
 *
 * @jest-environment node
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";

const read = (rel: string) => readFileSync(path.join(__dirname, rel), "utf8");

/** Extract a class method body (brace-matched) from its DEFINITION. */
const methodBody = (src: string, name: string) => {
  const start = src.indexOf(`${name}() {`);
  if (start === -1) return null;
  let i = src.indexOf("{", start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
};

describe("stim teardown source contracts", () => {
  describe("Paragraph._spawnStims releases the previous page's stims", () => {
    const body = methodBody(
      read("../components/readingAddons.js"),
      "_spawnStims",
    );

    it("has a _spawnStims method", () => {
      expect(body).not.toBeNull();
    });

    it("releases (not merely undraws) the stims it replaces", () => {
      expect(body!).toMatch(
        /this\.stims\?\.forEach\(\(s\) => s\.release\(\)\)/,
      );
      // the old undraw-only line must be gone
      expect(body).not.toMatch(
        /if \(this\.stims\?\.length\) this\.setAutoDraw\(false\)/,
      );
    });
  });

  describe("replacement factories own release (one chokepoint per kind)", () => {
    const dotAndGrid = read("../components/dotAndGrid.ts");
    const stimulusGeneration = read("../components/stimulusGeneration.ts");
    const threshold = read("../threshold.js");

    it("getFlies takes the previous swarm and releases it inside", () => {
      expect(dotAndGrid).toMatch(
        /const getFlies = \([\s\S]{0,300}?previous\?\.release\(\)/,
      );
    });

    it("getDotAndBackGrid takes the previous pair and releases it inside", () => {
      expect(dotAndGrid).toMatch(
        /const getDotAndBackGrid = \([\s\S]{0,400}?previous\?\.forEach\(\(s\) => s\?\.release\(\)\)/,
      );
    });

    it("getRepeatedLettersStimulus releases extraInfo.previousStims", () => {
      expect(stimulusGeneration).toMatch(
        /const getRepeatedLettersStimulus = \([\s\S]{0,500}?previousStims\?\.forEach\(\(s[^)]*\) => s\.release\(\)\)/,
      );
    });

    it("threshold.js hands the old instances to the factories (no hand-written release)", () => {
      expect(threshold).toMatch(
        /getFlies\(resolveFliesSpec\([^)]*\),\s*flies\)/,
      );
      expect(threshold).toMatch(
        /getDotAndBackGrid\([\s\S]{0,200}?\[dot, backGrid\],?\s*\)/,
      );
      expect(threshold).toMatch(/previousStims: repeatedLettersConfig\.stims/);
      expect(threshold).not.toMatch(/\[flies, dot, backGrid\]\.forEach/);
      expect(threshold).not.toMatch(/repeatedLettersConfig\.stims\?\.forEach/);
    });

    it("trial end keeps the flies reference for the next trial's factory", () => {
      // Dropping the reference here (flies = undefined) would hide the old
      // swarm from the next getFlies call, leaking it.
      expect(threshold).not.toMatch(/flies = undefined;/);
    });
  });
});
