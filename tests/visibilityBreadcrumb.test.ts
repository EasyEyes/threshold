/**
 * @jest-environment jsdom
 */
// Field (Acuity24FontsAddSloan3, 2 unexplained sessions): both wedged at
// block-1 `filterRoutineBegin` with zero trials, no error, no crash —
// filterRoutine has an EMPTY component list, so it advances on the first
// requestAnimationFrame; the stamp never advancing means the page never
// painted again: the participant backgrounded the tab at block-1 onset and
// never returned (one TIMED-OUT after 5h08m). Chrome freezes and then
// DISCARDS long-hidden tabs, and discarding fires no beforeunload/pagehide
// — the close-time stamp cannot reach the server no matter how good its
// transport. The explanation must be uploaded at HIDE time, while the page
// is still alive: a `warning` breadcrumb (tabHiddenAt:<fn>) plus an
// immediate partial save.
import { registerVisibilityBreadcrumb } from "../components/visibilityBreadcrumb";

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("visibility breadcrumb", () => {
  let stamps: string[];
  let saves: number;
  let unregister: (() => void) | false;
  const register = (opts = {}) => {
    stamps = [];
    saves = 0;
    unregister = registerVisibilityBreadcrumb({
      stamp: (note: string) => stamps.push(note),
      save: () => {
        saves += 1;
      },
      enabled: () => true,
      now: () => 1_000_000,
      ...opts,
    });
    return unregister;
  };
  afterEach(() => {
    // The production semantics are one listener per page; reset between
    // tests via the returned unregister.
    if (typeof unregister === "function") unregister();
  });

  it("hiding the tab stamps tabHiddenAt:<currentFunction> and saves", () => {
    register({ getCurrentFunction: () => "filterRoutineBegin" });
    setHidden(true);
    expect(stamps).toHaveLength(1);
    expect(stamps[0]).toMatch(/^tabHiddenAt:filterRoutineBegin/);
    expect(saves).toBe(1);
  });

  it("returning to the tab stamps the pairing note", () => {
    register({ getCurrentFunction: () => "trialRoutineEachFrame" });
    setHidden(true);
    setHidden(false);
    expect(stamps[1]).toMatch(/^tabVisible/);
    expect(saves).toBeGreaterThanOrEqual(1);
  });

  it("rapid hide flickers are throttled, one stamp per gap", () => {
    let t = 0;
    register({ now: () => t, minGapMs: 30_000 });
    setHidden(true); // t=0
    t = 5_000;
    setHidden(false);
    setHidden(true); // t=5s — within gap, throttled
    expect(stamps.filter((s) => s.startsWith("tabHidden"))).toHaveLength(1);
    t = 60_000;
    setHidden(true); // beyond gap — stamps again
    expect(stamps.filter((s) => s.startsWith("tabHidden"))).toHaveLength(2);
  });

  it("disabled (already terminated) stamps and saves nothing", () => {
    register({ enabled: () => false });
    setHidden(true);
    expect(stamps).toHaveLength(0);
    expect(saves).toBe(0);
  });

  it("double registration is a no-op (one listener per page)", () => {
    const off1 = register();
    const off2 = register();
    expect(off2).toBe(false);
    (off1 as () => void)();
    // After unregister, a re-register works again.
    expect(typeof register()).toBe("function");
  });

  it("save failures are swallowed (breadcrumb must never break the page)", () => {
    registerVisibilityBreadcrumb({
      stamp: () => {
        throw new Error("boom");
      },
      save: () => {
        throw new Error("save boom");
      },
      enabled: () => true,
      now: () => 0,
    });
    expect(() => setHidden(true)).not.toThrow();
  });
});

describe("threshold wiring (source contract)", () => {
  const fs = require("fs");
  const path = require("path");
  const src = () =>
    fs.readFileSync(path.join(__dirname, "..", "threshold.js"), "utf8");

  it("registerVisibilityBreadcrumb is wired at the first scheduled task", () => {
    expect(src()).toMatch(/registerVisibilityBreadcrumb\(\{/);
  });

  it("the stamp commits a warning row (addData + nextEntry)", () => {
    expect(src()).toMatch(
      /addData\?\.\("warning", note\)[\s\S]*?nextEntry\?\.\(\)/,
    );
  });

  it("stamping is disabled once terminated", () => {
    expect(src()).toMatch(/enabled:[\s\S]*?status\.terminated/);
  });
});
