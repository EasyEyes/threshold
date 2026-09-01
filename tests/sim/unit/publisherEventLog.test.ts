/**
 * @jest-environment jsdom
 *
 * Publisher adapters (simulatedState.ts publish* helpers) under the
 * supersede design: each helper must BOTH (a) keep writing the exact
 * legacy #ee-state attrs (existing simulatedState.test.ts is the GREEN
 * suite; these tests add envelope assertions) and (b) emit the
 * corresponding schema events into window.__eeEvents, in order.
 */

import {
  publishBootEvent,
  publishBlockBegin,
  publishBlockEnd,
  publishResponseAffordance,
  publishResponseEvent,
  publishSummary,
  publishPhaseEntered,
  publishTrialStarted,
  publishDialogOpened,
  publishDialogClosed,
  publishErrorReported,
  publishClickAffordance,
  publishBlockRestarted,
  resetEEStateForTests,
  activateSimulation,
  setEEState,
  SIM_PHASE,
} from "../../../components/simulatedState";
import {
  getEventLog,
  resetEventLogForTests,
} from "../../../components/eventStream/eventLog";
import { initRng, resetRngForTests } from "../../../components/rng";

function readAttr(name: string): string | null {
  const el = document.getElementById("ee-state");
  return el?.getAttribute(name) ?? null;
}

function envelopeTypes(): string[] {
  return ((window as any).__eeEvents ?? []).map(
    (env: any) => env.e.type as string,
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
  resetEventLogForTests();
  resetEEStateForTests();
  resetRngForTests();
  activateSimulation();
});

describe("publishBootEvent", () => {
  it("writes legacy attrs AND emits session.started + phase.entered(loading)", () => {
    publishBootEvent({
      experimentName: "letter-sim",
      blockCount: 1,
      conditionCount: 1,
      targetKinds: "letter,vernier",
      language: "english",
      seed: 7,
    });
    expect(readAttr("data-phase")).toBe("loading");
    expect(readAttr("data-experiment-name")).toBe("letter-sim");
    expect(readAttr("data-block-count")).toBe("1");
    expect(readAttr("data-condition-count")).toBe("1");
    expect(readAttr("data-target-kinds")).toBe("letter,vernier");
    expect(readAttr("data-language")).toBe("english");
    expect(readAttr("data-seed")).toBe("7");
    expect(envelopeTypes()).toEqual(["session.started", "phase.entered"]);
  });

  it("boot initializes the log header (not a placeholder)", () => {
    initRng(7, "sim");
    publishBootEvent({
      experimentName: "e",
      blockCount: 1,
      conditionCount: 1,
      targetKinds: "letter",
      language: "en",
      seed: 7,
    });
    expect(getEventLog()?.header.seed).toBe(7);
    expect(getEventLog()?.header.experimentName).toBe("e");
    expect(getEventLog()?.header.seedSource).toBe("sim");
  });

  it("session.started envelope carries canonical typed fields", () => {
    publishBootEvent({
      experimentName: "e",
      blockCount: 2,
      conditionCount: 3,
      targetKinds: "letter,vernier",
      language: "en",
      seed: 1,
    });
    const first = (window as any).__eeEvents[0];
    expect(first.e).toEqual({
      type: "session.started",
      experimentName: "e",
      blockCount: 2,
      conditionCount: 3,
      targetKinds: ["letter", "vernier"],
      language: "en",
      seed: 1,
    });
  });
});

describe("publishBlockBegin", () => {
  it("writes legacy attrs AND emits block.entered", () => {
    publishBlockBegin({
      block: 2,
      nthBlock: 1,
      blockTotal: 5,
      blockCondition: "2_1",
      enabled: true,
      targetKind: "letter",
      targetTask: "identify",
    });
    expect(readAttr("data-block")).toBe("2");
    expect(readAttr("data-block-total")).toBe("5");
    expect(readAttr("data-block-condition")).toBe("2_1");
    expect(readAttr("data-enabled")).toBe("true");
    expect(envelopeTypes()).toEqual(["block.entered"]);
    const e = (window as any).__eeEvents[0].e;
    expect(e.block).toBe(2);
    expect(e.nthBlock).toBe(1);
    expect(e.targetKind).toBe("letter");
    expect(e.targetTask).toBe("identify");
  });

  it('omitted optional fields → null in event, "" in attrs', () => {
    publishBlockBegin({
      block: 1,
      nthBlock: 1,
      blockTotal: 1,
      blockCondition: undefined,
      enabled: undefined,
      targetKind: "letter",
      targetTask: "identify",
    });
    expect(readAttr("data-block-condition")).toBe("");
    expect(readAttr("data-enabled")).toBe("true");
    const e = (window as any).__eeEvents[0].e;
    expect(e.blockCondition).toBeNull();
    expect(e.enabled).toBe(true);
  });
});

describe("publishBlockEnd", () => {
  it("emits block.exited, writes no new attrs", () => {
    publishBlockBegin({
      block: 1,
      nthBlock: 1,
      blockTotal: 1,
      targetKind: "letter",
      targetTask: "identify",
    });
    const before = document
      .getElementById("ee-state")!
      .getAttributeNames()
      .sort();
    publishBlockEnd(1);
    const after = document
      .getElementById("ee-state")!
      .getAttributeNames()
      .sort();
    expect(after).toEqual(before);
    expect(envelopeTypes()).toEqual(["block.entered", "block.exited"]);
  });
});

describe("publishResponseAffordance", () => {
  it("writes affordance attrs AND emits response.affordance (phase is the call site's job)", () => {
    publishResponseAffordance({
      validCharsTyped: "ABC",
      correctResponse: "B",
      simulationModel: "weibull",
      trialLevel: 1.5,
      simulationThreshold: 2,
      simulationBeta: 2.3,
      simulationDelta: 0.01,
      thresholdProportionCorrect: 0.816,
    });
    expect(readAttr("data-response-typed")).toBe("true");
    expect(readAttr("data-valid-chars-typed")).toBe("ABC");
    expect(readAttr("data-correct-response")).toBe("B");
    expect(readAttr("data-trial-level")).toBe("1.5");
    expect(readAttr("data-simulation-model")).toBe("weibull");
    expect(readAttr("data-simulation-threshold")).toBe("2");
    expect(readAttr("data-simulation-beta")).toBe("2.3");
    expect(readAttr("data-simulation-delta")).toBe("0.01");
    expect(readAttr("data-threshold-proportion-correct")).toBe("0.816");
    expect(envelopeTypes()).toEqual(["response.affordance"]);
  });

  it("active=false closes the affordance (debrief)", () => {
    publishResponseAffordance({ validCharsTyped: "", active: false });
    expect(readAttr("data-response-typed")).toBe("false");
    expect(readAttr("data-valid-chars-typed")).toBe("");
    expect((window as any).__eeEvents[0].e.active).toBe(false);
  });

  it("array correctResponse: event keeps all, attr shows first", () => {
    publishResponseAffordance({
      validCharsTyped: ["phrase one", "phrase two"],
      correctResponse: ["phrase two", "phrase one"],
    });
    expect(readAttr("data-valid-chars-typed")).toBe("phrase onephrase two");
    expect(readAttr("data-correct-response")).toBe("phrase two");
    const e = (window as any).__eeEvents[0].e;
    expect(e.validChars).toEqual(["phrase one", "phrase two"]);
    expect(e.correctResponse).toEqual(["phrase two", "phrase one"]);
  });

  it("string validChars canonicalizes to chars in event, joins identically in attr", () => {
    publishResponseAffordance({
      validCharsTyped: "XYZ",
      correctResponse: null,
    });
    expect(readAttr("data-valid-chars-typed")).toBe("XYZ");
    expect(readAttr("data-correct-response")).toBe("");
    const e = (window as any).__eeEvents[0].e;
    expect(e.validChars).toEqual(["X", "Y", "Z"]);
    expect(e.correctResponse).toBeNull();
  });
  it("re-emits a phase after a scatter setEEState overwrite (attr-domain diff)", () => {
    // Trial 1: phase=response published
    publishPhaseEntered(SIM_PHASE.RESPONSE);
    expect(readAttr("data-phase")).toBe("response");
    // Between trials, scatter code overwrites the phase attr directly
    setEEState({ phase: "stimulus" });
    expect(readAttr("data-phase")).toBe("stimulus");
    // Trial 2: the same phase is emitted again — the attr MUST be
    // rewritten even though the projection already holds "response".
    publishPhaseEntered(SIM_PHASE.RESPONSE);
    expect(readAttr("data-phase")).toBe("response");
    expect(envelopeTypes().filter((t) => t === "phase.entered")).toHaveLength(
      2,
    );
  });
});

describe("attr restoration after #ee-state element recreation", () => {
  it("re-projects unchanged fields onto a freshly created element", () => {
    publishPhaseEntered(SIM_PHASE.LOADING);
    expect(readAttr("data-phase")).toBe("loading");
    // If anything ever removes the element mid-run, getElement() recreates
    // it empty; the attr mirror must notice and re-write event-derived
    // fields, even values unchanged since the last write.
    document.getElementById("ee-state")!.remove();
    publishPhaseEntered(SIM_PHASE.LOADING);
    expect(readAttr("data-phase")).toBe("loading");
  });
});

describe("publishPhaseEntered", () => {
  it("writes the phase attr AND emits phase.entered", () => {
    publishPhaseEntered(SIM_PHASE.INSTRUCTIONS);
    expect(readAttr("data-phase")).toBe("instructions");
    publishPhaseEntered(SIM_PHASE.RESPONSE);
    expect(readAttr("data-phase")).toBe("response");
    expect(envelopeTypes()).toEqual(["phase.entered", "phase.entered"]);
  });
});

describe("publishTrialStarted", () => {
  it("writes trial/trialTotal attrs AND emits trial.started", () => {
    publishTrialStarted(7, "1_1", 10);
    expect(readAttr("data-trial")).toBe("7");
    expect(readAttr("data-trial-total")).toBe("10");
    expect((window as any).__eeEvents[0].e).toMatchObject({
      type: "trial.started",
      trial: 7,
      blockCondition: "1_1",
      trialTotal: 10,
    });
  });
});

describe("publishDialogOpened / publishDialogClosed", () => {
  it("opened writes dialogOpen+dialogs count attrs, emits dialog.opened; closed clears", () => {
    publishDialogOpened("swal", "Question 1", "Swal: Question 1");
    publishDialogOpened("swal", "Question 1", "Swal: Question 1");
    expect(readAttr("data-dialog-open")).toBe("Swal: Question 1");
    expect(readAttr("data-dialogs")).toBe("2");
    publishDialogClosed();
    expect(readAttr("data-dialog-open")).toBe("");
    expect(readAttr("data-dialogs")).toBe("2");
    expect(envelopeTypes()).toEqual([
      "dialog.opened",
      "dialog.opened",
      "dialog.closed",
    ]);
  });
});

describe("publishErrorReported", () => {
  it("writes the error attr AND emits error.reported", () => {
    publishErrorReported("NaN in response model");
    expect(readAttr("data-error")).toBe("NaN in response model");
    expect((window as any).__eeEvents[0].e).toEqual({
      type: "error.reported",
      message: "NaN in response model",
    });
  });
});

describe("publishBlockRestarted", () => {
  it("writes the recalibrations count attr AND emits block.restarted", () => {
    publishBlockRestarted(1, "recalibration");
    publishBlockRestarted(1, "recalibration");
    expect(readAttr("data-recalibrations")).toBe("2");
    expect(envelopeTypes()).toEqual(["block.restarted", "block.restarted"]);
  });
});

describe("publishClickAffordance", () => {
  it("writes click-affordance attrs AND emits click.affordance (null = unchanged)", () => {
    publishClickAffordance({ clicked: true, validChars: ["A", "B"] });
    expect(readAttr("data-response-clicked")).toBe("true");
    expect(readAttr("data-valid-chars-clicked")).toBe("AB");
    publishClickAffordance({ clicked: false, validChars: null });
    expect(readAttr("data-response-clicked")).toBe("false");
    expect(readAttr("data-valid-chars-clicked")).toBe("AB");
    expect((window as any).__eeEvents[1].e).toEqual({
      type: "click.affordance",
      clicked: false,
      validChars: null,
    });
  });
});

describe("publishResponseEvent", () => {
  it("writes legacy response attrs AND emits response.recorded", () => {
    publishResponseEvent("Space", "key", true);
    expect(readAttr("data-response-received")).toBe("Space");
    expect(readAttr("data-response-kind")).toBe("key");
    expect(readAttr("data-response-correct")).toBe("true");
    expect(envelopeTypes()).toEqual(["response.recorded"]);
    expect((window as any).__eeEvents[0].e).toEqual({
      type: "response.recorded",
      kind: "key",
      value: "Space",
      correct: true,
    });
  });

  it('undefined correct → null in event, "" in attr', () => {
    publishResponseEvent("d", "keypad");
    expect(readAttr("data-response-correct")).toBe("");
    expect((window as any).__eeEvents[0].e.correct).toBeNull();
  });
});

describe("publishSummary", () => {
  it("writes legacy summary attrs, completion signal, AND emits session.ended + phase.entered(complete)", () => {
    publishSummary({
      trialsCompleted: 12,
      trialsTotal: 12,
      blocksSkipped: 1,
      warnings: "w1\nw2",
    });
    expect(readAttr("data-phase")).toBe("complete");
    expect(readAttr("data-trials-completed")).toBe("12");
    expect(readAttr("data-trials-total")).toBe("12");
    expect(readAttr("data-blocks-skipped")).toBe("1");
    expect(readAttr("data-warnings")).toBe("w1\nw2");
    expect(sessionStorage.getItem("__SIM_COMPLETE__")).toBe("1");
    expect((window as any).__SIM_COMPLETE__).toBe(true);
    expect(envelopeTypes()).toEqual(["session.ended", "phase.entered"]);
    expect((window as any).__eeEvents[0].e.status).toBe("completed");
    expect((window as any).__eeEvents[0].e.warningsSummary).toBe("w1\nw2");
  });

  it('minimal summary: nulls → "" attrs, defaults 0', () => {
    publishSummary({ trialsCompleted: 3 });
    expect(readAttr("data-trials-total")).toBe("");
    expect(readAttr("data-blocks-skipped")).toBe("0");
    expect(readAttr("data-warnings")).toBe("");
  });
});
