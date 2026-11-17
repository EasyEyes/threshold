// Chaos injection for e2e robustness testing (?chaos=<seed> or
// __SIM_OPTIONS__.chaos): throw once, at a deterministic point in the
// startup/flow sequence (the Nth distinct routine name), so e2e can verify
// every failure path ends in a specific recorded reason. Inert without the
// seed. Extracted from threshold.js for unit testing.

export const strHash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const chaosSeedFromLocation = (simOptions, search) =>
  (simOptions && simOptions.chaos) ||
  new URLSearchParams(search).get("chaos") ||
  null;

export const createChaosState = (seed) =>
  seed
    ? {
        targetDistinct: (strHash(String(seed)) % 22) + 2,
        seen: new Set(),
        fired: false,
      }
    : null;

export const chaosFireIfDue = (state, fnName) => {
  if (!state || state.fired || state.seen.has(fnName)) return;
  state.seen.add(fnName);
  if (state.seen.size >= state.targetDistinct) {
    state.fired = true;
    throw new Error(`CHAOS injected at ${fnName}`);
  }
};
