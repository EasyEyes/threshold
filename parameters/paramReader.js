import Papa from "papaparse";
import XLSX from "xlsx";
import { GLOSSARY } from "./glossary.ts";

export class ParamReader {
  constructor(experimentFile, callback) {
    this._experimentFile = experimentFile;
    this._experiment = null; // [{ block: 1 }, { block: 1 }, {}...]
    this._blockCount = null;

    this._loadFile(callback);
  }

  read(name, blockOrConditionName = 1) {
    if (
      typeof blockOrConditionName === "number" &&
      blockOrConditionName > this.blockCount
    )
      return null;
    if (name in this._experiment[0])
      return this._getParam(name, blockOrConditionName);
    else return this._getParamGlossary(name);
  }

  _getParam(name, blockOrConditionName) {
    if (typeof blockOrConditionName === "string")
      for (let b of this._experiment) {
        if (b.conditionName === blockOrConditionName) {
          return [b[name]];
        }
      }

    const returner = [];
    for (let b of this._experiment) {
      if (Number(b.block) === blockOrConditionName) returner.push(b[name]);
    }
    return returner;
  }

  _getParamGlossary(name) {
    if (name in GLOSSARY) return [this._realBool(GLOSSARY[name].default)];
    else return [undefined];
  }

  _loadFile(callback) {
    const that = this;

    Papa.parse(this._experimentFile, {
      download: true,
      complete: (results) => {
        const [data, maxBlock] = this._transposeArrays(results.data);
        this._experiment = XLSX.utils.sheet_to_json(
          XLSX.utils.aoa_to_sheet(data),
          {
            defval: "",
          }
        );
        this._blockCount = maxBlock;

        if (callback && typeof callback === "function") callback(that);
      },
    });
  }

  _transposeArrays(a) {
    const aT = [];

    // 1. Remove last if last line is empty
    // 2. Get blockCount
    let blockCount = null;
    let maxLength = -1;
    for (let i in a) {
      if (a[i].length <= 1) a.splice(i, 1);
      else if (a[i].includes("block")) {
        maxLength = Math.max(maxLength, a[i].length);

        const blockRow = [...a[i]];
        blockRow.splice(0, 1);
        blockCount = Math.max(...blockRow);
      }
    }

    for (let ind = 0; ind < maxLength; ind++) {
      const tmp = [];
      for (let row in a) {
        if (ind < a[row].length) {
          tmp.push(this._realBool(a[row][ind]));
        } else {
          tmp.push(this._realBool(a[row][a[row].length - 1]));
        }
      }
      aT.push(tmp);
    }

    return [aT, blockCount];
  }

  _realBool(s) {
    // Translate TRUE and FALSE
    if (s === "TRUE") return true;
    else if (s === "FALSE") return false;
    else return s;
  }

  get blockCount() {
    return this._blockCount;
  }

  get conditions() {
    return this._experiment;
  }
}
