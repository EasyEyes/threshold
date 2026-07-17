import Papa from "papaparse";
import { getGlossary, getSuperMatchingParams } from "./glossaryRegistry";
import { INTERNAL_GLOSSARY } from "./internal.ts";

export class ParamReader {
  constructor(experimentFilePath = "conditions", callback) {
    this._experimentFilePath = experimentFilePath;
    this._experiment = null; // [{ block: 1 }, { block: 1 }, {}...]
    this._blockCount = null;

    this._loadFile(callback);
  }

  read(name, blockOrConditionName) {
    const key = this._normalizeReadKey(blockOrConditionName);
    this._assertReadable(name, key);
    return this.has(name)
      ? this._getParam(name, key)
      : this._getParamGlossary(name, key);
  }

  // Resolve the read key: no arg → all blocks; "1" → block 1.
  _normalizeReadKey(key) {
    if (typeof key === "undefined") {
      // No block/condition given: read across ALL blocks (block order).
      // [0] is the first available condition's value — identical to a
      // block-1 read whenever block 1 is populated, and still correct when
      // block 1 has no conditions (e.g. fully disabled).
      return "__ALL_BLOCKS__";
    }
    // A stringified block number ("1") is a block number, not a
    // condition label — normalize before the string branch swallows it.
    if (typeof key === "string" && /^\d+$/.test(key)) return Number(key);
    return key;
  }

  _assertReadable(name, key) {
    if (typeof key === "number") {
      // Numbered reads before the block files load would crash on the null
      // condition list with a confusing TypeError — fail loudly instead.
      if (this._experiment === null)
        throw new Error(
          "[paramReader.read] Parameters not loaded yet — read() called before block files finished loading.",
        );
      if (key > this.blockCount)
        throw new Error("[READER] Invalid Block Number");
    }
    if (
      !(name in getGlossary()) &&
      !this._superMatchParam(name) &&
      !this._matchInternalParam(name)
    )
      throw new Error(`[paramReader.read] Invalid parameter name ${name}`);
  }

  // Given some regex, return a param:value object for all matching params
  readMatching(matchRegex, blockOrConditionName) {
    // eg matchRegex = /questionAndAnswer/
    // A /g or /y flagged regex is STATEFUL: .test() advances lastIndex, so
    // reusing the SAME regex object across many .test() calls (as Array.filter
    // does here) silently skips matches — e.g. callers passing
    // /questionAndAnswer.../g saw ~half their params missed, making the Q&A
    // trial counter read "Trial 1 of 1". The g/y flags only matter for
    // matchAll/exec loops, which we don't do here, so strip them for a fresh,
    // stateless membership test. (Leaves i/m/s/u intact.)
    const re = new RegExp(
      matchRegex.source,
      matchRegex.flags.replace(/[gy]/g, ""),
    );
    const allParams = Object.keys(getGlossary());
    const matchingParams = allParams.filter((parameterName) =>
      re.test(parameterName),
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
    if (!this.conditions || this.conditions.length === 0) return false;
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
        return undefined;
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

    // Underscore (and "!" internal) params are experiment-wide (global):
    // identical across all blocks. If the requested block has no
    // conditions (e.g. block 1 fully disabled), fall back to any
    // remaining condition's value.
    if (
      returner.length === 0 &&
      (name.startsWith("_") || name.startsWith("!")) &&
      this._experiment.length > 0
    )
      returner.push(this._experiment[0][name]);

    return returner;
  }

  _validateExperiment() {
    // Note. CONSERVATION OF THE BLOCK NUMBER: the first block need not be numbered 1
    // (block 1 may be fully disabled, leaving e.g. block 2 first). Consider the
    // experiment loaded once at least one condition is present.
    return Array.isArray(this._experiment) && this._experiment.length > 0;
  }

  _superMatchParam(parameter) {
    for (const superMatchingParameter of getSuperMatchingParams()) {
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
        // Unknown condition label (block_condition) → undefined
        // (matching _getParam's label path), never the glossary default.
        // Only decidable once conditions are loaded; pre-load reads stay
        // permissive.
        if (
          Array.isArray(this._experiment) &&
          this._experiment.length > 0 &&
          !this._experiment.some(
            (b) =>
              b.block_condition === blockOrConditionName ||
              b.conditionName === blockOrConditionName,
          )
        )
          return undefined;
        const entry = this._glossaryEntry(name);
        if (!entry) return undefined; // superMatching params absent from CSVs
        return this.parse(entry.default, entry.type);
      }
      // __ALL_BLOCKS__
      const returner = [];
      const entry = this._glossaryEntry(name);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (let _i in this._experiment) {
        if (entry) returner.push(this.parse(entry.default, entry.type));
      }

      return returner;
    }

    // Number
    let counter = 0;
    for (let b of this._experiment) {
      if (Number(b.block) === blockOrConditionName) counter++;
    }

    // Underscore (and "!" internal) params are global: the default is a
    // single experiment-wide value, even when the requested block has no
    // conditions.
    const copies =
      name.startsWith("_") || name.startsWith("!")
        ? Math.max(counter, 1)
        : counter;
    const entry = this._glossaryEntry(name);
    if (entry) return Array(copies).fill(this.parse(entry.default, entry.type));
    else return Array(counter).fill(undefined);
  }

  _loadFile(callback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;

    // Loud load failure: record, log, and surface via a window error event.
    // The callback is NOT called, so the experiment never silently "runs"
    // with zero or garbage conditions.
    const failLoad = (what, err) => {
      const error = new Error(
        `[paramReader] Failed to load experiment conditions (${what}): ${
          err && err.message ? err.message : err
        }`,
      );
      that._loadError = error;
      console.error(error);
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(
          new ErrorEvent("error", { error, message: error.message }),
        );
      }
    };

    Papa.parse(`./${this._experimentFilePath}/blockCount.csv`, {
      download: true,
      error: (err) => failLoad("blockCount.csv", err),
      complete: ({ data }) => {
        this._experiment = [];

        // Empty/garbage blockCount.csv — never silently run zero blocks.
        if (!data || data.length === 0) {
          failLoad("blockCount.csv is empty or unreadable");
          return;
        }

        // CONSERVATION OF THE BLOCK NUMBER: blockCount.csv's "block" column holds
        // the ACTUAL block numbers from the spreadsheet (conserved, never
        // renumbered), so disabling/shuffling blocks leaves the numbers intact.
        // We load each block file by its conserved number, which may be sparse
        // (e.g. block_1.csv, block_3.csv when block 2 was fully disabled).
        // Skip the header row (data[0]), any blank/non-numeric rows, and
        // duplicate block numbers (a duplicated row must not duplicate the
        // block's conditions).
        const blockNumbers = Array.from(
          new Set(
            data
              .slice(1)
              .map((row) => parseInt(row[0]))
              .filter((b) => !isNaN(b)),
          ),
        );

        if (blockNumbers.length === 0) {
          failLoad("blockCount.csv lists no blocks");
          return;
        }

        // _blockCount is the highest block number, so reads keyed by block
        // number accept every conserved block number (gaps simply return []).
        this._blockCount = Math.max(...blockNumbers);

        let blocksLoaded = 0;
        for (const blockNumber of blockNumbers) {
          Papa.parse(`./${this._experimentFilePath}/block_${blockNumber}.csv`, {
            download: true,
            error: (err) => failLoad(`block_${blockNumber}.csv`, err),
            complete: ({ data }) => {
              const headlines = data && data[0];
              // A valid block CSV always has a "block" column; anything else
              // (e.g. an HTML 404 page parsed as CSV) is a load failure.
              if (
                !data ||
                data.length === 0 ||
                !Array.isArray(headlines) ||
                !headlines.includes("block")
              ) {
                failLoad(`block_${blockNumber}.csv is empty or malformed`);
                return;
              }

              // Drop ragged rows with a filter — splice-while-iterating
              // skips consecutive bad rows, and the survivor then crashed
              // parse() on undefined.
              const uniformRows = data.filter(
                (row) => row.length >= headlines.length,
              );

              for (let r = 1; r < uniformRows.length; r++) {
                const thisCondition = {};
                for (let c in headlines) {
                  thisCondition[headlines[c]] = this.parse(uniformRows[r][c]);
                }
                // safety net: compiler should already have removed disabled conditions
                if (thisCondition.conditionEnabledBool === false) continue;
                this._experiment.push(thisCondition);
              }

              blocksLoaded++;
              // reached only when all blocks are loaded
              if (blocksLoaded === blockNumbers.length) {
                // Every row loaded, but nothing usable (e.g. all disabled)
                // — fail loudly instead of hanging on the validate poll.
                if (this._experiment.length === 0) {
                  failLoad("no enabled conditions in any block file");
                  return;
                }
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

  _glossaryEntry(name) {
    // Internal ("!"-prefixed) params fall back to INTERNAL_GLOSSARY when
    // absent from the fetched glossary (e.g. older compiled experiments).
    return getGlossary()[name] || INTERNAL_GLOSSARY[name];
  }

  parse(s) {
    // Missing cells (ragged CSVs) — pass through instead of crashing.
    if (s === undefined || s === null) return s;
    // Block CSVs are read raw; trim cell whitespace like the compiler does.
    if (typeof s === "string") s = s.trim();
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
