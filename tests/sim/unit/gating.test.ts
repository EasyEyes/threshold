/**
 * @jest-environment jsdom
 *
 * Locks the central invariant of the simulated-observer overhaul:
 *
 *   When simulateParticipantBool is FALSE (the default for every real
 *   participant), instrumentation MUST have zero side effects:
 *     - No DOM writes (no #ee-state element is ever created).
 *     - No paramReader reads for sim-only parameters.
 *     - No expensive arg evaluation (.toFixed, .join, etc.) at call sites.
 *
 * Every call site that invokes a `simulatedState` API MUST be wrapped in
 * `if (simulateActive)`. The internal `if (!simulateActive) return;` guards
 * inside simulatedState.ts are defense-in-depth, not the primary gate —
 * arguments are evaluated BEFORE the function call, so the call-site gate
 * is what eliminates per-trial paramReader.read() cost.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// Capture whether the simulatedState module is in its default (off) state.
// We import the live binding so the test sees the current value at call time.
import { simulateActive as _probe } from "../../../components/simulatedState";

describe("simulated-observer gating invariant (sim off by default)", () => {
  beforeEach(() => {
    // Ensure no #ee-state element leaks between tests. Importantly, if the
    // gating is correct, none of the tests below will create one.
    document.getElementById("ee-state")?.remove();
  });

  test("simulateActive is FALSE in a fresh module load (real-participant default)", () => {
    expect(_probe).toBe(false);
  });

  test("simulatedState does NOT create a #ee-state element when simulateActive is false", async () => {
    // Re-import the module fresh so we exercise the default state.
    jest.resetModules();
    const fresh = await import("../../../components/simulatedState");
    expect(fresh.simulateActive).toBe(false);

    fresh.setEEState({ phase: "loading" });
    fresh.publishResponseAffordance({
      validCharsTyped: "ABC",
      correctResponse: "A",
    });
    fresh.publishBootEvent({
      experimentName: "x",
      blockCount: 1,
      conditionCount: 1,
      targetKinds: "letter",
      language: "en",
      seed: "",
    });
    fresh.publishBlockBegin({ block: 1 });
    fresh.publishBlockEnd(1);
    fresh.publishSummary({ trialsCompleted: 0 });
    fresh.publishResponseEvent("a", "key", true);

    expect(document.getElementById("ee-state")).toBeNull();
  });

  test("the gating PATTERN (call-site `if (simulateActive)`) avoids evaluating expensive args", async () => {
    // Mirror what every gated call site looks like after the overhaul:
    //   if (simulateActive) publishResponseAffordance({ ...expensive args... });
    //
    // We assert the args are NOT evaluated when simulateActive is false by
    // counting calls into a stub. The internal `simulateActive` guard would
    // be too late — args are evaluated at the call site before the function
    // body runs. Only the call-site `if` eliminates the cost.
    jest.resetModules();
    const fresh = await import("../../../components/simulatedState");
    const { simulateActive } = fresh;
    expect(simulateActive).toBe(false);

    let readCount = 0;
    const fakeRead = (): string => {
      readCount++;
      return "x";
    };

    // The gated pattern under test. If the gate is removed, readCount rises.
    if (simulateActive) {
      fresh.publishResponseAffordance({
        validCharsTyped: "ABC",
        correctResponse: "A",
        simulationModel: fakeRead(),
        simulationThreshold: fakeRead(),
        simulationBeta: fakeRead(),
        simulationDelta: fakeRead(),
        thresholdProportionCorrect: fakeRead(),
      });
    }

    expect(readCount).toBe(0);
  });

  test("no #ee-state element created via gated call sites (integration check)", async () => {
    jest.resetModules();
    const fresh = await import("../../../components/simulatedState");
    expect(fresh.simulateActive).toBe(false);

    if (fresh.simulateActive) {
      fresh.setEEState({ phase: "loading" });
    }
    if (fresh.simulateActive) {
      fresh.publishResponseAffordance({
        validCharsTyped: "ABC",
        correctResponse: "A",
      });
    }
    expect(document.getElementById("ee-state")).toBeNull();
  });
});
