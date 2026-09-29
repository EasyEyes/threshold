/**
 * @jest-environment node
 *
 * Camera-failure e2e matrix — replicates the field failure class from
 * Acuity24FontsAddSloan3 (2026-09-25): 12 sessions stranded at the Choose
 * Camera page (participant:tabClosed:compatChooseCamera), Prolific feedback
 * "Kept saying my camera wasn't there. it was." The compatibility camera
 * step had ZERO e2e coverage before this file (no sim table set
 * calibrateDistanceBool), because headless Chromium has no camera.
 *
 * Runs the REAL experiment (real RC from the CDN, real compatibilityFlow,
 * real threshold.js) against `tests/sim/assets/camera-compat-sim.csv`
 * (letter identification + calibrateDistanceBool TRUE → the chooser runs),
 * with navigator.mediaDevices stubbed per scenario by
 * simulatedParticipant's installCameraStub
 * (__SIM_OPTIONS__.cameraScenario — see there for the scenario catalog).
 *
 * DESIRED behavior under test (the invariant, per Denis's review): a camera
 * failure must never strand the participant in a state that cannot
 * succeed — within the stuck budget the run must either proceed (a usable
 * camera was found) or terminate with an EXPLAINED cause that reaches the
 * results (ending screen / error code), never an endless retry loop or an
 * unexplained freeze.
 *
 * OFF by default under `npm test`. Opt in with: RUN_E2E=1 npm test
 */

import { jest, expect, describe, test } from "@jest/globals";
import { runSimTable } from "./helpers/runSimTable";

const RUN_E2E = process.env.RUN_E2E === "1";
const TABLE = "camera-compat-sim";
const PORT_BASE = 5730; // unique per test file

const itE2E = RUN_E2E ? test : test.skip;

// Field-failure scenarios. Stuck budget is generous (RC probing + model
// load are real work even on the happy path) but finite — the field
// participants waited minutes; 90 s of headless time is a strict bound.
const STUCK_MS = 90_000;

describe("e2e: compatibility camera step — failure scenarios", () => {
  itE2E(
    "control: working built-in camera completes the experiment",
    async () => {
      const result = await runSimTable(
        { name: TABLE },
        {
          port: PORT_BASE,
          stuckTimeoutMs: STUCK_MS,
          simOptions: { cameraScenario: "builtInOnly" },
        },
      );
      // The chooser's tiles must appear and be clickable, the panel's
      // debug-skip handles calibration, and the experiment completes.
      expect(result.status).toBe("completed");
    },
    STUCK_MS + 120_000,
  );

  itE2E(
    "external-only camera (working!) must not strand the participant [field: 12 sessions]",
    async () => {
      const result = await runSimTable(
        { name: TABLE },
        {
          port: PORT_BASE + 1,
          stuckTimeoutMs: STUCK_MS,
          simOptions: { cameraScenario: "externalOnly" },
        },
      );
      // Either the chooser accepts the (tagged) external camera and the run
      // completes, or the run ends with an EXPLAINED termination (which also
      // downloads a CSV → status "completed"). Stuck → "incomplete" + a
      // "Stuck screen" warning naming the on-screen popup: the field bug.
      expect(result.status).toBe("completed");
      expect(result.warnings.join(" ")).not.toMatch(/Stuck screen/);
    },
    STUCK_MS + 120_000,
  );

  itE2E(
    "no camera device (NotFoundError) must produce an explained exit, not a loop",
    async () => {
      const result = await runSimTable(
        { name: TABLE },
        {
          port: PORT_BASE + 2,
          stuckTimeoutMs: STUCK_MS,
          simOptions: { cameraScenario: "noDevices" },
        },
      );
      expect(result.status).toBe("completed");
      expect(result.warnings.join(" ")).not.toMatch(/Stuck screen/);
    },
    STUCK_MS + 120_000,
  );

  itE2E(
    "camera permission denied must produce an explained exit",
    async () => {
      const result = await runSimTable(
        { name: TABLE },
        {
          port: PORT_BASE + 3,
          stuckTimeoutMs: STUCK_MS,
          simOptions: { cameraScenario: "permissionDenied" },
        },
      );
      expect(result.status).toBe("completed");
      expect(result.warnings.join(" ")).not.toMatch(/Stuck screen/);
    },
    STUCK_MS + 120_000,
  );

  itE2E(
    "getUserMedia never settling (camera held by another app) must not freeze silently",
    async () => {
      const result = await runSimTable(
        { name: TABLE },
        {
          port: PORT_BASE + 4,
          // A wedged camera surfaces slowly: RC's getUserMediaResilient
          // times out at 15 s × 3 attempts (~46 s) per retry, so the
          // participant journey (error popup → Try again → popup → OK)
          // spans two of those. The budget must outlive the journey, or
          // the run is declared stuck before the exit can be reached.
          stuckTimeoutMs: 180_000,
          simOptions: { cameraScenario: "getUserMediaHangs" },
        },
      );
      expect(result.status).toBe("completed");
      expect(result.warnings.join(" ")).not.toMatch(/Stuck screen/);
    },
    180_000 + 120_000,
  );
});
