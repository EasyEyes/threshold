/* ----------------------------- Trial Information Display ----------------------------- */

import { getInstructionColor } from "./color";
import {
  conditionNameConfig,
  font,
  letterConfig,
  readingPageStats,
  showConditionNameConfig as rawShowConditionNameConfig,
  viewingDistanceCm,
  thisExperimentInfo,
  targetEccentricityDeg,
  status,
} from "./global";
import type { TextStim, TargetKind } from "./types";
import { Screens } from "./multiple-displays/globals";
import { toFixedNumber } from "./utils";

// Type assertion for config object that gets modified at runtime
const showConditionNameConfig = rawShowConditionNameConfig as {
  name: string | undefined;
  show: boolean;
  targetSpecs: string | undefined;
  showTargetSpecs: boolean;
};

// Type for parameter reader function
export type ParamReader = {
  read: (param: string, blockCondition: string) => any;
};

// Type for stimulus parameters object
export type StimulusParameters = {
  [key: string]: any;
};

// Type for target specs builder function
export type TargetSpecsBuilder = (
  paramReader?: ParamReader,
  blockCondition?: string,
) => StimulusParameters;

/**
 * Configuration map for targetKind-specific specs.
 * Add new targetKinds here to extend support.
 * Uses glossary as source of truth with graceful fallback for unconfigured targetKinds.
 */
const targetSpecsConfig: Partial<Record<TargetKind, TargetSpecsBuilder>> = {
  letter: () => ({
    spacingRelationToSize: letterConfig.spacingRelationToSize,
    spacingOverSizeRatio: letterConfig.spacingOverSizeRatio,
    spacingSymmetry: letterConfig.spacingSymmetry,
    targetDurationSec: letterConfig.targetDurationSec,
    targetSizeIsHeightBool: letterConfig.targetSizeIsHeightBool,
  }),

  repeatedLetters: () => ({
    spacingRelationToSize: letterConfig.spacingRelationToSize,
    spacingOverSizeRatio: letterConfig.spacingOverSizeRatio,
    targetSizeIsHeightBool: letterConfig.targetSizeIsHeightBool,
  }),

  movie: (reader, BC) => {
    if (!reader || !BC) return {};
    return {
      targetEccentricityXDeg: reader.read("targetEccentricityXDeg", BC),
      targetEccentricityYDeg: reader.read("targetEccentricityYDeg", BC),
      targetContrast: reader.read("targetContrast", BC),
      targetCyclePerDeg: reader.read("targetCyclePerDeg", BC),
      targetHz: reader.read("targetHz", BC),
      thresholdParameter: reader.read("thresholdParameter", BC),
    };
  },

  reading: (reader, BC) => {
    if (!reader || !BC) return {};
    return {
      readingCorpus: reader.read("readingCorpus", BC),
      readingFirstFewWords: readingPageStats.readingPageSkipCorpusWords.get(BC)
        ?.length
        ? readingPageStats.readingPageSkipCorpusWords.get(BC)![
            readingPageStats.readingPageSkipCorpusWords.get(BC)!.length - 1
          ]
        : 0,
      readingLineSpacingDefineSingleAs: reader.read(
        "readingLineSpacingDefineSingleAs",
        BC,
      ),
      font: reader.read("font", BC),
      readingLinesPerPage: reader.read("readingLinesPerPage", BC),
      readingLineLengthUnit: reader.read("readingLineLengthUnit", BC),
      readingLineLength: reader.read("readingLineLength", BC),
      readingLineSpacingMultipleOfSingle: reader.read(
        "readingLineSpacingMultipleOfSingle",
        BC,
      ),
      readingNominalSizeDeg: reader.read("readingNominalSizeDeg", BC),
      readingNumberOfPossibleAnswers: reader.read(
        "readingNumberOfPossibleAnswers",
        BC,
      ),
      readingNumberOfQuestions: reader.read("readingNumberOfQuestions", BC),
      readingSetSizeBy: reader.read("readingSetSizeBy", BC),
      readingLineSpacingSingleDeg: reader.read(
        "readingLineSpacingSingleDeg",
        BC,
      ),
      readingSpacingDeg: reader.read("readingSpacingDeg", BC),
      readingXHeightDeg: reader.read("readingXHeightDeg", BC),
      readingXHeightPt: reader.read("readingXHeightPt", BC),
      readingNominalSizePt: reader.read("readingNominalSizePt", BC),
    };
  },

  rsvpReading: (reader, BC) => {
    if (!reader || !BC) return {};
    const readingSpecs = {
      readingCorpus: reader.read("readingCorpus", BC),
      readingFirstFewWords: readingPageStats.readingPageSkipCorpusWords.get(BC)
        ?.length
        ? readingPageStats.readingPageSkipCorpusWords.get(BC)![
            readingPageStats.readingPageSkipCorpusWords.get(BC)!.length - 1
          ]
        : 0,
      readingDefineSingeLineSpacingAs: reader.read(
        "readingLineSpacingDefineSingleAs",
        BC,
      ),
      font: reader.read("font", BC),
      readingLineSpacingMultipleOfSingle: reader.read(
        "readingLineSpacingMultipleOfSingle",
        BC,
      ),
      readingNominalSizeDeg: reader.read("readingNominalSizeDeg", BC),
      readingSetSizeBy: reader.read("readingSetSizeBy", BC),
      readingLineSpacingSingleDeg: reader.read(
        "readingLineSpacingSingleDeg",
        BC,
      ),
      readingSpacingDeg: reader.read("readingSpacingDeg", BC),
      readingXHeightDeg: reader.read("readingXHeightDeg", BC),
      readingXHeightPt: reader.read("readingXHeightPt", BC),
      readingNominalSizePt: reader.read("readingNominalSizePt", BC),
    };
    const rsvpSpecs = {
      rsvpReadingFlankTargetWithLettersBool: reader.read(
        "rsvpReadingFlankTargetWithLettersBool",
        BC,
      ),
      rsvpReadingFlankerCharacterSet: reader.read(
        "rsvpReadingFlankerCharacterSet",
        BC,
      ),
      rsvpReadingNumberOfResponseOptions: reader.read(
        "rsvpReadingNumberOfResponseOptions",
        BC,
      ),
      rsvpReadingNumberOfWords: reader.read("rsvpReadingNumberOfWords", BC),
      rsvpReadingRequireUniqueWordsBool: reader.read(
        "rsvpReadingRequireUniqueWordsBool",
        BC,
      ),
    };
    return { ...readingSpecs, ...rsvpSpecs };
  },
};

/** Common specs shown for every targetKind; also the minimal fallback for unknown kinds. */
const getCommonSpecs = (): StimulusParameters => ({
  filename: thisExperimentInfo.experimentFilename,
  font: font.name,
  targetEccentricityXYDegs: [targetEccentricityDeg.x, targetEccentricityDeg.y],
  viewingDistanceCm: viewingDistanceCm.current,
});

/**
 * Check if a measured value is within tolerance
 */
export const isTimingOK = (measured: number, target: number): "OK" | "BAD" => {
  return measured < target ? "OK" : "BAD";
};

const desiredDigits: Record<string, number> = {
  Deg: 1,
  Degs: 1,
  Cm: 1,
  Px: 0,
  Sec: 3,
  DBSPL: 1,
  Pt: 0,
};

const toRound = (propName: string): RegExpMatchArray | null =>
  propName.match(/.*(Cm$)|(Degs?$)|(Px$)|(Sec$)|(DBSPL$)|(Pt$)/);

const formatSpecValue = (propName: string, value: any): string => {
  const match = toRound(propName);
  if (!match) return String(value);
  const digits = desiredDigits[match[0]] ?? 0;
  if (Array.isArray(value)) {
    const flat: number[] = ([] as number[]).concat(...value);
    return flat.map((v) => String(toFixedNumber(v, digits))).join(",");
  }
  if (typeof value === "number") return String(toFixedNumber(value, digits));
  return String(value);
};

/**
 * Convert specs object to formatted string for display.
 * Filters out empty values and rounds numeric values based on property name suffixes.
 */
const enumerateProvidedTargetSpecs = (specs: StimulusParameters): string => {
  const getSpecString = (propName: string): string =>
    `${propName}: ${formatSpecValue(propName, specs[propName])}`;

  return Object.keys(specs)
    .filter(
      (propName) =>
        specs[propName] !== "" &&
        !(Array.isArray(specs[propName]) && specs[propName].length === 0),
    )
    .sort()
    .map(getSpecString)
    .join("\n");
};

/**
 * Update the condition name position based on whether target specs are being shown
 * @deprecated The conditionNameConfig parameter is kept for backward compatibility but is ignored
 */
export const updateConditionNameConfig = (
  _conditionNameConfig: any,
  updateForTargetSpecs: boolean,
  targetSpecs: TextStim | null = null,
): void => {
  if (updateForTargetSpecs && targetSpecs) {
    conditionNameConfig.pos[0] = -window.innerWidth / 2;
    conditionNameConfig.pos[1] =
      -window.innerHeight / 2 +
      (targetSpecs.getBoundingBox() as { height: number }).height;
  } else {
    conditionNameConfig.pos[0] = -window.innerWidth / 2;
    conditionNameConfig.pos[1] = -window.innerHeight / 2;
  }
};

/**
 * Show the condition name (and adjust position if showing target specs)
 */
export const showConditionName = (
  conditionName: TextStim,
  targetSpecs: TextStim | null,
): void => {
  if (showConditionNameConfig.show) {
    conditionName.setText(String(showConditionNameConfig.name ?? ""));
    updateConditionNameConfig(
      conditionNameConfig,
      showConditionNameConfig.showTargetSpecs,
      targetSpecs,
    );
    conditionName.setPos(conditionNameConfig.pos);
    conditionName.setColor(
      getInstructionColor(String(status.block_condition ?? status.block ?? "")),
    );
    conditionName.setAutoDraw(true);
  }
};

/**
 * Update target specs with targetKind-specific defaults and provided specs.
 * Gracefully falls back to general specs only for unknown targetKinds with console warning.
 *
 * @param specs - Additional specs to include
 * @param targetKind - The target kind to get defaults for
 * @param paramReader - Optional parameter reader for dynamic specs
 * @param blockCondition - Optional block_condition for parameter reading
 */
export const updateTargetSpecs = (
  specs: StimulusParameters = {},
  targetKind?: TargetKind | string,
  paramReader?: ParamReader,
  blockCondition?: string,
): void => {
  const generalSpecs = getCommonSpecs();
  let targetSpecsString: string;

  if (targetKind) {
    const builder = targetSpecsConfig[targetKind as TargetKind];
    if (builder) {
      const kindSpecificSpecs = builder(paramReader, blockCondition);
      targetSpecsString = enumerateProvidedTargetSpecs({
        ...generalSpecs,
        ...kindSpecificSpecs,
        ...specs,
      });
    } else {
      // Graceful fallback for unknown targetKinds
      console.warn(
        `[showTrialInformation] Unknown targetKind "${targetKind}". ` +
          `Add it to targetSpecsConfig in showTrialInformation.ts for full support. ` +
          `Falling back to general specs only.`,
      );
      targetSpecsString = enumerateProvidedTargetSpecs({
        ...generalSpecs,
        ...specs,
      });
    }
  } else {
    targetSpecsString = enumerateProvidedTargetSpecs({
      ...generalSpecs,
      ...specs,
    });
  }

  showConditionNameConfig.targetSpecs = targetSpecsString;
};

/**
 * Draw target specs on screen. Centralizes the repetitive pattern from threshold.js.
 * Handles: setText, setPos, color update, setAutoDraw, and showConditionName.
 *
 * @param targetSpecs - The TextStim for target specs
 * @param conditionName - The TextStim for condition name
 * @param blockCondition - Optional block_condition for color lookup
 * @param options - Optional configuration
 * @param options.skipConditionName - If true, don't call showConditionName (default: false)
 * @param options.position - Optional custom position (defaults to bottom-left)
 */
export const drawTargetSpecs = (
  targetSpecs: TextStim,
  conditionName: TextStim,
  blockCondition?: string,
  options: { skipConditionName?: boolean; position?: [number, number] } = {},
): void => {
  if (!showConditionNameConfig.showTargetSpecs) return;

  const { skipConditionName = false, position } = options;

  targetSpecs.setText(showConditionNameConfig.targetSpecs ?? "");

  if (position) {
    targetSpecs.setPos(position);
  } else {
    targetSpecs.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
  }

  targetSpecs.setAutoDraw(true);

  if (!skipConditionName) {
    showConditionName(conditionName, targetSpecs);
  }
};

/**
 * Append a spec to the current targetSpecs string at runtime.
 * Useful for adding timing information after trial execution.
 *
 * @param key - The spec name
 * @param value - The spec value (will be converted to string)
 * @param suffix - Optional suffix to append after the value (e.g., " [OK]")
 */
export const appendTargetSpecs = (
  key: string,
  value: string | number,
  suffix?: string,
): void => {
  const valueStr = formatSpecValue(key, value);
  const suffixStr = suffix ? ` ${suffix}` : "";
  const newLine = `\n${key}: ${valueStr}${suffixStr}`;

  if (showConditionNameConfig.targetSpecs) {
    showConditionNameConfig.targetSpecs += newLine;
  } else {
    showConditionNameConfig.targetSpecs = `${key}: ${valueStr}${suffixStr}`;
  }
};
