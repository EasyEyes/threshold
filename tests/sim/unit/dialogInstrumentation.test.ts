/**
 * @jest-environment jsdom
 *
 * Gap 7: Dialog/modal state should be published to #ee-state.
 *
 * 17+ Swal.fire calls, jQuery UI dialogs, and debrief overlays can block
 * simulated participant clicks. Without dialogOpen, the observer can't tell
 * whether a dispatched click landed on a modal or the intended target.
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

describe("dialogOpen (Gap 7)", () => {
  test("publishes Swal dialog open event", () => {
    setEEState({ dialogOpen: "Swal: Need internet-connected phone" });
    expect(readAttr("data-dialog-open")).toBe(
      "Swal: Need internet-connected phone",
    );
  });

  test("publishes dialog close (empty string)", () => {
    setEEState({ dialogOpen: "Swal: Test" });
    expect(readAttr("data-dialog-open")).toBe("Swal: Test");
    setEEState({ dialogOpen: "" });
    expect(readAttr("data-dialog-open")).toBe("");
  });

  test("dialogOpen absent when not set", () => {
    setEEState({ phase: "response" });
    expect(readAttr("data-dialog-open")).toBeNull();
  });

  test("dialogOpen overrides previous", () => {
    setEEState({ dialogOpen: "Swal: First" });
    setEEState({ dialogOpen: "Swal: Second" });
    expect(readAttr("data-dialog-open")).toBe("Swal: Second");
  });
});
