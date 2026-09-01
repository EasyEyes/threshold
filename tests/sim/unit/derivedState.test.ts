/**
 * Derived-state projection (components/eventStream/derivedState.ts).
 *
 * applyEvent is the incremental reducer; stateFromEvents the replay;
 * diffDerivedState yields only changed, defined keys (the legacy #ee-state
 * attrs are never cleared, only overwritten).
 */

import {
  applyEvent,
  stateFromEvents,
  type DerivedState,
} from "../../../components/eventStream/derivedState";
import type { Event } from "../../../components/eventStream/schema";

describe("applyEvent — wired events derive legacy-equivalent fields", () => {
  it("trial.started derives trial + trialTotal (optional fields absent)", () => {
    const s = applyEvent(
      {},
      {
        type: "trial.started",
        trial: 7,
        blockCondition: "1_1",
        trialTotal: 10,
      },
    );
    expect(s.trial).toBe(7);
    expect(s.trialTotal).toBe(10);
  });

  it("block.entered derives targetKind/targetTask for the simulated participant", () => {
    const s = applyEvent(
      {},
      {
        type: "block.entered",
        block: 1,
        nthBlock: 1,
        blockTotal: 2,
        blockCondition: null,
        enabled: true,
        targetKind: "letter",
        targetTask: "identify",
      },
    );
    expect(s.targetKind).toBe("letter");
    expect(s.targetTask).toBe("identify");
  });

  it("dialog.opened/closed derive dialogOpen + monotonic dialogs count", () => {
    let s = applyEvent(
      {},
      {
        type: "dialog.opened",
        kind: "swal",
        title: "Question 1",
        label: "Swal: Question 1",
      },
    );
    expect(s.dialogOpen).toBe("Swal: Question 1");
    expect(s.dialogs).toBe(1);
    s = applyEvent(s, {
      type: "dialog.opened",
      kind: "swal",
      title: "Question 1",
      label: "Swal: Question 1",
    });
    expect(s.dialogs).toBe(2); // consecutive identical dialogs distinguishable
    s = applyEvent(s, { type: "dialog.closed" });
    expect(s.dialogOpen).toBe("");
    expect(s.dialogs).toBe(2); // close does not bump the fire count
  });

  it("error.reported derives a sticky error", () => {
    const s = applyEvent({}, { type: "error.reported", message: "NaN" });
    expect(s.error).toBe("NaN");
  });

  it("block.restarted derives the recalibrations count", () => {
    let s = applyEvent(
      {},
      { type: "block.restarted", block: 1, cause: "recalibration" },
    );
    s = applyEvent(s, {
      type: "block.restarted",
      block: 1,
      cause: "recalibration",
    });
    expect(s.recalibrations).toBe(2);
  });

  it("click.affordance derives responseClicked/validCharsClicked (null = unchanged)", () => {
    let s = applyEvent(
      {},
      { type: "click.affordance", clicked: true, validChars: ["A", "B"] },
    );
    expect(s.responseClicked).toBe(true);
    expect(s.validCharsClicked).toBe("AB");
    s = applyEvent(s, {
      type: "click.affordance",
      clicked: false,
      validChars: null,
    });
    expect(s.responseClicked).toBe(false);
    expect(s.validCharsClicked).toBe("AB");
    s = applyEvent(s, {
      type: "click.affordance",
      clicked: null,
      validChars: ["X"],
    });
    expect(s.responseClicked).toBe(false);
    expect(s.validCharsClicked).toBe("X");
  });

  it("session.started derives boot attrs", () => {
    const s = applyEvent(
      {},
      {
        type: "session.started",
        experimentName: "letter-sim",
        blockCount: 2,
        conditionCount: 3,
        targetKinds: ["letter", "vernier"],
        language: "english",
        seed: 5,
      },
    );
    expect(s).toMatchObject({
      experimentName: "letter-sim",
      blockCount: 2,
      conditionCount: 3,
      targetKinds: "letter,vernier",
      language: "english",
      seed: 5,
    });
  });

  it("phase.entered derives phase", () => {
    expect(
      applyEvent({}, { type: "phase.entered", phase: "response" }).phase,
    ).toBe("response");
  });

  it("block.entered derives block attrs + targetKind/targetTask", () => {
    const s = applyEvent(
      {},
      {
        type: "block.entered",
        block: 2,
        nthBlock: 1,
        blockTotal: null,
        blockCondition: null,
        enabled: true,
        targetKind: "letter",
        targetTask: "identify",
      },
    );
    expect(s).toEqual({
      block: 2,
      blockTotal: null,
      blockCondition: null,
      enabled: true,
      targetKind: "letter",
      targetTask: "identify",
    });
  });

  it('response.affordance derives the affordance attrs (join validChars, first correctResponse, ?? "" params)', () => {
    const s = applyEvent(
      {},
      {
        type: "response.affordance",
        validChars: ["A", "B", "C"],
        correctResponse: ["B"],
        trialLevel: 1.5,
        simulationModel: "weibull",
        simulationThreshold: 2,
        simulationBeta: 2.3,
        simulationDelta: 0.01,
        thresholdProportionCorrect: 0.816,
      },
    );
    expect(s).toEqual({
      responseTyped: true,
      validCharsTyped: "ABC",
      correctResponse: "B",
      trialLevel: 1.5,
      simulationModel: "weibull",
      simulationThreshold: 2,
      simulationBeta: 2.3,
      simulationDelta: 0.01,
      thresholdProportionCorrect: 0.816,
    });
  });

  it("response.affordance with active=false closes the typed affordance", () => {
    const s = applyEvent(
      {},
      {
        type: "response.affordance",
        validChars: [],
        correctResponse: null,
        active: false,
        trialLevel: null,
        simulationModel: null,
        simulationThreshold: null,
        simulationBeta: null,
        simulationDelta: null,
        thresholdProportionCorrect: null,
      },
    );
    expect(s.responseTyped).toBe(false);
    expect(s.validCharsTyped).toBe("");
  });

  it('response.affordance with null fields derives "" placeholders', () => {
    const s = applyEvent(
      {},
      {
        type: "response.affordance",
        validChars: ["X"],
        correctResponse: null,
        trialLevel: null,
        simulationModel: null,
        simulationThreshold: null,
        simulationBeta: null,
        simulationDelta: null,
        thresholdProportionCorrect: null,
      },
    );
    expect(s.correctResponse).toBe("");
    expect(s.trialLevel).toBe("");
    expect(s.simulationModel).toBe("");
  });

  it("response.recorded derives the last-response attrs", () => {
    const s = applyEvent(
      {},
      { type: "response.recorded", kind: "key", value: "Space", correct: true },
    );
    expect(s).toEqual({
      responseReceived: "Space",
      responseKind: "key",
      responseCorrect: true,
    });
  });

  it("trial.started derives trial", () => {
    expect(
      applyEvent(
        {},
        {
          type: "trial.started",
          trial: 4,
          blockCondition: "1_1",
          level: null,
          fixationPosPx: null,
          usingGaze: false,
        },
      ).trial,
    ).toBe(4);
  });

  it('session.ended derives summary attrs with "" placeholders for nulls', () => {
    const s = applyEvent(
      {},
      {
        type: "session.ended",
        status: "completed",
        trialsCompleted: 10,
        trialsTotal: null,
        blocksSkipped: 0,
        warningsSummary: null,
      },
    );
    expect(s).toEqual({
      trialsCompleted: 10,
      trialsTotal: "",
      blocksSkipped: 0,
      warnings: "",
    });
  });
});

describe("applyEvent — unwired events leave state unchanged (pure)", () => {
  const unchanged: Event[] = [
    { type: "blocks.scheduled", order: [1, 2] },
    { type: "block.exited", block: 1 },
    {
      type: "trial.outcome",
      trial: 1,
      blockCondition: "1_1",
      correct: true,
      level: 1,
      givenToEstimator: true,
      retrying: false,
      kind: "goodtest",
      estimatorReset: false,
      estimatorCount: 3,
    },
    { type: "warning.emitted", message: "m" },
    { type: "routine.entered", fn: "f" },
    { type: "telemetry.latency", what: "x", ms: 1 },
  ];
  for (const e of unchanged) {
    it(`${e.type} is a no-op`, () => {
      const s: DerivedState = { phase: "stimulus" };
      expect(applyEvent(s, e)).toBe(s);
    });
  }
});

describe("stateFromEvents — replay equals incremental fold", () => {
  it("replays a mixed sequence", () => {
    const events: Event[] = [
      {
        type: "session.started",
        experimentName: "e",
        blockCount: 1,
        conditionCount: 1,
        targetKinds: ["letter"],
        language: "en",
        seed: 1,
      },
      { type: "phase.entered", phase: "instructions" },
      {
        type: "block.entered",
        block: 1,
        nthBlock: 1,
        blockTotal: 1,
        blockCondition: "1_1",
        enabled: true,
        targetKind: "letter",
        targetTask: "identify",
      },
      {
        type: "trial.started",
        trial: 1,
        blockCondition: "1_1",
        level: 1.2,
        fixationPosPx: null,
        usingGaze: false,
      },
      { type: "response.recorded", kind: "key", value: "d", correct: true },
    ];
    let folded: DerivedState = {};
    for (const e of events) folded = applyEvent(folded, e);
    expect(stateFromEvents(events)).toEqual(folded);
    expect(stateFromEvents(events)).toMatchObject({
      phase: "instructions",
      block: 1,
      trial: 1,
      responseReceived: "d",
    });
  });
});
