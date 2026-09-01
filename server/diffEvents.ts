/**
 * Event-stream diff (1f-LITE). Pure diff logic + a thin CLI.
 *
 * Two serialized streams (one event envelope per line, JSON) are compared
 * after stripping volatile fields (atMs). seq is the alignment authority:
 * envelope i of A is compared with envelope i of B. The FIRST divergence is
 * reported with field-level detail (one level into the payload, "e.*" paths);
 * length mismatches report the first extra envelope. Exit 0 = identical,
 * 1 = divergent, 2 = usage/IO error.
 */
import { readFileSync } from "fs";
import type { EventChannel } from "../components/eventStream/schema";

/** Envelope with an open payload shape (payload type varies by event). */
export interface EventEnvelope {
  v: number;
  seq: number;
  ch: EventChannel;
  atMs?: number;
  e: { type: string } & Record<string, unknown>;
}

export interface FieldDiff {
  field: string;
  a: unknown;
  b: unknown;
}

export interface Divergence {
  seq: number;
  channel: string;
  type: string;
  reason: "field" | "a-missing" | "b-missing";
  fieldDiffs?: FieldDiff[];
}

export interface DiffResult {
  equal: boolean;
  /** Number of leading envelopes that matched (volatile-stripped). */
  commonPrefix: number;
  totalA: number;
  totalB: number;
  divergence?: Divergence;
}

/** Fields that legitimately differ between runs; stripped before comparison. */
const VOLATILE_ENVELOPE_KEYS = new Set(["atMs"]);

export function parseStream(text: string): EventEnvelope[] {
  const out: EventEnvelope[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as EventEnvelope);
    } catch {
      throw new Error(`Malformed event line ${i + 1}: ${line.slice(0, 80)}`);
    }
  }
  return out;
}

export function serializeStream(events: EventEnvelope[]): string {
  return (
    events.map((e) => JSON.stringify(e)).join("\n") +
    (events.length ? "\n" : "")
  );
}

/** Envelope copy with volatile keys removed. Never mutates the input. */
function normalize(env: EventEnvelope): EventEnvelope {
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(env)) {
    if (!VOLATILE_ENVELOPE_KEYS.has(k)) copy[k] = v;
  }
  return copy as unknown as EventEnvelope;
}

/** Leaf-level diff of two values; objects recurse into dotted paths. */
function deepFieldDiffs(
  a: unknown,
  b: unknown,
  prefix: string,
  out: FieldDiff[],
): void {
  const isObj = (x: unknown): x is Record<string, unknown> =>
    typeof x === "object" && x !== null && !Array.isArray(x);
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys)
      deepFieldDiffs(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b))
    out.push({ field: prefix, a, b });
}

/** Field-level diff of two envelopes: top level + recursive into the payload. */
function fieldDiffs(a: EventEnvelope, b: EventEnvelope): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  deepFieldDiffs(normalize(a), normalize(b), "", diffs);
  // atMs is stripped by normalize; drop volatile subfields of the envelope.
  return diffs.filter((d) => !d.field.startsWith(".atMs"));
}

export function diffStreams(
  a: EventEnvelope[],
  b: EventEnvelope[],
): DiffResult {
  const totalA = a.length;
  const totalB = b.length;
  const common = Math.min(totalA, totalB);
  let prefix = 0;
  for (let i = 0; i < common; i++) {
    if (JSON.stringify(normalize(a[i])) !== JSON.stringify(normalize(b[i]))) {
      const diffs = fieldDiffs(a[i], b[i]);
      return {
        equal: false,
        commonPrefix: prefix,
        totalA,
        totalB,
        divergence: {
          seq: a[i].seq ?? i + 1,
          channel: String(a[i].ch ?? "?"),
          type: String(a[i].e?.type ?? "?"),
          reason: diffs.length ? "field" : "field",
          fieldDiffs: diffs.length
            ? diffs
            : [{ field: "(whole envelope)", a: a[i], b: b[i] }],
        },
      };
    }
    prefix = i + 1;
  }
  if (totalA !== totalB) {
    const longer = totalA > totalB ? a : b;
    const extra = longer[common];
    return {
      equal: false,
      commonPrefix: prefix,
      totalA,
      totalB,
      divergence: {
        seq: extra?.seq ?? common + 1,
        channel: String(extra?.ch ?? "?"),
        type: String(extra?.e?.type ?? "?"),
        reason: totalA > totalB ? "b-missing" : "a-missing",
      },
    };
  }
  return { equal: true, commonPrefix: prefix, totalA, totalB };
}

/** One-line summary of an envelope for divergence-context printing. */
export function envelopeSummary(env: EventEnvelope): string {
  return `#${env.seq} [${env.ch}] ${env.e?.type ?? "?"}`;
}

function printReport(pathA: string, pathB: string, r: DiffResult): void {
  console.log(`A: ${pathA} (${r.totalA} events)`);
  console.log(`B: ${pathB} (${r.totalB} events)`);
  if (r.equal) {
    console.log(
      `IDENTICAL (${r.commonPrefix} events, volatile fields stripped)`,
    );
    return;
  }
  console.log(`common prefix: ${r.commonPrefix} events`);
  const d = r.divergence!;
  console.log(
    `FIRST DIVERGENCE at seq ${d.seq} [${d.channel}] ${d.type} — ${d.reason}`,
  );
  for (const fd of d.fieldDiffs ?? []) {
    console.log(`  ${fd.field}:`);
    console.log(`    A: ${JSON.stringify(fd.a)}`);
    console.log(`    B: ${JSON.stringify(fd.b)}`);
  }
}

export function main(argv: string[]): number {
  const [pathA, pathB] = argv.filter((a) => !a.startsWith("-"));
  if (!pathA || !pathB) {
    console.error("usage: diff:events <a.jsonl> <b.jsonl>");
    return 2;
  }
  let a: EventEnvelope[];
  let b: EventEnvelope[];
  try {
    a = parseStream(readFileSync(pathA, "utf8"));
    b = parseStream(readFileSync(pathB, "utf8"));
  } catch (e) {
    console.error(String(e));
    return 2;
  }
  const r = diffStreams(a, b);
  printReport(pathA, pathB, r);
  return r.equal ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith("diffEvents.ts")) {
  process.exit(main(process.argv.slice(2)));
}
