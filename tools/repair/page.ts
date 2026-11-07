// @ts-nocheck
/**
 * Browser entry for the EasyEyes results-repair page (easyeyes.app/repair).
 * Self-contained: parses dropped results CSVs or whole folders (nested,
 * hundreds of files), runs the repair engine locally (nothing is
 * uploaded), renders per-file verdicts with expandable derivations, and
 * offers repaired CSVs, a folder-structure-preserving ZIP, and a report.
 * Repaired files are renamed with a "-repaired" marker; already-repaired
 * files pass through unchanged — correcting twice is impossible.
 */
import {
  changeSentence,
  distributionPlotSvg,
  filePickerAccept,
  hasFiniteInterval,
  paginate,
  plotMaximum,
  recoveryGist,
  SCENARIO_DEFINITION,
  summarizeArchive,
  thresholdQuantity,
  TRIAL_DEFINITIONS,
  trialMatchesFilter,
} from "./presentation.ts";
import JSZip from "jszip";
import {
  parseCsv,
  repairCsv,
  repairedName,
  flagReasonCategory,
  summarizeMagnitudes,
  toConditionSensitivityCsv,
  toRepairedCsv,
} from "./engine.ts";
import {
  xyDegOfPxCore,
  xyPxOfDegCore,
} from "../../components/multiple-displays/transformCore.ts";

// Keep the repair workflow ahead of the educational demos.
document
  .querySelector("main")
  .insertBefore(
    document.getElementById("repairsec"),
    document.querySelector(".layout"),
  );

/** Typeset minus for display text; engine/CSV output stays ASCII. */
const um = (s) => String(s).replace(/-/g, "\u2212");
const fmt = (v, digits = 1) =>
  v === undefined || v === null || !Number.isFinite(v)
    ? ""
    : um(v.toFixed(digits));
/** Same as fmt but ASCII: for the downloaded report (script-parseable). */
const fmtAscii = (v, digits = 1) =>
  v === undefined || v === null || !Number.isFinite(v) ? "" : v.toFixed(digits);
const pct = (v) => `${v >= 0 ? "+" : ""}${fmt(v)}%`;

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"); // must hold inside double-quoted attributes

const pill = (cls, text, tip) =>
  `<span class="pill ${cls}"${tip ? ` data-tip="${esc(tip)}"` : ""}>${esc(
    text,
  )}</span>`;

const sensitivityName = (path) =>
  path.replace(/(\.results)?\.csv$/i, "-sensitivity.csv");

const conditionReportLines = (text, result) => {
  const parsed = parseCsv(toConditionSensitivityCsv(text, result));
  const i = (name) => parsed.header.indexOf(name);
  const groups = new Map();
  parsed.rows.forEach((r) => {
    const experiment = r[i("experiment")] || "?";
    const bc = r[i("block_condition")] || "?";
    const conditionName = r[i("conditionName")];
    const key = `${experiment} / ${conditionName || bc} (${bc})`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      status: r[i("repairStatus")],
      lower: Number(r[i("actualLevelLog10DegLower")]),
      midpoint: Number(r[i("actualLevelLog10DegMidpoint")]),
      upper: Number(r[i("actualLevelLog10DegUpper")]),
    });
  });
  const median = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const lines = [];
  for (const [bc, trials] of groups) {
    const corrected = trials.filter((t) => t.status === "CORRECTED").length;
    const ranged = trials.filter((t) => t.status === "RANGED").length;
    lines.push(
      `  ${bc}: ${corrected} corrected / ${ranged} ranged; median recovered log10 level ` +
        `${fmtAscii(median(trials.map((t) => t.lower)), 4)} / ${fmtAscii(
          median(trials.map((t) => t.midpoint)),
          4,
        )} / ${fmtAscii(
          median(trials.map((t) => t.upper)),
          4,
        )} (lower/midpoint/upper)`,
    );
  }
  return lines;
};

const addFlagReasons = (result, flagReasons) => {
  result.rows.forEach((o) => {
    if (o.status !== "FLAGGED") return;
    const category = flagReasonCategory(o.statusReason);
    flagReasons[category] = (flagReasons[category] || 0) + 1;
  });
};

const rangePart = (o, name) =>
  o.columns[
    `${
      o.columns.rangeMode === "two-candidates" ? "actual" : "approximate"
    }${name}`
  ];

/** Assemble the derivation shown when a trial is expanded. */
const rowDerivationText = (o, parsedRow, header) => {
  const lines = [];
  const cell = (name) => {
    const i = header.indexOf(name);
    return i >= 0 ? parsedRow[i] : "";
  };
  if (o.status === "CORRECTED") {
    if (o.columns.screenBoundingRectDegCorrected)
      lines.push(
        `bounding rect logged ${cell("screenBoundingRectDeg")}; corrected ${
          o.columns.screenBoundingRectDegCorrected
        }`,
      );
    if (o.nearestUsedXY && o.nearestCorrectXY)
      lines.push(
        `assumed eye (buggy transform) (${fmt(o.nearestUsedXY[0], 0)}, ${fmt(
          o.nearestUsedXY[1],
          0,
        )}) px; logged eye (corrected coordinates) (${fmt(
          o.nearestCorrectXY[0],
          0,
        )}, ${fmt(o.nearestCorrectXY[1], 0)}) px`,
      );
    if (o.actualTargetEccentricityXDeg !== undefined) {
      lines.push(
        `requested position (${cell("targetEccentricityXDeg")}, ${cell(
          "targetEccentricityYDeg",
        )})°; drawn position (${
          o.columns.drawnTargetXYPx
        }) px; recovered position (${fmt(
          o.actualTargetEccentricityXDeg,
          2,
        )}, ${fmt(o.actualTargetEccentricityYDeg, 2)})°`,
      );
      if (o.columns.correctedTargetXYPx)
        lines.push(
          `position required to match request: (${o.columns.correctedTargetXYPx}) px`,
        );
    }
    if (o.actualLevelLog10Deg !== undefined)
      lines.push(
        `size or spacing: requested ${fmt(
          Math.pow(10, Number(cell("level"))),
          2,
        )}°; recovered ${fmt(Math.pow(10, o.actualLevelLog10Deg), 2)}°`,
      );
  }
  if (o.status === "RANGED") {
    if (o.nearestUsedXY && o.nearestCorrectXY)
      lines.push(
        `assumed eye (buggy transform) (${fmt(o.nearestUsedXY[0], 0)}, ${fmt(
          o.nearestUsedXY[1],
          0,
        )}) px; logged eye (corrected coordinates) (${fmt(
          o.nearestCorrectXY[0],
          0,
        )}, ${fmt(o.nearestCorrectXY[1], 0)}) px`,
      );
    if (o.columns.midpointTargetEccentricityRDeg !== undefined)
      lines.push(
        `midpoint eccentricity r ${fmt(
          Number(o.columns.midpointTargetEccentricityRDeg),
          2,
        )}°; ${
          o.columns.rangeMode === "two-candidates"
            ? "scenario extrema"
            : "approximate range"
        } [${fmt(Number(rangePart(o, "TargetEccentricityRDegMin")), 2)}, ${fmt(
          Number(rangePart(o, "TargetEccentricityRDegMax")),
          2,
        )}]°`,
      );
    if (o.columns.referenceNominalCenterTargetEccentricityXDeg !== undefined)
      lines.push(
        `nominal-center reference (not an observation) (${fmt(
          Number(o.columns.referenceNominalCenterTargetEccentricityXDeg),
          2,
        )}, ${fmt(
          Number(o.columns.referenceNominalCenterTargetEccentricityYDeg),
          2,
        )})°; ` +
          `X [${fmt(
            Number(rangePart(o, "TargetEccentricityXDegMin")),
            2,
          )}, ${fmt(
            Number(rangePart(o, "TargetEccentricityXDegMax")),
            2,
          )}]°, Y [${fmt(
            Number(rangePart(o, "TargetEccentricityYDegMin")),
            2,
          )}, ${fmt(Number(rangePart(o, "TargetEccentricityYDegMax")), 2)}]°`,
      );
    if (o.columns.midpointSpacingDeg !== undefined)
      lines.push(
        `spacing midpoint ${fmt(Number(o.columns.midpointSpacingDeg), 3)}°; ` +
          `${
            o.columns.rangeMode === "two-candidates"
              ? "scenario extrema"
              : "approximate range"
          } [${fmt(Number(rangePart(o, "SpacingDegMin")), 3)}, ${fmt(
            Number(rangePart(o, "SpacingDegMax")),
            3,
          )}]° (triplet width ${o.columns.drawnTripletWidthPx} px)`,
      );
    if (o.columns.rangeMode === "two-candidates") {
      if (o.columns.widthEquationResidualPx !== undefined)
        lines.push(
          `width residual ${o.columns.widthEquationResidualPx} px = font size × normalized width − logged target width`,
        );
    }
    lines.push(
      "These ranges cover fixation position and rendered-width rounding only. They exclude eye-tracker noise, viewing-distance error, timing error, and actual gaze deviation.",
    );
  }
  lines.push(o.statusReason);
  return lines.join("\n");
};

const STATUS_LABEL = {
  CORRECTED: ["corrected", "st-corrected"],
  RANGED: ["ranged", "st-ranged"],
  UNAFFECTED: ["unaffected", "st-unaffected"],
  UNSUPPORTED: ["unsupported", "st-ignored"],
  IGNORED: ["metadata", "st-ignored"],
  FLAGGED: ["needs review", "st-flagged"],
};

/** Which original parameter each appended actual* column corrects. */
const PARAM_OF = {
  actualTargetEccentricityXDeg: "targetEccentricityXDeg",
  actualTargetEccentricityYDeg: "targetEccentricityYDeg",
  midpointTargetEccentricityRDeg: "targetEccentricityXDeg",
  midpointLevelLog10Deg: "level",
  midpointSpacingDeg: "spacingDeg",
  actualLevelLog10Deg: "level",
  actualSpacingDeg: "spacingDeg",
  actualSizeDeg: "targetSizeDeg",
  actualFlankerSpacingDeg: "flankerSpacingDeg",
  screenBoundingRectDegCorrected: "screenBoundingRectDeg",
  nearestCorrectXY: "nearestXYPx",
  gazeMeasuredXDeg: "gazeMeasuredXDeg",
  gazeMeasuredYDeg: "gazeMeasuredYDeg",
  gazeMeasuredRDeg: "gazeMeasuredRDeg",
  gazeMeasuredRawDeg: "gazeMeasuredRawDeg",
};

/** Original-column names this row carries corrections for. */
const changedColsOf = (o) => {
  const cols = new Set();
  for (const k of Object.keys(o.columns)) {
    if (k in PARAM_OF) cols.add(PARAM_OF[k]);
  }
  if (
    o.columns.referenceNominalCenterTargetEccentricityYDeg !== undefined ||
    o.columns.midpointTargetEccentricityRDeg !== undefined ||
    o.columns.actualTargetEccentricityRDegScenarioA !== undefined
  )
    cols.add("targetEccentricityYDeg");
  return [...cols];
};

const requestedMetrics = (parsedRow, header) => {
  const cell = (name) => {
    const i = header.indexOf(name);
    return i >= 0 ? parsedRow[i] : "";
  };
  const parts = [];
  const rawLevel = cell("level");
  const level =
    rawLevel !== "" && Number.isFinite(Number(rawLevel))
      ? fmt(Number(rawLevel), 3)
      : esc(rawLevel);
  if (cell("targetEccentricityXDeg") !== "")
    parts.push(
      `<span class="metric-label">position (x, y)</span><span>(${esc(
        cell("targetEccentricityXDeg"),
      )}, ${esc(cell("targetEccentricityYDeg"))})°</span>`,
    );
  if (cell("level") !== "")
    parts.push(
      `<span class="metric-label">log₁₀ level</span><span>${level}</span>`,
    );
  return parts.length
    ? parts.map((p) => `<div class="metric">${p}</div>`).join("")
    : '<span class="muted">—</span>';
};

const recoveredMetrics = (o) => {
  if (o.status === "RANGED") {
    const parts = [];
    if (o.columns.actualTargetEccentricityRDegScenarioA !== undefined) {
      parts.push(
        `<span class="metric-label">eccentricity r</span><span>A ${fmt(
          Number(o.columns.actualTargetEccentricityRDegScenarioA),
          2,
        )}° · B ${fmt(
          Number(o.columns.actualTargetEccentricityRDegScenarioB),
          2,
        )}°</span>`,
        `<span class="metric-label">spacing</span><span>A ${fmt(
          Number(o.columns.actualSpacingDegScenarioA),
          2,
        )}° · B ${fmt(Number(o.columns.actualSpacingDegScenarioB), 2)}°</span>`,
        `<span class="metric-label">log₁₀ level</span><span>A ${fmt(
          Number(o.columns.actualLevelLog10DegScenarioA),
          3,
        )} · B ${fmt(
          Number(o.columns.actualLevelLog10DegScenarioB),
          3,
        )}</span>`,
      );
    } else {
      if (o.columns.midpointTargetEccentricityRDeg !== undefined)
        parts.push(
          `<span class="metric-label">eccentricity r</span><span>[${fmt(
            Number(rangePart(o, "TargetEccentricityRDegMin")),
            2,
          )}, ${fmt(
            Number(rangePart(o, "TargetEccentricityRDegMax")),
            2,
          )}]°</span>`,
        );
      if (o.columns.midpointSpacingDeg !== undefined)
        parts.push(
          `<span class="metric-label">spacing</span><span>${fmt(
            Number(rangePart(o, "SpacingDegMin")),
            2,
          )}–${fmt(Number(rangePart(o, "SpacingDegMax")), 2)}°</span>`,
          `<span class="metric-label">log₁₀ level</span><span>${fmt(
            Number(rangePart(o, "LevelLog10DegMin")),
            3,
          )}–${fmt(Number(rangePart(o, "LevelLog10DegMax")), 3)}</span>`,
        );
    }
    return parts.map((p) => `<div class="metric">${p}</div>`).join("");
  }
  if (o.status === "CORRECTED") {
    const parts = [];
    if (o.actualTargetEccentricityXDeg !== undefined)
      parts.push(
        `<span class="metric-label">position (x, y)</span><span>(${fmt(
          o.actualTargetEccentricityXDeg,
          2,
        )}, ${fmt(o.actualTargetEccentricityYDeg, 2)})°</span>`,
      );
    if (o.actualSpacingDeg !== undefined)
      parts.push(
        `<span class="metric-label">spacing</span><span>${fmt(
          o.actualSpacingDeg,
          2,
        )}°</span>`,
      );
    if (o.actualLevelLog10Deg !== undefined)
      parts.push(
        `<span class="metric-label">log₁₀ level</span><span>${fmt(
          o.actualLevelLog10Deg,
          3,
        )}</span>`,
      );
    return parts.length
      ? parts.map((p) => `<div class="metric">${p}</div>`).join("")
      : '<span class="muted">—</span>';
  }
  return '<span class="muted">—</span>';
};

const scenarioTable = (o) => {
  if (o.columns.rangeMode !== "two-candidates") return "";
  const body = ["A", "B"]
    .map(
      (suffix) =>
        `<tr><td>${suffix}</td><td class="num">(${esc(
          o.columns[`fixationXYPxScenario${suffix}`],
        )})</td><td class="num">${fmt(
          Number(o.columns[`actualTargetEccentricityRDegScenario${suffix}`]),
          2,
        )}°</td><td class="num">${fmt(
          Number(o.columns[`actualSpacingDegScenario${suffix}`]),
          3,
        )}°</td><td class="num">${fmt(
          Number(o.columns[`actualLevelLog10DegScenario${suffix}`]),
          3,
        )}</td></tr>`,
    )
    .join("");
  return `<p class="scenario-definition">${SCENARIO_DEFINITION}</p>
    <div class="scenario-wrap"><table class="scenario-table"><thead><tr>
    <th>Candidate</th><th>Fixation (x, y), px</th><th>Eccentricity r</th>
    <th>Spacing</th><th>Log₁₀ level</th></tr></thead><tbody>${body}</tbody>
    </table></div>`;
};

const renderRow = (o, parsedRow, header, idx) => {
  const label =
    o.status === "RANGED"
      ? o.columns.rangeMode === "two-candidates"
        ? "2 candidates"
        : "approximate range"
      : STATUS_LABEL[o.status][0];
  const cls = STATUS_LABEL[o.status][1];
  const anyDiff = o.status === "CORRECTED" || o.status === "RANGED";
  const derivation = rowDerivationText(o, parsedRow, header)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<li>${esc(line)}</li>`)
    .join("");
  const affected = changedColsOf(o)
    .map((c) => `<code>${esc(c)}</code>`)
    .join(", ");
  return `<tr data-st="${o.status}" class="trial-row ${
    anyDiff ? "r-diff" : ""
  }">
    <td class="rownum">${idx + 1}</td>
    <td>${pill(cls, label)}</td>
    <td class="requested">${requestedMetrics(parsedRow, header)}</td>
    <td class="recovered">${recoveredMetrics(o)}</td>
    <td class="detail-action"><button type="button" class="rowdetails" data-row="${
      idx + 1
    }" aria-expanded="false" aria-label="Show details for CSV row ${
      idx + 1
    }">Details</button></td>
  </tr><tr data-st="${o.status}" class="trial-detail-row" hidden>
    <td colspan="5"><div class="derivation">
      ${scenarioTable(o)}
      <ul class="derivation-list">${derivation}</ul>
      ${
        affected
          ? `<p class="affected"><b>Affected parameters:</b> ${affected}</p>`
          : ""
      }
    </div></td></tr>`;
};

/** Inline-SVG scatter: requested (x) vs actual (y), with identity line. */
const scatterPlot = (pts, xLabel, yLabel) => {
  if (!pts.length) return "";
  const W = 360,
    H = 260,
    PAD = 42;
  const max = plotMaximum(pts);
  const X = (v) => PAD + (v / max) * (W - PAD - 8);
  const Y = (v) => H - PAD + 8 - (v / max) * (H - PAD - 8);
  const bars = pts
    .filter(hasFiniteInterval)
    .map(
      (p) =>
        `<line x1="${X(p[0]).toFixed(1)}" y1="${Y(p[2]).toFixed(1)}" x2="${X(
          p[0],
        ).toFixed(1)}" y2="${Y(p[3]).toFixed(
          1,
        )}" stroke="#125a9c" stroke-width="1.2" stroke-opacity="0.55"/>`,
    )
    .join("");
  const dots = pts
    .map((p) => {
      const interval = hasFiniteInterval(p);
      return `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(
        1,
      )}" r="3.5" fill="#b26a00" fill-opacity="0.85"><title>asked ${um(
        p[0].toFixed(2),
      )}°, ${interval ? "midpoint" : "actually drew"} ${um(
        p[1].toFixed(2),
      )}° (${pct(((p[1] - p[0]) / p[0]) * 100)})${
        interval
          ? `; interval [${um(p[2].toFixed(2))}, ${um(p[3].toFixed(2))}]°`
          : ""
      }</title></circle>`;
    })
    .join("");
  const ticks = [0, max / 2, max]
    .map(
      (v) =>
        `<line x1="${X(v)}" y1="${Y(0)}" x2="${X(v)}" y2="${
          Y(0) + 4
        }" stroke="#999"/><text x="${X(v)}" y="${
          Y(0) + 15
        }" font-size="9" text-anchor="middle" fill="#666">${v.toFixed(
          1,
        )}</text>` +
        `<line x1="${X(0) - 4}" y1="${Y(v)}" x2="${X(0)}" y2="${Y(
          v,
        )}" stroke="#999"/><text x="${X(0) - 6}" y="${
          Y(v) + 3
        }" font-size="9" text-anchor="end" fill="#666">${v.toFixed(1)}</text>`,
    )
    .join("");
  return `<svg width="${W}" height="${H}" class="plot" role="img" aria-label="${esc(
    xLabel,
  )} versus recovered value">
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(max)}" y2="${Y(
      max,
    )}" stroke="#2e7d32" stroke-dasharray="4 3"/>
    <text x="${X(max * 0.82)}" y="${
      Y(max * 0.82) - 6
    }" font-size="9" fill="#2e7d32">no error</text>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(max)}" y2="${Y(0)}" stroke="#bbb"/>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(max)}" stroke="#bbb"/>
    ${ticks}${bars}${dots}
    <text x="${W / 2}" y="${
      H - 2
    }" font-size="10" text-anchor="middle" fill="#444">${esc(xLabel)}</text>
    <text x="10" y="${
      H / 2
    }" font-size="10" text-anchor="middle" fill="#444" transform="rotate(-90 10 ${
      H / 2
    })">${esc(yLabel)}</text>
  </svg>`;
};

const download = (name, text) => {
  const blob = new Blob([text], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

const results = document.getElementById("results");

/** Custom hover tooltip (larger font than native title tooltips). */
const tipEl = document.createElement("div");
tipEl.className = "rtip";
document.body.appendChild(tipEl);
const moveTip = (e) => {
  const pad = 14;
  const r = tipEl.getBoundingClientRect();
  let x = e.clientX + pad;
  let y = e.clientY - r.height / 2;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
  y = Math.min(Math.max(y, 8), innerHeight - r.height - 8);
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
};
document.body.addEventListener("mouseover", (e) => {
  const t = e.target.closest("[data-tip]");
  if (!t) return;
  tipEl.innerHTML = esc(t.getAttribute("data-tip")).replace(/\n/g, "<br>");
  tipEl.style.display = "block";
  moveTip(e);
});
document.body.addEventListener("mousemove", (e) => {
  if (tipEl.style.display === "block") moveTip(e);
});
document.body.addEventListener("mouseout", (e) => {
  if (e.target.closest("[data-tip]")) tipEl.style.display = "none";
});
const reportLines = [];

/* ---------------- Batch (many files / whole folders) ---------------- */
const batch = {
  processed: 0, // CSV files assessed
  repaired: 0, // files with >=1 corrected row (renamed "-repaired")
  clean: 0, // no corrections, no flags — nothing to do
  flaggedOnly: 0, // no corrections, some rows flagged for manual review
  already: 0, // already repaired earlier — passed through unchanged
  errors: 0, // unreadable/parse failures
  skippedNonCsv: 0, // non-CSV files in dropped folders
  /** ZIP entries: relative path (folder structure preserved) -> content.
   *  Repaired files sit next to their originals' path under a
   *  "-repaired" name; everything else is the original bytes verbatim. */
  entries: new Map(),
  /** Stems (X.results) of .results.zip archives processed — used to name
   *  the output ZIP after a sole archive input. */
  archiveStems: [],
  conditions: new Map(),
  files: [],
};

const addEntry = (path, text) => {
  if (!batch.entries.has(path)) {
    batch.entries.set(path, text);
    return path;
  }
  // Name collision (e.g. original + its earlier repair both present)
  let i = 2,
    p;
  do {
    p = /\.csv$/i.test(path)
      ? path.replace(/\.csv$/i, ` (${i}).csv`)
      : `${path} (${i})`;
    i++;
  } while (batch.entries.has(p));
  batch.entries.set(p, text);
  return p;
};

const updateBatchConditions = (text, result) => {
  const parsed = parseCsv(toConditionSensitivityCsv(text, result));
  const i = (name) => parsed.header.indexOf(name);
  parsed.rows.forEach((r) => {
    const experiment = r[i("experiment")] || "?";
    const bc = r[i("block_condition")] || "?";
    const conditionName = r[i("conditionName")];
    const key = `${experiment} / ${conditionName || bc} (${bc})`;
    if (!batch.conditions.has(key))
      batch.conditions.set(key, { trials: [], participants: new Set() });
    const group = batch.conditions.get(key);
    group.participants.add(r[i("participant")] || "?");
    group.trials.push({
      status: r[i("repairStatus")],
      lower: Number(r[i("actualLevelLog10DegLower")]),
      midpoint: Number(r[i("actualLevelLog10DegMidpoint")]),
      upper: Number(r[i("actualLevelLog10DegUpper")]),
    });
  });
};

const batchConditionReportLines = () => {
  if (!batch.conditions.size) return [];
  const median = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const lines = ["", "Batch condition sensitivity (all files):"];
  for (const [label, group] of [...batch.conditions.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const trials = group.trials;
    const corrected = trials.filter((t) => t.status === "CORRECTED").length;
    const ranged = trials.filter((t) => t.status === "RANGED").length;
    lines.push(
      `  ${label}: ${group.participants.size} participants; ${corrected} corrected / ${ranged} ranged; median recovered log10 level ` +
        `${fmtAscii(median(trials.map((t) => t.lower)), 4)} / ${fmtAscii(
          median(trials.map((t) => t.midpoint)),
          4,
        )} / ${fmtAscii(
          median(trials.map((t) => t.upper)),
          4,
        )} (lower/midpoint/upper)`,
    );
  }
  return lines;
};

const updateBatchBar = () => {
  if (!batch.processed && !batch.errors && !batch.skippedNonCsv) return;
  const bar = document.getElementById("batchbar");
  bar.style.display = "flex";
  const parts = [];
  if (batch.repaired) parts.push(`${batch.repaired} repaired`);
  if (batch.clean) parts.push(`${batch.clean} needed nothing`);
  if (batch.flaggedOnly) parts.push(`${batch.flaggedOnly} flagged for review`);
  if (batch.already) parts.push(`${batch.already} already repaired`);
  if (batch.errors) parts.push(`${batch.errors} unreadable`);
  const n = batch.processed + batch.errors;
  const allRepaired = n > 0 && batch.repaired === n;
  const heading = allRepaired ? "files repaired" : "files assessed";
  const detail = `${
    allRepaired
      ? "Original files unchanged · folder structure preserved"
      : parts.length
      ? parts.join(" · ")
      : "no repairs needed"
  }${batch.skippedNonCsv ? ` · ${batch.skippedNonCsv} non-CSV skipped` : ""}`;
  document.getElementById(
    "batchcounts",
  ).innerHTML = `<strong>${n}</strong><span>${heading}</span><small>${esc(
    detail,
  )}</small>`;
};

const renderBatchSummary = () => {
  const section = document.getElementById("batchsummary");
  if (!batch.files.length) {
    section.hidden = true;
    return;
  }
  const summary = summarizeArchive(batch.files);
  const legend = [
    batch.files.some((file) => file.mode === "midpoint")
      ? '<span><i class="midpoint-dot"></i>Ranged midpoint</span>'
      : "",
    batch.files.some((file) => file.mode === "exact")
      ? '<span><i class="exact-dot"></i>Exact recovered</span>'
      : "",
  ].join("");
  const metric = (label, value, formatter) =>
    Number.isFinite(value)
      ? `<div class="archive-metric"><span>${label}</span><strong>${formatter(
          value,
        )}</strong></div>`
      : "";
  section.innerHTML = `
    <div class="archive-heading"><h2>Archive summary</h2>
      <p>${summary.fileCount} repaired file${
        summary.fileCount === 1 ? "" : "s"
      }. Each point is one file.</p></div>
    <div class="archive-metrics">
      ${metric("Median eccentricity change", summary.eccentricityMedian, pct)}
      ${metric(`Median ${summary.quantity} change`, summary.spacingMedian, pct)}
      ${metric(
        "Median spacing interval width",
        summary.uncertaintyMedian,
        (value) => `${fmt(value, 3)}°`,
      )}
    </div>
    <p class="archive-method">Large values and green lines mark the median of per-file medians. Ranged files use midpoint summaries; exact-only files use recovered values. Vertical offsets only separate points.</p>
    <div class="archive-plots">
      ${distributionPlotSvg(batch.files, "eccentricity", "eccentricity")}
      ${distributionPlotSvg(batch.files, "spacing", summary.quantity)}
    </div>
    <div class="archive-legend">${legend}</div>`;
  section.hidden = false;
};

const reportText = () =>
  "EasyEyes results repair report\n" +
  new Date().toISOString() +
  `\n${batch.processed} files assessed: ${batch.repaired} repaired (renamed "-repaired"), ${batch.clean} needed nothing, ${batch.flaggedOnly} flagged for review, ${batch.already} already repaired, ${batch.errors} unreadable` +
  (batch.skippedNonCsv
    ? `, ${batch.skippedNonCsv} non-CSV files skipped`
    : "") +
  "\nCorrected rows replace requested values and list the replacements in repairImputedColumns. Ranged rows keep original values and append midpoint summaries, approximate continuous ranges, and model-consistent scenarios. Ranges cover fixation and rendered-width rounding only, not eye-tracker noise, viewing-distance error, timing error, or actual gaze deviation. Sensitivity CSVs carry trial responses and model-based lower/midpoint/upper levels for offline fitting, not QUEST replays or threshold estimates.\n\n" +
  reportLines.join("\n") +
  batchConditionReportLines().join("\n") +
  "\n";

const reportFile = async (zip) => {
  const paths = [...batch.entries.keys()];
  const roots = new Set(
    paths.map((p) => (p.includes("/") ? p.split("/")[0] : "")),
  );
  const root = roots.size === 1 && !roots.has("") ? [...roots][0] : "";
  const stems = [...new Set(batch.archiveStems)];
  // A sole X.results.zip input names the output X-repaired.results.zip
  // REGARDLESS of internal layout (an internal top folder must not steal
  // the naming); marker stripped from the stem first, so it never stacks.
  const soleArchive = stems.length === 1 && stems[0].endsWith(".results");
  const name = soleArchive
    ? `${stems[0]
        .replace(/\.results$/i, "")
        .replace(/-repaired$/i, "")}-repaired.results.zip`
    : root
    ? root.endsWith(".results")
      ? `${root.slice(0, -".results".length)}-repaired.results.zip`
      : `${root}-repaired.zip`
    : "easyeyes-results-repaired.zip";
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

const tipUnaff =
  "These trials were not affected by the bug (e.g. eye at screen center, untracked session, or recorded outside the bug window).";
const tipFlag =
  "The file lacks enough logged evidence to determine what was drawn. Nothing is changed; the report lists the reasons.";
const tipIgnored =
  "Metadata and non-trial rows need no repair assessment and are not counted as failures.";
const tipRanged =
  "The fixation used for target geometry was not logged. Continuous results are approximate ranges, not guaranteed bounds. Two candidates fit the logged triplet width and have separate A/B values. Original values are preserved. Uncertainty excludes eye-tracker noise, viewing-distance error, timing error, and actual gaze deviation.";
const tipAlready =
  "This file already carries the repair audit columns — it was repaired before. It passes through unchanged; correcting twice is impossible.";

const processFile = async (file, relPath) => {
  const path = relPath || file.name; // folder structure for the ZIP
  let text;
  try {
    // BOM-preserving read (file.text() would strip it): verbatim
    // pass-through must be byte-identical to the file on disk.
    const buf = await file.arrayBuffer();
    text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);
  } catch (e) {
    text = null;
  }
  let result = null;
  let parseError = null;
  if (text !== null) {
    try {
      result = repairCsv(text);
    } catch (e) {
      parseError = e && e.message ? String(e.message) : null;
    }
  }
  if (!result) {
    batch.errors++;
    if (text !== null) addEntry(path, text); // keep the folder complete
    results.insertAdjacentHTML(
      "beforeend",
      `<div class="frow"><span class="fpath">${esc(path)}</span>${pill(
        "st-flagged",
        "could not parse",
        parseError || "The file is not a readable results CSV.",
      )}</div>`,
    );
    reportLines.push(`${path}: ERROR ${parseError || "could not parse"}`);
    updateBatchBar();
    return;
  }

  if (result.summary.alreadyRepaired) {
    batch.already++;
    addEntry(path, text); // verbatim — emerges unchanged
    results.insertAdjacentHTML(
      "beforeend",
      `<div class="frow"><span class="fpath">${esc(path)}</span>${pill(
        "st-done",
        "already repaired",
        tipAlready,
      )}</div>`,
    );
    reportLines.push(`${path}: already repaired — unchanged`);
    batch.processed++;
    updateBatchBar();
    return;
  }

  const s = result.summary;

  if (s.corrected + s.ranged === 0) {
    // Nothing to fix: the file emerges byte-identical, unmarked.
    addEntry(path, text);
    const flagReasons = {};
    addFlagReasons(result, flagReasons);
    const reasonTip = Object.entries(flagReasons)
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `${n}\u00d7 ${r}`)
      .join("\n");
    const pills = [
      s.unaffected
        ? pill("st-unaffected", `${s.unaffected} unaffected`, tipUnaff)
        : "",
      s.flagged
        ? pill("st-flagged", `${s.flagged} flagged`, reasonTip || tipFlag)
        : "",
      s.ignored ? pill("st-ignored", `${s.ignored} metadata`, tipIgnored) : "",
      s.unsupported
        ? pill("st-ignored", `${s.unsupported} unsupported`, tipFlag)
        : "",
    ].join("");
    results.insertAdjacentHTML(
      "beforeend",
      `<div class="frow"><span class="fpath">${esc(path)}</span>${pills}</div>`,
    );
    reportLines.push(
      `${path}: no scalar corrections or ranges — ${s.unaffected} unaffected / ${s.flagged} flagged / ${s.ignored} metadata / ${s.unsupported} unsupported (${s.total} rows); file unchanged`,
    );
    Object.entries(flagReasons).forEach(([r, n]) =>
      reportLines.push(`  FLAG ${n}x: ${r}`),
    );
    batch[s.flagged ? "flaggedOnly" : "clean"]++;
    batch.processed++;
    updateBatchBar();
    return;
  }

  // --- File with corrected and/or ranged rows: detail card + marked output --
  const { header, rows } = parseCsv(text);
  const m = summarizeMagnitudes(text, result);
  const iThreshold = header.indexOf("thresholdParameter");
  const quantity = thresholdQuantity(
    iThreshold >= 0 ? rows.map((row) => row[iThreshold] || "") : [],
    result.rows.map((outcome) => outcome.status),
  );

  const chips = [
    s.corrected
      ? pill(
          "st-corrected",
          `${s.corrected} trials · exact corrections`,
          "The repaired CSV replaces requested values with the exact recovered values.",
        )
      : "",
    s.discreteScenarios
      ? pill(
          "st-ranged",
          `${s.discreteScenarios} trials · 2 candidates`,
          "Two fixation candidates fit the logged triplet width.",
        )
      : "",
    s.continuousRanges
      ? pill(
          "st-ranged",
          `${s.continuousRanges} trials · approximate ranges`,
          "Approximate continuous ranges are not guaranteed global bounds.",
        )
      : "",
    s.flagged
      ? pill("st-flagged", `${s.flagged} trials need review`, tipFlag)
      : "",
  ].join(" ");
  const secondaryCounts = [
    s.unaffected ? `${s.unaffected} unaffected trials` : "",
    s.ignored ? `${s.ignored} metadata rows` : "",
    s.unsupported ? `${s.unsupported} unsupported trials` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const rangeBreakdown = [
    s.discreteScenarios ? `${s.discreteScenarios} two-candidate` : "",
    s.continuousRanges ? `${s.continuousRanges} approximate ranges` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  const summaryMetric = (label, value, note = "") =>
    `<div class="summary-metric"><span>${label}</span><strong>${value}</strong>${
      note ? `<small>${note}</small>` : ""
    }</div>`;
  const effectMetrics = [];
  const effectSentences = [];
  if (m.eccentricityErrPct) {
    effectSentences.push(
      changeSentence(m.eccentricityErrPct[0], "eccentricity", false),
    );
    effectMetrics.push(
      summaryMetric(
        "Median eccentricity change",
        pct(m.eccentricityErrPct[0]),
        `Exact corrections; 5th–95th percentile: ${fmt(
          m.eccentricityErrPct05,
        )}% to ${fmt(m.eccentricityErrPct95)}%`,
      ),
    );
  }
  if (m.sizeSpacingInflationPct) {
    effectSentences.push(
      changeSentence(m.sizeSpacingInflationPct[0], quantity, false),
    );
    effectMetrics.push(
      summaryMetric(
        `Median ${quantity} change`,
        pct(m.sizeSpacingInflationPct[0]),
        `Exact corrections; 5th–95th percentile: ${fmt(
          m.sizeSpacingInflationPct05,
        )}% to ${fmt(m.sizeSpacingInflationPct95)}%`,
      ),
    );
  }
  if (m.rangedEccentricityErrPct) {
    effectSentences.push(
      changeSentence(m.rangedEccentricityErrPct[0], "eccentricity", true),
    );
    effectMetrics.push(
      summaryMetric(
        "Median eccentricity change",
        pct(m.rangedEccentricityErrPct[0]),
        `Midpoint values; 5th–95th percentiles: ${fmt(
          m.rangedEccentricityErrPct05,
        )}% to ${fmt(m.rangedEccentricityErrPct95)}%`,
      ),
    );
  }
  if (m.rangedSizeSpacingInflationPct) {
    effectSentences.push(
      changeSentence(m.rangedSizeSpacingInflationPct[0], quantity, true),
    );
    effectMetrics.push(
      summaryMetric(
        `Median ${quantity} change`,
        pct(m.rangedSizeSpacingInflationPct[0]),
        `Midpoint values; 5th–95th percentiles: ${fmt(
          m.rangedSizeSpacingInflationPct05,
        )}% to ${fmt(m.rangedSizeSpacingInflationPct95)}%`,
      ),
    );
  }
  const uncertaintyMetrics = [];
  if (m.rangedSpacingUncertaintyDeg)
    uncertaintyMetrics.push(
      summaryMetric(
        "Median spacing interval width",
        `${fmt(m.rangedSpacingUncertaintyDeg[0], 3)}°`,
        `Upper minus lower value for each trial. Maximum: ${fmt(
          m.rangedSpacingUncertaintyDeg[1],
          3,
        )}°`,
      ),
    );
  const gist = recoveryGist(s);
  const gistHtml = `<section class="repair-gist" aria-label="Repair summary">
    <div class="gist-count"><strong>${gist.count}</strong><span>${esc(
      gist.heading,
    )}</span></div>
    <div class="gist-copy"><h3>Repair summary</h3>
      ${gist.sentences.map((sentence) => `<p>${esc(sentence)}</p>`).join("")}
      <p class="gist-caveat">${
        s.ranged
          ? "Original values remain unchanged for ranged trials. Midpoints summarize candidates or ranges; they are not observations."
          : "Exact corrections replace requested values with recovered geometry."
      } Recovered values come from logged geometry, not new measurements.</p>
    </div></section>`;
  const summaryPanels = `<div class="metrics-grid">
    <section class="metric-box"><h3>Estimated bug effect</h3>${effectMetrics.join(
      "",
    )}<div class="metric-context">${effectSentences
      .map((sentence) => `<p>${esc(sentence)}</p>`)
      .join("")}</div></section>
    ${
      uncertaintyMetrics.length
        ? `<section class="metric-box uncertainty"><h3>Remaining repair uncertainty</h3>${uncertaintyMetrics.join(
            "",
          )}<p class="metric-context">${
            s.continuousRanges
              ? "Continuous ranges are approximate, not guaranteed bounds."
              : "Two-candidate intervals span scenario extrema and rendered-width rounding."
          }</p></section>`
        : ""
    }
    </div>`;

  const PAGE_SIZE = 50;
  const tableRows = result.rows.map((o, i) => ({
    status: o.status,
    html: renderRow(o, rows[i], header, i),
  }));
  // Per-file counts of each corrected parameter (by original column).
  const pCounts = new Map();
  const rCounts = new Map();
  result.rows.forEach((o) => {
    if (o.status === "RANGED")
      for (const c of changedColsOf(o))
        rCounts.set(c, (rCounts.get(c) || 0) + 1);
    if (o.status !== "CORRECTED") return;
    for (const c of changedColsOf(o)) pCounts.set(c, (pCounts.get(c) || 0) + 1);
  });
  const pstrip = pCounts.size
    ? `<div class="pstrip"><b>Corrected parameters:</b> ${[...pCounts]
        .map(
          ([c, n]) => `<span class="pchip big">${esc(c)} <b>×${n}</b></span>`,
        )
        .join(
          "",
        )}<span class="hint">Corrected values replace requested values in these original columns, so existing analysis works unchanged. <code>repairImputedColumns</code> lists what changed on each row. Your source file is untouched.</span></div>`
    : "";
  const rstrip = rCounts.size
    ? `<div class="pstrip"><b>Ranged parameters:</b> ${[...rCounts]
        .map(
          ([c, n]) => `<span class="pchip big">${esc(c)} <b>×${n}</b></span>`,
        )
        .join(
          "",
        )}<span class="hint">Original values are preserved; midpoint/min/max and any model-consistent scenarios are appended because the fixation used for target geometry was not logged.</span></div>`
    : "";
  const table = `<section class="trials" aria-label="Trial repair results">
      <div class="trial-tools">
        <div><h3>Trials</h3><span class="rowscap">Expand a row for its derivation.</span></div>
        <label>Show
          <select class="rowfilter" aria-label="Filter trial rows">
            <option value="output">Repair output</option>
            <option value="review">Needs review</option>
            <option value="all">All CSV rows</option>
          </select>
        </label>
      </div>
      <p class="trial-definitions">${TRIAL_DEFINITIONS}</p>
      <div class="pager">
        <button class="pageprev" type="button">← Previous</button>
        <span><span class="pageinfo"></span> · page <span class="pagecount"></span></span>
        <button class="pagenext" type="button">Next →</button>
      </div>
      <div class="rowswrap"><table class="trial-table"><thead><tr>
        <th>CSV row</th><th>Recovery</th><th>Requested</th><th>Recovered</th>
        <th><span class="visually-hidden">Derivation</span></th>
      </tr></thead><tbody></tbody></table></div>
      </section>`;

  // Requested-vs-actual plots over corrected trials (exact per session).
  const iX = header.indexOf("targetEccentricityXDeg");
  const iY = header.indexOf("targetEccentricityYDeg");
  const iL = header.indexOf("level");
  const eccPts = [],
    lvlPts = [];
  result.rows.forEach((o, i) => {
    const ranged = o.status === "RANGED";
    if (o.status !== "CORRECTED" && !ranged) return;
    const actualX = ranged
      ? Number(o.columns.midpointTargetEccentricityRDeg)
      : o.actualTargetEccentricityXDeg;
    const actualY = ranged ? 0 : o.actualTargetEccentricityYDeg;
    const actualLevel = ranged
      ? Number(o.columns.midpointLevelLog10Deg)
      : o.actualLevelLog10Deg;
    const actualRLower = ranged
      ? Number(rangePart(o, "TargetEccentricityRDegMin"))
      : undefined;
    const actualRUpper = ranged
      ? Number(rangePart(o, "TargetEccentricityRDegMax"))
      : undefined;
    const spacingLower = ranged
      ? Number(rangePart(o, "SpacingDegMin"))
      : undefined;
    const spacingUpper = ranged
      ? Number(rangePart(o, "SpacingDegMax"))
      : undefined;
    if (iX >= 0 && Number.isFinite(actualX)) {
      const req = Math.hypot(Number(rows[i][iX]), Number(rows[i][iY]));
      const act = Math.hypot(actualX, actualY ?? 0);
      if (req > 0 && Number.isFinite(req))
        eccPts.push([req, act, actualRLower, actualRUpper]);
    }
    if (iL >= 0 && Number.isFinite(actualLevel)) {
      const req = Math.pow(10, Number(rows[i][iL]));
      if (req > 0 && Number.isFinite(req))
        lvlPts.push([
          req,
          Math.pow(10, actualLevel),
          spacingLower,
          spacingUpper,
        ]);
    }
  });
  const plots =
    eccPts.length || lvlPts.length
      ? `<div class="plots">${scatterPlot(
          eccPts,
          "requested eccentricity (°)",
          "recovered (°)",
        )}${scatterPlot(
          lvlPts,
          `requested ${quantity} (°)`,
          "recovered (°)",
        )}</div>`
      : "";

  let tablePage = 0;
  let rowFilter = "output";
  const renderTablePage = () => {
    const filtered = tableRows.filter((row) =>
      trialMatchesFilter(row.status, rowFilter),
    );
    const page = paginate(filtered, tablePage, PAGE_SIZE);
    tablePage = page.page;
    card.querySelector(".trial-table > tbody").innerHTML = page.items.length
      ? page.items.map((row) => row.html).join("")
      : '<tr><td colspan="5" class="empty-rows">No rows match this filter.</td></tr>';
    card.querySelector(".pageinfo").textContent = page.label;
    card.querySelector(".pagecount").textContent = `${page.page + 1}/${
      page.pageCount
    }`;
    card.querySelector(".pageprev").disabled = page.page === 0;
    card.querySelector(".pagenext").disabled = page.page >= page.pageCount - 1;
  };

  const outName = repairedName(file.name);
  const baseName = file.name.replace(/\.csv$/i, "");
  const participant = baseName.split("_")[0] || baseName;
  const date = baseName.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
  batch.files.push({
    label: `${participant}${date ? ` · ${date}` : ""}`,
    eccentricity: m.rangedTrials
      ? m.rangedEccentricityErrPct?.[0] ?? Number.NaN
      : m.eccentricityErrPct?.[0] ?? Number.NaN,
    spacing: m.rangedTrials
      ? m.rangedSizeSpacingInflationPct?.[0] ?? Number.NaN
      : m.sizeSpacingInflationPct?.[0] ?? Number.NaN,
    uncertainty: m.rangedSpacingUncertaintyDeg?.[0] ?? Number.NaN,
    quantity,
    mode: m.rangedTrials ? "midpoint" : "exact",
  });
  renderBatchSummary();
  const card = document.createElement("details");
  card.className = "card file-card";
  card.open = !results.querySelector(".file-card");
  card.innerHTML = `
      <summary>
        <span class="file-heading">
          <span class="file-title">${esc(participant)}${
            date ? ` · ${esc(date)}` : ""
          }</span>
          <span class="fpath">${esc(path)}</span>
        </span>
        <span class="file-outcomes"><span class="chips">${chips}</span>
          <span class="expand-label">Details</span></span>
      </summary>
      <div class="file-body">
        <div class="file-actions">
          <div class="download-group">
            <button class="dl" title="Download the repaired trial data; your source file is untouched">Repaired CSV</button>
            <button class="dl sens secondary" title="Trial responses and scenario levels for offline fitting; not a threshold estimate">Sensitivity CSV</button>
          </div>
          ${
            secondaryCounts
              ? `<span class="secondary-counts">${esc(secondaryCounts)}</span>`
              : ""
          }
        </div>
        ${gistHtml}
        ${summaryPanels}
        <details class="output-details">
          <summary>Output columns and file names</summary>
          <p>Repaired file: <code>${esc(outName)}</code></p>
          <p>Sensitivity CSV: trial responses with lower/midpoint/upper levels for offline fitting—not a QUEST replay or threshold estimate.</p>
          ${pstrip}
          ${rstrip}
        </details>
        ${
          plots
            ? `<details class="plots-details"><summary>Requested-vs-recovered plots</summary><p class="note">Ranged points are midpoint summaries, not individual observations; bars show scenario extrema or approximate ranges.</p>${plots}</details>`
            : ""
        }
        ${table}
      </div>`;
  card.querySelector(".pageprev").addEventListener("click", () => {
    tablePage--;
    renderTablePage();
  });
  card.querySelector(".pagenext").addEventListener("click", () => {
    tablePage++;
    renderTablePage();
  });
  card.querySelector(".rowfilter").addEventListener("change", (e) => {
    rowFilter = e.target.value;
    tablePage = 0;
    renderTablePage();
  });
  card.querySelector(".trial-table > tbody").addEventListener("click", (e) => {
    const button = e.target.closest(".rowdetails");
    if (!button) return;
    const detailRow = button.closest("tr").nextElementSibling;
    const open = detailRow.hidden;
    detailRow.hidden = !open;
    button.textContent = open ? "Hide" : "Details";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute(
      "aria-label",
      `${open ? "Hide" : "Show"} details for CSV row ${button.dataset.row}`,
    );
  });
  renderTablePage();
  card
    .querySelector(".dl")
    .addEventListener("click", () =>
      download(outName, toRepairedCsv(text, result)),
    );
  card
    .querySelector(".sens")
    .addEventListener("click", () =>
      download(sensitivityName(path), toConditionSensitivityCsv(text, result)),
    );
  results.appendChild(card);

  batch.repaired++;
  addEntry(repairedName(path), toRepairedCsv(text, result));
  addEntry(sensitivityName(path), toConditionSensitivityCsv(text, result));
  updateBatchConditions(text, result);
  reportLines.push(
    `${path}: ${s.corrected} corrected / ${s.ranged} ranged / ${
      s.unaffected
    } unaffected / ${s.flagged} flagged / ${s.ignored} metadata / ${
      s.unsupported
    } unsupported (${
      s.total
    } rows; ${rangeBreakdown}) — fixed -> ${repairedName(
      path,
    )}; sensitivity -> ${sensitivityName(path)}`,
  );
  reportLines.push(...conditionReportLines(text, result));
  if (m.correctedTrials > 0)
    reportLines.push(
      `  drawn-vs-requested: ${
        m.eccentricityErrPct
          ? `position median ${fmtAscii(
              Math.abs(m.eccentricityErrPct[0]),
            )}% max ${fmtAscii(m.eccentricityErrPct[1])}%; `
          : ""
      }${
        m.sizeSpacingInflationPct
          ? `size/spacing median ${fmtAscii(
              Math.abs(m.sizeSpacingInflationPct[0]),
            )}% max ${fmtAscii(m.sizeSpacingInflationPct[1])}%`
          : ""
      }`,
    );
  if (m.rangedTrials > 0)
    reportLines.push(
      `  ranged midpoint summaries (not observations): ${
        m.rangedEccentricityErrPct
          ? `position median ${fmtAscii(
              m.rangedEccentricityErrPct[0],
            )}% [5th-95th ${fmtAscii(
              m.rangedEccentricityErrPct05,
            )}%, ${fmtAscii(m.rangedEccentricityErrPct95)}%]; `
          : ""
      }${
        m.rangedSizeSpacingInflationPct
          ? `size/spacing median ${fmtAscii(
              m.rangedSizeSpacingInflationPct[0],
            )}% [5th-95th ${fmtAscii(
              m.rangedSizeSpacingInflationPct05,
            )}%, ${fmtAscii(m.rangedSizeSpacingInflationPct95)}%]; `
          : ""
      }${
        m.rangedSpacingUncertaintyDeg
          ? `median spacing interval width ${fmtAscii(
              m.rangedSpacingUncertaintyDeg[0],
              3,
            )} deg; maximum ${fmtAscii(
              m.rangedSpacingUncertaintyDeg[1],
              3,
            )} deg`
          : ""
      }`,
    );
  const flagReasons = {};
  addFlagReasons(result, flagReasons);
  Object.entries(flagReasons).forEach(([r, n]) =>
    reportLines.push(`  FLAG ${n}x: ${r}`),
  );

  batch.processed++;
  updateBatchBar();
};

/** CSV files (with their folder-relative paths) from a drop. Walks dropped
 *  directories recursively via the entries API (dataTransfer items die
 *  with the event, so entries are grabbed synchronously first). */
const filesFromDataTransfer = async (dt) => {
  const out = [];
  const entries = dt.items
    ? [...dt.items]
        .map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
        .filter(Boolean)
    : [];
  if (!entries.length)
    return [...dt.files].map((f) => ({ file: f, relPath: f.name }));
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      out.push({ file, relPath: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries returns at most 100 entries per call — loop to the end.
      let batchEntries = await new Promise((res, rej) =>
        reader.readEntries(res, rej),
      );
      while (batchEntries.length) {
        for (const e of batchEntries) await walk(e, prefix + entry.name + "/");
        batchEntries = await new Promise((res, rej) =>
          reader.readEntries(res, rej),
        );
      }
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
};

const processArchive = async (file, relPath) => {
  const path = relPath || file.name;
  let zip = null;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch (e) {
    zip = null;
  }
  if (!zip) {
    batch.errors++;
    results.insertAdjacentHTML(
      "beforeend",
      `<div class="frow"><span class="fpath">${esc(path)}</span>${pill(
        "st-flagged",
        "could not unzip",
        "The archive is corrupt, encrypted, or not a ZIP file \u2014 it is included unchanged.",
      )}</div>`,
    );
    reportLines.push(`${path}: ERROR could not unzip`);
    updateBatchBar();
    return;
  }
  const members = Object.values(zip.files).filter((f) => !f.dir);
  const memberBase = (n) => n.split("/").pop();
  const isJunk = (n) =>
    /^__MACOSX\//i.test(n) ||
    /^\./.test(memberBase(n)) ||
    n === "REPAIR-REPORT.txt"; // this tool's own artifact, re-dropped
  const isCsvMember = (n) => /\.csv$/i.test(memberBase(n)) && !isJunk(n);
  const csvs = members.filter((f) => isCsvMember(f.name));
  members.forEach((f) => {
    if (!isCsvMember(f.name) && !isJunk(f.name)) batch.skippedNonCsv++;
  });
  if (!csvs.length) {
    results.insertAdjacentHTML(
      "beforeend",
      `<div class="frow"><span class="fpath">${esc(path)}</span>${pill(
        "st-flagged",
        "no data files",
        "No .csv results files inside this archive.",
      )}</div>`,
    );
    reportLines.push(`${path}: no CSV files inside — unchanged`);
    updateBatchBar();
    return;
  }
  batch.archiveStems.push(
    path
      .replace(/\.zip$/i, "")
      .split("/")
      .pop(),
  );
  // Internal structure is preserved EXACTLY (root-level members stay
  // root-level): the repaired archive is a drop-in replacement Shiny
  // reads just like the original.
  for (const f of csvs) {
    const base = memberBase(f.name);
    await processFile(
      { name: base, arrayBuffer: () => f.async("arraybuffer") },
      f.name,
    );
  }
};

const processFiles = async (list) => {
  for (const { file, relPath } of list) {
    const base = (relPath || file.name).split("/").pop();
    if (/\.zip$/i.test(base)) {
      await processArchive(file, relPath);
      continue;
    }
    // Data files only; skip hidden/AppleDouble strays in dropped folders.
    if (!/\.csv$/i.test(base) || /^\./.test(base)) {
      batch.skippedNonCsv++;
      updateBatchBar();
      continue;
    }
    await processFile(file, relPath);
  }
};

const drop = document.getElementById("drop");
const input = document.getElementById("file");
input.accept = filePickerAccept;
const folderInput = document.getElementById("folder");
document.getElementById("pickFiles").addEventListener("click", (e) => {
  e.stopPropagation();
  input.click();
});
document.getElementById("pickFolder").addEventListener("click", (e) => {
  e.stopPropagation();
  folderInput.click();
});
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", async (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  processFiles(await filesFromDataTransfer(e.dataTransfer));
});
input.addEventListener("change", () => {
  processFiles([...input.files].map((f) => ({ file: f, relPath: f.name })));
  input.value = "";
});
folderInput.addEventListener("change", () => {
  processFiles(
    [...folderInput.files].map((f) => ({
      file: f,
      relPath: f.webkitRelativePath || f.name,
    })),
  );
  folderInput.value = "";
});
document
  .getElementById("reportBtn")
  .addEventListener("click", () => download("repair-report.txt", reportText()));
document.getElementById("zipBtn").addEventListener("click", async () => {
  const zip = new JSZip();
  for (const [p, text] of batch.entries) zip.file(p, text);
  zip.file("REPAIR-REPORT.txt", reportText());
  await reportFile(zip);
});

/* ---------------- Interactive general-error explorer ---------------- */
/* Glyph metrics for the size-mode overlay: measure the chosen character at
 * 100px once, then scale font-size so the glyph's relevant extent (cap
 * height or advance width) equals the computed screen px exactly. */
let xpGlyphMetric = null;
const xpMeasureGlyph = () => {
  const ch = document.getElementById("xp-char").value || "E";
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = "700 100px Arial, sans-serif";
  const m = ctx.measureText(ch[0]);
  const capH =
    m.actualBoundingBoxAscent && m.actualBoundingBoxDescent !== undefined
      ? m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
      : 72; // ~cap height of a 100px bold sans
  xpGlyphMetric = { ch: ch[0], capH, width: m.width || 60 };
};

/* The bug's signature: the transform ran with the nearest point shifted
 * half a screen up-and-right (+W/2, +H/2 px, center-origin). What was
 * shown for a requested deg position is recovered by drawing with the
 * buggy eye and reading back with the true eye. */

const XP = {
  xrange: 26, // ±deg horizontally
  yrange: 16, // ±deg vertically
  cellsX: 52,
  cellsY: 32,
};

let xpMode = "placement"; // "placement" | "size"
const xpEls = {};
["preset", "w", "h", "ppc", "dist", "ex", "ey", "grid", "ref"].forEach(
  (k) => (xpEls[k] = document.getElementById("xp-" + k)),
);

const xpState = () => {
  let w = Number(xpEls.w.value),
    h = Number(xpEls.h.value),
    ppc = Number(xpEls.ppc.value);
  if (xpEls.preset.value !== "custom") {
    [w, h, ppc] = xpEls.preset.value.split(",").map(Number);
  }
  ppc = Math.max(1, ppc); // px/cm sets the PHYSICAL screen size; clamp
  if (xpEls.preset.value === "custom" && Number(xpEls.ppc.value) !== ppc)
    xpEls.ppc.value = ppc;
  return {
    w,
    h,
    ppc,
    dist: Number(xpEls.dist.value),
    eyeXPx: Number(xpEls.ex.value) * ppc, // cm from screen center -> px
    eyeYPx: Number(xpEls.ey.value) * ppc,
    showGrid: xpEls.grid.checked,
    showRef: xpEls.ref.checked,
    mode: xpMode,
    sizeDeg: Number(document.getElementById("xp-size").value),
    sizeDim: document.getElementById("xp-sizedim").value, // "h" | "w"
  };
};

/** Diverging color around 1.0: blue < 1 (drawn closer), orange > 1. */
const xpColor = (ratio) => {
  const t = Math.max(-1, Math.min(1, (ratio - 1) / 0.2)); // ±20% full scale
  const lerp = (a, b, u) => Math.round(a + (b - a) * u);
  if (t >= 0) {
    const u = t;
    return `rgb(${lerp(250, 212, u)},${lerp(250, 78, u)},${lerp(250, 0, u)})`;
  }
  const u = -t;
  return `rgb(${lerp(250, 26, u)},${lerp(250, 90, u)},${lerp(250, 200, u)})`;
};

const renderExplore = () => {
  const st = xpState();
  if (!(st.w > 0 && st.h > 0 && st.ppc > 0 && st.dist > 0)) return;
  document.getElementById("xp-dist-v").textContent = st.dist;
  document.getElementById("xp-ex-v").textContent = um(
    (st.eyeXPx / st.ppc).toFixed(1),
  );
  document.getElementById("xp-ey-v").textContent = um(
    (st.eyeYPx / st.ppc).toFixed(1),
  );
  document
    .getElementById("explore")
    .classList.toggle("showCustom", xpEls.preset.value === "custom");

  // SCREEN space: the map is the physical screen, to scale. This matches
  // threshold's deg grid (components/grid.js): equal deg steps project to
  // px spacings that GROW with eccentricity (perspective), and the whole
  // lattice scales with viewing distance.
  const trueEye = [st.eyeXPx, st.eyeYPx];
  // The bug used the raw webcam coordinates VERBATIM in the center-origin
  // frame: x is an exact +W/2 shift, but y is H/2 - trueY (a reflection
  // about the quarter-height line), NOT a constant +H/2 shift.
  const buggyEye = [st.eyeXPx + st.w / 2, st.h / 2 - st.eyeYPx];
  const base = {
    pxPerCm: st.ppc,
    viewingDistanceCm: st.dist,
    fixationXYPx: [0, 0],
  };
  const correctParams = { ...base, nearestPointXYZPx: trueEye };
  const buggyParams = { ...base, nearestPointXYZPx: buggyEye };

  const svgW = 640,
    svgH = Math.round((svgW * st.h) / st.w);
  const X = (px) => ((px + st.w / 2) / st.w) * svgW;
  const Y = (py) => ((st.h / 2 - py) / st.h) * svgH;
  const cellsX = 52,
    cellsY = 32,
    cw = svgW / cellsX,
    ch = svgH / cellsY;

  const cells = [];
  for (let iy = 0; iy < cellsY; iy++) {
    for (let ix = 0; ix < cellsX; ix++) {
      const pxCx = -st.w / 2 + ((ix + 0.5) / cellsX) * st.w;
      const pxCy = st.h / 2 - ((iy + 0.5) / cellsY) * st.h;
      const req = xyDegOfPxCore([pxCx, pxCy], correctParams);
      const reqR = Math.hypot(req[0], req[1]);
      if (reqR < 0.5) continue; // ratio unstable at fixation; error is ~0
      let ratio;
      if (st.mode === "size") {
        // A stimulus of requested size at this position: px extent drawn by
        // the buggy conversion, measured back in deg by the correct one.
        const dir = st.sizeDim === "h" ? [0, 1] : [1, 0];
        const p1 = xyPxOfDegCore(req, buggyParams);
        const p2 = xyPxOfDegCore(
          [req[0] + dir[0] * st.sizeDeg, req[1] + dir[1] * st.sizeDeg],
          buggyParams,
        );
        const d1 = xyDegOfPxCore(p1, correctParams);
        const d2 = xyDegOfPxCore(p2, correctParams);
        ratio = Math.hypot(d2[0] - d1[0], d2[1] - d1[1]) / st.sizeDeg;
      } else {
        const drawn = xyPxOfDegCore(req, buggyParams);
        const act = xyDegOfPxCore(drawn, correctParams);
        ratio = Math.hypot(act[0], act[1]) / reqR;
      }
      cells.push(
        `<rect x="${(ix * cw).toFixed(1)}" y="${(iy * ch).toFixed(
          1,
        )}" width="${(cw + 0.5).toFixed(1)}" height="${(ch + 0.5).toFixed(
          1,
        )}" fill="${xpColor(ratio)}"/>`,
      );
    }
  }

  // A deg-lattice polyline mapped to screen px under the given transform.
  const STEP = 5;
  const gridPaths = (params, style) => {
    const paths = [];
    const maxDeg = 80; // generous; the viewBox clips off-screen parts
    const line = (vertical, c) => {
      let d = "";
      let prev = null;
      // Break the polyline across the projection singularity: for an eye
      // placed off-screen, requested angles past ~90 deg from its forward
      // axis map to astronomic px ("behind the eye"); joining across that
      // fold would paint phantom lines across the screen.
      const maxStep = Math.max(st.w, st.h) * 4;
      // Drop points mapped past the fold ("behind the eye", astronomic px):
      // beyond 3x the screen extent they are meaningless AND huge SVG
      // coordinates hang the renderer.
      const offLimit = Math.max(st.w, st.h) * 3;
      for (let t = -maxDeg; t <= maxDeg; t += 1) {
        const deg = vertical ? [c, t] : [t, c];
        const px = xyPxOfDegCore(deg, params);
        if (
          !Number.isFinite(px[0]) ||
          !Number.isFinite(px[1]) ||
          Math.abs(px[0]) > offLimit ||
          Math.abs(px[1]) > offLimit
        ) {
          prev = null;
          continue;
        }
        const jump =
          prev && Math.hypot(px[0] - prev[0], px[1] - prev[1]) > maxStep;
        d += `${d && !jump ? "L" : "M"}${X(px[0]).toFixed(1)},${Y(
          px[1],
        ).toFixed(1)}`;
        prev = px;
      }
      if (d) paths.push(`<path d="${d}" fill="none" ${style}/>`);
    };
    for (let c = -maxDeg; c <= maxDeg; c += STEP) {
      line(true, c);
      line(false, c);
    }
    return paths.join("");
  };

  let grids = "";
  if (st.showRef) {
    grids += gridPaths(
      correctParams,
      `stroke="#2e7d32" stroke-opacity="0.6" stroke-width="0.8" stroke-dasharray="5 4"`,
    );
    // Degree labels, anchored where each ref line crosses an axis.
    const labels = [];
    for (let c = -80; c <= 80; c += STEP) {
      if (c === 0) continue;
      const vx = xyPxOfDegCore([c, 0], correctParams);
      if (
        Number.isFinite(vx[0]) &&
        vx[0] > -st.w / 2 + 8 &&
        vx[0] < st.w / 2 - 8
      )
        labels.push(
          `<text x="${X(vx[0]).toFixed(
            1,
          )}" y="11" font-size="9" fill="#1e6b2f" text-anchor="middle" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${um(
            c,
          )}°</text>`,
        );
      const hy = xyPxOfDegCore([0, c], correctParams);
      if (
        Number.isFinite(hy[1]) &&
        hy[1] > -st.h / 2 + 8 &&
        hy[1] < st.h / 2 - 8
      )
        labels.push(
          `<text x="4" y="${(Y(hy[1]) + 3).toFixed(
            1,
          )}" font-size="9" fill="#1e6b2f" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${um(
            c,
          )}°</text>`,
        );
    }
    grids += labels.join("");
  }
  if (st.showGrid)
    grids += gridPaths(
      buggyParams,
      `stroke="#16344d" stroke-opacity="0.85" stroke-width="1.3"`,
    );

  const markers = `<circle cx="${X(0)}" cy="${Y(
    0,
  )}" r="4" fill="none" stroke="#222" stroke-width="1.4"><title>fixation</title></circle>`;

  document.querySelector(".legend").innerHTML =
    st.mode === "size"
      ? `<span class="sw" style="background:#1a5ac8"></span> drawn smaller than requested &nbsp;·&nbsp; white: no error &nbsp;·&nbsp; <span class="sw" style="background:#d44e00"></span> drawn larger than requested`
      : `<span class="sw" style="background:#1a5ac8"></span> drawn closer than requested &nbsp;·&nbsp; white: no error &nbsp;·&nbsp; <span class="sw" style="background:#d44e00"></span> drawn farther than requested`;

  const svg = `<svg id="xp-svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
    ${cells.join("")}${grids}${markers}<g id="xp-glyphs"></g>
  </svg>`;
  const plot = document.getElementById("xp-plot");
  plot.innerHTML = svg;

  const svgEl = document.getElementById("xp-svg");
  const tooltip = document.createElement("div");
  tooltip.id = "xp-tooltip";
  plot.style.position = "relative";
  plot.appendChild(tooltip);
  svgEl.addEventListener("mousemove", (e) => {
    const r = svgEl.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * st.w - st.w / 2;
    const py = st.h / 2 - ((e.clientY - r.top) / r.height) * st.h;
    const req = xyDegOfPxCore([px, py], correctParams);
    const reqR = Math.hypot(req[0], req[1]);
    let html;
    if (st.mode === "size") {
      const dir = st.sizeDim === "h" ? [0, 1] : [1, 0];
      const p1 = xyPxOfDegCore(req, buggyParams);
      const p2 = xyPxOfDegCore(
        [req[0] + dir[0] * st.sizeDeg, req[1] + dir[1] * st.sizeDeg],
        buggyParams,
      );
      const d1 = xyDegOfPxCore(p1, correctParams);
      const d2 = xyDegOfPxCore(p2, correctParams);
      const actualSize = Math.hypot(d2[0] - d1[0], d2[1] - d1[1]);
      html = `<b>${pct(
        ((actualSize - st.sizeDeg) / st.sizeDeg) * 100,
      )}</b> size error`;
      // Ghost overlay: the requested letter (green) vs what was drawn
      // (dark), each at its own position and size, partially transparent.
      if (!xpGlyphMetric) xpMeasureGlyph();
      const reqCenter = xyPxOfDegCore(req, correctParams);
      const actCenter = p1;
      const extent = (center, params) => {
        const q = xyPxOfDegCore(
          [req[0] + dir[0] * st.sizeDeg, req[1] + dir[1] * st.sizeDeg],
          params,
        );
        return Math.hypot(q[0] - center[0], q[1] - center[1]);
      };
      const reqPx = extent(reqCenter, correctParams);
      const actPx = extent(actCenter, buggyParams);
      const metricPx =
        st.sizeDim === "h" ? xpGlyphMetric.capH : xpGlyphMetric.width;
      const glyph = (center, px, color, label) =>
        `<text x="${X(center[0]).toFixed(1)}" y="${Y(center[1]).toFixed(1)}" ` +
        `font-family="Arial, sans-serif" font-weight="700" font-size="${(
          (px / metricPx) *
          100
        ).toFixed(1)}" ` +
        `fill="${color}" fill-opacity="0.55" text-anchor="middle" dominant-baseline="central">${esc(
          xpGlyphMetric.ch,
        )}</text>` +
        `<text x="${X(center[0]).toFixed(1)}" y="${(
          Y(center[1]) +
          ((px / metricPx) * 100) / 2 +
          12
        ).toFixed(1)}" ` +
        `font-size="10" fill="${color}" text-anchor="middle" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${label}</text>`;
      svgEl.querySelector("#xp-glyphs").innerHTML =
        glyph(reqCenter, reqPx, "#2e7d32", `requested ${st.sizeDeg}°`) +
        glyph(
          actCenter,
          actPx,
          "#16344d",
          `actual ${um(actualSize.toFixed(2))}°`,
        );
    } else {
      const drawn = xyPxOfDegCore(req, buggyParams);
      const act = xyDegOfPxCore(drawn, correctParams);
      const actR = Math.hypot(act[0], act[1]);
      html = `<b>${
        reqR > 0.1 ? pct(((actR - reqR) / reqR) * 100) : "—"
      }</b> eccentricity error`;
      // Ghost pair: requested position (green) vs drawn position (dark),
      // each labeled with its position and eccentricity.
      const reqPxPos = xyPxOfDegCore(req, correctParams);
      const dotLabel = (px, color, text, above) =>
        `<text x="${X(px[0]).toFixed(1)}" y="${(
          Y(px[1]) + (above ? -12 : 20)
        ).toFixed(1)}" ` +
        `font-size="10" fill="${color}" text-anchor="middle" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${text}</text>`;
      svgEl.querySelector("#xp-glyphs").innerHTML =
        `<line x1="${X(reqPxPos[0]).toFixed(1)}" y1="${Y(reqPxPos[1]).toFixed(
          1,
        )}" x2="${X(drawn[0]).toFixed(1)}" y2="${Y(drawn[1]).toFixed(
          1,
        )}" stroke="#555" stroke-width="1" stroke-opacity="0.6"/>` +
        `<circle cx="${X(reqPxPos[0]).toFixed(1)}" cy="${Y(reqPxPos[1]).toFixed(
          1,
        )}" r="7" fill="#2e7d32" fill-opacity="0.55"/>` +
        `<circle cx="${X(drawn[0]).toFixed(1)}" cy="${Y(drawn[1]).toFixed(
          1,
        )}" r="7" fill="#16344d" fill-opacity="0.55"/>` +
        dotLabel(
          reqPxPos,
          "#2e7d32",
          `requested (${um(req[0].toFixed(1))}, ${um(
            req[1].toFixed(1),
          )})° · ${um(reqR.toFixed(2))}°`,
          true,
        ) +
        dotLabel(
          drawn,
          "#16344d",
          `actual (${um(act[0].toFixed(1))}, ${um(act[1].toFixed(1))})° · ${um(
            actR.toFixed(2),
          )}°`,
          false,
        );
    }
    // Tooltip rides beside the cursor, vertically centered on it (so it
    // never covers the ghost labels), flipping inside the plot edges.
    tooltip.innerHTML = html;
    tooltip.style.display = "block";
    const pr = plot.getBoundingClientRect();
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    const tw = tooltip.offsetWidth,
      th = tooltip.offsetHeight;
    const cx = e.clientX - pr.left,
      cy = e.clientY - pr.top;
    let tx = cx + 16;
    if (tx + tw > pr.width - 4) tx = cx - tw - 16;
    let ty = Math.min(Math.max(cy - th / 2, 2), pr.height - th - 2);
    tooltip.style.transform = `translate(${tx}px, ${ty}px)`;
  });
  svgEl.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
    svgEl.querySelector("#xp-glyphs").innerHTML = "";
  });
};

/* ---------------- Top-view geometry diagram ---------------- */
/* Tightly coupled: every point is computed by transformCore itself —
 * the drawn point via the BUGGY conversion, the "actual" angle via the
 * corrected one — so the diagram cannot drift from the code. */
/** The exact formulas the demos compute (fixation at screen center). */
const renderFormulas = () => {
  const st = xpState();
  // Same validity guard as the demos: freeze (keep last render) rather than
  // display a legend computed from degenerate dimensions.
  if (!(st.w > 0 && st.h > 0 && st.ppc > 0 && st.dist > 0)) return;
  const w = st.w,
    h = st.h,
    s = st.ppc,
    d = st.dist;
  const n = [st.eyeXPx, st.eyeYPx];
  const nBug = [n[0] + w / 2, h / 2 - n[1]];
  const req = Number(document.getElementById("xp-req").value);
  const S = (t) => `<span class="st" data-tip="${esc(t)}">`;
  const E = `</span>`;
  const fx = `
    <div class="fx"><span class="lbl">pixels &rarr; angle (radial):</span>
      ${S(
        "R: maps a pixel offset to the visual angle it subtends at the eye; preserves direction, rescales length",
      )}<i><b>R</b>(<b>u</b>)</i>${E} = <span class="frac"><span class="num">180</span><span class="den">&pi;</span></span> atan<span class="frac"><span class="num">&Vert;<b>u</b>&Vert;</span><span class="den">${S(
        "s = pixels per cm, d = viewing distance",
      )}<i>s&middot;d</i>${E}</span></span> &middot; <span class="frac"><span class="num"><b>u</b></span><span class="den">&Vert;<b>u</b>&Vert;</span></span>
    </div>
    <div class="fx"><span class="lbl">angle &rarr; pixels (its inverse):</span>
      ${S(
        "R⁻¹: the inverse map, angle → pixel offset — this is what places a stimulus on screen",
      )}<i><b>R</b><sup>&minus;1</sup>(<b>v</b>)</i>${E} = ${S(
        "s = pixels per cm, d = viewing distance",
      )}<i>s&middot;d</i>${E} tan<span class="frac"><span class="num">&pi;&Vert;<b>v</b>&Vert;</span><span class="den">180</span></span> &middot; <span class="frac"><span class="num"><b>v</b></span><span class="den">&Vert;<b>v</b>&Vert;</span></span>
    </div>
    <div class="fx fxline-bug"><span class="lbl">drawn on screen (assumed eye):</span>
      <b class="v">p</b> = ${S(
        "n_bug: the point the buggy code used as the nearest point — its projection's pivot",
      )}<b class="v">n<sub>bug</sub></b>${E} + <i><b>R</b><sup>&minus;1</sup></i>(&theta; &minus; <i><b>R</b></i>(<b class="v">n<sub>bug</sub></b>))
    </div>
    <div class="fx fxline-act"><span class="lbl">what you actually saw (true eye):</span>
      <b class="v">a</b> = <i><b>R</b></i>(<b class="v">p</b> &minus; ${S(
        "n: the true nearest point — the screen point closest to your eye",
      )}<b class="v">n</b>${E}) + <i><b>R</b></i>(<b class="v">n</b>)
    </div>
    <div class="fx"><span class="lbl">the bug, in full ${S(
      "The webcam tracker's top-left-origin coordinates were used verbatim in the center-origin frame.",
    )}(raw rc, unconverted)${E}:</span>
      <b class="v">n<sub>bug</sub></b> = ( n<sub>x</sub> + W/2 , &nbsp;H/2 &minus; n<sub>y</sub> )
    </div>
    <div class="fxwhere">
      <p class="conv">Where: screen positions are in pixels from screen center (x rightward, y upward); positions <span class="sym">&theta;</span> and <span class="sym">a</span> are in degrees of visual angle from the fixation mark; the offsets <span class="sym">u</span> and <span class="sym">v</span> are measured from the nearest point <span class="sym">n</span>; vectors are 2-component (x, y), and &Vert;<span class="sym">u</span>&Vert; is a vector&rsquo;s length; 180/&pi; converts radians to degrees.</p>
      <div class="fxdefs">
        <div class="fd"><span class="sym">s</span> — pixel density: pixels per cm (set by the Screen preset).</div>
        <div class="fd"><span class="sym">d</span> — viewing distance, eye to screen, in cm (&ldquo;Viewing distance&rdquo; control); <span class="sym">s</span>&middot;<span class="sym">d</span> is that distance in pixels.</div>
        <div class="fd"><span class="sym">W</span>, <span class="sym">H</span> — screen width and height in pixels (set by the Screen preset).</div>
        <div class="fd"><span class="sym">n</span> — the nearest point: the screen point closest to your eye, in pixels from center (&ldquo;True eye X/Y&rdquo; controls).</div>
        <div class="fd"><span class="sym">n<sub>x</sub></span>, <span class="sym">n<sub>y</sub></span> — n&rsquo;s horizontal and vertical components.</div>
        <div class="fd"><span class="sym">n<sub>bug</sub></span> — the point the buggy code used as the nearest point — its projection&rsquo;s pivot.</div>
        <div class="fd"><span class="sym">u</span> — a screen offset in pixels, measured from the nearest point.</div>
        <div class="fd"><span class="sym">v</span> — an angular offset in degrees, measured from the nearest point&rsquo;s direction.</div>
        <div class="fd"><span class="sym">R</span> — maps a pixel offset to the visual angle it subtends at the eye; preserves direction, rescales length (atan = arctangent).</div>
        <div class="fd"><span class="sym">R<sup>&minus;1</sup></span> — the inverse map, angle &rarr; pixel offset: what places a stimulus on screen.</div>
        <div class="fd"><span class="sym">&theta;</span> — the requested stimulus position, in degrees from fixation (&ldquo;requested position&rdquo; slider).</div>
        <div class="fd"><span class="sym">p</span> — the pixel position actually drawn, computed with the assumed eye (&ldquo;drawn … cm&rdquo; on the diagram).</div>
        <div class="fd"><span class="sym">a</span> — the drawn stimulus&rsquo;s actual position, in degrees from fixation, as seen from the true eye (&ldquo;actual …&deg;&rdquo; on the diagram).</div>
        <div class="fd"><span class="sym">rc</span> — the Remote Calibrator, our webcam tracker: coordinates from the screen&rsquo;s top-left, y downward.</div>
      </div>
      <p class="fxnote">In <span class="sym">R</span>(<span class="sym">n</span>) and <span class="sym">R</span>(<span class="sym">n<sub>bug</sub></span>) above, <span class="sym">R</span> receives a position rather than an offset: the offset from <span class="sym">n</span> to the central fixation is <span class="sym">&minus;n</span>, and <span class="sym">R</span> preserves direction, so <span class="sym">R(n) = &minus;R(&minus;n)</span> — the nearest point&rsquo;s own position in degrees from fixation.</p>
    </div>`;
  const host = document.getElementById("xp-formulas");
  if (host) host.innerHTML = `<div class="formulas">${fx}</div>`;
  const vhost = document.getElementById("xp-values");
  if (vhost)
    vhost.innerHTML = `<div class="fxvals">&theta; ${um(
      req,
    )}&deg;&nbsp;|&nbsp;s ${s} px/cm&nbsp;|&nbsp;d ${d} cm&nbsp;|&nbsp;W ${w} px&nbsp;|&nbsp;H ${h} px&nbsp;|&nbsp;n (${um(
      n[0],
    )}, ${um(n[1])}) px&nbsp;|&nbsp;n<sub>bug</sub> (${um(nBug[0])}, ${um(
      nBug[1],
    )}) px</div>`;
};

const renderDiagram = () => {
  const el = document.getElementById("xp-diagram");
  if (!el) return;
  const st = xpState();
  if (!(st.w > 0 && st.h > 0 && st.ppc > 0 && st.dist > 0)) return;
  const reqEl = document.getElementById("xp-req");
  const req = Number(reqEl.value);
  document.getElementById("xp-req-v").textContent = um(req);

  const trueEye = [st.eyeXPx, st.eyeYPx];
  // See the note in renderExplore: y mirrors (H/2 - trueY), x shifts (+W/2).
  const buggyEye = [st.eyeXPx + st.w / 2, st.h / 2 - st.eyeYPx];
  const base = {
    pxPerCm: st.ppc,
    viewingDistanceCm: st.dist,
    fixationXYPx: [0, 0],
  };
  // The conversions, exactly as the experiment ran them:
  const drawnPx = xyPxOfDegCore([req, 0], {
    ...base,
    nearestPointXYZPx: buggyEye,
  });
  const actualDeg = xyDegOfPxCore(drawnPx, {
    ...base,
    nearestPointXYZPx: trueEye,
  });

  // Top view in cm: x across the screen, z toward the viewer (screen at 0).
  const wCm = st.w / st.ppc;
  const eyeXCm = st.eyeXPx / st.ppc;
  const buggyEyeXCm = eyeXCm + wCm / 2;
  const drawnXCm = drawnPx[0] / st.ppc;
  const d = st.dist;

  // Equal cm scale on both axes, so the ray angles are honest; fit the box.
  const M = 30;
  const xMin = Math.min(-wCm / 2, eyeXCm, drawnXCm) - 6;
  const xMax = Math.max(wCm / 2, buggyEyeXCm, drawnXCm) + 6;
  // Box budget: as wide as fits beside the equations panel at its
  // single-line width, tall enough to fill the left column next to it.
  // The x-range is padded to a CONSTANT width so sliders never resize it.
  const WBUD = 368;
  const cmToPx = Math.min((WBUD - 2 * M) / (xMax - xMin), (500 - 70) / (d + 6));
  const W = WBUD;
  const mid = (xMin + xMax) / 2;
  const spanFill = (W - 2 * M) / cmToPx;
  const x0 = mid - spanFill / 2;
  const X = (x) => M + (x - x0) * cmToPx;
  const H = Math.round(70 + (d + 6) * cmToPx);
  const Z = (z) => 40 + z * cmToPx; // z=0 screen line; z=d eyes

  const screenLine = `<line x1="${X(-wCm / 2)}" y1="${Z(0)}" x2="${X(
    wCm / 2,
  )}" y2="${Z(0)}" stroke="#222" stroke-width="4"/>
    <text x="${X(wCm / 2)}" y="${
      Z(0) + 16
    }" font-size="10" fill="#444" text-anchor="end">screen (${wCm.toFixed(
      0,
    )} cm wide)</text>`;
  const fix = `<circle cx="${X(0)}" cy="${Z(
    0,
  )}" r="4" fill="#222"><title>fixation</title></circle>
    <text x="${X(0) + 6}" y="${
      Z(0) - 6
    }" font-size="10" fill="#222">fixation</text>`;
  // Rays
  const rays = [
    // buggy eye -> drawn point (amber): "requested" angle
    `<line x1="${X(buggyEyeXCm)}" y1="${Z(d)}" x2="${X(drawnXCm)}" y2="${Z(
      0,
    )}" stroke="#b26a00" stroke-width="2"/>`,
    // buggy eye -> fixation (its gaze reference, dashed amber)
    `<line x1="${X(buggyEyeXCm)}" y1="${Z(d)}" x2="${X(0)}" y2="${Z(
      0,
    )}" stroke="#b26a00" stroke-width="1" stroke-dasharray="4 3"/>`,
    // true eye -> drawn point (blue): actual angle
    `<line x1="${X(eyeXCm)}" y1="${Z(d)}" x2="${X(drawnXCm)}" y2="${Z(
      0,
    )}" stroke="#2b6cb0" stroke-width="2"/>`,
    // true eye -> fixation (its gaze reference, dashed blue)
    `<line x1="${X(eyeXCm)}" y1="${Z(d)}" x2="${X(0)}" y2="${Z(
      0,
    )}" stroke="#2b6cb0" stroke-width="1" stroke-dasharray="4 3"/>`,
  ].join("");
  const eyes = `
    <circle cx="${X(buggyEyeXCm)}" cy="${Z(d)}" r="5" fill="#b26a00"/>
    <text x="${X(buggyEyeXCm)}" y="${
      Z(d) + 18
    }" font-size="10" fill="#b26a00" text-anchor="middle">eye as the bug assumed</text>
    <circle cx="${X(eyeXCm)}" cy="${Z(d)}" r="5" fill="#2b6cb0"/>
    <text x="${X(eyeXCm)}" y="${
      Z(d) - 10
    }" font-size="10" fill="#2b6cb0" text-anchor="middle">your true eye</text>`;
  // Values annotated directly on the diagram.
  const midA = [(buggyEyeXCm + drawnXCm) / 2, d / 2]; // amber ray midpoint
  const midB = [(eyeXCm + drawnXCm) / 2, d / 2]; // blue ray midpoint
  const err =
    req !== 0
      ? ((Math.abs(actualDeg[0]) - Math.abs(req)) / Math.abs(req)) * 100
      : 0;
  const drawnPt = `<circle cx="${X(drawnXCm)}" cy="${Z(
    0,
  )}" r="4.5" fill="#b3261e"/>
    <text x="${X(drawnXCm) - 6}" y="${
      Z(0) - 8
    }" font-size="10" fill="#b3261e" text-anchor="end">drawn ${um(
      drawnXCm.toFixed(1),
    )} cm</text>
    <text x="${X(midA[0]) + 8}" y="${
      Z(midA[1]) + 4
    }" font-size="10" fill="#b26a00">requested ${um(req)}°</text>
    <text x="${X(midB[0]) - 8}" y="${
      Z(midB[1]) - 6
    }" font-size="10" fill="#2b6cb0">actual ${um(actualDeg[0].toFixed(2))}°${
      req ? ` (${pct(err)} farther)` : ""
    }</text>`;

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${screenLine}${fix}${rays}${eyes}${drawnPt}</svg>`;
};

const renderAll = () => {
  renderDiagram();
  renderExplore();
  renderFormulas();
};

["preset", "w", "h", "ppc", "grid", "ref"].forEach((k) =>
  xpEls[k].addEventListener("change", renderAll),
);
["dist", "ex", "ey"].forEach((k) =>
  xpEls[k].addEventListener("input", renderAll),
);
document.getElementById("xp-req").addEventListener("input", () => {
  renderDiagram();
  renderFormulas();
});
document.getElementById("xp-char").addEventListener("input", () => {
  xpGlyphMetric = null;
});
["size", "sizedim"].forEach((k) =>
  document.getElementById("xp-" + k).addEventListener("input", () => {
    document.getElementById("xp-size-v").textContent =
      document.getElementById("xp-size").value;
    renderExplore();
  }),
);
const setMode = (mode) => {
  xpMode = mode;
  document
    .getElementById("xp-mode-pos")
    .classList.toggle("on", mode === "placement");
  document
    .getElementById("xp-mode-size")
    .classList.toggle("on", mode === "size");
  document
    .getElementById("xp-sizeopts")
    .classList.toggle("show", mode === "size");
  renderExplore();
};
document
  .getElementById("xp-mode-pos")
  .addEventListener("click", () => setMode("placement"));
document
  .getElementById("xp-mode-size")
  .addEventListener("click", () => setMode("size"));
renderAll();
