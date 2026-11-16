/**
 * @jest-environment node
 *
 * Grid reporter: one cell per test FILE — pending (░/·) when started,
 * green/red when finished — with a static in-place redraw (no scrolling
 * while a run progresses). Console output is withheld unless a file fails.
 * Non-TTY runs delegate everything to jest's DefaultReporter.
 */

const g = require("../server/jestGridReporter.js");

const fakeStdout = () => {
  const writes: string[] = [];
  return { writes, write: (s: string) => writes.push(s) };
};

const makeResult = (over: Record<string, unknown> = {}) => ({
  testFilePath: "/repo/tests/a.test.ts",
  failureMessages: [],
  numFailingTests: 0,
  numPassingTests: 2,
  numPendingTests: 0,
  testResults: [],
  console: null,
  ...over,
});

describe("grid state", () => {
  test("cells go pending → green/red/skipped as files finish", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    state.onFileStart("/a");
    state.onFileStart("/b");
    state.onFileStart("/c");
    expect(state.cells()).toEqual(["·", "·", "·"]);
    state.onFileResult("/a", makeResult());
    state.onFileResult("/b", makeResult({ numFailingTests: 1 }));
    state.onFileResult(
      "/c",
      makeResult({ numPassingTests: 0, numPendingTests: 3 }),
    );
    expect(state.cells()).toEqual([".", "F", "-"]);
  });

  test("colored mode uses block characters and ANSI colors", () => {
    const state = g.createGridState({ color: true, columns: 10 });
    state.onFileStart("/a");
    state.onFileStart("/b");
    state.onFileStart("/c"); // never finishes → stays pending
    state.onFileResult("/a", makeResult());
    state.onFileResult("/b", makeResult({ numFailingTests: 2 }));
    const [passed, failed, pending] = state.cells();
    expect(pending).toContain("░");
    expect(passed).toContain("█");
    expect(passed).toContain("\u001b[32m"); // green
    expect(failed).toContain("\u001b[31m"); // red
  });

  test("region: header + wrapped grid + one failure line per failing file", () => {
    const state = g.createGridState({ color: false, columns: 4 });
    for (let i = 0; i < 5; i++) state.onFileStart(`/f${i}`);
    state.onFileResult("/f1", makeResult({ numFailingTests: 1 }));
    state.onFileResult("/f0", makeResult());
    state.onFileResult("/f2", makeResult());
    state.onFileResult("/f3", makeResult());
    state.onFileResult("/f4", makeResult({ testFilePath: "/f4" }));
    const lines = state.regionLines();
    expect(lines[0]).toMatch(/5\/5/); // done/total
    expect(lines[1]).toBe(". F . ."); // 4 per row, f1 red in place, spaced
    expect(lines[2]).toBe("."); // 5th cell
    expect(lines[3]).toMatch(/f1/); // failing file named
    expect(lines[3]).toMatch(/1\/3 failed/); // 1 of its 3 tests
  });

  test("skipped-only suites are counted in the header", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    state.onFileStart("/a");
    state.onFileResult(
      "/a",
      makeResult({ numPassingTests: 0, numPendingTests: 5 }),
      { numPassedTests: 0, numPendingTests: 5 },
    );
    expect(state.regionLines()[0]).toMatch(/5 skipped/);
  });

  test("header tally ticks from aggregated results", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    state.onFileStart("/a");
    state.onFileResult("/a", makeResult(), {
      numPassedTests: 2,
      numFailedTests: 0,
      numPendingTests: 0,
    });
    expect(state.regionLines()[0]).toBe("jest 1/1 files · 2 passed");
    state.onFileResult("/a", makeResult({ numFailingTests: 1 }), {
      numPassedTests: 2,
      numFailedTests: 1,
      numPendingTests: 3,
    });
    expect(state.regionLines()[0]).toBe(
      "jest 1/1 files · 2 passed 1 failed 3 skipped 1 file failing",
    );
    state.updateTally({
      numPassedTests: 9,
      numFailedTests: 1,
      numPendingTests: 3,
    });
    expect(state.regionLines()[0]).toContain("9 passed");
  });
});

describe("console withholding & failure details", () => {
  test("console entries are kept only for failing files", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    const ok = makeResult({
      console: [{ type: "warn", message: "benign noise\n" }] as any,
    });
    const bad = makeResult({
      numFailingTests: 1,
      testFilePath: "/repo/tests/bad.test.ts",
      console: [{ type: "error", message: "useful context\n" }] as any,
    });
    state.onFileResult("/repo/tests/ok.test.ts", ok);
    state.onFileResult("/repo/tests/bad.test.ts", bad);
    const details = state.failureDetails();
    expect(details.join("\n")).toContain("bad.test.ts");
    expect(details.join("")).toContain("useful context");
    expect(details.join("")).not.toContain("benign noise");
  });

  test("failure details list failing test names", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    state.onFileResult(
      "/bad",
      makeResult({
        numFailingTests: 1,
        testFilePath: "/repo/tests/bad.test.ts",
        testResults: [
          {
            fullName: "suite > breaks",
            status: "failed",
            failureMessages: ["TypeError: boom\n    at x"],
          },
        ] as any,
      }),
    );
    const text = state.failureDetails().join("\n");
    expect(text).toContain("suite > breaks");
    expect(text).toContain("TypeError: boom");
  });
});

describe("chooseGridColumns", () => {
  test("prefers a waste-free rectangle, allowing one extra row", () => {
    expect(g.chooseGridColumns(350, 60)).toBe(50); // 7×50 exact, not 6×59(4 empty)
  });

  test("primes take the minimal-waste near-full layout, never a tower", () => {
    expect(g.chooseGridColumns(377, 60)).toBe(54); // 7×54, last row 53/54
    expect(g.chooseGridColumns(307, 60)).toBe(44); // 7×44, waste 1
  });

  test("small totals fill a single row", () => {
    expect(g.chooseGridColumns(30, 60)).toBe(30);
    expect(g.chooseGridColumns(1, 60)).toBe(1);
    expect(g.chooseGridColumns(0, 60)).toBe(60); // no grid — fallback width
  });

  test("narrow terminals shrink columns, avoiding ragged rows", () => {
    expect(g.chooseGridColumns(5, 4)).toBe(3); // 2×3, not 4+1 ragged
    expect(g.chooseGridColumns(10, 4)).toBe(4); // tie on waste → wider
  });
});

describe("static grid", () => {
  test("all cells render pending from the start when the total is known", () => {
    const state = g.createGridState({ color: false, columns: 4 });
    state.setTotalSuites(5);
    const lines = state.regionLines();
    expect(lines[0]).toBe("jest 0/5 files · 0 passed");
    // 3×2 rectangle (not 4+1 ragged), one space between marks
    expect(lines[1]).toBe("· · ·");
    expect(lines[2]).toBe("· ·");
  });

  test("slots are assigned once and never move", () => {
    const state = g.createGridState({ color: false, columns: 4 });
    state.setTotalSuites(3);
    state.onFileStart("/a");
    state.onFileStart("/b");
    state.onFileResult("/b", makeResult({ numFailingTests: 1 }));
    expect(state.cells()).toEqual(["·", "F", "·"]);
    state.onFileResult("/a", makeResult());
    expect(state.cells()).toEqual([".", "F", "·"]); // same positions
  });

  test("starting a file does not add cells in fixed mode", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    state.setTotalSuites(2);
    state.onFileStart("/a");
    state.onFileStart("/b");
    expect(state.cells()).toHaveLength(2);
  });

  test("unknown total still grows (legacy fallback)", () => {
    const state = g.createGridState({ color: false, columns: 10 });
    state.onFileStart("/a");
    state.onFileStart("/b");
    expect(state.cells()).toEqual(["·", "·"]);
  });
});

describe("renderer", () => {
  test("redraws in place: no scroll, no trailing newline, height growth pads", () => {
    const out = fakeStdout();
    const r = g.createRenderer(out as any);
    r.render(["a", "b"]);
    const first = out.writes.join("");
    expect(first).not.toMatch(/\u001b\[\d+A/); // first paint needs no cursor-up
    expect(first.startsWith("\n")).toBe(false); // nor blank padding lines
    expect(first.endsWith("b")).toBe(true); // no trailing newline

    out.writes.length = 0;
    r.render(["a", "b", "c"]); // region grows by one line
    const growth = out.writes.join("");
    expect(growth.startsWith("\n")).toBe(true); // pad downward
    expect(growth).toContain("\u001b[1A"); // return to region top (was 2 lines)
    expect(growth.endsWith("c")).toBe(true);

    out.writes.length = 0;
    r.render(["x", "b", "c"]); // same height → no padding
    const same = out.writes.join("");
    expect(same.startsWith("\n")).toBe(false);
    expect(same).toContain("\u001b[2A");
    expect(same).not.toContain("\u001b[2Kb"); // unchanged lines not rewritten
    expect(same).not.toContain("\u001b[2Kc");
  });

  test("diff render: unchanged lines are skipped, not rewritten", () => {
    const out = fakeStdout();
    const r = g.createRenderer(out as any);
    r.render(["h", "row1", "row2"]);

    out.writes.length = 0;
    r.render(["h", "roW1-CHANGED", "row2"]); // only the middle line changed
    const diff = out.writes.join("");
    expect(diff).not.toContain("\u001b[2Kh\r"); // header not rewritten
    expect(diff).not.toContain("\u001b[2Krow2"); // unchanged row not rewritten
    expect(diff).toContain("\u001b[2KroW1-CHANGED");

    out.writes.length = 0;
    r.render(["h", "roW1-CHANGED", "row2"]); // nothing changed
    expect(out.writes.join("")).toBe(""); // no output at all
  });
});

describe("delegation", () => {
  test("non-TTY: events forward to the DefaultReporter instance", () => {
    const forwarded: string[] = [];
    const fakeDefault = {
      onRunStart: () => forwarded.push("start"),
      onTestFileStart: () => forwarded.push("fileStart"),
      onTestFileResult: () => forwarded.push("fileResult"),
      onRunComplete: () => forwarded.push("complete"),
    };
    const stdout = fakeStdout();
    const reporter = new g.GridReporter(
      {},
      { defaultReporter: fakeDefault, stdout, isTTY: false },
    );
    reporter.onRunStart!({ numTotalTestSuites: 1 } as any, {} as any);
    reporter.onTestFileStart!({ path: "/a" } as any);
    reporter.onTestFileResult!(
      { path: "/a" } as any,
      makeResult() as any,
      {} as any,
    );
    reporter.onRunComplete!(new Set(), {} as any);
    expect(forwarded).toEqual(["start", "fileStart", "fileResult", "complete"]);
    expect(stdout.writes.join("")).toBe(""); // nothing of its own
  });

  test("TTY: renders, does not forward", () => {
    const forwarded: string[] = [];
    const fakeDefault = { onTestFileResult: () => forwarded.push("x") };
    const stdout = fakeStdout();
    const reporter = new g.GridReporter(
      {},
      { defaultReporter: fakeDefault, stdout, isTTY: true, color: false },
    );
    reporter.onRunStart!({ numTotalTestSuites: 1 } as any, {} as any);
    reporter.onTestFileStart!({ path: "/a" } as any);
    reporter.onTestFileResult!(
      { path: "/a" } as any,
      makeResult() as any,
      {} as any,
    );
    expect(forwarded).toEqual([]);
    expect(stdout.writes.join("")).toContain(".");
  });
});
