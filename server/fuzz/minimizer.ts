/**
 * Delta-debugging minimizer for fuzz findings: shrink a table's rows while a
 * failing predicate keeps holding. The predicate (tier-specific) decides
 * whether a candidate still reproduces the SAME finding — rows that change
 * the failure mode are kept. The `block` row is structurally protected and
 * never removed; underscore globals are removable (the predicate rejects
 * candidates that stop failing).
 *
 * Predicate calls are capped (compile/simulate are expensive): when the cap
 * is hit, the best-so-far candidate is returned.
 */

export interface DdminOptions {
  maxCalls?: number;
}

const isProtected = (row: string[]) => (row[0] ?? "").trim() === "block";

export async function ddmin(
  rows: string[][],
  predicate: (candidate: string[][]) => Promise<boolean>,
  options: DdminOptions = {},
): Promise<{ rows: string[][]; calls: number }> {
  const maxCalls = options.maxCalls ?? 24;
  let current = rows.map((r) => [...r]);
  let calls = 0;

  const removableIndices = () =>
    current.map((r, i) => ({ r, i })).filter(({ r }) => !isProtected(r)).map(({ i }) => i);

  const tryWithout = async (indices: number[]): Promise<boolean> => {
    if (calls >= maxCalls) return false;
    const drop = new Set(indices);
    const candidate = current.filter((_, i) => !drop.has(i));
    calls++;
    if (await predicate(candidate)) {
      current = candidate;
      return true;
    }
    return false;
  };

  let granularity = 2;
  while (removableIndices().length > 0) {
    if (calls >= maxCalls) break;
    const indices = removableIndices();
    const chunk = Math.ceil(indices.length / granularity);
    let reduced = false;
    for (let start = 0; start < indices.length; start += chunk) {
      const subset = indices.slice(start, start + chunk);
      if (subset.length === 0) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await tryWithout(subset)) {
        reduced = true;
        break; // indices changed — recompute at same granularity
      }
      if (calls >= maxCalls) break;
    }
    if (!reduced) {
      // granularity == removable length means single-row removals already
      // failed at this pass — nothing left to try.
      if (granularity >= removableIndices().length) break;
      granularity = Math.min(granularity * 2, removableIndices().length);
    }
  }
  return { rows: current, calls };
}
