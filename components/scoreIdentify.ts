// Scoring coercion for the global correctAns ref.
//
// Every questionAndAnswer block leaves `correctAns.current` holding a bare
// STRING (the participant's correct answer, set by components/image.js).
// The trial-scoring fallback assumes an array and calls `.sort()` — a string
// there ended a 72-minute session at the first beauty-reading block (field:
// study 129, "correctAns.current.sort is not a function"). Coerce here:
// string → [string]; already-array passes through by reference so in-place
// sort behavior elsewhere is unchanged; empty/null means "no correct answer".
export const correctAnsAsArray = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : v == null || v === "" ? [] : [String(v)];
