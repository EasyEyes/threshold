export type PhraseSourceDecision =
  | { kind: "none" }
  | { kind: "use"; file: File }
  | { kind: "fetch"; name: string }
  | { kind: "missing" };

export const selectPhraseSource = (
  requestedName: string,
  isArchive: boolean,
  inMemory: File[],
): PhraseSourceDecision => {
  if (!requestedName) return { kind: "none" };
  const match = inMemory.find((f) => f.name === requestedName);
  if (match) return { kind: "use", file: match };
  // An export archive is self-contained: if the phrase file is not bundled
  // in the archive, never reach into the scientist's own repo folder.
  if (isArchive) return { kind: "missing" };
  return { kind: "fetch", name: requestedName };
};
