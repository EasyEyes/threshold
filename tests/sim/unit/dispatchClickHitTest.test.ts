/**
 * @jest-environment jsdom
 *
 * dispatchClick's hit-test guard (sim realism): the sim may only click what
 * a real pointer at the element's center would hit. Positive cover evidence
 * (a different element at the point) blocks the click; indeterminate
 * layout (jsdom zero rects / null elementFromPoint) passes through.
 */
// Mock the psychojs + paramReader imports so the module loads cleanly
// (same as the other simulatedParticipant suites).
jest.mock("../../../psychojs/src/core/MinimalStim.js", () => ({
  MinimalStim: class FakeMinimalStim {},
}));
jest.mock("../../../parameters/paramReader.js", () => ({
  ParamReader: class FakeParamReader {},
}));

import { dispatchClick } from "../../../components/simulatedParticipant";

const center = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

describe("dispatchClick hit-test guard", () => {
  let realFromPoint: typeof document.elementFromPoint;

  beforeEach(() => {
    document.body.innerHTML = "";
    realFromPoint = document.elementFromPoint;
  });
  afterEach(() => {
    document.elementFromPoint = realFromPoint;
  });

  const mkButton = (): HTMLButtonElement => {
    const b = document.createElement("button");
    b.textContent = "Proceed";
    b.style.width = "100px";
    b.style.height = "40px";
    document.body.appendChild(b);
    // jsdom has no layout: give the button a real rect.
    b.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 10,
        width: 100,
        height: 40,
        right: 110,
        bottom: 50,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }) as DOMRect;
    return b;
  };

  it("clicks when nothing covers the point", () => {
    const b = mkButton();
    const handler = jest.fn();
    b.addEventListener("click", handler);
    document.elementFromPoint = () => b; // hit = target
    expect(dispatchClick(b, "proceed")).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("BLOCKS when a different element covers the point (the overlay bug class)", () => {
    const b = mkButton();
    const handler = jest.fn();
    b.addEventListener("click", handler);
    const cover = document.createElement("div");
    document.elementFromPoint = () => cover; // a dead covering page
    expect(dispatchClick(b, "proceed")).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows when the hit is a descendant of the target (label/span wrapping)", () => {
    const b = mkButton();
    const span = document.createElement("span");
    b.appendChild(span);
    document.elementFromPoint = () => span;
    expect(dispatchClick(b, "proceed")).toBe(true);
  });

  it("passes through when layout is indeterminate (null hit — jsdom-style)", () => {
    const b = mkButton();
    const handler = jest.fn();
    b.addEventListener("click", handler);
    document.elementFromPoint = () => null;
    expect(dispatchClick(b, "proceed")).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("passes through when the element has no rendered box (jsdom zero rects)", () => {
    const b = document.createElement("button"); // no rect override
    const handler = jest.fn();
    b.addEventListener("click", handler);
    expect(dispatchClick(b, "proceed")).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
