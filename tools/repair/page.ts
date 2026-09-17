// @ts-nocheck
/**
 * Browser entry for the EasyEyes results-repair page (easyeyes.app/repair).
 * Self-contained: parses dropped results CSVs, runs the repair engine
 * locally (nothing is uploaded), renders per-file verdicts with
 * show-your-work tooltips, and offers imputed CSVs + a report download.
 */
import {
  parseCsv,
  repairCsv,
  summarizeMagnitudes,
  toRepairedCsv,
} from "./engine.ts";
import {
  xyDegOfPxCore,
  xyPxOfDegCore,
} from "../../components/multiple-displays/transformCore.ts";

const fmt = (v, digits = 1) =>
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

/** Assemble a show-your-work tooltip for one row. */
const rowTooltip = (o, parsedRow, header) => {
  const lines = [];
  const cell = (name) => {
    const i = header.indexOf(name);
    return i >= 0 ? parsedRow[i] : "";
  };
  if (o.status === "CORRECTED") {
    if (o.nearestUsedXY && o.nearestCorrectXY)
      lines.push(
        `eye used (${fmt(o.nearestUsedXY[0], 0)}, ${fmt(
          o.nearestUsedXY[1],
          0,
        )}) px; true (${fmt(o.nearestCorrectXY[0], 0)}, ${fmt(
          o.nearestCorrectXY[1],
          0,
        )}) px`,
      );
    if (o.actualTargetEccentricityXDeg !== undefined) {
      lines.push(
        `position asked (${cell("targetEccentricityXDeg")}, ${cell(
          "targetEccentricityYDeg",
        )})° → drew (${o.columns.drawnTargetXYPx}) px = truly (${fmt(
          o.actualTargetEccentricityXDeg,
          2,
        )}, ${fmt(o.actualTargetEccentricityYDeg, 2)})°`,
      );
      if (o.columns.correctedTargetXYPx)
        lines.push(`to place as asked: (${o.columns.correctedTargetXYPx}) px`);
    }
    if (o.actualLevelLog10Deg !== undefined)
      lines.push(
        `size/spacing asked ${fmt(
          Math.pow(10, Number(cell("level"))),
          2,
        )}° → showed ${fmt(Math.pow(10, o.actualLevelLog10Deg), 2)}°`,
      );
  }
  lines.push(o.statusReason);
  return lines.join("\n");
};

const STATUS_LABEL = {
  CORRECTED: ["corrected", "st-corrected"],
  UNAFFECTED: ["unaffected", "st-unaffected"],
  FLAGGED: ["flagged", "st-flagged"],
};

/** Which original parameter each appended actual* column corrects. */
const PARAM_OF = {
  actualTargetEccentricityXDeg: "targetEccentricityXDeg",
  actualTargetEccentricityYDeg: "targetEccentricityYDeg",
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
  return [...cols];
};

/** "original → actually shown" cell: muted original, green actual. */
const diff = (orig, act) =>
  act === undefined || act === ""
    ? `<span class="ov">${esc(orig)}</span>`
    : `<span class="ov">${esc(
        orig,
      )}</span><span class="arw">→</span><span class="nv">${esc(act)}</span>`;

const renderRow = (o, parsedRow, header, idx) => {
  const cell = (name) => {
    const i = header.indexOf(name);
    return i >= 0 ? parsedRow[i] : "";
  };
  const [label, cls] = STATUS_LABEL[o.status];
  const tip = rowTooltip(o, parsedRow, header);
  const eccReq =
    cell("targetEccentricityXDeg") !== ""
      ? `(${cell("targetEccentricityXDeg")}, ${cell(
          "targetEccentricityYDeg",
        )})°`
      : "";
  const eccAct =
    o.actualTargetEccentricityXDeg !== undefined
      ? `(${fmt(o.actualTargetEccentricityXDeg, 2)}, ${fmt(
          o.actualTargetEccentricityYDeg,
          2,
        )})°`
      : undefined;
  const lvlReq =
    cell("level") !== "" && Number.isFinite(Number(cell("level")))
      ? fmt(Number(cell("level")), 3)
      : cell("level");
  const lvlAct =
    o.actualLevelLog10Deg !== undefined
      ? fmt(o.actualLevelLog10Deg, 3)
      : undefined;
  const rectReq = cell("screenBoundingRectDeg");
  const rectAct = o.columns.screenBoundingRectDegCorrected;
  const chips = changedColsOf(o)
    .map((c) => `<span class="pchip">${esc(c)}</span>`)
    .join("");
  const reason =
    o.status === "FLAGGED" || o.status === "UNAFFECTED"
      ? `<td class="reason">${esc(o.statusReason)}</td>`
      : `<td class="reason"></td>`;
  const anyDiff = eccAct !== undefined || lvlAct !== undefined;
  return `<tr data-st="${o.status}" class="${
    anyDiff ? "r-diff" : ""
  }" data-tip="${esc(tip)}">
    <td>${idx + 1}</td>
    <td>${pill(cls, label, tip)}</td>
    <td class="${eccAct !== undefined ? "diff" : ""}">${diff(
      eccReq,
      eccAct,
    )}</td>
    <td class="${lvlAct !== undefined ? "diff" : ""}">${diff(
      lvlReq,
      lvlAct,
    )}</td>
    <td class="rect ${rectAct ? "diff" : ""}">${diff(rectReq, rectAct)}</td>
    <td class="chipscell">${chips}</td>
    ${reason}
  </tr>`;
};

/** Inline-SVG scatter: requested (x) vs actual (y), with identity line. */
const scatterPlot = (pts, xLabel, yLabel) => {
  if (!pts.length) return "";
  const W = 300,
    H = 220,
    PAD = 34;
  const xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]);
  const max = Math.max(...xs, ...ys) * 1.1 || 1;
  const X = (v) => PAD + (v / max) * (W - PAD - 8);
  const Y = (v) => H - PAD + 8 - (v / max) * (H - PAD - 8);
  const dots = pts
    .map(
      (p) =>
        `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(
          1,
        )}" r="3.5" fill="#b26a00" fill-opacity="0.85"><title>asked ${p[0].toFixed(
          2,
        )}°, actually showed ${p[1].toFixed(2)}° (${pct(
          ((p[1] - p[0]) / p[0]) * 100,
        )})</title></circle>`,
    )
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
  return `<svg width="${W}" height="${H}" class="plot" role="img">
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(max)}" y2="${Y(
      max,
    )}" stroke="#2e7d32" stroke-dasharray="4 3"/>
    <text x="${X(max * 0.82)}" y="${
      Y(max * 0.82) - 6
    }" font-size="9" fill="#2e7d32">no error</text>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(max)}" y2="${Y(0)}" stroke="#bbb"/>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(max)}" stroke="#bbb"/>
    ${ticks}${dots}
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

const processFile = (file) => {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    let result;
    try {
      result = repairCsv(text);
    } catch (e) {
      results.insertAdjacentHTML(
        "beforeend",
        `<div class="card"><div class="fname">${esc(file.name)}</div>
         <div class="wrong st-flagged-bg">Could not parse: ${esc(
           e.message,
         )}</div></div>`,
      );
      return;
    }
    const { header, rows } = parseCsv(text);
    const s = result.summary;
    const m = summarizeMagnitudes(text, result);

    const chips = [
      s.corrected
        ? pill(
            "st-corrected",
            `${s.corrected} corrected`,
            "These trials were recorded with the warped conversion. The imputed CSV replaces the requested values with what was truly shown.",
          )
        : "",
      s.unaffected
        ? pill(
            "st-unaffected",
            `${s.unaffected} unaffected`,
            "These trials were not affected by the bug (e.g. eye at screen center, untracked session, or recorded after the fix).",
          )
        : "",
      s.flagged
        ? pill(
            "st-flagged",
            `${s.flagged} flagged`,
            "The tool cannot prove what was shown on these rows — nothing was changed; see reasons in the row details.",
          )
        : "",
    ].join(" ");

    let wrong = "";
    if (m.correctedTrials > 0) {
      const parts = [];
      if (m.eccentricityErrPct)
        parts.push(
          `position off by median ${fmt(
            Math.abs(m.eccentricityErrPct[0]),
          )}% (max ${fmt(m.eccentricityErrPct[1])}%)`,
        );
      if (m.sizeSpacingInflationPct)
        parts.push(
          `size/spacing off by median ${fmt(
            Math.abs(m.sizeSpacingInflationPct[0]),
          )}% (max ${fmt(m.sizeSpacingInflationPct[1])}%)`,
        );
      wrong = `<div class="wrong st-corrected-bg">On the ${
        m.correctedTrials
      } corrected trial${
        m.correctedTrials > 1 ? "s" : ""
      }, what was shown differed from what was requested: ${parts.join(
        "; ",
      )}.</div>`;
    }

    const MAX_ROWS = 400;
    // Default the filter ON for mixed files so corrections stand out.
    const affected = s.corrected + s.flagged;
    const filterOn = affected > 0 && affected < s.total;
    const tableRows = result.rows
      .map((o, i) => renderRow(o, rows[i], header, i))
      .map((tr) =>
        filterOn && tr.includes('data-st="UNAFFECTED"')
          ? tr.replace("<tr ", '<tr class="r-hidden" ')
          : tr,
      )
      .slice(0, MAX_ROWS)
      .join("");
    // Per-file counts of each corrected parameter (by original column).
    const pCounts = new Map();
    result.rows.forEach((o) => {
      if (o.status !== "CORRECTED") return;
      for (const c of changedColsOf(o))
        pCounts.set(c, (pCounts.get(c) || 0) + 1);
    });
    const pstrip = pCounts.size
      ? `<div class="pstrip"><b>Corrected parameters:</b> ${[...pCounts]
          .map(
            ([c, n]) => `<span class="pchip big">${esc(c)} <b>×${n}</b></span>`,
          )
          .join(
            "",
          )}<span class="hint">Corrected values are imputed into these original columns, so your existing analysis works unchanged; the added <code>repairImputedColumns</code> column lists what changed on each row. Your source file is untouched.</span></div>`
      : "";
    const table = `<div class="rowswrap">
      <div class="rowscap">Row-by-row details — ${
        s.total
      } rows; hover for derivations</div>
      <label class="rowtoggle"><input type="checkbox" ${
        filterOn ? "checked" : ""
      }/> show only affected rows (corrected + flagged)</label>
      <table><thead><tr>
        <th>#</th><th>status</th>
        <th title="requested (muted) → actually shown (green), in degrees">target position</th>
        <th title="requested (muted) → actually shown (green), log10 degrees">level</th>
        <th title="as logged (muted) → corrected (green), degrees">bounding rect</th>
        <th title="parameters this row carries corrections for">corrected</th>
        <th>reason</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      ${
        s.total > MAX_ROWS
          ? `<div class="note">Showing first ${MAX_ROWS} rows.</div>`
          : ""
      }
      </div>`;

    // Requested-vs-actual plots over corrected trials (exact per session).
    const iX = header.indexOf("targetEccentricityXDeg");
    const iY = header.indexOf("targetEccentricityYDeg");
    const iL = header.indexOf("level");
    const eccPts = [],
      lvlPts = [];
    result.rows.forEach((o, i) => {
      if (o.status !== "CORRECTED") return;
      if (iX >= 0 && o.actualTargetEccentricityXDeg !== undefined) {
        const req = Math.hypot(Number(rows[i][iX]), Number(rows[i][iY]));
        const act = Math.hypot(
          o.actualTargetEccentricityXDeg,
          o.actualTargetEccentricityYDeg ?? 0,
        );
        if (req > 0 && Number.isFinite(req)) eccPts.push([req, act]);
      }
      if (iL >= 0 && o.actualLevelLog10Deg !== undefined) {
        const req = Math.pow(10, Number(rows[i][iL]));
        if (req > 0 && Number.isFinite(req))
          lvlPts.push([req, Math.pow(10, o.actualLevelLog10Deg)]);
      }
    });
    const plots =
      eccPts.length || lvlPts.length
        ? `<div class="plots">${scatterPlot(
            eccPts,
            "requested eccentricity (°)",
            "actual (°)",
          )}${scatterPlot(
            lvlPts,
            "requested size/spacing (°)",
            "actual (°)",
          )}</div>`
        : "";

    const outName = file.name.replace(/\.csv$/i, "") + "-imputed.csv";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="fhead"><span class="fname">${esc(file.name)}</span>
        <button class="dl" title="Requested values in the original columns are replaced with what was actually shown; the repairImputedColumns column lists the altered cells; your source file is untouched">⬇ imputed CSV</button></div>
      <div class="chips">${chips}</div>
      ${wrong}
      ${pstrip}
      ${plots}
      ${table}`;
    card
      .querySelector(".dl")
      .addEventListener("click", () =>
        download(outName, toRepairedCsv(text, result)),
      );
    card.querySelector(".rowtoggle input").addEventListener("change", (e) => {
      card.querySelectorAll("tr[data-st]").forEach((tr) => {
        if (tr.getAttribute("data-st") === "UNAFFECTED")
          tr.classList.toggle("r-hidden", e.target.checked);
      });
    });
    results.appendChild(card);

    reportLines.push(
      `${file.name}: ${s.corrected} corrected / ${s.unaffected} unaffected / ${s.flagged} flagged (${s.total} rows)`,
    );
    if (wrong)
      reportLines.push(
        `  shown-vs-requested: ${
          m.eccentricityErrPct
            ? `position median ${fmt(
                Math.abs(m.eccentricityErrPct[0]),
              )}% max ${fmt(m.eccentricityErrPct[1])}%; `
            : ""
        }${
          m.sizeSpacingInflationPct
            ? `size/spacing median ${fmt(
                Math.abs(m.sizeSpacingInflationPct[0]),
              )}% max ${fmt(m.sizeSpacingInflationPct[1])}%`
            : ""
        }`,
      );
    const flagReasons = {};
    result.rows.forEach((o) => {
      if (o.status === "FLAGGED")
        flagReasons[o.statusReason] = (flagReasons[o.statusReason] || 0) + 1;
    });
    Object.entries(flagReasons).forEach(([r, n]) =>
      reportLines.push(`  FLAG ${n}x: ${r}`),
    );

    document.getElementById("reportBtn").style.display = "inline-block";
  };
  reader.readAsText(file);
};

const drop = document.getElementById("drop");
const input = document.getElementById("file");
drop.addEventListener("click", () => input.click());
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  [...e.dataTransfer.files].forEach(processFile);
});
input.addEventListener("change", () => [...input.files].forEach(processFile));
document
  .getElementById("reportBtn")
  .addEventListener("click", () =>
    download(
      "repair-report.txt",
      "EasyEyes results repair report\n" +
        new Date().toISOString() +
        "\n\n" +
        reportLines.join("\n") +
        "\n",
    ),
  );

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

/** Diverging color around 1.0: blue < 1 (shown closer), orange > 1. */
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
  document.getElementById("xp-ex-v").textContent = (st.eyeXPx / st.ppc).toFixed(
    1,
  );
  document.getElementById("xp-ey-v").textContent = (st.eyeYPx / st.ppc).toFixed(
    1,
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
          )}" y="11" font-size="9" fill="#1e6b2f" text-anchor="middle" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${c}°</text>`,
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
          )}" font-size="9" fill="#1e6b2f" style="paint-order:stroke;stroke:#fff;stroke-width:2.5">${c}°</text>`,
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
      ? `<span class="sw" style="background:#1a5ac8"></span> shown smaller than requested &nbsp;·&nbsp; white: no error &nbsp;·&nbsp; <span class="sw" style="background:#d44e00"></span> shown larger than requested`
      : `<span class="sw" style="background:#1a5ac8"></span> shown closer than requested &nbsp;·&nbsp; white: no error &nbsp;·&nbsp; <span class="sw" style="background:#d44e00"></span> shown farther than requested`;

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
        glyph(actCenter, actPx, "#16344d", `actual ${actualSize.toFixed(2)}°`);
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
          `requested (${req[0].toFixed(1)}, ${req[1].toFixed(
            1,
          )})° · ${reqR.toFixed(2)}°`,
          true,
        ) +
        dotLabel(
          drawn,
          "#16344d",
          `actual (${act[0].toFixed(1)}, ${act[1].toFixed(
            1,
          )})° · ${actR.toFixed(2)}°`,
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
  const S = (t) => `<span class="st" data-tip="${esc(t)}">`;
  const E = `</span>`;
  const fx = `
    <div class="fx"><span class="lbl">pixels &rarr; angle (radial):</span>
      ${S(
        "R: radial projection of a screen-space px offset to the visual angle it subtends at the eye",
      )}<i><b>R</b>(<b>u</b>)</i>${E} = <span class="frac"><span class="num">180</span><span class="den">&pi;</span></span> atan<span class="frac"><span class="num">&Vert;<b>u</b>&Vert;</span><span class="den">${S(
        "s = pixels per cm, d = viewing distance",
      )}<i>s&middot;d</i>${E}</span></span> &middot; <span class="frac"><span class="num"><b>u</b></span><span class="den">&Vert;<b>u</b>&Vert;</span></span>
    </div>
    <div class="fx"><span class="lbl">angle &rarr; pixels (its inverse):</span>
      ${S(
        "R⁻¹: places a point that subtends a given angle — this is what draws a stimulus",
      )}<i><b>R</b><sup>&minus;1</sup>(<b>v</b>)</i>${E} = ${S(
        "s = pixels per cm, d = viewing distance",
      )}<i>s&middot;d</i>${E} tan<span class="frac"><span class="num">&pi;&Vert;<b>v</b>&Vert;</span><span class="den">180</span></span> &middot; <span class="frac"><span class="num"><b>v</b></span><span class="den">&Vert;<b>v</b>&Vert;</span></span>
    </div>
    <div class="fx fxline-bug"><span class="lbl">drawn on screen (buggy eye):</span>
      <b class="v">p</b> = ${S(
        "n_bug: the assumed nearest point",
      )}<b class="v">n<sub>bug</sub></b>${E} + <i><b>R</b><sup>&minus;1</sup></i>(&theta; &minus; <i><b>R</b></i>(<b class="v">n<sub>bug</sub></b>))
    </div>
    <div class="fx fxline-act"><span class="lbl">what you actually saw (true eye):</span>
      <b class="v">a</b> = <i><b>R</b></i>(<b class="v">p</b> &minus; ${S(
        "n: the true nearest point",
      )}<b class="v">n</b>${E}) + <i><b>R</b></i>(<b class="v">n</b>)
    </div>
    <div class="fx"><span class="lbl">the bug, in full ${S(
      "The webcam tracker's top-left-origin coordinates were used verbatim in the center-origin frame.",
    )}(raw rc, unconverted)${E}:</span>
      <b class="v">n<sub>bug</sub></b> = ( n<sub>x</sub> + W/2 , &nbsp;H/2 &minus; n<sub>y</sub> )
    </div>
    <div class="fxvals">s ${s} px/cm&nbsp;|&nbsp;d ${d} cm&nbsp;|&nbsp;n (${
      n[0]
    }, ${n[1]}) px&nbsp;|&nbsp;n<sub>bug</sub> (${nBug[0]}, ${
      nBug[1]
    }) px</div>`;
  const host = document.getElementById("xp-formulas");
  if (host) host.innerHTML = `<div class="formulas">${fx}</div>`;
};

const renderDiagram = () => {
  const el = document.getElementById("xp-diagram");
  if (!el) return;
  const st = xpState();
  if (!(st.w > 0 && st.h > 0 && st.ppc > 0 && st.dist > 0)) return;
  const reqEl = document.getElementById("xp-req");
  const req = Number(reqEl.value);
  document.getElementById("xp-req-v").textContent = req;

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
  // Fit a generous box: ~350 wide, ~420 tall + slider row ≈ the formulas
  // stack height (fills the space, bottoms stay aligned). The x-range is
  // padded to a CONSTANT width so sliders never resize the diagram.
  const WBUD = 352;
  const cmToPx = Math.min((WBUD - 2 * M) / (xMax - xMin), (420 - 70) / (d + 6));
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
    }" font-size="10" fill="#2b6cb0" text-anchor="middle">your actual eye</text>`;
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
    }" font-size="10" fill="#b3261e" text-anchor="end">drawn ${drawnXCm.toFixed(
      1,
    )} cm</text>
    <text x="${X(midA[0]) + 8}" y="${
      Z(midA[1]) + 4
    }" font-size="10" fill="#b26a00">requested ${req}°</text>
    <text x="${X(midB[0]) - 8}" y="${
      Z(midB[1]) - 6
    }" font-size="10" fill="#2b6cb0">actual ${actualDeg[0].toFixed(2)}°${
      req ? ` (${pct(err)})` : ""
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
document.getElementById("xp-req").addEventListener("input", renderDiagram);
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
