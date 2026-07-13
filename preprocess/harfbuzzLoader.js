/**
 * Browser-side loader for harfbuzzjs.
 *
 * harfbuzzjs is an ES module that uses top-level await. It must be loaded
 * with a real dynamic import() so the bundler (webpack) can wait for its
 * initialization. This lives in a .js file because TypeScript's CommonJS
 * output would downlevel import() into require(), which cannot load
 * async ES modules and yields an empty namespace object.
 */
export const importHarfbuzz = () => import("harfbuzzjs");
