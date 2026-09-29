/**
 * @jest-environment jsdom
 */
// Field (Acuity24FontsAddSloan3, participant video 2026-09-29): after a
// pause/restore, RC's tracking UI (live camera video + circle) can leak
// onto the experiment and stay indefinitely — nothing in EasyEyes ever
// re-hides it (the hide at panel completion is one-shot). A leaked
// #webgazerVideoContainer covers response words and EATS their clicks
// (z-index 999999997 over the grid's 9,999,999, pointer-events not
// disabled). The janitor runs at every trialInstructionRoutineBegin: hide
// the video, remove leaked reconnect/resolution wrappers.
import { hideStaleCalibrationUi } from "../components/rcUiHygiene";

const makeRc = () => {
  const calls: string[] = [];
  return {
    calls,
    showVideo: jest.fn((show: boolean) => calls.push(`showVideo:${show}`)),
  } as any;
};

const addWrapper = (id: string) => {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
};

describe("hideStaleCalibrationUi", () => {
  it("hides the tracking video", () => {
    const rc = makeRc();
    hideStaleCalibrationUi(rc);
    expect(rc.showVideo).toHaveBeenCalledWith(false);
  });

  it("removes a leaked camera-resolution preview wrapper", () => {
    const wrapper = addWrapper("rc-resolution-video-wrapper");
    hideStaleCalibrationUi(makeRc());
    expect(document.getElementById("rc-resolution-video-wrapper")).toBe(null);
    expect(wrapper.isConnected).toBe(false);
  });

  it("removes a leaked reconnect page snapshot", () => {
    addWrapper("rc-reconnect-page-snapshot");
    hideStaleCalibrationUi(makeRc());
    expect(document.getElementById("rc-reconnect-page-snapshot")).toBe(null);
  });

  it("leaves the nudger DOM alone (RC owns its lifecycle)", () => {
    const nudger = addWrapper("calibration-nudger");
    hideStaleCalibrationUi(makeRc());
    expect(nudger.isConnected).toBe(true);
  });

  it("never throws on an rc missing the methods (old builds)", () => {
    expect(() => hideStaleCalibrationUi({} as any)).not.toThrow();
  });

  it("is a no-op when nothing has leaked (idempotent)", () => {
    const rc = makeRc();
    expect(() => {
      hideStaleCalibrationUi(rc);
      hideStaleCalibrationUi(rc);
    }).not.toThrow();
    // showVideo(false) is idempotent and harmless; assert it ran
    expect(rc.showVideo).toHaveBeenCalledWith(false);
  });
});

describe("threshold wiring (source contract)", () => {
  const fs = require("fs");
  const path = require("path");
  const src = () =>
    fs.readFileSync(path.join(__dirname, "..", "threshold.js"), "utf8");

  it("janitor runs at the trialInstructionRoutineBegin resume sites", () => {
    // Both resume sites (reading ~5663, threshold/other ~10062) sit right
    // after rc.resumeNudger(); the janitor must follow each.
    const s = src();
    const occurrences = s.match(
      /rc\.resumeNudger\(\);[\s\S]{0,400}?hideStaleCalibrationUi\(rc\)/g,
    );
    expect(occurrences?.length).toBeGreaterThanOrEqual(2);
  });

  it("janitor is imported from rcUiHygiene", () => {
    expect(src()).toMatch(
      /import \{ hideStaleCalibrationUi \} from "\.\/components\/rcUiHygiene"/,
    );
  });
});

describe("response screen z-defense (css contract)", () => {
  const fs = require("fs");
  const path = require("path");
  const css = () =>
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "components",
        "css",
        "phraseIdentification.css",
      ),
      "utf8",
    );

  it(".responseScreen sits above RC's leaked video container (z 999999997)", () => {
    const m = /\.responseScreen\s*\{[^}]*\}/.exec(css());
    expect(m).toBeTruthy();
    const block = m![0];
    expect(block).toMatch(/position:\s*relative/);
    const z = /z-index:\s*(\d+)/.exec(block);
    expect(z).toBeTruthy();
    expect(Number(z![1])).toBeGreaterThan(999999997); // leaked video box
    expect(Number(z![1])).toBeLessThanOrEqual(999999999); // nudger stays above
  });
});
