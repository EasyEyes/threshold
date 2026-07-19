/**
 * Type-level check: the engine's public surface must satisfy the frozen
 * ThresholdEngine contract — both the byte-exact copy shipped with the
 * package and the canonical contracts/ definition at the workspace root
 * (when present), without modifying either.
 *
 * Checked with `npm run check:types` (tsc --noEmit).
 */
import engineDefault, { compile, contractVersion } from "../src/index";
import type { ThresholdEngine as PackagedContract } from "../contract/engine-compile";
import { CONTRACT_VERSION } from "../contract/engine-compile";
// Canonical frozen contract (ADR 0001) at the EasyEyes workspace root.
import type { ThresholdEngine as CanonicalContract } from "../../../../../../contracts/engine-compile";

const asPackaged: PackagedContract = engineDefault;
const asCanonical: CanonicalContract = engineDefault;
const reassembled: CanonicalContract = { contractVersion, compile };

// The engine speaks contract version 1.
const version: 1 = CONTRACT_VERSION;

export { asPackaged, asCanonical, reassembled, version };
