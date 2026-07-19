export interface ReleasePinData {
  release: string;
  contractVersion: number | null;
  engine?: { name?: string; version?: string; commit?: string };
  glossaryVersion?: string | null;
  phrasesVersion?: string | null;
}

/**
 * Reads back this experiment's release pin at participant session start
 * (issue #181), 404-tolerant: a legacy experiment with no ReleasePin.txt
 * yields null. Same-origin fetch of the file committed alongside index.html
 * — participants have no GitLab auth, so this cannot reuse
 * getReleasePinForProject.
 */
export async function loadReleasePin(): Promise<ReleasePinData | null> {
  try {
    const res = await fetch("ReleasePin.txt");
    if (!res.ok) return null;
    const result = await res.json();
    return result && result.release ? (result as ReleasePinData) : null;
  } catch {
    return null;
  }
}

/**
 * Maps a release pin to the fields stamped into thisExperimentInfo,
 * alongside (not replacing) the existing psychopyVersion stamp. A legacy
 * experiment (no pin) stamps nothing new.
 */
export function buildProvenanceStamp(
  pin: ReleasePinData | null,
): Record<string, unknown> {
  if (!pin) return {};
  return {
    release: pin.release,
    engineVersion: pin.engine?.version ?? null,
    glossaryVersion: pin.glossaryVersion ?? null,
    phrasesVersion: pin.phrasesVersion ?? null,
  };
}
