import {
  loadReleaseProvenance,
  releaseProvenanceColumns,
} from "../preprocess/releaseProvenance";

describe("release provenance", () => {
  afterEach(() => jest.restoreAllMocks());

  it("loads and maps the complete immutable tuple", async () => {
    const value = {
      schemaVersion: 1 as const,
      releaseId: "2026-09-09.1",
      contractVersion: 1,
      manifestDigest: "sha256-manifest",
      engine: {
        package: "@easyeyes/threshold-engine",
        version: "1.0.0",
        integrity: "sha256-engine",
      },
      glossaryVersion: "31.2",
      phrasesVersion: "3.2",
    };
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => value } as Response);
    expect(releaseProvenanceColumns(await loadReleaseProvenance())).toEqual({
      easyEyesRelease: value.releaseId,
      easyEyesEngineVersion: value.engine.version,
      easyEyesPhrasesVersion: value.phrasesVersion,
      easyEyesGlossaryVersion: value.glossaryVersion,
      easyEyesManifestDigest: value.manifestDigest,
      easyEyesContractVersion: value.contractVersion,
    });
  });

  it("keeps legacy experiments runnable when the provenance file is absent", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(loadReleaseProvenance()).resolves.toBeNull();
  });

  it("fails visibly for an invalid new release tuple", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ schemaVersion: 1 }),
      } as Response);
    await expect(loadReleaseProvenance()).rejects.toThrow(
      "RELEASE_COMPONENT_MISMATCH",
    );
  });
});
