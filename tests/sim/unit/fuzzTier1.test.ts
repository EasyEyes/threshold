import { describe, test, expect } from "@jest/globals";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import {
  compileOne,
  initCompiler,
  loadSpecFromCache,
} from "../../../server/fuzz/tier1";

const REPO = resolve(__dirname, "../../..");
const EXAMPLES = join(REPO, "examples");
const CACHE = join(EXAMPLES, ".cache", "glossary.json");

// Tier 1 drives the real compiler against the real glossary cache; skip
// cleanly when the environment cannot provide them.
const describeIfCache = existsSync(CACHE) ? describe : describe.skip;

describeIfCache("fuzz tier1 (compiler driver)", () => {
  test("loads a spec from the cache and initializes the compiler", () => {
    const spec = loadSpecFromCache(EXAMPLES);
    expect(spec.version).toMatch(/^\d+\.\d+$/);
    expect(spec.params.length).toBeGreaterThan(100);
    expect(() => initCompiler(EXAMPLES)).not.toThrow();
  });

  test("a known-good table is accepted", async () => {
    initCompiler(EXAMPLES);
    const out = await compileOne(
      join(EXAMPLES, "tables", "letter-sim.csv"),
      EXAMPLES,
    );
    expect(out.outcome).toBe("accepted");
  });

  test("a bogus param makes the compiler reject (not crash)", async () => {
    initCompiler(EXAMPLES);
    const dir = mkdtempSync(join(tmpdir(), "fuzz-tier1-"));
    const table = join(dir, "bogus.csv");
    const base = readFileSync(
      join(EXAMPLES, "tables", "letter-sim.csv"),
      "utf-8",
    );
    writeFileSync(table, `${base}\n_fuzzBogusParam123,,x\n`);
    try {
      const out = await compileOne(table, EXAMPLES);
      expect(out.outcome).toBe("rejected");
      expect(out.errors.length).toBeGreaterThan(0);
      expect(out.errors[0]).toMatch(/fuzzbogus|bogus|invalid|unknown/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
