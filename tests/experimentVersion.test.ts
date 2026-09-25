/**
 * EasyEyes version stamping (Denis Pelli 2026-09-23 #4): every compiled
 * experiment records WHICH EasyEyes compiler build made it, so the runtime can
 * log it to the results CSV (easyEyesVersion).
 *
 * The version IS the compile-time value of the date the compiler page
 * displays ("Compiler updated …"): the publication timestamp of the Netlify
 * deploy that was live when the experiment was compiled (ISO 8601, verbatim
 * from the Netlify API — sortable, no client clock involved). Uniform for
 * Compiler-tab and Studio compiles; local example builds stamp "local";
 * experiments compiled before stamping existed read "unknown".
 *
 * stampExperimentIndexHtml also records an exact runtime id
 * (easyeyes-runtime-version meta: `deploy:<id>`, or the immutable npm version
 * for thin-repo compiles) — forensic only, not logged to the CSV.
 *
 * @jest-environment jsdom
 */

import "@jest/globals";
import {
  EASYEYES_RUNTIME_VERSION_META,
  EASYEYES_VERSION_META,
  stampExperimentIndexHtml,
} from "../preprocess/experimentVersion";
import { easyEyesVersion } from "../components/easyEyesVersion";

describe("stampExperimentIndexHtml", () => {
  const html = "<html><head><title>t</title></head><body></body></html>";

  it("injects version and runtime-id metas into <head>", () => {
    const out = stampExperimentIndexHtml(html, {
      version: "2026-09-24T14:03:22.844Z",
      runtimeId: "deploy:64b3f2a1",
    });
    expect(out).toContain(
      '<meta name="easyeyes-version" content="2026-09-24T14:03:22.844Z">',
    );
    expect(out).toContain(
      '<meta name="easyeyes-runtime-version" content="deploy:64b3f2a1">',
    );
    expect(out.indexOf("</head>")).toBeGreaterThan(
      out.indexOf(EASYEYES_VERSION_META),
    );
    expect(out).toContain("<title>t</title>");
  });

  it("replaces existing metas (re-stamping is idempotent)", () => {
    const once = stampExperimentIndexHtml(html, {
      version: "a",
      runtimeId: "b",
    });
    const twice = stampExperimentIndexHtml(once, {
      version: "c",
      runtimeId: "d",
    });
    expect(twice.match(/easyeyes-version/g)?.length).toBe(1);
    expect(twice.match(/easyeyes-runtime-version/g)?.length).toBe(1);
    expect(twice).toContain('name="easyeyes-version" content="c"');
    expect(twice).toContain('name="easyeyes-runtime-version" content="d"');
  });

  it("returns input unchanged when there is no </head>", () => {
    expect(
      stampExperimentIndexHtml("<html><body></body></html>", {
        version: "a",
        runtimeId: "b",
      }),
    ).toBe("<html><body></body></html>");
  });
});

describe("easyEyesVersion reader", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it('reads "unknown" with no marker (older bundles)', () => {
    expect(easyEyesVersion()).toBe("unknown");
  });

  it("reads the stamped version meta verbatim", () => {
    document.head.innerHTML =
      '<meta name="easyeyes-version" content="2026-09-24T14:03:22.844Z">';
    expect(easyEyesVersion()).toBe("2026-09-24T14:03:22.844Z");
  });

  it("treats empty meta content as unknown", () => {
    document.head.innerHTML = '<meta name="easyeyes-version" content="">';
    expect(easyEyesVersion()).toBe("unknown");
  });

  it("does not read the forensic runtime-id meta", () => {
    document.head.innerHTML =
      '<meta name="easyeyes-runtime-version" content="deploy:64b3f2a1">';
    expect(easyEyesVersion()).toBe("unknown");
  });
});
