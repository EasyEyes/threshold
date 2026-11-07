import { readFileSync } from "fs";
import {
  filePickerAccept,
  changeSentence,
  distributionPlotSvg,
  hasFiniteInterval,
  paginate,
  plotMaximum,
  recoveryGist,
  summarizeArchive,
  thresholdQuantity,
  SCENARIO_DEFINITION,
  TRIAL_DEFINITIONS,
  trialMatchesFilter,
  type TrialFilter,
} from "../tools/repair/presentation";

describe("repair page presentation", () => {
  test("file picker accepts both advertised CSV and ZIP inputs", () => {
    expect(filePickerAccept).toBe(".csv,.zip");
    const html = readFileSync("tools/repair/index.html", "utf8");
    expect(html).toContain(`accept="${filePickerAccept}"`);
  });

  test("pagination applies to the filtered trials, not all CSV rows", () => {
    const rows = Array.from({ length: 526 }, (_, i) => ({
      status: i < 78 ? "IGNORED" : "RANGED",
    }));
    const filtered = rows.filter((row) =>
      trialMatchesFilter(row.status, "output"),
    );
    const page = paginate(filtered, 0, 50);
    expect(page.total).toBe(448);
    expect(page.start).toBe(0);
    expect(page.end).toBe(50);
    expect(page.items).toHaveLength(50);
    expect(page.label).toBe("1–50 of 448");
    expect(page.pageCount).toBe(9);
  });

  test.each([
    ["output", "CORRECTED", true],
    ["output", "RANGED", true],
    ["output", "FLAGGED", false],
    ["review", "FLAGGED", true],
    ["review", "RANGED", false],
    ["all", "IGNORED", true],
  ] as [TrialFilter, string, boolean][])(
    "%s filter handles %s",
    (filter, status, expected) => {
      expect(trialMatchesFilter(status, filter)).toBe(expected);
    },
  );

  test("empty and out-of-range pages are honest and stable", () => {
    expect(paginate([], 0).label).toBe("0 of 0");
    expect(paginate([], 0).pageCount).toBe(1);
    const page = paginate([1, 2, 3], 99, 2);
    expect(page.page).toBe(1);
    expect(page.items).toEqual([3]);
    expect(page.label).toBe("3–3 of 3");
    expect(paginate([1, 2, 3], -4, 2).page).toBe(0);
  });

  test("corrected plot points without intervals do not masquerade as ranges", () => {
    expect(hasFiniteInterval([2, 2.5, undefined, undefined])).toBe(false);
    expect(hasFiniteInterval([2, 2.5, Number.NaN, 3])).toBe(false);
    expect(hasFiniteInterval([2, 2.5])).toBe(false);
    expect(hasFiniteInterval([2, 2.5, 2.4, 2.6])).toBe(true);
    expect(
      plotMaximum([
        [2, 2.5, undefined, undefined],
        [4, 5, 4.5, 5.5],
      ]),
    ).toBeCloseTo(6.05);
    expect(plotMaximum([[2, 2.5, undefined, undefined]])).toBeCloseTo(2.75);
  });

  test("scientific gist separates exact, two-candidate, and approximate recovery", () => {
    expect(
      recoveryGist({
        corrected: 0,
        ranged: 297,
        discreteScenarios: 175,
        continuousRanges: 122,
      }),
    ).toEqual({
      count: 297,
      heading: "trials with candidates or ranges",
      sentences: [
        "175 trials have two fixation candidates consistent with the logged triplet width.",
        "122 trials have approximate continuous ranges.",
      ],
    });
    expect(
      recoveryGist({
        corrected: 4,
        ranged: 0,
        discreteScenarios: 0,
        continuousRanges: 0,
      }),
    ).toEqual({
      count: 4,
      heading: "trials with exact recovered geometry",
      sentences: [],
    });
  });

  test("scientific change sentences state median, direction, quantity, and units", () => {
    expect(changeSentence(7.8, "eccentricity", true)).toBe(
      "The median increase in midpoint eccentricity, relative to the requested value, is 7.8%.",
    );
    expect(changeSentence(-2.4, "size or spacing", false)).toBe(
      "The median decrease in recovered size or spacing, relative to the requested value, is 2.4%.",
    );
    expect(changeSentence(0, "eccentricity", false)).toBe(
      "The median change in recovered eccentricity is 0.0%.",
    );
    expect(changeSentence(1.6, "spacing", true)).toBe(
      "The median increase in midpoint spacing, relative to the requested value, is 1.6%.",
    );
  });

  test("threshold quantity uses the experiment's measured dimension", () => {
    expect(thresholdQuantity(["spacingDeg", "spacingDeg"])).toBe("spacing");
    expect(thresholdQuantity(["targetSizeDeg"])).toBe("size");
    expect(thresholdQuantity(["flankerSpacingDeg"])).toBe("flanker spacing");
    expect(thresholdQuantity(["spacingDeg", "targetSizeDeg"])).toBe(
      "size or spacing",
    );
    expect(thresholdQuantity([])).toBe("size or spacing");
    expect(
      thresholdQuantity(
        ["spacingDeg", "targetDurationSec", "spacingDeg"],
        ["RANGED", "UNSUPPORTED", "CORRECTED"],
      ),
    ).toBe("spacing");
  });

  test("archive summary uses distributions of per-file medians", () => {
    const files = [
      [7.8, 1.6, 0.022],
      [6.0, 4.4, 0.014],
      [2.4, 0.6, 0.021],
      [12.3, 4.2, 0.014],
      [7.4, 3.8, 0.024],
      [3.0, 4.6, 0.02],
      [12.1, 4.9, 0.012],
    ].map(([eccentricity, spacing, uncertainty], i) => ({
      label: `P${i}`,
      eccentricity,
      spacing,
      uncertainty,
      quantity: "spacing" as const,
      mode: "midpoint" as const,
    }));
    expect(summarizeArchive(files)).toEqual({
      fileCount: 7,
      eccentricityMedian: 7.4,
      spacingMedian: 4.2,
      uncertaintyMedian: 0.02,
      quantity: "spacing",
    });
    const svg = distributionPlotSvg(files, "eccentricity", "eccentricity");
    expect(svg.match(/<circle/g)).toHaveLength(7);
    expect(svg).toContain("Median: +7.4%");
    expect(svg).toContain(">0%</text>");
    expect(svg).toContain("Per-file median eccentricity change (%)");
    expect(svg).toContain('role="img"');
  });

  test("archive median averages the two middle files for an even count", () => {
    const files = [1, 3].map((eccentricity) => ({
      label: String(eccentricity),
      eccentricity,
      spacing: Number.NaN,
      uncertainty: Number.NaN,
      quantity: "spacing" as const,
      mode: "exact" as const,
    }));
    expect(summarizeArchive(files).eccentricityMedian).toBe(2);
  });

  test("scientific terms are defined where the trial values appear", () => {
    expect(TRIAL_DEFINITIONS).toBe(
      "Eccentricity r is distance from fixation, in degrees. Log level = log₁₀[(spacing or size) / 1°].",
    );
    expect(SCENARIO_DEFINITION).toBe(
      "A and B are consistent with the logged triplet width. The data do not identify which occurred.",
    );
  });

  test("desktop typography makes key scientific numbers prominent", () => {
    const html = readFileSync("tools/repair/index.html", "utf8");
    expect(html).toContain("--metric-size: clamp(2.4rem, 3.2vw, 3.4rem)");
    expect(html).toContain("--gist-size: clamp(3rem, 4vw, 4.5rem)");
    expect(html).toMatch(
      /@media \(min-width: 64rem\)[\s\S]*:root\s*{\s*font-size: 18px;/,
    );
  });

  test("mobile layout constrains the educational demo to the viewport", () => {
    const html = readFileSync("tools/repair/index.html", "utf8");
    expect(html).toMatch(/\.layout\s*>\s*\*\s*{\s*min-width: 0;/);
    expect(html).toMatch(/\.onepoint-cols\s*{\s*flex-direction: column;/);
    expect(html).toMatch(/\.rowswrap\s*{[^}]*contain: layout paint;/);
    expect(html).toMatch(/\.metrics-grid\s*{\s*grid-template-columns: 1fr;/);
  });

  test("intro is concise and detailed background is disclosed", () => {
    const html = readFileSync("tools/repair/index.html", "utf8");
    expect(html).toMatch(/<h1>\s*Repair EasyEyes results\s*<\/h1>/);
    expect(html).toContain("Processed locally; originals remain unchanged.");
    expect(html).toContain("<h2>What happened?</h2>");
    expect(html).toContain("<h2>Statuses and output columns</h2>");
    expect(html).not.toContain('<details class="about">');
    expect(html).toContain('id="batchsummary"');
    expect(html).not.toContain("Scientific summary");
    expect(html).toMatch(/Final threshold\s+estimates\s+are not recomputed/);
    expect(html).not.toContain("nearest point wrong-coordinates bug</h1>");
  });
});
