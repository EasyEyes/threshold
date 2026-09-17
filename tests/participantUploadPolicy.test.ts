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

const gatewayTimeout = () => ({
  ok: false,
  status: 504,
  statusText: "Gateway Timeout",
  headers: new Headers(),
});

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
});

describe("participant result and log upload policy", () => {
  test("a successful result upload performs exactly one request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok());

    await makeServerManager().uploadData("results.csv", "column\nvalue");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("a successful log upload performs exactly one request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok());

    await makeServerManager().uploadLog("participant log");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("a 504 rejects after exactly one request", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(gatewayTimeout())
      .mockResolvedValueOnce(ok());

    await expect(
      makeServerManager().uploadData("results.csv", "data"),
    ).rejects.toMatchObject({ origin: "ServerManager.uploadData" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
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
    let requestSignal: AbortSignal | undefined;
    let settled = false;
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          requestSignal = options.signal as AbortSignal | undefined;
          requestSignal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    void makeServerManager()
      .uploadData("results.csv", "x".repeat(1_000_000))
      .finally(() => {
        settled = true;
      });
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(11 * 60_000);

    expect(requestSignal).toBeUndefined();
    expect(settled).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("a failed upload does not invoke retry or backoff hooks", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(gatewayTimeout())
      .mockResolvedValueOnce(ok());

    await expect(
      makeServerManager().uploadData("results.csv", "data"),
    ).rejects.toBeDefined();
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
