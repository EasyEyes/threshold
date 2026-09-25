/**
 * EasyEyes version stamping for compiled experiments (Denis Pelli
 * 2026-09-23 #4): every experiment's index.html records WHICH EasyEyes
 * compiler build made it, so the runtime can log it to the results CSV
 * (easyEyesVersion).
 *
 * The version is the compile-time value of the date the compiler page
 * displays ("Compiler updated …"): the publication timestamp of the Netlify
 * deploy live at compile time — ISO 8601, verbatim from the Netlify API
 * (sortable, server-assigned, no client clock involved). Uniform for
 * Compiler-tab and Studio compiles; local example builds stamp "local".
 * The runtime reads "unknown" for experiments compiled before stamping
 * existed. (Thin-repo compiles also commit EasyEyesRuntime.json with their
 * exact npm runtime version — see preprocess/hostedRuntime.ts.)
 */

export const EASYEYES_VERSION_META = "easyeyes-version";

export interface ExperimentVersionStamp {
  /** Netlify deploy publication timestamp (ISO), or "local". */
  version: string;
}

const metaLine = (name: string, content: string): string =>
  `<meta name="${name}" content="${content}">`;

/**
 * Inject (or replace) the version meta at the end of <head>. Returns the
 * input unchanged when it has no </head> (never break a compile over a stamp).
 */
export const stampExperimentIndexHtml = (
  html: string,
  stamp: ExperimentVersionStamp,
): string => {
  const meta = metaLine(EASYEYES_VERSION_META, stamp.version);
  const headClose = html.lastIndexOf("</head>");
  if (headClose === -1) return html;
  // Drop any previous stamp, then insert the fresh one just before </head>.
  const stripped = html.replace(
    new RegExp(`\\s*<meta name="${EASYEYES_VERSION_META}"[^>]*>`),
    "",
  );
  const at = stripped.lastIndexOf("</head>");
  return stripped.slice(0, at) + "  " + meta + "\n  " + stripped.slice(at);
};
