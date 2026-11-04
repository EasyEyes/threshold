import type {
  ParameterReadValue,
  ParameterValue,
  ParamReader,
} from "./paramReader";

declare const reader: ParamReader;

export const blockValues: ParameterValue[] = reader.read("font", "1");
export const decimalCondition: ParameterValue = reader.read("font", "1.5");
export const exponentCondition: ParameterValue = reader.read("font", "1e2");
export const labelCondition: ParameterValue = reader.read("font", "1_1");

export const typedBlockValues: string[] = reader.readString("targetKind", "1");
export const typedDecimalCondition: string = reader.readString(
  "targetKind",
  "1.5",
);

export const matchingBlockValues: Map<string, string[]> =
  reader.readStringMatching(/question/, "1");
export const matchingDecimalCondition: Map<string, string> =
  reader.readStringMatching(/question/, "1.5");

declare const dynamicKey: string;
export const dynamicCondition: ParameterReadValue = reader.read(
  "font",
  dynamicKey,
);
// @ts-expect-error a condition-keyed read cannot be assigned to the block shape
export const dynamicNotBlock: ParameterValue[] = reader.read(
  "font",
  dynamicKey,
);
