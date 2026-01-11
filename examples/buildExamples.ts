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

      const dir = `${__dirname}/${d.split(".")[0]}`;
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      mkdirSync(dir);
      mkdirSync(dir + "/conditions");

      fileStringList.forEach((file) => {
        writeFile(`${dir}/conditions/${file[1]}`, file[0], (err) => {
          if (err) throw err;
          // console.log(`${file[1]} created.`);
        });
      });

      // Conditionally copy index.html or index2.html based on _stepperBool parameter
      const sourceIndexFile = user.currentExperiment?._stepperBool
        ? resolve(__dirname, "../index.html")
        : resolve(__dirname, "../index-stepper-bool.html");
      copyFileSync(sourceIndexFile, `${dir}/index.html`);

      copyFileSync(
        resolve(__dirname, "../recruitmentServiceConfig.csv"),
        `${dir}/recruitmentServiceConfig.csv`,
      );
      copyFileSync(
        resolve(
          __dirname,
          "../components/multiple-displays/peripheralDisplay.html",
        ),
        `${dir}/peripheralDisplay.html`,
      );
      copyFileSync(
        resolve(
          __dirname,
          "../components/multiple-displays/peripheralDisplay.js",
        ),
        `${dir}/peripheralDisplay.js`,
      );
      copyFileSync(
        resolve(
          __dirname,
          "../components/multiple-displays/multipleDisplay.css",
        ),
        `${dir}/multipleDisplay.css`,
      );

      mkdirSync(`${dir}/components`);
      mkdirSync(`${dir}/components/images`);
      copyFileSync(
        resolve(__dirname, "../components/images/favicon.ico"),
        `${dir}/components/images/favicon.ico`,
      );
      copyFileSync(
        resolve(__dirname, "../components/images/ios_settings.png"),
        `${dir}/components/images/ios_settings.png`,
      );

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
      console.log(jsContent);
      writeFile(`${dir}/js/experimentLanguage.js`, jsContent, (err) => {
        if (err) throw err;
        console.log(`experimentLanguage.js created.`);
      });
      copyFileSync(
        resolve(__dirname, "../js/threshold.min.js"),
        `${dir}/js/threshold.min.js`,
      );
      copyFileSync(
        resolve(__dirname, "../js/threshold.min.js.map"),
        `${dir}/js/threshold.min.js.map`,
      );
      copyFileSync(
        resolve(__dirname, "../js/threshold.css"),
        `${dir}/js/threshold.css`,
      );
      copyFileSync(
        resolve(__dirname, "../js/first.min.js"),
        `${dir}/js/first.min.js`,
      );

      // Copy i18n.js, removing sourcemap comment (map file intentionally deleted in production)
      const i18nContent = readFileSync(
        resolve(__dirname, "../js/i18n.js"),
        "utf-8",
      );
      const i18nWithoutMap = i18nContent.replace(
        /\n\/\/# sourceMappingURL=.*\n/,
        "\n",
      );
      writeFileSync(`${dir}/js/i18n.js`, i18nWithoutMap);

      copyFileSync(
        resolve(__dirname, "../js/preload-helper.js"),
        `${dir}/js/preload-helper.js`,
      );
      copyFileSync(
        resolve(__dirname, "../js/preload-helper.min.js.map"),
        `${dir}/js/preload-helper.min.js.map`,
      );
      copyFileSync(
        resolve(__dirname, "../@rust/pkg/easyeyes_wasm.js"),
        `${dir}/js/easyeyes_wasm.js`,
      );
      copyFileSync(
        resolve(__dirname, "../@rust/pkg/easyeyes_wasm_bg.wasm"),
        `${dir}/js/easyeyes_wasm_bg.wasm`,
      );

      copyFileSync(
        resolve(__dirname, "../coi-serviceworker.js"),
        `${dir}/coi-serviceworker.js`,
      );

      copyFileSync(
        resolve(__dirname, "../components/sounds/reading-page-flip.mp3"),
        `${dir}/js/reading-page-flip.mp3`,
      );
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
