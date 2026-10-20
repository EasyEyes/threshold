/**
 * Output-parameter naming contract: everything that reports font
 * pre-render behaviour is prefixed `fontPreRender` so the family is
 * semantically grouped and greppable in a results CSV.
 *
 * @jest-environment node
 */
import {
  AUTO_DECISION_OUTPUT_PARAMS,
  MEASURED_OUTPUT_PARAMS,
} from "../components/outputParameters";

describe("fontPreRender output-parameter grouping", () => {
  it("reports the measured pre-render time under the grouped name", () => {
    expect(MEASURED_OUTPUT_PARAMS).toContain("fontPreRenderTargetMeasuredSec");
  });

  it("no longer reports the ungrouped legacy name", () => {
    expect(MEASURED_OUTPUT_PARAMS).not.toContain("targetMeasuredPreRenderSec");
  });

  it("every pre-render-timing column in the family carries the prefix", () => {
    const preRenderish = MEASURED_OUTPUT_PARAMS.filter((p) =>
      /preRender/i.test(p),
    );
    expect(preRenderish.length).toBeGreaterThan(0);
    for (const p of preRenderish) expect(p).toMatch(/^fontPreRender/);
  });
});

describe("fontPreRender=auto decision columns", () => {
  it("groups every decision column under the same prefix", () => {
    expect(AUTO_DECISION_OUTPUT_PARAMS.length).toBeGreaterThan(0);
    for (const p of AUTO_DECISION_OUTPUT_PARAMS)
      expect(p).toMatch(/^fontPreRender/);
  });

  it("reports the decision with the measured/threshold evidence pair", () => {
    expect(AUTO_DECISION_OUTPUT_PARAMS).toEqual([
      "fontPreRenderModeUsed",
      "fontPreRenderMeasuredRasterSec",
      "fontPreRenderThresholdRasterSec",
    ]);
  });
});
