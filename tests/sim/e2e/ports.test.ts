/**
 * @jest-environment node
 *
 * Invariants of the sim-e2e dev-server port registry
 * (tests/sim/e2e/helpers/ports.ts).
 *
 * Jest runs e2e suites in parallel worker processes, so ports cannot be
 * negotiated at runtime across suites: they must be laid out statically and
 * disjointly. These tests pin the three failure modes that historically
 * caused full-run flakes:
 *
 *   1. two suites binding the same port (dev-server race / ECONNREFUSED),
 *   2. a suite reaching past its block into the next suite's ports,
 *   3. a suite hard-coding its own port literal instead of the registry
 *      (which is how the collisions crept in).
 *
 * Also pins that the layout stays clear of the 5500-5597 zone: 5500 is the
 * `npm start` dev-server default (orphaned servers squat it — see
 * notes/orphaned-dev-servers-port-5500.md) and server/simulate.ts's own
 * fallback port.
 */
import * as fs from "fs";
import * as path from "path";

import {
  simE2EPort,
  SIM_E2E_PORT_BASES,
  SIM_E2E_PORT_NEEDS,
} from "./helpers/ports";

const E2E_DIR = __dirname;

describe("sim e2e port registry", () => {
  test("every suite's ports avoid the 5500 dev-server zone and stay under 6000", () => {
    for (const [suite, base] of Object.entries(SIM_E2E_PORT_BASES)) {
      const last =
        base + SIM_E2E_PORT_NEEDS[suite as keyof typeof SIM_E2E_PORT_NEEDS] - 1;
      expect(base).toBeGreaterThanOrEqual(5598);
      expect(last).toBeLessThan(6000);
    }
  });

  test("blocks are disjoint across suites", () => {
    const owner: Record<number, string> = {};
    const collisions: string[] = [];
    for (const [suite, base] of Object.entries(SIM_E2E_PORT_BASES)) {
      const size = SIM_E2E_PORT_NEEDS[suite as keyof typeof SIM_E2E_PORT_NEEDS];
      for (let p = base; p < base + size; p++) {
        if (owner[p] !== undefined)
          collisions.push(`port ${p}: ${owner[p]} and ${suite}`);
        owner[p] = suite;
      }
    }
    expect(collisions).toEqual([]);
  });

  test("offsets past a suite's declared block throw instead of borrowing", () => {
    const suite = "smoke" as keyof typeof SIM_E2E_PORT_NEEDS; // need: 1
    expect(() => simE2EPort(suite, SIM_E2E_PORT_NEEDS[suite])).toThrow(/block/);
    expect(() => simE2EPort(suite, -1)).toThrow(/block/);
    expect(simE2EPort(suite, 0)).toBe(SIM_E2E_PORT_BASES[suite]);
  });

  test("e2e test files declare no raw port literals (registry only)", () => {
    const files = fs
      .readdirSync(E2E_DIR)
      .filter((f) => f.endsWith(".e2e.test.ts"));
    expect(files.length).toBeGreaterThan(10); // the scan must not silently match nothing
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(E2E_DIR, f), "utf8");
      // Port-shaped declarations: `= 5602`, `port: 5602`, `port = 5602`.
      // (Comments listing old port maps are rewritten along with the code.)
      const lineNo = { n: 0 };
      for (const line of src.split("\n")) {
        lineNo.n++;
        if (/=\s*5\d{3}\b/.test(line) || /port\s*[:=]\s*5\d{3}\b/i.test(line)) {
          offenders.push(`${f}:${lineNo.n}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
