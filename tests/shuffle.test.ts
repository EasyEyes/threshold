/**
 * Tests for block-order shuffling via blockShuffleGroups (components/shuffle.ts).
 *
 * Spec (glossary, blockShuffleGroups1):
 *   "Within each containing group ... EasyEyes counts the groups (from left to
 *    right) whose names don't start with underscore, creates a shuffled list of
 *    the numbers from 1 to n, where n is the total count, and then replaces the
 *    i-th group by the group whose index is i-th in the shuffled list."
 *   "Any group whose name begins with underscore '_' is pinned ... not shuffled."
 *   "Deeper groups are shuffled before shallower groups."
 *   "BLOCK NUMBER IS CONSERVED ... each block retains its original block number."
 *
 * Realism: the REAL glossary is loaded (via loadGlossaryForTests, cached on
 * disk), so GroupLevels() exercises the real isBlockShuffleGroupingParam filter
 * and sort over blockShuffleGroups1..6. `paramReader` is an in-memory stand-in
 * whose read() mirrors the real _getParam numeric-block contract (returns the
 * array of values for every condition in that block). Only two things are
 * mocked: `components/utils` (pulls in psychojs — not node-runnable) and the
 * `threshold` app entry (its `paramReader` singleton is read by getGroupLabels).
 *
 * Determinism: `shuffle` (utils.js, Fisher-Yates on Math.random) is mocked to
 * the IDENTITY permutation so output is exactly assertable. Note the impl
 * reassembles shuffled groups via Array.pop() (right-to-left), so with an
 * identity shuffle the observable block order is the REVERSE of the group
 * sequence. The exact-order expectations below reflect that; the contract
 * expectations (permutation, spy-called-with-groups, internal-order-preserved,
 * pinning, conservation) hold for any shuffle and are the primary guards.
 *
 * @jest-environment node
 */

import { loadGlossaryForTests } from "./helpers/glossary";

// --- mocks (hoisted) ---

// Deterministic stand-in for utils.js shuffle (Fisher-Yates on Math.random).
const mockShuffle = jest.fn(<T>(arr: T[]): T[] => [...arr]);

// One stable object used both as the `threshold.paramReader` singleton (read by
// getGroupLabels for group labels) and as the arg passed to getBlockOrder
// (which reads _experiment). Reconfigured per-test via useTable().
const mockRead = jest.fn();
const mockParamReader = {
  _experiment: [] as Array<Record<string, unknown>>,
  read: (...args: unknown[]) => mockRead(...(args as [string, number])),
};

jest.mock("../threshold", () => ({ paramReader: mockParamReader }));
jest.mock("../components/utils", () => ({
  shuffle: mockShuffle,
  logger: () => {},
  readTargetTask: () => "",
}));

import { getBlockOrder } from "../components/shuffle";

// --- helpers ---

type Row = {
  block: number;
  blockShuffleGroups1?: string;
  blockShuffleGroups2?: string;
};

/** Build _experiment + read() from an in-memory conditions table (1 cond/block).
 * Mirrors real ParamReader._getParam for the numeric-block case: returns the
 * array of param values across all conditions in that block. */
const useTable = (rows: Row[]) => {
  mockParamReader._experiment = rows;
  mockRead.mockImplementation((name: string, block: number) =>
    rows
      .filter((r) => Number(r.block) === block)
      .map((r) => r[name as keyof Row] ?? ""),
  );
};

/** Labels only (blockShuffleGroups1), 1..n blocks. Convenience for depth-1 cases. */
const labels1 = (labels: string[]) =>
  useTable(
    labels.map((label, i) => ({ block: i + 1, blockShuffleGroups1: label })),
  );

beforeAll(async () => {
  await loadGlossaryForTests(); // real glossary, cached on disk
});

beforeEach(() => {
  mockRead.mockReset();
  mockShuffle.mockClear();
});

// --- the reported table (single shared label = ONE group, n=1 → no-op) ---

describe("getBlockOrder — single shared label forms ONE group (no-op)", () => {
  it("all,all,all preserves order [1,2,3] (the CrowdingBeauty_Adjust report)", () => {
    labels1(["all", "all", "all"]);
    expect(getBlockOrder(mockParamReader)).toEqual([1, 2, 3]);
    // The three blocks collapse to a single group token passed to the shuffler.
    expect(mockShuffle).toHaveBeenCalledWith(["all"]);
  });

  it("A,A (two blocks, one group) also preserves order", () => {
    labels1(["A", "A"]);
    expect(getBlockOrder(mockParamReader)).toEqual([1, 2]);
    expect(mockShuffle).toHaveBeenCalledWith(["A"]);
  });
});

// --- correct usage: distinct labels → each block its own group → permuted ---

describe("getBlockOrder — distinct labels permute blocks as group units", () => {
  it("A,B,C passes three groups to the shuffler and reorders them", () => {
    labels1(["A", "B", "C"]);
    const order = getBlockOrder(mockParamReader);
    // Contract: a permutation of all blocks, and actually reordered.
    expect([...order].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(order).not.toEqual([1, 2, 3]);
    expect(mockShuffle).toHaveBeenCalledWith(["A", "B", "C"]);
    // identity shuffle + pop-from-end reassembly → reversed group order.
    expect(order).toEqual([3, 2, 1]);
  });
});

// --- pinning: _-prefixed groups are NOT shuffled ---

describe("getBlockOrder — pinned groups (_ prefix) are not shuffled", () => {
  it("_A is excluded from the shuffle and stays in place", () => {
    labels1(["_A", "B", "C"]);
    const order = getBlockOrder(mockParamReader);
    // Only the non-pinned groups are shuffled.
    expect(mockShuffle).toHaveBeenCalledWith(["B", "C"]);
    // Pinned block 1 stays at its position; B,C groups swapped → [1,3,2].
    expect(order).toEqual([1, 3, 2]);
  });

  it("all-pinned (_A,_B) shuffles nothing → order preserved", () => {
    labels1(["_A", "_B"]);
    expect(getBlockOrder(mockParamReader)).toEqual([1, 2]);
    expect(mockShuffle).toHaveBeenCalledWith([]); // no non-pinned groups
  });

  it("groups INSIDE a pinned group still shuffle within it", () => {
    // Spec: "Groups inside a pinned group still shuffle within it, as usual."
    useTable([
      { block: 1, blockShuffleGroups1: "_X", blockShuffleGroups2: "X1" },
      { block: 2, blockShuffleGroups1: "_X", blockShuffleGroups2: "X2" },
    ]);
    const order = getBlockOrder(mockParamReader);
    // Depth-1 group _X is pinned (not shuffled), but its depth-2 subgroups are.
    expect(mockShuffle).toHaveBeenCalledWith([]); // depth 1: nothing shuffleable
    expect(mockShuffle).toHaveBeenCalledWith(["X1", "X2"]); // depth 2 inside _X
    expect(order).toEqual([2, 1]); // internal reversal under identity shuffle
  });
});

// --- mixed grouped + ungrouped blocks ---

describe("getBlockOrder — ungrouped blocks stay in place; groups permute around them", () => {
  it('A,"",B,"" — blocks 2 and 4 keep their positions; groups A,B swap', () => {
    labels1(["A", "", "B", ""]);
    const order = getBlockOrder(mockParamReader);
    expect(mockShuffle).toHaveBeenCalledWith(["A", "B"]);
    // Group B (block 3) lands in A's slot, A (block 1) in B's; 2 and 4 fixed.
    expect(order).toEqual([3, 2, 1, 4]);
  });
});

// --- multi-block groups: internal order preserved, group moves as a unit ---

describe("getBlockOrder — a group of several blocks moves as one unit", () => {
  it("A,A,B,B → groups swap but each group's internal order is preserved", () => {
    labels1(["A", "A", "B", "B"]);
    const order = getBlockOrder(mockParamReader);
    expect(mockShuffle).toHaveBeenCalledWith(["A", "B"]);
    // Group B (3,4) moved ahead of group A (1,2); within each, order kept.
    expect(order).toEqual([3, 4, 1, 2]);
    // Within-group relative order is always preserved (1 before 2; 3 before 4).
    expect(order.indexOf(1)).toBeLessThan(order.indexOf(2));
    expect(order.indexOf(3)).toBeLessThan(order.indexOf(4));
  });
});

// --- block number conservation: sparse / non-1-based block numbers ---

describe("getBlockOrder — block numbers are conserved (never renumbered)", () => {
  it("blocks 1,3,5 remain 1,3,5 in the output (just permuted)", () => {
    useTable([
      { block: 1, blockShuffleGroups1: "A" },
      { block: 3, blockShuffleGroups1: "B" },
      { block: 5, blockShuffleGroups1: "C" },
    ]);
    const order = getBlockOrder(mockParamReader);
    expect([...order].sort((a, b) => a - b)).toEqual([1, 3, 5]); // same set, no gaps filled
    expect(order).toEqual([5, 3, 1]); // reversed under identity shuffle
  });
});

// --- depth nesting: blockShuffleGroups2 subsets shuffled before depth 1 ---

describe("getBlockOrder — depth-2 groups shuffle within depth-1 groups", () => {
  it("bsg1 X,X,Y,Y ; bsg2 X1,X2,_,_ → deeper shuffle first, then shallower", () => {
    useTable([
      { block: 1, blockShuffleGroups1: "X", blockShuffleGroups2: "X1" },
      { block: 2, blockShuffleGroups1: "X", blockShuffleGroups2: "X2" },
      { block: 3, blockShuffleGroups1: "Y", blockShuffleGroups2: "" },
      { block: 4, blockShuffleGroups1: "Y", blockShuffleGroups2: "" },
    ]);
    const order = getBlockOrder(mockParamReader);
    // Depth-1 groups [X,Y] shuffled; depth-2 groups [X1,X2] shuffled inside X.
    expect(mockShuffle).toHaveBeenCalledWith(["X", "Y"]);
    expect(mockShuffle).toHaveBeenCalledWith(["X1", "X2"]);
    // Y (3,4) has no depth-2 labels → internal order preserved. X (1,2) reversed.
    // identity shuffle + reversal: top groups → [Y,X]; within X → [2,1].
    expect(order).toEqual([3, 4, 2, 1]);
  });
});

// --- edge: single block ---

describe("getBlockOrder — single block", () => {
  it("one block returns [1] unchanged (base case, no shuffle)", () => {
    labels1(["A"]);
    expect(getBlockOrder(mockParamReader)).toEqual([1]);
    expect(mockShuffle).not.toHaveBeenCalled();
  });
});
