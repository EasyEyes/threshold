/**
 * ExperimentHandler.save: one stable data file per experiment.
 *
 * Field evidence (Acuity24FontsAddSloan4/7/9, 2026-10): save() rebuilt the
 * upload key from `info.date || MonotonicClock.getDateStr()` on EVERY save,
 * so until EasyEyes' updateInfo stamped extraInfo.date, each partial /
 * visibility-breadcrumb / unload save spawned a NEW timestamped CSV on
 * Pavlovia. Shiny then listed each file as its own "session" — e.g. four
 * rows "marked incomplete 🚧 yet carrying the correct completion code",
 * which were early saves of participants who in fact completed (Denis
 * Pelli 2026-10 card, item 2). The constructor already fixes the name once
 * (`this._dataFileName`, documented "controls final data file name");
 * save() must reuse it, not recompute.
 *
 * @jest-environment node
 */

import "@jest/globals";

// global.js has top-level await (unparseable under babel CJS).
jest.mock("../components/global", () => ({ calibrationTime: 0 }));

// The clock advances on every call: without a stable name, every save
// produces a different timestamped filename (the field bug). Constructable
// so a real ExperimentHandler can be built (experimentClock).
let tick = 0;
jest.mock("../psychojs/src/util/Clock.js", () => {
  const actual = jest.requireActual("../psychojs/src/util/Clock.js");
  return {
    ...actual,
    MonotonicClock: class extends actual.MonotonicClock {
      static getDateStr() {
        return `2026-10-08_08h45.39.${(tick += 1)}`;
      }
      static getTimeZone() {
        return "UTC1";
      }
    },
  };
});

import { ExperimentHandler } from "../psychojs/src/data/ExperimentHandler";

const makeContext = (extraInfo) => {
  const uploadData = jest.fn(() => "saved");
  const ctx = {
    // What the constructor would have fixed at construction time.
    _dataFileName: "LuckyAquaDuck208_62903d86dad1252ede51100f_Exp_0001_T1",
    _trialsKeys: [],
    _loops: [],
    _trialsData: [{ response: 1 }],
    extraInfo,
    _psychoJS: {
      config: {
        experiment: {
          name: "Exp",
          saveFormat: ExperimentHandler.SaveFormat.CSV,
          status: "RUNNING",
        },
      },
      getEnvironment: () => ExperimentHandler.Environment.SERVER,
      _serverMsg: { has: () => false },
      serverManager: { uploadData },
      experiment: { getExtraInfo: () => extraInfo },
      inputParameters: [],
      logger: { info: () => {}, warn: () => {} },
    },
  };
  // Real ordering logic (duck-typed `this`, as in experimentHandlerOrder.test.ts).
  ctx._orderOutput = ExperimentHandler.prototype._orderOutput.bind(ctx);
  return { ctx, uploadData };
};

const keysOf = (uploadData) => uploadData.mock.calls.map(([k]) => k);

describe("ExperimentHandler.save uses the constructor-fixed data filename", () => {
  test("two saves before extraInfo.date is set upload to the SAME key", async () => {
    const { ctx, uploadData } = makeContext({ participant: "P" });
    await ExperimentHandler.prototype.save.call(ctx, {});
    await ExperimentHandler.prototype.save.call(ctx, {});
    expect(keysOf(uploadData).length).toBe(2);
    expect(new Set(keysOf(uploadData)).size).toBe(1);
  });

  test("extraInfo.date stamped between saves does not fork the filename", async () => {
    const { ctx, uploadData } = makeContext({ participant: "P" });
    await ExperimentHandler.prototype.save.call(ctx, {});
    ctx.extraInfo.date = "2026-10-08_09h30.26.978 UTC+1";
    await ExperimentHandler.prototype.save.call(ctx, {});
    expect(new Set(keysOf(uploadData)).size).toBe(1);
  });

  test("the key is the constructor filename plus tag and .csv", async () => {
    const { ctx, uploadData } = makeContext({ participant: "P" });
    await ExperimentHandler.prototype.save.call(ctx, { tag: "-final" });
    expect(keysOf(uploadData)[0]).toBe(
      "LuckyAquaDuck208_62903d86dad1252ede51100f_Exp_0001_T1-final.csv",
    );
  });
});

describe("ExperimentHandler owns the complete date+timezone filename", () => {
  const makeHandler = (extraInfo, psychoJS = undefined) =>
    new ExperimentHandler({
      psychoJS: psychoJS ?? { config: { experiment: { name: "Exp" } } },
      extraInfo,
    });

  test("extraInfo.date at construction is embedded verbatim, timezone included", () => {
    const handler = makeHandler({
      participant: "P",
      ProlificParticipantID: "62903d86dad1",
      session: "0001",
      date: "2026-10-08_08h45.39.765 UTC1",
    });
    expect(handler._dataFileName).toBe(
      "P_62903d86dad1_Exp_0001_2026-10-08_08h45.39.765 UTC1",
    );
  });

  test("without extraInfo.date, construction fixes a timezone-suffixed key reused by every save", async () => {
    const extraInfo = { participant: "P", session: "0001" };
    const uploadData = jest.fn(() => "saved");
    const handler = makeHandler(extraInfo, {
      config: {
        experiment: {
          name: "Exp",
          saveFormat: ExperimentHandler.SaveFormat.CSV,
          status: "RUNNING",
        },
      },
      getEnvironment: () => ExperimentHandler.Environment.SERVER,
      _serverMsg: { has: () => false },
      serverManager: { uploadData },
      experiment: { getExtraInfo: () => extraInfo },
      inputParameters: [],
      logger: { info: () => {}, warn: () => {} },
    });
    handler._trialsData = [{ response: 1 }];

    await handler.save({});
    await handler.save({});

    const keys = keysOf(uploadData);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toMatch(/^P_Exp_0001_2026-10-08_08h45\.39\.\d+ UTC1\.csv$/);
  });
});
