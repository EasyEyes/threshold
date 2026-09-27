/**
 * Type-level tests for the frozen compiled-data format (issue #172):
 * the block-CSV/config schema the participant runtime reads from a compiled
 * experiment repo. Checked by `tsc --noEmit`.
 */
import type {
  CompiledDataPath,
  BlockFilePath,
  ResourcePath,
  BlockConditionRow,
  BlockCountRow,
  TypekitConfig,
} from "../contract/compiled-data";

// ---------------------------------------------------------------------------
// Test 5a: every file the runtime reads from today's experiment repo is an
// expressible CompiledDataPath (see gitlabUtils.ts commit actions).
// ---------------------------------------------------------------------------

const todaysRepoDataFiles: CompiledDataPath[] = [
  // The (cleaned) experiment table at the repo root
  "myExperiment.csv",
  // Block condition files + block index (blockGen.ts)
  "conditions/block_1.csv",
  "conditions/block_12.csv",
  "conditions/blockCount.csv",
  // Generated config files
  "CompatibilityRequirements.txt",
  "Duration.txt",
  "js/experimentLanguage.js",
  "typekit.json",
  "recruitmentServiceConfig.csv",
  "ProlificStudyId.txt",
  // Resource files, one directory per resource kind
  "fonts/Sloan.woff2",
  "forms/consent.pdf",
  "texts/theCorpus.txt",
  "folders/targetSounds.zip",
  "images/target.png",
  "code/custom.js",
  "impulseResponses/ir.csv",
  "frequencyResponses/fr.csv",
  "targetSoundLists/list.xlsx",
  "phrases/mySpanish.xlsx",
];
void todaysRepoDataFiles;

const aBlockFile: BlockFilePath = "conditions/block_3.csv";
const aResource: ResourcePath = "fonts/Sloan.woff2";
void aBlockFile;
void aResource;

// ---------------------------------------------------------------------------
// Test 5b: block CSV rows. Columns are experiment parameter names; the
// "block" column is always present (conserved block number). New columns may
// appear (append-only); all cells are text.
// ---------------------------------------------------------------------------

const conditionRow: BlockConditionRow = {
  block: "1",
  block_condition: "1_1",
  conditionName: "easy",
  targetKind: "letter",
  targetTask: "identify",
  conditionTrials: "40",
  thresholdParameter: "spacingDeg",
  "!experimentFilename": "myExperiment.csv",
  someParameterAddedInAFutureRelease: "value",
};
void conditionRow;

// ---------------------------------------------------------------------------
// Test 5c: conditions/blockCount.csv rows — one per block, holding the
// conserved block number; may gain columns but never lose these.
// ---------------------------------------------------------------------------

const blockCountRow: BlockCountRow = {
  block: "1",
  targetKind: "letter",
  targetTask: "identify",
  aFutureColumn: "x",
};
void blockCountRow;

// ---------------------------------------------------------------------------
// Test 5d: typekit.json config content.
// ---------------------------------------------------------------------------

const typekit: TypekitConfig = { kitId: "abc1234" };
void typekit;
