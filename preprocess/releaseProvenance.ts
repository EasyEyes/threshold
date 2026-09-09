export interface ReleaseProvenance {
  schemaVersion: 1;
  releaseId: string;
  contractVersion: number;
  manifestDigest: string;
  engine: { package: string; version: string; integrity: string };
  glossaryVersion: string;
  phrasesVersion: string;
}

export async function loadReleaseProvenance(): Promise<ReleaseProvenance | null> {
  const response = await fetch(".easyeyes/release.json", { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`RELEASE_COMPONENT_MISMATCH: ${response.status}`);
  const value = await response.json();
  if (
    value?.schemaVersion !== 1 ||
    typeof value.releaseId !== "string" ||
    typeof value.contractVersion !== "number" ||
    typeof value.manifestDigest !== "string" ||
    typeof value.engine?.version !== "string" ||
    typeof value.glossaryVersion !== "string" ||
    typeof value.phrasesVersion !== "string"
  )
    throw new Error("RELEASE_COMPONENT_MISMATCH: invalid release provenance");
  return value as ReleaseProvenance;
}

export const releaseProvenanceColumns = (
  value: ReleaseProvenance | null,
): Record<string, string | number> =>
  value
    ? {
        easyEyesRelease: value.releaseId,
        easyEyesEngineVersion: value.engine.version,
        easyEyesPhrasesVersion: value.phrasesVersion,
        easyEyesGlossaryVersion: value.glossaryVersion,
        easyEyesManifestDigest: value.manifestDigest,
        easyEyesContractVersion: value.contractVersion,
      }
    : {};
