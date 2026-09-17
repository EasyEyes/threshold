import test from "node:test";
import assert from "node:assert/strict";
import { releaseConfig } from "./config.mjs";
const id = "a".repeat(24);
const identity = {
  NETLIFY_DEPLOY_ID: id,
  ENGINE_SOURCE_SHA: "b".repeat(40),
  EASYEYES_BASE_URL: `https://${id}--easyeyes.netlify.app`,
};
test("production deploy publishes a stable production package", () => {
  const config = releaseConfig({ ...identity, NETLIFY_CONTEXT: "production" });
  assert.equal(config.tag, "latest");
  assert.equal(
    config.version,
    `2026.${Number.parseInt(id.slice(0, 12), 16)}.${Number.parseInt(
      id.slice(-12),
      16,
    )}`,
  );
});
test("branch and PR deployments publish staging prereleases", () => {
  for (const NETLIFY_CONTEXT of ["branch-deploy", "deploy-preview"]) {
    const config = releaseConfig({ ...identity, NETLIFY_CONTEXT });
    assert.equal(config.tag, "staging");
    assert.match(config.version, /-staging\.bbbbbbbbbbbb$/);
  }
});
test("rejects mutable origins, unknown contexts, and inconsistent release identities", () => {
  const valid = { ...identity, NETLIFY_CONTEXT: "branch-deploy" };
  for (const override of [
    { EASYEYES_BASE_URL: "https://easyeyes.app" },
    { NETLIFY_CONTEXT: "dev" },
  ])
    assert.throws(() => releaseConfig({ ...valid, ...override }));
});
