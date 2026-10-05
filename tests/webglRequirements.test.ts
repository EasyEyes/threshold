/**
 * _needWebGL — three minimums (version, textureSize, portSize) checked
 * against the live WebGL context. The defaults are the glossary's
 * (2, 8192, 16384) — the observed floors of completed sessions (field
 * data Acuity24FontsAddSloan3: maxTextureSize 8192–16384,
 * maxViewportSize 16384–32767), so every completing device class passes
 * and only unsupported/below-floor WebGL is rejected. Software-rendered
 * environments (SwiftShader, 8192 viewport) are below the floor by
 * design; simulated builds opt in explicitly via the injected
 * `_needWebGL` row (examples/simulateInject.ts).
 *
 * @jest-environment jsdom
 */
import {
  DEFAULT_WEBGL_NEED,
  measureWebGLCapabilities,
  parseNeedWebGL,
  webGLMeetsNeed,
} from "../components/webglRequirements";

describe("parseNeedWebGL — 'version, textureSize, portSize'", () => {
  it("empty / missing → glossary defaults (2, 8192, 16384)", () => {
    expect(parseNeedWebGL("")).toEqual(DEFAULT_WEBGL_NEED);
    expect(parseNeedWebGL(undefined)).toEqual(DEFAULT_WEBGL_NEED);
    expect(DEFAULT_WEBGL_NEED).toEqual({
      version: 2,
      textureSize: 8192,
      portSize: 16384,
    });
  });

  it("software-rendered devices (SwiftShader: viewport 8192) are rejected by default — sims opt in explicitly", () => {
    // The glossary default keeps every completed-session device class;
    // SwiftShader-class environments sit below its viewport floor by
    // design. Simulated builds declare their real floor via the injected
    // _needWebGL row (see tests/sim/unit/buildExamples.simulate.test.ts).
    const swiftShaderLike = {
      supported: true,
      version: 2,
      textureSize: 8192,
      portSize: 8192,
    };
    const verdict = webGLMeetsNeed(swiftShaderLike, DEFAULT_WEBGL_NEED);
    expect(verdict.ok).toBe(false);
    expect(verdict.unmet).toEqual(["portSize"]);
  });

  it("parses the glossary example verbatim", () => {
    expect(parseNeedWebGL("2, 16385, 32767")).toEqual({
      version: 2,
      textureSize: 16385,
      portSize: 32767,
    });
  });

  it("parses the array a vector glossary type would make read() return", () => {
    expect(parseNeedWebGL([2, 16384, 32768] as unknown as string)).toEqual({
      version: 2,
      textureSize: 16384,
      portSize: 32768,
    });
  });

  it("tolerates whitespace and ignores extra tokens", () => {
    expect(parseNeedWebGL(" 2 , 16384 , 16384 , 999 ")).toEqual({
      version: 2,
      textureSize: 16384,
      portSize: 16384,
    });
  });

  it("partial values keep the defaults for the missing slots", () => {
    expect(parseNeedWebGL("1")).toEqual({
      version: 1,
      textureSize: DEFAULT_WEBGL_NEED.textureSize,
      portSize: DEFAULT_WEBGL_NEED.portSize,
    });
  });

  it("non-numeric tokens fall back to that slot's default", () => {
    expect(parseNeedWebGL("x, 8192, 16384")).toEqual({
      version: DEFAULT_WEBGL_NEED.version,
      textureSize: 8192,
      portSize: 16384,
    });
  });
});

describe("webGLMeetsNeed — minimum is inclusive", () => {
  const caps = {
    supported: true,
    version: 2,
    textureSize: 16384,
    portSize: 32767,
  };
  const need = { version: 2, textureSize: 8192, portSize: 16384 };

  it("the modal field device (2 / 16384 / 32767) passes the defaults", () => {
    const verdict = webGLMeetsNeed(caps, need);
    expect(verdict.ok).toBe(true);
    expect(verdict.unmet).toEqual([]);
  });

  it("exact equality passes (>=, not >)", () => {
    expect(
      webGLMeetsNeed(
        { supported: true, version: 2, textureSize: 8192, portSize: 16384 },
        need,
      ).ok,
    ).toBe(true);
  });

  it("glossary-literal defaults (16385/32767) reject the modal field device — known off-by-one", () => {
    const verdict = webGLMeetsNeed(caps, {
      version: 2,
      textureSize: 16385,
      portSize: 32767,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.unmet).toEqual(["textureSize"]);
  });

  it("reports each unmet dimension", () => {
    expect(
      webGLMeetsNeed(
        { supported: true, version: 1, textureSize: 16384, portSize: 16384 },
        need,
      ),
    ).toEqual({ ok: false, unmet: ["version"] });
    expect(
      webGLMeetsNeed(
        { supported: true, version: 2, textureSize: 4096, portSize: 8192 },
        need,
      ),
    ).toEqual({ ok: false, unmet: ["textureSize", "portSize"] });
  });

  it("no WebGL context at all is always unmet", () => {
    const verdict = webGLMeetsNeed(
      { supported: false, version: null, textureSize: null, portSize: null },
      need,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.unmet).toContain("support");
  });
});

describe("measureWebGLCapabilities", () => {
  const REAL = HTMLCanvasElement.prototype.getContext;
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = REAL;
  });

  const fakeGL = {
    // Real WebGL enum values, as the module must call them (gl.VERSION …).
    VERSION: 7936,
    SHADING_LANGUAGE_VERSION: 35724,
    VENDOR: 7935,
    RENDERER: 7937,
    MAX_TEXTURE_SIZE: 3379,
    MAX_VIEWPORT_DIMS: 33786,
    getParameter: (p: number) => {
      if (p === 7936) return "WebGL 2.0 (OpenGL ES 3.0 Chromium)";
      if (p === 35724) return "WebGL GLSL ES 3.00";
      if (p === 7935) return "WebKit";
      if (p === 7937) return "WebKit WebGL";
      if (p === 3379) return 16384;
      if (p === 33786) return [32767, 32767];
      if (p === 37445) return "Google Inc. (NVIDIA)";
      if (p === 37446) return "ANGLE (NVIDIA GeForce)";
      return null;
    },
    getExtension: () => ({
      UNMASKED_VENDOR_WEBGL: 37445,
      UNMASKED_RENDERER_WEBGL: 37446,
    }),
  };

  it("probes webgl2 first and extracts every capability", () => {
    const calls: string[] = [];
    HTMLCanvasElement.prototype.getContext = function (type: string) {
      calls.push(type);
      return fakeGL as any;
    };
    const caps = measureWebGLCapabilities();
    expect(calls[0]).toBe("webgl2");
    expect(caps).toMatchObject({
      supported: true,
      version: 2,
      glslVersion: "WebGL GLSL ES 3.00",
      textureSize: 16384,
      portSize: 32767,
      unmaskedRenderer: "ANGLE (NVIDIA GeForce)",
    });
  });

  it("reports version 1 for a WebGL 1.0 context string", () => {
    HTMLCanvasElement.prototype.getContext = (() => ({
      ...fakeGL,
      getParameter: (p: number) =>
        p === 7936
          ? "WebGL 1.0 (OpenGL ES 2.0 Chromium)"
          : fakeGL.getParameter(p),
    })) as any;
    expect(measureWebGLCapabilities().version).toBe(1);
  });

  it("no context → supported:false, null values (the field failure shape)", () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as any;
    const caps = measureWebGLCapabilities();
    expect(caps).toMatchObject({
      supported: false,
      version: null,
      textureSize: null,
      portSize: null,
      unmaskedRenderer: "",
    });
  });

  it("records navigator.gpu presence — the deliberate-disable disambiguator", () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as any;
    // jsdom has no navigator.gpu: absent → false.
    expect(measureWebGLCapabilities().webgpuAPI).toBe(false);
    (navigator as any).gpu = {};
    try {
      expect(measureWebGLCapabilities().webgpuAPI).toBe(true);
    } finally {
      delete (navigator as any).gpu;
    }
  });
});
