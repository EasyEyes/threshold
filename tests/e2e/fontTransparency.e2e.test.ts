/**
 * e2e tests for fontTransparency (components/fontTransparency.ts).
 *
 * Glossary: fontTransparency (default 1, range 0 to 1) scales the "A" of
 * fontColorRGBA. With color A and fontTransparency a, the effective
 * transparency is a*A, and a fully covered pixel shows
 *
 *   a*A * (R, G, B) + (1 - a*A) * background
 *
 * thresholdParameter=fontTransparency lets QUEST control it.
 *
 * These run the REAL app and assert on pixels read back from the drawing
 * buffer, like color-pipeline.e2e.test.ts (see there for what a readback can
 * and cannot see).
 *
 * Requires the compiled, simulated example. Build it with:
 *   cp tests/sim/assets/rsvpReading-transparency-sim.csv examples/tables/
 *   cp tests/sim/assets/texts/short-reading.txt examples/texts/
 *   (cd examples && npx tsx buildExamples.ts rsvpReading-transparency-sim.csv --simulate)
 * (Tests skip themselves if it is absent, as elsewhere in tests/e2e/.)
 *
 * The table itself turns color management on (_screenFloat16Bool and
 * _screenDitherBool TRUE); the 8-bit runs switch it off by URL, which the
 * app honors only under ?colorPipelineProbe.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

const EXPERIMENT_DIR = "examples/generated/rsvpReading-transparency-sim";
const EXPERIMENT = `/${EXPERIMENT_DIR}/index.html`;

const experimentExists = () =>
  fs.existsSync(path.join(__dirname, "..", "..", EXPERIMENT_DIR, "index.html"));

const PIPELINE_OFF = "_screenFloat16Bool=FALSE&_screenDitherBool=FALSE";
const FLOAT16_ONLY = "_screenFloat16Bool=TRUE&_screenDitherBool=FALSE";

const LSB = 1 / 255;

/** Boot the app and wait for the probe hook (installed after openWindow()). */
const boot = async (page: any, query: string) => {
  await page.goto(`${EXPERIMENT}?colorPipelineProbe=1&${query}&seed=1`);
  await page.waitForFunction(
    () => typeof (window as any).__EEcolorProbe !== "undefined",
    null,
    { timeout: 60000 },
  );
};

const report = (page: any) =>
  page.evaluate(() => (window as any).__EEcolorProbe.report());

/** One solid block glyph through the real TextStim path, at an opacity. */
const measureBlock = (
  page: any,
  spec: { rgb: number[]; backgroundRgb: number[]; opacity: number },
) =>
  page.evaluate((s: any) => {
    const p: any = (window as any).__EEcolorProbe;
    const m = p.measureTextInk({ text: "█", heightPx: 200, ...s });
    // Extremes over a box that holds both the glyph and bare background.
    return { min: m.frames[0].min, max: m.frames[0].max };
  }, spec);

test.describe("fontTransparency", () => {
  test.beforeEach(() => {
    test.skip(
      !experimentExists(),
      `${EXPERIMENT_DIR} not compiled (see the header of this file)`,
    );
  });

  // ------------------------------------------------------------------
  // 1. The blend: opacity * color + (1 - opacity) * background.
  // ------------------------------------------------------------------

  // Chosen so each channel's covered pixel is an extreme of the box:
  // R above its background, G above, B below.
  const FG = [1, 0.5, 0];
  const BG = [0, 0.2, 1];
  const OPACITY = 0.2;
  const blended = FG.map((c, i) => OPACITY * c + (1 - OPACITY) * BG[i]);

  test("opacity blends the text color with the background (8-bit)", async ({
    page,
  }) => {
    await boot(page, PIPELINE_OFF);
    const r = await report(page);
    expect(r.applied, "pipeline should be off for this test").toBe(false);

    const m = await measureBlock(page, {
      rgb: FG,
      backgroundRgb: BG,
      opacity: OPACITY,
    });
    const covered = [m.max[0], m.max[1], m.min[2]];
    for (let c = 0; c < 3; c++)
      expect(
        Math.abs(covered[c] - blended[c]),
        `channel ${c}: covered pixel ${covered[c]} vs ${blended[c]}`,
      ).toBeLessThan(1.5 * LSB);
  });

  test("opacity blends the text color with the background (float16)", async ({
    page,
  }) => {
    await boot(page, FLOAT16_ONLY);
    const r = await report(page);
    test.skip(
      !r.float16Backbuffer,
      `float16 backbuffer unavailable here: ${r.failures.join("; ")}`,
    );

    const m = await measureBlock(page, {
      rgb: FG,
      backgroundRgb: BG,
      opacity: OPACITY,
    });
    const covered = [m.max[0], m.max[1], m.min[2]];
    for (let c = 0; c < 3; c++)
      expect(
        Math.abs(covered[c] - blended[c]),
        `channel ${c}: covered pixel ${covered[c]} vs ${blended[c]}`,
      ).toBeLessThan(5e-4);
  });

  test("opacity 1 leaves the font color as specified", async ({ page }) => {
    await boot(page, PIPELINE_OFF);
    const m = await measureBlock(page, {
      rgb: FG,
      backgroundRgb: BG,
      opacity: 1,
    });
    const covered = [m.max[0], m.max[1], m.min[2]];
    for (let c = 0; c < 3; c++)
      expect(Math.abs(covered[c] - FG[c])).toBeLessThan(1.5 * LSB);
  });

  // ------------------------------------------------------------------
  // 2. Precision: with color management on, opacity must not move in
  //    steps of 1/255 (which is how PIXI carries a sprite's alpha).
  // ------------------------------------------------------------------

  test("float16: a faint opacity is exact, not rounded to a 1/255 step", async ({
    page,
  }) => {
    await boot(page, FLOAT16_ONLY);
    const r = await report(page);
    test.skip(
      !r.float16Backbuffer,
      `float16 backbuffer unavailable here: ${r.failures.join("; ")}`,
    );

    // White on black, so the covered pixel reads the opacity itself.
    // 0.01 * 255 = 2.55: an 8-bit alpha would show 2/255 = 0.0078.
    const m = await measureBlock(page, {
      rgb: [1, 1, 1],
      backgroundRgb: [0, 0, 0],
      opacity: 0.01,
    });
    expect(Math.abs(m.max[0] - 0.01)).toBeLessThan(2e-4);
  });

  test("float16: two opacities closer than 1/255 stay distinct", async ({
    page,
  }) => {
    await boot(page, FLOAT16_ONLY);
    const r = await report(page);
    test.skip(
      !r.float16Backbuffer,
      `float16 backbuffer unavailable here: ${r.failures.join("; ")}`,
    );

    // 0.2 and 0.201 both truncate to 51/255 as an 8-bit alpha.
    const a = await measureBlock(page, {
      rgb: [1, 1, 1],
      backgroundRgb: [0, 0, 0],
      opacity: 0.2,
    });
    const b = await measureBlock(page, {
      rgb: [1, 1, 1],
      backgroundRgb: [0, 0, 0],
      opacity: 0.201,
    });
    expect(b.max[0] - a.max[0]).toBeGreaterThan(5e-4);
    expect(b.max[0] - a.max[0]).toBeLessThan(1.5e-3);
  });

  // ------------------------------------------------------------------
  // 3. The whole study, run by the simulated participant.
  //    Block 1: QUEST on targetDurationSec, fontTransparency fixed at 0.2.
  //    Block 2: QUEST on fontTransparency.
  //    Block 3: fontTransparency 0.1 with a color whose A is 0.5, plus a
  //             targetContrast, which must have no effect on text.
  // ------------------------------------------------------------------

  // Screen background (screenColorRGBA default) behind every word.
  const SCREEN = 0.92;
  // The results CSV keeps about ten significant digits; compare to six
  // decimal places.
  const CSV_DIGITS = 6;

  type Sample = {
    opacity: number;
    color: string;
    min: number[];
    max: number[];
  };

  /**
   * Each animation frame, look for RSVP word stims being drawn; for each
   * new one, render a frame and read back the pixels around it.
   */
  const installWordSampler = () => {
    (window as any).__rsvpSamples = [];
    const seen = new WeakSet();
    const tick = () => {
      const probe = (window as any).__EEcolorProbe;
      const drawList = probe?.psychoJS?.window?._drawList;
      if (Array.isArray(drawList)) {
        for (const stim of drawList) {
          if (!/ReadingTarget/.test(String(stim._name))) continue;
          if (seen.has(stim) || !stim._pixi) continue;
          seen.add(stim);
          probe.renderFrames(1);
          const at = probe.readRect(stim._pos[0], stim._pos[1], 500, 160);
          (window as any).__rsvpSamples.push({
            opacity: stim._opacity,
            color: String(stim._color),
            min: at.min.slice(0, 3),
            max: at.max.slice(0, 3),
          });
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const runStudy = async (page: any, query: string) => {
    const errors: string[] = [];
    page.on("pageerror", (e: Error) => errors.push(e.message));
    await page.addInitScript(installWordSampler);
    const download = page.waitForEvent("download", {
      predicate: (d: any) => d.suggestedFilename().endsWith(".csv"),
      timeout: 200000,
    });
    await page.goto(
      `${EXPERIMENT}?colorPipelineProbe=1${query ? `&${query}` : ""}&seed=1`,
    );
    const csvPath = await (await download).path();
    const rows = Papa.parse(fs.readFileSync(csvPath, "utf8"), {
      header: true,
      skipEmptyLines: true,
    }).data as Record<string, string>[];
    const samples: Sample[] = await page.evaluate(
      () => (window as any).__rsvpSamples,
    );
    const trials = rows.filter((r) => (r.actualFontTransparency ?? "") !== "");
    const block = (b: string) => trials.filter((r) => r.block_condition === b);
    return { errors, samples, trials, block };
  };

  /** Covered-pixel error of one sampled word, against the blend formula. */
  const blendError = (s: Sample): number => {
    const fg = /\(([^)]+)\)/
      .exec(s.color)![1]
      .split(",")
      .slice(0, 3)
      .map((v) => parseFloat(v) / 255);
    return Math.max(
      ...fg.map((c, i) => {
        const expected = s.opacity * c + (1 - s.opacity) * SCREEN;
        // The covered pixel is the extreme on the far side of the background.
        const measured = expected >= SCREEN ? s.max[i] : s.min[i];
        return Math.abs(measured - expected);
      }),
    );
  };

  const checkStudy = (
    { errors, samples, trials, block }: Awaited<ReturnType<typeof runStudy>>,
    pixelTolerance: number,
  ) => {
    expect(errors).toEqual([]);
    expect(trials).toHaveLength(8);

    // Block 1: fixed fontTransparency, QUEST on duration.
    for (const r of block("1_1")) {
      expect(r.thresholdParameter).toBe("targetDurationSec");
      expect(Number(r.actualFontTransparency)).toBe(0.2);
      expect(Number(r.actualFontEffectiveTransparency)).toBe(0.2);
      expect(Number(r.rsvpReadingWordDurationSec)).toBeCloseTo(
        Math.pow(10, Number(r.level)),
        CSV_DIGITS,
      );
    }

    // Block 2: QUEST on fontTransparency, at the fixed duration.
    const quest = block("2_1");
    expect(quest).toHaveLength(4);
    for (const r of quest) {
      expect(r.thresholdParameter).toBe("fontTransparency");
      const level = Number(r.level);
      expect(Number.isFinite(level)).toBe(true);
      expect(level).toBeLessThanOrEqual(0);
      expect(level).toBe(Math.min(Number(r.levelProposedByQUEST), 0));
      expect(Number(r.actualFontTransparency)).toBeCloseTo(
        Math.pow(10, level),
        CSV_DIGITS,
      );
      expect(Number(r.rsvpReadingWordDurationSec)).toBe(0.3);
    }
    // QUEST starts near thresholdGuess (0.2) and moves with the responses.
    expect(Math.abs(Number(quest[0].level) - Math.log10(0.2))).toBeLessThan(
      0.3,
    );
    expect(new Set(quest.map((r) => r.level)).size).toBeGreaterThan(1);

    // Block 3: effective transparency is fontTransparency times A.
    for (const r of block("3_1")) {
      expect(Number(r.actualFontTransparency)).toBe(0.1);
      expect(Number(r.actualFontEffectiveTransparency)).toBeCloseTo(
        0.05,
        CSV_DIGITS,
      );
    }

    // Three words per trial, each drawn at its trial's effective
    // transparency, and blended with the screen as the glossary says.
    expect(samples).toHaveLength(3 * trials.length);
    samples.forEach((s, i) => {
      const trial = trials[Math.floor(i / 3)];
      expect(s.opacity).toBeCloseTo(
        Number(trial.actualFontEffectiveTransparency),
        CSV_DIGITS,
      );
      expect(
        blendError(s),
        `word ${i} (trial ${Math.floor(i / 3)}, opacity ${s.opacity})`,
      ).toBeLessThan(pixelTolerance);
    });
  };

  test("simulated study, color management on", async ({ page }) => {
    test.setTimeout(240000);
    const run = await runStudy(page, "");
    const pipeline = await page.evaluate(
      () => (window as any).__EEcolorPipeline,
    );
    test.skip(
      !pipeline.floatColorPath,
      `float color path inactive here: ${pipeline.failures.join("; ")}`,
    );
    // Dither adds up to half a step of noise to the extremes read back.
    checkStudy(run, 1 * LSB);
  });

  test("simulated study, color management off", async ({ page }) => {
    test.setTimeout(240000);
    const run = await runStudy(page, PIPELINE_OFF);
    const pipeline = await page.evaluate(
      () => (window as any).__EEcolorPipeline,
    );
    expect(pipeline.applied).toBe(false);
    // 8-bit alpha, then 8-bit output: up to two steps from the ideal blend.
    checkStudy(run, 2 * LSB);
  });
});
