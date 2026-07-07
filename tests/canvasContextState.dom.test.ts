/**
 * Proves persistCanvasContextState's prototype-chain walk + getter delegation
 * against a REAL DOM HTMLCanvasElement (via jsdom), not the hand-rolled
 * SpecCanvas in canvasContextState.test.ts.
 *
 * The walk is the DOM-specific, trickiest part of the mechanism: it must find
 * the `width`/`height` accessor on HTMLCanvasElement.prototype (so the instance
 * override can delegate reads to the real getter) and re-apply state from the
 * setter. A toy object can't model this — its accessors would be own-properties.
 *
 * LIMIT (honest): jsdom does not implement canvas rendering without node-canvas
 * → getContext("2d") returns null here. So the state RE-APPLY half stays
 * covered by canvasContextState.test.ts's SpecCanvas (which has a working ctx);
 * THIS file covers the DOM-structure half (walk + delegation) that only a real
 * HTMLCanvasElement can prove.
 *
 * @jest-environment jsdom
 */

import "@jest/globals";

// jsdom doesn't implement canvas rendering (no node-canvas) and WARNs on every
// getContext call. We're testing the prototype-chain walk + delegation, not
// jsdom's ctx, so silence the noisy warning by returning null up front. (The
// null return is exactly the jsdom limit this file documents.)
HTMLCanvasElement.prototype.getContext = function () {
  return null;
} as unknown as typeof HTMLCanvasElement.prototype.getContext;

import {
  persistCanvasContextState,
  applyKerningAcrossResizes,
} from "../psychojs/src/visual/canvasContextState.js";

/** Walk the real prototype chain looking for an accessor `prop`. */
function findAccessorProto(
  obj: unknown,
  prop: string,
): PropertyDescriptor | undefined {
  let p = obj as object | null;
  while (p) {
    const d = Object.getOwnPropertyDescriptor(p, prop);
    if (d && (d.get || d.set)) return d;
    p = Object.getPrototypeOf(p);
  }
  return undefined;
}

describe("persistCanvasContextState against a REAL jsdom HTMLCanvasElement", () => {
  it("the test env really gives an HTMLCanvasElement with prototype width/height accessors", () => {
    // Guards against the env regressing to a non-DOM canvas (which would make
    // the rest of this file vacuous).
    const c = document.createElement("canvas");
    expect(c).toBeInstanceOf(HTMLCanvasElement);
    expect(findAccessorProto(c, "width")?.get).toBeTruthy();
    expect(findAccessorProto(c, "height")?.get).toBeTruthy();
  });

  it("walks the real prototype chain and delegates reads (width round-trips)", () => {
    const c = document.createElement("canvas");
    persistCanvasContextState(c, { fontKerning: "none" });
    // After patching, assigning width must still read back the assigned value
    // via the REAL HTMLCanvasElement getter (delegation intact).
    (c as unknown as { width: number }).width = 1234;
    (c as unknown as { height: number }).height = 567;
    expect((c as unknown as { width: number }).width).toBe(1234);
    expect((c as unknown as { height: number }).height).toBe(567);
  });

  it("installs an OWN width/height override without touching the prototype", () => {
    const protoWidthGet = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      "width",
    )?.get;
    const c = document.createElement("canvas");
    persistCanvasContextState(c, { fontKerning: "none" });
    // Per-instance override (limited blast radius)…
    expect(Object.getOwnPropertyDescriptor(c, "width")?.get).toBeTruthy();
    expect(Object.getOwnPropertyDescriptor(c, "height")?.set).toBeTruthy();
    // …prototype's accessor fn is the SAME reference (no global mutation)…
    expect(
      Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width")
        ?.get,
    ).toBe(protoWidthGet);
    // …and a SECOND canvas is independently unpatched until its own call.
    const c2 = document.createElement("canvas");
    expect(Object.getOwnPropertyDescriptor(c2, "width")).toBeUndefined();
  });

  it("does not throw when jsdom's getContext returns null (state re-apply is a safe no-op)", () => {
    const c = document.createElement("canvas");
    expect(c.getContext("2d")).toBeNull(); // the jsdom limit this test documents
    expect(() => applyKerningAcrossResizes(c, "none")).not.toThrow();
    expect(() => {
      (c as unknown as { width: number }).width = 50;
    }).not.toThrow();
  });
});
