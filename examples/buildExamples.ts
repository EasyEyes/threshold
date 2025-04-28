/* eslint-disable @typescript-eslint/no-explicit-any */

import { read, utils } from "xlsx";
import Papa from "papaparse";

import {
  rmSync,
  readFileSync,
  writeFile,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
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
    ) => {
      console.log("Requested FORMS", forms);
      console.log("Requested FONTS", fonts);
      console.log("Requested TEXTS", texts);
      console.log("Requested FOLDERS", folders);
      console.log("Requested IMAGES", images);
      console.log("Requested CODE", code);
      console.log("Requested IMPULSE RESPONSES", impulseResponses);

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

      copyFileSync("../index.html", `${dir}/index.html`);
      copyFileSync(
        "../recruitmentServiceConfig.csv",
        `${dir}/recruitmentServiceConfig.csv`,
      );
      copyFileSync(
        "../components/multiple-displays/peripheralDisplay.html",
        `${dir}/peripheralDisplay.html`,
      );
      copyFileSync(
        "../components/multiple-displays/peripheralDisplay.js",
        `${dir}/peripheralDisplay.js`,
      );
      copyFileSync(
        "../components/multiple-displays/multipleDisplay.css",
        `${dir}/multipleDisplay.css`,
      );

      mkdirSync(`${dir}/components`);
      mkdirSync(`${dir}/components/images`);
      copyFileSync(
        "../components/images/favicon.ico",
        `${dir}/components/images/favicon.ico`,
      );
      copyFileSync(
        "../components/images/ios_settings.png",
        `${dir}/components/images/ios_settings.png`,
      );

      copyFolder("fonts", dir);
      copyFolder("forms", dir);
      copyFolder("texts", dir);
      copyFolder("folders", dir);
      copyFolder("images", dir);
      copyFolder("code", dir);
      copyFolder("impulseResponses", dir);

      mkdirSync(`${dir}/js`);
      copyFileSync("../js/threshold.min.js", `${dir}/js/threshold.min.js`);
      copyFileSync("../js/first.min.js", `${dir}/js/first.min.js`);

      copyFileSync("../coi-serviceworker.js", `${dir}/coi-serviceworker.js`);

      copyFileSync(
        "../js/reading-page-flip.mp3",
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
  // Check if source folder exists
  if (!existsSync(sourceName)) {
    console.log(`Note: ${sourceName} folder does not exist yet, creating it.`);
    mkdirSync(sourceName);
  }

  const fileList = readdirSync(sourceName + "/");
  mkdirSync(`${targetName}/${sourceName}`);
  fileList.forEach((fileName) => {
    copyFileSync(
      `${sourceName}/${fileName}`,
      `${targetName}/${sourceName}/${fileName}`,
    );
  });
};

main();

/* -------------------------------------------------------------------------- */
