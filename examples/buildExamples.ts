/* eslint-disable @typescript-eslint/no-explicit-any */

import XLSX from "xlsx";
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
  callback: any
) => {
  const data = readFileSync(file);

  const completeCallback = (parsed: Papa.ParseResult<any>) => {
    prepareExperimentFileForThreshold(parsed, {}, [], callback, "node");
  };

  const book = XLSX.read(data);

  for (const sheet in book.Sheets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csv: any = XLSX.utils.sheet_to_csv(book.Sheets[sheet]);
    Papa.parse(csv, {
      skipEmptyLines: true,
      complete: completeCallback,
    });
    // Only parse the very first sheet
    break;
  }
};

/* -------------------------------------------------------------------------- */

// __main__

const main = async () => {
  for (const d of dir) {
    console.log(`%c===--- ${d.split(".")[0]} ---===`, "color: yellow");
    await preprocessExperimentFileLocal(
      "tables/" + d,
      readFileSync,
      (fileStringList: string[][], errorList: any[]) => {
        if (errorList.length) {
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
            console.log(`${file[1]} created.`);
          });
        });

        copyFileSync("../index.html", `${dir}/index.html`);
        copyFileSync(
          "../recruitmentServiceConfig.csv",
          `${dir}/recruitmentServiceConfig.csv`
        );

        mkdirSync(`${dir}/components`);
        mkdirSync(`${dir}/components/images`);
        copyFileSync(
          "../components/images/favicon.ico",
          `${dir}/components/images/favicon.ico`
        );

        copyFolder("fonts", dir);
        copyFolder("forms", dir);

        mkdirSync(`${dir}/js`);
        copyFileSync("../js/threshold.min.js", `${dir}/js/threshold.min.js`);
      }
    );
    await sleep(100);
  }
};

const copyFolder = (sourceName: string, targetName: string) => {
  const fileList = readdirSync(sourceName + "/");
  mkdirSync(`${targetName}/${sourceName}`);
  fileList.forEach((fileName) => {
    copyFileSync(
      `${sourceName}/${fileName}`,
      `${targetName}/${sourceName}/${fileName}`
    );
  });
};

main();

/* -------------------------------------------------------------------------- */
