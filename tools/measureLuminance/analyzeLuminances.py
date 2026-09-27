#!/usr/bin/env python3
"""
analyzeLuminances.py — analyze the luminance files that EasyEyes'
measureLuminance saves for targetKind letter and reading
(luminances-EXPERIMENT-BLOCK-CONDITION-TRIAL.csv, or the same as .xlsx).

    python analyzeLuminances.py [FOLDER] [--phases BEFORE,TARGET,AFTER]
                                [--reading-sec 3.3] [--gamma 2.2]

Drop the downloaded files next to this script (or pass their folder) and run
it. It reads every luminances-*.csv / .xlsx there, plus — if present — the
experiment's results CSV (any other .csv with a conditionName column), which
supplies each condition's requested colors (fontColorRGBA, screenColorRGBA),
phase durations, the color-pipeline switches, and trialKind (practice vs
counted trials). Only the standard library is needed for CSV input; .xlsx
input needs openpyxl (pip install openpyxl).

Outputs, written next to the data:
  luminanceSummary.csv   one row per condition × phase: mean, SD, n, x, y
  luminanceReport.html   self-contained report: per-condition time courses,
                         the gray staircase (measured vs the slope predicted
                         from the display's own transfer function), and a CIE
                         chromaticity diagram against the sRGB / P3 gamuts
and a console summary.

Method (see tests/e2e/COLOR_PIPELINE_PHOTOMETER_PROTOCOL.md, Test 8):
- A ColorCAL reading takes ~3.3 s and integrates the screen over that span.
  Files written by current EasyEyes carry luminanceEndSec and label readings
  that straddled a phase boundary "mixed"; those are excluded. Older files
  (no luminanceEndSec) get the same treatment here: the span is
  reconstructed from the gap between consecutive requests (or --reading-sec)
  and the boundaries from the results CSV's per-condition durations, or
  --phases, or 6,6,6.
- Staircase: conditions whose requested foreground and background are
  achromatic and share one background are regressed (target luminance on
  requested gray). The predicted slope uses the display's transfer function
  measured in the same run: Y_white from a white condition (or --gamma) and
  Y_bg from the background readings, gamma = ln(Y_bg/Y_white)/ln(bg).
- Primaries: conditions requesting pure red / green / blue / white are
  compared with the sRGB (and Display P3) primaries and D65, and checked for
  additivity (R+G+B vs W) and sRGB relative luminance.
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

FILE_RE = re.compile(
    r"^luminances-(?P<experiment>.+?)-(?P<block>\d+)-(?P<condition>.+)-(?P<trial>\d+)"
    r"(?: \((?P<dup>\d+)\))?\.(?P<ext>csv|xlsx)$",
    re.IGNORECASE,
)
NUMERIC = ("luminanceTimeSec", "luminanceEndSec", "luminanceNits", "xChroma", "yChroma")
PHASES = ("beforeTarget", "target", "afterTarget")
SRGB = {"red": (0.64, 0.33), "green": (0.30, 0.60), "blue": (0.15, 0.06), "white": (0.3127, 0.3290)}
P3 = {"red": (0.68, 0.32), "green": (0.265, 0.69), "blue": (0.15, 0.06), "white": (0.3127, 0.3290)}
SRGB_LUM = {"red": 0.2126, "green": 0.7152, "blue": 0.0722, "white": 1.0}


# ----------------------------------------------------------------- reading files

def read_table(path: Path) -> list[dict]:
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))
    try:
        import openpyxl  # type: ignore
    except ImportError:
        sys.exit(f"{path.name} is .xlsx: pip install openpyxl (or export it as .csv)")
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    header = [str(h) if h is not None else "" for h in rows[0]]
    return [dict(zip(header, r)) for r in rows[1:] if any(v is not None for v in r)]


def to_float(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return math.nan
    return x


def parse_rgba(s) -> tuple | None:
    """'0.5, 0.5, 0.5, 1' -> (0.5, 0.5, 0.5)."""
    if s is None:
        return None
    parts = [p.strip() for p in str(s).split(",") if p.strip() != ""]
    if len(parts) < 3:
        return None
    try:
        return tuple(float(p) for p in parts[:3])
    except ValueError:
        return None


def load_results_csv(folder: Path) -> dict:
    """Per-condition parameters and trialKind counts from the results CSV, if any."""
    info = {"conditions": {}, "pipeline": {}, "file": None}
    for path in sorted(folder.glob("*.csv")):
        if FILE_RE.match(path.name) or path.name in ("luminanceSummary.csv",):
            continue
        rows = read_table(path)
        if not rows or "conditionName" not in rows[0]:
            continue
        info["file"] = path.name
        for r in rows:
            name = (r.get("conditionName") or "").strip()
            if not name:
                continue
            c = info["conditions"].setdefault(
                name,
                {
                    "block": (r.get("block") or "").strip(),
                    "fg": parse_rgba(r.get("fontColorRGBA")),
                    "bg": parse_rgba(r.get("screenColorRGBA")),
                    "markingColor": parse_rgba(r.get("markingColorRGBA")),
                    "targetKind": (r.get("targetKind") or "").strip(),
                    "before": to_float(r.get("markingOffsetBeforeTargetOnsetSecs")),
                    "target": to_float(r.get("targetDurationSec")),
                    "after": to_float(r.get("markingOnsetAfterTargetOffsetSecs")),
                    "trialKinds": defaultdict(int),
                },
            )
            kind = (r.get("trialKind") or "").strip()
            if kind:
                c["trialKinds"][kind] += 1
            for key in ("_screenDitherBool", "_screenFloat16Bool", "_screenColorSpace", "screenDitherLsb", "displayPrecisionBits"):
                v = (r.get(key) or "").strip()
                if v and key not in info["pipeline"]:
                    info["pipeline"][key] = v
        break
    return info


# ----------------------------------------------------------------- statistics

def mean_sd(values):
    values = [v for v in values if not math.isnan(v)]
    if not values:
        return math.nan, math.nan, 0
    return st.mean(values), (st.stdev(values) if len(values) > 1 else 0.0), len(values)


def linear_fit(xs, ys):
    """Least squares y = a + b x; returns a, b, SE(b), residual SD, n."""
    n = len(xs)
    if n < 3 or len(set(xs)) < 2:
        return None
    mx, my = st.mean(xs), st.mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    a = my - b * mx
    res = [y - (a + b * x) for x, y in zip(xs, ys)]
    sd = math.sqrt(sum(r * r for r in res) / (n - 2))
    return a, b, sd / math.sqrt(sxx), sd, n


# ----------------------------------------------------------------- analysis

class Trial:
    def __init__(self, path: Path, m: re.Match, rows: list[dict]):
        self.path = path
        self.experiment = m["experiment"]
        self.block = m["block"]
        self.condition = m["condition"]
        self.trial = int(m["trial"])
        self.dup = m["dup"]
        self.rows = rows
        for r in rows:
            for k in NUMERIC:
                r[k] = to_float(r.get(k))
            r["phase"] = str(r.get("phase") or "")
        self.legacy = any(math.isnan(r["luminanceEndSec"]) for r in rows)
        self.pretend = bool(rows) and all(r["luminanceNits"] == -1 for r in rows)

    @property
    def key(self):
        return (self.block, self.condition)


def reconstruct_legacy(trial: Trial, durations, reading_sec_default: float):
    """Fill luminanceEndSec and re-label mixed readings for files without them."""
    starts = [r["luminanceTimeSec"] for r in trial.rows]
    gaps = [b - a for a, b in zip(starts, starts[1:]) if b - a > 0.2]
    span = st.median(gaps) if gaps else reading_sec_default
    before, target, after = durations
    window_end = target + after

    def phase_at(t):
        if t < 0:
            return "beforeTarget"
        if t < target:
            return "target"
        if t <= window_end:
            return "afterTarget"
        return "afterWindow"

    open_ended = not any(r["phase"] == "afterTarget" for r in trial.rows) and all(
        r["phase"] == "target" for r in trial.rows
    )
    for r in trial.rows:
        r["luminanceEndSec"] = r["luminanceTimeSec"] + span
        if open_ended:  # reading page: one phase, never mixed
            continue
        p0, p1 = phase_at(r["luminanceTimeSec"]), phase_at(r["luminanceEndSec"])
        r["phase"] = p0 if p0 == p1 else "mixed"
    return span


def analyze(folder: Path, args):
    files = sorted(p for p in folder.iterdir() if FILE_RE.match(p.name))
    if not files:
        sys.exit(f"No luminances-*.csv / .xlsx files in {folder}")
    results = load_results_csv(folder)
    trials = [Trial(p, FILE_RE.match(p.name), read_table(p)) for p in files]
    trials = [t for t in trials if t.rows]

    dups = [t.path.name for t in trials if t.dup]
    if dups:
        print(f"note: {len(dups)} file(s) carry a browser duplicate suffix ' (n)'; they may come from repeated runs "
              f"and are analyzed together with the rest, e.g. {dups[0]}")

    # phase durations per condition (results CSV > --phases > 6,6,6)
    def durations_for(t: Trial):
        c = results["conditions"].get(t.condition)
        if c and not any(math.isnan(c[k]) for k in ("before", "target", "after")):
            return c["before"], c["target"], c["after"]
        if args.phases:
            return args.phases
        return 6.0, 6.0, 6.0

    legacy = [t for t in trials if t.legacy and not t.pretend]
    if legacy:
        spans = [reconstruct_legacy(t, durations_for(t), args.reading_sec) for t in legacy]
        src = "the results CSV" if results["file"] else ("--phases" if args.phases else "the default 6,6,6 s")
        print(f"note: {len(legacy)} file(s) predate the luminanceEndSec column; reading spans reconstructed "
              f"(median {st.median(spans):.2f} s) and phases re-labeled using {src}.")

    # reading duration from the data
    spans = [r["luminanceEndSec"] - r["luminanceTimeSec"] for t in trials if not t.pretend for r in t.rows]
    spans = [s for s in spans if not math.isnan(s)]

    # group by condition
    by_cond: dict[tuple, list[Trial]] = defaultdict(list)
    for t in trials:
        by_cond[t.key].append(t)

    summary_rows = []
    cond_stats = {}
    for key in sorted(by_cond, key=lambda k: (int(k[0]), k[1])):
        ts = by_cond[key]
        n_read = sum(len(t.rows) for t in ts)
        pretend = all(t.pretend for t in ts)
        phase_vals = defaultdict(list)
        xy_vals = defaultdict(list)
        mixed = 0
        for t in ts:
            for r in t.rows:
                if r["phase"] == "mixed" or r["phase"] == "afterWindow":
                    mixed += 1
                    continue
                phase_vals[r["phase"]].append(r["luminanceNits"])
                if not math.isnan(r["xChroma"]):
                    xy_vals[r["phase"]].append((r["xChroma"], r["yChroma"]))
        stats = {}
        for ph in PHASES:
            if ph in phase_vals and not pretend:
                m, sd, n = mean_sd(phase_vals[ph])
                xs = [p[0] for p in xy_vals.get(ph, [])]
                ys = [p[1] for p in xy_vals.get(ph, [])]
                stats[ph] = {"mean": m, "sd": sd, "n": n,
                             "x": st.mean(xs) if xs else math.nan, "y": st.mean(ys) if ys else math.nan}
                summary_rows.append({
                    "block": key[0], "conditionName": key[1], "phase": ph, "trials": len(ts),
                    "readings": n, "meanNits": f"{m:.4f}", "sdNits": f"{sd:.4f}",
                    "xChroma": f"{stats[ph]['x']:.4f}" if xs else "", "yChroma": f"{stats[ph]['y']:.4f}" if ys else "",
                })
        cond_stats[key] = {"trials": ts, "stats": stats, "mixed": mixed, "readings": n_read, "pretend": pretend}

    # ---- console: per condition
    print(f"\n{len(trials)} trial file(s), {len(by_cond)} condition(s)"
          + (f"; results CSV: {results['file']}" if results["file"] else "; no results CSV found"))
    if results["pipeline"]:
        print("color pipeline: " + ", ".join(f"{k}={v}" for k, v in results["pipeline"].items()))
    if spans:
        print(f"ColorCAL reading time: median {st.median(spans):.2f} s (min {min(spans):.2f}, max {max(spans):.2f}, n={len(spans)})")
    for key, cs in cond_stats.items():
        ts = cs["trials"]
        head = f"\nblock {key[0]}  {key[1]}: {len(ts)} trial(s), {cs['readings']} readings, {cs['mixed']} straddling a boundary (excluded)"
        c = results["conditions"].get(key[1])
        if c and c["trialKinds"]:
            head += "; results CSV trialKind " + ", ".join(f"{k}={v}" for k, v in sorted(c["trialKinds"].items()))
        print(head)
        if cs["pretend"]:
            print("   pretend mode (every value -1): timing check only")
            for t in ts[:1]:
                print("   " + ", ".join(f"{r['luminanceTimeSec']:.2f}s {r['phase']}" for r in t.rows))
            continue
        for ph in PHASES:
            if ph in cs["stats"]:
                s = cs["stats"][ph]
                xy = f"  x={s['x']:.4f} y={s['y']:.4f}" if not math.isnan(s["x"]) else ""
                print(f"   {ph:13s} {s['mean']:10.4f} nits  sd {s['sd']:.4f}  n={s['n']}{xy}")

    staircase = analyze_staircase(cond_stats, results, args)
    primaries = analyze_primaries(cond_stats, results)

    write_summary(folder / "luminanceSummary.csv", summary_rows)
    write_report(folder / "luminanceReport.html", folder, cond_stats, results, spans, staircase, primaries)
    print(f"\nwrote {folder / 'luminanceSummary.csv'} and {folder / 'luminanceReport.html'}")


def achromatic(rgb):
    return rgb is not None and max(rgb) - min(rgb) < 1e-9


def requested_gray(key, results):
    """Requested foreground gray for a condition: results CSV, else 'bitDepth+k' names."""
    c = results["conditions"].get(key[1])
    if c and achromatic(c["fg"]) and achromatic(c["bg"]):
        return c["fg"][0], c["bg"][0]
    m = re.match(r"^bitDepth\+(\d+)$", key[1])
    if m:
        return 0.5 + int(m.group(1)) / 1023, 0.5
    return None


def analyze_staircase(cond_stats, results, args):
    """Regress clean target luminance on requested gray for achromatic conditions sharing a background."""
    groups = defaultdict(list)
    for key, cs in cond_stats.items():
        if cs["pretend"] or "target" not in cs["stats"]:
            continue
        rg = requested_gray(key, results)
        if rg is None:
            continue
        fg, bg = rg
        if fg in (0.0, 1.0) and abs(fg - bg) > 0.5:
            continue  # black / white on the opposite background: a primary, not a staircase step
        groups[bg].append((fg, key, cs))
    best = None
    for bg, items in groups.items():
        if len(items) >= 3 and (best is None or len(items) > len(best[1])):
            best = (bg, items)
    if not best:
        return None
    bg, items = best
    items.sort()
    xs, ys, points = [], [], []
    for fg, key, cs in items:
        vals = [r["luminanceNits"] for t in cs["trials"] for r in t.rows if r["phase"] == "target"]
        for v in vals:
            xs.append(fg)
            ys.append(v)
        points.append((fg, key[1], vals, cs["stats"]["target"]))
    fit = linear_fit(xs, ys)
    # background luminance: afterTarget (settled) else beforeTarget
    bg_vals = []
    for fg, key, cs in items:
        s = cs["stats"]
        ph = "afterTarget" if "afterTarget" in s else "beforeTarget" if "beforeTarget" in s else None
        if ph:
            bg_vals += [r["luminanceNits"] for t in cs["trials"] for r in t.rows if r["phase"] == ph]
    y_bg = st.mean(bg_vals) if bg_vals else math.nan
    # white luminance from a white condition, if any
    y_white = math.nan
    for key, cs in cond_stats.items():
        c = results["conditions"].get(key[1])
        fg = (c["fg"] if c else None) or ((1.0, 1.0, 1.0) if key[1].lower() == "white" else None)
        if fg == (1.0, 1.0, 1.0) and "target" in cs["stats"]:
            y_white = cs["stats"]["target"]["mean"]
    if not math.isnan(y_white) and not math.isnan(y_bg) and 0 < bg < 1:
        gamma = math.log(y_bg / y_white) / math.log(bg)
        gamma_src = f"measured (Y_white {y_white:.2f}, Y_bg {y_bg:.2f} at gray {bg:g})"
        slope_pred = y_white * gamma * bg ** (gamma - 1)
    else:
        gamma = args.gamma
        gamma_src = f"assumed --gamma {gamma:g}"
        slope_pred = y_bg * gamma / bg if not math.isnan(y_bg) and bg > 0 else math.nan
    means = [p[3]["mean"] for p in points]
    increments = [b - a for a, b in zip(means, means[1:])]
    out = {"bg": bg, "points": points, "fit": fit, "y_bg": y_bg, "y_white": y_white, "gamma": gamma,
           "gamma_src": gamma_src, "slope_pred": slope_pred, "increments": increments}
    print(f"\nGRAY STAIRCASE on background {bg:g} ({len(points)} levels, {len(xs)} clean target readings)")
    for fg, name, vals, s in points:
        print(f"   {name:14s} fg {fg:.6f}: mean {s['mean']:9.4f}  sd {s['sd']:.4f}  n={s['n']}")
    up = sum(1 for d in increments if d > 0)
    print(f"   level-to-level increments positive: {up}/{len(increments)}")
    if fit:
        a, b, se, sd, n = fit
        print(f"   regression: slope {b:.4f} ± {se:.4f} nits per unit gray  (= {b / 1023:.4f} ± {se / 1023:.4f} per 1/1023, "
              f"{b / 255:.4f} per 1/255); residual SD {sd:.4f} nits; n={n}")
        if not math.isnan(slope_pred):
            print(f"   predicted slope from display transfer function: {slope_pred:.4f} nits per unit gray "
                  f"(= {slope_pred / 1023:.4f} per 1/1023, {slope_pred / 255:.4f} per 1/255); gamma {gamma:.3f} {gamma_src}")
            print(f"   measured / predicted = {b / slope_pred:.3f}")
        if sd > 0 and not math.isnan(slope_pred):
            lsb = 2 * sd / slope_pred
            print(f"   smallest resolvable gray step (2 residual SD / predicted slope): 1/{1 / lsb:.0f} of the 0-1 scale "
                  f"= {math.log2(1 / lsb):.1f} bits")
    return out


def primary_name(key, results):
    c = results["conditions"].get(key[1])
    fg = c["fg"] if c else None
    if fg is None:
        return key[1].lower() if key[1].lower() in SRGB else None
    table = {(1.0, 0.0, 0.0): "red", (0.0, 1.0, 0.0): "green", (0.0, 0.0, 1.0): "blue", (1.0, 1.0, 1.0): "white"}
    return table.get(tuple(round(v, 6) for v in fg))


def analyze_primaries(cond_stats, results):
    found = {}
    for key, cs in cond_stats.items():
        if cs["pretend"] or "target" not in cs["stats"]:
            continue
        name = primary_name(key, results)
        if name:
            found[name] = cs["stats"]["target"]
    if not found:
        return None
    print("\nPRIMARIES (clean target readings; reference: sRGB primaries, D65 white)")
    for name in ("red", "green", "blue", "white"):
        if name in found:
            s = found[name]
            rx, ry = SRGB[name]
            print(f"   {name:6s} Y {s['mean']:9.3f} nits sd {s['sd']:.3f}  x,y {s['x']:.4f},{s['y']:.4f}  "
                  f"sRGB {rx:.4f},{ry:.4f}  Δ {s['x'] - rx:+.4f},{s['y'] - ry:+.4f}  P3 {P3[name][0]:.3f},{P3[name][1]:.3f}")
    if all(n in found for n in ("red", "green", "blue", "white")):
        r, g, b, w = (found[n]["mean"] for n in ("red", "green", "blue", "white"))
        print(f"   additivity (R+G+B)/W = {(r + g + b) / w:.4f}")
        print(f"   relative luminance R {r / w:.4f} G {g / w:.4f} B {b / w:.4f}  (sRGB 0.2126 0.7152 0.0722)")
    return found


# ----------------------------------------------------------------- outputs

def write_summary(path: Path, rows):
    if not rows:
        return
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Axes:
    """Linear axes mapping data to an SVG viewport."""

    def __init__(self, x0, x1, y0, y1, w=640, h=320, m=(56, 16, 40, 16)):
        self.x0, self.x1, self.y0, self.y1 = x0, x1, y0, y1
        self.w, self.h = w, h
        self.l, self.t, self.b, self.r = m
        if self.x1 == self.x0:
            self.x1 = self.x0 + 1
        if self.y1 == self.y0:
            self.y1 = self.y0 + 1

    def X(self, x):
        return self.l + (x - self.x0) / (self.x1 - self.x0) * (self.w - self.l - self.r)

    def Y(self, y):
        return self.h - self.b - (y - self.y0) / (self.y1 - self.y0) * (self.h - self.t - self.b)

    def frame(self, title, xlabel, ylabel):
        out = [f'<text x="{self.l}" y="12" font-size="13" font-weight="600">{esc(title)}</text>']
        out.append(f'<line x1="{self.l}" x2="{self.w - self.r}" y1="{self.h - self.b}" y2="{self.h - self.b}" stroke="#444"/>')
        out.append(f'<line x1="{self.l}" x2="{self.l}" y1="{self.t}" y2="{self.h - self.b}" stroke="#444"/>')
        for v in nice_ticks(self.x0, self.x1):
            out.append(f'<line x1="{self.X(v):.1f}" x2="{self.X(v):.1f}" y1="{self.h - self.b}" y2="{self.h - self.b + 4}" stroke="#444"/>'
                       f'<text x="{self.X(v):.1f}" y="{self.h - self.b + 15}" font-size="10" text-anchor="middle">{v:g}</text>')
        for v in nice_ticks(self.y0, self.y1):
            out.append(f'<line x1="{self.l - 4}" x2="{self.l}" y1="{self.Y(v):.1f}" y2="{self.Y(v):.1f}" stroke="#444"/>'
                       f'<text x="{self.l - 6}" y="{self.Y(v) + 3:.1f}" font-size="10" text-anchor="end">{v:g}</text>')
        out.append(f'<text x="{(self.l + self.w - self.r) / 2:.0f}" y="{self.h - 4}" font-size="11" text-anchor="middle">{esc(xlabel)}</text>')
        out.append(f'<text x="12" y="{(self.t + self.h - self.b) / 2:.0f}" font-size="11" text-anchor="middle" '
                   f'transform="rotate(-90 12 {(self.t + self.h - self.b) / 2:.0f})">{esc(ylabel)}</text>')
        return "".join(out)


def nice_ticks(lo, hi, n=6):
    if not hi > lo:
        return [lo]
    step = 10 ** math.floor(math.log10((hi - lo) / n))
    err = (hi - lo) / n / step
    step *= 10 if err >= 7.5 else 5 if err >= 3.5 else 2 if err >= 1.5 else 1
    v = math.ceil(lo / step) * step
    out = []
    while v <= hi + 1e-9:
        out.append(round(v, 10))
        v += step
    return out


def svg(ax, body):
    return (f'<svg width="{ax.w}" height="{ax.h}" viewBox="0 0 {ax.w} {ax.h}" font-family="system-ui, sans-serif" '
            f'fill="#222">{body}</svg>')


PHASE_COLOR = {"beforeTarget": "#6b7280", "target": "#2563eb", "afterTarget": "#16a34a", "mixed": "#dc2626", "afterWindow": "#dc2626"}


def timecourse_svg(key, cs, results):
    ts = cs["trials"]
    pts = [(r["luminanceTimeSec"], r["luminanceEndSec"], r["luminanceNits"], r["phase"]) for t in ts for r in t.rows]
    if not pts:
        return ""
    ys = [p[2] for p in pts]
    lo, hi = min(ys), max(ys)
    pad = (hi - lo or 1) * 0.15
    x0 = min(p[0] for p in pts) - 0.5
    x1 = max(p[1] for p in pts) + 0.5
    ax = Axes(x0, x1, lo - pad, hi + pad, w=520, h=220)
    body = [ax.frame(f"block {key[0]} {key[1]}: every reading, {len(ts)} trial(s)", "time since requested target onset (s)", "luminance (cd/m²)")]
    c = results["conditions"].get(key[1])
    if c and not any(math.isnan(c[k]) for k in ("target", "after")):
        for a, b_, col in ((x0, 0, "#f3f4f6"), (0, c["target"], "#dbeafe"), (c["target"], c["target"] + c["after"], "#dcfce7")):
            body.append(f'<rect x="{ax.X(a):.1f}" y="{ax.t}" width="{max(0, ax.X(b_) - ax.X(a)):.1f}" height="{ax.h - ax.t - ax.b}" fill="{col}" opacity="0.6"/>')
    for t0, t1, y, ph in pts:
        col = PHASE_COLOR.get(ph, "#999")
        body.append(f'<line x1="{ax.X(t0):.1f}" x2="{ax.X(t1):.1f}" y1="{ax.Y(y):.1f}" y2="{ax.Y(y):.1f}" stroke="{col}" stroke-width="3" '
                    f'opacity="{0.35 if ph == "mixed" else 0.9}"><title>{t0:.2f}–{t1:.2f} s {esc(ph)} {y:.4f} cd/m²</title></line>')
    legend = " ".join(f'<tspan fill="{PHASE_COLOR[p]}">■ {p}</tspan>' for p in ("beforeTarget", "target", "afterTarget", "mixed"))
    body.append(f'<text x="{ax.l}" y="26" font-size="10">{legend} (bar = integration span of one reading)</text>')
    return svg(ax, "".join(body))


def staircase_svg(sc):
    pts = sc["points"]
    fgs = [p[0] for p in pts]
    all_y = [v for p in pts for v in p[2]]
    pad = (max(all_y) - min(all_y) or 0.5) * 0.2
    xpad = (max(fgs) - min(fgs) or 0.001) * 0.1
    ax = Axes(min(fgs) - xpad, max(fgs) + xpad, min(all_y) - pad, max(all_y) + pad)
    body = [ax.frame(f"Gray staircase on background {sc['bg']:g}: measured vs predicted from the display's transfer function",
                     "requested foreground gray (0–1)", "clean target luminance (cd/m²)")]
    if not math.isnan(sc["slope_pred"]) and not math.isnan(sc["y_bg"]):
        y_at = lambda fg: sc["y_bg"] + sc["slope_pred"] * (fg - sc["bg"])
        body.append(f'<line x1="{ax.X(fgs[0]):.1f}" y1="{ax.Y(y_at(fgs[0])):.1f}" x2="{ax.X(fgs[-1]):.1f}" y2="{ax.Y(y_at(fgs[-1])):.1f}" '
                    f'stroke="#6b7280" stroke-dasharray="6 4" stroke-width="1.5"/>')
    if sc["fit"]:
        a, b = sc["fit"][0], sc["fit"][1]
        body.append(f'<line x1="{ax.X(fgs[0]):.1f}" y1="{ax.Y(a + b * fgs[0]):.1f}" x2="{ax.X(fgs[-1]):.1f}" y2="{ax.Y(a + b * fgs[-1]):.1f}" '
                    f'stroke="#2563eb" stroke-width="1.5"/>')
    for fg, name, vals, s in pts:
        for v in vals:
            body.append(f'<circle cx="{ax.X(fg):.1f}" cy="{ax.Y(v):.1f}" r="3" fill="#2563eb" opacity="0.45"/>')
        body.append(f'<circle cx="{ax.X(fg):.1f}" cy="{ax.Y(s["mean"]):.1f}" r="5" fill="#1e3a8a"><title>{esc(name)} mean {s["mean"]:.4f} sd {s["sd"]:.4f} n={s["n"]}</title></circle>')
    body.append(f'<text x="{ax.l}" y="26" font-size="10"><tspan fill="#2563eb">● readings, ● means, — regression</tspan>  '
                f'<tspan fill="#6b7280">- - predicted from gamma {sc["gamma"]:.2f}</tspan></text>')
    return svg(ax, "".join(body))


def chromaticity_svg(found):
    ax = Axes(0.0, 0.8, 0.0, 0.9, w=420, h=400)
    body = [ax.frame("CIE 1931 chromaticity of the measured primaries", "x", "y")]
    tri = lambda d: " ".join(f"{ax.X(d[n][0]):.1f},{ax.Y(d[n][1]):.1f}" for n in ("red", "green", "blue"))
    body.append(f'<polygon points="{tri(P3)}" fill="none" stroke="#9ca3af" stroke-dasharray="5 4"/>')
    body.append(f'<polygon points="{tri(SRGB)}" fill="none" stroke="#374151"/>')
    body.append(f'<circle cx="{ax.X(0.3127):.1f}" cy="{ax.Y(0.329):.1f}" r="4" fill="none" stroke="#374151"/>'
                f'<text x="{ax.X(0.3127) + 7:.1f}" y="{ax.Y(0.329) + 12:.1f}" font-size="10">D65</text>')
    body.append(f'<text x="{ax.X(0.62):.1f}" y="{ax.Y(0.36):.1f}" font-size="10" fill="#374151">sRGB</text>'
                f'<text x="{ax.X(0.62):.1f}" y="{ax.Y(0.30):.1f}" font-size="10" fill="#9ca3af">P3 (dashed)</text>')
    for name, s in found.items():
        if math.isnan(s["x"]):
            continue
        body.append(f'<circle cx="{ax.X(s["x"]):.1f}" cy="{ax.Y(s["y"]):.1f}" r="4.5" fill="#dc2626"/>'
                    f'<text x="{ax.X(s["x"]) + 8:.1f}" y="{ax.Y(s["y"]) + 4:.1f}" font-size="11">{esc(name)} ({s["x"]:.3f}, {s["y"]:.3f})</text>')
    return svg(ax, "".join(body))


def write_report(path: Path, folder: Path, cond_stats, results, spans, staircase, primaries):
    h = ["<!doctype html><meta charset='utf-8'><title>measureLuminance analysis</title>",
         "<style>body{font:14px/1.45 system-ui,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#222}"
         "table{border-collapse:collapse;margin:8px 0 16px}td,th{border:1px solid #ddd;padding:3px 8px;text-align:right}"
         "th:first-child,td:first-child{text-align:left}h2{margin-top:28px}code{background:#f3f4f6;padding:0 4px}"
         ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:12px}</style>",
         f"<h1>measureLuminance analysis — {esc(folder)}</h1>"]
    meta = [f"{sum(len(cs['trials']) for cs in cond_stats.values())} trial files, {len(cond_stats)} conditions"]
    if results["file"]:
        meta.append(f"results CSV: {esc(results['file'])}")
    if results["pipeline"]:
        meta.append("pipeline: " + ", ".join(f"{k}={v}" for k, v in results["pipeline"].items()))
    if spans:
        meta.append(f"ColorCAL reading time: median {st.median(spans):.2f} s (integration span of one reading)")
    h.append("<p>" + " · ".join(esc(m) for m in meta) + "</p>")
    h.append("<p>Readings whose integration span crossed a phase boundary (<code>mixed</code>) are excluded from every statistic. "
             "Phase means are of clean readings only.</p>")

    if staircase:
        sc = staircase
        h.append("<h2>Gray staircase (bit depth)</h2>")
        h.append(staircase_svg(sc))
        h.append("<table><tr><th>condition</th><th>requested gray</th><th>mean (cd/m²)</th><th>SD</th><th>n</th><th>Δ vs previous</th></tr>")
        prev = None
        for fg, name, vals, s in sc["points"]:
            d = "" if prev is None else f"{s['mean'] - prev:+.4f}"
            h.append(f"<tr><td>{esc(name)}</td><td>{fg:.6f}</td><td>{s['mean']:.4f}</td><td>{s['sd']:.4f}</td><td>{s['n']}</td><td>{d}</td></tr>")
            prev = s["mean"]
        h.append("</table>")
        if sc["fit"]:
            a, b, se, sd, n = sc["fit"]
            lines = [f"Regression of clean target luminance on requested gray: slope <b>{b / 1023:.4f} ± {se / 1023:.4f} cd/m² per 1/1023</b> "
                     f"({b / 255:.4f} per 1/255), residual SD {sd:.4f} cd/m², n = {n}."]
            if not math.isnan(sc["slope_pred"]):
                lines.append(f"Predicted from the display's transfer function (gamma {sc['gamma']:.3f}, {esc(sc['gamma_src'])}): "
                             f"<b>{sc['slope_pred'] / 1023:.4f} cd/m² per 1/1023</b>; measured / predicted = {b / sc['slope_pred']:.3f}.")
                if sd > 0:
                    lsb = 2 * sd / sc["slope_pred"]
                    lines.append(f"Smallest resolvable step (2 residual SD / predicted slope): 1/{1 / lsb:.0f} of the gray scale ≈ {math.log2(1 / lsb):.1f} bits.")
            up = sum(1 for d in sc["increments"] if d > 0)
            lines.append(f"{up} of {len(sc['increments'])} level-to-level increments are positive. A dithered (or ≥10-bit) pipe gives a "
                         "proportional, monotonic ramp; an 8-bit pipe gives plateaus separated by ~1/255 jumps.")
            h.append("<p>" + " ".join(lines) + "</p>")

    if primaries:
        h.append("<h2>Primaries and color-space tagging</h2>")
        h.append(chromaticity_svg(primaries))
        h.append("<table><tr><th>color</th><th>Y (cd/m²)</th><th>SD</th><th>x</th><th>y</th><th>sRGB x, y</th><th>Δx</th><th>Δy</th><th>rel. lum.</th><th>sRGB coef.</th></tr>")
        w = primaries.get("white", {}).get("mean", math.nan)
        for name in ("red", "green", "blue", "white"):
            if name in primaries:
                s = primaries[name]
                rx, ry = SRGB[name]
                rel = f"{s['mean'] / w:.4f}" if not math.isnan(w) else ""
                h.append(f"<tr><td>{name}</td><td>{s['mean']:.3f}</td><td>{s['sd']:.3f}</td><td>{s['x']:.4f}</td><td>{s['y']:.4f}</td>"
                         f"<td>{rx:.4f}, {ry:.4f}</td><td>{s['x'] - rx:+.4f}</td><td>{s['y'] - ry:+.4f}</td><td>{rel}</td><td>{SRGB_LUM[name]:.4f}</td></tr>")
        h.append("</table>")
        if all(n in primaries for n in ("red", "green", "blue", "white")):
            r, g, b = (primaries[n]["mean"] for n in ("red", "green", "blue"))
            h.append(f"<p>Additivity (R+G+B)/W = {(r + g + b) / w:.4f}. Tagged srgb, the primaries should sit on the solid sRGB triangle; "
                     "tagged display-p3 on a wide-gamut panel, red and green move toward the dashed P3 triangle while white stays put.</p>")

    h.append("<h2>Per-condition phase means</h2>")
    h.append("<table><tr><th>block</th><th>condition</th><th>trials</th><th>phase</th><th>mean (cd/m²)</th><th>SD</th><th>n</th><th>x</th><th>y</th><th>excluded (mixed)</th><th>results CSV trialKind</th></tr>")
    for key, cs in cond_stats.items():
        c = results["conditions"].get(key[1])
        kinds = ", ".join(f"{k} {v}" for k, v in sorted(c["trialKinds"].items())) if c else ""
        if cs["pretend"]:
            h.append(f"<tr><td>{key[0]}</td><td>{esc(key[1])}</td><td>{len(cs['trials'])}</td><td colspan=6>pretend (every value −1): timing check only</td><td>{cs['mixed']}</td><td>{esc(kinds)}</td></tr>")
            continue
        for ph in PHASES:
            if ph in cs["stats"]:
                s = cs["stats"][ph]
                xy = (f"{s['x']:.4f}", f"{s['y']:.4f}") if not math.isnan(s["x"]) else ("", "")
                h.append(f"<tr><td>{key[0]}</td><td>{esc(key[1])}</td><td>{len(cs['trials'])}</td><td>{ph}</td><td>{s['mean']:.4f}</td>"
                         f"<td>{s['sd']:.4f}</td><td>{s['n']}</td><td>{xy[0]}</td><td>{xy[1]}</td><td>{cs['mixed']}</td><td>{esc(kinds)}</td></tr>")
    h.append("</table>")

    h.append("<h2>Time courses</h2><p>Each bar is one reading, drawn over its integration span; bands mark the pre-target, target and post-target phases "
             "when the results CSV gives their durations. Red bars straddled a boundary and were excluded.</p><div class='grid'>")
    for key, cs in cond_stats.items():
        if not cs["pretend"]:
            h.append(f"<div>{timecourse_svg(key, cs, results)}</div>")
    h.append("</div>")
    path.write_text("".join(h), encoding="utf-8")


# ----------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("folder", nargs="?", default=None, help="folder with the luminances-*.csv/.xlsx files (default: this script's folder)")
    ap.add_argument("--phases", default=None,
                    help="BEFORE,TARGET,AFTER seconds, for files without luminanceEndSec when no results CSV is present (default 6,6,6)")
    ap.add_argument("--reading-sec", type=float, default=3.3, help="ColorCAL reading time for single-reading legacy files (default 3.3)")
    ap.add_argument("--gamma", type=float, default=2.2, help="display gamma when no white condition was measured (default 2.2)")
    args = ap.parse_args()
    if args.phases:
        try:
            args.phases = tuple(float(v) for v in args.phases.split(","))
            assert len(args.phases) == 3
        except (ValueError, AssertionError):
            sys.exit("--phases wants three numbers, e.g. --phases 6,6,6")
    folder = Path(args.folder).resolve() if args.folder else Path(__file__).resolve().parent
    analyze(folder, args)


if __name__ == "__main__":
    main()
