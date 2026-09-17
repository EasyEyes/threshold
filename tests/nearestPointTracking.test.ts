/**
 * @jest-environment jsdom
 */
// Field bug (study 127, KindWhiteViper028, block 12 trial 77): one divergent
// RC face-tracking frame published nearestXYPx=[Infinity, Infinity]; the
// consumer stored it and the next XYPxOfDeg threw ("validateFinitePair ...
// got [Infinity, Infinity]"). The store must be gated: absent (undefined),
// null (RC's explicit "no valid estimate this frame"), or non-finite data
// keeps the previous point; a finite point is converted rc→psychoJS and
// stored. Adapted to updateNearestPointFromRc (the coordinate-converting
// successor of updateNearestPointXYZPxFromTracking).
import { Screens } from "../components/multiple-displays/globals.js";
import { updateNearestPointFromRc } from "../components/multiple-displays/utils.js";

// components/global.js uses top-level await; jest's CJS transform can't.
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 40, desired: 40, max: 100 },
  rc: {},
}));

const rcWith = (nearestXYPx: unknown) =>
  ({
    improvedDistanceTrackingData:
      nearestXYPx === undefined ? undefined : { nearestXYPx },
  }) as any;

describe("updateNearestPointFromRc — gating", () => {
  beforeEach(() => {
    Screens[0].nearestPointXYZPx = [7, 8];
  });

  it("finite rc point is converted (top-left,y-down → center,y-up) and stored", () => {
    const [w, h] = [window.innerWidth, window.innerHeight];
    updateNearestPointFromRc(0, rcWith([100, 200]));
    expect(Screens[0].nearestPointXYZPx).toEqual([100 - w / 2, h / 2 - 200]);
  });

  it("no tracking data yet keeps the previous point", () => {
    updateNearestPointFromRc(0, rcWith(undefined));
    expect(Screens[0].nearestPointXYZPx).toEqual([7, 8]);
  });

  it.each([
    ["null (RC's explicit no-estimate)", null],
    ["Infinity (field shape)", [Infinity, Infinity]],
    ["NaN", [NaN, 3]],
    ["wrong length", [4]],
    ["non-array", "nope"],
  ])("%s keeps the previous point", (_label: string, bad: unknown) => {
    expect(() => updateNearestPointFromRc(0, rcWith(bad))).not.toThrow();
    expect(Screens[0].nearestPointXYZPx).toEqual([7, 8]);
  });

  it("recovers on the next good frame after a bad one", () => {
    updateNearestPointFromRc(0, rcWith([Infinity, Infinity]));
    const [w, h] = [window.innerWidth, window.innerHeight];
    updateNearestPointFromRc(0, rcWith([10, 20]));
    expect(Screens[0].nearestPointXYZPx).toEqual([10 - w / 2, h / 2 - 20]);
  });
});

// Guard: every runtime store of the tracked nearest point must route through
// updateNearestPointFromRc — a raw copy reintroduces the crash.
describe("no raw stores of tracked nearestXYPx remain", () => {
  it("runtime files contain no unvalidated assignment", () => {
    const fs = require("fs");
    const path = require("path");
    const root = path.join(__dirname, "..");
    const walk = (d: string): string[] =>
      fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
        );
    const files = [
      path.join(root, "threshold.js"),
      ...walk(path.join(root, "components")).filter((f) =>
        /\.(js|ts)$/.test(f),
      ),
    ];
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      if (/nearestPointXYZPx\s*=[^=]*improvedDistanceTrackingData/.test(src)) {
        offenders.push(path.relative(root, f));
      }
    }
    expect(offenders).toEqual([]);
  });
});
