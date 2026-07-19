/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @easyeyes/threshold-engine — release #1 (snapshot of current production).
 *
 * Implements the frozen engine.compile() contract (ADR 0001,
 * contract/engine-compile.ts) as a thin adapter over the production
 * compiler in preprocess/. Behavior-neutral by design: the compiled
 * output must be byte-identical to what the production shell commits.
 *
 * Boundary rules (ADR 0001):
 * - GitLab transport and shell-held credentials stay shell-side. The only
 *   shell module the compiler touched (gitlabUtils.getProlificToken) is
 *   replaced at bundle time by src/shims/gitlabUtils.ts.
 * - Glossary and i18n phrases are release-pinned data, provided via
 *   options.data.glossary / options.data.phrases.
 * - The shell-fetched compiler deploy date may be passed as
 *   options.data.compilerUpdateDate to reproduce production's
 *   CompatibilityRequirements.txt exactly.
 */
import Papa from "papaparse";
import { read, utils } from "xlsx";

import { prepareExperimentFileForThreshold } from "../../preprocess/main";
import type { EasyEyesError } from "../../preprocess/errorMessages";
import { durations } from "../../preprocess/getDuration";
import { compatibilityRequirements, typekit } from "../../preprocess/global";
import { initGlossary, getGlossary } from "../../parameters/glossaryRegistry";
import { initPhrases, getPhrases } from "../../parameters/phrasesRegistry";

import type {
  CompileManifest,
  CompileOptions,
  CompileResources,
  CompileResult,
  EngineFile,
  ResourceRequest,
  ThresholdEngine,
} from "../contract/engine-compile";
import { CONTRACT_VERSION } from "../contract/engine-compile";
import { buildEntryFiles } from "./entry";

// Replaced by esbuild `define` at build time.
declare const ENGINE_NAME: string;
declare const ENGINE_VERSION: string;

/** Resource kinds = path prefixes (ADR 0001). Order is not significant. */
const RESOURCE_KINDS = [
  "fonts",
  "forms",
  "texts",
  "folders",
  "images",
  "code",
  "impulseResponses",
  "frequencyResponses",
  "targetSoundLists",
  "phrases",
] as const;

const asText = (content: string | Uint8Array): string =>
  typeof content === "string" ? content : new TextDecoder().decode(content);

const asBytes = (content: string | Uint8Array): Uint8Array =>
  typeof content === "string" ? new TextEncoder().encode(content) : content;

const basename = (path: string): string => path.split("/").pop() ?? path;

/** The 13 positional arguments of the production compiler callback. */
interface CallbackCapture {
  user: any;
  requestedForms: any;
  requestedFontList: string[];
  requestedTextList: string[];
  requestedFolderList: string[];
  requestedImageList: string[];
  requestedCodeList: string[];
  fileList: any[];
  errorList: EasyEyesError[];
  requestedImpulseResponseList: string[];
  requestedFrequencyResponseList: string[];
  requestedTargetSoundLists: string[];
  requestedPhraseFile: string;
}

/**
 * Root-table serialization, replicating what the shell commits today
 * (gitlabUtils.gatherUserUploadedFileActions):
 * - .csv files: the file text, verbatim (FileReader.readAsText UTF-8).
 * - .xlsx files: fileUtils.readXLSXFile — JSON.stringify of the first
 *   sheet as an array of arrays. (Yes: a JSON string under the original
 *   .xlsx filename. Production quirk, preserved for byte-identity.)
 */
const serializeRootTable = (table: EngineFile): string => {
  if (!basename(table.path).includes("xlsx")) return asText(table.content);
  const workbook = read(asBytes(table.content), { type: "array" });
  const hasSheets = workbook.SheetNames && workbook.SheetNames.length > 0;
  if (!hasSheets) throw new Error("No sheets found in the workbook.");
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetData = utils.sheet_to_json(worksheet, { header: 1 });
  if (!sheetData || sheetData.length === 0)
    throw new Error("No data found in the sheet.");
  return JSON.stringify(sheetData);
};

/**
 * Parse the experiment table exactly as preprocessExperimentFile does:
 * xlsx → first sheet → sheet_to_csv → Papa; csv → Papa on the text.
 */
const parseTable = (table: EngineFile): Papa.ParseResult<any> => {
  if (basename(table.path).includes("xlsx")) {
    const book = read(asBytes(table.content), { type: "array" });
    for (const sheet in book.Sheets) {
      const csv: string = utils.sheet_to_csv(book.Sheets[sheet]);
      // Only parse the very first sheet
      return Papa.parse<any>(csv, { skipEmptyLines: true });
    }
    throw new Error("No sheets found in the workbook.");
  }
  return Papa.parse<any>(asText(table.content), { skipEmptyLines: true });
};

/**
 * Reassemble the loosely-shaped easyeyesResources object the production
 * compiler consumes, from contract resources (kind = path prefix).
 *
 * Production shapes (source/Table.js): every kind is a list of resource
 * *names* — the compiler's existence checks compare strings — except
 * phrases, which are the File objects dropped this session. textContents
 * carries pre-fetched corpus text, keyed by name; the shell omits content
 * it could not fetch, so empty content adds no entry.
 */
const buildEasyeyesResources = (resources: CompileResources) => {
  const easyeyesResources: any = {};
  for (const kind of RESOURCE_KINDS) easyeyesResources[kind] = [];
  // Production always provides textContents (possibly empty).
  easyeyesResources.textContents = {} as Record<string, string>;

  for (const f of resources.files ?? []) {
    const slash = f.path.indexOf("/");
    if (slash <= 0) continue;
    const kind = f.path.slice(0, slash);
    const name = f.path.slice(slash + 1);
    if (!name || !(RESOURCE_KINDS as readonly string[]).includes(kind))
      continue;
    if (kind === "phrases") {
      easyeyesResources[kind].push(new File([f.content as BlobPart], name));
      continue;
    }
    easyeyesResources[kind].push(name);
    if (kind === "texts") {
      const text = asText(f.content);
      if (text !== "") easyeyesResources.textContents[name] = text;
    }
  }

  const fetchResource = resources.fetch;
  if (fetchResource) {
    // Production shape: fetchPhraseFromRepo(name) → File | null.
    easyeyesResources.fetchPhraseFromRepo = async (name: string) => {
      const file = await fetchResource(`phrases/${name}`);
      return file
        ? new File([file.content as BlobPart], basename(file.path))
        : null;
    };
  }
  return easyeyesResources;
};

const requestPaths = (c: CallbackCapture): ResourceRequest[] => {
  const requests: ResourceRequest[] = [];
  const add = (kind: string, names: (string | undefined)[]) => {
    for (const name of names)
      if (name) requests.push({ path: `${kind}/${name}` });
  };
  add("forms", [c.requestedForms?.consentForm, c.requestedForms?.debriefForm]);
  add("fonts", c.requestedFontList);
  add("texts", c.requestedTextList);
  add("folders", c.requestedFolderList);
  add("images", c.requestedImageList);
  add("code", c.requestedCodeList);
  add("impulseResponses", c.requestedImpulseResponseList);
  add("frequencyResponses", c.requestedFrequencyResponseList);
  add("targetSoundLists", c.requestedTargetSoundLists);
  add("phrases", [c.requestedPhraseFile]);
  return requests;
};

/**
 * Generated config files, replicating the shell's
 * gatherThresholdCoreFileActions byte-for-byte.
 */
const generatedConfigFiles = (
  user: any,
  compilerUpdateDate: string | undefined,
): EngineFile[] => {
  const files: EngineFile[] = [];

  // CompatibilityRequirements.txt (gitlabUtils.getGitlabBodyForCompatibilityRequirementFile):
  // parsedInfo, plus the shell-fetched deploy date when available.
  const req =
    compilerUpdateDate !== undefined
      ? { ...compatibilityRequirements.parsedInfo, compilerUpdateDate }
      : compatibilityRequirements.parsedInfo;
  files.push({
    path: "CompatibilityRequirements.txt",
    content: JSON.stringify(req),
  });

  // typekit.json (getGitlabBodyForTypekitKit), only when Adobe fonts are used.
  if (typekit.kitId !== "") {
    files.push({
      path: "typekit.json",
      content: JSON.stringify({
        kitId: typekit.kitId,
        fonts: Object.fromEntries(typekit.fonts),
      }),
    });
  }

  // Duration.txt (getGitlabBodyForDurationText).
  files.push({ path: "Duration.txt", content: JSON.stringify(durations) });

  // js/experimentLanguage.js (getGitlabBodyForExperimentLanguage).
  const experimentLanguage =
    user.currentExperiment?._language ??
    (getGlossary()["_language"]?.default as string) ??
    "English";
  const languageDirection = user.currentExperiment?.languageDirection ?? "ltr";
  files.push({
    path: "js/experimentLanguage.js",
    content: `const experimentLanguage = "${experimentLanguage}";\nconst experimentLanguageDirection = "${languageDirection}";`,
  });

  return files;
};

const blockFilesToEngineFiles = async (
  fileList: any[],
): Promise<EngineFile[]> => {
  const files: EngineFile[] = [];
  for (const item of fileList) {
    if (Array.isArray(item)) {
      // node mode: [csvString, name]
      files.push({ path: `conditions/${item[1]}`, content: item[0] });
    } else {
      // web mode: File
      files.push({
        path: `conditions/${item.name}`,
        content: await item.text(),
      });
    }
  }
  return files;
};

const syntheticErrorDiagnostic = (e: any): EasyEyesError => ({
  name: "Unexpected compiler error.",
  message: e?.message || String(e),
  hint: "",
  context: "prepareExperimentFileForThreshold",
  kind: "error",
  parameters: [],
});

export const contractVersion: number = CONTRACT_VERSION;

export const compile = async (
  table: EngineFile,
  resources: CompileResources,
  options?: CompileOptions,
): Promise<CompileResult> => {
  const manifest: CompileManifest = {
    contractVersion: CONTRACT_VERSION,
    engine: { name: ENGINE_NAME, version: ENGINE_VERSION },
  };

  // Release-pinned datasets. The registries are module-global; data passed
  // here takes effect for this and subsequent compiles, matching how the
  // shell initializes them once per session today.
  const data = options?.data ?? {};
  if (data.glossary) initGlossary(data.glossary as any);
  if (data.phrases) initPhrases(data.phrases as any);
  try {
    getGlossary();
    getPhrases();
  } catch {
    manifest.diagnostics = [
      {
        name: "Engine data missing.",
        message:
          "compile() requires options.data.glossary and options.data.phrases (release-pinned parameter glossary and i18n phrases).",
        hint: "",
        context: "threshold-engine",
        kind: "error",
        parameters: [],
      },
    ];
    return { files: [], manifest };
  }

  const user: any = { currentExperiment: {} };
  const errors: EasyEyesError[] = [];
  let captured: CallbackCapture | undefined;
  const callback = (
    cbUser: any,
    requestedForms: any,
    requestedFontList: string[],
    requestedTextList: string[],
    requestedFolderList: string[],
    requestedImageList: string[],
    requestedCodeList: string[],
    fileList: any[],
    errorList: EasyEyesError[],
    requestedImpulseResponseList: string[],
    requestedFrequencyResponseList: string[],
    requestedTargetSoundLists: string[],
    requestedPhraseFile: string,
  ) => {
    captured = {
      user: cbUser,
      requestedForms,
      requestedFontList,
      requestedTextList,
      requestedFolderList,
      requestedImageList,
      requestedCodeList,
      fileList,
      errorList,
      requestedImpulseResponseList,
      requestedFrequencyResponseList,
      requestedTargetSoundLists,
      requestedPhraseFile,
    };
  };

  try {
    const parsed = parseTable(table);
    await prepareExperimentFileForThreshold(
      parsed,
      user,
      errors,
      buildEasyeyesResources(resources),
      callback,
      options?.mode ?? "web",
      options?.compiledFromArchive ?? false,
      basename(table.path),
      options?.local ?? false,
    );
  } catch (e: any) {
    manifest.diagnostics = [syntheticErrorDiagnostic(e)];
    return { files: [], manifest };
  }

  if (!captured) {
    manifest.diagnostics = [
      syntheticErrorDiagnostic(new Error("Compiler produced no result.")),
    ];
    return { files: [], manifest };
  }

  manifest.requests = requestPaths(captured);
  manifest.diagnostics = captured.errorList as any;
  manifest.experiment = {
    ...captured.user.currentExperiment,
    durations: { ...durations },
    compatibilityRequirements: compatibilityRequirements.t,
    compatibilityParsedInfo: compatibilityRequirements.parsedInfo,
  };

  const hasBlockingError = captured.errorList.some(
    (e: any) => e.kind === "error",
  );
  if (hasBlockingError) return { files: [], manifest };

  try {
    const files: EngineFile[] = [
      { path: basename(table.path), content: serializeRootTable(table) },
      ...(await blockFilesToEngineFiles(captured.fileList)),
      ...generatedConfigFiles(
        captured.user,
        data.compilerUpdateDate as string | undefined,
      ),
    ];
    // Reference-by-URL flow (issue #174): emit the same-origin-required
    // entry files pointing the participant runtime at the release URL.
    if (typeof data.entryBaseUrl === "string") {
      files.push(
        ...buildEntryFiles(
          data.entryBaseUrl,
          Boolean(captured.user.currentExperiment?._stepperBool),
        ),
      );
    }
    return { files, manifest };
  } catch (e: any) {
    manifest.diagnostics = [
      ...(captured.errorList as any),
      syntheticErrorDiagnostic(e),
    ];
    return { files: [], manifest };
  }
};

const engine: ThresholdEngine = { contractVersion, compile };
export default engine;
