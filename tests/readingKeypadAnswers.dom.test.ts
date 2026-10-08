/**
 * @jest-environment jsdom
 *
 * KEYPAD ANSWERS READING QUESTIONS — responseClickedBool FALSE + keypad in
 * use must be a legal, answerable configuration:
 *
 *  - The reading end-of-block questions screen (answer words rendered by
 *    setupClickableCharacterSet with targetKind "reading") must sync the
 *    EasyEyes keypad's alphabet to the answer options.
 *  - Each answer word carries its responder even when clicking is disabled
 *    (onclick stays null; the responder lives on as span.respond).
 *  - A keypad press matching an answer word invokes that responder — via
 *    span.onclick when clicking is enabled, via span.respond otherwise —
 *    recording the response and firing the experimenter's extraFunction.
 *
 * Real code under test: showCharacterSet.js (setup/update) and keypad.js
 * (_onReceiverData). Only unimportable-under-jest modules are mocked; the
 * paramReader is REAL (built over real rows + glossary fixture).
 */

jest.mock("../components/global", () => ({
  ...jest.requireActual("../components/status"),
  status: jest.requireActual("../components/status").status,
  keypad: { handler: null },
  targetKind: { current: "reading" },
  rc: { language: { value: "en" } },
  _key_resp_allKeys: { current: [] },
  proxyVariable_key_resp_allKeys: [],
  thisExperimentInfo: {},
  rsvpReadingResponse: { responseType: "click" },
  displayOptions: {},
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
  showCharacterSetResponse: {
    current: [],
    onsetTime: [],
    clickTime: [],
    alreadyClickedCharacters: [],
  },
  phraseIdentificationResponse: {
    current: [],
    correct: [],
    targetWord: [],
    clickTime: [],
    categoriesResponded: [],
  },
  rsvpReadingTargetSets: { identificationTargetSets: [] },
  clickedContinue: { current: false, timestamps: [] },
  modalButtonTriggeredViaKeyboard: { current: false },
}));
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
  arraysEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  isBlockLabel: () => false,
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
jest.mock("sweetalert2", () => ({}));
jest.mock("../components/interaction/inputGate", () => ({
  interactionInputIsBlocked: () => false,
}));
jest.mock("../components/markdownInline", () => ({
  renderMarkdown: (s) => s,
}));
jest.mock("../psychojs/src/core/index.js", () => ({
  KeyPress: class FakeKeyPress {
    constructor(_a, _b, name) {
      this.name = name;
    }
  },
}));
jest.mock("../components/errorHandling", () => ({
  warning: jest.fn(),
}));
jest.mock("../components/readPhrases.js", () => ({
  readi18nPhrases: (key) => key,
}));
jest.mock("../components/connectAPeer", () => ({
  ConnectionManager: class {},
}));
jest.mock("../components/useSoundCalibration", () => ({
  getButtonsContainer: () => null,
}));

const glossaryEntry = (name, type, def) => ({
  name,
  availability: "TRUE",
  type,
  default: def,
  explanation: "",
  example: "",
  categories: [],
});
jest.mock("../threshold", () => {
  const { initGlossary } = require("../parameters/glossaryRegistry");
  initGlossary({
    version: "test",
    glossary: {
      responseClickedBool: glossaryEntry(
        "responseClickedBool",
        "boolean",
        "TRUE",
      ),
      responseTypedBool: glossaryEntry("responseTypedBool", "boolean", "TRUE"),
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
      fontDirection: glossaryEntry("fontDirection", "", ""),
      fontTrackingForLetters: glossaryEntry("fontTrackingForLetters", "", "0"),
      screenColorRGBA: glossaryEntry("screenColorRGBA", "", "1,1,1,1"),
    },
    glossaryFull: [],
    superMatchingParams: [],
  });
  const { ParamReader } = require("../parameters/paramReader");
  const reader = new ParamReader("conditions");
  reader._experiment = [
    {
      block: 1,
      block_condition: "1_reading",
      conditionName: "reading",
    },
  ];
  reader._blockCount = 1;
  return { __esModule: true, paramReader: reader };
});

import {
  keypad,
  targetKind,
  status,
  rsvpReadingResponse,
  phraseIdentificationResponse,
} from "../components/global";
import {
  setupClickableCharacterSet,
  updateClickableCharacterSet,
  removeClickableCharacterSet,
} from "../components/showCharacterSet";
import { KeypadHandler } from "../components/keypad";
import { setupPhraseIdentification } from "../components/response";
import { _key_resp_allKeys } from "../components/global";

const freshRegister = () => ({
  current: [],
  onsetTime: [0],
  clickTime: [],
  alreadyClickedCharacters: [],
});

const mountAnswers = (responseType, register, extraFunction) =>
  setupClickableCharacterSet(
    ["fire", "calm", "wind"],
    "TestFont",
    0,
    "bottom",
    register,
    extraFunction,
    "",
    "reading",
    1, // status.block — a NUMBER, like the real reading-questions call
    responseType,
  );

let keypadStub;
beforeEach(() => {
  document.body.innerHTML = "";
  _key_resp_allKeys.current = [];
  targetKind.current = "reading";
  rsvpReadingResponse.responseType = "click";
  phraseIdentificationResponse.current = [];
  phraseIdentificationResponse.categoriesResponded = [];
  status.block = 1;
  status.block_condition = "1_reading";
  keypadStub = {
    inUse: jest.fn(() => true),
    update: jest.fn(async () => {}),
    start: jest.fn(),
    stop: jest.fn(),
    acceptingResponses: false,
  };
  keypad.handler = keypadStub;
});
afterEach(() => {
  keypad.handler = null;
});

describe("keypad alphabet policy", () => {
  it("empty alphabet renders exactly the control buttons (controls-only state)", () => {
    // Reading pages pass [] — the phone must show ONLY Space/Return then.
    const handler = Object.create(KeypadHandler.prototype);
    handler.controlButtons = ["Space", "Return"];
    expect(handler._getFullAlphabet([])).toEqual(["SPACE", "RETURN"]);
  });

  it("words pass through unmangled; control-named words get uppercased (known quirk)", () => {
    const handler = Object.create(KeypadHandler.prototype);
    handler.controlButtons = ["Space", "Return"];
    expect(handler._getFullAlphabet(["fire", "calm"])).toEqual([
      "fire",
      "calm",
      "SPACE",
      "RETURN",
    ]);
  });
});

// ── keypad alphabet wiring ──────────────────────────────────────────────────
describe("reading questions sync the keypad alphabet to the answer options", () => {
  it("setup updates the keypad with the answer words and starts it", () => {
    mountAnswers(2, freshRegister(), null);
    expect(keypadStub.update).toHaveBeenCalledWith(["fire", "calm", "wind"]);
    expect(keypadStub.start).toHaveBeenCalledTimes(1);
  });

  it("update (subsequent questions) re-syncs the new options", () => {
    mountAnswers(2, freshRegister(), null);
    keypadStub.update.mockClear();
    updateClickableCharacterSet(
      ["rain", "snow"],
      freshRegister(),
      null,
      "",
      "reading",
      1,
      2,
    );
    expect(keypadStub.update).toHaveBeenCalledWith(["rain", "snow"]);
  });

  it("does not start when already accepting responses", () => {
    keypadStub.acceptingResponses = true;
    mountAnswers(2, freshRegister(), null);
    expect(keypadStub.start).not.toHaveBeenCalled();
  });

  it("no keypad wiring when the keypad is not in use", () => {
    keypadStub.inUse.mockReturnValue(false);
    mountAnswers(2, freshRegister(), null);
    expect(keypadStub.update).not.toHaveBeenCalled();
    expect(keypadStub.start).not.toHaveBeenCalled();
  });

  it("no keypad wiring for non-reading targetKinds", () => {
    targetKind.current = "letter";
    setupClickableCharacterSet(
      ["a", "b"],
      "TestFont",
      0,
      "bottom",
      freshRegister(),
      null,
      "",
      "letter",
      1,
      2,
    );
    expect(keypadStub.update).not.toHaveBeenCalled();
  });

  it("F5: removing the answer screen clears the keypad to controls (reading only)", () => {
    const register = freshRegister();
    mountAnswers(2, register, null);
    keypadStub.update.mockClear();
    removeClickableCharacterSet(register, null);
    expect(keypadStub.update).toHaveBeenCalledWith([]);
    // Clear-to-controls, NOT disabled: stop() must not run.
    expect(keypadStub.stop).not.toHaveBeenCalled();
    expect(keypadStub.acceptingResponses).toBe(false); // untouched
  });

  it("F5: no holder mounted → no clear (reading page turns call remove too)", () => {
    // threshold.js calls removeClickableCharacterSet at every reading page
    // turn and on skip paths — without an answer screen up, the keypad must
    // keep its current alphabet (only the questions teardown clears).
    targetKind.current = "reading";
    removeClickableCharacterSet(freshRegister(), null);
    expect(keypadStub.update).not.toHaveBeenCalled();
  });

  it("F5: letters' remove leaves the keypad alone (per-trial liveness)", () => {
    targetKind.current = "letter";
    const register = freshRegister();
    setupClickableCharacterSet(
      ["a", "b"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "letter",
      1,
      2,
    );
    keypadStub.update.mockClear();
    removeClickableCharacterSet(register, null);
    expect(keypadStub.update).not.toHaveBeenCalledWith([]);
  });

  it("F5: no clear when the keypad is not in use for the block", () => {
    keypadStub.inUse.mockReturnValue(false);
    const register = freshRegister();
    mountAnswers(2, register, null);
    keypadStub.update.mockClear();
    removeClickableCharacterSet(register, null);
    expect(keypadStub.update).not.toHaveBeenCalled();
  });
});

// ── responder on the span (clicks disabled) ─────────────────────────────────
describe("answer words carry their responder even when clicking is disabled", () => {
  it("responseType 3 (keypad only): onclick null, span.respond answers", () => {
    const register = freshRegister();
    const answeredWith = [];
    mountAnswers(3, register, (w) => answeredWith.push(w));

    const span = document.getElementById("clickableCharacter-calm");
    expect(span.onclick).toBeNull();
    expect(typeof span.respond).toBe("function");

    span.respond();
    expect(register.current).toEqual(["calm"]);
    expect(register.clickTime).toHaveLength(1);
    expect(answeredWith).toEqual(["calm"]);
  });

  it("responseType 2: onclick present (unchanged click behavior)", () => {
    const register = freshRegister();
    mountAnswers(2, register, null);
    const span = document.getElementById("clickableCharacter-calm");
    expect(typeof span.onclick).toBe("function");
    span.click();
    expect(register.current).toEqual(["calm"]);
  });
});

// ── keypad receiver data → answered question ────────────────────────────────
describe("keypad press answers a reading question", () => {
  const receiverFor = (over = {}) =>
    Object.assign(Object.create(KeypadHandler.prototype), {
      acceptingResponses: true,
      controlButtons: ["Space", "Return"],
      ...over,
    });

  it("message 'calm' invokes the matching responder (clicks disabled — the keypad-only condition)", () => {
    const register = freshRegister();
    const answeredWith = [];
    mountAnswers(3, register, (w) => answeredWith.push(w));

    receiverFor()._onReceiverData({ response: "calm" });
    expect(register.current).toEqual(["calm"]);
    expect(answeredWith).toEqual(["calm"]);
    expect(_key_resp_allKeys.current).toHaveLength(0); // routed, not pushed
  });

  it("works through onclick when clicking is enabled", () => {
    const register = freshRegister();
    mountAnswers(2, register, null);
    receiverFor()._onReceiverData({ response: "wind" });
    expect(register.current).toEqual(["wind"]);
  });

  it("control buttons are never treated as answers", () => {
    const register = freshRegister();
    mountAnswers(3, register, null);
    receiverFor()._onReceiverData({ response: "Return" });
    receiverFor()._onReceiverData({ response: "space" });
    expect(register.current).toEqual([]);
  });

  it("an unmatched press during reading is a no-op (not a KeyPress)", () => {
    // No answer screen up (page-turning): stray letters must not leak into
    // the letter key_resp stream.
    const handler = receiverFor();
    handler._onReceiverData({ response: "q" });
    expect(_key_resp_allKeys.current).toHaveLength(0);
  });

  it("ADVERSARIAL: an answer word that collides with a control-button name ('space') is still answerable", () => {
    // _getFullAlphabet uppercases keys matching control-button names, so the
    // phone renders 'SPACE' for the word 'space' — and the control-button
    // filter must not make the word unanswerable.
    const register = freshRegister();
    const answeredWith = [];
    setupClickableCharacterSet(
      ["fire", "calm", "space"],
      "TestFont",
      0,
      "bottom",
      register,
      (w) => answeredWith.push(w),
      "",
      "reading",
      1,
      3,
    );
    receiverFor()._onReceiverData({ response: "space" });
    expect(register.current).toEqual(["space"]);
    expect(answeredWith).toEqual(["space"]);
  });

  it("ADVERSARIAL: exact id match preferred over substring (cat vs catalog)", () => {
    const register = freshRegister();
    setupClickableCharacterSet(
      ["cat", "catalog"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "reading",
      1,
      3,
    );
    receiverFor()._onReceiverData({ response: "cat" });
    expect(register.current).toEqual(["cat"]);
    register.current = [];
    receiverFor()._onReceiverData({ response: "catalog" });
    expect(register.current).toEqual(["catalog"]);
  });

  it("control-button presses with no colliding answer keep the page-turn KeyPress path", () => {
    const register = freshRegister();
    setupClickableCharacterSet(
      ["fire", "calm"],
      "TestFont",
      0,
      "bottom",
      register,
      null,
      "",
      "reading",
      1,
      3,
    );
    _key_resp_allKeys.current = [];
    receiverFor()._onReceiverData({ response: "Return" });
    expect(register.current).toEqual([]);
    expect(_key_resp_allKeys.current).toHaveLength(1); // page-turn path intact
  });

  it("letters (non-reading) keep the KeyPress path — no span routing", () => {
    targetKind.current = "letter";
    const handler = receiverFor();
    handler._onReceiverData({ response: "a" });
    expect(_key_resp_allKeys.current).toHaveLength(1);
    expect(_key_resp_allKeys.current[0].name).toBe("a");
  });

  it("ignores input while interaction is blocked", () => {
    // The blocked-input guard runs before any routing (asserted on source:
    // the mocked inputGate always reports unblocked here).
    expect(handlerSource()).toMatch(
      /if \(interactionInputIsBlocked\(\)\) return;/,
    );
  });
});

function handlerSource() {
  // Reading the real source guards against the guard being dropped.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  return fs.readFileSync(
    path.join(__dirname, "..", "components", "keypad.js"),
    "utf8",
  );
}

// ── rsvp phrase identification (same collision class, fixed uniformly) ──────
describe("keypad press answers an rsvp phrase-identification item", () => {
  const receiverFor = (over = {}) =>
    Object.assign(Object.create(KeypadHandler.prototype), {
      acceptingResponses: true,
      controlButtons: ["Space", "Return"],
      ...over,
    });

  const mountPhrases = (words) => {
    targetKind.current = "rsvpReading";
    rsvpReadingResponse.responseType = "silent";
    const screen = setupPhraseIdentification(
      [{ target: words[0], elements: words }],
      // reader passed through: real paramReader via the module binding
      require("../threshold").paramReader,
      "1_reading",
      24,
    );
    document.body.appendChild(screen);
  };

  it("ADVERSARIAL (F2): a phrase option named 'space' is still answerable via keypad", () => {
    mountPhrases(["space", "fire"]);
    receiverFor()._onReceiverData({ response: "space" });
    expect(phraseIdentificationResponse.current).toEqual(["space"]);
  });

  it("exact id preferred over substring (rsvp)", () => {
    mountPhrases(["cat", "catalog"]);
    receiverFor()._onReceiverData({ response: "cat" });
    expect(phraseIdentificationResponse.current).toEqual(["cat"]);
  });

  it("non-control unmatched press still warns (rsvp behavior preserved)", () => {
    mountPhrases(["fire", "calm"]);
    const { warning } = require("../components/errorHandling");
    warning.mockClear();
    receiverFor()._onReceiverData({ response: "zzz" });
    expect(warning).toHaveBeenCalled();
  });

  it("control press with no colliding option keeps the KeyPress path (rsvp)", () => {
    mountPhrases(["fire", "calm"]);
    receiverFor()._onReceiverData({ response: "Return" });
    expect(phraseIdentificationResponse.current).toEqual([]);
    expect(_key_resp_allKeys.current).toHaveLength(1);
  });
});
