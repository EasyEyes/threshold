/**
 * @jest-environment jsdom
 */

import {
  setEEState,
  SIM_PHASE,
  publishResponseAffordance,
  publishBootEvent,
  publishBlockBegin,
  publishBlockEnd,
  publishSummary,
  activateSimulation,
  type EEStateUpdate,
} from "../../../components/simulatedState";

function readAttr(name: string): string | null {
  const el = document.getElementById("ee-state");
  return el?.getAttribute(name) ?? null;
}

beforeEach(() => {
  document.body.innerHTML = "";
  activateSimulation();
});

describe("setEEState", () => {
  it("creates #ee-state element on first call", () => {
    expect(document.getElementById("ee-state")).toBeNull();
    setEEState({ phase: SIM_PHASE.LOADING });
    const el = document.getElementById("ee-state");
    expect(el).not.toBeNull();
    expect(el?.style.display).toBe("none");
  });

  it("reuses existing element on subsequent calls", () => {
    setEEState({ phase: SIM_PHASE.LOADING });
    setEEState({ trial: 1 });
    expect(document.querySelectorAll("#ee-state")).toHaveLength(1);
  });

  it("writes camelCase keys as data-kebab-case attributes", () => {
    setEEState({
      phase: SIM_PHASE.RESPONSE,
      trialTotal: 30,
      validCharsTyped: "XYZ",
      simulationModel: "right",
      thresholdProportionCorrect: "0.816",
      currentFunction: "trialRoutineBegin",
      conditionName: "block1cond2",
      targetKind: "letter",
      targetTask: "identify",
    });
    expect(readAttr("data-phase")).toBe("response");
    expect(readAttr("data-trial-total")).toBe("30");
    expect(readAttr("data-valid-chars-typed")).toBe("XYZ");
    expect(readAttr("data-simulation-model")).toBe("right");
    expect(readAttr("data-threshold-proportion-correct")).toBe("0.816");
    expect(readAttr("data-current-function")).toBe("trialRoutineBegin");
    expect(readAttr("data-condition-name")).toBe("block1cond2");
    expect(readAttr("data-target-kind")).toBe("letter");
    expect(readAttr("data-target-task")).toBe("identify");
  });

  it("preserves existing attributes when adding new ones", () => {
    setEEState({ phase: SIM_PHASE.FIXATION });
    setEEState({ trial: 5 });
    expect(readAttr("data-phase")).toBe("fixation");
    expect(readAttr("data-trial")).toBe("5");
  });

  it("overwrites existing attribute value", () => {
    setEEState({ trial: 1 });
    setEEState({ trial: 2 });
    expect(readAttr("data-trial")).toBe("2");
  });

  it("writes empty string for null/undefined values", () => {
    setEEState({ trial: undefined, phase: undefined });
    expect(readAttr("data-trial")).toBe("");
    expect(readAttr("data-phase")).toBe("");
  });

  it("stringifies numbers and booleans", () => {
    setEEState({ trial: 42, responseTyped: true, responseClicked: false });
    expect(readAttr("data-trial")).toBe("42");
    expect(readAttr("data-response-typed")).toBe("true");
    expect(readAttr("data-response-clicked")).toBe("false");
  });
});

describe("SIM_PHASE", () => {
  it("exports expected phases", () => {
    expect(SIM_PHASE.LOADING).toBe("loading");
    expect(SIM_PHASE.COMPATIBILITY).toBe("compatibility");
    expect(SIM_PHASE.CONSENT).toBe("consent");
    expect(SIM_PHASE.CONSENT).toBe("consent");
    expect(SIM_PHASE.CALIBRATION).toBe("calibration");
    expect(SIM_PHASE.INSTRUCTIONS).toBe("instructions");
    expect(SIM_PHASE.FIXATION).toBe("fixation");
    expect(SIM_PHASE.STIMULUS).toBe("stimulus");
    expect(SIM_PHASE.RESPONSE).toBe("response");
    expect(SIM_PHASE.READING).toBe("reading");
    expect(SIM_PHASE.DEBRIEF).toBe("debrief");
    expect(SIM_PHASE.COMPLETE).toBe("complete");
  });
});

describe("publishResponseAffordance", () => {
  it("publishes RESPONSE phase with full affordance", () => {
    publishResponseAffordance({
      validCharsTyped: "ABC",
      correctResponse: "B",
      simulationModel: "right",
      trialLevel: 1.5,
      simulationThreshold: 2,
      simulationBeta: 2.3,
      simulationDelta: 0.01,
      thresholdProportionCorrect: 0.816,
    });
    expect(readAttr("data-phase")).toBe("response");
    expect(readAttr("data-response-typed")).toBe("true");
    expect(readAttr("data-valid-chars-typed")).toBe("ABC");
    expect(readAttr("data-correct-response")).toBe("B");
    expect(readAttr("data-simulation-model")).toBe("right");
    expect(readAttr("data-trial-level")).toBe("1.5");
    expect(readAttr("data-simulation-threshold")).toBe("2");
    expect(readAttr("data-simulation-beta")).toBe("2.3");
    expect(readAttr("data-simulation-delta")).toBe("0.01");
    expect(readAttr("data-threshold-proportion-correct")).toBe("0.816");
  });

  it("handles array validCharsTyped by joining", () => {
    publishResponseAffordance({
      validCharsTyped: ["A", "B", "C"],
      correctResponse: "B",
    });
    expect(readAttr("data-valid-chars-typed")).toBe("ABC");
  });

  it("handles array correctResponse by taking first", () => {
    publishResponseAffordance({
      validCharsTyped: "ABC",
      correctResponse: ["B", "C"],
    });
    expect(readAttr("data-correct-response")).toBe("B");
  });

  it("accepts string values for numeric fields", () => {
    publishResponseAffordance({
      validCharsTyped: "X",
      correctResponse: "X",
      trialLevel: "2.5",
      simulationThreshold: "1.8",
    });
    expect(readAttr("data-trial-level")).toBe("2.5");
    expect(readAttr("data-simulation-threshold")).toBe("1.8");
  });
});

describe("no-op when simulateActive=false (real participants)", () => {
  // Note: top-level beforeEach activates simulation; these tests verify the
  // pre-activation state by reloading the module fresh.
  it("setEEState does NOT create #ee-state element before activateSimulation", async () => {
    jest.resetModules();
    const fresh = await import("../../../components/simulatedState");
    expect(document.getElementById("ee-state")).toBeNull();
    fresh.setEEState({ phase: SIM_PHASE.LOADING });
    expect(document.getElementById("ee-state")).toBeNull();
  });

  it("publishResponseAffordance does NOT write attributes before activateSimulation", async () => {
    jest.resetModules();
    const fresh = await import("../../../components/simulatedState");
    fresh.publishResponseAffordance({
      validCharsTyped: "X",
      correctResponse: "X",
    });
    expect(document.getElementById("ee-state")).toBeNull();
  });

  it("publishBootEvent does NOT write before activateSimulation", async () => {
    jest.resetModules();
    const fresh = await import("../../../components/simulatedState");
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    fresh.publishBootEvent({
      experimentName: "x",
      blockCount: 1,
      conditionCount: 1,
      targetKinds: "letter",
      language: "en",
      seed: 1,
    });
    expect(document.getElementById("ee-state")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("publishBootEvent", () => {
  it("emits boot metadata + [sim:boot] log when simulated", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    publishBootEvent({
      experimentName: "test-exp",
      blockCount: 3,
      conditionCount: 12,
      targetKinds: "letter,word",
      language: "en",
      seed: 42,
    });
    expect(readAttr("data-phase")).toBe("loading");
    expect(readAttr("data-experiment-name")).toBe("test-exp");
    expect(readAttr("data-block-count")).toBe("3");
    expect(readAttr("data-condition-count")).toBe("12");
    expect(readAttr("data-target-kinds")).toBe("letter,word");
    expect(readAttr("data-language")).toBe("en");
    expect(readAttr("data-seed")).toBe("42");
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[sim:boot\] experiment=test-exp/),
    );
    spy.mockRestore();
  });
});

describe("publishBlockBegin / publishBlockEnd", () => {
  it("publishes block begin with metadata + log", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    publishBlockBegin({
      block: 2,
      blockTotal: 5,
      blockCondition: "2_1",
      enabled: true,
    });
    expect(readAttr("data-block")).toBe("2");
    expect(readAttr("data-block-total")).toBe("5");
    expect(readAttr("data-block-condition")).toBe("2_1");
    expect(readAttr("data-enabled")).toBe("true");
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[sim:block\] begin block=2\/5/),
    );
    spy.mockRestore();
  });

  it("publishes block end with log", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    publishBlockEnd(3);
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[sim:block\] end block=3/),
    );
    spy.mockRestore();
  });
});

describe("publishSummary", () => {
  it("publishes summary + log on completion", () => {
    const spy = jest.spyOn(console, "debug").mockImplementation(() => {});
    publishSummary({
      trialsCompleted: 45,
      trialsTotal: 50,
      blocksSkipped: 1,
      warnings: "Stuck at phase=response",
    });
    expect(readAttr("data-phase")).toBe("complete");
    expect(readAttr("data-trials-completed")).toBe("45");
    expect(readAttr("data-trials-total")).toBe("50");
    expect(readAttr("data-block-total")).toBeNull();
    expect(readAttr("data-warnings")).toBe("Stuck at phase=response");
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[sim:summary\] trialsCompleted=45\/50/),
    );
    spy.mockRestore();
  });
});
