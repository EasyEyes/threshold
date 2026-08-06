/**
 * @jest-environment node
 *
 * ParamReader casting of vector/matrix-typed parameters: cells and glossary
 * defaults become number[] / MatrixValue at read time. Inert for all
 * existing scalar-typed params.
 */
import type { GlossaryData } from "../../source/components/types";

const entry = (name: string, type: string, def: string) => ({
  name,
  availability: "now",
  type,
  default: def,
  explanation: "",
  example: "",
  categories: [],
});

const fixture: GlossaryData = {
  version: "1",
  glossary: {
    block: entry("block", "numerical", "1"),
    block_condition: entry("block_condition", "text", "1_1"),
    vecParam: entry("vecParam", "2*numerical", "1, 2"),
    freeVecParam: entry("freeVecParam", "*integer", "5, 6, 7"),
    matParam: entry("matParam", "2x2*numerical", "1,2;3,4"),
    plainText: entry("plainText", "text", "1,2"),
    plainNumber: entry("plainNumber", "numerical", "3"),
  },
  glossaryFull: [],
  superMatchingParams: [],
};

let papaBehavior: Record<string, { data: string[][] }>;
const installPapaMock = () => {
  jest.doMock("papaparse", () => ({
    __esModule: true,
    default: {
      parse: (url: string, config: any) => {
        const key = url.includes("blockCount")
          ? "blockCount"
          : url.replace(/^\.\/conditions\//, "").replace(".csv", "");
        if (!papaBehavior[key]) return; // unloadable file: never completes
        config.complete({ data: papaBehavior[key].data });
      },
    },
  }));
};

const loadReader = async (
  behavior: Record<string, { data: string[][] }>,
  callback?: any,
) => {
  jest.resetModules();
  papaBehavior = behavior;
  installPapaMock();
  const { initGlossary } = await import("../parameters/glossaryRegistry");
  const { ParamReader } = await import("../parameters/paramReader");
  initGlossary(fixture);
  return callback
    ? new ParamReader("conditions", callback)
    : new ParamReader("conditions");
};

const HEADERS = [
  "block",
  "block_condition",
  "vecParam",
  "freeVecParam",
  "matParam",
  "plainText",
  "plainNumber",
];
const BEHAVIOR = {
  blockCount: { data: [["block"], ["1"]] },
  block_1: {
    data: [
      HEADERS,
      ["1", "1_1", "3, 4", "8, 9, 10", "5,6;7,8", "1,2", "9"],
      [
        "1",
        "1_2",
        "nan, -inf",
        "0xA3, -0xB5",
        "0x3A, -inf; nan, 1.1e6",
        "x,y",
        "1.5",
      ],
    ],
  },
};

describe("ParamReader: vector/matrix-typed parameters", () => {
  it("casts vector cells to number[]", async () => {
    const cb = jest.fn();
    await loadReader(BEHAVIOR, cb);
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];
    expect(reader.read("vecParam", "1_1")).toEqual([3, 4]);
    expect(reader.read("freeVecParam", "1_1")).toEqual([8, 9, 10]);
  });

  it("casts special values: nan, inf, signed hex", async () => {
    const cb = jest.fn();
    await loadReader(BEHAVIOR, cb);
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];
    const v = reader.read("vecParam", "1_2");
    expect(Number.isNaN(v[0])).toBe(true);
    expect(v[1]).toBe(-Infinity);
    expect(reader.read("freeVecParam", "1_2")).toEqual([163, -181]);
  });

  it("casts matrix cells to MatrixValue (rows x columns)", async () => {
    const cb = jest.fn();
    await loadReader(BEHAVIOR, cb);
    // Imported after loadReader's resetModules so the class identity
    // matches the one paramReader uses.
    const { MatrixValue } = await import("../components/vectorParsing");
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];
    const m = reader.read("matParam", "1_1");
    expect(m).toBeInstanceOf(MatrixValue);
    expect(m.data).toEqual([
      [5, 6],
      [7, 8],
    ]);
    expect(m.at(1, 0)).toBe(7);
    expect(m.rowCount).toBe(2);
    expect(m.colCount).toBe(2);
    const m2 = reader.read("matParam", "1_2");
    expect(m2.at(0, 0)).toBe(58);
    expect(m2.at(0, 1)).toBe(-Infinity);
    expect(Number.isNaN(m2.at(1, 0))).toBe(true);
  });

  it("casts glossary defaults the same way (param absent from CSV)", async () => {
    jest.resetModules();
    installPapaMock();
    papaBehavior = { blockCount: { data: [["block"], ["1"]] } };
    const { initGlossary } = await import("../parameters/glossaryRegistry");
    const { ParamReader } = await import("../parameters/paramReader");
    initGlossary(fixture);
    const reader: any = new ParamReader("conditions");
    const { MatrixValue } = await import("../components/vectorParsing");
    // No conditions loaded → glossary-default path
    expect(reader.read("vecParam", "unknownCondition")).toEqual([1, 2]);
    expect(reader.read("freeVecParam", "unknownCondition")).toEqual([5, 6, 7]);
    const m = reader.read("matParam", "unknownCondition");
    expect(m).toBeInstanceOf(MatrixValue);
    expect(m.data).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("leaves scalar-typed params untouched", async () => {
    const cb = jest.fn();
    await loadReader(BEHAVIOR, cb);
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];
    // text with commas stays a string — no accidental vector casting
    expect(reader.read("plainText", "1_1")).toBe("1,2");
    expect(reader.read("plainNumber", "1_1")).toBe(9);
    expect(reader.read("block", "1_1")).toBe(1);
    expect(reader.read("block_condition", "1_1")).toBe("1_1");
  });

  it("glossary-default block reads give each condition an independent copy", async () => {
    // vecParam absent from the CSV → default path. Array(copies).fill(x)
    // would share ONE mutable array across a block's conditions.
    const cb = jest.fn();
    await loadReader(
      {
        blockCount: { data: [["block"], ["1"]] },
        block_1: {
          data: [
            ["block", "block_condition", "plainNumber"],
            ["1", "1_1", "9"],
            ["1", "1_2", "8"],
          ],
        },
      },
      cb,
    );
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];
    const both = reader.read("vecParam", 1); // block-number read
    expect(both).toHaveLength(2);
    expect(both[0]).toEqual([1, 2]);
    expect(both[1]).toEqual([1, 2]);
    expect(both[0]).not.toBe(both[1]);
    both[0].push(99);
    expect(both[1]).toEqual([1, 2]);
  });

  it("read() returns defensive copies: consumer mutation must not corrupt conditions", async () => {
    const cb = jest.fn();
    await loadReader(BEHAVIOR, cb);
    const { MatrixValue } = await import("../components/vectorParsing");
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];

    // Vector: mutate the returned array, then re-read.
    const v = reader.read("vecParam", "1_1");
    v.push(99);
    v[0] = -1000;
    expect(reader.read("vecParam", "1_1")).toEqual([3, 4]);

    // Matrix: mutate the returned data, then re-read.
    const m = reader.read("matParam", "1_1");
    expect(m).toBeInstanceOf(MatrixValue);
    m.data[0][0] = -1000;
    const fresh = reader.read("matParam", "1_1");
    expect(fresh.at(0, 0)).toBe(5);
    expect(fresh).not.toBe(m);
  });

  it("stored vector/matrix values are frozen against mutation via direct conditions access", async () => {
    const cb = jest.fn();
    await loadReader(BEHAVIOR, cb);
    await new Promise((r) => setTimeout(r, 700));
    const reader = cb.mock.calls[0][0];

    // Components sometimes iterate reader.conditions directly, bypassing
    // read()'s defensive copies — stored values must be tamper-proof.
    const storedVec = reader.conditions[0].vecParam;
    expect(Object.isFrozen(storedVec)).toBe(true);
    expect(() => {
      storedVec.push(99);
    }).toThrow(TypeError);

    const storedMat = reader.conditions[0].matParam;
    expect(Object.isFrozen(storedMat)).toBe(true);
    expect(Object.isFrozen(storedMat.data)).toBe(true);
    expect(Object.isFrozen(storedMat.data[0])).toBe(true);
    expect(() => {
      storedMat.data[0][0] = 99;
    }).toThrow(TypeError);

    // read() copies remain freely mutable
    const v = reader.read("vecParam", "1_1");
    v.push(99);
    expect(v).toEqual([3, 4, 99]);
  });
});
