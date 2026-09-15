/** @jest-environment jsdom */
/**
 * GUARD: rc→threshold coordinate-convention boundary.
 *
 * remote-calibrator and threshold use different coordinate conventions for
 * several fields (nearestXYPx is top-left-origin y-down px in rc; psychoJS
 * center-origin y-up px in threshold). The 2025-08 commit 683256fe assigned
 * rc's nearestXYPx verbatim into Screens[0].nearestPointXYZPx at 9 sites,
 * warping every deg↔px conversion whenever distance tracking ran.
 *
 * These tests statically guard the boundary so that class of miscommunication
 * cannot return:
 *  1. Only components/multiple-displays/utils.ts (the converter) may read
 *     improvedDistanceTrackingData.nearestXYPx for ASSIGNMENT into
 *     nearestPointXYZPx. (onStimulusGenerated.ts may still log the raw value.)
 *  2. No file may assign nearestPointXYZPx from any rc field directly.
 *  3. The converter preserves the documented invariant: rc screen center
 *     ([W/2, H/2]) maps to psychoJS origin [0,0].
 */
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

// Files that read rc.improvedDistanceTrackingData for conversion into
// nearestPointXYZPx. Keep this list complete: the guard fails if any OTHER
// file starts touching the field, forcing a conscious decision here.
const CONVERTER = "components/multiple-displays/utils.ts";
// Files allowed to MENTION nearestXYPx for data logging (must convert).
const RAW_LOGGERS = ["components/onStimulusGenerated.ts"];

const SOURCES = [
  "threshold.js",
  "components/stimulusGeneration.ts",
  "components/rerunPrestimulus.js",
  "components/trialCounter.js",
  "components/onStimulusGenerated.ts",
  CONVERTER,
];

describe("rc coordinate-convention boundary guard", () => {
  test("no verbatim assignment of rc nearestXYPx to nearestPointXYZPx anywhere", () => {
    const offenders: string[] = [];
    for (const rel of SOURCES) {
      if (rel === CONVERTER) continue;
      const src = read(rel);
      // The historical bug pattern: direct or conditional assignment of the
      // rc field into Screens[i].nearestPointXYZPx.
      if (
        /nearestPointXYZPx\s*=\s*[^;]*improvedDistanceTrackingData/s.test(
          src,
        ) ||
        /nearestPointXYZPx\s*=\s*[^;]*\.nearestXYPx/s.test(src)
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("only the converter (and raw loggers) reference improvedDistanceTrackingData.nearestXYPx", () => {
    const allowed = new Set([CONVERTER, ...RAW_LOGGERS]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (["node_modules", "psychojs", ".git", "js"].includes(ent.name))
            continue;
          walk(p);
        } else if (/\.(js|ts|tsx)$/.test(ent.name)) {
          const rel = path.relative(repoRoot, p);
          if (rel.startsWith("tests") || rel.startsWith("server")) continue;
          const src = fs.readFileSync(p, "utf8");
          if (/improvedDistanceTrackingData/.test(src) && !allowed.has(rel)) {
            offenders.push(rel);
          }
        }
      }
    };
    walk(path.join(repoRoot, "components"));
    // Top-level runtime entry points only (not notes/, vendor bundles, etc.)
    for (const f of ["threshold.js", "threshold.ts"]) {
      const p = path.join(repoRoot, f);
      if (!fs.existsSync(p)) continue;
      const src = fs.readFileSync(p, "utf8");
      if (/improvedDistanceTrackingData/.test(src) && !allowed.has(f)) {
        offenders.push(f);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  test("output CSV logs nearestXYPx in psychoJS coordinates, not raw rc px", () => {
    // onStimulusGenerated.ts writes nearestXYPx(_left/_right) into the
    // results CSV. Those values must be converted to psychoJS center-origin
    // y-up px via rcScreenXYPxToPsychoJSXYPx, not logged raw (rc top-left
    // y-down convention).
    const src = read("components/onStimulusGenerated.ts");
    expect(src).toMatch(/rcScreenXYPxToPsychoJSXYPx/);
    // All three logged fields go through the converter, none logged raw.
    expect(src.match(/rcNearestToPsychoJS\(/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(src).not.toMatch(/nearestXYPx\.join/);
  });

  test("converter maps rc screen center to psychoJS origin (documented invariant)", () => {
    const src = read(CONVERTER);
    // The conversion must subtract half the window size from x, and flip y
    // about half the height. Guard against sign/order regressions.
    expect(src).toMatch(/xyPx\[0\]\s*-\s*size\[0\]\s*\/\s*2/);
    expect(src).toMatch(/size\[1\]\s*\/\s*2\s*-\s*xyPx\[1\]/);
  });
});
