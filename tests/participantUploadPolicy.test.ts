/**
 * Participant upload policy (psychojs ServerManager):
 *  - uploadData (async) uses jQuery.post — a single attempt, with no custom
 *    timeout (jQuery's default is none), rejecting with a DETAILED error
 *    string from util.getRequestError (psychojs da92610 deliberately keeps
 *    jQuery here for those diagnostics; retry lives up in PsychoJS.quit).
 *  - uploadLog uses fetch via _pavloviaPost — also a single attempt with no
 *    abort deadline.
 *  - sync=true uses navigator.sendBeacon, fire-and-forget.
 * Retries/backoff must never sneak back into either transport.
 */
import { ServerManager } from "../psychojs/src/core/ServerManager";
import { getRetryDelayMs, waitForRetryDelay } from "../preprocess/retry";

jest.mock("../psychojs/src/data/ExperimentHandler", () => ({
  ExperimentHandler: {
    Environment: { SERVER: Symbol.for("SERVER"), LOCAL: Symbol.for("LOCAL") },
  },
}));

jest.mock("../psychojs/src/core/PsychoJS", () => ({
  PsychoJS: { Status: { NOT_CONFIGURED: Symbol.for("NOT_CONFIGURED") } },
}));

jest.mock("../psychojs/src/core/GUI", () => ({
  GUI: class {
    displayMessage() {}
    dialog() {}
  },
}));

jest.mock("../preprocess/retry", () => ({
  ...jest.requireActual("../preprocess/retry"),
  getRetryDelayMs: jest.fn(() => 0),
  waitForRetryDelay: jest.fn().mockResolvedValue(undefined),
}));

const ok = () => ({
  ok: true,
  status: 200,
  statusText: "OK",
  headers: new Headers(),
});

/**
 * Minimal jqXHR-style deferred: records done/fail callbacks so a test can
 * settle the request exactly once, like jQuery's ajax promise.
 */
const mockJQueryPost = () => {
  const callbacks: { done?: Function; fail?: Function } = {};
  const request = {
    done: (cb: Function) => ((callbacks.done = cb), request),
    fail: (cb: Function) => ((callbacks.fail = cb), request),
  };
  const post = jest.fn(() => request);
  return { post, callbacks };
};

const makeServerManager = () => {
  const serverManager = Object.create(ServerManager.prototype);
  serverManager._psychoJS = {
    config: {
      pavlovia: { URL: "https://pavlovia.org" },
      experiment: { fullpath: "user/experiment", name: "experiment" },
      session: { token: "session-token" },
    },
    logger: { debug: jest.fn() },
    experiment: {
      extraInfo: {
        participant: "P1",
        session: "S1",
        date: "2026-09-17_12:00",
      },
    },
  };
  serverManager._listeners = new Map();
  serverManager._onceUuids = new Map();
  serverManager.setStatus = jest.fn();
  return serverManager;
};

beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete (global as any).jQuery;
});

describe("participant result and log upload policy", () => {
  test("a successful result upload performs exactly one request", async () => {
    const jq = mockJQueryPost();
    (global as any).jQuery = { post: jq.post };

    const upload = makeServerManager().uploadData(
      "results.csv",
      "column\nvalue",
    );
    jq.callbacks.done!({}, "success");
    await expect(upload).resolves.toMatchObject({
      origin: "ServerManager.uploadData",
    });
    expect(jq.post).toHaveBeenCalledTimes(1);
    // Single bare POST: no timeout, no retry settings.
    expect(jq.post.mock.calls[0]).toHaveLength(4);
  });

  test("a successful log upload performs exactly one request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok());

    await makeServerManager().uploadLog("participant log");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("a 504 rejects after exactly one request, with a detailed error", async () => {
    const jq = mockJQueryPost();
    (global as any).jQuery = { post: jq.post };

    const upload = makeServerManager().uploadData("results.csv", "data");
    upload.catch(() => {}); // settle handling registered before the fail callback fires
    jq.callbacks.fail!({ status: 504 }, "error", "Gateway Timeout");
    await expect(upload).rejects.toMatchObject({
      origin: "ServerManager.uploadData",
      // The detailed jQuery-era diagnostics are the point of this path.
      error: expect.stringContaining("504"),
    });
    expect(jq.post).toHaveBeenCalledTimes(1);
  });

  test("a network TypeError rejects after exactly one request", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok());

    await expect(
      makeServerManager().uploadLog("participant log"),
    ).rejects.toMatchObject({ origin: "ServerManager.uploadLog" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("an unresolved slow request is not aborted by a custom upload deadline", async () => {
    jest.useFakeTimers();
    const jq = mockJQueryPost();
    (global as any).jQuery = { post: jq.post };
    let settled = false;

    void makeServerManager()
      .uploadData("results.csv", "x".repeat(1_000_000))
      .finally(() => {
        settled = true;
      });
    await jest.advanceTimersByTimeAsync(11 * 60_000);

    // jQuery.post was handed no settings object at all — there is no
    // timeout to fire, and the promise is still pending after 11 minutes.
    expect(jq.post).toHaveBeenCalledTimes(1);
    expect(jq.post.mock.calls[0]).toHaveLength(4);
    expect(settled).toBe(false);
  });

  test("a failed upload does not invoke retry or backoff hooks", async () => {
    const jq = mockJQueryPost();
    (global as any).jQuery = { post: jq.post };

    const upload = makeServerManager().uploadData("results.csv", "data");
    upload.catch(() => {});
    jq.callbacks.fail!({ status: 504 }, "error", "Gateway Timeout");
    await expect(upload).rejects.toBeDefined();
    expect(getRetryDelayMs).not.toHaveBeenCalled();
    expect(waitForRetryDelay).not.toHaveBeenCalled();
  });

  test("sync=true still uses navigator.sendBeacon without fetch", async () => {
    const sendBeacon = jest.fn();
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: { sendBeacon },
    });

    await makeServerManager().uploadData("results.csv", "data", true);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
