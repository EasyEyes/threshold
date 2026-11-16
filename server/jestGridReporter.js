/**
 * Jest grid reporter: one cell per test FILE. Cells start pending, flip
 * green/red/skipped as files finish, and the whole status region redraws
 * in place — no per-file PASS lines, no interleaved console output while
 * a run progresses. Console entries and failure names print only for
 * failing files, below the grid, at the end of the run.
 *
 * Non-TTY runs (pipes, CI) delegate every event to jest's DefaultReporter,
 * preserving the classic output byte-for-byte.
 */

const { DefaultReporter } = require("@jest/reporters");

const ANSI = {
  up: (n) => `\u001b[${n}A`,
  eraseLine: "\u001b[2K",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  reset: "\u001b[0m",
};

const cellChar = (status, color) => {
  if (!color) {
    if (status === "pass") return ".";
    if (status === "fail") return "F";
    if (status === "skipped") return "-";
    return "·";
  }
  if (status === "pass") return ANSI.green + "█" + ANSI.reset;
  if (status === "fail") return ANSI.red + "█" + ANSI.reset;
  if (status === "skipped") return ANSI.yellow + "▩" + ANSI.reset;
  return ANSI.dim + "░" + ANSI.reset;
};

const rel = (p) => p.replace(/^.*?(tests\/|components\/)/, "$1");

/** Columns for a near-full rectangle: among the minimum row count (and
 * min+1, to buy a waste-free layout), minimize empty trailing cells,
 * preferring fewer rows then wider rows. Never a one-wide tower. */
const chooseGridColumns = (total, maxCells) => {
  if (total <= 0) return maxCells;
  const minRows = Math.max(1, Math.ceil(total / maxCells));
  let best = null;
  for (let rows = minRows; rows <= Math.min(minRows + 1, total); rows++) {
    const cols = Math.max(1, Math.ceil(total / rows));
    const waste = rows * cols - total;
    const candidate = { waste, rows, cols };
    if (
      !best ||
      waste < best.waste ||
      (waste === best.waste && rows < best.rows) ||
      (waste === best.waste && rows === best.rows && cols > best.cols)
    )
      best = candidate;
  }
  return best.cols;
};

/** Pure cell/region state machine. Slots are pre-allocated when the
 * total suite count is known, so cell positions never change. */
const createGridState = ({ color, columns = 80 }) => {
  const slots = []; // { path, status } — index = fixed cell position
  const slotOf = new Map(); // path → slot index
  const resultsByPath = new Map();
  let totalSuites = 0;
  let layoutCols = columns; // fallback while the total is unknown
  let tally = { passed: 0, failed: 0, skipped: 0 };

  const assignSlot = (path) => {
    if (slotOf.has(path)) return slotOf.get(path);
    const free = slots.findIndex((s) => s.path === null);
    const i = free >= 0 ? free : slots.length;
    if (free >= 0) slots[i] = { path, status: "pending" };
    else slots.push({ path, status: "pending" });
    slotOf.set(path, i);
    return i;
  };

  const onFileStart = (path) => assignSlot(path);

  const onFileResult = (path, result, aggregated) => {
    assignSlot(path);
    resultsByPath.set(path, result);
    if (aggregated)
      tally = {
        passed: aggregated.numPassedTests || 0,
        failed: aggregated.numFailedTests || 0,
        skipped: aggregated.numPendingTests || 0,
      };
    let status;
    if (result.numFailingTests > 0) status = "fail";
    else if (result.numPassingTests === 0 && result.numPendingTests > 0)
      status = "skipped";
    else status = "pass";
    slots[slotOf.get(path)].status = status;
  };

  const cells = () => slots.map((s) => cellChar(s.status, color));

  const regionLines = () => {
    const done = slots.filter(
      (s) => s.path !== null && resultsByPath.has(s.path),
    ).length;
    const total = Math.max(totalSuites, slots.length);
    const failed = slots.filter((s) => s.status === "fail").length;
    const red = color ? ANSI.red : "";
    const reset = color ? ANSI.reset : "";
    const header =
      `jest ${done}/${total} files · ` +
      `${tally.passed} passed` +
      (tally.failed ? ` ${red}${tally.failed} failed${reset}` : "") +
      (tally.skipped ? ` ${tally.skipped} skipped` : "") +
      (failed
        ? ` ${red}${failed} file${failed > 1 ? "s" : ""} failing${reset}`
        : "");
    const lines = [header];
    const cs = cells();
    for (let i = 0; i < cs.length; i += layoutCols)
      lines.push(cs.slice(i, i + layoutCols).join(" "));
    for (const s of slots) {
      const r = s.path !== null && resultsByPath.get(s.path);
      if (r && r.numFailingTests > 0)
        lines.push(
          (color ? ANSI.red : "") +
            `✕ ${rel(s.path)} (${r.numFailingTests}/${
              r.numFailingTests + r.numPassingTests + r.numPendingTests
            } failed)` +
            (color ? ANSI.reset : ""),
        );
    }
    return lines;
  };

  const failureDetails = () => {
    const out = [];
    for (const s of slots) {
      const r = s.path !== null && resultsByPath.get(s.path);
      const p = s.path;
      if (!r || r.numFailingTests === 0) continue;
      out.push("");
      out.push(
        (color ? ANSI.red + ANSI.bold : "") +
          `✕ ${rel(p)}` +
          (color ? ANSI.reset : ""),
      );
      for (const t of r.testResults || [])
        if (t.status === "failed") {
          out.push(`  ✕ ${t.fullName}`);
          const first = (t.failureMessages || [""])[0].split("\n")[0];
          if (first) out.push(`    ${first.trim()}`);
        }
      for (const entry of r.console || [])
        out.push(
          `  ${entry.type} ${entry.message.trim().split("\n").join("\n  ")}`,
        );
    }
    return out;
  };

  const updateTally = (aggregated) => {
    if (aggregated)
      tally = {
        passed: aggregated.numPassedTests || 0,
        failed: aggregated.numFailedTests || 0,
        skipped: aggregated.numPendingTests || 0,
      };
  };

  return {
    onFileStart,
    onFileResult,
    updateTally,
    cells,
    regionLines,
    failureDetails,
    setTotalSuites: (n) => {
      totalSuites = n;
      layoutCols = chooseGridColumns(n, columns);
      while (slots.length < n) slots.push({ path: null, status: "pending" });
    },
  };
};

/** In-place region renderer: never scrolls, grows downward only,
 * rewrites only the lines that changed. */
const createRenderer = (stdout) => {
  let prevLines = [];
  return {
    render(lines) {
      if (lines.length === 0) return;
      const sameHeight = lines.length === prevLines.length;
      const changed = lines.map((l, i) => prevLines[i] !== l);
      if (sameHeight && !changed.some(Boolean)) return; // nothing to do
      let out = "";
      // grow only an ALREADY-established region — the first paint must not
      // push blank lines ahead of itself
      if (prevLines.length > 0 && lines.length > prevLines.length)
        out += "\n".repeat(lines.length - prevLines.length);
      if (prevLines.length > 0) out += ANSI.up(prevLines.length - 1);
      lines.forEach((line, i) => {
        if (changed[i]) out += "\r" + ANSI.eraseLine + line;
        if (i < lines.length - 1) out += "\n";
      });
      stdout.write(out);
      prevLines = lines;
    },
  };
};

class GridReporter {
  constructor(globalConfig, options = {}) {
    const injected = options || {};
    this.stdout = injected.stdout || process.stdout;
    this.isTTY =
      injected.isTTY !== undefined ? injected.isTTY : !!this.stdout.isTTY;
    this.color =
      injected.color !== undefined
        ? injected.color
        : this.isTTY && !process.env.NO_COLOR;
    this.columns = Math.max(
      10,
      Math.floor(((this.stdout.columns || 80) + 1) / 2),
    ); // cell budget: mark + space pitch
    if (!this.isTTY)
      this.default =
        injected.defaultReporter || new DefaultReporter(globalConfig, options);
  }

  onRunStart(results, options) {
    if (this.default) return this.default.onRunStart(results, options);
    this.state = createGridState({ color: this.color, columns: this.columns });
    this.state.setTotalSuites(results?.numTotalTestSuites || 0);
    this.renderer = createRenderer(this.stdout);
  }

  onTestCaseResult(test, testCaseResult) {
    const d = this.default;
    if (d && typeof d.onTestCaseResult === "function")
      d.onTestCaseResult(test, testCaseResult);
  }

  onTestFileStart(test) {
    // DefaultReporter (jest 29) exposes the legacy hook names
    const d = this.default;
    if (d) {
      if (typeof d.onTestFileStart === "function") d.onTestFileStart(test);
      else if (typeof d.onTestStart === "function") d.onTestStart(test);
      return;
    }
    this.state.onFileStart(test.path);
    this.renderer.render(this.state.regionLines());
  }

  onTestFileResult(test, result, aggregatedResults) {
    const d = this.default;
    if (d) {
      if (typeof d.onTestFileResult === "function")
        d.onTestFileResult(test, result, aggregatedResults);
      else if (typeof d.onTestResult === "function")
        d.onTestResult(test, result, aggregatedResults);
      return;
    }
    this.state.onFileResult(test.path, result, aggregatedResults);
    this.renderer.render(this.state.regionLines());
  }

  onRunComplete(contexts, results) {
    if (this.default) return this.default.onRunComplete(contexts, results);
    this.state.updateTally(results);
    this.renderer.render(this.state.regionLines());
    const details = this.state.failureDetails();
    if (details.length) this.stdout.write("\n" + details.join("\n"));
    this.stdout.write("\n");
  }

  onServerError(error) {
    this.default?.onServerError?.(error);
  }

  getLastError() {
    return this.default?.getLastError?.();
  }
}

module.exports = GridReporter;
module.exports.GridReporter = GridReporter;
module.exports.createGridState = createGridState;
module.exports.createRenderer = createRenderer;
module.exports.chooseGridColumns = chooseGridColumns;
