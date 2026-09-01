import { describe, test, expect } from "@jest/globals";
import { spawnSync } from "child_process";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const REPO = resolve(__dirname, "../../..");
const RUN_E2E = process.env.RUN_E2E === "1";

/**
 * Fuzzer smoke: one full runtime-tier invocation of the real CLI. Proves the
 * generate → compile-filter → build → simulate ×2 → oracles → ledger pipeline
 * runs end-to-end and cleans its fuzz-TMP artifacts. RUN_E2E-gated (browser +
 * build pipeline, ~3–4 min).
 */
(RUN_E2E ? describe : describe.skip)("fuzz CLI smoke (runtime tier)", () => {
  test("runtime batch runs, records to ledger, cleans up, exits 0/1", () => {
    const ledgerPath = join(REPO, "fuzz", "ledger.jsonl");
    const before = existsSync(ledgerPath)
      ? readFileSync(ledgerPath, "utf-8")
          .split("\n")
          .filter((l) => l.trim() !== "").length
      : 0;

    const res = spawnSync(
      "npm",
      [
        "run",
        "fuzz",
        "--",
        "runtime",
        "-n",
        "1",
        "--seed=4242",
        "--no-minimize",
      ],
      { cwd: REPO, encoding: "utf8", timeout: 420_000 },
    );

    const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    // Environment errors (missing cache etc.) must not happen here.
    expect(res.status).not.toBe(2);
    expect(out).toContain("tier=runtime");

    // Ledger grew by at least the generated-table records.
    const after = readFileSync(ledgerPath, "utf-8")
      .split("\n")
      .filter((l) => l.trim() !== "").length;
    expect(after).toBeGreaterThan(before);

    // No fuzz-TMP artifacts may remain in examples/.
    const tables = spawnSync("ls", [join(REPO, "examples", "tables")], {
      encoding: "utf8",
    });
    expect(
      tables.stdout?.split("\n").filter((f) => f.startsWith("fuzz-TMP-")),
    ).toEqual([]);
    const generated = join(REPO, "examples", "generated");
    if (existsSync(generated)) {
      const dirs = spawnSync("ls", [generated], { encoding: "utf8" });
      expect(
        dirs.stdout?.split("\n").filter((f) => f.startsWith("fuzz-TMP-")),
      ).toEqual([]);
    }

    // Ensure the corpus/streams dirs exist even on a finding-heavy batch.
    mkdirSync(join(REPO, "fuzz"), { recursive: true });
  }, 420_000);
});
