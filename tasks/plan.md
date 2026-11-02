# Local compilation audit enforcement

Local examples must validate glossary usage and study-specific glossary and
International Phrases source paths. Missing or incomplete analysis must block
output. Source analysis remains conservative; it does not prove runtime reachability.

## Implementation

1. Reuse the website source-index builder before local compilation. It checks
   source fingerprints and content checksums and rebuilds stale indexes. Failure
   to build must stop compilation, without falling back to a hosted source index.
2. Build once per examples invocation and share the validated index across tables.
   Keep the hosted glossary usage audit and its version checks.
3. Preserve the examples command's existing behavior, as requested: validation
   errors print diagnostics and return normally without generating new output.
   Leave previous output unchanged. Unexpected builder failures still reject
   compilation, using the command's existing unhandled-error behavior.

## State and action coverage

| ID  | State                                             | Compile outcome                                     |
| --- | ------------------------------------------------- | --------------------------------------------------- |
| A1  | No index                                          | Build from current source, then validate            |
| A2  | Source changed after an earlier build             | Rebuild; use new phrase and glossary readers        |
| A3  | Index content changed                             | Rebuild from source                                 |
| A4  | Source cannot be parsed or builder unavailable    | Fail; no hosted analysis fallback                   |
| A5  | Valid table and matching completed glossary audit | Produce output                                      |
| A6  | Glossary audit unavailable, stale, or incomplete  | Block; no output                                    |
| A7  | Phrase or glossary analysis incomplete            | Block; no output                                    |
| A8  | Existing output followed by failed compilation    | Preserve previous output and original exit behavior |

Preserve other examples and existing warning semantics. Explicitly provided index
fixtures remain supported by the local compiler API for isolated tests.

## Verification

Use the real builder on temporary source trees for A1-A4. Exercise the real local
compiler with controlled external audit responses for A5-A7. Exercise the examples
command with local catalog fixtures and controlled network responses for A8.
Run focused tests, the full participant suite, loaders, TypeScript, and production
build without Sentry uploads. Report unrelated baseline failures separately.

## Verification evidence

- A1-A4: passed with the real website builder in temporary source trees. Tests
  cover source edits, index tampering, parse failures, and a missing builder.
- A5-A8: passed through the examples command in subprocesses. HTTP audit and
  Google Fonts responses are controlled test fixtures; local analysis and the
  compiler are real. Failure/recovery uses the same table and output directory.
- Incomplete glossary and phrase indexes produce blocking compiler diagnostics
  and no compiled condition files.
- A live `npm run examples -- minimalExperiment.csv` passed with the hosted
  glossary audit and freshly verified local source analysis. Two existing
  missing-phrase warnings remain nonblocking, as in the web compiler.
- TypeScript, loader tests, formatting, and production build/manifest passed.
  Sentry uploads were disabled for the local build.
- Checks used installed Node.js 25.2.1; the declared Node.js 24 range was not tested.
- Earlier participant suite: 4,184 passed, 112 skipped, two failed. Both failures
  are unchanged fuzz tests requiring the absent `examples/tables/letter-sim.csv`.
  The separate loader suite passed all 13 tests. Final diff review found no
  additional issues in this change.

## Requested scenario and reuse checks

- The same command-level study compiles with `EE_Translator` and a matching audit.
  Changing only that key to an undefined phrase blocks new compilation even
  when the glossary audit is valid; restoring the key succeeds.
- The same valid study is blocked by unavailable, stale, incomplete, and
  unused-parameter glossary audit fixtures. Tests preserve the original exit
  code (0 for validation errors) and verify previous output remains unchanged.
- Local compilation and the web analysis handler produce matching glossary and
  phrase reports for the same source index and conditions. Both reject an
  incomplete index. These parity tests exercise the shared evaluators directly.
- No new usage-audit or reachability algorithm was added. Local compilation
  still calls `prepareExperimentFileForThreshold`, which owns `checkGlossaryAudit`,
  `checkStudyPhraseAnalysis`, and `checkStudyGlossaryAnalysis`. The web handler
  and local checks share `analysePhrasePaths` and `analyseGlossaryPaths`.
  The new Node helper only runs the existing website index builder and reads
  its result; fingerprinting and checksum validation remain in that builder.
- Final verification after restoring examples behavior: 4,187 tests passed,
  112 skipped, and the same two missing-fixture fuzz tests failed. TypeScript,
  formatting, and diff checks passed. Both live scenarios passed: the valid
  study generated output; changing its phrase to an undefined key printed a
  blocking error and preserved the previous output byte for byte.
