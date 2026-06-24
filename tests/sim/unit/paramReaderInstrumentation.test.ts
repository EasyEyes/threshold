/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

import {
  formatParamRead,
  installParamReaderReporter,
} from "../../../components/paramReaderInstrumentation";

describe("formatParamRead", () => {
  test("formats a simple string return", () => {
    expect(formatParamRead("conditionEnabledBool", "19_1", true)).toBe(
      '[sim:read] conditionEnabledBool["19_1"] = true',
    );
  });

  test("formats a scalar string BC", () => {
    expect(formatParamRead("targetKind", "1_1", "letter")).toBe(
      '[sim:read] targetKind["1_1"] = "letter"',
    );
  });

  test("formats an array return as JSON", () => {
    expect(formatParamRead("conditionTrials", 1, [5, 10, 5])).toBe(
      "[sim:read] conditionTrials[1] = [5,10,5]",
    );
  });

  test("formats an empty array return (the Bug 2 truthy-[] case)", () => {
    expect(formatParamRead("conditionEnabledBool", "19_1", [])).toBe(
      '[sim:read] conditionEnabledBool["19_1"] = []',
    );
  });

  test("formats undefined return", () => {
    expect(formatParamRead("missingParam", "1_1", undefined)).toBe(
      '[sim:read] missingParam["1_1"] = undefined',
    );
  });

  test("serializes objects via JSON", () => {
    expect(formatParamRead("someParam", "1_1", { a: 1 })).toBe(
      '[sim:read] someParam["1_1"] = {"a":1}',
    );
  });

  test("includes source when provided (csv)", () => {
    expect(formatParamRead("targetKind", "1_1", "letter", "csv")).toBe(
      '[sim:read] targetKind["1_1"] = "letter" (csv)',
    );
  });

  test("includes source when provided (glossary)", () => {
    expect(
      formatParamRead("thresholdParameter", "1_1", "contrast", "glossary"),
    ).toBe('[sim:read] thresholdParameter["1_1"] = "contrast" (glossary)');
  });

  test("omits source when undefined (backwards compat)", () => {
    expect(formatParamRead("targetKind", "1_1", "letter", undefined)).toBe(
      '[sim:read] targetKind["1_1"] = "letter"',
    );
  });
});

describe("installParamReaderReporter", () => {
  test("wraps read() to emit console.debug with the return value", () => {
    const calls: string[] = [];
    const spy = jest.spyOn(console, "debug").mockImplementation((s) => {
      calls.push(s as string);
    });

    class FakeParamReader {
      conditions = [{ targetKind: "letter" }];
      has(name: string) {
        return name in this.conditions[0];
      }
      read(name: string, bc: string | number) {
        if (name === "targetKind") return "letter";
        return undefined;
      }
    }

    installParamReaderReporter(FakeParamReader);
    const r = new FakeParamReader();
    const result = r.read("targetKind", "1_1");

    expect(result).toBe("letter");
    expect(calls).toContain('[sim:read] targetKind["1_1"] = "letter" (csv)');
    spy.mockRestore();
  });

  test("logs and re-throws when read() throws (so the observer sees the cause)", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});

    class FakeParamReader {
      conditions = [{}];
      has() {
        return false;
      }
      read() {
        throw new Error("boom");
      }
    }

    installParamReaderReporter(FakeParamReader);
    const r = new FakeParamReader();
    expect(() => r.read("targetKind", "1_1")).toThrow("boom");
    // Must log the failing read so the JSONL observer can correlate
    // "which read caused the crash" — that's the file's stated purpose.
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[sim:read\] targetKind\["1_1"\] = ERROR: boom/),
    );
    spy.mockRestore();
  });

  test("idempotent: installing twice does not double-wrap", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});

    let callCount = 0;
    class FakeParamReader {
      conditions = [{ p: "v" }];
      has(name: string) {
        return name in this.conditions[0];
      }
      read() {
        callCount++;
        return "v";
      }
    }

    installParamReaderReporter(FakeParamReader);
    installParamReaderReporter(FakeParamReader);
    const r = new FakeParamReader();
    r.read("p", "1_1");

    expect(callCount).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test("includes source=csv when has() returns true", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});

    class FakeParamReader {
      conditions = [{ targetKind: "letter" }];
      has(name: string) {
        return name in this.conditions[0];
      }
      read() {
        return "letter";
      }
    }

    installParamReaderReporter(FakeParamReader);
    const r = new FakeParamReader();
    r.read("targetKind", "1_1");

    expect(spy).toHaveBeenCalledWith(
      '[sim:read] targetKind["1_1"] = "letter" (csv)',
    );
    spy.mockRestore();
  });

  test("includes source=glossary when has() returns false", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});

    class FakeParamReader {
      conditions = [{}];
      has() {
        return false;
      }
      read() {
        return "contrast";
      }
    }

    installParamReaderReporter(FakeParamReader);
    const r = new FakeParamReader();
    r.read("thresholdParameter", "1_1");

    expect(spy).toHaveBeenCalledWith(
      '[sim:read] thresholdParameter["1_1"] = "contrast" (glossary)',
    );
    spy.mockRestore();
  });

  test("source=unknown when has() is not defined on the prototype", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});

    class FakeParamReader {
      read() {
        return "v";
      }
      // Note: no has() method
    }

    installParamReaderReporter(FakeParamReader);
    const r = new FakeParamReader();
    r.read("p", "1_1");

    expect(spy).toHaveBeenCalledWith('[sim:read] p["1_1"] = "v" (unknown)');
    spy.mockRestore();
  });
});
