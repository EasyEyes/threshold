/**
 * Helpers for dev-mode `--simulate` injection.
 *
 * When the experimenter passes `--simulate` to `npm run examples`, every
 * experiment table gets a `simulateParticipantBool=TRUE` row appended — but
 * ONLY if the parameter is not already present. This lets agents / CI run any
 * example table through the simulator without hand-editing each CSV.
 *
 * Compiled/production experiments are unaffected (this code only runs at
 * buildExamples time, not at runtime).
 */

/** True iff `--simulate` appears anywhere in argv. */
export function parseSimulateFlag(argv: string[]): boolean {
  return argv.includes("--simulate");
}

/** A row is the `block` header iff its first cell equals "block". */
function isBlockRow(row: unknown[]): boolean {
  return String(row[0] ?? "").trim() === "block";
}

/**
 * Count how many condition columns a parsed table has.
 * Determined by the number of cells after the first two in the `block` row.
 * Returns 0 if no `block` row is present (a table with only global params).
 */
export function countConditionColumns(rows: unknown[][]): number {
  const blockRow = rows.find(isBlockRow);
  if (!blockRow) return 0;
  // Cells at index 0 ("block") and 1 (block label column, usually empty) are
  // metadata; everything after is one condition column each.
  const conditionCells = blockRow.slice(2);
  // Treat trailing empty cells as absent (single-block tables sometimes pad).
  let count = 0;
  for (const cell of conditionCells) {
    if (cell === undefined || cell === null || String(cell).trim() === "")
      continue;
    count++;
  }
  return count;
}

/** True iff any row's first cell equals `simulateParticipantBool`. */
function hasSimulateParticipant(rows: unknown[][]): boolean {
  return rows.some(
    (r) => String(r[0] ?? "").trim() === "simulateParticipantBool",
  );
}

/**
 * Insert a `simulateParticipantBool=TRUE` row into a parsed table at the
 * correct alphabetical position iff:
 *   - the `--simulate` flag is set, AND
 *   - no `simulateParticipantBool` row already exists, AND
 *   - the table has at least one condition column.
 *
 * The row is inserted at the alphabetically-correct position so the
 * compiler's "parameters must be alphabetical" check passes. The table's
 * header rows (those starting with `_` or `block`) stay at the top.
 *
 * Returns a new array; does NOT mutate the input.
 */
export function injectSimulateParticipantIfMissing(
  rows: unknown[][],
  simulate: boolean,
): unknown[][] {
  if (!simulate) return rows;
  if (hasSimulateParticipant(rows)) return rows;
  const n = countConditionColumns(rows);
  if (n === 0) return rows;
  const newRow = [
    "simulateParticipantBool",
    "",
    ...Array.from({ length: n }, () => "TRUE"),
  ];
  // Find the insertion index: after the block row (and any `_`-prefixed
  // global rows that must precede condition-level params), immediately
  // before the first row whose first cell is alphabetically after
  // "simulateParticipantBool".
  const target = "simulateParticipantBool";
  let insertAt = rows.length;
  let seenBlock = false;
  for (let i = 0; i < rows.length; i++) {
    const cell = String(rows[i][0] ?? "").trim();
    if (cell === "block") {
      seenBlock = true;
      continue;
    }
    // Skip header / global rows (underscore-prefixed) and the block row.
    if (!seenBlock || cell.startsWith("_")) continue;
    if (cell > target) {
      insertAt = i;
      break;
    }
  }
  const out = [...rows];
  out.splice(insertAt, 0, newRow);
  return out;
}
