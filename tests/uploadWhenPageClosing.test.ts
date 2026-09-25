/**
 * @jest-environment jsdom
 *
 * Upload-when-page-closing resilience (Acuity24Fonts5-12: 25 incomplete
 * sessions with no termination label). The close-time results upload goes
 * through ServerManager.uploadData(sync=true) → navigator.sendBeacon, but
 * browsers cap the beacon payload (~32–64KB) and refuse over-quota payloads
 * SYNCHRONOUSLY — returning false while the page is still alive. Evidence:
 * all 231 result files carrying a participant:tabClosed label are ≤33KB;
 * none of the 138 files >64KB has one. The fix: when the beacon is refused
 * (or absent/throwing), fall back to a synchronous XHR POST, which has no
 * size cap and is honored inside unload handlers.
 */

import { beforeEach, describe, expect, jest, test } from "@jest/globals";

import { uploadWhenPageClosing } from "../psychojs/src/core/syncUpload.js";

const URL = "https://pavlovia.org/api/v2/experiments/x/sessions/t/results";
const makeFormData = () => {
  const fd = new FormData();
  fd.append("key", "k.csv");
  fd.append("value", "v");
  return fd;
};

type XhrCall = { method: string; url: string; async: boolean; body: unknown };

const installXhrMock = (failSend = false) => {
  const calls: XhrCall[] = [];
  class FakeXHR {
    open(method: string, url: string, async: boolean) {
      calls.push({ method, url, async, body: undefined });
    }
    send(body: unknown) {
      const last = calls[calls.length - 1];
      if (last) last.body = body;
      if (failSend) throw new Error("network down");
    }
  }
  (global as any).XMLHttpRequest = FakeXHR;
  return calls;
};

const setSendBeacon = (impl: (() => boolean) | undefined) => {
  if (impl === undefined) {
    delete (navigator as any).sendBeacon;
  } else {
    Object.defineProperty(navigator, "sendBeacon", {
      value: impl,
      configurable: true,
      writable: true,
    });
  }
};

let xhrCalls: XhrCall[];
beforeEach(() => {
  xhrCalls = installXhrMock();
});

describe("uploadWhenPageClosing", () => {
  test("beacon accepted → sent via beacon, no XHR", () => {
    const beacon = jest.fn(() => true);
    setSendBeacon(beacon);
    const fd = makeFormData();

    expect(uploadWhenPageClosing(URL, fd)).toBe("beacon");
    expect(beacon).toHaveBeenCalledWith(URL, fd);
    expect(xhrCalls).toEqual([]);
  });

  test("beacon refused (over quota → false) → synchronous XHR POST, same body", () => {
    setSendBeacon(() => false);
    const fd = makeFormData();

    expect(uploadWhenPageClosing(URL, fd)).toBe("xhr");
    expect(xhrCalls.length).toBe(1);
    expect(xhrCalls[0]).toMatchObject({
      method: "POST",
      url: URL,
      async: false,
    });
    expect(xhrCalls[0].body).toBe(fd);
  });

  test("beacon throws (hostile/old environment) → XHR fallback", () => {
    setSendBeacon(() => {
      throw new Error("beacon broken");
    });
    expect(uploadWhenPageClosing(URL, makeFormData())).toBe("xhr");
    expect(xhrCalls.length).toBe(1);
  });

  test("sendBeacon absent entirely → XHR fallback", () => {
    setSendBeacon(undefined);
    expect(uploadWhenPageClosing(URL, makeFormData())).toBe("xhr");
    expect(xhrCalls.length).toBe(1);
  });

  test("both transports fail → reports 'none', never throws from an unload handler", () => {
    setSendBeacon(() => false);
    installXhrMock(true);
    expect(uploadWhenPageClosing(URL, makeFormData())).toBe("none");
  });
});
