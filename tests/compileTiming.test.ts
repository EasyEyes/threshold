import {
  compileTimingRows,
  endCompileTiming,
  markCompilePhase,
  startCompileTiming,
} from "../preprocess/compileTiming";
import { beginCompile, endCompile } from "../preprocess/compileMode";

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
