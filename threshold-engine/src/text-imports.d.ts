/** Imports suffixed with ?text are inlined as strings at build time (build.mjs). */
declare module "*?text" {
  const contents: string;
  export default contents;
}
