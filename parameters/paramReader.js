import Papa from "papaparse";
import { GLOSSARY } from "./glossary.ts";

export class ParamReader {
  constructor(experimentFilePath = "conditions", callback) {
    this._experimentFilePath = experimentFilePath;
    this._experiment = null; // [{ block: 1 }, { block: 1 }, {}...]
    this._blockCount = null;

    this._loadFile(callback);
  }

  read(name, blockOrConditionName = 1) {
    if (
      typeof blockOrConditionName === "number" &&
      blockOrConditionName > this.blockCount
    )
      return;

    if (this.has(name)) return this._getParam(name, blockOrConditionName);
    else return this._getParamGlossary(name, blockOrConditionName);
  }

  has(name) {
    if (!this.conditions) return false;
    return name in this.conditions[0];
  }

  _getParam(name, blockOrConditionName) {
    // ! String - condition name
    if (typeof blockOrConditionName === "string")
      if (blockOrConditionName !== "__ALL_BLOCKS__") {
        for (let b of this._experiment) {
          if (
            b.label === blockOrConditionName ||
            b.conditionName === blockOrConditionName
          ) {
            return b[name];
          }
        }
      } else {
        // ! __ALL_BLOCKS__
        const returner = [];
        for (let b of this._experiment) returner.push(b[name]);
        return returner;
      }

    // ! Number - block
    const returner = [];
    for (let b of this._experiment) {
      if (Number(b.block) === blockOrConditionName) returner.push(b[name]);
    }
    return returner;
  }

  _getParamGlossary(name, blockOrConditionName) {
    // String
    if (typeof blockOrConditionName === "string") {
      if (blockOrConditionName !== "__ALL_BLOCKS__") {
        if (name in GLOSSARY) return this.parse(GLOSSARY[name].default);
        else return undefined;
      } else {
        // __ALL_BLOCKS__
        const returner = [];
        for (let i in this._experiment)
          returner.push(this.parse(GLOSSARY[name].default));
        return returner;
      }
    }

    // Number
    let counter = 0;
    for (let b of this._experiment) {
      if (Number(b.block) === blockOrConditionName) counter++;
    }

    if (name in GLOSSARY)
      return Array(counter).fill(this.parse(GLOSSARY[name].default));
    else return Array(counter).fill(undefined);
  }

  _loadFile(callback) {
    const that = this;

    Papa.parse(`./${this._experimentFilePath}/blockCount.csv`, {
      download: true,
      complete: ({ data }) => {
        if (parseInt(data[data.length - 1][0]) !== NaN) {
          this._blockCount = Number(data[data.length - 1][0]) + 1;
        }
        // Last line in blockCount is space
        else this._blockCount = Number(data[data.length - 2][0]) + 1;

        this._experiment = [];

        for (let i = 1; i <= this._blockCount; i++) {
          Papa.parse(`./${this._experimentFilePath}/block_${i}.csv`, {
            download: true,
            complete: ({ data }) => {
              const headlines = data[0];

              for (let row in data)
                if (data[row].length < headlines.length) data.splice(row, 1);

              for (let r = 1; r < data.length; r++) {
                const thisCondition = {};
                for (let c in headlines) {
                  thisCondition[headlines[c]] = this.parse(data[r][c]);
                }
                this._experiment.push(thisCondition);
              }
              if (i === this._blockCount) {
                if (callback && typeof callback === "function") callback(that);
              }
            },
          });
        }
      },
    });
  }

  parse(s) {
    // Translate TRUE and FALSE
    // Translate number to number
    if (s.toLowerCase() === "TRUE".toLowerCase()) return true;
    else if (s.toLowerCase() === "FALSE".toLowerCase()) return false;

    if (!isNaN(s)) return Number(s);

    return s;
  }

  get blockCount() {
    return this._blockCount;
  }

  get conditions() {
    return this._experiment;
  }
}
