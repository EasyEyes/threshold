// The simulator's iteration budget must account for MULTI-BLOCK experiments:
// the page reports `trialTotal` per BLOCK (e.g. 35), so a 31-block table
// exhausts `trialsTotal*5+100` iterations mid-experiment and the run ends
// "incomplete" with no error and no stuck warning (observed: Compare3Languages
// died at block 11, trial 16, 77 s in). The budget must grow with the
// experiment-wide progress: completed trials + current block's total.
import { iterationBudget } from "../../../server/simulate";

describe("iterationBudget", () => {
  it("start of run: 600-iteration floor (letter-sim shape)", () => {
    expect(iterationBudget(0, 1, 3)).toBe(600);
    expect(iterationBudget(0, 1, 0)).toBe(600);
  });

  it("multi-block mid-run: progress + remaining estimate", () => {
    // C3L at block 16 of 31: extend beyond iterations already spent.
    const b = iterationBudget(5000, 16, 35);
    expect(b).toBe(5000 + 16 * 35 * 5 + 100);
    expect(b).toBeGreaterThan(5000);
  });

  it("never below progress + 600", () => {
    expect(iterationBudget(9000, 0, 0)).toBe(9600);
    expect(iterationBudget(9000, 1, 1)).toBe(9600);
  });
});
