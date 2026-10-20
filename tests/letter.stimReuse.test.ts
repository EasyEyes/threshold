/**
 * getTargetStim stimulus REUSE — the regen-guard core of the
 * Acuity24FontsAddSloan9 crosshair-stall fix. When the letter regeneration
 * re-runs for a re-armed tracking gate, nothing that affects rasterization
 * has changed within the trial (same text, height, font) — only the
 * position. Re-destroying and re-creating the TextStim re-rasterizes the
 * glyphs (~0.1–1.5 s main-thread block in the field), which is what
 * sustains the thrash livelock. Desired behavior: reuse the existing stim
 * (setPos only); recreate when text/font differ or the size moves beyond
 * a ~4% quantized step (see the identity comment in letter.js).
 *
 * @jest-environment node
 */

/**
 * T5 — verify the real call sites forward `font.kerning` to TextStim.
 * Behavioral (not source-grep): loads REAL modules, exercises the real
 * TextStim-building paths, asserts the resulting stim carries `_kerning`.
 *
 * @jest-environment node
 */

// --- shared mocking (mirror textStim.kerning.test.ts, drive TextStim for real) ---
jest.mock("../psychojs/src/core/PsychoJS.js", () => ({
  PsychoJS: { Status: { NOT_STARTED: 0, STARTED: 1, STOPPED: 2, FINISHED: 3 } },
}));
jest.mock(
  "log4javascript",
  () => ({
    getLogger: () => ({ debug() {}, info() {}, error() {}, warn() {} }),
    Level: { ALL: 0 },
  }),
  { virtual: true },
);

jest.mock(
  "pixi.js-legacy",
  () => {
    class Text {
      canvas = { setAttribute: jest.fn(), getContext: () => ({}) };
      context = {};
      anchor = { x: 0, y: 0 };
      scale = { x: 1, y: 1 };
      dirty = true;
      constructor(
        public text: string,
        public style: unknown,
      ) {}
      updateText = jest.fn();
      destroy() {}
      get width() {
        return 10;
      }
      get height() {
        return 10;
      }
    }
    return {
      Text,
      TextMetrics: { METRICS_STRING: "", _canvas: { getContext: () => null } },
      TextStyle: class {
        constructor(o: unknown) {
          Object.assign(this, o);
        }
        toFontString() {
          return "10px Arial";
        }
      },
      Rectangle: class {
        constructor(
          public x = 0,
          public y = 0,
          public w = 0,
          public h = 0,
        ) {}
        static EMPTY = {};
      },
      Point: class {
        constructor(
          public x = 0,
          public y = 0,
        ) {}
      },
    };
  },
  { virtual: true },
);

// --- letter.js-specific deps ---
jest.mock("webfontloader", () => ({ load: jest.fn() }));
jest.mock("../threshold", () => ({ paramReader: {} }));
jest.mock("../components/utils", () => ({
  isBlockLabel: (bc: string) => /^[0-9]+$/.test(String(bc)),
  toFixedNumber: jest.fn(),
  colorRGBASnippetToRGBA: () => undefined, // default white; the real string "0,0,0,1" is not a Color-parsable name
  logger: { debug() {}, info() {}, error() {}, warn() {} },
  Rectangle: class {},
  sendEmailForDebugging: jest.fn(),
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    window: {
      _psychoJS: { fontRenderMaxPx: 1000 },
      units: "height",
      autoLog: false,
      _drawList: [],
      size: [1000, 1000],
      getActualFrameRate: () => 60,
    },
    experiment: { addData: jest.fn() },
  },
}));
jest.mock("../components/boundingNew", () => ({ ctx: {} }));
jest.mock("../components/errorHandling", () => ({ warning: jest.fn() }));

// Real TextStim (with kerning wiring) but bypass the psychojs barrel's Window.js
// → multiple-displays/globals.ts → `window` TLA chain. Import TextStim directly
// and expose it under the same `visual` namespace letter.js expects.
import { TextStim } from "../psychojs/src/visual/TextStim.js";
jest.mock("../psychojs/src", () => ({ visual: { TextStim } }));

// Real `font` singleton: provide a real mutable object (letter.js reads
// `font.kerning` off it at call time) while stubbing global.js's TLA chain.
const liveFont: Record<string, unknown> = {};
jest.mock("../components/global", () => ({
  font: liveFont,
  letterConfig: {},
  targetTextStimConfig: {},
  status: {},
  thisExperimentInfo: {},
}));
import { getTargetStim } from "../components/letter";
import {
  beginAutoTrial,
  recordAutoRasterSec,
} from "../components/fontPreRenderAuto";
import { psychoJS } from "../components/globalPsychoJS";

/** The (mocked) addData spy — auto logs its resolved mode per trial. */
const addDataSpy = () => (psychoJS as any).experiment.addData as jest.Mock;

function makeReader(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    fontPixiMetricsString: "",
    fontCharacterSet: "ABC",
    fontPadding: 0.2,
    fontMedialShapeTargetBool: false,
    // Reuse behavior is gated behind fontPreRender=buffer (glossary
    // param, default none = exact per-arm re-raster status quo).
    fontPreRender: "buffer",
    ...overrides,
  };
  return {
    read: jest.fn((name: string) => (name in values ? values[name] : "")),
  };
}

beforeEach(() => {
  for (const k of Object.keys(liveFont)) delete liveFont[k];
  liveFont.name = "Arial";
  liveFont.language = "en";
});

const font = liveFont;

/** Shadow the stim's destroy so tests can assert whether it was called. */
const stubDestroy = (stim: unknown) => ((stim as any).destroy = jest.fn());

describe("getTargetStim stimulus reuse", () => {
  // sizeDeg is the stimulus definition (deg); heightPx is the deg→px
  // conversion, which drifts sub-0.5% with the fixation position.
  const params = (heightPx: number, pos: [number, number], sizeDeg = 1) =>
    ({ heightPx, sizeDeg, targetAndFlankersXYPx: [pos] }) as never;

  describe("fontPreRender none (default): exact status quo", () => {
    it("recreates even when the identity matches", () => {
      const old = getTargetStim(
        params(50, [10, 10]),
        makeReader({ fontPreRender: "none" }) as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      const destroySpy = stubDestroy(old);
      const next = getTargetStim(
        params(50, [99, 99]),
        makeReader({ fontPreRender: "none" }) as never,
        "1_1",
        "A",
        old,
        0,
      );
      expect(next).not.toBe(old);
      expect(destroySpy).toHaveBeenCalled();
    });

    it("recreates when the parameter is absent (glossary default none)", () => {
      const old = getTargetStim(
        params(50, [10, 10]),
        makeReader() as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      const destroySpy = stubDestroy(old);
      const readerNoParam = {
        read: jest.fn((name: string) =>
          name === "fontPreRender" ? undefined : makeReader().read(name),
        ),
      };
      const next = getTargetStim(
        params(50, [99, 99]),
        readerNoParam as never,
        "1_1",
        "A",
        old,
        0,
      );
      expect(next).not.toBe(old);
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  it("reuses the stim when only the position changed", () => {
    const old = getTargetStim(
      params(50, [10, 10]),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const reused = getTargetStim(
      params(50, [99, 99]),
      makeReader() as never,
      "1_1",
      "A",
      old,
      0,
    );
    expect(reused).toBe(old);
    expect(destroySpy).not.toHaveBeenCalled();
    expect((reused as any).pos).toEqual([99, 99]);
  });

  it("reuses despite deg→px drift when sizeDeg is identical (exact key)", () => {
    const old = getTargetStim(
      params(16.5, [10, 10], 0.3),
      makeReader() as never,
      "1_1",
      "S",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const reused = getTargetStim(
      params(16.5 * 1.004, [42, 42], 0.3),
      makeReader() as never,
      "1_1",
      "S",
      old,
      0,
    );
    expect(reused).toBe(old);
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it("reuses when sizeDeg differs by only the deg↔px roundtrip jitter", () => {
    // sizeDeg is computed as heightPxToDeg(fontSizePx, targetXY) — a
    // roundtrip evaluated at the target position, which moves on every
    // re-arm, jittering sizeDeg ~0.005%. Exact matching would
    // re-rasterize every arm (the livelock this guard prevents).
    const old = getTargetStim(
      params(50, [10, 10], 2.533564797770903),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const reused = getTargetStim(
      params(50.1, [42, 42], 2.5334247235486047),
      makeReader() as never,
      "1_1",
      "A",
      old,
      0,
    );
    expect(reused).toBe(old);
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it("recreates when the px scale changed materially at the SAME sizeDeg (distance/eccentricity)", () => {
    // heightPx is the deg→px conversion of sizeDeg. The conversion moves
    // with viewing distance (re-sampled from RC at every trial Begin) and
    // with target eccentricity (which differs across interleaved
    // conditions) — either can shift the scale by far more than the
    // sub-0.5% within-gate position jitter, while sizeDeg and every other
    // identity field stay identical. Reusing the old raster then renders
    // the stimulus at the wrong physical size.
    const old = getTargetStim(
      params(50, [10, 10], 1),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const next = getTargetStim(
      params(55, [10, 10], 1), // +10% px scale, same sizeDeg
      makeReader() as never,
      "1_1",
      "A",
      old,
      0,
    );
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
  });

  it("recreates when the size (deg) changed — level or screen-fit clamp", () => {
    const old = getTargetStim(
      params(50, [10, 10], 1),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const next = getTargetStim(
      params(80, [10, 10], 1.6),
      makeReader() as never,
      "1_1",
      "A",
      old,
      0,
    );
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
  });

  it("recreates when a condition-level render param differs (padding)", () => {
    // Nearly all table parameters are condition-level, and conditions
    // interleave within a block — the identity must cover every field
    // that affects the raster, not just font/letters/size.
    const old = getTargetStim(
      params(50, [10, 10]),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const next = getTargetStim(
      params(50, [10, 10]),
      makeReader({ fontPadding: 0.4 }) as never,
      "1_1",
      "A",
      old,
      0,
    );
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
  });

  it("recreates when a font-global render field differs (kerning)", () => {
    const old = getTargetStim(
      params(50, [10, 10]),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    font.kerning = "none";
    const next = getTargetStim(
      params(50, [10, 10]),
      makeReader() as never,
      "1_1",
      "A",
      old,
      0,
    );
    font.kerning = undefined;
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
  });

  describe("renderScale (exact-size rescale on reuse)", () => {
    // The raster stays native; displayed size tracks the exact new
    // heightPx via a GPU scale. Applied only beyond the measured
    // crossover (below it the stale raster is already closer to a
    // native re-raster than a resample would be).
    it("rescales when the delta exceeds the crossover", () => {
      const old: any = getTargetStim(
        params(40, [10, 10]),
        makeReader() as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      old._updateIfNeeded(); // texture exists, as after any real draw
      const reused = getTargetStim(
        params(41, [10, 10]), // +2.5%: same identity bucket, past crossover
        makeReader() as never,
        "1_1",
        "A",
        old,
        0,
      );
      expect((reused as any)._renderScale).toBeCloseTo(1.025, 5);
      (reused as any)._updateIfNeeded();
      expect((reused as any)._pixi.scale.x).toBeCloseTo(1.025, 5);
    });

    it("leaves the texture as-is within the crossover", () => {
      const old = getTargetStim(
        params(40, [10, 10]),
        makeReader() as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      const reused = getTargetStim(
        params(40.2, [10, 10]), // +0.5%
        makeReader() as never,
        "1_1",
        "A",
        old,
        0,
      );
      expect((reused as any)._renderScale).toBe(1);
    });

    it("setRenderScale does not re-raster", () => {
      const stim: any = getTargetStim(
        params(40, [10, 10]),
        makeReader() as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      stim._updateIfNeeded(); // build the pixi texture
      const updateText = stim._pixi.updateText;
      updateText.mockClear();
      stim.setRenderScale(1.05);
      stim.setPos([7, 7]);
      stim._updateIfNeeded();
      expect(updateText).not.toHaveBeenCalled();
      expect(stim._pixi.scale.x).toBeCloseTo(1.05, 5);
    });
  });

  describe("stimulus reuse counter", () => {
    it("counts each reuse and resets", async () => {
      const { getStimulusReuseCount, resetStimulusReuseCount } = await import(
        "../components/letter"
      );
      resetStimulusReuseCount();
      const old = getTargetStim(
        params(50, [10, 10]),
        makeReader() as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      getTargetStim(
        params(50, [99, 99]),
        makeReader() as never,
        "1_1",
        "A",
        old,
        0,
      );
      expect(getStimulusReuseCount()).toBe(1);
      resetStimulusReuseCount();
      expect(getStimulusReuseCount()).toBe(0);
    });

    it("does not count when fontPreRender is none", async () => {
      const { getStimulusReuseCount, resetStimulusReuseCount } = await import(
        "../components/letter"
      );
      resetStimulusReuseCount();
      const old = getTargetStim(
        params(50, [10, 10]),
        makeReader() as never,
        "1_1",
        "A",
        undefined,
        0,
      );
      getTargetStim(
        params(50, [99, 99]),
        makeReader({ fontPreRender: "none" }) as never,
        "1_1",
        "A",
        old,
        0,
      );
      expect(getStimulusReuseCount()).toBe(0);
    });
  });

  it("recreates when the text changed", () => {
    const old = getTargetStim(
      params(50, [10, 10]),
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    );
    const destroySpy = stubDestroy(old);
    const next = getTargetStim(
      params(50, [10, 10]),
      makeReader() as never,
      "1_1",
      "B",
      old,
      0,
    );
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
  });
});

describe("getTargetStim fontPreRender=auto (measured per-trial choice)", () => {
  const params = (heightPx: number, pos: [number, number], sizeDeg = 1) =>
    ({ heightPx, sizeDeg, targetAndFlankersXYPx: [pos] }) as never;
  const autoReader = (lateness: unknown = "") =>
    makeReader({
      fontPreRender: "auto",
      thresholdAllowedLatenessSec: lateness,
    }) as never;
  /** Drive the auto module as stimulusGeneration's pre-render loop does. */
  const autoTrialStart = (rasterSec: number) => {
    beginAutoTrial();
    recordAutoRasterSec(rasterSec);
  };
  const create = (pos: [number, number], reader = autoReader()) =>
    getTargetStim(params(50, pos), reader, "1_1", "A", undefined, 0);
  const rearm = (old: unknown, reader = autoReader()) =>
    getTargetStim(params(50, [99, 99]), reader, "1_1", "A", old, 0);

  beforeEach(() => addDataSpy().mockClear());

  it("reuses on re-arm when the trial's raster exceeded the frame floor", () => {
    autoTrialStart(0.05); // 50ms > 16.7ms @60Hz
    const old = create([10, 10]);
    const destroySpy = stubDestroy(old);
    const next = rearm(old);
    expect(next).toBe(old);
    expect(destroySpy).not.toHaveBeenCalled();
    expect(addDataSpy()).toHaveBeenCalledWith(
      "fontPreRenderModeUsed",
      "buffer",
    );
    // The decision's evidence pair is logged alongside the mode.
    expect(addDataSpy()).toHaveBeenCalledWith(
      "fontPreRenderMeasuredRasterSec",
      0.05,
    );
    expect(addDataSpy()).toHaveBeenCalledWith(
      "fontPreRenderThresholdRasterSec",
      0.016667,
    );
  });

  it("recreates on re-arm when the raster fits the frame floor", () => {
    autoTrialStart(0.004);
    const old = create([10, 10]);
    const destroySpy = stubDestroy(old);
    const next = rearm(old);
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
    expect(addDataSpy()).toHaveBeenCalledWith("fontPreRenderModeUsed", "none");
  });

  it("decides on the trial TOTAL across stims, not per-stim", () => {
    beginAutoTrial();
    recordAutoRasterSec(0.01); // target: 10ms — under the floor alone
    recordAutoRasterSec(0.01); // flanker: 10ms — together 20ms > 16.7ms
    const old = create([10, 10]);
    const destroySpy = stubDestroy(old);
    const next = rearm(old);
    expect(next).toBe(old);
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it("a loose declared tolerance does not loosen the frame budget (still buffers)", () => {
    autoTrialStart(0.05); // over one frame, under the 100ms tolerance
    const reader = autoReader(0.1);
    const old = create([10, 10], reader);
    const destroySpy = stubDestroy(old);
    const next = rearm(old, reader);
    expect(next).toBe(old);
    expect(destroySpy).not.toHaveBeenCalled();
    expect(addDataSpy()).toHaveBeenCalledWith(
      "fontPreRenderModeUsed",
      "buffer",
    );
  });

  it("latches: a mid-trial load spike does not flip the decision", () => {
    autoTrialStart(0.004); // fast → none
    const old = create([10, 10]);
    const next1 = rearm(old); // recreates; latches none
    recordAutoRasterSec(0.5); // machine load spikes after the decision
    const destroySpy = stubDestroy(next1);
    const next2 = rearm(next1);
    expect(next2).not.toBe(next1); // still native re-raster
    expect(destroySpy).toHaveBeenCalled();
    expect(addDataSpy()).toHaveBeenCalledWith("fontPreRenderModeUsed", "none");
  });

  it("re-decides per trial: a slow trial followed by a fast trial", () => {
    autoTrialStart(0.05);
    const old = create([10, 10]);
    expect(rearm(old)).toBe(old); // slow trial → buffer
    autoTrialStart(0.004); // next trial's initial generation resets
    const old2 = create([10, 10]);
    const destroySpy = stubDestroy(old2);
    expect(rearm(old2)).not.toBe(old2); // fast trial → none
    expect(destroySpy).toHaveBeenCalled();
  });

  it("resolves none when nothing was measured (status-quo bias)", () => {
    beginAutoTrial(); // no recording
    const old = create([10, 10]);
    const destroySpy = stubDestroy(old);
    const next = rearm(old);
    expect(next).not.toBe(old);
    expect(destroySpy).toHaveBeenCalled();
    expect(addDataSpy()).toHaveBeenCalledWith("fontPreRenderModeUsed", "none");
  });
});
