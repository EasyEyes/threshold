/* eslint-disable @typescript-eslint/no-explicit-any */

import { resolve, basename } from "path";

import {
  rmSync,
  writeFile,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { initGlossary } from "../parameters/glossaryRegistry";
import { initPhrases } from "../parameters/phrasesRegistry";
import { wait, getRetryDelayMs } from "../preprocess/retry";
import {
  injectSimulateParticipantIfMissing,
  parseSimulateFlag,
} from "./simulateInject";
import { compileExperimentTableLocally } from "./localCompile";
import { color, htmlToTerminal } from "./terminalFormat";
import type { GlossaryData } from "../../source/components/types";

const DEFAULT_GLOSSARY_URL = "https://easyeyes.app/.netlify/functions/glossary";
const GLOSSARY_URL = process.env.GLOSSARY_URL || DEFAULT_GLOSSARY_URL;
const DEFAULT_PHRASES_URL = "https://easyeyes.app/.netlify/functions/phrases";

// Local dev examples are served at /examples/generated/<name>/, so the
// experiment runtime's path-parser (phrases-loader.ts, glossary-loader.ts)
// reads username="examples" and experimentName="generated" from the URL.
// We pin those Firebase slots so the runtime can resolve the versioned payload.
const LOCAL_DEV_USERNAME = "examples";
const LOCAL_DEV_EXPERIMENT_NAME = "generated";

async function pinVersionForLocalDev(
  url: string,
  label: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: LOCAL_DEV_USERNAME,
          experimentName: LOCAL_DEV_EXPERIMENT_NAME,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const { version } = (await res.json()) as { version: string };
      console.log(
        `${label} version pinned for local dev (${LOCAL_DEV_USERNAME}/${LOCAL_DEV_EXPERIMENT_NAME}): ${version}`,
      );
      return version;
    } catch (err) {
      const delayMs = getRetryDelayMs(attempt);
      if (attempt < 2) {
        console.warn(
          `${label} pin failed (attempt ${attempt + 1}): ${
            (err as Error).message
          }. Retrying in ${Math.round(delayMs)}ms...`,
        );
        await wait(delayMs);
      } else {
        console.warn(
          `${label} pin failed after 3 attempts: ${
            (err as Error).message
          }. Continuing without pinning.`,
        );
      }
    }
  }
  return null;
}

/* ---------- Local cache for glossary/phrases (gitignored .cache/) ----------
 * Avoids 4 sequential network round-trips per `npm run examples`. 24h TTL —
 * the glossary is the compiler's spec, so don't go stale silently. A custom
 * GLOSSARY_URL/PHRASES_URL or EXAMPLES_NO_CACHE=1 bypasses the cache. The
 * Firebase pin PUT is skipped only while the cache is fresh AND the pinned
 * version matches the cached payload version, so a stale pin can last at
 * most one TTL window.
 */
const CACHE_DIR = resolve(__dirname, ".cache");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ResourceCache<T> {
  fetchedAt: number;
  pinnedVersion: string | null;
  payload: T;
}

const readResourceCache = <T>(name: string): ResourceCache<T> | null => {
  try {
    const raw = JSON.parse(
      readFileSync(resolve(CACHE_DIR, `${name}.json`), "utf-8"),
    ) as ResourceCache<T>;
    if (Date.now() - raw.fetchedAt > CACHE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
};

const writeResourceCache = <T>(name: string, cache: ResourceCache<T>): void => {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(resolve(CACHE_DIR, `${name}.json`), JSON.stringify(cache));
};

async function loadGlossaryForNode(): Promise<GlossaryData> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(GLOSSARY_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return (await res.json()) as GlossaryData;
    } catch (err) {
      const delayMs = getRetryDelayMs(attempt++);
      console.warn(
        `Glossary fetch from ${GLOSSARY_URL} failed (attempt ${attempt}): ${
          (err as Error).message
        }. Retrying in ${Math.round(delayMs)}ms...`,
      );
      await wait(delayMs);
    }
  }
}

async function loadPhrasesForNode(): Promise<any> {
  let attempt = 0;
  const url = process.env.PHRASES_URL || DEFAULT_PHRASES_URL;
  while (true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const payload = await res.json();
      initPhrases(payload);
      return payload;
    } catch (err) {
      const delayMs = getRetryDelayMs(attempt++);
      console.warn(
        `Phrases fetch from ${url} failed (attempt ${attempt}): ${
          (err as Error).message
        }. Retrying in ${Math.round(delayMs)}ms...`,
      );
      await wait(delayMs);
    }
  }
}

const dirCount = readdirSync("tables/");
const dir = dirCount.filter((e) => {
  return e.match(/.*\.(xlsx|csv?)/gi);
});

/* -------------------------------------------------------------------------- */

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const formatError = (
  err: any,
  index: number,
  total: number,
  severity: "error" | "warning",
): string => {
  const indexColor = severity === "error" ? color.boldRed : color.boldYellow;
  const lines = [
    `${indexColor(`[${index + 1}/${total}]`)} ${htmlToTerminal(
      err.name ?? "",
    )}`,
  ];
  if (err.parameters?.length)
    lines.push(`  parameters: ${color.boldYellow(err.parameters.join(", "))}`);
  if (err.message)
    lines.push(
      `  ${htmlToTerminal(err.message).trim().split("\n").join("\n  ")}`,
    );
  if (err.hint)
    lines.push(
      color.dim(
        `  hint: ${htmlToTerminal(err.hint).trim().split("\n").join("\n  ")}`,
      ),
    );
  return lines.join("\n");
};

/* -------------------------------------------------------------------------- */

const constructForEXperiment = async (d: string) => {
  console.log(
    color.boldCyan(
      `=====================--- ${d.split(".")[0]} ---=====================`,
    ),
  );

  const simulateFlag = parseSimulateFlag(process.argv);

  const result = await compileExperimentTableLocally("tables/" + d, {
    resourcesRoot: __dirname,
    transformParsedData: simulateFlag
      ? (data) => injectSimulateParticipantIfMissing(data, true)
      : undefined,
  });

  const { user } = result;
  const experimentLanguage = user.currentExperiment?._language ?? "English";
  const languageDirection = user.currentExperiment?.languageDirection ?? "ltr";

  console.log(color.dim("Requested FORMS"), result.requestedForms);
  console.log(color.dim("Requested FONTS"), result.requestedFontList);
  console.log(color.dim("Requested TEXTS"), result.requestedTextList);
  console.log(color.dim("Requested FOLDERS"), result.requestedFolderList);
  console.log(color.dim("Requested IMAGES"), result.requestedImageList);
  console.log(color.dim("Requested CODE"), result.requestedCodeList);

  // Extract remote variable fonts from user.currentExperiment
  const remoteVariableFonts: string[] = [];
  //check _stepperBool to see which RC version to use
  // @latest if TRUE, @0.8.881/lib/RemoteCalibrator.min.js if FALSE
  const stepperBool = user.currentExperiment?._stepperBool;
  const rcVersion =
    stepperBool || stepperBool === undefined
      ? "@latest"
      : "@0.8.881/lib/RemoteCalibrator.min.js";
  console.log(color.dim("rcVersion"), rcVersion);
  if (user.currentExperiment && user.currentExperiment.conditions) {
    for (const condition of user.currentExperiment.conditions) {
      if (condition.fontSource && condition.fontVariableSettings) {
        // Check if font source is "google" (remote)
        if (
          condition.fontSource.toLowerCase() === "google" &&
          condition.font &&
          condition.fontVariableSettings
        ) {
          if (!remoteVariableFonts.includes(condition.font)) {
            remoteVariableFonts.push(condition.font);
          }
        }
      }
    }
  }
  if (remoteVariableFonts.length > 0) {
    console.log(
      color.dim("Requested REMOTE VARIABLE FONTS"),
      remoteVariableFonts,
    );
  }

  console.log(
    color.dim("Requested IMPULSE RESPONSES"),
    result.requestedImpulseResponseList,
  );
  console.log(
    color.dim("Requested FREQUENCY RESPONSES"),
    result.requestedFrequencyResponseList,
  );
  console.log(
    color.dim("Requested TARGET SOUND LISTS"),
    result.requestedTargetSoundLists,
  );
  console.log(color.dim("Requested PHRASES"), result.requestedPhraseFile);
  console.log(color.dim("Requested LANGUAGE"), experimentLanguage);
  console.log(color.dim("Requested LANGUAGE DIRECTION"), languageDirection);

  // Web-compiler checks that cannot run in this environment (they depend on
  // the experimenter's account, not on the table). Reported explicitly so the
  // experimenter knows local fidelity is incomplete here.
  if (result.skippedChecks.length) {
    console.log();
    console.log("=====================");
    console.log(
      color.magenta(
        "CHECKS OMITTED (impossible in the local/node environment)",
      ),
    );
    console.log();
    result.skippedChecks.forEach((s) => console.log(color.dim(`  - ${s}`)));
  }

  // Warnings (kind === "warning") do not block compilation; only real
  // errors do. Same split as the web compiler page.
  if (result.warnings.length) {
    console.log();
    console.log("=====================");
    console.log(color.boldYellow("WARNINGS"));
    console.log();
    result.warnings.forEach((err, i) =>
      console.log(formatError(err, i, result.warnings.length, "warning")),
    );
  }
  if (result.blockingErrors.length) {
    console.log();
    console.log("=====================");
    console.log(color.boldRed("ERRORS"));
    console.log();
    result.blockingErrors.forEach((err, i) =>
      console.log(formatError(err, i, result.blockingErrors.length, "error")),
    );
    return;
  }

  console.log(color.green("SUCCESS"));

  const fileStringList = result.fileStringList;
  const generatedDir = resolve(__dirname, "generated");
  if (!existsSync(generatedDir)) mkdirSync(generatedDir);
  const dir = resolve(generatedDir, d.split(".")[0]);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir);
  mkdirSync(dir + "/conditions");

  fileStringList.forEach((file) => {
    writeFile(`${dir}/conditions/${file[1]}`, file[0], (err) => {
      if (err) throw err;
      // console.log(`${file[1]} created.`);
    });
  });

  // Create minimal index.html with absolute paths for vite dev server
  // Vite serves from project root, so absolute paths resolve correctly:
  // - /first.js and /threshold.js for source files with HMR
  // - /examples/generated/{name}/... for experiment-specific files
  const exampleName = d.split(".")[0];
  const exampleBase = `/examples/generated/${exampleName}`;
  const indexHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />

    <!-- Load serviceWorker as soon as possible -->
    <script src="/coi-serviceworker.js"><\/script>
    <script
      src="https://js.sentry-cdn.com/8d5c414335e8ff6ebf585b7204830e5f.min.js"
      crossorigin="anonymous"
      data-lazy="no"
    ><\/script>

    <title>EasyEyes Study</title>
    <link rel="icon" type="image/x-icon" href="/components/images/favicon.ico" />

    <!-- styles -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jquery-ui-dist@1.12.1/jquery-ui.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.6.1/font/bootstrap-icons.css" />
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.min.js" integrity="sha384-cVKIPhGWiC2Al4u+LWgxfKTRIcfu0JTxR+EQDz/bgldoEyl4H0zUF0QKbrJ0EcQF" crossorigin="anonymous"><\/script>
    <meta http-equiv="Delegate-CH" content="sec-ch-ua-full-version-list https://cloud.51degrees.com; sec-ch-ua-model https://cloud.51degrees.com; sec-ch-ua-platform https://cloud.51degrees.com; sec-ch-ua-platform-version https://cloud.51degrees.com" />
  </head>
  <body>
    <div id="esc-key-handling-div"><\/div>
    <div id="rc-panel-holder"><\/div>
    <div id="root"><\/div>

    <!-- Global error handling for script loading -->
    <script>
      (function () {
        window._failedScripts = [];
        window.onerror = function (message, source, lineno, colno, error) {
          console.error("[EasyEyes Error]", { message, source, line: lineno, column: colno, error });
          return false;
        };
        window.onunhandledrejection = function (event) {
          console.error("[EasyEyes Unhandled Promise Rejection]", event.reason);
        };
        window.addEventListener("error", function (event) {
          if (event.target && event.target.tagName === "SCRIPT") {
            const src = event.target.src || "unknown";
            window._failedScripts.push(src);
            console.error("[EasyEyes Script Load Failed]", src);
          }
        }, true);
        document.addEventListener("readystatechange", function () {
          if (document.readyState === "complete") {
            if (window._failedScripts.length > 0) {
              console.error("Failed scripts:", window._failedScripts);
            }
          }
        });
      })();
    <\/script>

    <!-- external libraries -->
    <script src="${exampleBase}/js/experimentLanguage.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/remote-calibrator${rcVersion}"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/speaker-calibration@2.2.270/dist/main.js" crossorigin="anonymous"><\/script>
    <script id="virtual-keypad-peer" src="https://cdn.jsdelivr.net/gh/EasyEyes/virtual-keypad/dist/ExperimentPeer.js"><\/script>
    <script crossorigin src="https://cloud.51degrees.com/api/v4/AQSjtocC5XcfFwKc20g.js" id="51DegreesScript"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/marked@4.0.7/marked.min.js"><\/script>

    <!-- PsychoJS originals -->
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/jquery-ui-dist@1.12.1/jquery-ui.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/preloadjs@1.0.1/lib/preloadjs.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>

    <!-- compatibility-check -->
    <script src="https://peer.easyeyes.app/main.js" type="module" crossorigin><\/script>
    <script src="https://connection-manager-14ac1ef82705.herokuapp.com/main.js" type="module" crossorigin><\/script>

    <!-- initial load -->
    <script type="module" src="/first.js"><\/script>
    <!-- experiment -->
    <script type="module" src="/threshold.js" defer><\/script>
  </body>
</html>`;
  writeFileSync(`${dir}/index.html`, indexHtml);

  // Copy ONLY the files this experiment requests. (Previously this copied
  // the entire shared dirs — 187MB fonts + 140MB folders — into every
  // generated example, ~366MB × 17 tables per `npm run examples`.)
  copyRequested("fonts", dir, result.requestedFontList);
  copyRequested("forms", dir, Object.values(result.requestedForms ?? {}));
  copyRequested("texts", dir, result.requestedTextList);
  copyRequested("folders", dir, result.requestedFolderList);
  copyRequested("images", dir, result.requestedImageList);
  copyRequested("code", dir, result.requestedCodeList);
  copyRequested("impulseResponses", dir, result.requestedImpulseResponseList);
  copyRequested(
    "frequencyResponses",
    dir,
    result.requestedFrequencyResponseList,
  );
  copyRequested("targetSoundLists", dir, result.requestedTargetSoundLists);
  // models/ has no compile-time requested list (loaded on demand) — small, copy fully.
  copyFolder("../models", dir);

  mkdirSync(`${dir}/js`);
  const jsContent = `const experimentLanguage = "${experimentLanguage}";\nconst experimentLanguageDirection = "${languageDirection}";`;
  writeFile(`${dir}/js/experimentLanguage.js`, jsContent, (err) => {
    if (err) throw err;
  });
};

/* -------------------------------------------------------------------------- */

// __main__

const main = async () => {
  const noCache =
    !!process.env.EXAMPLES_NO_CACHE ||
    !!process.env.GLOSSARY_URL ||
    !!process.env.PHRASES_URL;

  let glossary: GlossaryData;
  let glossaryPinnedVersion: string | null = null;
  const cachedGlossary = noCache
    ? null
    : readResourceCache<GlossaryData>("glossary");
  if (cachedGlossary) {
    glossary = cachedGlossary.payload;
    glossaryPinnedVersion = cachedGlossary.pinnedVersion;
    console.log(
      `Glossary loaded from .cache (version ${glossary.version || "unknown"}).`,
    );
  } else {
    console.log(`Fetching glossary from ${GLOSSARY_URL} ...`);
    glossary = await loadGlossaryForNode();
    console.log(
      `Glossary loaded (version ${glossary.version || "unknown"}, ${
        Object.keys(glossary.glossary || {}).length
      } params).`,
    );
    writeResourceCache("glossary", {
      fetchedAt: Date.now(),
      pinnedVersion: null,
      payload: glossary,
    });
  }
  initGlossary(glossary);

  const phrasesUrl = process.env.PHRASES_URL || DEFAULT_PHRASES_URL;
  let phrasesPayload: any;
  let phrasesPinnedVersion: string | null = null;
  const cachedPhrases = noCache ? null : readResourceCache<any>("phrases");
  if (cachedPhrases) {
    phrasesPayload = cachedPhrases.payload;
    phrasesPinnedVersion = cachedPhrases.pinnedVersion;
    console.log(`Phrases loaded from .cache.`);
  } else {
    console.log(`Fetching phrases from ${phrasesUrl} ...`);
    phrasesPayload = await loadPhrasesForNode();
    console.log(`Phrases loaded.`);
    writeResourceCache("phrases", {
      fetchedAt: Date.now(),
      pinnedVersion: null,
      payload: phrasesPayload,
    });
  }
  if (cachedPhrases) initPhrases(phrasesPayload);

  // Pin (or skip, when the cached pin still matches the cached version).
  if (glossaryPinnedVersion === glossary.version) {
    console.log(`Glossary pin unchanged (${glossary.version}) — skipping PUT.`);
  } else {
    console.log(`Pinning glossary version in Firebase for local dev...`);
    const v = await pinVersionForLocalDev(GLOSSARY_URL, "Glossary");
    if (!noCache)
      writeResourceCache("glossary", {
        fetchedAt: cachedGlossary?.fetchedAt ?? Date.now(),
        pinnedVersion: v,
        payload: glossary,
      });
  }
  if (phrasesPinnedVersion === phrasesPayload?.version) {
    console.log(
      `Phrases pin unchanged (${phrasesPayload?.version}) — skipping PUT.`,
    );
  } else {
    console.log(`Pinning phrases version in Firebase for local dev...`);
    const v = await pinVersionForLocalDev(phrasesUrl, "Phrases");
    if (!noCache)
      writeResourceCache("phrases", {
        fetchedAt: cachedPhrases?.fetchedAt ?? Date.now(),
        pinnedVersion: v,
        payload: phrasesPayload,
      });
  }

  // Create impulseResponses directory if it doesn't exist
  if (!existsSync("impulseResponses")) {
    mkdirSync("impulseResponses");
    console.log("Created impulseResponses directory");
  }

  // Create frequencyResponses directory if it doesn't exist
  if (!existsSync("frequencyResponses")) {
    mkdirSync("frequencyResponses");
    console.log("Created frequencyResponses directory");
  }

  // Create targetSoundLists directory if it doesn't exist
  if (!existsSync("targetSoundLists")) {
    mkdirSync("targetSoundLists");
    console.log("Created targetSoundLists directory");
  }

  // Positional argv (skip node + script path), filter out --simulate (handled
  // separately by parseSimulateFlag).
  const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (positional.length >= 1) {
    const experimentName = positional[0];

    if (dir.includes(experimentName)) {
      await constructForEXperiment(experimentName);
    } else {
      console.error(`:( ${experimentName} not found in examples/tables/ .`);
    }
    return;
  }

  for (const d of dir) {
    await constructForEXperiment(d);
    await sleep(100);
  }
};

const copyRequested = (
  sourceName: string,
  targetName: string,
  fileNames: string[],
) => {
  if (!fileNames || !fileNames.length) return;
  const absoluteSource = resolve(__dirname, sourceName);
  const targetDir = resolve(targetName, sourceName);
  mkdirSync(targetDir, { recursive: true });
  for (const fileName of fileNames) {
    const src = resolve(absoluteSource, fileName);
    // Missing files are already reported by the compiler's presence checks.
    if (!existsSync(src)) continue;
    copyFileSync(src, resolve(targetDir, fileName));
  }
};

const copyFolder = (sourceName: string, targetName: string) => {
  // Resolve relative paths from __dirname
  const absoluteSourceName = sourceName.startsWith("/")
    ? sourceName
    : resolve(__dirname, sourceName);

  // Check if source folder exists
  if (!existsSync(absoluteSourceName)) {
    console.log(
      `Note: ${absoluteSourceName} folder does not exist yet, creating it.`,
    );
    mkdirSync(absoluteSourceName);
  }

  const isFile = (target: string) => statSync(target).isFile();

  const sourceNameLastPart = basename(absoluteSourceName);

  const fileList = readdirSync(absoluteSourceName + "/");
  mkdirSync(`${targetName}/${sourceNameLastPart}`);
  fileList.forEach((fileName) => {
    if (isFile(`${absoluteSourceName}/${fileName}`)) {
      copyFileSync(
        `${absoluteSourceName}/${fileName}`,
        `${targetName}/${sourceNameLastPart}/${fileName}`,
      );
    } else {
      copyFolder(
        `${absoluteSourceName}/${fileName}`,
        `${targetName}/${sourceNameLastPart}`,
      );
    }
  });
};

main();

/* -------------------------------------------------------------------------- */
