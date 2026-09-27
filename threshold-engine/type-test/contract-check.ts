/**
 * Type-level check that the engine implements its frozen public contract.
 * Checked with `npm run check:types`; no JavaScript is emitted.
 */
import engineDefault, { compile, contractVersion } from "../src/index";
import type { ThresholdEngine } from "../contract/engine-compile";
import { CONTRACT_VERSION } from "../contract/engine-compile";

const asContract: ThresholdEngine = engineDefault;
const reassembled: ThresholdEngine = { contractVersion, compile };
const version: 1 = CONTRACT_VERSION;

export { asContract, reassembled, version };
