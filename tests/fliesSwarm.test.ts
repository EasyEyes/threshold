/** @jest-environment jsdom */
/**
 * Adversarial: the Swarm rendering layer of the markFlies rename.
 * resolveFliesSpec (components/fliesParams.ts) is unit-tested elsewhere;
 * these tests pin the dotAndGrid side — spec → Swarm construction, the
 * trackFixationBool centering inversion (legacy centeredOnNominalFixationBool
 * was its logical negation), per-frame re-centering, fly confinement, and
 * draw/status transitions.
 */
jest.mock("../components/global", () => ({
  viewingDistanceCm: { current: 50 },
  grid: { current: undefined, units: undefined },
  fixationConfig: { pos: [0, 0], nominalPos: [0, 0] },
  screenBackground: undefined,
}));
jest.mock("../components/utils.js", () => ({
  pxScalar: (d: number) => d * 40,
  xyPxOfDeg: jest.fn(),
  xyDegOfPx: jest.fn(),
  colorRGBASnippetToRGBA: (c: unknown) => c,
  degreesToPixels: (d: number) => d * 40,
  isInRect: jest.fn(),
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: { window: { getActualFrameRate: () => 60 } },
}));
jest.mock("../psychojs/src/visual/index.js", () => ({
  ShapeStim: class {
    autoDraw = false;
    pos: number[];
    constructor(public o: any) {
      this.pos = o.pos;
    }
    setAutoDraw(v: boolean) {
      this.autoDraw = v;
    }
    setPos(p: number[]) {
      this.pos = p;
    }
  },
  Polygon: class {
    constructor(public o: any) {}
    setAutoDraw() {}
  },
}));
jest.mock("../psychojs/src", () => ({
  util: {
    Color: class {
      constructor(
        public c: any,
        public cs: any,
      ) {}
    },
  },
}));
jest.mock("../psychojs/src/core", () => ({
  PsychoJS: {
    Status: { NOT_STARTED: 401, STARTED: 402, FINISHED: 403 },
  },
}));
jest.mock("../psychojs/src/util/index.js", () => ({
  Color: class {
    static COLOR_SPACE = { RGB: 1 };
    constructor(
      public c: any,
      public cs: any,
    ) {}
  },
}));

import { getFlies } from "../components/dotAndGrid";
import { Screens } from "../components/multiple-displays/globals";
import type { FliesSpec } from "../components/fliesParams";
import { PsychoJS } from "../psychojs/src/core";

const MOVING_POS = [100, 0];
const NOMINAL_POS = [0, 0];

const setup = (pos = MOVING_POS, nominal = NOMINAL_POS) => {
  Screens[0].pxPerCm = 40;
  Screens[0].viewingDistanceCm = 50;
  Screens[0].nearestPointXYZPx = [0, 0];
  Screens[0].fixationXYZPx = [0, 0, 0];
  Screens[0].fixationConfig.pos = pos;
  Screens[0].fixationConfig.nominalPos = nominal;
};

const spec = (overrides: Partial<FliesSpec> = {}): FliesSpec => ({
  n: 5,
  radiusDeg: 1,
  degPerSec: 12,
  trackFixationBool: false,
  thicknessDeg: 0.05,
  lengthDeg: 2,
  colorRGBA: "0,0,1,1",
  gravity: 0,
  ...overrides,
});

describe("getFlies construction", () => {
  beforeEach(() => setup());

  test("undefined spec → undefined (no flies)", () => {
    expect(getFlies(undefined)).toBeUndefined();
  });

  test("spec → swarm of n flies, 2 stims (cross arms) each", () => {
    const swarm = getFlies(spec({ n: 4 })) as any;
    expect(swarm).toBeDefined();
    expect(swarm.n).toBe(4);
    expect(swarm.flies).toHaveLength(4);
    expect(swarm.stims).toHaveLength(8);
  });
});

describe("Swarm centering (markFliesTrackFixationBool inversion)", () => {
  beforeEach(() => setup());

  test("FALSE → confining circle on the NOMINAL fixation (static)", () => {
    const swarm = getFlies(spec({ trackFixationBool: false })) as any;
    expect(swarm.center).toEqual(NOMINAL_POS);
  });

  test("TRUE → confining circle on the (possibly moving) crosshair", () => {
    const swarm = getFlies(spec({ trackFixationBool: true })) as any;
    expect(swarm.center).toEqual(MOVING_POS);
  });

  test("TRUE: everyFrame re-centers as the crosshair moves", () => {
    const swarm = getFlies(spec({ trackFixationBool: true })) as any;
    Screens[0].fixationConfig.pos = [200, 40];
    swarm.everyFrame();
    expect(swarm.getCenter()).toEqual([200, 40]);
    for (const fly of swarm.flies) expect(fly.center).toEqual([200, 40]);
  });

  test("FALSE: everyFrame ignores crosshair motion", () => {
    const swarm = getFlies(spec({ trackFixationBool: false })) as any;
    Screens[0].fixationConfig.pos = [999, 999];
    swarm.everyFrame();
    expect(swarm.getCenter()).toEqual(NOMINAL_POS);
  });
});

describe("Swarm motion invariants", () => {
  beforeEach(() => setup());

  test("every fly stays inside the confinement circle across frames", () => {
    const swarm = getFlies(spec({ n: 8, trackFixationBool: true })) as any;
    for (let i = 0; i < 25; i++) swarm.everyFrame();
    for (const fly of swarm.flies)
      expect(fly.distanceFromCenter()).toBeLessThanOrEqual(swarm.radiusPx);
  });

  test("with gravity ≠ 0 (real deg↔px conversions) flies stay confined and alive", () => {
    const swarm = getFlies(
      spec({ n: 6, trackFixationBool: false, gravity: -0.5 }),
    ) as any;
    for (let i = 0; i < 25; i++) swarm.everyFrame();
    expect(swarm.flies).toHaveLength(6);
    for (const fly of swarm.flies)
      expect(fly.distanceFromCenter()).toBeLessThanOrEqual(swarm.radiusPx);
  });

  test("draw() toggles every stim's autoDraw and the status lifecycle", () => {
    const swarm = getFlies(spec()) as any;
    expect(swarm.status).toBe(PsychoJS.Status.NOT_STARTED);
    swarm.draw();
    expect(swarm.status).toBe(PsychoJS.Status.STARTED);
    expect(swarm.stims.every((s: any) => s.autoDraw)).toBe(true);
    swarm.draw(false);
    expect(swarm.status).toBe(PsychoJS.Status.FINISHED);
    expect(swarm.stims.every((s: any) => !s.autoDraw)).toBe(true);
  });
});
