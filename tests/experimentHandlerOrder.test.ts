/**
 * ExperimentHandler._orderOutput: version column's place in the results CSV.
 *
 * EasyEyes metadata columns are prepended ahead of the experiment's input
 * parameters: URL, experiment, then the EasyEies version
 * (easyEyesVersion — Denis Pelli 2026-09-23 #4: the compile-time "Compiler
 * updated" date, i.e. the Netlify deploy timestamp), then date, then input
 * parameters in table order, then every runtime-added output column in
 * first-appearance order.
 *
 * Called on the prototype with a duck-typed `this` (only _psychoJS and its
 * inputParameters are read), avoiding the full ExperimentHandler constructor.
 *
 * @jest-environment node
 */

import "@jest/globals";
// global.js has top-level await (unparseable under babel CJS); only
// calibrationTime is needed from it in this import chain.
jest.mock("../components/global", () => ({ calibrationTime: 0 }));
import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler";

const order = (
  rows: Record<string, unknown>[],
  attributes: string[],
  inputParameters: string[] = [],
) =>
  ExperimentHandler.prototype._orderOutput.call(
    { _psychoJS: { inputParameters } },
    rows,
    attributes,
  );

describe("ExperimentHandler._orderOutput version column", () => {
  const rows = [{ foo: 1, easyEyesVersion: "2026-09-24T14:03:22.844Z" }];

  it("places easyEyesVersion between experiment and date", () => {
    const { attributes } = order(rows, [
      "date",
      "easyEyesVersion",
      "experiment",
      "foo",
      "URL",
    ]);
    expect(attributes.slice(0, 4)).toEqual([
      "URL",
      "experiment",
      "easyEyesVersion",
      "date",
    ]);
  });

  it("fills missing version values with null on every row (uniform CSV)", () => {
    const { data } = order([{ foo: 1 }], ["experiment", "foo"]);
    expect(data[0].easyEyesVersion).toBe(null);
  });
});
