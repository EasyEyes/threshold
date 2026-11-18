/**
 * @jest-environment node
 *
 * Source contracts for the threshold.js extraction seams. threshold.js is
 * a browser-only monolith (top-level await + DOM) that jest cannot import;
 * the extracted helpers in components/ carry the unit tests, and THESE
 * tests pin the wiring: each helper must be imported from its module and
 * used at every site that previously inlined the logic. A re-inlined copy
 * (e.g. someone pastes the loop back) silently forks behavior from the
 * tested module — these contracts catch that drift.
 */
import { readFileSync } from "fs";
import * as path from "path";

const thresholdSrc = readFileSync(
  path.join(__dirname, "..", "threshold.js"),
  "utf8",
);

const count = (needle: string): number => thresholdSrc.split(needle).length - 1;

describe("threshold.js uses the extracted helpers", () => {
  test("loadCSS imported from components/cssOverlay.js, no local copy", () => {
    expect(thresholdSrc).toMatch(
      /import\s*\{[^}]*loadCSS[^}]*\}\s*from\s*"\.\/components\/cssOverlay\.js"/,
    );
    expect(thresholdSrc).not.toMatch(/const loadCSS = /);
    expect(count("loadCSS(")).toBeGreaterThanOrEqual(2);
  });

  test("chaos helpers imported, fire-check delegated", () => {
    expect(thresholdSrc).toMatch(
      /import\s*\{[^}]*chaosFireIfDue[^}]*\}\s*from\s*"\.\/components\/chaos\.js"/,
    );
    expect(count("chaosFireIfDue(")).toBe(1);
    expect(thresholdSrc).not.toMatch(/const strHash = /);
    expect(thresholdSrc).not.toMatch(/CHAOS injected at/);
  });

  test("window URL helpers imported and used", () => {
    expect(thresholdSrc).toMatch(/parseWindowQuery\(/);
    expect(thresholdSrc).toMatch(/daisyChainRedirectURL\(/);
    expect(thresholdSrc).not.toMatch(/const parseWindowURL = /);
  });

  test("participant-info callback delegates to applyReturnedParticipantInfo", () => {
    expect(count("applyReturnedParticipantInfo(")).toBe(1);
    // The tricky session arithmetic must live only in the tested module.
    expect(thresholdSrc).not.toMatch(
      /setSession\(\s*session && isNaN\(Number\(session\)\)/,
    );
  });

  test("totalEnabledTrialsThisBlock replaces the inline filter/sum", () => {
    expect(count("totalEnabledTrialsThisBlock(")).toBeGreaterThanOrEqual(1);
    expect(thresholdSrc).not.toMatch(/possibleTrials/);
  });

  test("maxViewingDistanceCmForScreenWidthDeg replaces both inline computations", () => {
    expect(count("maxViewingDistanceCmForScreenWidthDeg(")).toBe(2);
    expect(thresholdSrc).not.toMatch(/2 \* tand\(/);
    expect(thresholdSrc).not.toMatch(/const tand = /);
  });

  test("lastConditionNamed replaces all 8 staircase lookup loops", () => {
    // One shared adoptStaircaseCondition wrapper calls the tested helper;
    // every staircase-driven kind routes through the wrapper.
    expect(count("lastConditionNamed(")).toBeGreaterThanOrEqual(1);
    expect(count("adoptStaircaseCondition();")).toBeGreaterThanOrEqual(8);
    expect(thresholdSrc).not.toMatch(
      /for \(let c of snapshot\.handler\.getConditions\(\)\)/,
    );
  });

  test("currentViewingDistanceCm replaces the 5 rc-distance clamps", () => {
    expect(count("currentViewingDistanceCm(")).toBeGreaterThanOrEqual(5);
    expect(thresholdSrc).not.toMatch(
      /\? rc\.viewingDistanceCm\.value\s*\n\s*: Math\.min\(viewingDistanceCm\.desired/,
    );
  });

  test("plainTextOfInstruction imported from markdownInline, no local copy", () => {
    expect(thresholdSrc).toMatch(
      /import\s*\{[^}]*plainTextOfInstruction[^}]*\}\s*from\s*"\.\/components\/markdownInline\.js"/,
    );
    expect(thresholdSrc).not.toMatch(/function plainTextOfInstruction\(/);
    expect(count("plainTextOfInstruction(")).toBeGreaterThanOrEqual(1);
  });
});
