/**
 * Parity oracle: re-exports the production compiler exactly as the shell
 * consumes it, so the parity harness can drive the legacy path and the
 * engine package side by side and compare outputs byte-for-byte.
 *
 * Bundled separately from the engine (see build-oracle.mjs); the two do not
 * share module state.
 */
export { prepareExperimentFileForThreshold } from "../../preprocess/main";
export { durations } from "../../preprocess/getDuration";
export { compatibilityRequirements, typekit } from "../../preprocess/global";
export { initGlossary, getGlossary } from "../../parameters/glossaryRegistry";
export { initPhrases } from "../../parameters/phrasesRegistry";
