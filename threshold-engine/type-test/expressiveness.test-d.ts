/**
 * Type-level tests for the frozen engine.compile() contract (issue #172).
 *
 * These tests never run; they are checked by `tsc --noEmit`. Each test
 * constructs a value from today's shell↔preprocessor exchange and asserts it
 * is expressible under the contract types. If a currently-expressible input
 * or output stops typechecking, the contract has lost expressiveness.
 */
import type {
  ThresholdEngine,
  EngineFile,
  CompileResources,
  CompileOptions,
  CompileResult,
  CompileManifest,
} from "../contract/engine-compile";

// ---------------------------------------------------------------------------
// Test 1 (tracer bullet): the basic engine handle shape.
// A shell holds an engine handle exposing an integer contractVersion and a
// compile(table, resources, options) function resolving to { files, manifest }.
// ---------------------------------------------------------------------------

declare const engine: ThresholdEngine;

const contractVersion: number = engine.contractVersion;

declare const table: EngineFile;
declare const resources: CompileResources;
declare const options: CompileOptions;

const resultPromise: Promise<CompileResult> = engine.compile(
  table,
  resources,
  options,
);

async function tracerBullet(): Promise<void> {
  const result = await resultPromise;
  const files: EngineFile[] = result.files;
  const manifestContractVersion: number = result.manifest.contractVersion;
  void files;
  void manifestContractVersion;
  void contractVersion;
}
void tracerBullet;

// ---------------------------------------------------------------------------
// Test 2: everything today's preprocessor CONSUMES is expressible.
// Mirrors preprocessExperimentFile / prepareExperimentFileForThreshold inputs
// (threshold/preprocess/main.ts) and the easyeyesResources object the shell
// builds in threshold-scientist's Table.js.
// ---------------------------------------------------------------------------

declare const bytes: Uint8Array;

// The experiment table: CSV or XLSX, opaque bytes, filename carried on path.
const tableCsv: EngineFile = { path: "myExperiment.csv", content: "block,..." };
const tableXlsx: EngineFile = { path: "myExperiment.xlsx", content: bytes };

// Every resource kind the shell hands to the preprocessor today
// (easyeyesResources.{fonts,forms,texts,folders,images,code,impulseResponses,
// frequencyResponses,targetSoundLists,phrases} plus pre-fetched corpus
// contents easyeyesResources.textContents), addressed by repo-style path.
const todaysResources: CompileResources = {
  files: [
    { path: "fonts/Sloan.woff2", content: bytes },
    { path: "forms/consent.pdf", content: bytes },
    { path: "texts/theCorpus.txt", content: "Once upon a time..." },
    { path: "folders/targetSounds.zip", content: bytes },
    { path: "images/target.png", content: bytes },
    { path: "code/custom.js", content: "export {};" },
    { path: "impulseResponses/ir.csv", content: "t,amp\n0,1" },
    { path: "frequencyResponses/fr.csv", content: "hz,gain\n1000,0" },
    { path: "targetSoundLists/list.xlsx", content: bytes },
    { path: "phrases/mySpanish.xlsx", content: bytes },
  ],
  // Lazy access for resources not handed over up front: today's
  // easyeyesResources.fetchPhraseFromRepo, the GitLab-backed impulse/
  // frequency-response content fetches, and sound-folder structure checks.
  fetch: async (path: string) =>
    path === "phrases/mySpanish.xlsx" ? { path, content: bytes } : null,
  list: async (prefix: string) => (prefix === "folders/" ? ["a.zip"] : []),
};

// Options carried by today's entry points: space ("web" | "node"),
// isCompiledFromArchiveBool, isLocal, plus the pinned glossary/phrases
// datasets the engine currently imports statically.
const todaysOptions: CompileOptions = {
  mode: "web",
  compiledFromArchive: false,
  local: false,
  data: {
    glossary: { _language: { default: "English" } },
    phrases: { EE_languageDirection: { en: "LTR" } },
  },
};

// A node-mode compile (npm run examples) is also expressible.
const nodeOptions: CompileOptions = { mode: "node", local: true };

void tableCsv;
void tableXlsx;
void todaysResources;
void todaysOptions;
void nodeOptions;

// ---------------------------------------------------------------------------
// Test 3: everything today's preprocessor PRODUCES is expressible.
// Mirrors the prepareExperimentFileForThreshold callback arguments, the
// user.currentExperiment mutations, the durations / compatibilityRequirements
// globals, and the generated files gitlabUtils commits to the experiment repo.
// ---------------------------------------------------------------------------

const todaysResult: CompileResult = {
  files: [
    // splitIntoBlockFiles output (blockGen.ts)
    { path: "conditions/block_1.csv", content: "block,conditionName\n1,easy" },
    { path: "conditions/block_2.csv", content: "block,conditionName\n2,hard" },
    {
      path: "conditions/blockCount.csv",
      content: "block,targetKind,targetTask\n1,letter,identify",
    },
    // Generated config files (gitlabUtils.ts commit actions)
    { path: "CompatibilityRequirements.txt", content: "Chrome on desktop..." },
    { path: "Duration.txt", content: "EasyEyes=12, _online2Minutes=15" },
    {
      path: "js/experimentLanguage.js",
      content: 'const experimentLanguage = "English";',
    },
    { path: "typekit.json", content: '{"kitId":"abc1234"}' },
    { path: "recruitmentServiceConfig.csv", content: "name,code\nProlific,x" },
    // The (cleaned) experiment table is republished at the repo root
    { path: "myExperiment.csv", content: "block,..." },
  ],
  manifest: {
    contractVersion: 1,
    // Engine provenance for the per-session version stamp (PRD #144)
    engine: { name: "threshold-engine", version: "2026-07-01" },
    // Today's requested* lists: fonts, forms (consent + debrief), texts
    // (incl. readingCorpusFoils), folders (masker/target sounds + image
    // folders, as zips), images, code, impulseResponses, frequencyResponses,
    // targetSoundLists, phrases — all as repo-style paths.
    requests: [
      { path: "fonts/Sloan.woff2" },
      { path: "forms/consent.pdf" },
      { path: "forms/debrief.md" },
      { path: "texts/theCorpus.txt" },
      { path: "folders/targetSounds.zip" },
      { path: "folders/targetImages.zip" },
      { path: "images/target.png" },
      { path: "code/custom.js" },
      { path: "impulseResponses/ir.csv" },
      { path: "frequencyResponses/fr.csv" },
      { path: "targetSoundLists/list.xlsx" },
      { path: "phrases/mySpanish.xlsx" },
    ],
    // Today's EasyEyesError shape (errorMessages.ts), errors and warnings
    diagnostics: [
      {
        kind: "error",
        name: "_stepperBool requires compatible _calibrateDistance",
        message: "Setting _stepperBool=FALSE requires _calibrateDistance...",
        hint: "Either set _stepperBool=TRUE, or ...",
        context: "prepareExperimentFileForThreshold",
        parameters: ["_stepperBool", "_calibrateDistance"],
      },
      {
        kind: "warning",
        name: "Logging caution",
        message: "Formspree quota nearly used up.",
      },
    ],
    // Today's user.currentExperiment mutations + durations +
    // compatibilityRequirements globals: engine-computed experiment
    // configuration the shell reads (recruitment, language, UI text).
    experiment: {
      participantRecruitmentServiceName: "Prolific",
      titleOfStudy: "Crowding study",
      _participantDurationMinutes: "15",
      _online2PayCurrencyCode: "USD",
      prolificWorkspaceProjectId: "abc",
      prolificWorkspaceModeBool: true,
      _pavloviaNewExperimentBool: false,
      _language: "English",
      languageDirection: "ltr",
      _stepperBool: true,
      durationSeconds: 720,
      durationForStatusline: "EasyEyes=12, _online2Minutes=15",
      compatibilityRequirements: "Chrome on desktop...",
    },
  },
};

// A failed compile is the same shape: no files, blocking diagnostics.
const failedResult: CompileResult = {
  files: [],
  manifest: {
    contractVersion: 1,
    diagnostics: [{ kind: "error", message: "Unexpected compiler error." }],
  },
};

void todaysResult;
void failedResult;

// ---------------------------------------------------------------------------
// Test 4: append-only safety behaviors.
// ---------------------------------------------------------------------------

// (a) Everything except contractVersion is optional — an engine that has
// nothing to report still produces a valid manifest. If a future revision
// makes any manifest field required, this line breaks the build: that
// revision would violate the append-only rule.
const minimalManifest: CompileManifest = {
  contractVersion: 1,
};
void minimalManifest;

// (b) A NEWER engine may add optional fields this shell doesn't know about;
// the shell must still be able to consume the manifest, ignoring unknowns.
interface FutureManifest extends CompileManifest {
  someFieldAddedInContractVersion2?: string;
}
declare const futureManifest: FutureManifest;
const consumedByOldShell: CompileManifest = futureManifest;
void consumedByOldShell;

// (c) The contractVersion guard: a shell compares integers and refuses an
// engine speaking a newer contract than it understands.
const SHELL_MAX_CONTRACT_VERSION: number = 1;
function shellAcceptsEngine(candidate: ThresholdEngine): boolean {
  return candidate.contractVersion <= SHELL_MAX_CONTRACT_VERSION;
}
void shellAcceptsEngine;
