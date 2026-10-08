/**
 * @jest-environment node
 *
 * IGNORE DISALLOWED CLICKS (card) — e2e, keyboard-only letter block:
 *
 *   responseClickedBool FALSE, responseTypedBool TRUE,
 *   markingShowCursorBool FALSE (the card's foveal-acuity configuration:
 *   the cursor must not forward-mask the target).
 *
 * Expected participant-visible behavior (the card's fix, already in the
 * runtime): instructions never offer clicking, the Proceed button is absent
 * (Return advances block instructions), the crosshair is not clickable
 * (SPACE initiates trials), and the letter palette registers no click
 * responses.
 *
 * Expected sim behavior (fixed here): the simulated participant is told the
 * truth about affordances (click affordance OFF for type-only conditions) and
 * advances keyboard-only instructions with RETURN — so the run COMPLETES with
 * every response typed.
 *
 * Table: letter-keyboard-only-sim (letter-sim + the card's parameters).
 * OFF by default; opt in with RUN_E2E=1.
 */

import { expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";
import { simE2EPort } from "./helpers/ports";
import type { EventEnvelope } from "../../../../server/diffEvents";

const RUN_E2E = process.env.RUN_E2E === "1";

const TABLE_NAME = "letter-keyboard-only-sim";
const E2E_PORT = simE2EPort("clickDisabling");
const MIXED_PORT = simE2EPort("clickDisabling", 1);

(RUN_E2E ? describe : describe.skip)(
  "IGNORE DISALLOWED CLICKS — keyboard-only letter block (responseClickedBool FALSE)",
  () => {
    test("completes with typed responses only; no click ever accepted", async () => {
      const result = await runSimTable(
        { name: TABLE_NAME },
        { port: E2E_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");
      // Non-vacuous: the block really ran its 3 trials (retries may bump the
      // counter past the total, never below it).
      expect(result.trialsTotal).toBe(3);
      expect(result.trialsCompleted).toBeGreaterThanOrEqual(3);
      expect(result.responseStrategy).toBe("typed");

      // The experiment must never register a CLICK response — the card's ask.
      const clickResponses = result.events.filter(
        (env) =>
          (env.e as { type?: string }).type === "response.recorded" &&
          (env.e as { kind?: string }).kind === "click",
      );
      expect(clickResponses).toHaveLength(0);

      // Instructions adapt: the clicking variants must never show.
      // (instructionTexts are textContent — markdown **bold** is rendered.)
      expect(
        result.instructionTexts.some((t) => t.includes("by clicking it below")),
      ).toBe(false);
      expect(
        result.instructionTexts.some((t) =>
          t.includes("click the center of the cross"),
        ),
      ).toBe(false);
      expect(
        result.instructionTexts.some((t) => t.includes("click Proceed")),
      ).toBe(false);

      // …while the keyboard-only variants do.
      expect(
        result.instructionTexts.some((t) =>
          t.includes("by pressing it in the keyboard/keypad"),
        ),
      ).toBe(true);
      expect(
        result.instructionTexts.some((t) => t.includes("press the Space bar")),
      ).toBe(true);
    }, 180_000);
  },
);

/**
 * Mixed modalities across blocks (the N>1 case): block 1 keyboard-only,
 * block 2 click+type. The gates, Proceed button, and sim affordances must
 * all track the CURRENT block — a sticky state from block 1 would leak
 * "not clickable" into block 2 (or clicks into block 1).
 */
(RUN_E2E ? describe : describe.skip)(
  "IGNORE DISALLOWED CLICKS — mixed modalities across blocks",
  () => {
    test("clicks accepted only in the click-enabled block; run completes", async () => {
      const result = await runSimTable(
        { name: "letter-mixed-modality-sim" },
        { port: MIXED_PORT, seed: 1, stuckTimeoutMs: 45_000 },
      );

      expect(result.consoleErrors).toHaveLength(0);
      expect(result.status).toBe("completed");
      expect(result.trialsTotal).toBe(3);

      const events = result.events as EventEnvelope[];
      const seqOf = (env: EventEnvelope) => env.seq;
      const blockEntered = (n: number) =>
        events.find(
          (env) =>
            (env.e as { type?: string }).type === "block.entered" &&
            (env.e as { block?: number }).block === n,
        );
      const block2 = blockEntered(2);
      expect(block2).toBeDefined();

      const clickResponses = events.filter(
        (env) =>
          (env.e as { type?: string }).type === "response.recorded" &&
          (env.e as { kind?: string }).kind === "click",
      );
      // Non-vacuous: block 2 (click-enabled) really produced click responses.
      expect(clickResponses.length).toBeGreaterThan(0);
      // …and every one of them arrived only after block 2 began.
      for (const click of clickResponses) {
        expect(seqOf(click)).toBeGreaterThan(seqOf(block2!));
      }

      // Strategy flipped across blocks: typed in block 1, clicked in block 2.
      expect(result.responseStrategy).toBe("clicked");
    }, 180_000);
  },
);
