import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("catalog-only release reuses the current engine and requests a new ID", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "easyeyes-catalog-"));
  const summary = path.join(directory, "summary");
  const base = `https://${"a".repeat(24)}--easyeyes.netlify.app`;
  try {
    const script = `
      import assert from 'node:assert/strict';
      let posted;
      const previous = {releaseId:'2026-09-15.1',contractVersion:1,engine:{package:'threshold-engine',version:'1.2.3',integrity:'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='},phrases:{version:'P1'},glossary:{version:'G1'}};
      globalThis.fetch = async (url, options = {}) => {
        assert.ok(url.startsWith(process.env.EASYEYES_BASE_URL + '/'));
        if (options.method === 'POST') {
          posted = JSON.parse(options.body);
          assert.equal(posted.releaseId, undefined);
          assert.deepEqual(posted.engine, previous.engine);
          return Response.json({releaseId:'2026-09-15.2'}, {status:201});
        }
        if (url.includes('release-manifest?latest')) return Response.json(previous);
        if (url.includes('release-manifest?release=')) return Response.json({...posted,releaseId:'2026-09-15.2'});
        if (url.includes('catalog-usage-report')) return Response.json({freshness:{status:'current'},publication:{reportId:'report-2'}});
        if (url.includes('versionOnly')) return Response.json({version:url.includes('/phrases?')?'P2':'G1'});
        return Response.json({hello:'world'});
      };
      await import(${JSON.stringify(
        new URL("./publish-catalog.mjs", import.meta.url).href,
      )});
      assert.equal(posted.source.catalogOnly, true);
    `;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        env: {
          ...process.env,
          EASYEYES_BASE_URL: base,
          RELEASE_MANIFEST_SECRET: "test",
          RELEASE_CONTEXT: "staging",
          GITHUB_STEP_SUMMARY: summary,
        },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(await readFile(summary, "utf8"), /2026-09-15\.2/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
