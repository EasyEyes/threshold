import {
  compileTimingRows,
  endCompileTiming,
  markCompilePhase,
  startCompileTiming,
} from "../preprocess/compileTiming";
import {
  COMPILE_ENDED_PHASE,
  beginCompile,
  endCompile,
  onCompilePhase,
  optimizationOn,
} from "../preprocess/compileMode";

beforeEach(() => {
  endCompileTiming();
  beginCompile("studio");
});
afterEach(() => endCompile());

describe("compileTiming", () => {
  // Timing is currently enabled for both paths (COMPILE_OPTIMIZATIONS_FOR.timing
  // === "all") so classic and Studio compiles can be compared like for like.
  it("also times a classic (Compiler tab) compile", () => {
    beginCompile("compiler");
    startCompileTiming("experiment-compilation");
    expect(markCompilePhase("input-accepted")).not.toBeNull();
    expect(compileTimingRows().map((r) => r.phase)).toEqual(["input-accepted"]);
  });

  it("starts a fresh timeline when a classic compile follows a Studio compile", () => {
    startCompileTiming("experiment-compilation");
    markCompilePhase("input-accepted");
    markCompilePhase("glossary-ready");
    beginCompile("compiler");
    startCompileTiming("experiment-compilation");
    expect(compileTimingRows()).toEqual([]);
    markCompilePhase("input-accepted");
    expect(compileTimingRows().map((r) => r.phase)).toEqual(["input-accepted"]);
  });

  it("records phases relative to the start of a compile", () => {
    startCompileTiming("experiment-compilation");
    expect(markCompilePhase("input-accepted")).toBeGreaterThanOrEqual(0);
    expect(markCompilePhase("preprocessing-completed")).toBeGreaterThanOrEqual(
      0,
    );
    const rows = compileTimingRows();
    expect(rows.map((r) => r.phase)).toEqual([
      "input-accepted",
      "preprocessing-completed",
    ]);
    expect(rows[1].total_ms).toBeGreaterThanOrEqual(rows[0].total_ms);
    expect(rows[1].step_ms).toBe(rows[1].total_ms - rows[0].total_ms);
  });

  it("is a no-op when nothing is being timed", () => {
    expect(markCompilePhase("activation-requested")).toBeNull();
    expect(compileTimingRows()).toEqual([]);
  });

  it("ignores operations that are not compiles", () => {
    startCompileTiming("experiment-retrieval");
    expect(markCompilePhase("repository-tree-requested")).toBeNull();
  });

  it("lets an upload continue the compile's timeline", () => {
    startCompileTiming("experiment-compilation");
    markCompilePhase("preprocessing-completed");
    startCompileTiming("pavlovia-upload");
    markCompilePhase("upload-completed");
    expect(compileTimingRows().map((r) => r.phase)).toEqual([
      "preprocessing-completed",
      "upload-completed",
    ]);
  });

  it("starts a fresh timeline for a standalone upload", () => {
    startCompileTiming("pavlovia-upload");
    markCompilePhase("upload-completed");
    expect(compileTimingRows().map((r) => r.phase)).toEqual([
      "upload-completed",
    ]);
  });
});

// The Studio's progress view follows a compile through these listeners
// (compileMode.onCompilePhase); every recorded phase must reach them.
describe("compile-phase listeners", () => {
  it("deliver every phase, timed or not, and compile-ended on endCompile", () => {
    const seen: string[] = [];
    const off = onCompilePhase((phase) => seen.push(phase));
    // Not timed (no timeline started): still delivered.
    expect(markCompilePhase("input-accepted")).toBeNull();
    startCompileTiming("experiment-compilation");
    markCompilePhase("preprocessing-completed");
    endCompile();
    off();
    expect(seen).toEqual([
      "input-accepted",
      "preprocessing-completed",
      COMPILE_ENDED_PHASE,
    ]);
  });

  it("stop after unsubscribing", () => {
    const seen: string[] = [];
    const off = onCompilePhase((phase) => seen.push(phase));
    off();
    markCompilePhase("input-accepted");
    expect(seen).toEqual([]);
  });

  it("drop a throwing listener without affecting the compile or other listeners", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const seen: string[] = [];
    const offBad = onCompilePhase(() => {
      throw new Error("boom");
    });
    const offGood = onCompilePhase((phase) => seen.push(phase));
    expect(() => markCompilePhase("input-accepted")).not.toThrow();
    markCompilePhase("glossary-ready");
    offBad();
    offGood();
    expect(seen).toEqual(["input-accepted", "glossary-ready"]);
    // The bad listener was reported once and then dropped.
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("the single progress view is a Studio-only optimization", () => {
    beginCompile("compiler");
    expect(optimizationOn("singleProgressUi")).toBe(false);
    beginCompile("studio");
    expect(optimizationOn("singleProgressUi")).toBe(true);
  });
});
