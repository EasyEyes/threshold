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

describe("dialogs counter (re-arm dedupe for consecutive same-title dialogs)", () => {
  test("every Swal.fire bumps data-dialogs, even with identical titles", async () => {
    const { installDialogReporter } = await import(
      "../../../components/dialogInstrumentation"
    );
    const Swal = (await import("sweetalert2")).default;
    installDialogReporter();

    // Don't await: the modal stays open (no participant to dismiss it).
    void Swal.fire({ title: "First question" });
    expect(readAttr("data-dialog-open")).toBe("Swal: First question");
    expect(readAttr("data-dialogs")).toBe("1");

    void Swal.fire({ title: "" });
    expect(readAttr("data-dialog-open")).toBe("Swal: ");
    expect(readAttr("data-dialogs")).toBe("2");
  });
});
