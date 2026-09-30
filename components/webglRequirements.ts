/**
 * WebGL requirement: `_needWebGL` — three inclusive minimums
 * (version, textureSize, portSize) checked against a live WebGL context.
 * Unsupported WebGL is always unmet. The defaults are the floors observed
 * across completed field sessions (maxTextureSize 8192–16384,
 * maxViewportSize 16384–32767), so a working device is never rejected by
 * default; a study may demand more via its experiment table.
 */

export interface WebGLNeed {
  version: number;
  textureSize: number;
  portSize: number;
}

export interface WebGLCapabilities {
  supported: boolean;
  version: number | null;
  glslVersion: string;
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  textureSize: number | null;
  portSize: number | null;
  /** navigator.gpu (WebGPU API) present. Diagnostic only — never gates
   * compatibility. WebGPU present + WebGL absent implies WebGL was
   * deliberately disabled (about:config / enterprise policy), not missing
   * hardware. */
  webgpuAPI: boolean;
}

export type WebGLUnmetDimension =
  | "support"
  | "version"
  | "textureSize"
  | "portSize";

export interface WebGLVerdict {
  ok: boolean;
  unmet: WebGLUnmetDimension[];
}

export const DEFAULT_WEBGL_NEED: WebGLNeed = {
  version: 2,
  textureSize: 8192,
  portSize: 16384,
};

const parseVersionNumber = (versionString: string | null): number | null => {
  if (!versionString) return null;
  const match = /webgl\s*([\d.]+)/i.exec(versionString);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
};

/** Parse "version, textureSize, portSize". Bad/missing slots keep defaults.
 * Accepts the string form (glossary type `text`) and the array a vector
 * glossary type (`3*numerical`) would make read() return. */
export const parseNeedWebGL = (
  text: string | number[] | undefined,
): WebGLNeed => {
  const tokens = (Array.isArray(text) ? text.join(",") : text ?? "").split(",");
  const slot = (index: number): number | null => {
    const value = Number.parseFloat(tokens[index]?.trim() ?? "");
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const version = slot(0) ?? DEFAULT_WEBGL_NEED.version;
  const textureSize = slot(1) ?? DEFAULT_WEBGL_NEED.textureSize;
  const portSize = slot(2) ?? DEFAULT_WEBGL_NEED.portSize;
  return { version, textureSize, portSize };
};

/** Probe the browser once: webgl2, then webgl1/experimental-webgl. */
export const measureWebGLCapabilities = (): WebGLCapabilities => {
  const webgpuAPI = typeof navigator !== "undefined" && "gpu" in navigator;
  const unsupported: WebGLCapabilities = {
    supported: false,
    version: null,
    glslVersion: "",
    vendor: "",
    renderer: "",
    unmaskedVendor: "",
    unmaskedRenderer: "",
    textureSize: null,
    portSize: null,
    webgpuAPI,
  };
  if (typeof document === "undefined") return unsupported;

  const canvas = document.createElement("canvas");
  const gl =
    (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
    (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) return unsupported;

  let unmaskedVendor = "";
  let unmaskedRenderer = "";
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (debugInfo) {
    unmaskedVendor = String(
      gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "",
    );
    unmaskedRenderer = String(
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "",
    );
  }

  const viewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  return {
    supported: true,
    version: parseVersionNumber(gl.getParameter(gl.VERSION) as string),
    glslVersion: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION) ?? ""),
    vendor: String(gl.getParameter(gl.VENDOR) ?? ""),
    renderer: String(gl.getParameter(gl.RENDERER) ?? ""),
    unmaskedVendor,
    unmaskedRenderer,
    textureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    portSize: viewportDims ? Number(viewportDims[0]) : null,
    webgpuAPI,
  };
};

const atLeast = (value: number | null, minimum: number): boolean =>
  value !== null && value >= minimum;

/** Inclusive minimums: device value >= needed value. */
export const webGLMeetsNeed = (
  capabilities: Pick<
    WebGLCapabilities,
    "supported" | "version" | "textureSize" | "portSize"
  >,
  need: WebGLNeed,
): WebGLVerdict => {
  if (!capabilities.supported) return { ok: false, unmet: ["support"] };
  const unmet: WebGLUnmetDimension[] = [];
  if (!atLeast(capabilities.version, need.version)) unmet.push("version");
  if (!atLeast(capabilities.textureSize, need.textureSize))
    unmet.push("textureSize");
  if (!atLeast(capabilities.portSize, need.portSize)) unmet.push("portSize");
  return { ok: unmet.length === 0, unmet };
};

/**
 * Read `_needWebGL` from the experiment table and measure the device once.
 * Shared by the ✓/✗ device-facts checklist and the fatal compatibility
 * check so both always agree.
 */
export const getWebGLRequirements = (paramReader: {
  read: (name: string) => string[];
}): {
  need: WebGLNeed;
  capabilities: WebGLCapabilities;
  meetsNeed: boolean;
  unmet: WebGLUnmetDimension[];
} => {
  const need = parseNeedWebGL(paramReader?.read("_needWebGL")?.[0]);
  const capabilities = measureWebGLCapabilities();
  const verdict = webGLMeetsNeed(capabilities, need);
  return { need, capabilities, meetsNeed: verdict.ok, unmet: verdict.unmet };
};
