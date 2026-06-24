/**
 * Tests for canType / canClick / keypadActive in components/response.js.
 *
 * Verifies the simulateParticipantBool spec: when the current condition has
 * simulateParticipantBool=TRUE, canType returns true regardless of the
 * underlying responseType — implementing the glossary text exactly:
 *
 *   "Setting simulateParticipantBool to TRUE enables typed responses
 *    (participantCanTypeBool) for that condition, regardless of
 *    responseTypedBool."
 *
 * @jest-environment node
 */

// Mock dependencies before importing the module under test.
const mockRead = jest.fn();
jest.mock("../../../components/global", () => ({
  status: { block_condition: "blockCondition1" },
  phraseIdentificationResponse: {},
  font: { name: "" },
  keypad: { handler: null },
  rsvpReadingTargetSets: {},
}));
jest.mock("../../../threshold", () => ({
  paramReader: { read: (...args: unknown[]) => mockRead(...args) },
}));
jest.mock("../../../components/fonts", () => ({
  getFontFamilyName: () => "",
}));
jest.mock("../../../components/globalPsychoJS", () => ({ psychoJS: {} }));
jest.mock("../../../components/showCharacterSet", () => ({
  scaleFontSizeToFit: () => 12,
  getMinFontSize: () => 8,
}));
jest.mock("../../../components/utils", () => ({
  colorRGBASnippetToRGBA: () => "",
  logger: () => {},
  showCursor: () => {},
  toFixedNumber: (n: number) => n,
  shuffle: <T>(a: T[]) => a,
}));

import {
  canType,
  canClick,
  keypadActive,
  _resetCanTypeCache,
} from "../../../components/response";

beforeEach(() => {
  mockRead.mockReset();
  _resetCanTypeCache();
});

describe("canType — basic responseType matrix", () => {
  it("returns true for responseTypes that include type", () => {
    // Types 0 (type only), 2 (click+type), 4 (keypad+type), 6 (all)
    expect(canType(0)).toBe(true);
    expect(canType(2)).toBe(true);
    expect(canType(4)).toBe(true);
    expect(canType(6)).toBe(true);
  });

  it("returns false for responseTypes without type (when not simulated)", () => {
    mockRead.mockReturnValue([false]); // simulateParticipantBool = false
    // Types 1 (click only), 3 (keypad only), 5 (click+keypad)
    expect(canType(1)).toBe(false);
    expect(canType(3)).toBe(false);
    expect(canType(5)).toBe(false);
  });
});

describe("canType — simulateParticipantBool override", () => {
  it("returns true for click-only responseType when simulateParticipantBool=TRUE", () => {
    // paramReader.read returns SCALAR when blockCondition is a condition string
    mockRead.mockReturnValue(true);
    expect(canType(1)).toBe(true);
  });

  it("returns true for keypad-only responseType when simulateParticipantBool=TRUE", () => {
    mockRead.mockReturnValue(true);
    expect(canType(3)).toBe(true);
  });

  it("queries paramReader for the current block_condition by default", () => {
    mockRead.mockReturnValue(false);
    canType(1);
    expect(mockRead).toHaveBeenCalledWith(
      "simulateParticipantBool",
      "blockCondition1",
    );
  });

  it("accepts explicit blockCondition argument", () => {
    mockRead.mockReturnValue(true);
    canType(1, "explicitCondition");
    expect(mockRead).toHaveBeenCalledWith(
      "simulateParticipantBool",
      "explicitCondition",
    );
  });

  it("returns false when simulateParticipantBool is FALSE", () => {
    mockRead.mockReturnValue(false);
    expect(canType(1)).toBe(false);
  });

  it("returns false when paramReader returns undefined (param not set)", () => {
    mockRead.mockReturnValue(undefined);
    expect(canType(1)).toBe(false);
  });

  it("handles paramReader.read returning an ARRAY (block number path)", () => {
    // When called with a NUMBER (block) or "__ALL_BLOCKS__", paramReader
    // returns an array of values, one per condition. Use .some(Boolean).
    mockRead.mockReturnValue([true, false, undefined]);
    expect(canType(1, "arrayTest-true")).toBe(true);
    mockRead.mockReturnValue([false, false]);
    expect(canType(1, "arrayTest-false")).toBe(false);
  });

  it("caches result across calls (perf)", () => {
    mockRead.mockReturnValue(true);
    canType(1, "cacheTest");
    canType(1, "cacheTest");
    canType(1, "cacheTest");
    // paramReader.read called only once for same blockCondition
    const simCalls = mockRead.mock.calls.filter(([, bc]) => bc === "cacheTest");
    expect(simCalls.length).toBe(1);
  });
});

describe("canType — does not query paramReader when responseType already types", () => {
  it("short-circuits when responseType already allows type", () => {
    canType(0);
    canType(2);
    canType(4);
    canType(6);
    expect(mockRead).not.toHaveBeenCalled();
  });
});

describe("canClick and keypadActive — unchanged behavior", () => {
  it("canClick returns the click bit of responseType", () => {
    expect(canClick(1)).toBe(true);
    expect(canClick(2)).toBe(true);
    expect(canClick(0)).toBe(false);
  });

  it("keypadActive returns the keypad bit of responseType", () => {
    expect(keypadActive(3)).toBe(true);
    expect(keypadActive(4)).toBe(true);
    expect(keypadActive(0)).toBe(false);
  });
});
