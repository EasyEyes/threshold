/* eslint-disable @typescript-eslint/no-explicit-any */

import { read, utils } from "xlsx";
import Papa from "papaparse";
import { resolve, basename } from "path";

import {
  rmSync,
  readFileSync,
  writeFile,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { prepareExperimentFileForThreshold } from "../preprocess/main";

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

// For Node use
const preprocessExperimentFileLocal = async (
  file: string,
  readFileSync: any,
  callback: any,
) => {
  const data = readFileSync(file);

  const completeCallback = (parsed: Papa.ParseResult<any>) => {
    prepareExperimentFileForThreshold(
      parsed,
      {},
      [],
      {
        fonts: [],
        forms: [],
        folders: [],
        images: [],
        impulseResponses: [],
        frequencyResponses: [],
        targetSoundLists: [],
      },
      callback,
      "node",
      false,
      file,
      true,
    );
  };

  const book = read(data);

  for (const sheet in book.Sheets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csv: any = utils.sheet_to_csv(book.Sheets[sheet]);
    Papa.parse(csv, {
      skipEmptyLines: true,
      complete: completeCallback,
    });
    // Only parse the very first sheet
    break;
  }
};

/* -------------------------------------------------------------------------- */

const constructForEXperiment = async (d: string) => {
  console.log(
    `%c=====================--- ${d.split(".")[0]} ---=====================`,
    "color: yellow",
  );
  await preprocessExperimentFileLocal(
    "tables/" + d,
    readFileSync,
    (
      user: any,
      forms: any,
      fonts: string[],
      texts: string[],
      folders: string[],
      images: string[],
      code: string[],
      fileStringList: string[][],
      errorList: any[],
      impulseResponses: string[],
      frequencyResponses: string[],
      targetSoundLists: string[],
    ) => {
      console.log("Requested FORMS", forms);
      console.log("Requested FONTS", fonts);
      console.log("Requested TEXTS", texts);
      console.log("Requested FOLDERS", folders);
      console.log("Requested IMAGES", images);
      console.log("Requested CODE", code);

      // Extract remote variable fonts from user.currentExperiment
      const remoteVariableFonts: string[] = [];
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
        console.log("Requested REMOTE VARIABLE FONTS", remoteVariableFonts);
      }

      console.log("Requested IMPULSE RESPONSES", impulseResponses);
      console.log("Requested FREQUENCY RESPONSES", frequencyResponses);
      console.log("Requested TARGET SOUND LISTS", targetSoundLists);
      if (errorList.length) {
        console.log();
        console.log("=====================");
        console.log("ERRORS");
        console.log();

        errorList.forEach((err) => console.log(err));
        throw "Found errors!";
      }

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
    <script src="https://cdn.jsdelivr.net/npm/remote-calibrator@0.8.88"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/speaker-calibration@2.2.269/dist/main.js" crossorigin="anonymous"><\/script>
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

      // Copy only experiment-specific files
      copyFolder("fonts", dir);
      copyFolder("forms", dir);
      copyFolder("texts", dir);
      copyFolder("folders", dir);
      copyFolder("images", dir);
      copyFolder("code", dir);
      copyFolder("../models", dir);
      copyFolder("impulseResponses", dir);
      copyFolder("frequencyResponses", dir);
      copyFolder("targetSoundLists", dir);

      mkdirSync(`${dir}/js`);
      const experimentLanguage = user.currentExperiment?._language ?? "English";
      const jsContent = `const experimentLanguage = "${experimentLanguage}"`;
      console.log(`Requested LANGUAGE ${experimentLanguage}`);
      writeFile(`${dir}/js/experimentLanguage.js`, jsContent, (err) => {
        if (err) throw err;
      });
    },
  );
};

/* -------------------------------------------------------------------------- */

// __main__

const main = async () => {
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

  if (process.argv.length === 3) {
    const experimentName = process.argv[2];

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
