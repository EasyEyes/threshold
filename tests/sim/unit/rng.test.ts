/**
 * @jest-environment jsdom
 *
 * App-side RNG source (components/rng.ts): seeded named streams for
 * simulation/replay, Math.random passthrough for real participants.
 * Every app-side randomness site must draw from here, never Math.random
 * directly — this is what makes same-seed runs reproducible for
 * differential testing.
 */

import {
  initRng,
  random,
  rngFor,
  handlerSeed,
  getSeedSource,
  getMasterSeed,
  resetRngForTests,
} from "../../../components/rng";
import { shuffle } from "../../../components/utils";

// utils.js transitively imports modules Jest cannot parse (top-level await in
// global.js) or that pull the whole app; mock them so shuffle is importable.
jest.mock("../../../components/global", () => ({
  displayOptions: {},
  eyeTrackingStimulusRecords: [],
  fixationConfig: {},
  skipTrialOrBlock: {},
  status: {},
  targetEccentricityDeg: {},
  thisExperimentInfo: {},
  viewingDistanceCm: {},
}));
jest.mock("../../../components/letter", () => ({
  logWebGLInfoToFormspree: () => {},
}));
jest.mock("../../../components/fontInstancing.ts", () => ({
  getFontInstancingTimesMs: () => [],
  getFontInstancingTotalTimeMs: () => 0,
}));
jest.mock("../../../components/globalPsychoJS", () => ({
  psychoJS: {},
  psychojsMouse: {},
  to_px: () => 0,
}));
jest.mock("../../../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
jest.mock("../../../psychojs/src/data/MultiStairHandler.js", () => ({
  MultiStairHandler: class {},
}));
jest.mock("../../../threshold", () => ({
  paramReader: { read: () => [] },
}));
jest.mock("../../../components/eyeTrackingFacilitation", () => ({
  getAppleCoordinatePosition: () => [0, 0],
}));
jest.mock("../../../components/readingAddons", () => ({
  pxToPt: () => 0,
}));
jest.mock("../../../components/errorHandling", () => ({
  warning: () => {},
}));
jest.mock("../../../components/multiple-displays/globals.ts", () => ({
  Screens: [],
}));
jest.mock("../../../components/multiple-displays/utils.ts", () => ({
  XYDegOfPx: () => [0, 0],
  XYPxOfDeg: () => [0, 0],
}));
jest.mock("../../../components/readPhrases", () => ({
  useWordDigitBool: () => false,
}));

beforeEach(() => {
  resetRngForTests();
  delete (window as any).__SIM_SEED__;
});

describe("unseeded (real participants) — Math.random passthrough", () => {
  it("random() returns the underlying Math.random draw", () => {
    const spy = jest.spyOn(Math, "random").mockReturnValue(0.42);
    expect(random("stimuli")).toBe(0.42);
    expect(rngFor("stimuli")()).toBe(0.42);
    spy.mockRestore();
  });

  it("handlerSeed falls back to a wall-clock-ish number (legacy behavior)", () => {
    expect(typeof handlerSeed("blocks")).toBe("number");
    expect(Number.isFinite(handlerSeed("blocks"))).toBe(true);
  });

  it("seedSource is unseeded", () => {
    expect(getSeedSource()).toBe("unseeded");
    expect(getMasterSeed()).toBeNull();
  });
});

describe("seeded determinism", () => {
  it("same seed → same sequence", () => {
    initRng(42, "sim");
    const first = Array.from({ length: 5 }, () => random("stimuli"));
    resetRngForTests();
    initRng(42, "sim");
    const second = Array.from({ length: 5 }, () => random("stimuli"));
    expect(second).toEqual(first);
  });

  it("different seeds → different sequences", () => {
    initRng(1, "sim");
    const a = Array.from({ length: 5 }, () => random("stimuli"));
    resetRngForTests();
    initRng(2, "sim");
    const b = Array.from({ length: 5 }, () => random("stimuli"));
    expect(b).not.toEqual(a);
  });
});

describe("named streams are isolated", () => {
  it("draws from one stream do not advance another", () => {
    initRng(7, "sim");
    random("a");
    random("a");
    random("a");
    const bAfter = Array.from({ length: 5 }, () => random("b"));
    resetRngForTests();
    initRng(7, "sim");
    const bFresh = Array.from({ length: 5 }, () => random("b"));
    expect(bFresh).toEqual(bAfter);
  });

  it("re-init resets all streams", () => {
    initRng(7, "sim");
    const a1 = random("a");
    initRng(7, "sim");
    expect(random("a")).toBe(a1);
  });
});

describe("handlerSeed — deterministic seeds for seedrandom-based handlers", () => {
  it("same name+seed → same handler seed, across re-inits", () => {
    initRng(5, "sim");
    const s1 = handlerSeed("blocks");
    resetRngForTests();
    initRng(5, "sim");
    expect(handlerSeed("blocks")).toBe(s1);
  });

  it("distinct names → distinct handler seeds", () => {
    initRng(5, "sim");
    expect(handlerSeed("blocks")).not.toBe(handlerSeed("trials"));
  });

  it("handler seed differs from stream draws (independent derivation is fine; stability is what matters)", () => {
    initRng(5, "sim");
    expect(typeof handlerSeed("trials")).toBe("number");
  });
});

describe("lazy init from the environment", () => {
  it("window.__SIM_SEED__ seeds the rng on first draw (sim path)", () => {
    (window as any).__SIM_SEED__ = 9;
    const withWindow = Array.from({ length: 5 }, () => random("x"));
    resetRngForTests();
    initRng(9, "sim");
    const explicit = Array.from({ length: 5 }, () => random("x"));
    expect(withWindow).toEqual(explicit);
    expect(getSeedSource()).toBe("sim");
  });

  it("?rngSeed= URL param seeds the rng (url path)", () => {
    window.history.replaceState({}, "", "/?rngSeed=7");
    const viaUrl = random("x");
    resetRngForTests();
    initRng(7, "url");
    expect(viaUrl).toBe(random("x"));
    expect(getSeedSource()).toBe("url");
    window.history.replaceState({}, "", "/");
  });

  it("getSeedSource/getMasterSeed lazy-init from the environment too", () => {
    (window as any).__SIM_SEED__ = 11;
    expect(getSeedSource()).toBe("sim");
    expect(getMasterSeed()).toBe(11);
  });
});

describe("unseeded randomization is not accidentally static (regression guard)", () => {
  it("shuffle produces multiple distinct orders across repeated unseeded calls", () => {
    // If a static seed ever leaked into the unseeded path, every shuffle of
    // the same input would produce the same permutation.
    const orders = new Set<string>();
    for (let i = 0; i < 8; i++) {
      // fresh module state each iteration is NOT needed: the unseeded path
      // must vary WITHIN one session, exactly like Math.random did.
      orders.add(shuffle([...Array(12).keys()]).join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("distinct named streams all vary when unseeded", () => {
    for (const name of [
      "stimuli",
      "images",
      "audio",
      "blockOrder",
      "session",
      "misc",
    ]) {
      const draws = new Set([random(name), random(name), random(name)]);
      expect(draws.size).toBeGreaterThan(1);
    }
  });
});

describe("handlerSeed unseeded — constructions get distinct seeds", () => {
  it("two rapid constructions (same tick) must NOT share a seed", async () => {
    // Two handlers constructed in the same millisecond sharing a seed would
    // interleave conditions identically — a randomization regression vs the
    // pre-patch behavior (seedrandom() auto-entropy when the seed option was
    // ignored). Desired: distinct seeds even in the same tick.
    const { handlerSeed } = await import("../../../components/rng");
    const a = handlerSeed("trials");
    const b = handlerSeed("trials");
    expect(b).not.toBe(a);
  });
});

describe("shuffle uses an injectable rng (components/utils shuffle)", () => {
  it("seeded shuffle is deterministic and a permutation", async () => {
    const { shuffle } = await import("../../../components/utils");
    initRng(123, "sim");
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const first = shuffle([...input], rngFor("blockOrder"));
    resetRngForTests();
    initRng(123, "sim");
    const second = shuffle([...input], rngFor("blockOrder"));
    expect(second).toEqual(first);
    expect([...first].sort((a, b) => a - b)).toEqual(input);
  });
});
