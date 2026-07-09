# Cutting a release

A release is deliberate and curated — nothing publishes on merge. The
**Release Publisher** workflow
(`.github/workflows/release-publisher.yml`) ties the whole thing together:

1. Runs `npm run verify` (build + contract check + parity) against the exact
   commit being released.
2. Publishes `dist/` to npm as an immutable version under the current
   (staging) scope, `@easyeyes-stage/threshold-engine`.
3. Fetches the current `glossaryVersion` / `phrasesVersion` from the live
   `glossary` / `phrases` Netlify functions.
4. Writes a manifest entry (`engineVersion`, `glossaryVersion`,
   `phrasesVersion`, `gitSha`, `changelog`) and advances the `latest` pointer
   — both in a single atomic write, so the two can never diverge.

Only a release cut through this workflow appears in `listReleases()` /
`getLatest()`. Ordinary development/preview builds keep publishing to the
staging npm channel exactly as before, but are never written into the
manifest.

## Triggering a release

1. Bump `"version"` in `threshold-engine/package.json` to the new calendar
   date (`YYYY.M.D`, matching the existing published versions). This is the
   `engineVersion` that gets published and recorded.
2. From the `threshold` repo's **Actions** tab, run **Release Publisher**
   (`workflow_dispatch`) on the branch/commit you want to release, supplying
   a `changelog` string.
3. Leave `releaseId` and `skip_publish` at their defaults for a normal
   release — the workflow uses today's UTC date as the release id.

## Recovering from a partial failure

The npm publish step is the point of no return: once it succeeds, that
version is immutable and can never be republished, even if a later step
fails. The workflow is structured so nothing before that step has any
external side effect, and the manifest write happens last, after publish has
already succeeded — so the only failure worth recovering from is: **npm
publish succeeded, but the manifest write (the last step) failed** (e.g. a
transient Firebase/Netlify error). When that happens, the job fails loudly
(the write step uses `curl -f`, so a non-2xx response fails the step and the
job), and `latest` is left exactly as it was before the run — the atomic
manifest write means a failed attempt never leaves a dangling entry either.

To recover, re-run **Release Publisher** with:

- `skip_publish: true`
- `engineVersion`: the version that was already published (read it from the
  failed run's "Determine engine version" step, or from the npm registry)
- `changelog`: the same changelog you used originally
- `releaseId`: the release id from the failed run, if the retry happens on a
  different UTC day than the original attempt (otherwise leave blank — it
  defaults to today and will match)

This skips install/verify/publish entirely and only re-fetches the current
glossary/phrases versions and re-attempts the manifest write.

## Required secrets

Provisioned by a maintainer in the `threshold` repo's Actions secrets (not
set up as part of this change — see issue #183):

- `NPM_TOKEN` — npm auth token with publish rights on `@easyeyes-stage`
  (later `@easyeyes`, once #184 flips the scope).
- `RELEASE_MANIFEST_SECRET` — shared secret for the `release-manifest`
  Netlify function's write endpoint. Must match the `RELEASE_MANIFEST_SECRET`
  environment variable configured on that Netlify site.
