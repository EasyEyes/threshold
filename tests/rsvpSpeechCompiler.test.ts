import { ExperimentTable } from "../preprocess/experimentTable";
import { validateExperimentTable } from "../preprocess/validateExperimentTable";
import { loadGlossaryForTests } from "./helpers/glossary";

const ERROR_NAME = "Incompatible RSVP speech response modes";

const errorsFor = (parameters: Record<string, string[]>) => {
  const conditionCount = parameters.block?.length ?? 1;
  const rows: Record<string, string[]> = {
    block: Array(conditionCount).fill("1"),
    conditionName: Array.from({ length: conditionCount }, (_, i) => `C${i}`),
    readingCorpus: Array(conditionCount).fill("words.txt"),
    targetKind: Array(conditionCount).fill("rsvpReading"),
    targetTask: Array(conditionCount).fill("identify"),
    thresholdParameter: Array(conditionCount).fill("targetDurationSec"),
    ...parameters,
  };
  const table = new ExperimentTable([
    ["_about", "RSVP speech compiler test"],
    ...Object.keys(rows)
      .sort()
      .map((name) => [name, "", ...rows[name]]),
  ]);
  return validateExperimentTable(table);
};

beforeAll(async () => {
  await loadGlossaryForTests();
});

describe("RSVP speech compiler validation", () => {
  it("reports a blocking compiler error for both speech modes in one condition", () => {
    expect(
      errorsFor({
        responseSpokenBool: ["TRUE"],
        responseSpokenToExperimenterBool: ["TRUE"],
      }),
    ).toEqual([
      {
        name: ERROR_NAME,
        kind: "error",
        context: "preprocessor",
        parameters: [
          "responseSpokenBool",
          "responseSpokenToExperimenterBool",
          "targetKind",
        ],
        message: expect.stringContaining("cannot both be TRUE"),
        hint: "Check column C. Set one of the two response parameters to FALSE.",
      },
    ]);
  });

  it.each([
    ["matrix", "FALSE", "FALSE"],
    ["human experimenter", "FALSE", "TRUE"],
    ["automatic speech", "TRUE", "FALSE"],
  ])("preserves the %s configuration", (_, automatic, experimenter) => {
    expect(
      errorsFor({
        responseSpokenBool: [automatic],
        responseSpokenToExperimenterBool: [experimenter],
      }),
    ).toEqual([]);
  });

  it.each([
    {},
    { responseSpokenBool: ["TRUE"] },
    { responseSpokenToExperimenterBool: ["TRUE"] },
    { responseSpokenBool: [""], responseSpokenToExperimenterBool: [""] },
  ])("uses existing defaults for omitted or empty cells: %j", (parameters) => {
    expect(errorsFor(parameters)).toEqual([]);
  });

  it("does not combine speech flags from different conditions or blocks", () => {
    expect(
      errorsFor({
        block: ["1", "1", "2", "2"],
        responseSpokenBool: ["TRUE", "FALSE", "FALSE", "TRUE"],
        responseSpokenToExperimenterBool: ["FALSE", "TRUE", "FALSE", "FALSE"],
      }),
    ).toEqual([]);
  });

  it("reports only enabled RSVP conflicts in a mixed-task table", () => {
    const errors = errorsFor({
      block: ["1", "2", "3", "3", "4"],
      conditionEnabledBool: ["TRUE", "TRUE", "TRUE", "FALSE", "TRUE"],
      responseSpokenBool: ["TRUE", "TRUE", "TRUE", "TRUE", "TRUE"],
      responseSpokenToExperimenterBool: [
        "TRUE",
        "TRUE",
        "TRUE",
        "TRUE",
        "TRUE",
      ],
      targetKind: [
        "letter",
        "reading",
        "rsvpReading",
        "rsvpReading",
        "rsvpReading",
      ],
    }).filter((error) => error.name === ERROR_NAME);
    expect(errors).toHaveLength(1);
    expect(errors[0].hint).toBe(
      "Check columns E and G. Set one of the two response parameters to FALSE.",
    );
  });

  it.each(["letter", "reading", "sound", "vernier"])(
    "does not impose RSVP response restrictions on %s",
    (targetKind) => {
      const withBothModes = errorsFor({
        targetKind: [targetKind],
        responseSpokenBool: ["TRUE"],
        responseSpokenToExperimenterBool: ["TRUE"],
      });
      const withOneMode = errorsFor({
        targetKind: [targetKind],
        responseSpokenBool: ["TRUE"],
        responseSpokenToExperimenterBool: ["FALSE"],
      });
      expect(withBothModes).toEqual(withOneMode);
      expect(withBothModes.some((error) => error.name === ERROR_NAME)).toBe(
        false,
      );
    },
  );

  it("uses the existing disabled-condition exemption", () => {
    expect(
      errorsFor({
        conditionEnabledBool: ["FALSE"],
        responseSpokenBool: ["TRUE"],
        responseSpokenToExperimenterBool: ["TRUE"],
      }),
    ).toEqual([]);
  });

  it.each(["true", "TrUe", " TRUE "])(
    "checks Boolean values accepted by the compiler: %s",
    (value) => {
      expect(
        errorsFor({
          responseSpokenBool: [value],
          responseSpokenToExperimenterBool: [value],
        }).map((error) => error.name),
      ).toEqual([ERROR_NAME]);
    },
  );

  it("leaves invalid Boolean values to the existing type check", () => {
    const errors = errorsFor({
      responseSpokenBool: ["yes"],
      responseSpokenToExperimenterBool: ["TRUE"],
    });
    expect(errors.some((error) => error.name === ERROR_NAME)).toBe(false);
    expect(
      errors.some((error) => error.parameters.includes("responseSpokenBool")),
    ).toBe(true);
  });
});
