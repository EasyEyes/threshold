jest.mock("../components/easyeyesBaseUrl", () => ({
  getEasyEyesBaseUrl: jest.fn().mockResolvedValue("https://easyeyes.test"),
}));

import { pinExperimentRelease } from "../preprocess/releasePin";

it("pins an exact uploaded revision and verifies the read-back tuple", async () => {
  const pin = {
    releaseId: "2026-09-09",
    manifestDigest: "sha256-test",
    artifactRevision: "abc123",
    pinnedAt: "2026-09-09T00:00:00.000Z",
  };
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => pin,
  });
  await expect(
    pinExperimentRelease(
      "scientist",
      "study",
      pin.releaseId,
      pin.artifactRevision,
      "gitlab-token",
      fetchImpl,
    ),
  ).resolves.toEqual(pin);
  expect(fetchImpl).toHaveBeenCalledWith(
    "https://easyeyes.test/.netlify/functions/release-manifest",
    expect.objectContaining({
      method: "PUT",
      headers: expect.objectContaining({
        authorization: "Bearer gitlab-token",
      }),
    }),
  );
});

it("fails closed when read-back does not match the uploaded revision", async () => {
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      releaseId: "2026-09-09",
      manifestDigest: "sha256-test",
      artifactRevision: "different",
      pinnedAt: "now",
    }),
  });
  await expect(
    pinExperimentRelease(
      "scientist",
      "study",
      "2026-09-09",
      "abc123",
      "token",
      fetchImpl,
    ),
  ).rejects.toMatchObject({ code: "RELEASE_PIN_MISMATCH" });
});
