/**
 * Append-only fuzz ledger. Crash-safe by construction: every record and
 * finding line is flushed with appendFileSync at write time, so a SIGINT (or
 * crash) mid-batch never loses history. State is re-folded from the JSONL
 * files on every load — nothing is cached in memory across processes.
 *
 * Files under the ledger dir (all gitignored, e.g. fuzz/):
 *   ledger.jsonl      one record per fuzzed table (params included → coverage
 *                     is recounted from this file on read)
 *   findings.jsonl    one line per finding occurrence (dedup by signature on
 *                     load; suppressed known-issues are recorded but not filed)
 *   known-issues.json optional [{pattern, note}] — case-insensitive substring
 *                     match against signatures; matching findings are recorded
 *                     with status "known" instead of "open"
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import type { GlossarySpec } from "./glossaryAdapter";

export interface LedgerRecord {
  ts: number;
  tier: "compiler" | "runtime";
  batch: string;
  table: string;
  genSeed: number;
  origin: string;
  outcome: string;
  glossaryVersion: string;
  params: string[];
  signature?: string;
}

export interface Finding {
  firstTs: number;
  batch: string;
  tier: string;
  kind: string;
  signature: string;
  glossaryVersion: string;
  tablePath: string;
  repro: string;
  status: "open" | "known";
  count: number;
}

export interface NewFinding {
  tier: string;
  kind: string;
  signature: string;
  glossaryVersion: string;
  tablePath: string;
  repro: string;
}

const LEDGER = "ledger.jsonl";
const FINDINGS = "findings.jsonl";
const KNOWN = "known-issues.json";

interface KnownIssue {
  pattern: string;
  note: string;
}

export class Ledger {
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private readJsonl(name: string): Record<string, unknown>[] {
    const p = join(this.dir, name);
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf-8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l));
  }

  appendRecord(rec: LedgerRecord): void {
    appendFileSync(join(this.dir, LEDGER), JSON.stringify(rec) + "\n");
  }

  /** Recount param coverage from ledger history. */
  loadCoverage(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const line of this.readJsonl(LEDGER)) {
      const params = Array.isArray(line.params) ? (line.params as string[]) : [];
      for (const p of params) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return counts;
  }

  private knownIssues(): KnownIssue[] {
    const p = join(this.dir, KNOWN);
    if (!existsSync(p)) return [];
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as KnownIssue[];
    } catch (err) {
      throw new Error(
        `fuzz/known-issues.json is not valid JSON (${(err as Error).message}) — fix or delete it; ` +
          `refusing to fuzz with suppression silently disabled.`,
      );
    }
  }

  isKnown(signature: string): boolean {
    const sig = signature.toLowerCase();
    return this.knownIssues().some((k) => sig.includes(k.pattern.toLowerCase()));
  }

  /** Fold findings.jsonl into current state (dedup by signature). */
  loadFindings(): Finding[] {
    const bySig = new Map<string, Finding>();
    for (const line of this.readJsonl(FINDINGS)) {
      const sig = String(line.signature);
      const existing = bySig.get(sig);
      if (existing) {
        existing.count++;
        continue;
      }
      bySig.set(sig, {
        firstTs: Number(line.ts ?? 0),
        batch: String(line.batch ?? ""),
        tier: String(line.tier),
        kind: String(line.kind),
        signature: sig,
        glossaryVersion: String(line.glossaryVersion ?? ""),
        tablePath: String(line.tablePath ?? ""),
        repro: String(line.repro ?? ""),
        // Re-triage at fold time: a pattern added AFTER the first occurrence
        // must flip an open finding to known (and stay known if removed
        // lines were suppressed at append time).
        status: line.suppressed || this.isKnown(sig) ? "known" : "open",
        count: 1,
      });
    }
    return [...bySig.values()];
  }

  /**
   * Record a finding occurrence. Returns whether this was a NEW open finding
   * (first occurrence, not suppressed by known-issues).
   */
  recordFinding(f: NewFinding, batch = ""): { filed: boolean; suppressed: boolean } {
    const suppressed = this.isKnown(f.signature);
    const already = this.loadFindings().some((x) => x.signature === f.signature);
    appendFileSync(
      join(this.dir, FINDINGS),
      JSON.stringify({ ...f, ts: Date.now(), batch, suppressed }) + "\n",
    );
    return { filed: !already && !suppressed, suppressed };
  }

  /** Human/agent report, hard-capped at 80 lines. */
  buildReport(spec: GlossarySpec, batchName?: string): string {
    const records = this.readJsonl(LEDGER);
    const findings = this.loadFindings();
    const batches = [...new Set(records.map((r) => String(r.batch)))];
    const lines: string[] = [];
    lines.push("# Fuzz report");
    lines.push(
      `batches: ${batches.length} (latest: ${batches.slice(-3).join(", ")}) | tables fuzzed: ${records.length}` +
        (batchName ? ` (this run: ${batchName})` : ""),
    );
    const open = findings.filter((f) => f.status === "open");
    const known = findings.filter((f) => f.status === "known");
    lines.push(`findings: ${open.length} open, ${known.length} known/suppressed`);
    if (open.length > 0) {
      lines.push("", "## Open findings");
      for (const f of open.slice(0, 10))
        lines.push(`- [${f.kind}] ×${f.count} ${f.signature.slice(0, 90)} → ${f.tablePath}`);
    }
    if (known.length > 0) {
      lines.push("", "## Known (suppressed)");
      for (const f of known.slice(0, 5)) lines.push(`- [${f.kind}] ×${f.count} ${f.signature.slice(0, 80)}`);
    }
    const coverage = this.loadCoverage();
    const unfuzzed = spec.params
      .map((p) => p.name)
      .filter((n) => !coverage.has(n))
      .sort()
      .slice(0, 12);
    const total = spec.params.length;
    const covered = total - spec.params.filter((p) => !coverage.has(p.name)).length;
    lines.push("", `## Coverage: ${covered}/${total} glossary params fuzzed`);
    if (unfuzzed.length > 0) lines.push(`never fuzzed: ${unfuzzed.join(", ")}`);
    return lines.slice(0, 80).join("\n");
  }
}
