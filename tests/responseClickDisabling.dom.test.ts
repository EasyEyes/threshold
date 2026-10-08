/**
 * @jest-environment jsdom
 *
 * IGNORE DISALLOWED CLICKS (card) — responseClickedBool FALSE must make the
 * experiment ignore clicks at every response occasion:
 *
 *  - Trial initiation: clicks on the fixation crosshair start a trial only
 *    when responseClickedBool is TRUE (and responseMustTrackContinuouslyBool
 *    is FALSE — tracking, not clicking, initiates when tracking is on).
 *  - Letter identification: the clickable character set registers click
 *    responses only when the response type allows clicking.
 *
 * Fidelity: threshold.js is module-mocked ONLY to hand its real singleton
 * paramReader to the components — the reader itself, ParamReader parsing,
 * the glossary registry, instructions.js (_takeFixationClick /
 * addHandlerForClickingFixation / movePastFixation), showCharacterSet.js
 * (setupClickableCharacterSet), and response.js (getResponseType / canClick /
 * canType) all run REAL. DOM events are dispatched for real on jsdom's
 * document.
 *
 * Also pins the simulated-participant contract for these gates: the click
 * affordance published for the sim must equal canClick(responseType), so the
 * sim never "clicks" letters a real participant could not click.
 */

// ── module mocks (only what cannot load under jest/jsdom) ──────────────────
// global.js re-exports phrases-loader which top-level-awaits a fetch — the
// real module cannot load under jest. Shape mirrors components/global.js.
jest.mock("../components/global", () => ({
  ...jest.requireActual("../components/status"),
  clickedContinue: { current: false, timestamps: [] },
  modalButtonTriggeredViaKeyboard: { current: false },
  status: jest.requireActual("../components/status").status,
  displayOptions: {},
  targetKind: { current: "letter" },
  correctAns: { current: [] },
  font: {
    name: "TestFont",
    direction: "ltr",
    language: "en",
    padding: undefined,
    medialShapeResponse: undefined,
    fontPositionalShapeResponse: undefined,
  },
  fontCharacterSet: { current: undefined, where: undefined },
  letterConfig: { responseMaxOptions: 0 },
  readingConfig: { height: undefined },
  instructionFont: { current: undefined },
  showCharacterSetResponse: {
    current: [],
    onsetTime: [],
    clickTime: [],
    alreadyClickedCharacters: [],
  },
}));

// utils.js imports global.js (unimportable above) and the PsychoJS mouse;
// only the geometry oracle cursorNearFixation is a spy — everything the
// tests exercise runs in real code above/below it.
jest.mock("../components/utils", () => ({
  cursorNearFixation: jest.fn(() => true),
  colorRGBASnippetToRGBA: (s) => s,
  hideCursor: jest.fn(),
  showCursor: jest.fn(),
  logger: jest.fn(),
  toFixedNumber: (n) => n,
  shuffle: (a) => a,
  safeExecuteFunc: (f, ...args) =>
    typeof f === "function" ? f(...args) : undefined,
  xyPxOfDeg: () => [0, 0],
}));

jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: { _window: { _size: [800, 600] } },
}));

jest.mock("../components/fonts", () => ({
  getFontFamilyName: (f) => f,
}));

jest.mock("../components/photometry", () => ({
  colorCALReadyForBlock: async () => true,
}));

jest.mock("../components/fixation.ts", () => ({
  computeFixationPosNow: () => ({ x: 0, y: 0 }),
}));

jest.mock("papaparse", () => ({
  __esModule: true,
  default: { parse: () => {} },
}));

// threshold.js boots PsychoJS — hand its paramReader singleton over as a
// REAL ParamReader over REAL rows (load-time boolean parsing included).
const glossaryEntry = (name, type, def) => ({
  name,
  availability: "TRUE",
  type,
  default: def,
  explanation: "",
  example: "",
  categories: [],
});
const GLOSSARY = {
  version: "test",
  glossary: {
    responseClickedBool: glossaryEntry(
      "responseClickedBool",
      "boolean",
      "TRUE",
    ),
    responseTypedBool: glossaryEntry("responseTypedBool", "boolean", "TRUE"),
    responseSpokenBool: glossaryEntry("responseSpokenBool", "boolean", "FALSE"),
    responseSpokenToExperimenterBool: glossaryEntry(
      "responseSpokenToExperimenterBool",
      "boolean",
      "FALSE",
    ),
    responseMustTrackContinuouslyBool: glossaryEntry(
      "responseMustTrackContinuouslyBool",
      "boolean",
      "FALSE",
    ),
    simulateParticipantBool: glossaryEntry(
      "simulateParticipantBool",
      "boolean",
      "FALSE",
    ),
    instructionFontColorRGBA: glossaryEntry(
      "instructionFontColorRGBA",
      "",
      "0,0,0,1",
    ),
  },
  glossaryFull: [],
  superMatchingParams: [],
};

// Rows as compiled block CSVs store them (raw strings); boolean → boolean
// conversion happens at load time via ParamReader.parse, mirrored here.
// Like real compiled block CSVs, every row carries the SAME column set
// (ParamReader.has() keys off conditions[0], so per-row column presence is
// not a real state).
const RAW_ROWS = [
  {
    block: 1,
    block_condition: "1_clickAndType",
    conditionName: "clickAndType",
    responseClickedBool: "TRUE",
    responseTypedBool: "TRUE",
    responseMustTrackContinuouslyBool: "FALSE",
    simulateParticipantBool: "FALSE",
  },
  {
    block: 1,
    block_condition: "1_typeOnly",
    conditionName: "typeOnly",
    responseClickedBool: "FALSE",
    responseTypedBool: "TRUE",
    responseMustTrackContinuouslyBool: "FALSE",
    simulateParticipantBool: "FALSE",
  },
  {
    block: 1,
    block_condition: "1_clickOnly",
    conditionName: "clickOnly",
    responseClickedBool: "TRUE",
    responseTypedBool: "FALSE",
    responseMustTrackContinuouslyBool: "FALSE",
    simulateParticipantBool: "FALSE",
  },
  {
    block: 1,
    block_condition: "1_typeOnlyMustTrack",
    conditionName: "typeOnlyMustTrack",
    responseClickedBool: "FALSE",
    responseTypedBool: "TRUE",
    responseMustTrackContinuouslyBool: "TRUE",
    simulateParticipantBool: "FALSE",
  },
  {
    block: 1,
    block_condition: "1_clickAndTypeMustTrack",
    conditionName: "clickAndTypeMustTrack",
    responseClickedBool: "TRUE",
    responseTypedBool: "TRUE",
    responseMustTrackContinuouslyBool: "TRUE",
    simulateParticipantBool: "FALSE",
  },
  {
    block: 1,
    block_condition: "1_simulatedTypeOnly",
    conditionName: "simulatedTypeOnly",
    responseClickedBool: "FALSE",
    responseTypedBool: "FALSE",
    responseMustTrackContinuouslyBool: "FALSE",
    simulateParticipantBool: "TRUE",
  },
];

jest.mock("../threshold", () => {
  const { initGlossary } = require("../parameters/glossaryRegistry");
  initGlossary(GLOSSARY);
  const { ParamReader } = require("../parameters/paramReader");
  const reader = new ParamReader("conditions");
  reader._experiment = RAW_ROWS.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        typeof v === "string" ? reader.parse(v) : v,
      ]),
    ),
  );
  reader._blockCount = 1;
  return { __esModule: true, paramReader: reader };
});

// ── imports (real modules under test) ───────────────────────────────────────
import { cursorNearFixation } from "../components/utils";
import {
  getResponseType,
  resetResponseType,
  canClick,
  canType,
  keypadActive,
  _onlyClick,
} from "../components/response";
import {
  addHandlerForClickingFixation,
  removeHandlerForClickingFixation,
} from "../components/instructions";
import {
  setupClickableCharacterSet,
  removeClickableCharacterSet,
} from "../components/showCharacterSet";
import { paramReader } from "../threshold";
import {
  clickedContinue,
  status,
  showCharacterSetResponse,
} from "../components/global";
import { Screens } from "../components/multiple-displays/globals";

// ── helpers ─────────────────────────────────────────────────────────────────
const freshResponseRegister = () => ({
  current: [],
  onsetTime: [0],
  clickTime: [],
  alreadyClickedCharacters: [],
});

let canvas;
const clickAt = (x, y, target = canvas) => {
  const e = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(e);
};
const touchEndAt = (x, y) => {
  const e = new Event("touchend", { bubbles: true, cancelable: true });
  Object.defineProperty(e, "changedTouches", {
    value: [{ clientX: x, clientY: y }],
  });
  canvas.dispatchEvent(e);
};
// Click at screen center → psychoJS pix (0, 0) → fixation position.
const clickFixation = (target) => clickAt(400, 300, target);

beforeEach(() => {
  clickedContinue.current = false;
  clickedContinue.timestamps = [];
  cursorNearFixation.mockReset();
  cursorNearFixation.mockReturnValue(true);
  status.block_condition = "1_clickAndType";
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  Screens[0].fixationConfig.pos = [0, 0];
  Screens[0].fixationConfig.markingFixationHotSpotRadiusPx = 40;
});

afterEach(() => {
  removeHandlerForClickingFixation();
  removeClickableCharacterSet(freshResponseRegister(), null);
  canvas.remove();
  document.getElementById("ee-state")?.remove();
});

// ── getResponseType matrix (pure, real code) ────────────────────────────────
describe("getResponseType — response-modality matrix", () => {
  it("maps click/type/keypad combinations to response types", () => {
    expect(getResponseType(false, true, false, false)).toBe(0); // type only
    expect(getResponseType(true, false, false, false)).toBe(1); // click only
    expect(getResponseType(true, true, false, false)).toBe(2); // click or type
    expect(getResponseType(false, false, true, false)).toBe(3); // keypad only
    expect(getResponseType(false, true, true, false)).toBe(4); // keypad or type
    expect(getResponseType(true, false, true, false)).toBe(5); // keypad or click
    expect(getResponseType(true, true, true, false)).toBe(6); // keypad or click or type
  });

  it("the card's configuration (clicking disabled, typing enabled) is TYPE ONLY (0)", () => {
    expect(getResponseType(false, true, false, false, false, false)).toBe(0);
  });

  it("responseMustTrackContinuouslyBool overrides to click-only for prestimulus (initiation)", () => {
    expect(getResponseType(false, true, false, false, true, false, true)).toBe(
      1,
    );
    expect(getResponseType(true, false, false, false, true, false, true)).toBe(
      1,
    );
  });

  it("responseSpokenToExperimenter: click prestimulus, type at response", () => {
    // Experimenter clicks to start, types the spoken report.
    expect(getResponseType(false, false, false, false, false, true, true)).toBe(
      1,
    );
    expect(
      getResponseType(false, false, false, false, false, true, false),
    ).toBe(0);
  });

  it("all modalities disabled falls back to click-only (pinned current behavior)", () => {
    expect(getResponseType(false, false, false, false)).toBe(1);
  });

  it("resetResponseType keeps the fixation-time type only when modalities differ", () => {
    // mustTrack: fixation-time type (1) survives into the response phase
    expect(resetResponseType(0, 1, true)).toBe(0);
    expect(resetResponseType(0, 1, false)).toBe(1); // same modalities: response type
  });
});

describe("canClick / canType / keypadActive / _onlyClick", () => {
  it("click bit follows the response type", () => {
    expect(canClick(0)).toBe(false);
    expect(canClick(1)).toBe(true);
    expect(canClick(2)).toBe(true);
    expect(canClick(3)).toBe(false);
  });

  it("unknown response types fail CLOSED (no crash): ignore clicks", () => {
    // canClick feeds participant-facing gates (letter onclick, Proceed
    // buttons) — an omitted/invalid responseType must disable clicking, not
    // crash the page.
    expect(() => canClick(undefined)).not.toThrow();
    expect(canClick(undefined)).toBe(false);
    expect(canClick(99)).toBe(false);
    expect(() => canType(undefined)).not.toThrow();
    expect(canType(99, "1_typeOnly")).toBe(false);
    expect(() => keypadActive(undefined)).not.toThrow();
    expect(keypadActive(99)).toBe(false);
    expect(() => _onlyClick(undefined)).not.toThrow();
    expect(_onlyClick(99)).toBe(false);
  });

  it("type bit follows the response type (real ParamReader: value column + glossary default)", () => {
    // simulateParticipantBool present as a column, FALSE in this condition
    expect(canType(0, "1_typeOnly")).toBe(true);
    expect(canType(1, "1_typeOnly")).toBe(false);
  });

  it("params absent from the table read the glossary default through the real ParamReader", () => {
    // responseSpokenBool is in no row → glossary default FALSE for any condition
    expect(paramReader.read("responseSpokenBool", "1_typeOnly")).toBe(false);
  });

  it("simulateParticipantBool TRUE enables typing through the real ParamReader", () => {
    expect(canType(1, "1_simulatedTypeOnly")).toBe(true);
  });

  it("keypadActive and _onlyClick", () => {
    expect(keypadActive(3)).toBe(true);
    expect(keypadActive(0)).toBe(false);
    expect(_onlyClick(1)).toBe(true);
    expect(_onlyClick(2)).toBe(false);
  });
});

// ── trial initiation: clicking the fixation crosshair ───────────────────────
describe("addHandlerForClickingFixation — ignore clicks when clicking is disabled", () => {
  it.each([
    ["clickAndType", true],
    ["typeOnly", false], // THE CARD: responseClickedBool FALSE → no click start
    ["typeOnlyMustTrack", false], // tracking initiates, not clicking
    ["clickAndTypeMustTrack", false], // mustTrack overrides clicking
  ])("%s: click handler attached = %s", (condition, shouldAttach) => {
    status.block_condition = `1_${condition}`;
    addHandlerForClickingFixation(paramReader);
    clickFixation();
    expect(clickedContinue.current).toBe(shouldAttach);
  });

  it("an attached handler initiates the trial on a click NEAR the fixation only", () => {
    addHandlerForClickingFixation(paramReader);
    cursorNearFixation.mockReturnValue(false); // click far from fixation
    clickFixation();
    expect(clickedContinue.current).toBe(false);
    cursorNearFixation.mockReturnValue(true);
    clickFixation();
    expect(clickedContinue.current).toBe(true);
    expect(clickedContinue.timestamps).toHaveLength(1);
  });

  it("ignores clicks on non-canvas elements (instructions, popups, buttons)", () => {
    addHandlerForClickingFixation(paramReader);
    const div = document.createElement("div");
    document.body.appendChild(div);
    clickAt(400, 300, div);
    expect(clickedContinue.current).toBe(false);
    div.remove();
  });

  it("touch taps initiate like clicks, and only when clicking is enabled", () => {
    status.block_condition = "1_clickAndType";
    addHandlerForClickingFixation(paramReader);
    touchEndAt(400, 300);
    expect(clickedContinue.current).toBe(true);

    removeHandlerForClickingFixation();
    clickedContinue.current = false;

    status.block_condition = "1_typeOnly";
    addHandlerForClickingFixation(paramReader);
    touchEndAt(400, 300);
    expect(clickedContinue.current).toBe(false);
  });

  it("removeHandlerForClickingFixation detaches the listener", () => {
    addHandlerForClickingFixation(paramReader);
    removeHandlerForClickingFixation();
    clickFixation();
    expect(clickedContinue.current).toBe(false);
  });
});

// ── letter identification: the clickable character set ──────────────────────
describe("setupClickableCharacterSet — ignore letter clicks when clicking is disabled", () => {
  it("registers click responses when the response type allows clicking", () => {
    const register = freshResponseRegister();
    setupClickableCharacterSet(
      ["a", "b", "c", "d"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "letter",
      "1_clickAndType",
      2, // click or type
    );
    const spans = document.querySelectorAll(
      "#characterSet-holder .characterSet",
    );
    expect(spans).toHaveLength(4);
    spans[1].click();
    expect(register.current).toEqual(["b"]);
    expect(register.clickTime).toHaveLength(1);
  });

  it("THE CARD: responseClickedBool FALSE (type-only) renders NO click handlers — clicks are ignored", () => {
    const register = freshResponseRegister();
    setupClickableCharacterSet(
      ["a", "b", "c", "d"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "letter",
      "1_typeOnly",
      0, // type only
    );
    const spans = document.querySelectorAll(
      "#characterSet-holder .characterSet",
    );
    // Reference charset still shown, but nothing is clickable.
    expect(spans).toHaveLength(4);
    spans.forEach((s) => expect(s.onclick).toBeNull());
    spans.forEach((s) => s.click());
    expect(register.current).toEqual([]);
    expect(register.clickTime).toEqual([]);
  });

  it("click-only conditions keep clickable letters", () => {
    const register = freshResponseRegister();
    setupClickableCharacterSet(
      ["x", "y"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "letter",
      "1_clickOnly",
      1,
    );
    document.querySelectorAll("#characterSet-holder .characterSet")[0].click();
    expect(register.current).toEqual(["x"]);
  });

  it("removeClickableCharacterSet clears pending click responses and the DOM", () => {
    const register = freshResponseRegister();
    setupClickableCharacterSet(
      ["a"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "letter",
      "1_clickAndType",
      2,
    );
    register.current = ["a"];
    removeClickableCharacterSet(register, null);
    expect(register.current).toEqual([]);
    expect(
      document.querySelectorAll("#characterSet-holder .characterSet"),
    ).toHaveLength(0);
  });
});

// ── simulated participant must be told the truth about clickability ─────────
describe("sim click affordance matches canClick(responseType)", () => {
  const readAffordance = () =>
    document.getElementById("ee-state")?.getAttribute("data-response-clicked");

  it.each([
    [2, "true"], // click+type: clickable
    [1, "true"], // click only: clickable
    [0, "false"], // THE CARD: type-only — sim must type, not click
    [3, "false"], // keypad only
  ])(
    "responseType %s publishes responseClicked=%s",
    async (responseType, expected) => {
      await jest.isolateModulesAsync(async () => {
        const { activateSimulation } = await import(
          "../components/simulatedState"
        );
        activateSimulation();
        const { setupClickableCharacterSet: setup } = await import(
          "../components/showCharacterSet"
        );
        setup(
          ["a", "b"],
          "TestFont",
          0,
          "bottom",
          freshResponseRegister(),
          null,
          "",
          "letter",
          "1_clickAndType",
          responseType,
        );
        expect(readAffordance()).toBe(expected);
      });
    },
  );

  it("unknown responseType: setupClickableCharacterSet neither crashes nor offers clicks", async () => {
    await jest.isolateModulesAsync(async () => {
      const { activateSimulation } = await import(
        "../components/simulatedState"
      );
      activateSimulation();
      const sscs = await import("../components/showCharacterSet");
      expect(() =>
        sscs.setupClickableCharacterSet(
          ["a"],
          "TestFont",
          0,
          "bottom",
          freshResponseRegister(),
          null,
          "",
          "letter",
          "1_clickAndType",
          undefined,
        ),
      ).not.toThrow();
      expect(readAffordance()).toBe("false");
    });
  });

  it("removeClickableCharacterSet closes the affordance", async () => {
    await jest.isolateModulesAsync(async () => {
      const { activateSimulation } = await import(
        "../components/simulatedState"
      );
      activateSimulation();
      const sscs = await import("../components/showCharacterSet");
      sscs.setupClickableCharacterSet(
        ["a"],
        "TestFont",
        0,
        "bottom",
        freshResponseRegister(),
        null,
        "",
        "letter",
        "1_clickAndType",
        2,
      );
      expect(readAffordance()).toBe("true");
      sscs.removeClickableCharacterSet(freshResponseRegister(), null);
      expect(readAffordance()).toBe("false");
    });
  });
});
