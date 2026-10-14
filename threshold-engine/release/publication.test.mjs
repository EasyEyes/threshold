import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { releaseConfig, digest } from "./config.mjs";

test("generates exact catalogs, publishes to the dynamic deploy, and emits hyperlinks", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "easyeyes-release-"));
  const id = "a".repeat(24);
  const env = {
    ...process.env,
    NETLIFY_DEPLOY_ID: id,
    ENGINE_SOURCE_SHA: "b".repeat(40),
    NETLIFY_CONTEXT: "deploy-preview",
    EASYEYES_BASE_URL: `https://${id}--easyeyes.netlify.app`,
    RELEASE_MANIFEST_SECRET: "test-secret",
    WEBSITE_BRANCH: "feature/test",
    GITHUB_OUTPUT: path.join(directory, "output"),
    GITHUB_STEP_SUMMARY: path.join(directory, "summary"),
  };
  const engine = "export const contractVersion = 1;\n";
  try {
    await mkdir(path.join(directory, "dist"));
    await writeFile(path.join(directory, "dist/index.js"), engine);
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({
        name: "threshold-engine",
        version: releaseConfig(env).version,
        type: "module",
      }),
    );
    const script = `
      import assert from 'node:assert/strict';
      const calls = [];
      let posted;
      globalThis.fetch = async (url, options = {}) => {
        calls.push({url, options});
        if (url.startsWith('https://cdn.jsdelivr.net/')) return new Response(${JSON.stringify(
          engine,
        )});
        assert.ok(url.startsWith(process.env.EASYEYES_BASE_URL + '/'));
        if (url.includes('catalog-usage-report')) return Response.json({freshness:{status:'current'},publication:{reportId:'report-1'}});
        if (url.includes('versionOnly')) return Response.json({version: url.includes('/phrases?') ? 'P11' : 'G20'});
        if (url.includes('/phrases?v=')) {assert.ok(url.endsWith('v=P11')); return Response.json({hello:'Hello'});}
        if (url.includes('/glossary?v=')) {assert.ok(url.endsWith('v=G20')); return Response.json({parameter:{type:'number'}});}
        if (options.method === 'POST') {
          assert.equal(options.headers.authorization, 'Bearer test-secret');
          posted = JSON.parse(options.body);
          assert.equal(posted.releaseId, undefined);
          posted.releaseId = "2026-09-15.1";
          return Response.json({releaseId:posted.releaseId}, {status:201});
        }
        return posted ? Response.json(posted) : new Response(null, {status:404});
      };
      await import(${JSON.stringify(
        new URL("./prepare.mjs", import.meta.url).href,
      )});
      await import(${JSON.stringify(
        new URL("./publish-manifest.mjs", import.meta.url).href,
      )});
      assert.equal(posted.releaseId, "2026-09-15.1");
      assert.equal(posted.source.thresholdRevision, process.env.ENGINE_SOURCE_SHA);
      assert.equal(posted.source.websiteBranch, 'feature/test');
    `;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { cwd: directory, env, encoding: "utf8", timeout: 10000 },
    );
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(
      await readFile(path.join(directory, "release-manifest.json"), "utf8"),
    );
    assert.equal(manifest.engine.integrity, await digest(engine));
    assert.equal(
      manifest.phrases.digest,
      await digest(JSON.stringify({ hello: "Hello" })),
    );
    assert.equal(manifest.glossary.version, "G20");
    const summary = await readFile(env.GITHUB_STEP_SUMMARY, "utf8");
    assert.ok(
      summary.includes(`[Compiler](${env.EASYEYES_BASE_URL}/compiler/)`),
    );
    assert.ok(
      summary.includes("[Participant runtime](https://cdn.jsdelivr.net/"),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
