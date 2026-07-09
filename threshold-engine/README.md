# @easyeyes/threshold-engine

Dated, immutable releases of the EasyEyes threshold compiler, exposed through
the frozen `engine.compile()` contract
([ADR 0001](../../../../../docs/adr/0001-freeze-engine-compile-and-compiled-data-contracts.md),
byte-exact copy in [`contract/engine-compile.ts`](contract/engine-compile.ts)).

Release #1 is a **behavior-neutral snapshot of current production**: given the
same experiment table and resources, its compiled output is byte-identical to
what the production compiler (threshold `preprocess/*`, driven by the
threshold-scientist shell) commits to an experiment repo.

> Staging publishes use the `@easyeyes-stage` scope; the production release
> is published once under `@easyeyes` after verification.

## Usage

```js
const engine = await import(
  "https://cdn.jsdelivr.net/npm/@easyeyes-stage/threshold-engine@2026.7.7"
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
npm run verify   # build + contract copy check + node parity + browser test
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

Curated releases (verify → npm publish → release manifest entry → advance
`latest`) are cut by the **Release Publisher** GitHub Actions workflow, not by
hand. See [`RELEASE.md`](RELEASE.md) for how to trigger a release and how to
recover from a partial failure.

For local iteration without publishing:

```bash
npm run verify
npm pack             # inspect the tarball
```

Versions are calendar dates as semver (`2026.7.7`). Published versions are
immutable: never unpublish; a bad release is superseded by the next date and
`npm deprecate`d.
