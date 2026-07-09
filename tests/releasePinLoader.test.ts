/**
 * The provenance stamper (issue #181): resolves the experiment's release
 * pin fresh each participant session (same-origin, no GitLab auth — the
 * participant runtime has none), 404-tolerant for legacy experiments, and
 * maps it to the fields stamped into thisExperimentInfo.
 */
import {
  loadReleasePin,
  buildProvenanceStamp,
} from "../preprocess/releasePinLoader";

function makeFetch(response: { ok: boolean; json: () => Promise<unknown> }) {
  return jest.fn().mockResolvedValue(response);
}

describe("loadReleasePin", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the parsed pin when ReleasePin.txt exists", async () => {
    global.fetch = makeFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          release: "2026.7.8",
          contractVersion: 1,
          engine: {
            name: "threshold-engine",
            version: "2026-07-08",
            commit: "abc123",
          },
          glossaryVersion: "3.2",
          phrasesVersion: "1.0",
        }),
    }) as any;

    const pin = await loadReleasePin();

    expect(pin).toEqual({
      release: "2026.7.8",
      contractVersion: 1,
      engine: {
        name: "threshold-engine",
        version: "2026-07-08",
        commit: "abc123",
      },
      glossaryVersion: "3.2",
      phrasesVersion: "1.0",
    });
  });

  it("returns null for a legacy experiment with no ReleasePin.txt (404)", async () => {
    global.fetch = makeFetch({
      ok: false,
      json: () => Promise.resolve({}),
    }) as any;

    const pin = await loadReleasePin();

    expect(pin).toBeNull();
  });
});

describe("buildProvenanceStamp", () => {
  it("maps a versioned pin to release/engineVersion/glossaryVersion/phrasesVersion", () => {
    const stamp = buildProvenanceStamp({
      release: "2026.7.8",
      contractVersion: 1,
      engine: {
        name: "threshold-engine",
        version: "2026-07-08",
        commit: "abc123",
      },
      glossaryVersion: "3.2",
      phrasesVersion: "1.0",
    });

    expect(stamp).toEqual({
      release: "2026.7.8",
      engineVersion: "2026-07-08",
      glossaryVersion: "3.2",
      phrasesVersion: "1.0",
    });
  });

  it("stamps nothing for a legacy experiment (no pin)", () => {
    const stamp = buildProvenanceStamp(null);

    expect(stamp).toEqual({});
  });
});
