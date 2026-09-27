# threshold-engine

Dated, immutable releases of the EasyEyes threshold compiler, exposed through
the frozen `engine.compile()` contract
([ADR 0001](../../../../../docs/adr/0001-freeze-engine-compile-and-compiled-data-contracts.md),
canonical definition in [`contract/engine-compile.ts`](contract/engine-compile.ts)).

Release #1 is a **behavior-neutral snapshot of current production**: given the
same experiment table and resources, its compiled output is byte-identical to
what the production compiler (threshold `preprocess/*`, driven by the
threshold-scientist shell) commits to an experiment repo.

The package uses the unscoped `threshold-engine` name. Staging and production
releases use exact versions and separate npm tags.

## Usage

```js
const engine = await import(
  "https://cdn.jsdelivr.net/npm/threshold-engine@2026.9.14-staging.bootstrap.1"
);
engine.contractVersion; // 1 — shell must refuse versions above what it knows
const { files, manifest } = await engine.compile(table, resources, options);
```

- `table` — `{ path, content }`, the experiment `.csv`/`.xlsx` as opaque bytes.
- `resources.files` — resource files, kind = path prefix (`"fonts/…"`,
  `"phrases/…"`, …). `resources.fetch`/`list` cover mid-compile lookups.
- `options.mode` — `"web"` (default) or `"node"`.
- `options.data.glossary` / `options.data.phrases` — **required**: the
  release-pinned parameter glossary and i18n phrases (today the shell fetches
  these from the Netlify functions and passes them through).
- `options.data.compilerUpdateDate` — optional; the shell-fetched Netlify
  deploy date baked into `CompatibilityRequirements.txt` (the engine cannot
  know it; production fetches it at publish time).

`files` is the compiled-data file set (root table, `conditions/*`,
`CompatibilityRequirements.txt`, `Duration.txt`, `js/experimentLanguage.js`,
`typekit.json` when Adobe fonts are used). `manifest` carries `requests`
(resources to copy into the repo), `diagnostics` (author errors/warnings;
any `kind: "error"` blocks publishing), and `experiment` (engine-computed
configuration the shell reads).

Deliberately **not** emitted by `compile()` (shell-side, post-compile):
`recruitmentServiceConfig.csv` and `ProlificStudyId.txt` are written at study
creation with shell-held credentials; the runtime bundle files are copied by
the shell. Prolific participant-group validation also stays shell-side
(ADR 0001) — the shell appends those diagnostics itself.

## Building and verifying

```bash
npm install
npm run verify   # build + contract type tests + node parity + browser test
npm run check:types  # public surface typechecks against the frozen contract
```

- `npm run parity` — drives the production compiler (bundled unmodified as a
  "parity oracle") and this package side by side over every table in
  `../examples/tables/`, comparing the compiled file set byte-for-byte plus
  diagnostics and experiment config. Requires `../tests/__cache__/`
  `glossary.json` and `phrases.json` (fetched from the live Netlify functions
  on first use).
- `npm run parity:browser` — serves a scratch page, dynamically imports the
  built bundle in headless Chrome, asserts the import itself makes **no**
  network requests, and runs a web-mode compile.

## Publishing

```bash
npm run verify
npm pack             # inspect the tarball
npm publish --access public
```

Versions are calendar dates as semver (`2026.7.7`). Published versions are
immutable: never unpublish; a bad release is superseded by the next date and
`npm deprecate`d.

## Contract ownership

The canonical engine and compiled-data contracts live in `contract/`, with
type-level fixtures in `type-test/`. Threshold implements the engine interface
and reads compiled data at participant runtime. Threshold Scientist imports
the engine contract from its Threshold submodule. No build requires files
outside the Threshold repository.

`npm run check:contract` runs the engine compatibility and contract fixture
checks through `npm run check:types`. These checks emit no JavaScript.

## Automated engine releases

Publication is dispatched after a successful website Netlify deployment, rather
than on Threshold pushes. The signed webhook verifies Netlify deployment metadata
and resolves the nested scientist and Threshold gitlinks through GitHub. The
workflow runs from Threshold's default branch and builds the exact pinned source.
The deployment's immutable URL is supplied automatically; no fixed staging site
or per-branch base URL is required.

See [setup instructions](../../../netlify-engine-release-automation.md) in the
website repository. GitHub environments `production` and `staging` each need the
matching `RELEASE_MANIFEST_SECRET`. Configure npm trusted publishing for
`threshold-engine`, GitHub repository `EasyEyes/threshold`, workflow
`release-engine.yml`.

Production deploy contexts publish stable versions with npm tag `latest`;
branch deploys and PR previews publish prereleases with tag `staging`. Versions
encode both halves of the Netlify deploy ID as numeric semver fields, with
`-staging.<Threshold commit>` for prereleases. Deploy IDs determine release IDs
and package versions, so repeat notifications do not republish completed releases.

Published catalogs and a current usage report must exist in the target database.
The workflow verifies the engine and its CDN integrity before publishing a
manifest, then emits clickable compiler, manifest, engine, participant-runtime,
and release-list links. The manifest is uploaded as a workflow artifact. A failed
manifest publication can leave an npm package available; rerun after fixing the
cause. No package version changes or submodule pointers are committed by CI.

Previews share `easyeyes-compiler-staging`, but use their own deploy endpoints.
The shared staging latest pointer identifies the last published staging release.
Use the exact release link and website branch label when testing a preview.

Deploy the workflow and scripts to Threshold's default branch before enabling
the website webhook. Deploy the website receiver and verifier separately.
Catalog-only publication triggers remain a separate feature.
