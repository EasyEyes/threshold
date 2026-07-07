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
  colorRGBASnippetToRGBA: () => "0,0,0,1",
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
    },
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

function makeReader() {
  return {
    read: jest.fn((name: string) => {
      if (name === "fontPixiMetricsString") return "";
      if (name === "fontCharacterSet") return "ABC";
      if (name === "fontPadding") return 0.2;
      if (name === "fontMedialShapeTargetBool") return false;
      return "";
    }),
  };
}

beforeEach(() => {
  for (const k of Object.keys(liveFont)) delete liveFont[k];
  liveFont.name = "Arial";
  liveFont.language = "en";
});

const font = liveFont;

describe("letter.js getTargetStim forwards font.kerning (T5)", () => {
  it("the built TextStim carries _kerning from the global font", () => {
    font.kerning = "normal";
    const stim = getTargetStim(
      { heightPx: 50, targetAndFlankersXYPx: [[0, 0]] } as never,
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    ) as unknown as { _kerning?: string };
    expect(stim._kerning).toBe("normal");
  });

  it("forwards a distinct value (e.g. 'none') verbatim", () => {
    font.kerning = "none";
    const stim = getTargetStim(
      { heightPx: 50, targetAndFlankersXYPx: [[0, 0]] } as never,
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    ) as unknown as { _kerning?: string };
    expect(stim._kerning).toBe("none");
  });

  it("with no kerning set, _kerning is undefined (wrap falls back to 'auto')", () => {
    const stim = getTargetStim(
      { heightPx: 50, targetAndFlankersXYPx: [[0, 0]] } as never,
      makeReader() as never,
      "1_1",
      "A",
      undefined,
      0,
    ) as unknown as { _kerning?: string };
    expect(stim._kerning).toBeUndefined();
  });
});
