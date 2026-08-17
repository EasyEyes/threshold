/**
 * @jest-environment node
 *
 * Parameter names are normalized by stripping invisible characters
 * (zero-width formats, bidi controls, …) and trimming whitespace. That is
 * only safe while NO glossary key (or superMatching pattern) contains such a
 * character — otherwise stripping could corrupt or alias a valid name. This
 * suite pins that invariant against future glossary updates.
 */
import { loadGlossaryForTests } from "./helpers/glossary";
import {
  getGlossary,
  getSuperMatchingParams,
} from "../parameters/glossaryRegistry";
import { normalizeParameterName } from "../preprocess/parameterName";

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("glossary parameter-name hygiene", () => {
  it("no glossary key contains whitespace or invisible characters", () => {
    const bad = Object.keys(getGlossary()).filter(
      (k) => normalizeParameterName(k) !== k,
    );
    expect(bad).toEqual([]);
  });

  it("no superMatching pattern contains whitespace or invisible characters", () => {
    const bad = getSuperMatchingParams().filter(
      (k: string) => normalizeParameterName(k) !== k,
    );
    expect(bad).toEqual([]);
  });

  it("normalization never aliases two distinct glossary keys", () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const k of Object.keys(getGlossary())) {
      const n = normalizeParameterName(k);
      if (seen.has(n) && seen.get(n) !== k)
        collisions.push(`${seen.get(n)} vs ${k}`);
      seen.set(n, k);
    }
    expect(collisions).toEqual([]);
  });
});
