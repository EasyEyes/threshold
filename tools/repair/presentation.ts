export const TRIAL_DEFINITIONS =
  "Eccentricity r is distance from fixation, in degrees. Log level = log₁₀[(spacing or size) / 1°].";
export const SCENARIO_DEFINITION =
  "A and B are consistent with the logged triplet width. The data do not identify which occurred.";

export interface RecoverySummary {
  corrected: number;
  ranged: number;
  discreteScenarios: number;
  continuousRanges: number;
}

export const recoveryGist = (summary: RecoverySummary) => {
  const count = summary.corrected + summary.ranged;
  const sentences = [];
  if (summary.corrected && summary.ranged > 0)
    sentences.push(
      `${summary.corrected} trials have exact recovered geometry.`,
    );
  if (summary.discreteScenarios)
    sentences.push(
      `${summary.discreteScenarios} trials have two fixation candidates consistent with the logged triplet width.`,
    );
  if (summary.continuousRanges)
    sentences.push(
      `${summary.continuousRanges} trials have approximate continuous ranges.`,
    );
  const other =
    summary.ranged - summary.discreteScenarios - summary.continuousRanges;
  if (other > 0)
    sentences.push(`${other} trials have ranged recovered geometry.`);
  return {
    count,
    heading:
      summary.ranged === 0
        ? "trials with exact recovered geometry"
        : summary.corrected === 0
        ? "trials with candidates or ranges"
        : "trials with repair output",
    sentences,
  };
};

export type ThresholdQuantity =
  | "eccentricity"
  | "size"
  | "spacing"
  | "flanker spacing"
  | "size or spacing";

export const thresholdQuantity = (
  parameters: string[],
  statuses?: string[],
): Exclude<ThresholdQuantity, "eccentricity"> => {
  const unique = [
    ...new Set(
      parameters.filter(
        (parameter, i) =>
          parameter &&
          (!statuses || ["CORRECTED", "RANGED"].includes(statuses[i])),
      ),
    ),
  ];
  if (unique.length !== 1) return "size or spacing";
  if (unique[0] === "spacingDeg") return "spacing";
  if (unique[0] === "targetSizeDeg") return "size";
  if (unique[0] === "flankerSpacingDeg") return "flanker spacing";
  return "size or spacing";
};

export const changeSentence = (
  value: number,
  quantity: ThresholdQuantity,
  midpoint: boolean,
): string => {
  const subject = `${midpoint ? "midpoint" : "recovered"} ${quantity}`;
  const magnitude = Math.abs(value).toFixed(1);
  if (value === 0) return `The median change in ${subject} is ${magnitude}%.`;
  return `The median ${
    value > 0 ? "increase" : "decrease"
  } in ${subject}, relative to the requested value, is ${magnitude}%.`;
};

export const filePickerAccept = ".csv,.zip";

export type TrialFilter = "output" | "review" | "all";

export const trialMatchesFilter = (
  status: string,
  filter: TrialFilter,
): boolean => {
  if (filter === "all") return true;
  if (filter === "review") return status === "FLAGGED";
  return status === "CORRECTED" || status === "RANGED";
};

export type PlotPoint = (number | undefined)[];

export const hasFiniteInterval = (point: PlotPoint): boolean =>
  Number.isFinite(point[2]) && Number.isFinite(point[3]);

export const plotMaximum = (points: PlotPoint[]): number => {
  const values = points
    .flatMap((point) => point.slice(0, 4))
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
  const max = Math.max(...values);
  return Number.isFinite(max) && max > 0 ? max * 1.1 : 1;
};

export interface ArchiveFileSummary {
  label: string;
  eccentricity: number;
  spacing: number;
  uncertainty: number;
  quantity: Exclude<ThresholdQuantity, "eccentricity">;
  mode: "midpoint" | "exact";
}

const finite = (values: number[]): number[] =>
  values.filter((value) => Number.isFinite(value));
const median = (values: number[]): number | undefined => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const summarizeArchive = (files: ArchiveFileSummary[]) => ({
  fileCount: files.length,
  eccentricityMedian: median(finite(files.map((file) => file.eccentricity))),
  spacingMedian: median(finite(files.map((file) => file.spacing))),
  uncertaintyMedian: median(finite(files.map((file) => file.uncertainty))),
  quantity:
    new Set(files.map((file) => file.quantity)).size === 1 && files.length
      ? files[0].quantity
      : "size or spacing",
});

const xml = (value: unknown): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const signed = (value: number, digits = 1): string =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}%`;

export const distributionPlotSvg = (
  files: ArchiveFileSummary[],
  field: "eccentricity" | "spacing",
  label: string,
): string => {
  const points = files.filter((file) => Number.isFinite(file[field]));
  if (!points.length) return "";
  const values = points.map((file) => file[field]);
  const center = median(values)!;
  const low = Math.min(...values, 0);
  const high = Math.max(...values, 0);
  const span = high - low || Math.max(1, Math.abs(high) * 0.2);
  const minimum = low - span * 0.08;
  const maximum = high + span * 0.08;
  const W = 520,
    H = 155,
    LEFT = 38,
    RIGHT = 16,
    BASE = 116;
  const X = (value: number) =>
    LEFT + ((value - minimum) / (maximum - minimum)) * (W - LEFT - RIGHT);
  const ticks = [minimum, (minimum + maximum) / 2, maximum]
    .map(
      (value) =>
        `<line x1="${X(value)}" y1="${BASE}" x2="${X(value)}" y2="${
          BASE + 5
        }" stroke="#8b9499"/><text x="${X(value)}" y="${
          BASE + 20
        }" text-anchor="middle" font-size="10" fill="#555">${value.toFixed(
          1,
        )}%</text>`,
    )
    .join("");
  const dots = points
    .map(
      (file, i) =>
        `<circle cx="${X(file[field])}" cy="${43 + (i % 3) * 18}" r="5" fill="${
          file.mode === "midpoint" ? "#365a77" : "#b26a00"
        }" fill-opacity="0.82"><title>${xml(file.label)}: ${signed(
          file[field],
        )}</title></circle>`,
    )
    .join("");
  const zero =
    minimum < 0 && maximum > 0
      ? `<line x1="${X(0)}" y1="25" x2="${X(
          0,
        )}" y2="${BASE}" stroke="#aab2b7" stroke-dasharray="3 3"/>${
          Math.abs((minimum + maximum) / 2) > (maximum - minimum) * 0.06
            ? `<text x="${X(0)}" y="${
                BASE + 20
              }" text-anchor="middle" font-size="10" fill="#555">0%</text>`
            : ""
        }`
      : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="distribution-plot" role="img" aria-label="Distribution of per-file median ${xml(
    label,
  )} change">
    <line x1="${LEFT}" y1="${BASE}" x2="${
      W - RIGHT
    }" y2="${BASE}" stroke="#aab2b7"/>
    ${ticks}${zero}
    <line x1="${X(center)}" y1="25" x2="${X(
      center,
    )}" y2="${BASE}" stroke="#0b6e4f" stroke-width="2"/>
    <text x="${Math.max(
      65,
      Math.min(W - 65, X(center)),
    )}" y="17" text-anchor="middle" font-size="12" font-weight="600" fill="#0b6e4f">Median: ${signed(
      center,
    )}</text>
    ${dots}
    <text x="${
      W / 2
    }" y="151" text-anchor="middle" font-size="11" fill="#444">Per-file median ${xml(
      label,
    )} change (%)</text>
  </svg>`;
};

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
  label: string;
}

export const paginate = <T>(
  items: T[],
  requestedPage: number,
  pageSize = 50,
): Page<T> => {
  const size = Math.max(1, Math.trunc(pageSize) || 1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const requested = Number.isFinite(requestedPage)
    ? Math.trunc(requestedPage)
    : 0;
  const page = Math.min(pageCount - 1, Math.max(0, requested));
  const start = page * size;
  const end = Math.min(start + size, total);
  return {
    items: items.slice(start, end),
    page,
    pageCount,
    start,
    end,
    total,
    label: total ? `${start + 1}–${end} of ${total}` : "0 of 0",
  };
};
