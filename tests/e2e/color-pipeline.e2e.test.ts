/**
 * e2e tests for the EasyEyes color pipeline (psychojs/src/util/ColorPipeline.js).
 *
 * These run the REAL app — PsychoJS Window, PIXI v6 renderer, the pipeline's
 * own filters — and assert on pixels read back from the drawing buffer. That
 * is deliberately different from docs/hdr/p_canvascolor.html, which
 * characterizes the display with hand-written WebGL2 and shares no code with
 * the shipped pipeline.
 *
 * Requires a compiled example with simulateParticipantBool so the app boots
 * unattended:  npm run examples -- --simulate
 * (Tests skip themselves if it is absent, as elsewhere in tests/e2e/.)
 *
 * What these tests CANNOT see: anything after the drawing buffer — the OS
 * compositor's ICC transform, cable bit depth, panel dithering. Those need a
 * photometer; see ./COLOR_PIPELINE_PHOTOMETER_PROTOCOL.md.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EXPERIMENT_DIR = "examples/generated/PersianFontsCrwdngRdngCmfrtSim";
const EXPERIMENT = `/${EXPERIMENT_DIR}/index.html`;

const experimentExists = () =>
  fs.existsSync(path.join(__dirname, "..", "..", EXPERIMENT_DIR, "index.html"));

/** Probe handle type, kept loose — it lives in the page, not in Node. */
type Probe = any;

/**
 * Boot the app with the given pipeline switches and wait for the probe hook.
 * The probe is installed immediately after openWindow(), so this resolves
 * long before the trial flow starts.
 */
const boot = async (page: any, query: string) => {
  const errors: string[] = [];
  page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(`${EXPERIMENT}?colorPipelineProbe=1&${query}`);
  await page.waitForFunction(
    () => typeof (window as any).__EEcolorProbe !== "undefined",
    null,
    { timeout: 60000 },
  );
  return errors;
};

const report = (page: any) =>
  page.evaluate(() => (window as any).__EEcolorProbe.report());

test.describe("color pipeline", () => {
  test.beforeEach(() => {
    test.skip(
      !experimentExists(),
      `${EXPERIMENT_DIR} not compiled (run: npm run examples -- --simulate)`,
    );
  });

  // ------------------------------------------------------------------
  // 1. Capability reporting: requested vs achieved must be truthful.
  // ------------------------------------------------------------------

  test("default run leaves the pipeline inert", async ({ page }) => {
    const errors = await boot(page, "seed=1");
    const r = await report(page);

    expect(r.applied, "pipeline must be inert when nothing is requested").toBe(
      false,
    );
    expect(r.colorSpace).toBe("srgb");
    expect(r.float16Backbuffer).toBe(false);
    expect(r.dither).toBe(false);
    expect(r.floatColorPath).toBe(false);
    expect(errors).toEqual([]);
  });

  test("display-p3 tag is applied and reported", async ({ page }) => {
    await boot(page, "_screenColorSpace=display-p3&seed=1");
    const r = await report(page);

    expect(r.applied).toBe(true);
    // Chromium supports drawingBufferColorSpace, so this must actually take.
    expect(r.colorSpace).toBe("display-p3");
    expect(r.failures).toEqual([]);
    // The p3 tag alone must NOT switch on the float color path: that would
    // change text rasterization for every existing experiment.
    expect(r.floatColorPath).toBe(false);
  });

  test("dither engages without needing a float16 backbuffer", async ({
    page,
  }) => {
    await boot(page, "_screenDitherBool=TRUE&seed=1");
    const r = await report(page);

    expect(r.applied).toBe(true);
    expect(
      r.floatFilterTextures,
      "HALF_FLOAT filter textures are the prerequisite for dithering",
    ).toBe(true);
    expect(r.dither).toBe(true);
    expect(r.floatColorPath).toBe(true);
    expect(r.failures).toEqual([]);
  });

  test("float16 request either succeeds or explains itself", async ({
    page,
  }) => {
    await boot(page, "_screenFloat16Bool=TRUE&seed=1");
    const r = await report(page);

    expect(r.applied).toBe(true);
    if (r.float16Backbuffer) {
      expect(r.drawingBufferFormatIsRGBA16F).toBe(true);
      expect(r.failures).toEqual([]);
      expect(r.floatColorPath).toBe(true);
    } else {
      // A silent fallback is the failure mode that matters: if float16 was
      // requested and not achieved, the report must say why.
      expect(
        r.failures.length,
        "float16 declined without a recorded reason (silent fallback)",
      ).toBeGreaterThan(0);
    }
  });

  test("URL pipeline switches are ignored without instrumentation", async ({
    page,
  }) => {
    // Participant-style run: pipeline URL switches present, but neither
    // ?colorPipelineProbe nor ?colorPipelineLog. The switches must NOT take
    // effect — participant runs are governed solely by the glossary
    // parameters (_screenColorSpace / _screenFloat16Bool / _screenDitherBool).
    // logScreenColorPipelineReport always publishes window.__EEcolorPipeline,
    // so the outcome is observable without the probe.
    await page.goto(
      `${EXPERIMENT}?_screenDitherBool=TRUE&_screenFloat16Bool=TRUE&_screenColorSpace=display-p3&seed=1`,
    );
    await page.waitForFunction(
      () => typeof (window as any).__EEcolorPipeline !== "undefined",
      null,
      { timeout: 60000 },
    );
    const r = await page.evaluate(() => (window as any).__EEcolorPipeline);

    // This example was compiled with the pipeline off (glossary defaults),
    // so if any URL switch leaked through, `requested` would show it.
    expect(
      r.requested.ditherBool,
      "_screenDitherBool URL switch leaked into a non-instrumented run",
    ).toBe(false);
    expect(
      r.requested.float16Bool,
      "_screenFloat16Bool URL switch leaked into a non-instrumented run",
    ).toBe(false);
    expect(
      r.requested.colorSpace,
      "_screenColorSpace URL switch leaked into a non-instrumented run",
    ).toBe("srgb");
    expect(r.applied).toBe(false);
  });

  test("window.color assignment repaints on the next frame", async ({
    page,
  }) => {
    // Regression: Window's color attribute historically had no change
    // handler, so `window.color = ...` silently changed nothing until the
    // next fullscreenchange/_fullRefresh (call sites compensated with a
    // manual `_needUpdate = true`). Window.setColor now requests the
    // repaint itself; the probe's setBackground deliberately omits the
    // manual flag, so this measurement fails if the setter regresses.
    await boot(page, "seed=1");
    const measured = await page.evaluate(() => {
      const p: Probe = (window as any).__EEcolorProbe;
      return p.measureBackground({ rgb: [0.25, 0.25, 0.25] });
    });
    // Inert 8-bit mode: the buffer must hold exactly round(0.25·255)/255.
    expect(measured.temporalMean[0]).toBeCloseTo(
      Math.round(0.25 * 255) / 255,
      4,
    );
  });

  // ------------------------------------------------------------------
  // 2. Float color precision: does sub-LSB color reach the framebuffer?
  // (These also regression-test Window.setColor's unconditional repaint:
  // LEVEL_A and LEVEL_B share the same 8-bit hex, so a hasChanged-gated
  // setter would swallow the second assignment entirely.)
  // ------------------------------------------------------------------

  // Both levels sit inside the same 8-bit bin (128/255 = 0.50196), and away
  // from a rounding boundary so the 8-bit baseline is not a coin flip.
  const LEVEL_A = 0.501;
  const LEVEL_B = 0.5029;

  test("background: sub-LSB color difference is lost at 8 bits", async ({
    page,
  }) => {
    await boot(page, "seed=1");
    const { a, b } = await page.evaluate(
      ([va, vb]) => {
        const p: Probe = (window as any).__EEcolorProbe;
        return {
          a: p.measureBackground({ rgb: [va, va, va] }),
          b: p.measureBackground({ rgb: [vb, vb, vb] }),
        };
      },
      [LEVEL_A, LEVEL_B],
    );

    // The difference is < 1/255, so an 8-bit buffer must quantize both to the
    // same level. This pins the baseline the float path has to beat.
    expect(Math.abs(a.temporalMean[0] - b.temporalMean[0])).toBeLessThan(1e-6);
  });

  test("background: float16 preserves a sub-LSB color difference", async ({
    page,
  }) => {
    await boot(page, "_screenFloat16Bool=TRUE&seed=1");
    const r = await report(page);
    test.skip(
      !r.float16Backbuffer,
      `float16 backbuffer unavailable here: ${r.failures.join("; ")}`,
    );

    const { a, b } = await page.evaluate(
      ([va, vb]) => {
        const p: Probe = (window as any).__EEcolorProbe;
        return {
          a: p.measureBackground({ rgb: [va, va, va] }),
          b: p.measureBackground({ rgb: [vb, vb, vb] }),
        };
      },
      [LEVEL_A, LEVEL_B],
    );

    const delta = Math.abs(a.temporalMean[0] - b.temporalMean[0]);
    // float16 resolves ~2^-11 (0.00049) near 0.5, so ~0.0019 is resolvable.
    expect(
      delta,
      "float16 buffer collapsed a sub-LSB color difference",
    ).toBeGreaterThan(5e-4);
    expect(a.temporalMean[0]).toBeCloseTo(LEVEL_A, 3);
    expect(b.temporalMean[0]).toBeCloseTo(LEVEL_B, 3);
  });

  test("text: float path carries sub-LSB color into the glyph", async ({
    page,
  }) => {
    await boot(page, "_screenFloat16Bool=TRUE&seed=1");
    const r = await report(page);
    test.skip(
      !r.floatColorPath,
      `float color path inactive here: ${r.failures.join("; ")}`,
    );

    const { a, b } = await page.evaluate(
      ([va, vb]) => {
        const p: Probe = (window as any).__EEcolorProbe;
        return {
          a: p.measureTextInk({ text: "H", rgb: [va, va, va] }),
          b: p.measureTextInk({ text: "H", rgb: [vb, vb, vb] }),
        };
      },
      [LEVEL_A, LEVEL_B],
    );

    // Ink is the summed pixel value over the glyph box, so it is linear in
    // the stim color: a 0.4% color change must produce ~0.4% more ink.
    expect(a.ink[0], "no ink measured — glyph did not render").toBeGreaterThan(
      1,
    );
    const relative = (b.ink[0] - a.ink[0]) / a.ink[0];
    expect(relative).toBeGreaterThan(0.001);
    expect(relative).toBeLessThan(0.01);
  });

  test("text: white-rasterized glyphs are not left white", async ({ page }) => {
    await boot(page, "_screenFloat16Bool=TRUE&seed=1");
    const r = await report(page);
    test.skip(!r.floatColorPath, "float color path inactive here");

    // In the float path TextStim fills glyphs with #ffffff and relies on the
    // ColorizeFilter for the real color. If the filter fails to attach, text
    // renders white — a glaring, silent stimulus error.
    const measured = await page.evaluate(() => {
      const p: Probe = (window as any).__EEcolorProbe;
      return p.measureTextInk({ text: "H", rgb: [0.25, 0.25, 0.25] });
    });
    expect(
      measured.peak[0],
      "glyph peak is near white — ColorizeFilter did not apply the stim color",
    ).toBeLessThan(0.4);
    expect(measured.peak[0]).toBeGreaterThan(0.1);
  });

  // ------------------------------------------------------------------
  // 3. Dither: the temporal-average claim, stated as a measurement.
  // ------------------------------------------------------------------

  // Exactly halfway between two 8-bit codes, so an 8-bit pipe cannot
  // represent it at all and dither must alternate 128/255 and 129/255.
  const HALFWAY = 128.5 / 255;

  test("dither: per-frame noise averages to the requested value", async ({
    page,
  }) => {
    await boot(page, "_screenDitherBool=TRUE&seed=1");
    const r = await report(page);
    expect(r.dither).toBe(true);

    const measured = await page.evaluate((v) => {
      const p: Probe = (window as any).__EEcolorProbe;
      return {
        patch: p.measureBackground({
          rgb: [v, v, v],
          frames: 64,
          patchCss: 32,
        }),
        // A single pixel, to see the noise itself: a spatial average over a
        // patch is already so close to the requested value that frame-to-frame
        // variation of the patch mean is ~1e-5 and proves nothing.
        pixel: p.measureBackground({ rgb: [v, v, v], frames: 64, patchCss: 1 }),
      };
    }, HALFWAY);

    // Spatial dither: neighbouring pixels straddle the two codes.
    expect(
      measured.patch.frames[0].distinct8Bit,
      "a dithered patch must contain more than one 8-bit level",
    ).toBeGreaterThanOrEqual(2);

    // Temporal dither: one pixel takes different values on different frames.
    const pixelValues = new Set(
      measured.pixel.frames.map((f: any) => Math.round(f.mean[0] * 255)),
    );
    expect(
      pixelValues.size,
      "a single pixel never changed across 64 frames — dither is not advancing",
    ).toBeGreaterThanOrEqual(2);

    // The noisy-bit guarantee: the temporal mean lands on a level the 8-bit
    // buffer cannot represent, well within one LSB.
    expect(measured.patch.temporalMean[0]).toBeCloseTo(HALFWAY, 3);
    expect(
      Math.abs(measured.patch.temporalMean[0] - HALFWAY),
      "temporal mean is biased away from the requested level",
    ).toBeLessThan(0.3 / 255);
  });

  test("dither: an undithered in-between level is quantized instead", async ({
    page,
  }) => {
    await boot(page, "seed=1");
    const measured = await page.evaluate((v) => {
      const p: Probe = (window as any).__EEcolorProbe;
      return p.measureBackground({ rgb: [v, v, v], frames: 8, patchCss: 32 });
    }, HALFWAY);

    // Without dither every frame is identical and snapped to one 8-bit code,
    // so the mean cannot sit between codes.
    const frameMeans = measured.frames.map((f: any) => f.mean[0]);
    expect(Math.max(...frameMeans) - Math.min(...frameMeans)).toBeLessThan(
      1e-6,
    );
    expect(measured.frames[0].distinct8Bit).toBe(1);
    expect(Math.abs(measured.temporalMean[0] - HALFWAY)).toBeGreaterThan(
      0.3 / 255,
    );
  });

  // ------------------------------------------------------------------
  // 4. Regression: dither must not break the blackout detector.
  // ------------------------------------------------------------------

  test("blackout is detected with the pipeline off", async ({ page }) => {
    await boot(page, "seed=1");
    const b = await page.evaluate(() =>
      (window as any).__EEcolorProbe.blackout({ frames: 8 }),
    );
    expect(b.detectedEveryFrame, "baseline blackout detection is broken").toBe(
      true,
    );
  });

  test("blackout is still detected with dither on", async ({ page }) => {
    await boot(page, "_screenDitherBool=TRUE&seed=1");
    const b = await page.evaluate(() =>
      (window as any).__EEcolorProbe.blackout({ frames: 8 }),
    );

    // components/boundingNew.js isPointBlack requires every probe point to
    // read below 0.5/255. With dither on, black + noise quantizes to 0 or
    // 1/255, and the 1/255 pixels fail that fixed threshold — so a real
    // blackout goes unreported. The threshold must scale with the active
    // dither LSB.
    expect(
      b.detectedEveryFrame,
      `blackout undetected on ${b.frames - b.detectedCount}/${
        b.frames
      } frames; max black-screen pixel was ${b.maxRed} vs ` +
        `isPointBlack threshold ${b.isPointBlackThreshold}. ` +
        "isPointBlack's threshold does not account for dither noise.",
    ).toBe(true);
  });

  // ------------------------------------------------------------------
  // 5. Filter resolution (regression: blurry/chunky stimuli on Retina).
  //
  // PIXI v6 Filters default to settings.FILTER_RESOLUTION = 1, while the
  // EasyEyes renderer runs at devicePixelRatio. Pipeline filters left at 1
  // render text/background/scene into a CSS-pixel-density texture and
  // upscale it: blurry stimuli, and dither noise in devicePixelRatio-sized
  // blocks. Invisible at deviceScaleFactor 1 (the Playwright default) —
  // which is how it escaped this suite — so this block runs at 2.
  // ------------------------------------------------------------------

  test.describe("at devicePixelRatio 2", () => {
    test.use({
      deviceScaleFactor: 2,
      viewport: { width: 1280, height: 720 },
    });

    test("pipeline filters run at the renderer's resolution", async ({
      page,
    }) => {
      await boot(page, "_screenDitherBool=TRUE&seed=1");
      const r = await report(page);

      expect(
        r.devicePixelRatio,
        "harness did not apply deviceScaleFactor",
      ).toBe(2);
      expect(
        r.rendererResolution,
        "renderer is not devicePixelRatio-scaled — this test has lost its premise",
      ).toBeGreaterThan(1);
      expect(r.dither).toBe(true);
      expect(
        r.ditherFilterResolution,
        "dither filter resolution differs from the renderer's (PIXI default of 1 blurs the whole scene)",
      ).toBe(r.rendererResolution);
      expect(
        r.backgroundFilterResolution,
        "background ColorizeFilter resolution differs from the renderer's",
      ).toBe(r.rendererResolution);
    });

    test("dither noise is independent per DEVICE pixel, not per CSS pixel", async ({
      page,
    }) => {
      await boot(page, "_screenDitherBool=TRUE&seed=1");
      const r = await report(page);
      expect(r.dither).toBe(true);

      // At a level exactly halfway between two 8-bit codes, independent
      // per-device-pixel noise makes horizontally adjacent pixels agree
      // ~50% of the time. Noise generated at CSS-pixel density and
      // upscaled ×2 is shared/blended between neighbors, pushing agreement
      // to ~75%+. Average over frames for a stable estimate.
      const HALFWAY = 128.5 / 255;
      const agree = await page.evaluate((v) => {
        const p: any = (window as any).__EEcolorProbe;
        const m = p.measureBackground({
          rgb: [v, v, v],
          frames: 32,
          patchCss: 32,
        });
        const per = m.frames
          .map((f: any) => f.horizAgree8Bit)
          .filter((x: any) => typeof x === "number");
        return per.reduce((a: number, b: number) => a + b, 0) / per.length;
      }, HALFWAY);

      expect(
        agree,
        `adjacent-device-pixel agreement ${agree.toFixed(
          3,
        )} — dither noise is ` +
          "spatially correlated, i.e. generated below device resolution",
      ).toBeLessThan(0.65);
    });
  });

  // ------------------------------------------------------------------
  // 6. Per-presentation logging (the human-observer instrumentation).
  // ------------------------------------------------------------------

  test("per-presentation logging records each stimulus", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (m: any) => {
      if (m.text().startsWith("[EEcolor]")) logs.push(m.text());
    });

    await page.goto(
      `${EXPERIMENT}?colorPipelineLog=1&_screenDitherBool=TRUE&seed=1`,
    );

    // Wait for the simulated observer to complete a few trials.
    await page.waitForFunction(
      () => ((window as any).__EEcolorLog?.length ?? 0) >= 3,
      null,
      { timeout: 120000 },
    );

    const records = await page.evaluate(() => (window as any).__EEcolorLog);
    expect(records.length).toBeGreaterThanOrEqual(3);
    for (const rec of records) {
      expect(rec.label).toBeTruthy();
      expect(rec.dither).toBe(true);
      expect(rec.peakRGB).toHaveLength(3);
      // A presentation that measured an empty screen means the hook fired
      // before the stimulus was flipped.
      expect(rec.distinct8BitLevels).toBeGreaterThan(1);
    }
    expect(logs.length).toBeGreaterThanOrEqual(3);
  });
});
