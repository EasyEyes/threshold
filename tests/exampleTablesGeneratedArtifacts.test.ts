/** @jest-environment node */
import * as fs from "fs";
import * as path from "path";
import { exampleTables } from "./helpers/exampleTables";

const tablesDir = path.resolve(__dirname, "../examples/tables");

// Table names the audit/compile suites write into examples/tables while they
// run. Part A of validationGreenSnapshot snapshots every table exampleTables()
// returns, so a live one becomes a new snapshot key on every run.
describe("exampleTables(): test-generated tables are not fixtures", () => {
  const written: string[] = [];
  const touch = (name: string) => {
    const abs = path.join(tablesDir, name);
    fs.writeFileSync(abs, "_about,written-by-a-test\n");
    written.push(abs);
  };

  afterAll(() => {
    for (const f of written) fs.rmSync(f, { force: true });
  });

  it("excludes node-audit fixtures written by parallel suites", () => {
    touch(`node-audit-${process.pid}.csv`);
    touch(`node-audit-${process.pid}-other.csv`);
    touch("node-audit.csv");
    const names = [...exampleTables().keys()];
    expect(names.filter((n) => n.startsWith("node-audit"))).toEqual([]);
    // control: the folder really is read, so the assertion above is not vacuous
    expect(names).toContain("minimalExperiment.csv");
  });
});
