/**
 * Compatibility-flow outcome contracts: the flow result must carry a
 * terminationLabel (specific, or empty when generic) plus the CURRENT
 * evaluation's unmetNeeds, and every active rejection path must supply a
 * specific label — a bare "incompatible" default can no longer hide a
 * missing cause (Denis's rule: error=incompatible ⇒ same-row unmetNeeds;
 * no needs ⇒ a different, specific error).
 *
 * Source contracts because compatibilityFlow's UI chain is not
 * jsdom-loadable; the serializer half of the rule is behavioral in
 * tests/terminationColumns.test.ts, and checkSystemCompatibility's
 * evaluation freshness is behavioral in tests/compatibilityReportNeeds.test.ts.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";

const read = (rel: string) =>
  readFileSync(path.join(__dirname, "..", rel), "utf8");

const flowSrc = () => read("components/compatibilityFlow.js");
const thresholdSrc = () => read("threshold.js");

describe("flow result vocabulary", () => {
  test("field is terminationLabel — not the misnomer unmetNeed", () => {
    expect(flowSrc()).toMatch(/terminationLabel/);
    expect(flowSrc()).not.toMatch(/\bunmetNeed\b/);
  });

  test("rejection results carry unmetNeeds (current evaluation)", () => {
    expect(flowSrc()).toMatch(
      /terminationLabel,\s*\n\s*unmetNeeds,\s*\n\s*\}\);/,
    );
  });

  test("no generic 'incompatible' default label", () => {
    expect(flowSrc()).not.toMatch(/unmetNeed\s*=\s*"incompatible"/);
    expect(flowSrc()).not.toMatch(/terminationLabel\s*=\s*"incompatible"/);
  });

  test("camera rejection keeps its specific labels", () => {
    for (const label of [
      "rc:noCameraDetected",
      "rc:selectCameraFailed",
      "rc:cameraSelectionCancelled",
    ]) {
      expect(flowSrc()).toContain(label);
    }
  });

  test("sound-output selection Quit gets a specific label", () => {
    expect(flowSrc()).toContain("soundOutput:selectionQuit");
  });

  test("the report step forwards the evaluation's unmetNeeds to the report page", () => {
    expect(flowSrc()).toMatch(/compMsg\.unmetNeeds/);
  });
});

describe("threshold wiring", () => {
  test("destructures terminationLabel and unmetNeeds from the flow result", () => {
    expect(thresholdSrc()).toMatch(/terminationLabel,\s*\n\s*unmetNeeds,/);
    expect(thresholdSrc()).not.toMatch(/getUnmetNeeds/);
  });

  test("composes the exit reason from the flow outcome only", () => {
    expect(thresholdSrc()).toMatch(
      /incompatibleExitReason\(\s*terminationLabel,\s*unmetNeeds\s*,?\s*\)/,
    );
  });
});
