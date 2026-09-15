/** @jest-environment jsdom */
/**
 * RED: grid cycling + deg dynamic-flag spec compliance.
 * Spec: glossary showGrid — backquote cycles "none, px, cm, pt, inch, deg,
 * degDynamic, mmV4" (all states except disabled); 'deg' is relative to the
 * NOMINAL fixation; 'degDynamic' relative to the (possibly moving) crosshair.
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
  grid: { current: undefined, units: undefined },
  fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
  screenBackground: undefined,
}));
jest.mock("../psychojs/src/util/index.js", () => ({
  Color: class {
    constructor(public c: any) {}
  },
}));
jest.mock("../psychojs/src/visual/index.js", () => ({
  ShapeStim: class {
    autoDraw = false;
    constructor(public o: any) {}
    setAutoDraw(v: boolean) {
      this.autoDraw = v;
    }
  },
  TextStim: class {
    autoDraw = false;
    constructor(public o: any) {}
    setAutoDraw(v: boolean) {
      this.autoDraw = v;
    }
  },
  Polygon: class {
    autoDraw = false;
    constructor(public o: any) {}
    setAutoDraw(v: boolean) {
      this.autoDraw = v;
    }
  },
}));
jest.mock("../components/utils.js", () => ({
  colorRGBASnippetToRGBA: (c: any) => c,
  degreesToPixels: (d: number) => d * 40,
  xyPxOfDeg: jest.fn(),
  xyDegOfPx: jest.fn(),
  isInRect: (x: number, y: number, r: any) =>
    x >= r.left && x <= r.right && y >= r.bottom && y <= r.top,
}));
import { Screens } from "../components/multiple-displays/globals";
import { XYPxOfDeg } from "../components/multiple-displays/utils";
import { grid as gridGlobal } from "../components/global";
import { Grid } from "../components/grid";

const setup = (fixationPos: number[] = [0, 0], nominal: number[] = [0, 0]) => {
  Screens[0].pxPerCm = 40;
  Screens[0].viewingDistanceCm = 50;
  Screens[0].nearestPointXYZPx = [0, 0];
  Screens[0].fixationXYZPx = [0, 0, 0];
  Screens[0].fixationConfig.pos = fixationPos;
  Screens[0].fixationConfig.nominalPos = nominal;
  (gridGlobal as any).units = undefined;
};

const makePsychoJS = () => ({
  window: { _size: [1280, 720] },
  experiment: { addData: jest.fn() },
});

const pressBackquote = () => {
  (window as any).onkeydown({
    code: "Backquote",
    key: "`",
    stopPropagation: jest.fn(),
  });
};

describe("grid cycling (glossary order)", () => {
  beforeEach(() => setup());

  test("backquote cycles: none→px→cm→pt→in→deg→degDynamic→mmV4→none", () => {
    const g: any = new (Grid as any)("disabled", Screens[0], makePsychoJS());
    g.update("none", Screens[0]);
    const seen = [g.units];
    for (let i = 0; i < 8; i++) {
      pressBackquote();
      seen.push(g.units);
    }
    expect(seen).toEqual([
      "none",
      "px",
      "cm",
      "pt",
      "in",
      "deg",
      "degDynamic",
      "mmV4",
      "none",
    ]);
  });

  test("param 'disabled' does not poison cycling in later blocks", () => {
    // Simulates threshold.js call pattern: update(grid.units ?? param).
    // Block 1 leaves showGrid blank -> default 'disabled'. Block 2 sets
    // showGrid=deg. The participant must be able to cycle in block 2.
    const g: any = new (Grid as any)("disabled", Screens[0], makePsychoJS());
    g.update((gridGlobal as any).units ?? "disabled", Screens[0]); // block 1
    g.update((gridGlobal as any).units ?? "deg", Screens[0]); // block 2
    expect(g.units).toBe("deg");
    pressBackquote();
    expect(g.units).toBe("degDynamic");
  });

  test("participant's tilde choice persists across blocks", () => {
    const g: any = new (Grid as any)("disabled", Screens[0], makePsychoJS());
    g.update((gridGlobal as any).units ?? "deg", Screens[0]); // block 1
    pressBackquote(); // participant switches to degDynamic
    g.update((gridGlobal as any).units ?? "px", Screens[0]); // block 2 param
    expect(g.units).toBe("degDynamic");
  });

  test("transition to 'disabled' undraws the previous grid", () => {
    const g: any = new (Grid as any)("disabled", Screens[0], makePsychoJS());
    g.update("deg", Screens[0]);
    const drawn = [...g.lines, ...g.labels];
    expect(drawn.some((s: any) => s.autoDraw)).toBe(true);
    g.update("disabled", Screens[0]);
    expect(drawn.every((s: any) => !s.autoDraw)).toBe(true);
  });

  test("stopPropagation only for the backquote key", () => {
    new (Grid as any)("disabled", Screens[0], makePsychoJS());
    const other = { code: "KeyA", key: "a", stopPropagation: jest.fn() };
    (window as any).onkeydown(other);
    expect(other.stopPropagation).not.toHaveBeenCalled();
  });
});

describe("deg vs degDynamic anchoring", () => {
  test("deg anchors to nominalPos, degDynamic to real pos", () => {
    setup([100, 0], [0, 0]); // real crosshair 100px right of nominal
    const g: any = new (Grid as any)("disabled", Screens[0], makePsychoJS());
    g.update("deg", Screens[0]);
    // The i=1 'right' line of each grid: x of its middle vertex (e ≈ 0).
    const midX = (line: any) =>
      line.o.vertices[Math.floor(line.o.vertices.length / 2)][0];
    const staticX = midX(g.allGrids["deg"][0][1]);
    const dynX = midX(g.allGrids["degDynamic"][0][1]);
    const nominal1Deg = (XYPxOfDeg(0, [1, 0], false) as number[])[0];
    const real1Deg = (XYPxOfDeg(0, [1, 0], true) as number[])[0];
    expect(staticX).toBeCloseTo(nominal1Deg, 1);
    expect(dynX).toBeCloseTo(real1Deg, 1);
    // And they must differ from each other (100px offset is way above tol).
    expect(Math.abs(staticX - dynX)).toBeGreaterThan(50);
  });
});
