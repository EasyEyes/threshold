/**
 * Response selection models for the simulated participant.
 *
 * All functions accept an optional `rng` (defaults to Math.random) so callers
 * can pass a seeded generator for deterministic output. The browser-side
 * simulated participant constructs a mulberry32(seed) at startup.
 */

/** Minimal EEState fields needed for model computation. */
export interface EEStateData {
  validCharsTyped: string;
  correctResponse: string | null;
  simulationModel: string | null;
  trialLevel: string | null;
  simulationThreshold: string | null;
  simulationBeta: string | null;
  simulationDelta: string | null;
  thresholdProportionCorrect: string | null;
}

export type Rng = () => number;

/**
 * mulberry32 — small, fast, deterministic PRNG.
 * Returns a function that produces floats in [0, 1).
 * Same seed → same sequence across runs, platforms, and JS engines.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a typed response character per the configured model.
 *
 *   "right" / "ideal" — always correct.
 *   "wrong"           — always incorrect (or correct if no alternative).
 *   "blind"           — uniform random over the valid set (chance).
 *   "weibull"         — psychometric function around `simulationThreshold`.
 *
 * Falls back to "right" if model is null/unknown.
 */
export function selectTypedResponse(
  state: EEStateData,
  rng: Rng = Math.random,
): string {
  const validChars = state.validCharsTyped.split("");
  const correct = state.correctResponse ?? validChars[0];
  const model = state.simulationModel ?? "right";

  switch (model) {
    case "right":
    case "ideal":
      return correct;

    case "wrong": {
      const wrong = validChars.filter((c) => c !== correct);
      return wrong.length > 0
        ? wrong[Math.floor(rng() * wrong.length)]
        : correct;
    }

    case "blind":
      return validChars[Math.floor(rng() * validChars.length)];

    case "weibull": {
      const tTest = parseFloat(state.trialLevel ?? "0");
      const tActual = Math.log10(parseFloat(state.simulationThreshold ?? "2"));
      const beta = parseFloat(state.simulationBeta ?? "2.3");
      const delta = parseFloat(state.simulationDelta ?? "0.01");
      const tpc = parseFloat(state.thresholdProportionCorrect ?? "0.816");
      if (
        isNaN(tTest) ||
        isNaN(tActual) ||
        isNaN(beta) ||
        isNaN(delta) ||
        isNaN(tpc)
      ) {
        console.warn(
          `[sim:weibull] NaN param — trialLevel=${state.trialLevel} threshold=${state.simulationThreshold} beta=${state.simulationBeta} delta=${state.simulationDelta} tpc=${state.thresholdProportionCorrect}. Falling back to blind.`,
        );
        return validChars[Math.floor(rng() * validChars.length)];
      }
      const gamma = 1 / validChars.length;
      const epsilon =
        Math.log10(
          -Math.log(-((tpc - delta * gamma) / (1 - delta)) + 1) / (1 - gamma),
        ) / beta;
      const t = tTest - tActual + epsilon;
      const P =
        delta * gamma +
        (1 - delta) * (1 - (1 - gamma) * Math.exp(-Math.pow(10, beta * t)));
      if (rng() < P) return correct;
      const wrong = validChars.filter((c) => c !== correct);
      return wrong.length > 0
        ? wrong[Math.floor(rng() * wrong.length)]
        : correct;
    }

    default:
      return correct;
  }
}

/**
 * Pick an index into `chars` per the configured model.
 * Same semantics as selectTypedResponse, but returns a position for click UI.
 */
export function selectClickedIndex(
  chars: string[],
  state: EEStateData,
  rng: Rng = Math.random,
): number {
  const model = state.simulationModel ?? "right";
  const correct = state.correctResponse?.toLowerCase() ?? null;
  const correctIdx = correct
    ? chars.findIndex((c) => c.toLowerCase() === correct)
    : -1;

  switch (model) {
    case "right":
    case "ideal":
      // If we know the correct answer, click it. Otherwise pick randomly
      // so we eventually hit items from different categories (e.g. rsvpReading
      // phrase-identification, where each category accepts only one response).
      return correctIdx >= 0 ? correctIdx : Math.floor(rng() * chars.length);
    case "wrong": {
      const wrongIdxs = chars.map((_, i) => i).filter((i) => i !== correctIdx);
      return wrongIdxs.length > 0
        ? wrongIdxs[Math.floor(rng() * wrongIdxs.length)]
        : 0;
    }
    case "blind":
      return Math.floor(rng() * chars.length);
    case "weibull": {
      const tResponse = selectTypedResponse(state, rng);
      const idx = chars.findIndex(
        (c) => c.toLowerCase() === tResponse.toLowerCase(),
      );
      return idx >= 0 ? idx : 0;
    }
    default:
      return correctIdx >= 0 ? correctIdx : 0;
  }
}
