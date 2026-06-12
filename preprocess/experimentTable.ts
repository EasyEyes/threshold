import { getGlossary } from "../parameters/glossaryRegistry";
import type { GlossaryEntry } from "../../source/components/types";

type RawRow = readonly string[];

export class ExperimentTable {
  readonly params: readonly string[];
  readonly conditionCount: number;
  private readonly _rows: ReadonlyMap<string, RawRow>;
  private readonly _allRows: ReadonlyMap<string, readonly RawRow[]>;
  private readonly _glossary: ReadonlyMap<string, GlossaryEntry | undefined>;

  constructor(parsedData: readonly (readonly string[])[]) {
    const rows = new Map<string, RawRow>();
    const allRows = new Map<string, RawRow[]>();
    const order: string[] = [];
    for (const row of parsedData) {
      const name = row[0]?.trim();
      if (!name) continue;
      if (!rows.has(name)) order.push(name);
      rows.set(name, row);
      const a = allRows.get(name);
      allRows.set(name, a ? [...a, row] : [row]);
    }
    this._rows = rows;
    this._allRows = allRows;
    this.params = order;
    this.conditionCount = Math.max(
      0,
      Math.max(0, ...parsedData.map((r) => r.length)) - 2,
    );
    const g = new Map<string, GlossaryEntry | undefined>();
    const glossary = getGlossary();
    for (const p of order) g.set(p, glossary[p]);
    this._glossary = g;
  }

  isDuplicate(name: string): boolean {
    return (this._allRows.get(name)?.length ?? 0) > 1;
  }
  duplicatesOf(name: string): number {
    return this._allRows.get(name)?.length ?? 0;
  }
  allRawRows(name: string): readonly RawRow[] {
    return this._allRows.get(name) ?? [];
  }
  glossary(name: string): GlossaryEntry | undefined {
    return this._glossary.get(name) ?? getGlossary()[name];
  }
  colB(name: string): string {
    return this._rows.get(name)?.[1]?.trim() ?? "";
  }
  conditionValue(name: string, ci: number): string {
    return this._rows.get(name)?.[ci + 2]?.trim() ?? "";
  }

  conditionValues(name: string): string[] {
    const row = this._rows.get(name);
    if (!row) return new Array<string>(this.conditionCount).fill("");
    const vals = row.slice(2).map((s) => s.trim());
    while (vals.length < this.conditionCount) vals.push("");
    return vals;
  }

  effectiveValue(name: string, ci: number): string {
    const cond = this.conditionValue(name, ci);
    if (cond !== "") return cond;
    if (name.startsWith("_")) {
      const b = this.colB(name);
      if (b !== "") return b;
    }
    return (this.glossary(name)?.default as string) ?? "";
  }

  effectiveValues(name: string): string[] {
    return Array.from({ length: this.conditionCount }, (_, ci) =>
      this.effectiveValue(name, ci),
    );
  }

  blockLabels(): string[] {
    const counts = new Map<string, number>();
    const out: string[] = [];
    for (let ci = 0; ci < this.conditionCount; ci++) {
      const blk = this.effectiveValue("block", ci);
      const n = (counts.get(blk) ?? 0) + 1;
      counts.set(blk, n);
      out.push(`${blk}_${n}`);
    }
    return out;
  }

  blocks(): string[] {
    return Array.from({ length: this.conditionCount }, (_, ci) =>
      this.effectiveValue("block", ci),
    );
  }
  uniqueBlocks(): string[] {
    return [...new Set(this.blocks())].sort((a, b) => Number(a) - Number(b));
  }

  toParamValuesMap(): ReadonlyMap<string, readonly string[]> {
    const m = new Map<string, readonly string[]>();
    for (const name of this.params) m.set(name, this.effectiveValues(name));
    m.set("block_condition", this.blockLabels());
    return m;
  }

  colBBool(name: string): boolean {
    return this.colBOrDefault(name).toUpperCase() === "TRUE";
  }
  colBOrDefault(name: string): string {
    const v = this.colB(name);
    return v || ((this.glossary(name)?.default as string) ?? "");
  }

  /** Underscore param: inspect ALL raw instances' col B (duplicates included). */
  allColBValues(name: string): string[] {
    return this.allRawRows(name).map((r) => r[1]?.trim() ?? "");
  }
}
