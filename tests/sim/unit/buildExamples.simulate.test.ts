/**
 * Tests for --simulate injection logic in examples/buildExamples.ts.
 *
 * The `--simulate` flag (when set) appends a `simulateParticipantBool=TRUE`
 * row to every condition column IF (and only if) the parameter is not
 * already present in the parsed table. This is the dev-mode auto-inject:
 * compiled/production experiments are unaffected.
 *
 * @jest-environment node
 */

import {
  injectSimulateParticipantIfMissing,
  parseSimulateFlag,
  countConditionColumns,
} from "../../../examples/simulateInject";

describe("parseSimulateFlag", () => {
  it("returns true when --simulate is present", () => {
    expect(parseSimulateFlag(["node", "script.ts", "--simulate"])).toBe(true);
  });

  it("returns false when --simulate is absent", () => {
    expect(parseSimulateFlag(["node", "script.ts", "myExp"])).toBe(false);
  });

  it("returns false for empty argv", () => {
    expect(parseSimulateFlag(["node"])).toBe(false);
  });
});

describe("countConditionColumns", () => {
  it("returns 0 for a table with only global params", () => {
    const rows = [
      ["_about", "test"],
      ["_authors", "me"],
    ];
    expect(countConditionColumns(rows)).toBe(0);
  });

  it("returns number of condition columns marked by `block` row", () => {
    const rows = [
      ["_about", "test"],
      ["block", "", "1", "1", "2"],
      ["font", "", "A", "B", "C"],
    ];
    expect(countConditionColumns(rows)).toBe(3);
  });

  it("returns 0 when no `block` row exists", () => {
    const rows = [["_about", "test"]];
    expect(countConditionColumns(rows)).toBe(0);
  });
});

describe("injectSimulateParticipantIfMissing", () => {
  it("appends simulateParticipantBool row when missing and --simulate is set", () => {
    const rows = [
      ["_about", "test"],
      ["block", "", "1", "1"],
      ["font", "", "A", "B"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, true);
    const simRow = result.find((r) => r[0] === "simulateParticipantBool");
    expect(simRow).toBeDefined();
    expect(simRow?.[1]).toBe("");
    expect(simRow?.[2]).toBe("TRUE");
    expect(simRow?.[3]).toBe("TRUE");
  });

  it("fills every condition column with TRUE", () => {
    const rows = [
      ["block", "", "1", "1", "2", "2", "3"],
      ["font", "", "A", "B", "C", "D", "E"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, true);
    const simRow = result.find((r) => r[0] === "simulateParticipantBool");
    expect(simRow?.slice(2)).toEqual(["TRUE", "TRUE", "TRUE", "TRUE", "TRUE"]);
  });

  it("does NOT inject when --simulate is false", () => {
    const rows = [
      ["block", "", "1"],
      ["font", "", "A"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, false);
    expect(
      result.find((r) => r[0] === "simulateParticipantBool"),
    ).toBeUndefined();
  });

  it("does NOT inject when simulateParticipantBool already present (regardless of flag)", () => {
    const rows = [
      ["block", "", "1"],
      ["simulateParticipantBool", "", "FALSE"],
      ["font", "", "A"],
    ];
    const resultTrue = injectSimulateParticipantIfMissing(rows, true);
    const resultFalse = injectSimulateParticipantIfMissing(rows, false);
    // No duplicate row appended
    const simRowsT = resultTrue.filter(
      (r) => r[0] === "simulateParticipantBool",
    );
    const simRowsF = resultFalse.filter(
      (r) => r[0] === "simulateParticipantBool",
    );
    expect(simRowsT).toHaveLength(1);
    expect(simRowsF).toHaveLength(1);
    expect(simRowsT[0][2]).toBe("FALSE"); // existing value preserved
  });

  it("preserves all existing rows in order", () => {
    const rows = [
      ["_about", "demo"],
      ["block", "", "1"],
      ["font", "", "A"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, true);
    expect(result[0]).toEqual(["_about", "demo"]);
    expect(result[1]).toEqual(["block", "", "1"]);
    expect(result[2]).toEqual(["font", "", "A"]);
    expect(result[3][0]).toBe("simulateParticipantBool");
  });

  it("handles table with 0 condition columns (no-op)", () => {
    const rows = [["_about", "demo"]];
    const result = injectSimulateParticipantIfMissing(rows, true);
    // No condition columns means nowhere to inject — but we still don't add the
    // row, since it'd be meaningless without a block context.
    expect(
      result.find((r) => r[0] === "simulateParticipantBool"),
    ).toBeUndefined();
  });

  it("does not mutate the input array", () => {
    const rows = [
      ["block", "", "1"],
      ["font", "", "A"],
    ];
    const original = rows.map((r) => [...r]);
    injectSimulateParticipantIfMissing(rows, true);
    expect(rows).toEqual(original);
  });

  it("inserts at the alphabetically-correct position (not appended)", () => {
    // simulateParticipantBool sorts between "showTargetSpecsBool" and "spacingDirection".
    const rows = [
      ["_about", "demo"],
      ["block", "", "1"],
      ["font", "", "A"],
      ["showTargetSpecsBool", "", "TRUE"],
      ["spacingDirection", "", "radial"],
      ["targetKind", "", "letter"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, true);
    const simIdx = result.findIndex((r) => r[0] === "simulateParticipantBool");
    expect(simIdx).toBe(4); // after showTargetSpecsBool (idx 3), before spacingDirection
    expect(result[simIdx - 1][0]).toBe("showTargetSpecsBool");
    expect(result[simIdx + 1][0]).toBe("spacingDirection");
  });

  it("inserts at the end when simulateParticipantBool is alphabetically last", () => {
    // Use only params that sort before 's' so simulateParticipantBool is last.
    const rows = [
      ["_about", "demo"],
      ["block", "", "1"],
      ["font", "", "A"],
      ["conditionName", "", "c1"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, true);
    const simIdx = result.findIndex((r) => r[0] === "simulateParticipantBool");
    expect(simIdx).toBe(result.length - 1); // last position
  });

  it("inserts right after the block row when simulateParticipantBool is alphabetically first", () => {
    const rows = [
      ["_about", "demo"],
      ["block", "", "1"],
      ["targetKind", "", "letter"],
    ];
    const result = injectSimulateParticipantIfMissing(rows, true);
    const simIdx = result.findIndex((r) => r[0] === "simulateParticipantBool");
    expect(simIdx).toBe(2); // immediately after block row
    expect(result[simIdx + 1][0]).toBe("targetKind");
  });
});
