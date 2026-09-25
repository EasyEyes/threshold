// Field bug (results(2) data, study 129, CleverGrayDuck388, block 20
// "beauty-Naskh", trial 1, 72 min in): every questionAndAnswer block leaves
// `correctAns.current` as a bare STRING (components/image.js
// `correctAns.current = correctAnswer`), and the trial-scoring fallback
// calls `correctAns.current.sort()` assuming an array —
// "TypeError: correctAns.current.sort is not a function" kills the session.
// Scoring must coerce: string → [string].
import { correctAnsAsArray } from "../components/scoreIdentify";

describe("correctAnsAsArray — scoring coercion", () => {
  it("wraps a bare string (Q&A answer)", () => {
    expect(correctAnsAsArray("1955")).toEqual(["1955"]);
  });

  it("passes arrays through (same reference, mutation behavior preserved)", () => {
    const arr = ["b", "a"];
    expect(correctAnsAsArray(arr)).toBe(arr);
  });

  it("empty/null correctAns scores as no answer", () => {
    expect(correctAnsAsArray("")).toEqual([]);
    expect(correctAnsAsArray(undefined)).toEqual([]);
    expect(correctAnsAsArray(null)).toEqual([]);
  });
});

// Guard: the scoring branches must not call .sort() on the raw global.
describe("no bare correctAns.current.sort() in scoring", () => {
  it("threshold.js routes correctAns through the coercion", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.join(__dirname, "..", "threshold.js"),
      "utf8",
    );
    expect(src).not.toMatch(/correctAns\.current\.sort\(\)/);
    expect(src.match(/correctAnsAsArray\(correctAns\.current\)/g)?.length).toBe(
      2,
    );
  });
});
