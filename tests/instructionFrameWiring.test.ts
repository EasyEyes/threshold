import fs from "node:fs";

const source = fs.readFileSync("threshold.js", "utf8");

const section = (start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Cannot extract ${start}`);
  return source.slice(from, to);
};

const initBegin = section(
  "function initInstructionRoutineBegin",
  "function initInstructionRoutineEachFrame",
);
const blockInstructionFrame = section(
  "async function _instructionRoutineEachFrame",
  "// async function _instructionRoutineEnd",
);
const trialBegin = section(
  "function trialInstructionRoutineBegin",
  "function trialInstructionRoutineEachFrame",
);
const trialInstructionFrame = section(
  "function trialInstructionRoutineEachFrame",
  "function trialInstructionRoutineEnd",
);
const trialResponseFrame = section(
  "function trialRoutineEachFrame",
  "function trialRoutineEnd",
);

describe("instruction-frame invariant wiring", () => {
  it("reuses the counter flags captured at each routine boundary", () => {
    expect(initBegin).toContain(
      'showCounterBool = paramReader.read("showCounterBool", status.block)[0]',
    );
    expect(initBegin).toMatch(
      /showViewingDistanceBool\s*=\s*paramReader\.read\(\s*"showViewingDistanceBool",\s*status\.block,?\s*\)\[0\]/,
    );
    expect(trialBegin).toContain(
      'showCounterBool = reader.read("showCounterBool", BC)',
    );
    expect(trialBegin).toContain(
      'showViewingDistanceBool = reader.read("showViewingDistanceBool", BC)',
    );

    for (const frame of [blockInstructionFrame, trialInstructionFrame]) {
      expect(frame).not.toContain('paramReader.read("showCounterBool"');
      expect(frame).not.toContain('paramReader.read("showViewingDistanceBool"');
      expect(frame).toContain("showCounterBool,");
      expect(frame).toContain("showViewingDistanceBool,");
    }
  });

  it("reuses the same condition flags on response frames", () => {
    expect(trialResponseFrame).not.toContain(
      'paramReader.read("showCounterBool"',
    );
    expect(trialResponseFrame).not.toContain(
      'paramReader.read("showViewingDistanceBool"',
    );
    expect(trialResponseFrame).toContain("showCounterBool,");
    expect(trialResponseFrame).toContain("showViewingDistanceBool,");
  });

  it("positions at boundaries and delegates steady-frame resize checks", () => {
    expect(initBegin).toContain("positionInstructionStims(true)");
    expect(trialBegin).toContain("positionInstructionStims(true)");

    for (const frame of [blockInstructionFrame, trialInstructionFrame]) {
      expect(frame).toContain("positionInstructionStims()");
      expect(frame).not.toContain("trialCounter.setPos(");
      expect(frame).not.toContain("renderObj.tinyHint.setPos(");
    }
  });
});
