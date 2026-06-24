/**
 * @jest-environment jsdom
 *
 * Gap 3: Condition-level transitions should be published to #ee-state.
 *
 * importConditions (threshold.js) sets status.block_condition for each trial.
 * Without conditionState, automated observers can't distinguish:
 *   - "condition just entered" vs "same condition, next trial"
 *   - "disabled condition skipped" vs "condition with 0 trials"
 * This blocks debugging of Bug 2 (conditionEnabledBool) and Bug 3 (showConditionNameBool).
 */

import { jest, expect, describe, test, beforeEach } from "@jest/globals";

import {
  setEEState,
  activateSimulation,
} from "../../../components/simulatedState";

function readAttr(name: string): string | null {
  const el = document.getElementById("ee-state");
  return el?.getAttribute(name) ?? null;
}

beforeEach(() => {
  document.body.innerHTML = "";
  activateSimulation();
});

describe("conditionState (Gap 3)", () => {
  test('publishes conditionState="begin" with blockCondition', () => {
    setEEState({
      conditionState: "begin",
      blockCondition: "1_2",
      conditionEnabled: true,
    });
    expect(readAttr("data-condition-state")).toBe("begin");
    expect(readAttr("data-block-condition")).toBe("1_2");
    expect(readAttr("data-condition-enabled")).toBe("true");
  });

  test('publishes conditionState="skip-disabled"', () => {
    setEEState({
      conditionState: "skip-disabled",
      blockCondition: "1_3",
      conditionEnabled: false,
    });
    expect(readAttr("data-condition-state")).toBe("skip-disabled");
    expect(readAttr("data-condition-enabled")).toBe("false");
  });

  test('publishes conditionState="end"', () => {
    setEEState({ conditionState: "end" });
    expect(readAttr("data-condition-state")).toBe("end");
  });

  test("conditionState absent when not set", () => {
    setEEState({ phase: "trial" });
    expect(readAttr("data-condition-state")).toBeNull();
  });

  test("conditionState overrides previous", () => {
    setEEState({ conditionState: "begin", blockCondition: "1_1" });
    expect(readAttr("data-condition-state")).toBe("begin");
    setEEState({ conditionState: "end" });
    expect(readAttr("data-condition-state")).toBe("end");
  });
});
