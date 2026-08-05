/**
 * validateExperimentTable.ts — experiment-table validation for the EasyEyes
 * compiler. Every rule that inspects the experimenter's table (and nothing
 * else) lives here.
 *
 * HOW TO ADD A CHECK
 * 1. Write `checkSomething(t: ExperimentTable): EasyEyesError[]` below,
 *    building messages with makeError/makeCaution and the message helpers
 *    (columnsHint, valueAtColumn, param).
 * 2. Add it to the TABLE_CHECKS registry — that is the ONLY wiring step.
 * 3. Add one scenario to tests/validationGreenSnapshot.test.ts Part B;
 *    the scenario-count guard enforces this.
 */
import type { Offender, EasyEyesError } from "./errorMessages";
import { ExperimentTable } from "./experimentTable";
import {
  conditionIndexToColumnName,
  getNoncontiguousValues,
  isBlockShuffleGroupingParam,
  isNumeric,
  levDist,
  limitedEnumerate,
  valuesContiguous,
  verballyEnumerate,
} from "./utils";
import { getGlossary } from "../parameters/glossaryRegistry";
import type { GlossaryEntry } from "../../source/components/types";
import {
  hasLigatureContradiction,
  variantLigaturesToFeatureEntries,
} from "../components/fontVariantLigatures";
import { validateFeatureSettingsString } from "./opentypeFeatures";
import {
  checkVectorValue,
  describeVectorType,
  isVectorType,
  parseVectorType,
} from "./vectors";
import { _superMatching } from "./experimentFileChecks";

export const makeError = (e: {
  name: string;
  message: string;
  hint: string;
  parameters: string[];
}): EasyEyesError => ({
  name: e.name,
  kind: "error",
  context: "preprocessor",
  parameters: e.parameters,
  message: e.message,
  hint: e.hint,
});

export const makeCaution = (e: {
  name: string;
  message: string;
  hint: string;
  parameters: string[];
}): EasyEyesError => ({ ...makeError(e), kind: "warning" });

/** Renders a parameter name in the standard error-message span. */
export const param = (parameterName: string): string =>
  `<span class="error-parameter">${parameterName}</span>`;

/** "Check column C" / "Check columns C and E" — the dominant hint idiom. */
export const columnsHint = (conditionIndices: number[]): string =>
  `Check column${conditionIndices.length > 1 ? "s" : ""} ${verballyEnumerate(
    conditionIndices.map(conditionIndexToColumnName),
  )}`;

/** `abc (column C)` — for hints that report offending values. */
export const valueAtColumn = (
  value: string | number,
  conditionIndex: number,
): string => `${value} (column ${conditionIndexToColumnName(conditionIndex)})`;

/** "abc (column C) and 5 (column E)" */
export const valuesAtColumns = (pairs: [string | number, number][]): string =>
  verballyEnumerate(pairs.map(([v, i]) => valueAtColumn(v, i)));

const getCategoriesFromString = (str: string) =>
  str
    .split(",")
    .map((s) => s.trim())
    .filter((x) => x);

const similarlySpelledCandidates = (
  proposedParameter: string,
  parameters: string[],
  numberOfCandidatesToReturn = 4,
): string[] => {
  const closest = parameters.sort(
    (a: string, b: string) =>
      levDist(proposedParameter, a) - levDist(proposedParameter, b),
  );

  const candidates = closest.slice(0, numberOfCandidatesToReturn - 1);
  // "@" appears in glossary keys for parameter variants; display as "9".
  return candidates.map((c) => c.replace(/@/g, "9"));
};

const checkGlossaryParametersProper = (
  _t: ExperimentTable,
): EasyEyesError[] => {
  return [..._areGlossaryParametersValidTypes()];
};

const _areGlossaryParametersValidTypes = (): EasyEyesError[] => {
  const validTypes = [
    "integer",
    "numerical",
    "boolean",
    "text",
    "obsolete",
    "categorical",
    "multicategorical",
  ];
  const offendingParams = Object.values(getGlossary()).filter(
    (p) =>
      !validTypes.includes(p["type"] as string) &&
      !isVectorType(p["type"] as string),
  );
  if (!offendingParams.length) return [];
  const names = offendingParams.map((p) => p["name"]) as string[];
  const types = offendingParams.map((p) => p["type"]) as string[];
  const plural = names.length > 1;
  const nameTypeMessage = verballyEnumerate(
    names.map((n, i) => `${n} ('${types[i]}')`),
  );
  return [
    makeError({
      name: "Type in glossary is unsupported",
      message: `${nameTypeMessage} ${plural ? "have" : "has"} invalid type${
        plural ? "s" : ""
      }. Please contact the EasyEyes team.`,
      hint: "",
      parameters: names,
    }),
  ];
};

// Setting both overrides the same axis; the result is undefined.
const FONT_GAUNTLET_HINT = `<a href="https://fontgauntlet.com/" target="_blank" rel="noopener">Dinamo Font Gauntlet</a> reports and demonstrates your variable font's axes of variation, and the range and default of each axis.`;

// Vector/matrix-typed parameters need a valid, non-empty glossary default:
// an empty cell in the experiment table falls back to it, and a bad default
// would otherwise surface as type errors against the scientist's own empty
// cells (or, if empty, as a runtime NaN-fill). Scoped to vector/matrix types
// only — pre-existing scalar defaults are not policed.
const checkGlossaryVectorDefaults = (_t: ExperimentTable): EasyEyesError[] => {
  const bad: { name: string; type: string; def: string; reason: string }[] = [];
  for (const entry of Object.values(getGlossary())) {
    const spec = parseVectorType(entry["type"] as string);
    if (!spec) continue;
    const def = (entry["default"] as string) ?? "";
    const result = checkVectorValue(spec, def);
    if (def.trim() === "")
      bad.push({
        name: entry["name"] as string,
        type: entry["type"] as string,
        def,
        reason: "the default is empty",
      });
    else if (!result.ok)
      bad.push({
        name: entry["name"] as string,
        type: entry["type"] as string,
        def,
        reason: result.reason as string,
      });
  }
  return bad.map((b) =>
    makeError({
      name: "Vector default in glossary is invalid",
      message: `The glossary default "${b.def}" for ${param(
        b.name,
      )} does not match its type "${
        b.type
      }", which requires ${describeVectorType(parseVectorType(b.type)!)}: ${
        b.reason
      }.`,
      hint: "Please contact the EasyEyes team.",
      parameters: [b.name],
    }),
  );
};

const checkFontWeightAndWghtConflict = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (
    !t.params.includes("fontWeight") &&
    !t.params.includes("fontVariableSettings")
  )
    return [];
  const fontWeight = t.effectiveValues("fontWeight");
  const fontVariableSettings = t.effectiveValues("fontVariableSettings");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    const hasWeight = fontWeight[i] !== "" && fontWeight[i] !== undefined;
    const hasWghtInSettings =
      fontVariableSettings[i] &&
      fontVariableSettings[i]
        .toLowerCase()
        .replace(/["']/g, "")
        .includes("wght");
    if (hasWeight && hasWghtInSettings) off.push(i);
  }
  if (!off.length) return [];
  return [
    makeError({
      name: `fontWeight and fontVariableSettings "wght" conflict`,
      message: `Cannot use both ${param("fontWeight")} and ${param(
        "fontVariableSettings",
      )} "wght" in the same condition.`,
      hint: `${columnsHint(off)}. ${FONT_GAUNTLET_HINT}`,
      parameters: ["fontWeight", "fontVariableSettings"],
    }),
  ];
};

// Only letter/repeatedLetters run the runtime blackout check; missing
// targetKind is treated as letter (the default).
const checkBlackoutScreenColorConflict = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const blackoutAllowed = t.effectiveValues("thresholdAllowedBlackoutBool");
  const screenColors = t.effectiveValues("screenColorRGBA");
  const targetKinds = t.effectiveValues("targetKind");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (String(blackoutAllowed[i]).toUpperCase() === "TRUE") continue;
    const kind = String(targetKinds[i] || "letter");
    if (kind !== "letter" && kind !== "repeatedLetters") continue;
    const rgb = String(screenColors[i])
      .split(",")
      .slice(0, 3)
      .map((s) => parseFloat(s));
    if (rgb.length === 3 && rgb.every((v) => v === 0)) off.push(i);
  }
  if (!off.length) return [];
  return [
    makeError({
      name: "Background color conflicts with blackout detection",
      message: `Blackout detection is on (${param(
        "thresholdAllowedBlackoutBool",
      )} is FALSE) but ${param(
        "screenColorRGBA",
      )} is pure black (0,0,0,1) in the same condition. On a black screen every trial looks like a blackout, so every trial would be discarded.`,
      hint: `Set ${param(
        "screenColorRGBA",
      )} to a dark gray (e.g. 0.004, 0.004, 0.004, 1, i.e. about 1/256) to enable blackout detection, or set ${param(
        "thresholdAllowedBlackoutBool",
      )} to TRUE to skip it. ${columnsHint(off)}.`,
      parameters: ["thresholdAllowedBlackoutBool", "screenColorRGBA"],
    }),
  ];
};

const checkImpulseResponsePairs = (t: ExperimentTable): EasyEyesError[] => {
  const hasLoudspeaker =
    t.params.includes("_calibrateSoundSimulateLoudspeaker") &&
    t.colBOrDefault("_calibrateSoundSimulateLoudspeaker").trim() !== "";
  const hasMicrophone =
    t.params.includes("_calibrateSoundSimulateMicrophone") &&
    t.colBOrDefault("_calibrateSoundSimulateMicrophone").trim() !== "";
  if (hasLoudspeaker === hasMicrophone) return [];
  return [
    makeError({
      name: "Missing paired impulse response file",
      message:
        "Sound simulation requires both loudspeaker and microphone impulse/frequency response files",
      hint: "You must provide values for both _calibrateSoundSimulateLoudspeaker and _calibrateSoundSimulateMicrophone, or neither. Sound simulation requires both to function correctly.",
      parameters: [
        "_calibrateSoundSimulateLoudspeaker",
        "_calibrateSoundSimulateMicrophone",
      ],
    }),
  ];
};

// A nonzero offset lets participants move their eyes to the "peripheral"
// target before onset, collapsing its eccentricity to zero.
const checkMarkingOffsetZeroForPeripheralTarget = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const offset = t.effectiveValues("markingOffsetBeforeTargetOnsetSecs");
  const xs = t.effectiveValues("targetEccentricityXDeg");
  const ys = t.effectiveValues("targetEccentricityYDeg");
  const off: { i: number; x: boolean; y: boolean }[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    const o = Number(offset[i]),
      x = Number(xs[i]),
      y = Number(ys[i]);
    // Non-numeric values are the type checker's job, not this check's.
    if (!Number.isFinite(o) || !Number.isFinite(x) || !Number.isFinite(y))
      continue;
    if (o !== 0 && (x !== 0 || y !== 0))
      off.push({ i, x: x !== 0, y: y !== 0 });
  }
  if (!off.length) return [];
  // Cite only the eccentricity components that cause the peripherality.
  const hintParts = off.map(({ i, x, y }) => {
    const terms = [
      `markingOffsetBeforeTargetOnsetSecs=${offset[i]}`,
      ...(x ? [`targetEccentricityXDeg=${xs[i]}`] : []),
      ...(y ? [`targetEccentricityYDeg=${ys[i]}`] : []),
    ];
    return `column ${conditionIndexToColumnName(i)} (${terms.join(", ")})`;
  });
  return [
    makeError({
      name: "Non-zero markingOffsetBeforeTargetOnsetSecs set for peripheral target",
      message: `To prevent peeking (ie participants changing fixation before target onset), ${param(
        "markingOffsetBeforeTargetOnsetSecs",
      )} must be 0 in peripheral conditions.`,
      hint: "Check " + verballyEnumerate(hintParts) + ".",
      parameters: [
        "markingOffsetBeforeTargetOnsetSecs",
        ...(off.some((o) => o.x) ? ["targetEccentricityXDeg"] : []),
        ...(off.some((o) => o.y) ? ["targetEccentricityYDeg"] : []),
      ],
    }),
  ];
};

// The distance CHECK runs after a distance calibration, which only happens
// when some condition enables calibrateDistanceBool.
const checkCalibrateDistanceCheckRequiresDistance = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const wantsCheck =
    t.colBOrDefault("_calibrateDistanceCheckBool").toUpperCase() === "TRUE";
  if (!wantsCheck) return [];
  const calibrates = t
    .effectiveValues("calibrateDistanceBool")
    .some((v) => v.toUpperCase() === "TRUE");
  if (calibrates) return [];
  return [
    makeError({
      name: "Invalid combination of parameters",
      message: "To check distance tracking you must enable it.",
      hint: "_calibrateDistanceCheckBool requires calibrateDistanceBool",
      parameters: ["_calibrateDistanceCheckBool", "calibrateDistanceBool"],
    }),
  ];
};

const checkViewMonitorsXYDeg = (t: ExperimentTable): EasyEyesError[] => {
  const viewMonitorsXYDeg = t.conditionValues("viewMonitorsXYDeg");
  if (!viewMonitorsXYDeg.some((v) => v !== "")) return [];
  const errorList: EasyEyesError[] = [];
  /**
   * There can be zero or more xy coordinates, separated by semicolons.
   * Each coordinate consists of two comma-separated numbers.
   * Each number must be in the range ±180 deg.
   * Spaces between tokens are ignored, as are leading and trailing spaces.
   * Missing numbers are a fatal error.
   */
  const invalid = (block: number): EasyEyesError =>
    makeError({
      name: "Invalid parameter value",
      message: `The value for the parameter ${param(
        "viewMonitorsXYDeg",
      )} in block ${block} is invalid.`,
      hint: "Please correct the value and try again.",
      parameters: ["viewMonitorsXYDeg"],
    });
  viewMonitorsXYDeg.forEach((val: string, i: number) => {
    if (val === "") return;
    const xyDegs = val.split(";");
    xyDegs.forEach((xyDeg: string) => {
      const xy = xyDeg.split(",");
      if (xy.length !== 2) {
        errorList.push(invalid(i + 1));
      } else {
        if (isNaN(Number(xy[0])) || isNaN(Number(xy[1]))) {
          errorList.push(invalid(i + 1));
        } else {
          if (
            Number(xy[0]) < -180 ||
            Number(xy[0]) > 180 ||
            Number(xy[1]) < -180 ||
            Number(xy[1]) > 180
          ) {
            errorList.push(invalid(i + 1));
          }
        }
      }
    });
  });
  return errorList;
};

const checkParametersAlphabetical = (t: ExperimentTable): EasyEyesError[] => {
  const p = t.params;
  for (let i = 1; i < p.length; i++)
    if (p[i].toLowerCase() < p[i - 1].toLowerCase())
      return [
        makeError({
          name: "Parameters aren't alphabetical",
          message:
            "Uh oh! Looks like your parameters are out of order. Keeping everything alphabetical will make working with your experiment file easier.",
          hint: `Sort your parameters into alphabetical order. Try starting with ${param(
            p[i],
          )} &#8212 that's the first misplaced parameter we found.`,
          parameters: [p[i]],
        }),
      ];
  return [];
};

const checkParametersDuplicated = (t: ExperimentTable): EasyEyesError[] => {
  const e: EasyEyesError[] = [];
  for (const n of t.params)
    if (t.isDuplicate(n))
      e.push(
        makeError({
          name: "Parameter is duplicated",
          message: `The parameter ${param(
            n,
          )} appears more than once! Unintended behavior lurks ahead...`,
          hint: "Each parameter may only be set once per experiment file, so there's no ambiguity in which value to use.",
          parameters: [n],
        }),
      );
  return e;
};

const checkParametersRecognized = (t: ExperimentTable): EasyEyesError[] => {
  const e: EasyEyesError[] = [];
  const gl = getGlossary();
  for (const n of t.params) {
    if (n in gl || _superMatching(n)) continue;
    const closest = similarlySpelledCandidates(n, Object.keys(gl));
    e.push(
      makeError({
        name: "Parameter is unrecognized",
        message: `Sorry, we couldn't recognize the parameter ${param(
          n,
        )}. The closest supported parameter is ${param(
          closest[0],
        )} &#8212 is that what you meant?`,
        hint: `The other closest supported parameters found were ${param(
          closest[1],
        )} and ${param(closest[2])}. All parameters are case-sensitive.`,
        parameters: [n],
      }),
    );
  }
  return e;
};
// DISABLED — not in TABLE_CHECKS. The glossary has availability set for many
// params but none are "now" (values look like defaults/descriptions), so
// registering would emit false "not yet supported" errors for standard params.
// TODO: register once the deployed glossary adds availability: "now".
const checkParametersCurrentlySupported = (
  t: ExperimentTable,
): EasyEyesError[] =>
  t.params
    .filter((n) => n in getGlossary())
    .filter((n) => {
      const a = getGlossary()[n].availability;
      return a && a !== "now";
    })
    .map((n) =>
      makeError({
        name: "Parameter is not yet supported",
        message: `Apologies from the EasyEyes team! The parameter ${param(
          n,
        )} isn't supported yet. We hope to implement the parameter ${getGlossary()[
          n
        ]?.availability}.`,
        hint: `Unfortunately, you won't be able to use this parameter at this time. Please, try again later. If the parameter is important to you, we'd encourage you to reach out to the <a href="mailto:easyeyes.team@gmail.com?subject=Please add support for ${n}.">EasyEyes team</a>.`,
        parameters: [n],
      }),
    );

const checkAuthorizedEmailsValid = (t: ExperimentTable): EasyEyesError[] => {
  if (t.colB("_calibrateMicrophonesBool").toUpperCase() !== "TRUE") return [];
  const invalid = (offender: string): EasyEyesError =>
    makeError({
      name: "The author email is invalid",
      message: "Each microphone calibration is stamped with _authorEmails.",
      hint: "Include parameter _authorEmails with a valid email (or several separated by semicolon).",
      parameters: [offender],
    });
  const emails = t.colB("_authorEmails");
  if (!emails) return [invalid("_authorEmails required")];
  for (const e of emails.split(";"))
    if (!e.includes("@")) return [invalid(e.trim())];
  return [];
};

const _COMMA_PARAMS = new Map([
  ["markDot", 7],
  ["markGrid", 7],
  ["markFlies", 10],
  ["fixationOriginXYScreen", 2],
]);
const checkCommaSeparatedStringsOfCorrectLength = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const e: EasyEyesError[] = [];
  for (const [name, expected] of _COMMA_PARAMS) {
    if (!t.params.includes(name)) continue;
    const offenders: Array<Offender<number>> = [];
    t.conditionValues(name).forEach((s, i) => {
      if (!s) return;
      const len = s.split(",").length;
      if (len !== expected)
        offenders.push({ columnNumber: i, offendingValue: len });
    });
    if (offenders.length)
      e.push(
        makeError({
          name: "Parameter value is a comma-separated string of the incorrect length.",
          message: `${name} expects a string of ${expected} values, ie a string with ${
            expected - 1
          } commas`,
          hint:
            "Incorrect number of values provided: " +
            verballyEnumerate(
              offenders.map(
                (o) =>
                  `expected ${expected}, got ${
                    o.offendingValue
                  } (column ${conditionIndexToColumnName(o.columnNumber)})`,
              ),
            ),
          parameters: [name],
        }),
      );
  }
  return e;
};

const checkTrackingOnForMovingFixation = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (!t.params.includes("markingFixationMotionRadiusDeg")) return [];
  const r = t.effectiveValues("markingFixationMotionRadiusDeg");
  const tr = t.effectiveValues("responseMustTrackContinuouslyBool");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++)
    if (Number(r[i]) !== 0 && tr[i].toLowerCase() !== "true") off.push(i);
  return off.length
    ? [
        makeError({
          name: "Tracking required for moving fixation",
          message:
            "When the fixation is moving, the final location is indeterminate. Set responseMustTrackContinuouslyBool to TRUE to enable tracking, during which the stimulus can be pre-computed in a known location.",
          hint: columnsHint(off),
          parameters: [
            "responseMustTrackContinuouslyBool",
            "markingFixationMotionRadiusDeg",
          ],
        }),
      ]
    : [];
};

const checkConditionsBeginInSecondColumn = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const off: string[] = [];
  for (const n of t.params)
    if (!n.startsWith("_") && t.colB(n) !== "") off.push(n);
  return off.length
    ? [
        makeError({
          name: "Non-underscore parameters provided in underscore parameter column",
          message:
            "These parameters are forbidden to use column B. Column B is reserved for underscore parameters.",
          hint: `For parameters ${limitedEnumerate(
            off,
          )}, select all the cells from column B and rightward, and shift them all one column to the right, to begin at column C.`,
          parameters: off,
        }),
      ]
    : [];
};

const checkUnderscoreParams = (t: ExperimentTable): EasyEyesError[] => {
  const unreg = new Set(["_about"]);
  const off: string[] = [];
  for (const n of t.params) {
    if (!n.startsWith("_") || unreg.has(n)) continue;
    if (t.conditionValues(n).some((v) => v !== "")) off.push(n);
  }
  return off.map((n) =>
    makeError({
      name: "_Underscore parameter incorrectly formatted",
      message: `Experiment-scope parameters, such as ${param(
        n,
      )}, start with an underscore and require at most one value, as they don't vary across conditions.`,
      hint: `Make sure that you give ${param(
        n,
      )} a value for only the first column.`,
      parameters: [n],
    }),
  );
};

const _languageStatement = `<br><br>This may not be your fault, as the definition of “_language” changed on July 19, 2026. It used to accept only a language name, like “English”, and now it only accepts a BCP-47 language code, like “en”.<br><br>• If you provided a language name, please change it to a language code. Some popular ones are: Arabic ar, Chinese (Simplified) zh-Hans, Chinese (Traditional) zh-Hant, English en, French fr, Hebrew he, Hindi hi, Italian it, Japanese ja, Persian fa, Russian, ru, Spanish es. Look up “_language” in the Glossary to see the [[NN]] language codes currently supported.<br><br>• If you provided a legal BCP-47 code not yet supported by EasyEyes, ask us to add it: denis.pelli@nyu.edu SUBJECT:EasyEyes.<br>`;

const checkParameterTypes = (t: ExperimentTable): EasyEyesError[] => {
  const e: EasyEyesError[] = [];
  const numberOfLanguageCodes = t.glossary("_language")?.categories?.length;
  for (const n of t.params) {
    const g = t.glossary(n);
    if (!g || !g.type) continue;
    // For underscore params: type-check ALL instances' col B (duplicates included)
    const vals: { value: string; block: number; instance?: number }[] =
      n.startsWith("_")
        ? t.allColBValues(n).map((v) => ({ value: v, block: 0 }))
        : t.isDuplicate(n)
        ? // Duplicated condition param: type-check EVERY instance, not just
          // the surviving one — otherwise the scientist could delete the
          // wrong copy and meet a hidden error on the next compile.
          t.allRawRows(n).flatMap((row, ri) =>
            Array.from({ length: t.conditionCount }, (_, ci) => ({
              value: row[ci + 2]?.trim() || ((g.default as string) ?? ""),
              block: ci + 1,
              instance: ri + 1,
            })),
          )
        : t.effectiveValues(n).map((v, i) => ({ value: v, block: i + 1 }));
    const vectorSpec = parseVectorType(g.type);
    const offenders = vals.filter((d) => !_typeCheck(g)(d.value));
    if (offenders.length) {
      const offendingMessage = offenders.map((o) => {
        const columnLabel =
          o.block >= 1 ? conditionIndexToColumnName(o.block - 1) : "B";
        const reason = vectorSpec
          ? `: ${checkVectorValue(vectorSpec, o.value).reason}`
          : "";
        const instance = o.instance ? ` (instance ${o.instance})` : "";
        return ` "${o.value}" [column ${columnLabel}]${instance}${reason}`;
      });
      // fontLanguage: friendlier message; codes are experimental.
      if (n === "fontLanguage") {
        const codes = offenders.map((o) => o.value).join('", "');
        e.push(
          makeError({
            name: "Unsupported fontLanguage code",
            message: `Sorry, the language code "${codes}" is not yet supported by the fontLanguage parameter. Write to denis.pelli@nyu.edu to ask that it be added.`,
            hint: `The erroneous values are: ${offendingMessage}.`,
            parameters: ["fontLanguage"],
          }),
        );
        continue;
      }
      let message = vectorSpec
        ? `All values for the parameter ${param(
            n,
          )} must be ${describeVectorType(vectorSpec)} (type "${g.type}").`
        : `All values for the parameter ${param(n)} must be ${g.type}.`;
      if (g.categories) {
        message =
          message + ` Valid categories are: ${g.categories.join(", ")}.`;
      }
      let languageStatement = "";
      if (n === "_language" && numberOfLanguageCodes) {
        languageStatement = _languageStatement.replace(
          "[[NN]]",
          numberOfLanguageCodes.toString(),
        );
      }
      e.push(
        makeError({
          name: "Parameter contains values of the wrong type",
          message,
          hint: `The erroneous values are: ${offendingMessage}. ${languageStatement}`,
          parameters: [n],
        }),
      );
    }
  }
  return e;
};

const _typeCheck = (g: GlossaryEntry): ((s: string) => boolean) => {
  const vectorSpec = parseVectorType(g.type);
  if (vectorSpec) return (s) => checkVectorValue(vectorSpec, s).ok;
  switch (g.type) {
    case "integer":
      return (s) => s === "" || (isNumeric(s) && Number.isInteger(Number(s)));
    case "numerical":
      return (s) => s === "" || isNumeric(s);
    case "boolean":
      return (s) =>
        s === "" || s.toLowerCase() === "true" || s.toLowerCase() === "false";
    case "categorical":
    case "multicategorical":
      return (s) =>
        s === "" ||
        getCategoriesFromString(s).every((c) => g.categories.includes(c));
    default:
      return () => true;
  }
};

const checkResponsePossible = (t: ExperimentTable): EasyEyesError[] => {
  const media = [
    "responseClickedBool",
    "responseTypedBool",
    "responseSpokenBool",
    "simulateParticipantBool",
  ];
  const inc = media.filter((m) => t.params.includes(m));
  const exc = media.filter((m) => !t.params.includes(m));
  const defaults = exc.map((m) => t.glossary(m)?.default ?? "FALSE");
  const off: number[] = [];
  for (let ci = 0; ci < t.conditionCount; ci++) {
    const hasInc = inc.some(
      (m) => t.effectiveValue(m, ci).toLowerCase() === "true",
    );
    const hasExc = exc.some((_, i) => defaults[i].toLowerCase() === "true");
    const vd = Number(t.effectiveValue("viewingDistanceDesiredCm", ci));
    const nk = Number(t.effectiveValue("needKeypadBeyondCm", ci));
    if (!hasInc && !hasExc && !(vd > nk)) off.push(ci);
  }
  return off.length
    ? [
        makeError({
          name: "Experiment lacks any response",
          message:
            "At the moment, your experiment doesn't allow any response to the stimulus, so the test would wait forever. Whether it's a simulated response or the participant typing, clicking, or tapping (their phone), the test needs some kind of response.",
          hint: "",
          parameters: [
            "responseClickedBool",
            "responseTypedBool",
            "responseTypedEasyEyesKeypadBool",
            "simulateParticipantBool",
          ],
        }),
      ]
    : [];
};

const checkBlockUniqueValuesConsistent = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const bp = [
    "viewingDistanceDesiredCm",
    "fixationLocationStrategy",
    "fixationOriginXYScreen",
    "targetKind",
    "simulateParticipantBool",
    "needKeypadBeyondCm",
    ...t.params.filter(isBlockShuffleGroupingParam),
  ];
  const e: EasyEyesError[] = [];
  const blocks = t.blocks();
  for (const p of bp) {
    if (!t.params.includes(p)) continue;
    const vals = t.effectiveValues(p);
    const byBlock = new Map<string, string>();
    const bad = new Set<string>();
    for (let i = 0; i < blocks.length; i++) {
      if (byBlock.has(blocks[i]) && byBlock.get(blocks[i]) !== vals[i])
        bad.add(blocks[i]);
      byBlock.set(blocks[i], vals[i]);
    }
    if (bad.size) {
      const badList = [...bad];
      const multiple = badList.length > 1;
      e.push(
        makeError({
          name: "Values are not unique within blocks",
          message: `This parameter requires that all conditions within a block have the same value. Block${
            multiple ? "s" : ""
          } ${verballyEnumerate(badList)} request${
            multiple ? "" : "s"
          } different values.`,
          hint: "",
          parameters: [p],
        }),
      );
    }
  }
  return e;
};

const checkShuffleGroupsContiguous = (t: ExperimentTable): EasyEyesError[] => {
  const gs = t.params.filter(isBlockShuffleGroupingParam);
  if (!gs.length) return [];
  const np: string[] = [];
  const nv: string[][] = [];
  for (const g of gs) {
    const vals = t.effectiveValues(g);
    if (!valuesContiguous(vals)) {
      np.push(g);
      nv.push([...getNoncontiguousValues(vals)]);
    }
  }
  if (!np.length) return [];
  const multiple = nv.length > 1 || nv[0].length > 1;
  const offendingValues = nv.map(
    (v, i) =>
      `${verballyEnumerate(v.map((s) => `<I>${s}</I>`))} (${param(np[i])})`,
  );
  return [
    makeError({
      name: "Block shuffle groups aren't contiguous",
      message: `The ${multiple ? "groups" : "group"} ${limitedEnumerate(
        offendingValues,
      )} ${multiple ? "were" : "was"} found to be non-contiguous.`,
      hint: "",
      parameters: np,
    }),
  ];
};
const checkShuffleGroupsSubsets = (t: ExperimentTable): EasyEyesError[] => {
  const all = Object.keys(getGlossary()).filter(isBlockShuffleGroupingParam);
  const pres = all.filter((g) => t.params.includes(g));
  if (pres.length <= 1) return [];
  const np: string[] = [];
  const nv: string[][] = [];
  for (let i = 1; i < all.length; i++) {
    const c = all[i],
      p = all[i - 1];
    if (!t.params.includes(c)) continue;
    const cv = t.effectiveValues(c);
    const pv = t.params.includes(p)
      ? t.effectiveValues(p)
      : new Array(t.conditionCount).fill("");
    const ns = new Set<string>();
    for (let ci = 0; ci < t.conditionCount; ci++)
      if (cv[ci] !== "" && pv[ci] === "") ns.add(cv[ci]);
    if (ns.size) {
      np.push(c);
      nv.push([...ns]);
    }
  }
  if (!np.length) return [];
  const multiple = nv.length > 1 || nv[0].length > 1;
  const offendingValues = nv.map(
    (l, i) =>
      `${verballyEnumerate(l.map((s) => `<I>${s}</I>`))} (${param(np[i])})`,
  );
  return [
    makeError({
      name: "Block shuffle groups not a subset of containing groups",
      message: `Every ${param(
        "blockShuffleGroupN",
      )} group must belong to some ${param(
        "blockShuffleGroupN-1",
      )} group. The ${multiple ? "groups" : "group"} ${limitedEnumerate(
        offendingValues,
      )} ${
        multiple ? "were" : "was"
      } found to not be a subset of a containing group.`,
      hint: "",
      parameters: np,
    }),
  ];
};

// The pair guards the two trial-initiation modes.
const checkMutuallyExclusiveParameters = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const groups: string[][] = [
    ["responseMustTrackContinuouslyBool", "responseMustClickCrosshairBool"],
  ];
  const off: [string[], string][] = [];
  for (const g of groups) {
    const pres = g.filter((p) => t.params.includes(p));
    if (pres.length <= 1) continue;
    const enabled = t.params.includes("conditionEnabledBool")
      ? t
          .effectiveValues("conditionEnabledBool")
          .map((v) => v.toLowerCase() === "true")
      : new Array(t.conditionCount).fill(true);
    for (let ci = 0; ci < t.conditionCount; ci++) {
      if (!enabled[ci]) continue;
      const tp = pres.filter(
        (p) => t.effectiveValue(p, ci).toLowerCase() === "true",
      );
      if (tp.length > 1) off.push([tp, conditionIndexToColumnName(ci)]);
    }
  }
  if (!off.length) return [];
  const parameterAndConditionsStrings = off.map(
    ([params, column]) => `${verballyEnumerate(params)} (column ${column})`,
  );
  return [
    makeError({
      name: "Multiple mutually exclusive parameters are true in the same condition",
      message: `Certain groups of parameters can't have multiple set to TRUE. ${verballyEnumerate(
        parameterAndConditionsStrings,
      )} are mutually exclusive.`,
      hint: "",
      parameters: [...new Set(off.map((o) => o[0]).flat())],
    }),
  ];
};

const checkCrosshairTrackingValues = (t: ExperimentTable): EasyEyesError[] => {
  const e: EasyEyesError[] = [];
  const neg: [string, number][] = [];
  t.effectiveValues("markingFixationStrokeThickening").forEach((v, i) => {
    if (Number(v) < 0) neg.push([v, i]);
  });
  if (neg.length) {
    const offending = verballyEnumerate(
      neg.map(([v, i]) => `${v} (column ${conditionIndexToColumnName(i)})`),
    );
    const plural = neg.length > 1;
    e.push(
      makeError({
        name: "Negative marking fixation stroke thickening value",
        message: `Values for markingFixationStrokeThickening must be non-negative multipliers. ${offending} ${
          plural ? "are" : "is"
        } negative`,
        hint: "",
        parameters: ["markingFixationStrokeThickening"],
      }),
    );
  }
  const maxS = t.effectiveValues("responseMustTrackMaxSec");
  const minS = t.effectiveValues("responseMustTrackMinSec");
  const bad: [string[], number][] = [];
  for (let i = 0; i < t.conditionCount; i++)
    if (Number(maxS[i]) < Number(minS[i]) || Number(minS[i]) < 0)
      bad.push([[minS[i], maxS[i]], i]);
  if (bad.length) {
    const offending = verballyEnumerate(
      bad.map(
        ([[min, max], i]) =>
          `[${min}, ${max}] (column ${conditionIndexToColumnName(i)})`,
      ),
    );
    const plural = bad.length > 1;
    e.push(
      makeError({
        name: "Ill-defined fixation tracking interval",
        message: `For each condition, it is required that ${param(
          "responseMustTrackMinSec <= responseMustTrackMaxSec",
        )}. The interval${plural ? "s" : ""} ${offending} ${
          plural ? "are" : "is"
        } poorly-formed.`,
        hint: "",
        parameters: ["responseMustTrackMinSec", "responseMustTrackMaxSec"],
      }),
    );
  }
  return e;
};
const checkFixationLocation = (t: ExperimentTable): EasyEyesError[] => {
  if (!t.params.includes("fixationOriginXYScreen")) return [];
  const pos = t
    .effectiveValues("fixationOriginXYScreen")
    .map((s) => s.split(",").map(Number));
  const allowed = t.effectiveValues("fixationRequestedOffscreenBool");
  const off: Array<Offender<number[]>> = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (allowed[i].toLowerCase() === "true") continue;
    if (pos[i].some((z: number) => z > 1 || z < 0))
      off.push({ columnNumber: i, offendingValue: pos[i] });
  }
  return off.length
    ? [
        makeError({
          name: "Invalid fixation location requested",
          message: `Fixation was requested offscreen, ie ${param(
            "fixationOriginXYScreen",
          )} out of range [[0,0],[1,1]], where ${param(
            "fixationRequestedOffscreenBool",
          )} is false.`,
          hint:
            "Invalid fixation positions: " +
            verballyEnumerate(
              off.map(
                (o) =>
                  `${o.offendingValue} (column ${conditionIndexToColumnName(
                    o.columnNumber,
                  )})`,
              ),
            ),
          parameters: [
            "fixationOriginXYScreen",
            "fixationRequestedOffscreenBool",
          ],
        }),
      ]
    : [];
};
const checkThresholdParameterForRsvpReading = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const tp = t.effectiveValues("thresholdParameter"),
    tk = t.effectiveValues("targetKind");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++)
    if (tk[i] === "rsvpReading" && tp[i].trim() === "") off.push(i);
  return off.length
    ? [
        makeError({
          name: "No thresholdParameter provided for rsvpReading task",
          message: `A non-empty ${param(
            "thresholdParameter",
          )} must be provided when ${param("targetKind")} == "rsvpReading".`,
          hint: columnsHint(off) + ".",
          parameters: ["thresholdParameter", "targetKind"],
        }),
      ]
    : [];
};
const checkThresholdParameterForDetectOrIdentify = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const tp = t.effectiveValues("thresholdParameter"),
    tt = t.effectiveValues("targetTask"),
    tsl = t.effectiveValues("targetSoundList");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    const isDI = tt[i] === "detect" || (tt[i] === "identify" && tsl[i] === "");
    if (isDI && tp[i].trim() === "") off.push(i);
  }
  return off.length
    ? [
        makeError({
          name: "No thresholdParameter provided for detect or identify task",
          message: `When ${param(
            "targetTask",
          )} is "detect" or "identify", ${param(
            "thresholdParameter",
          )} must specify a target metric: targetSizeDeg, spacingDeg, targetSoundDBSPL, etc.`,
          hint: columnsHint(off) + ".",
          parameters: ["thresholdParameter", "targetTask"],
        }),
      ]
    : [];
};
const checkTargetTaskPresent = (t: ExperimentTable): EasyEyesError[] => {
  const tt = t.effectiveValues("targetTask");
  const qa = t.params.filter(
    (p) => p.includes("questionAndAnswer") || p.includes("questionAnswer"),
  );
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tt[i].trim() !== "") continue;
    // Empty targetTask is allowed only when EasyEyes can infer questionAndAnswer,
    // i.e. a questionAndAnswer/questionAnswer parameter has a value in this condition.
    const inferableQA = qa.some((p) => t.effectiveValue(p, i).trim() !== "");
    if (!inferableQA) off.push(i);
  }
  if (!off.length) return [];
  const plural = off.length > 1;
  return [
    makeError({
      name: "No targetTask provided",
      message: `Lacking a ${param(
        "targetTask",
      )}, EasyEyes cannot determine the purpose of ${
        plural ? "these blocks" : "this block"
      }. Every block needs a ${param(
        "targetTask",
      )} so EasyEyes knows what to do: present a task, ask a question, or display text.`,
      hint: `Set ${param(
        "targetTask",
      )} to one of: "identify", "detect", "questionAnswer", "questionAndAnswer", or "adjust". To display a page of text (e.g. reading or a beauty rating), use ${param(
        "targetTask",
      )}="identify" with ${param("targetKind")}="reading" and ${param(
        "thresholdParameter",
      )}="targetDurationSec".<br/>Note: "questionAnswer" is the newer version and will eventually replace "questionAndAnswer".<br/>${
        columnsHint(off) + "."
      }`,
      parameters: ["targetTask"],
    }),
  ];
};
const checkTargetKindPresent = (t: ExperimentTable): EasyEyesError[] => {
  const tk = t.effectiveValues("targetKind");
  const tt = t.effectiveValues("targetTask");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tk[i] !== "") continue;
    // Empty targetKind is legal only for questionAndAnswer conditions, which
    // need no stimulus kind. (Q&A-only conditions have empty targetTask.)
    const needsKind = getCategoriesFromString(tt[i]).some(
      (s) => s !== "" && s !== "questionAndAnswer" && s !== "questionAnswer",
    );
    if (needsKind) off.push(i);
  }
  if (!off.length) return [];
  const plural = off.length > 1;
  return [
    makeError({
      name: "No targetKind provided",
      message: `Lacking a ${param(
        "targetKind",
      )}, EasyEyes cannot determine what stimulus to present for the given ${param(
        "targetTask",
      )} (${plural ? "conditions" : "condition"}). `,
      hint: `An empty ${param(
        "targetKind",
      )} is only defined for questionAndAnswer conditions.<br/>${
        columnsHint(off) + "."
      }`,
      parameters: ["targetKind"],
    }),
  ];
};
const checkRsvpReadingWordsMultiple = (t: ExperimentTable): EasyEyesError[] => {
  const tk = t.effectiveValues("targetKind"),
    nw = t.effectiveValues("rsvpReadingNumberOfWords"),
    wps = t.effectiveValues("rsvpReadingWordsPerScreen");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tk[i] !== "rsvpReading") continue;
    if (Number(wps[i]) > 0 && Number(nw[i]) % Number(wps[i]) !== 0) off.push(i);
  }
  return off.length
    ? [
        makeError({
          name: "rsvpReadingNumberOfWords is not a multiple of rsvpReadingWordsPerScreen",
          message: `${param(
            "rsvpReadingNumberOfWords",
          )} must be a multiple of ${param(
            "rsvpReadingWordsPerScreen",
          )} so that each screen displays the same number of words.`,
          hint: columnsHint(off) + ".",
          parameters: ["rsvpReadingNumberOfWords", "rsvpReadingWordsPerScreen"],
        }),
      ]
    : [];
};
const checkFlankerTypeDefinedAtLocation = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const tk = t.effectiveValues("targetKind"),
    tt = t.effectiveValues("targetTask"),
    tp = t.effectiveValues("thresholdParameter");
  const xa = t.effectiveValues("targetEccentricityXDeg"),
    ya = t.effectiveValues("targetEccentricityYDeg"),
    sd = t.effectiveValues("spacingDirection");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tk[i] !== "letter" || tt[i] !== "identify" || tp[i] !== "spacingDeg")
      continue;
    const fov = Number(xa[i]) === 0 && Number(ya[i]) === 0;
    const fovF = ["horizontal", "vertical", "horizontalAndVertical"].includes(
      sd[i],
    );
    if (fov !== fovF) off.push(i);
  }
  return off.length
    ? [
        makeError({
          name: "Requested flanker type is undefined at requested eccentricity",
          message:
            "Horizontal and vertical flankers are only defined at the fovea; radial and tangential flankers are only defined at the periphery.",
          hint: columnsHint(off),
          parameters: [
            "spacingDirection",
            "targetEccentricityXDeg",
            "targetEccentricityYDeg",
            "targetKind",
            "targetTask",
          ],
        }),
      ]
    : [];
};
const checkCorpusSpecifiedForReadingTasks = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const tk = t.effectiveValues("targetKind"),
    rc = t.effectiveValues("readingCorpus");
  const e: EasyEyesError[] = [];
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++)
    if (tk[i].includes("eading") && rc[i] === "") off.push(i);
  if (off.length)
    e.push(
      makeError({
        name: "No corpus specified for reading task",
        message: `A source text file, or corpus, must be provided when ${param(
          "targetKind == reading",
        )} or ${param("targetKind == rsvpReading")}.`,
        hint: columnsHint(off),
        parameters: ["readingCorpus", "targetKind"],
      }),
    );
  if (t.params.includes("readingCorpusFoils")) {
    const foils = t.effectiveValues("readingCorpusFoils");
    const foilsOff: number[] = [];
    for (let i = 0; i < t.conditionCount; i++)
      if (foils[i] !== "" && tk[i] !== "rsvpReading") foilsOff.push(i);
    if (foilsOff.length)
      e.push(
        makeError({
          name: "Invalid reading corpus foils",
          message: `At the moment, readingCorpusFoils is only allowed when ${param(
            "targetKind == rsvpReading",
          )}.`,
          hint: columnsHint(foilsOff),
          parameters: ["readingCorpusFoils", "targetKind"],
        }),
      );
  }
  return e;
};
const checkThresholdAllowedTrialsOverRequested = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (!t.params.includes("thresholdAllowedTrialRatio")) return [];
  const off: [string, number][] = [];
  t.effectiveValues("thresholdAllowedTrialRatio").forEach((v, i) => {
    if (Number(v) < 1) off.push([v, i]);
  });
  return off.length
    ? [
        makeError({
          name: "thresholdAllowedTrialRatio is less than one",
          message:
            "thresholdAllowedTrialRatio must be greater than or equal to one.",
          hint: columnsHint(off.map(([_, i]) => i)),
          parameters: ["thresholdAllowedTrialRatio"],
        }),
      ]
    : [];
};
const checkCalibrationTimesNotZero = (t: ExperimentTable): EasyEyesError[] => {
  if (!t.params.includes("calibrateScreenSizeTimes")) return [];
  const off: number[] = [];
  t.effectiveValues("calibrateScreenSizeTimes").forEach((v, i) => {
    if (Number(v) === 0) off.push(i);
  });
  return off.length
    ? [
        makeError({
          name: "Calibration times cannot be zero",
          message:
            "calibrateScreenSizeTimes cannot be zero. Please set it to a positive integer value.",
          hint: columnsHint(off),
          parameters: ["calibrateScreenSizeTimes"],
        }),
      ]
    : [];
};
const checkImageTargetKindParametersValid = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (
    !t.params.includes("targetKind") ||
    !t.params.includes("targetImageFolder") ||
    !t.params.includes("targetTask")
  )
    return [];
  const tk = t.effectiveValues("targetKind"),
    tif = t.effectiveValues("targetImageFolder"),
    tt = t.effectiveValues("targetTask");
  const e: EasyEyesError[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tk[i] !== "image") continue;
    if (!tif[i])
      e.push(
        makeError({
          name: "Image folder is not specified",
          message:
            'When targetKind is "image", then targetImageFolder must be present.',
          hint: "Please check the targetKind and targetImageFolder parameters.",
          parameters: ["targetImageFolder"],
        }),
      );
    if (
      tt[i] !== "identify" &&
      tt[i] !== "questionAndAnswer" &&
      tt[i] !== "adjust"
    )
      e.push(
        makeError({
          name: "Invalid target task",
          message:
            'When targetKind is "image", then targetTask should either be "identify" or "questionAndAnswer".',
          hint: "Please check the targetKind and targetTask parameters.",
          parameters: ["targetTask"],
        }),
      );
  }
  return e;
};
const checkShowImageSpareFractionForQuestionAnswer = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (!t.params.includes("showImage")) return [];
  const qa = t.params.filter(
    (p) => p.includes("questionAndAnswer") || p.includes("questionAnswer"),
  );
  if (!qa.length) return [];
  const si = t.effectiveValues("showImage"),
    sf = t.effectiveValues("showImageSpareFraction");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (!si[i]) continue;
    if (!qa.some((p) => t.effectiveValue(p, i) !== "")) continue;
    const f = Number(sf[i]);
    if (!Number.isFinite(f) || f <= 0) off.push(i);
  }
  if (!off.length) return [];
  const plural = off.length > 1;
  return [
    makeError({
      name: "showImageSpareFraction must be > 0 when combining showImage with questionAnswer",
      message: `When ${param("showImage")} is set and a ${param(
        "questionAnswer",
      )} parameter is also provided, ${param(
        "showImageSpareFraction",
      )} must be greater than 0 to leave room for the question.`,
      hint: `The offending ${
        plural ? "columns are" : "column is"
      }: ${verballyEnumerate(off.map((b) => conditionIndexToColumnName(b)))}`,
      parameters: ["showImage", "showImageSpareFraction", "questionAnswer"],
    }),
  ];
};
const checkTargetImageSpareFractionRange = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (!t.params.includes("targetImageSpareFraction")) return [];
  const sf = t.effectiveValues("targetImageSpareFraction");
  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    const f = Number(sf[i]);
    if (!Number.isFinite(f) || f < 0 || f >= 1) off.push(i);
  }
  if (!off.length) return [];
  const plural = off.length > 1;
  return [
    makeError({
      name: "targetImageSpareFraction must be at least 0 and less than 1",
      message: `${param(
        "targetImageSpareFraction",
      )} is the fraction of the screen reserved for the question, so it must be at least 0 and less than 1.`,
      hint: `The offending ${
        plural ? "columns are" : "column is"
      }: ${verballyEnumerate(off.map((b) => conditionIndexToColumnName(b)))}`,
      parameters: ["targetImageSpareFraction"],
    }),
  ];
};
// Warn only where it matters: image/reading shown with a questionAndAnswer,
// whose question sits in the spare section. ≤0.2 (incl. default 0) risks overlap.
const checkTargetImageSpareFractionTooSmall = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (!t.params.includes("targetImageSpareFraction")) return [];
  if (!t.params.includes("targetKind")) return [];

  const questionParams = t.params.filter(
    (p) => p.includes("questionAndAnswer") || p.includes("questionAnswer"),
  );
  if (questionParams.length === 0) return [];

  const targetKind = t.effectiveValues("targetKind");
  const spareFraction = t.effectiveValues("targetImageSpareFraction");
  const questionValues = questionParams.map((p) => t.effectiveValues(p));

  const off: number[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    const kind = String(targetKind[i]).trim();
    if (kind !== "image" && kind !== "reading") continue;
    const hasQuestion = questionValues.some(
      (vals) => vals[i] !== undefined && String(vals[i]).trim().length > 0,
    );
    if (!hasQuestion) continue;
    const f = Number(spareFraction[i]);
    if (!Number.isFinite(f) || f <= 0.2) off.push(i);
  }
  if (!off.length) return [];
  const plural = off.length > 1;
  return [
    makeCaution({
      name: "⚠️ targetImageSpareFraction CAUTION",
      message: `When an image (targetKind=image) or a page of text (targetKind=reading) is shown together with a questionAndAnswer, ${param(
        "targetImageSpareFraction",
      )} is the fraction of the screen reserved for the question. A value at or below 0.2 (including the default 0) leaves little or no room, so the question may overlap the target. We suggest about 0.3.`,
      hint: `The offending ${
        plural ? "columns are" : "column is"
      }: ${verballyEnumerate(off.map((b) => conditionIndexToColumnName(b)))}`,
      parameters: ["targetImageSpareFraction"],
    }),
  ];
};
const checkScreenSizeParametersValid = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const e: EasyEyesError[] = [];
  const chk = (p: string, name: string, pred: (n: number) => boolean) => {
    if (!t.params.includes(p)) return;
    const off: number[] = [];
    t.effectiveValues(p).forEach((v, i) => {
      if (pred(Number(v))) off.push(i);
    });
    if (off.length)
      e.push(
        makeError({
          name,
          message: "Screen size parameters must be positive.",
          hint: columnsHint(off),
          parameters: [p],
        }),
      );
  };
  chk(
    "targetMinPhysicalPx",
    "Screen size parameters are not positive",
    (n) => n <= 0,
  );
  chk(
    "needTargetAsSmallAsDeg",
    "Screen size parameters are not positive",
    (n) => n <= 0,
  );
  chk(
    "needScreenWidthDeg",
    "Screen size parameters are negative",
    (n) => n < 0,
  );
  chk(
    "needScreenHeightDeg",
    "Screen size parameters are negative",
    (n) => n < 0,
  );
  return e;
};
const checkVernierUsingCorrectThreshold = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (
    !t.params.includes("thresholdParameter") ||
    !t.params.includes("targetKind")
  )
    return [];
  const tp = t.effectiveValues("thresholdParameter"),
    tk = t.effectiveValues("targetKind");
  const errors: EasyEyesError[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tp[i] === "targetOffsetDeg" && tk[i] !== "vernier")
      errors.push(
        makeError({
          name: "thresholdParameter=targetOffsetDeg requires targetKind=vernier",
          message:
            "By setting thresholdParameter = targetOffsetDeg, you must set targetKind = vernier.",
          hint: `The erroneous value is ${
            tk[i]
          } at column ${conditionIndexToColumnName(i)}`,
          parameters: ["targetKind"],
        }),
      );
    else if (tp[i] !== "targetOffsetDeg" && tk[i] === "vernier")
      errors.push(
        makeError({
          name: "vernier targetKind requires thresholdParameter=targetOffsetDeg",
          message:
            "By setting targetKind = vernier, you must set thresholdParameter = targetOffsetDeg.",
          hint: `The erroneous value is ${
            tp[i]
          } at column ${conditionIndexToColumnName(i)}`,
          parameters: ["thresholdParameter"],
        }),
      );
  }
  return errors;
};

const checkQuestionsProvidedForQuestionAndAnswer = (
  t: ExperimentTable,
): EasyEyesError[] => {
  const qa = t.params.filter(
    (p) => p.includes("questionAndAnswer") || p.includes("questionAnswer"),
  );
  if (!qa.length) return [];
  const tt = t.effectiveValues("targetTask"),
    tk = t.effectiveValues("targetKind");
  const off: { value: string; block: number }[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (!qa.some((p) => t.effectiveValue(p, i) !== "")) continue;
    const ok =
      tt[i] === "" ||
      tt[i] === "questionAndAnswer" ||
      tt[i] === "questionAnswer" ||
      (tt[i] === "identify" && tk[i] === "image");
    if (!ok) off.push({ value: tt[i], block: i });
  }
  if (!off.length) return [];
  const plural = off.length > 1;
  return [
    makeError({
      name: "questionAndAnswer parameters not allowed",
      message: `questionAndAnswer parameters are only allowed when ${param(
        "targetTask",
      )} is empty (""), when ${param(
        "targetTask",
      )} = "questionAndAnswer", or when ${param(
        "targetTask",
      )} = "identify" AND ${param("targetKind")} ="image".`,
      hint: `The erroneous ${
        plural ? "columns are" : "column is"
      }: ${verballyEnumerate(
        off.map((o) => conditionIndexToColumnName(o.block)),
      )}`,
      parameters: ["questionAndAnswer", "targetTask", "targetKind"],
    }),
  ];
};

const checkEasyEyesLettersVersionParametersValid = (
  t: ExperimentTable,
): EasyEyesError[] => {
  if (!t.params.includes("EasyEyesLettersVersion")) return [];
  const ev = t.effectiveValues("EasyEyesLettersVersion"),
    sr = t.effectiveValues("spacingRelationToSize");
  const sd = t.effectiveValues("spacingDirection"),
    ss = t.effectiveValues("spacingSymmetry");
  const tk = t.effectiveValues("targetKind");
  const errors: EasyEyesError[] = [];
  for (let i = 0; i < t.conditionCount; i++) {
    if (tk[i] !== "letter") continue;
    if (ev[i] !== "2" || sr[i] !== "ratio") continue;
    if (ss[i] !== "screen") {
      errors.push(
        makeError({
          name: "Unsupported combination of parameters",
          message:
            'Using EasyEyesLettersVersion=2 and spacingRelationToSize=ratio, currently spacingSymmetry must be "screen".',
          hint: "",
          parameters: [
            "spacingSymmetry",
            "spacingRelationToSize",
            "EasyEyesLettersVersion",
          ],
        }),
      );
    }
    if (sd[i] === "horizontalAndVertical" || sd[i] === "radialAndTangential") {
      errors.push(
        makeError({
          name: "Unsupported combination of parameters",
          message:
            'Using EasyEyesLettersVersion=2 and spacingRelationToSize=ratio, currently spacingDirection direction cannot be "horizontalAndVertical" or "radialAndTangential". Use "horizontal", "vertical", "radial", or "tangential".',
          hint: "",
          parameters: [
            "spacingDirection",
            "spacingRelationToSize",
            "EasyEyesLettersVersion",
          ],
        }),
      );
    }
  }
  return errors;
};

// vertical-rl/vertical-lr are valid glossary categories (pass type check) but
// vertical layout is unimplemented; the runtime would silently fall back to
// horizontal. Remove this check once vertical layout ships.
const checkFontDirectionVertical = (t: ExperimentTable): EasyEyesError[] => {
  if (!t.params.includes("fontDirection")) return [];
  const vals = t.effectiveValues("fontDirection");
  const offending = vals
    .map((value, i) => ({ value, block: i + 1 }))
    .filter(({ value }) => value === "vertical-rl" || value === "vertical-lr");
  if (!offending.length) return [];
  const offendingMessage = offending.map(
    (o) => ` "${o.value}" [column ${conditionIndexToColumnName(o.block - 1)}]`,
  );
  const values = offending.map((o) => o.value).join('", "');
  return [
    makeError({
      name: "fontDirection vertical not yet implemented",
      message:
        `fontDirection "${values}" is not yet implemented. Vertical text ` +
        `layout (writing-mode) is planned, primarily to support Japanese, but is ` +
        `not available yet. Please use "ltr" or "rtl".`,
      hint: `The unimplemented value(s): ${offendingMessage}. Write to denis.pelli@nyu.edu to ask about vertical support.`,
      parameters: ["fontDirection"],
    }),
  ];
};

// The Canvas API has no font-feature-settings; values are baked into the font
// by the Rust GSUB baker, so invalid strings must be caught at compile time.
const checkFontFeatureSettings = (t: ExperimentTable): EasyEyesError[] => {
  if (!t.params.includes("fontFeatureSettings")) return [];
  const vals = t.effectiveValues("fontFeatureSettings");
  const offending: {
    value: string;
    block: number;
    tag: string;
    reason: string;
    suggestion?: string;
  }[] = [];
  vals.forEach((value, i) => {
    if (value === "") return;
    for (const o of validateFeatureSettingsString(value)) {
      offending.push({ value, block: i + 1, ...o });
    }
  });
  if (!offending.length) return [];
  const hintBlob = offending
    .map((o) => {
      const col = conditionIndexToColumnName(o.block - 1);
      const where = `"${o.tag}" [column ${col}]`;
      if (o.reason === "unknown-tag") {
        return o.suggestion
          ? `• ${where}: unknown tag. Did you mean "${o.suggestion}"?`
          : `• ${where}: unknown tag.`;
      }
      if (o.reason === "malformed-tag") {
        return `• ${where}: a tag must be 1–4 letters or digits.`;
      }
      return `• ${where}: value must be "on", "off", or an integer.`;
    })
    .join("<br/>");
  return [
    makeError({
      name: "Invalid fontFeatureSettings",
      message:
        'fontFeatureSettings has invalid entries. Each is a 1–4 letter/digit OpenType tag, optionally followed by a value ("on", "off", or integer), e.g. "calt" 1.',
      hint: hintBlob,
      parameters: ["fontFeatureSettings"],
    }),
  ];
};

// The generic multicategorical check can't see keyword contradictions, and
// the runtime's last-wins rule would silently pick one.
const checkFontVariantLigatures = (t: ExperimentTable): EasyEyesError[] => {
  if (!t.params.includes("fontVariantLigatures")) return [];
  const vals = t.effectiveValues("fontVariantLigatures");
  const offending: { value: string; block: number }[] = [];
  vals.forEach((value, i) => {
    if (hasLigatureContradiction(value))
      offending.push({ value, block: i + 1 });
  });
  if (!offending.length) return [];
  const hintBlob = offending
    .map(
      (o) =>
        `• "${o.value}" [column ${conditionIndexToColumnName(o.block - 1)}]`,
    )
    .join("<br/>");
  return [
    makeError({
      name: "Contradictory fontVariantLigatures",
      message:
        'fontVariantLigatures has contradictory keywords: "normal" and "none" must appear alone, and each keyword conflicts with its "no-" form.',
      hint: hintBlob,
      parameters: ["fontVariantLigatures"],
    }),
  ];
};

// Feature baking needs the font bytes; browser fonts can't be fetched, so
// any feature setting on fontSource=browser would be a silent no-op.
const checkFontFeatureBrowserGate = (t: ExperimentTable): EasyEyesError[] => {
  const hasFfs = t.params.includes("fontFeatureSettings");
  const hasSs = t.params.includes("fontStylisticSets");
  const hasLig = t.params.includes("fontVariantLigatures");
  if (!hasFfs && !hasSs && !hasLig) return [];
  const sources = t.params.includes("fontSource")
    ? t.effectiveValues("fontSource")
    : Array(t.conditionCount).fill(
        getGlossary()["fontSource"]?.default || "file",
      );
  const ffs = hasFfs ? t.effectiveValues("fontFeatureSettings") : [];
  const ss = hasSs ? t.effectiveValues("fontStylisticSets") : [];
  const lig = hasLig ? t.effectiveValues("fontVariantLigatures") : [];
  const offending: { params: string[]; block: number }[] = [];
  for (let i = 0; i < sources.length; i++) {
    if ((sources[i] || "").trim() !== "browser") continue;
    const params: string[] = [];
    const ffsValue = (ffs[i] ?? "").trim();
    if (ffsValue && ffsValue !== "normal") params.push("fontFeatureSettings");
    if ((ss[i] ?? "").trim()) params.push("fontStylisticSets");
    if (variantLigaturesToFeatureEntries(lig[i] ?? "").length > 0)
      params.push("fontVariantLigatures");
    if (params.length) offending.push({ params, block: i + 1 });
  }
  if (!offending.length) return [];
  const hintBlob = offending
    .map(
      (o) =>
        `• ${o.params.join(", ")} [column ${conditionIndexToColumnName(
          o.block - 1,
        )}]`,
    )
    .join("<br/>");
  return [
    makeError({
      name: "fontSource=browser does not support font features",
      message:
        "Font features cannot be baked into browser fonts. Use fontSource file, google, or adobe.",
      hint: hintBlob,
      parameters: [...new Set(offending.flatMap((o) => o.params))],
    }),
  ];
};

// typeSquare is gated behind _typeSquareDistributionKey (pending glossary
// add); until then ALL typeSquare use is rejected. Once the param exists,
// make this conditional: key required iff typeSquare used.
const checkTypeSquareGate = (t: ExperimentTable): EasyEyesError[] => {
  if (!t.params.includes("fontSource")) return [];
  const fontSources = t.effectiveValues("fontSource");
  const offenders: { block: number; value: string }[] = [];
  fontSources.forEach((value, i) => {
    if (String(value).trim().toLowerCase() !== "typesquare") return;
    offenders.push({ block: i + 1, value: String(value) });
  });
  if (offenders.length === 0) return [];
  return [
    makeError({
      name: "typeSquare support is in progress",
      message:
        `fontSource=typeSquare is not yet supported — the experimenter must add ` +
        `the <span class="error-parameter">_typeSquareDistributionKey</span> ` +
        `underscore param to enable typeSquare. Until then, please use ` +
        `<span class="error-parameter">fontSource=file</span> instead. ` +
        `(Affected blocks: ${offenders.map((o) => o.block).join(", ")}.)`,
      hint: "Change fontSource=typeSquare to fontSource=file, or contact the EasyEyes team to enable typeSquare support.",
      parameters: ["fontSource"],
    }),
  ];
};

type TableCheck = (t: ExperimentTable) => EasyEyesError[];

/**
 * Runs one check; a crash becomes a reportable error instead of silently
 * disabling all remaining table validation.
 */
export const runSafely = (
  check: TableCheck,
  t: ExperimentTable,
): EasyEyesError[] => {
  try {
    return check(t);
  } catch (e) {
    return [
      makeError({
        name: `Compiler bug in table check ${check.name}`,
        message: `The EasyEyes compiler itself hit an unexpected error while checking your experiment table: ${
          e instanceof Error ? e.message : String(e)
        }`,
        hint: "Please report this to the EasyEyes team. Any other problems in your table are still reported normally.",
        parameters: [],
      }),
    ];
  }
};

/**
 * The table-check registry. Adding a check = adding ONE LINE here.
 * Output is stably sorted by parameters[0]; order here only breaks ties,
 * so keep checkConditionsBeginInSecondColumn first (pinned tie order).
 */
export const TABLE_CHECKS: ReadonlyArray<TableCheck> = [
  checkConditionsBeginInSecondColumn,
  checkGlossaryParametersProper,
  checkGlossaryVectorDefaults,
  checkParametersAlphabetical,
  checkParametersDuplicated,
  checkParametersRecognized,
  checkAuthorizedEmailsValid,
  checkCommaSeparatedStringsOfCorrectLength,
  checkTrackingOnForMovingFixation,
  checkUnderscoreParams,
  checkParameterTypes,
  checkResponsePossible,
  checkBlockUniqueValuesConsistent,
  checkShuffleGroupsContiguous,
  checkShuffleGroupsSubsets,
  checkMutuallyExclusiveParameters,
  checkCrosshairTrackingValues,
  checkFixationLocation,
  checkThresholdParameterForRsvpReading,
  checkThresholdParameterForDetectOrIdentify,
  checkTargetTaskPresent,
  checkTargetKindPresent,
  checkRsvpReadingWordsMultiple,
  checkFlankerTypeDefinedAtLocation,
  checkCorpusSpecifiedForReadingTasks,
  checkMarkingOffsetZeroForPeripheralTarget,
  checkFontWeightAndWghtConflict,
  checkBlackoutScreenColorConflict,
  checkImpulseResponsePairs,
  checkThresholdAllowedTrialsOverRequested,
  checkCalibrationTimesNotZero,
  checkImageTargetKindParametersValid,
  checkShowImageSpareFractionForQuestionAnswer,
  checkTargetImageSpareFractionRange,
  checkTargetImageSpareFractionTooSmall,
  checkScreenSizeParametersValid,
  checkVernierUsingCorrectThreshold,
  checkQuestionsProvidedForQuestionAndAnswer,
  checkEasyEyesLettersVersionParametersValid,
  checkFontDirectionVertical,
  checkFontFeatureSettings,
  checkFontVariantLigatures,
  checkFontFeatureBrowserGate,
  checkTypeSquareGate,
  checkCalibrateDistanceCheckRequiresDistance,
  checkViewMonitorsXYDeg,
];

export const validateExperimentTable = (t: ExperimentTable): EasyEyesError[] =>
  TABLE_CHECKS.flatMap((check) => runSafely(check, t)).sort((a, b) =>
    // Tie order is snapshot-pinned — keep this exact comparator.
    // parameters[0] may be undefined (compiler-bug errors); comparisons
    // with undefined are false, so those sink deterministically.
    a.parameters[0] > b.parameters[0] ? 1 : -1,
  );
