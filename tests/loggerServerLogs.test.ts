/**
 * Logger._serverLogs — the server-log buffer PsychoJS uploads as .log.gz.
 *
 * Data retention is paramount: the buffer is UNBOUNDED. Real field sessions
 * measured 294k lines (LARGEPilotTest5), 99.7% of which were per-frame
 * attribute re-logging of unchanged values (e.g. "tinyHint: pos = [0,-540]"
 * ×43,230 in one session). Consecutive identical messages therefore collapse
 * into one entry carrying a repeat count — the full record (message, first
 * time, last time, count) survives at a fraction of the memory.
 *
 * Nothing in the easyeyes org reads .log.gz (org-wide audit 2026-10-22), but
 * it is the PsychoPy-convention scientific record: never truncated silently.
 *
 * @jest-environment node
 */

jest.mock("log4javascript", () => ({}), { virtual: true });
jest.mock("pako", () => ({}), { virtual: true });
jest.mock("../psychojs/src/data/ExperimentHandler.js", () => ({
  ExperimentHandler: { Environment: { SERVER: 1, LOCAL: 0 } },
}));

import { Logger } from "../psychojs/src/core/Logger.js";

/** A Logger with only what log() touches — no constructor side effects. */
const bareLogger = () => {
  const logger = Object.create(Logger.prototype) as any;
  logger._serverLogs = [];
  logger._serverLevelValue = 0; // log everything
  return logger;
};

describe("Logger server-log buffer (unbounded, duplicate-collapsed)", () => {
  it("keeps every entry — the buffer is never truncated", () => {
    // 60,000 distinct messages exceed the old 50k FIFO cap; retention of the
    // full record outranks the memory cost (~125 B/entry measured).
    const logger = bareLogger();
    for (let i = 0; i < 60_000; i++)
      logger.log(`msg ${i}`, Logger.ServerLevel.DATA);
    expect(logger._serverLogs.length).toBe(60_000);
    expect(logger._serverLogs[0].msg).toBe("msg 0");
    expect(logger._serverLogs.at(-1).msg).toBe("msg 59999");
  });

  it("collapses consecutive identical messages into one entry with a count", () => {
    const logger = bareLogger();
    for (let i = 0; i < 1_000; i++)
      logger.log("tinyHint: pos = [0,-540]", Logger.ServerLevel.EXP, i);
    expect(logger._serverLogs.length).toBe(1);
    expect(logger._serverLogs[0].repeatCount).toBe(1_000);
    expect(logger._serverLogs[0].time).toBe(0);
    expect(logger._serverLogs[0].lastTime).toBe(999);
  });

  it("does not collapse distinct messages, and a broken run starts anew", () => {
    const logger = bareLogger();
    logger.log("a", Logger.ServerLevel.EXP, 1);
    logger.log("b", Logger.ServerLevel.EXP, 2);
    logger.log("b", Logger.ServerLevel.EXP, 3);
    logger.log("a", Logger.ServerLevel.EXP, 4);
    expect(logger._serverLogs.length).toBe(3);
    expect(logger._serverLogs[0].repeatCount).toBeUndefined();
    expect(logger._serverLogs[1].repeatCount).toBe(2);
    expect(logger._serverLogs[2].msg).toBe("a");
  });

  it("does not collapse across levels", () => {
    const logger = bareLogger();
    logger.log("same", Logger.ServerLevel.EXP, 1);
    logger.log("same", Logger.ServerLevel.DATA, 2);
    expect(logger._serverLogs.length).toBe(2);
  });

  it("never collapses DATA-level events — two identical keydowns stay separate", () => {
    // Mouse/Keydown DATA events embed the position/key IN the message; two
    // consecutive identical events are two distinct scientific events, and
    // each timestamp must survive (response-latency analysis reads these).
    const logger = bareLogger();
    logger.log("Keydown: a", Logger.ServerLevel.DATA, 1.0);
    logger.log("Keydown: a", Logger.ServerLevel.DATA, 2.5);
    expect(logger._serverLogs.length).toBe(2);
    expect(logger._serverLogs[0].time).toBe(1.0);
    expect(logger._serverLogs[1].time).toBe(2.5);
  });

  it("never collapses WARNING-level events", () => {
    const logger = bareLogger();
    logger.log("context lost", Logger.ServerLevel.WARNING, 1);
    logger.log("context lost", Logger.ServerLevel.WARNING, 2);
    expect(logger._serverLogs.length).toBe(2);
  });

  it("does not collapse same message when the obj differs", () => {
    // A differing obj means differing content: never merge it away.
    const logger = bareLogger();
    logger.log("m", Logger.ServerLevel.EXP, 1, { a: 1 });
    logger.log("m", Logger.ServerLevel.EXP, 2, { a: 2 });
    expect(logger._serverLogs.length).toBe(2);
  });

  it("formats repeats as one line plus a xN marker with the last time", () => {
    const logger = bareLogger();
    logger.log("hello", Logger.ServerLevel.EXP, 1);
    logger.log("hello", Logger.ServerLevel.EXP, 2);
    logger.log("world", Logger.ServerLevel.EXP, 3);
    const text = logger._formatServerLogs();
    const lines = text.split("\n").filter(Boolean);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("1\tEXP\thello");
    expect(lines[1]).toBe("2\tEXP\t[Logger] previous message repeated x1");
    expect(lines[2]).toBe("3\tEXP\tworld");
  });

  it("renders the obj field for entries that carry one", () => {
    const logger = bareLogger();
    logger.log("with obj", Logger.ServerLevel.DATA, 1, { k: 7 });
    const lines = logger._formatServerLogs().split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("with obj");
    expect(lines[0]).toContain("k");
  });
});
