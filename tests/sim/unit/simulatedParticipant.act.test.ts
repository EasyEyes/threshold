/**
 * @jest-environment jsdom
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

// jsdom lacks structuredClone (Node ≥17 global). Polyfill for the rc
// debugger-default branch which uses it.
if (typeof (globalThis as any).structuredClone !== "function") {
  (globalThis as any).structuredClone = <T>(v: T): T =>
    JSON.parse(JSON.stringify(v));
}

// Mock the psychojs + paramReader imports so the module loads cleanly.
jest.mock("../../../psychojs/src/core/MinimalStim.js", () => ({
  MinimalStim: class FakeMinimalStim {},
}));
jest.mock("../../../parameters/paramReader.js", () => ({
  ParamReader: class FakeParamReader {},
}));

import { act, buildKey } from "../../../components/simulatedParticipant";
import type { BrowserEEState } from "../../../components/simulatedParticipant";

const rng = Math.random;

describe("buildKey — polling loop dedup key", () => {
  test("always includes dialogOpen segment (null → empty)", () => {
    expect(buildKey("compatibility", null, null)).toBe("compatibility:null:");
  });

  test("dialogOpen non-null: appends to key", () => {
    expect(buildKey("fixation", "1", "Swal: question")).toBe(
      "fixation:1:Swal: question",
    );
  });

  test("BUG REGRESSION: old-style currentKey (no dialogOpen) would mismatch dedup key", () => {
    // Before the fix, currentKey (line 376) was `${phase}:${trial}`
    // but the dedup key (line 366) was `${phase}:${trial}:${dialogOpen ?? ""}`.
    // When dialogOpen=null, these never matched → act() never ran.
    const oldStyleCurrentKey = "compatibility:null"; // pre-fix line 376
    const dedupKey = buildKey("compatibility", null, null);
    expect(dedupKey).not.toBe(oldStyleCurrentKey);
  });

  test("buildKey is deterministic: same args → same key", () => {
    const k1 = buildKey("reading", "5", "Swal: text");
    const k2 = buildKey("reading", "5", "Swal: text");
    expect(k1).toBe(k2);
  });
});

function state(over: Partial<BrowserEEState>): BrowserEEState {
  return {
    phase: null,
    trial: null,
    trialTotal: null,
    block: null,
    responseTyped: false,
    validCharsTyped: "",
    responseClicked: false,
    validCharsClicked: "",
    keypadUrl: null,
    dialogOpen: null,
    correctResponse: null,
    simulationModel: null,
    trialLevel: null,
    simulationThreshold: null,
    simulationBeta: null,
    simulationDelta: null,
    thresholdProportionCorrect: null,
    error: null,
    ...over,
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("act — phase: compatibility", () => {
  test("clicks #procced-btn when present", () => {
    const btn = document.createElement("button");
    btn.id = "procced-btn";
    document.body.appendChild(btn);
    const spy = jest.spyOn(btn, "click");
    act(state({ phase: "compatibility" }), rng, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("no-op when #procced-btn absent (no throw)", () => {
    expect(() =>
      act(state({ phase: "compatibility" }), rng, () => {}),
    ).not.toThrow();
  });
});

describe("act — phase: consent", () => {
  test("clicks #form-yes when present", () => {
    const btn = document.createElement("input");
    btn.id = "form-yes";
    btn.type = "radio";
    document.body.appendChild(btn);
    const spy = jest.spyOn(btn, "click");
    act(state({ phase: "consent" }), rng, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("act — phase: calibration", () => {
  test("clicks .rc-panel-debug-control-next when present (preferred path)", () => {
    const simBtn = document.createElement("button");
    simBtn.className = "rc-panel-debug-control-next";
    document.body.appendChild(simBtn);
    const spy = jest.spyOn(simBtn, "click");
    act(state({ phase: "calibration" }), rng, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("falls back to continue/proceed/done button when no sim button", () => {
    delete (window as any).RemoteCalibrator;
    const btn = document.createElement("button");
    btn.id = "continue-btn";
    document.body.appendChild(btn);
    const spy = jest.spyOn(btn, "click");
    act(state({ phase: "calibration" }), rng, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("falls back to Enter key when no button exists", () => {
    delete (window as any).RemoteCalibrator;
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    act(state({ phase: "calibration" }), rng, () => {});
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("Enter");
  });
});

describe("act — phase: instructions", () => {
  test("clicks #threshold-proceed-button when present, does NOT dispatch Space (prevents key-bleed into trial)", () => {
    const btn = document.createElement("button");
    btn.id = "threshold-proceed-button";
    document.body.appendChild(btn);
    const clickSpy = jest.spyOn(btn, "click");
    const instrSpy = jest.fn();
    const keyEvents: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => keyEvents.push(e));
    act(state({ phase: "instructions" }), rng, instrSpy);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(instrSpy).toHaveBeenCalledTimes(1);
    // Space must NOT be dispatched when a proceed button is found — the
    // extra space would bleed into the trial instruction routine
    // (threshold.js:6530 getKeys keyList:["space"]) and skip fixation.
    expect(keyEvents).toHaveLength(0);
  });

  test("dispatches Space when no proceed button exists (reading blocks)", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    act(state({ phase: "instructions" }), rng, () => {});
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("Space");
  });

  test("clicks the title-page Proceed button when the title page is up", () => {
    // The title page (per _showTitlePage, default \"title\") publishes the
    // INSTRUCTIONS phase so the sim advances it, but its Proceed button is
    // DOM-only — a synthetic Space keydown on window never activates it.
    // The sim must click it directly or the experiment stalls at boot.
    const container = document.createElement("div");
    container.id = "easyeyes-title-page";
    const btn = document.createElement("button");
    btn.id = "easyeyes-title-page-proceed-button";
    container.appendChild(btn);
    document.body.appendChild(container);
    const clickSpy = jest.spyOn(btn, "click");
    const keyEvents: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => keyEvents.push(e));
    act(state({ phase: "instructions" }), rng, () => {});
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(keyEvents).toHaveLength(0);
  });

  test("does NOT click an orphaned title-page button (container already removed)", () => {
    // Anti-hijack guard: a stray title-page button WITHOUT its container
    // (e.g. left over after the title page was dismissed) must not steal
    // the dispatch from the real block-instructions flow.
    const stray = document.createElement("button");
    stray.id = "easyeyes-title-page-proceed-button";
    document.body.appendChild(stray);
    const straySpy = jest.spyOn(stray, "click");
    // No #easyeyes-title-page container and no #threshold-proceed-button
    // in DOM → sim falls through to Space.
    const keyEvents: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => keyEvents.push(e));
    act(state({ phase: "instructions" }), rng, () => {});
    expect(straySpy).not.toHaveBeenCalled();
    expect(keyEvents).toHaveLength(1);
    expect(keyEvents[0].code).toBe("Space");
  });
});

describe("act — phase: fixation / reading", () => {
  test("fixation: dispatches Space", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    act(state({ phase: "fixation" }), rng, () => {});
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("Space");
  });

  test("reading: dispatches Space when no answer options", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    act(state({ phase: "reading" }), rng, () => {});
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("Space");
  });
});

describe("act — phase: response", () => {
  test("responseClicked=true: clicks the selected .characterSet element", () => {
    const holder = document.createElement("div");
    holder.id = "characterSet-holder";
    const c0 = document.createElement("div");
    c0.className = "characterSet";
    c0.textContent = "A";
    const c1 = document.createElement("div");
    c1.className = "characterSet";
    c1.textContent = "B";
    holder.append(c0, c1);
    document.body.appendChild(holder);
    const spy = jest.spyOn(c0, "click");
    // Seed rng=0 should land on index 0 deterministically; either index is
    // acceptable, but we assert a click on a characterSet element occurred.
    act(
      state({
        phase: "response",
        responseClicked: true,
        validCharsClicked: "AB",
        correctResponse: "A",
      }),
      rng,
      () => {},
    );
    // At least one of the two elements was clicked.
    expect(
      spy.mock.calls.length + jest.spyOn(c1, "click").mock.calls.length,
    ).toBeGreaterThan(0);
  });

  test("responseTyped=true with validCharsTyped: dispatches a key", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    act(
      state({
        phase: "response",
        responseTyped: true,
        validCharsTyped: "XYZ",
      }),
      rng,
      () => {},
    );
    expect(events).toHaveLength(1);
    expect(events[0].key.length).toBe(1);
  });

  test("neither responseTyped nor responseClicked: no-op (no throw)", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    expect(() =>
      act(
        state({
          phase: "response",
          responseTyped: false,
          responseClicked: false,
        }),
        rng,
        () => {},
      ),
    ).not.toThrow();
    expect(events).toHaveLength(0);
  });
});

describe("act — phase: debrief", () => {
  test("clicks .swal2-confirm when present", () => {
    const btn = document.createElement("button");
    btn.className = "swal2-confirm";
    document.body.appendChild(btn);
    const spy = jest.spyOn(btn, "click");
    act(state({ phase: "debrief" }), rng, () => {});
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("no-op when no confirm button present (no throw)", () => {
    expect(() => act(state({ phase: "debrief" }), rng, () => {})).not.toThrow();
  });
});

describe("act — phase: complete", () => {
  test("no-op (no throw, no DOM mutation)", () => {
    document.body.innerHTML = "<div id='sentinel'>x</div>";
    act(state({ phase: "complete" }), rng, () => {});
    expect(document.getElementById("sentinel")).not.toBeNull();
  });
});

describe("act — Q&A dialog (SweetAlert2)", () => {
  test("radio dialog: checks a random option", () => {
    // SweetAlert2 radio structure
    const container = document.createElement("div");
    container.className = "swal2-radio";
    for (let i = 0; i < 3; i++) {
      const input = document.createElement("input");
      input.type = "radio";
      input.value = `opt${i}`;
      container.appendChild(input);
    }
    document.body.appendChild(container);

    act(
      state({ phase: "fixation", dialogOpen: "Swal: pick one" }),
      rng,
      () => {},
    );

    const checked = Array.from(
      container.querySelectorAll<HTMLInputElement>("input"),
    ).filter((el) => el.checked);
    expect(checked).toHaveLength(1);
  });

  test("textarea dialog: types text and clicks confirm", () => {
    const textarea = document.createElement("textarea");
    textarea.className = "swal2-textarea";
    document.body.appendChild(textarea);

    const confirm = document.createElement("button");
    confirm.className = "swal2-confirm";
    document.body.appendChild(confirm);
    const clickSpy = jest.spyOn(confirm, "click");

    act(
      state({ phase: "fixation", dialogOpen: "Swal: free-form" }),
      rng,
      () => {},
    );

    expect(textarea.value.length).toBeGreaterThan(0);
    expect(clickSpy).toHaveBeenCalled();
  });

  test("dialog open but no Q&A elements: falls through to phase handler", () => {
    // Only a confirm button (no radio, no textarea) — e.g. a non-Q&A Swal
    const confirm = document.createElement("button");
    confirm.className = "swal2-confirm";
    document.body.appendChild(confirm);
    const clickSpy = jest.spyOn(confirm, "click");

    // Phase debrief should handle this, not the dialog handler
    act(
      state({ phase: "debrief", dialogOpen: "Swal: debrief" }),
      rng,
      () => {},
    );

    expect(clickSpy).toHaveBeenCalled();
  });

  test("no dialog: phase handler runs normally", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    act(state({ phase: "fixation", dialogOpen: null }), rng, () => {});
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe("Space");
  });
});

describe("act — error gate", () => {
  test("returns early without dispatching when state.error is set", () => {
    const events: KeyboardEvent[] = [];
    window.addEventListener("keydown", (e) => events.push(e));
    const instrSpy = jest.fn();
    act(state({ phase: "fixation", error: "Something broke" }), rng, instrSpy);
    // No events should be dispatched
    expect(events).toHaveLength(0);
    expect(instrSpy).not.toHaveBeenCalled();
  });

  test("does not interact with DOM when error is set", () => {
    const btn = document.createElement("button");
    btn.id = "procced-btn";
    document.body.appendChild(btn);
    const spy = jest.spyOn(btn, "click");
    act(state({ phase: "compatibility", error: "crash" }), rng, () => {});
    expect(spy).not.toHaveBeenCalled();
  });

  test("does not crash or dispatch when error during response phase", () => {
    const instrSpy = jest.fn();
    expect(() =>
      act(state({ phase: "response", error: "render failure" }), rng, instrSpy),
    ).not.toThrow();
    expect(instrSpy).not.toHaveBeenCalled();
  });
});
