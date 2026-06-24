import { jest } from "@jest/globals";
import {
  selectTypedResponse,
  selectClickedIndex,
  mulberry32,
  type EEStateData,
} from "../../../components/simulationModel";

const baseState: EEStateData = {
  validCharsTyped: "ABCDEF",
  correctResponse: "C",
  simulationModel: "right",
  trialLevel: "0",
  simulationThreshold: "2",
  simulationBeta: "2.3",
  simulationDelta: "0.01",
  thresholdProportionCorrect: "0.816",
};

describe("mulberry32", () => {
  it("produces deterministic values for same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it("returns values in [0, 1)", () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("selectTypedResponse — 'right' model", () => {
  it("returns correctResponse", () => {
    const rng = mulberry32(1);
    expect(selectTypedResponse(baseState, rng)).toBe("C");
  });

  it("falls back to first valid char when correctResponse is null", () => {
    const rng = mulberry32(1);
    const s = { ...baseState, correctResponse: null };
    expect(selectTypedResponse(s, rng)).toBe("A");
  });
});

describe("selectTypedResponse — 'wrong' model", () => {
  it("never returns correctResponse when alternatives exist", () => {
    const rng = mulberry32(7);
    const s = { ...baseState, simulationModel: "wrong" };
    for (let i = 0; i < 20; i++) {
      const r = selectTypedResponse(s, rng);
      expect(r).not.toBe("C");
      expect("ABCDEF".includes(r)).toBe(true);
    }
  });

  it("returns correctResponse when no alternatives exist (1 char set)", () => {
    const rng = mulberry32(7);
    const s: EEStateData = {
      ...baseState,
      validCharsTyped: "X",
      correctResponse: "X",
      simulationModel: "wrong",
    };
    expect(selectTypedResponse(s, rng)).toBe("X");
  });
});

describe("selectTypedResponse — 'blind' model", () => {
  it("only returns chars from the valid set", () => {
    const rng = mulberry32(99);
    const s = { ...baseState, simulationModel: "blind" };
    for (let i = 0; i < 30; i++) {
      const r = selectTypedResponse(s, rng);
      expect("ABCDEF".includes(r)).toBe(true);
    }
  });
});

describe("selectTypedResponse — 'weibull' model", () => {
  it("returns correct when level greatly exceeds threshold (P near 1)", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      trialLevel: "100", // very high level relative to threshold=2
    };
    const results = Array.from({ length: 50 }, () =>
      selectTypedResponse(s, rng),
    );
    const pctCorrect = results.filter((r) => r === "C").length / results.length;
    expect(pctCorrect).toBeGreaterThan(0.9);
  });

  it("returns mostly wrong when level far below threshold", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      trialLevel: "-100", // very low level relative to threshold=2
    };
    const results = Array.from({ length: 50 }, () =>
      selectTypedResponse(s, rng),
    );
    const pctCorrect = results.filter((r) => r === "C").length / results.length;
    // At chance-ish (1/n + small weibull boost), should be near 1/n
    expect(pctCorrect).toBeLessThan(0.5);
  });
});

describe("selectTypedResponse — default + unknown model", () => {
  it("falls back to correctResponse for unknown model", () => {
    const rng = mulberry32(1);
    const s = { ...baseState, simulationModel: "unknown" };
    expect(selectTypedResponse(s, rng)).toBe("C");
  });

  it("falls back to correctResponse when simulationModel is null", () => {
    const rng = mulberry32(1);
    const s = { ...baseState, simulationModel: null };
    expect(selectTypedResponse(s, rng)).toBe("C");
  });
});

describe("selectTypedResponse — default rng", () => {
  it("works without passing rng (uses Math.random)", () => {
    const r = selectTypedResponse(baseState);
    expect("ABCDEF".includes(r)).toBe(true);
  });
});

describe("selectClickedIndex — 'right' model", () => {
  it("returns index of correctResponse", () => {
    const rng = mulberry32(1);
    const chars = ["A", "B", "C", "D"];
    const idx = selectClickedIndex(chars, baseState, rng);
    expect(chars[idx]).toBe("C");
  });

  it("is case-insensitive", () => {
    const rng = mulberry32(1);
    const chars = ["a", "b", "c", "d"];
    const idx = selectClickedIndex(chars, baseState, rng);
    expect(chars[idx].toLowerCase()).toBe("c");
  });
});

describe("selectClickedIndex — 'wrong' model", () => {
  it("never returns the correct index when alternatives exist", () => {
    const rng = mulberry32(7);
    const s = { ...baseState, simulationModel: "wrong" };
    const chars = ["A", "B", "C", "D"];
    for (let i = 0; i < 20; i++) {
      const idx = selectClickedIndex(chars, s, rng);
      expect(chars[idx]).not.toBe("C");
    }
  });
});

describe("selectClickedIndex — 'blind' model", () => {
  it("returns valid indices", () => {
    const rng = mulberry32(99);
    const s = { ...baseState, simulationModel: "blind" };
    const chars = ["A", "B", "C", "D"];
    for (let i = 0; i < 30; i++) {
      const idx = selectClickedIndex(chars, s, rng);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(chars.length);
    }
  });
});

describe("selectTypedResponse — 'weibull' NaN guard", () => {
  it("falls back to blind when simulationThreshold is NaN", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      simulationThreshold: "not-a-number",
    };
    const results = Array.from({ length: 30 }, () =>
      selectTypedResponse(s, rng),
    );
    const unique = new Set(results);
    // Blind model selects uniformly; with 6 chars and 30 trials, expect >=2 unique
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("falls back to blind when simulationBeta is NaN", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      simulationBeta: "",
    };
    const results = Array.from({ length: 30 }, () =>
      selectTypedResponse(s, rng),
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("falls back to blind when simulationDelta is NaN", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      simulationDelta: "bad",
    };
    const results = Array.from({ length: 30 }, () =>
      selectTypedResponse(s, rng),
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("falls back to blind when thresholdProportionCorrect is NaN", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      thresholdProportionCorrect: "x",
    };
    const results = Array.from({ length: 30 }, () =>
      selectTypedResponse(s, rng),
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("falls back to blind when trialLevel is NaN", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      trialLevel: "nope",
    };
    const results = Array.from({ length: 30 }, () =>
      selectTypedResponse(s, rng),
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("emits console.warn on NaN param", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const rng = mulberry32(1);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      simulationBeta: "invalid",
    };
    selectTypedResponse(s, rng);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[sim:weibull]"));
    spy.mockRestore();
  });
});

describe("selectClickedIndex — 'weibull' model", () => {
  it("returns valid index within chars range", () => {
    const rng = mulberry32(3);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
    };
    const chars = ["A", "B", "C", "D"];
    for (let i = 0; i < 20; i++) {
      const idx = selectClickedIndex(chars, s, rng);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(chars.length);
    }
  });

  it("returns 0 when typed response char not found in DOM chars", () => {
    const rng = mulberry32(0);
    const s: EEStateData = {
      ...baseState,
      simulationModel: "weibull",
      // The weibull test above uses trialLevel=100 so P≈1 → always "C"
      trialLevel: "100",
    };
    // chars array does NOT contain "C" — response should map to 0
    const chars = ["X", "Y", "Z"];
    const idx = selectClickedIndex(chars, s, rng);
    expect(idx).toBe(0);
  });
});

describe("Determinism across runs", () => {
  it("same seed produces same response sequence", () => {
    const run1 = Array.from({ length: 10 }, () =>
      selectTypedResponse(
        { ...baseState, simulationModel: "blind" },
        mulberry32(42),
      ),
    );
    const run2 = Array.from({ length: 10 }, () =>
      selectTypedResponse(
        { ...baseState, simulationModel: "blind" },
        mulberry32(42),
      ),
    );
    expect(run1).toEqual(run2);
  });
});
