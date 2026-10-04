import {
  getMaxNominalFontSizePx,
  getShrunkFontMaxPhysicalPx,
} from "../components/fontMaxPhysicalPx";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: Window }).window;
});

it.each([
  [1, 2000 / 1.2],
  [2, 2000 / 2 / 1.2],
  [3, 2000 / 3 / 1.2],
])(
  "caps the nominal CSS font size at devicePixelRatio %s",
  (ratio, expected) => {
    Object.defineProperty(globalThis, "window", {
      value: { devicePixelRatio: ratio },
      configurable: true,
    });
    expect(getMaxNominalFontSizePx(2000, 0.2)).toBeCloseTo(expected);
  },
);

it("reduces the physical cap after failed rendering without increasing it", () => {
  Object.defineProperty(globalThis, "window", {
    value: { devicePixelRatio: 2 },
    configurable: true,
  });
  expect(getShrunkFontMaxPhysicalPx(2000, 0.8, 800)).toBe(1280);
  expect(getShrunkFontMaxPhysicalPx(1000, 0.8, 800)).toBe(1000);
});
