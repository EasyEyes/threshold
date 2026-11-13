/**
 * @jest-environment jsdom
 *
 * Browser-side coverage harvesting: the instrumented page writes counts to
 * `window.__coverage__`, which dies on every navigation. The init script
 * accumulates into sessionStorage so a multi-page run is not truncated.
 */

import { expect, describe, test, beforeEach, afterEach } from "@jest/globals";
import {
  COVERAGE_STORAGE_KEY,
  installCoveragePersister,
  parseCoverageJson,
} from "../../server/coverage/harvest";

// In jsdom the global this test mutates IS jest's coverage global; clobbering it
// with fixtures drops or corrupts jest's own coverage results.
let originalCoverage: unknown;

beforeEach(() => {
  originalCoverage = (globalThis as any).__coverage__;
});

afterEach(() => {
  if (originalCoverage === undefined) delete (globalThis as any).__coverage__;
  else (globalThis as any).__coverage__ = originalCoverage;
});

const counts = (file: string, s: Record<string, number>) => ({
  [file]: { path: file, statementMap: {}, s, f: {}, b: {} },
});

describe("installCoveragePersister", () => {
  beforeEach(() => {
    sessionStorage.clear();
    delete (window as any).__coverage__;
  });

  test("writes live coverage into sessionStorage on pagehide", () => {
    installCoveragePersister(COVERAGE_STORAGE_KEY);
    (window as any).__coverage__ = counts("/repo/components/a.js", {
      "1:0": 2,
    });
    window.dispatchEvent(new Event("pagehide"));

    const stored = parseCoverageJson(
      sessionStorage.getItem(COVERAGE_STORAGE_KEY),
    );
    expect(stored["/repo/components/a.js"].s["1:0"]).toBe(2);
  });

  test("accumulates across navigations instead of overwriting", () => {
    installCoveragePersister(COVERAGE_STORAGE_KEY);
    (window as any).__coverage__ = counts("/repo/components/a.js", {
      "1:0": 2,
    });
    window.dispatchEvent(new Event("pagehide"));

    // New page load: fresh context, same tab.
    delete (window as any).__coverage__;
    installCoveragePersister(COVERAGE_STORAGE_KEY);
    (window as any).__coverage__ = counts("/repo/components/a.js", {
      "1:0": 3,
      "2:0": 1,
    });
    window.dispatchEvent(new Event("pagehide"));

    const stored = parseCoverageJson(
      sessionStorage.getItem(COVERAGE_STORAGE_KEY),
    );
    expect(stored["/repo/components/a.js"].s["1:0"]).toBe(5);
    expect(stored["/repo/components/a.js"].s["2:0"]).toBe(1);
  });

  test("pagehide and beforeunload together do not double count", () => {
    installCoveragePersister(COVERAGE_STORAGE_KEY);
    (window as any).__coverage__ = counts("/repo/components/a.js", {
      "1:0": 4,
    });
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("beforeunload"));

    const stored = parseCoverageJson(
      sessionStorage.getItem(COVERAGE_STORAGE_KEY),
    );
    expect(stored["/repo/components/a.js"].s["1:0"]).toBe(4);
  });

  test("a storage failure never breaks the experiment", () => {
    installCoveragePersister(COVERAGE_STORAGE_KEY);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      (window as any).__coverage__ = counts("/repo/components/a.js", {
        "1:0": 1,
      });
      expect(() => window.dispatchEvent(new Event("pagehide"))).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe("parseCoverageJson", () => {
  test("tolerates missing, empty, and malformed payloads", () => {
    expect(parseCoverageJson(null)).toEqual({});
    expect(parseCoverageJson("")).toEqual({});
    expect(parseCoverageJson("{not json")).toEqual({});
    expect(parseCoverageJson("[1,2,3]")).toEqual({});
  });

  test("drops entries that are not file coverage objects", () => {
    expect(parseCoverageJson('{"a":1,"b":{"statementMap":{},"s":{}}}')).toEqual(
      {
        b: { statementMap: {}, s: {} },
      },
    );
  });
});
