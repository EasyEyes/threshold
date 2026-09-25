/**
 * easyEyesVersion must never throw outside a browser: it answers "unknown"
 * instead. (Both clauses are typeof-guarded — module consumers can run under
 * node, e.g. tooling or SSR-ish test harnesses importing threshold.)
 *
 * @jest-environment node
 */

import "@jest/globals";
import { easyEyesVersion } from "../components/easyEyesVersion";

describe("easyEyesVersion outside a browser", () => {
  it('answers "unknown" rather than throwing (no window/document)', () => {
    expect(easyEyesVersion()).toBe("unknown");
  });
});
