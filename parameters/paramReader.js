import Papa from "papaparse";
import { GLOSSARY, SUPER_MATCHING_PARAMS } from "./glossary.ts";
import { INTERNAL_GLOSSARY } from "./internal.ts";

export class ParamReader {
  constructor(experimentFilePath = "conditions", callback) {
    this._experimentFilePath = experimentFilePath;
    this._experiment = null; // [{ block: 1 }, { block: 1 }, {}...]
    this._blockCount = null;

    this._loadFile(callback);
  }

  read(name, blockOrConditionName) {
    if (typeof blockOrConditionName === "undefined") {
      // Set here instead of in fn signature so that .ts doesn't believe blockOrConditionName has to be a number
      blockOrConditionName = 1;
    }
    if (
      typeof blockOrConditionName === "number" &&
      blockOrConditionName > this.blockCount
    )
      throw "[READER] Invalid Block Number";

    if (
      !(name in GLOSSARY) &&
      !this._superMatchParam(name) &&
      !this._matchInternalParam(name)
    )
      throw `[paramReader.read] Invalid parameter name ${name}`;

    if (this.has(name)) return this._getParam(name, blockOrConditionName);
    else return this._getParamGlossary(name, blockOrConditionName);
  }

  // Given some regex, return a param:value object for all matching params
  readMatching(matchRegex, blockOrConditionName) {
    // eg matchRegex = /questionAndAnswer/
    const allParams = Object.keys(GLOSSARY);
    const matchingParams = allParams.filter((parameterName) =>
      matchRegex.test(parameterName),
    );

    const resultMap = new Map();

    for (const param of matchingParams) {
      // Check if this is a superMatching parameter (contains @@)
      if (param.includes("@@")) {
        // Expand the superMatching parameter to find numbered instances
        const baseParam = param.replace(/@@/g, "");
        let index = 1;
        let foundParam = true;

        while (foundParam) {
          // Generate the numbered parameter name (e.g., questionAndAnswer01, questionAndAnswer02)
          const numberedParam = baseParam + String(index).padStart(2, "0");

          // Check if this numbered parameter exists in the conditions
          if (this.has(numberedParam)) {
            resultMap.set(
              numberedParam,
              this.read(numberedParam, blockOrConditionName),
            );
            index++;
          } else {
            foundParam = false;
          }
        }
      } else {
        // Regular parameter, add it directly
        resultMap.set(param, this.read(param, blockOrConditionName));
      }
    }
    return resultMap;
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
            b.block_condition === blockOrConditionName ||
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

    for (let b of this._experiment)
      if (Number(b.block) === blockOrConditionName) returner.push(b[name]);

    return returner;
  }

  _validateExperiment() {
    let valid = false;
    for (let b of this._experiment) {
      if (Number(b.block) === 1) valid = true;
    }
    return valid;
  }

  _superMatchParam(parameter) {
    for (const superMatchingParameter of SUPER_MATCHING_PARAMS) {
      const possibleSharedString = superMatchingParameter.replace(/@/g, "");
      if (
        parameter.includes(possibleSharedString) &&
        superMatchingParameter.replace(possibleSharedString, "").length ===
          parameter.replace(possibleSharedString, "").length
      )
        return true;
    }
    return false;
  }

  _matchInternalParam(parameter) {
    return parameter in INTERNAL_GLOSSARY;
  }

  _getParamGlossary(name, blockOrConditionName) {
    // String
    if (typeof blockOrConditionName === "string") {
      if (blockOrConditionName !== "__ALL_BLOCKS__") {
        if (name in GLOSSARY) {
          if (this._nameInGlossary(name))
            return this.parse(GLOSSARY[name].default, GLOSSARY[name].type);
        } else return undefined;
      } else {
        // __ALL_BLOCKS__
        const returner = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (let _i in this._experiment) {
          if (this._nameInGlossary(name))
            returner.push(
              this.parse(GLOSSARY[name].default, GLOSSARY[name].type),
            );
        }

        return returner;
      }
    }

    // Number
    let counter = 0;
    for (let b of this._experiment) {
      if (Number(b.block) === blockOrConditionName) counter++;
    }

    if (this._nameInGlossary(name))
      return Array(counter).fill(
        this.parse(GLOSSARY[name].default, GLOSSARY[name].type),
      );
    else return Array(counter).fill(undefined);
  }

  _loadFile(callback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;

    Papa.parse(`./${this._experimentFilePath}/blockCount.csv`, {
      download: true,
      complete: ({ data }) => {
        if (!isNaN(parseInt(data[data.length - 1][0]))) {
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

              // reached only when all blocks are loaded
              if (i === this._blockCount) {
                if (callback && typeof callback === "function") {
                  ////
                  const _validateInterval = setInterval(() => {
                    if (this._validateExperiment()) {
                      clearInterval(_validateInterval);
                      callback(that);
                    }
                  }, 500);
                  ////
                }
              }
            },
          });
        }
      },
    });
  }

  _nameInGlossary(name) {
    if (name in GLOSSARY) return true;
    throw `[paramReader] Invalid parameter name ${name}`;
  }

  parse(s) {
    // Translate TRUE and FALSE
    // Translate number to number
    if (s.toLowerCase() === "TRUE".toLowerCase()) return true;
    else if (s.toLowerCase() === "FALSE".toLowerCase()) return false;

    if (!isNaN(s) && s !== "") return Number(s);

    return String(s);
  }

  get blockCount() {
    return this._blockCount;
  }

  get conditions() {
    return this._experiment;
  }

  get block_conditions() {
    return this._experiment.map((o) => o.block_condition);
  }
}
