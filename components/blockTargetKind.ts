import { safeExecuteFunc } from "./utils";

type DispatchHandler = (() => unknown) | undefined;
type DispatchMappings = Record<string, DispatchHandler | string>;
type Canonicalize = (name: string, mappings: DispatchMappings) => string;

const hasOwn = (mappings: DispatchMappings, name: string): boolean =>
  Object.prototype.hasOwnProperty.call(mappings, name);

const identity = (name: string): string => name;

const canonicalTaskName = (
  name: string,
  mappings: DispatchMappings,
): string => {
  if (
    name === "questionAnswer" &&
    !(hasOwn(mappings, name) && typeof mappings[name] === "string")
  )
    return "questionAndAnswer";
  return name;
};

const executeMapping = (
  name: string,
  mappings: DispatchMappings,
  canonicalize: Canonicalize = identity,
): void => {
  const canonicalName = canonicalize(name, mappings);
  if (!hasOwn(mappings, canonicalName)) return;
  const handler = mappings[canonicalName];
  if (typeof handler === "string") {
    executeMapping(handler, mappings, canonicalize);
    return;
  }
  safeExecuteFunc(handler);
};

export const switchKind = (
  targetKind: string,
  mappings: DispatchMappings,
): void => {
  executeMapping(targetKind, mappings);
};

export const switchTask = (
  targetTask: string,
  mappings: DispatchMappings,
): void => {
  executeMapping(targetTask, mappings, canonicalTaskName);
};
