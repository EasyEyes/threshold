/**
 * needSoundOutput rename plumbing (v1.5 Phase 2): the runtime must read the
 * canonical `needSoundOutput`, with the deprecated `needSoundOutputKind` as a
 * silent per-condition fallback.
 *
 * @jest-environment jsdom
 */
import {
  readNeedSoundOutput,
  checkBrowserSoundOutputSelectionSupport,
} from "../components/soundOutput";

/** Minimal ParamReader-shaped mock: read() returns per-condition values. */
const mkReader = (rows: Record<string, string[]>, blockCount = 1): any => ({
  _blockCount: blockCount,
  read: (name: string, _block?: any) => rows[name] ?? [""],
});

describe("readNeedSoundOutput (canonical + silent legacy fallback)", () => {
  it("reads the canonical name when set", () => {
    const reader = mkReader({ needSoundOutput: ["headphones"] });
    expect(readNeedSoundOutput(1, reader)).toEqual(["headphones"]);
  });

  it("falls back to the deprecated name per condition", () => {
    const reader = mkReader({
      needSoundOutput: ["", "loudspeakers"],
      needSoundOutputKind: ["headphones", "headphones"],
    });
    expect(readNeedSoundOutput(1, reader)).toEqual([
      "headphones",
      "loudspeakers",
    ]);
  });

  it("canonical wins when both names are set", () => {
    const reader = mkReader({
      needSoundOutput: ["loudspeakers"],
      needSoundOutputKind: ["headphones"],
    });
    expect(readNeedSoundOutput(1, reader)).toEqual(["loudspeakers"]);
  });

  it("returns empty demand when neither name is set", () => {
    const reader = mkReader({});
    expect(readNeedSoundOutput(1, reader)).toEqual([""]);
  });
});

describe("checkBrowserSoundOutputSelectionSupport consults the resolved demand", () => {
  // jsdom has no navigator.mediaDevices and no AudioContext.setSinkId, so
  // the browser check reports "unsupported" whenever sound output is needed
  // (the card's RC_BrowserLacksSoundSupport path — e.g. Firefox).
  it("flags unsupported browsers when only the CANONICAL name is set", () => {
    const reader = mkReader({ needSoundOutput: ["headphones"] });
    expect(checkBrowserSoundOutputSelectionSupport(reader)).toBe(false);
  });

  it("flags unsupported browsers when only the deprecated name is set", () => {
    const reader = mkReader({ needSoundOutputKind: ["headphones"] });
    expect(checkBrowserSoundOutputSelectionSupport(reader)).toBe(false);
  });

  it("passes when no block demands sound output", () => {
    const reader = mkReader({});
    expect(checkBrowserSoundOutputSelectionSupport(reader)).toBe(true);
  });
});
