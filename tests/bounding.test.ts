/**
 * @jest-environment jsdom
 *
 * Unit tests for the legacy letter-bounding pipeline. Display and browser
 * dependencies are mocked; bounding.js and the Rectangle math run for real.
 * The linear 40 px/deg display makes the expected geometry easy to audit.
 */

const mockTextStims: any[] = [];

jest.mock("../psychojs/src/util/index.js", () => ({
  Color: class {
    constructor(public color: string) {}
  },
}));
jest.mock("../psychojs/src/visual/index.js", () => ({
  TextStim: class {
    config: any;
    height: number;
    text = "";
    xy = [0, 0];

    constructor(config: any) {
      this.config = config;
      this.height = config.height;
      mockTextStims.push(this);
    }

    setText(text: string) {
      this.text = text;
    }

    setPos(xy: number[]) {
      this.xy = xy;
    }

    setHeight(height: number) {
      this.height = height;
    }

    _updateIfNeeded() {}

    getTextMetrics() {
      const width = (this.text.length * this.height) / 2;
      return {
        boundingBox: {
          actualBoundingBoxAscent: this.height * 0.4,
          actualBoundingBoxDescent: this.height * 0.1,
          actualBoundingBoxLeft: -width / 2,
          actualBoundingBoxRight: width / 2,
        },
      };
    }

    getBoundingBox() {
      return {
        x: this.xy[0],
        y: this.xy[1],
        width: (this.text.length * this.height) / 2,
        height:
          this.text === "acemnorsuvwx" ? this.height * 0.25 : this.height * 0.5,
      };
    }
  },
}));
jest.mock("../components/global", () => ({
  displayOptions: { pixPerCm: 40 },
  eyeTrackingStimulusRecords: [],
  fixationConfig: {},
  letterConfig: {
    targetMinimumPix: 1,
    fontMaxPhysicalPx: 1000,
    targetSizeDeg: 1.5,
    spacingDirection: "horizontal",
    targetEccentricityXYDeg: [0, 0],
  },
  targetKind: { current: "letter" },
  status: { block_condition: "1_1" },
  viewingDistanceCm: { current: 40, desired: 40 },
  rc: { screenPpi: { value: 100 } },
  targetEccentricityDeg: { x: 0, y: 0 },
  targetTextStimConfig: {},
  skipTrialOrBlock: {},
  thisExperimentInfo: {},
}));
jest.mock("../components/globalPsychoJS", () => ({
  psychoJS: {
    window: { _size: [800, 600] },
    experiment: { addData: jest.fn(), nextEntry: jest.fn() },
  },
  psychojsMouse: { getPos: () => [0, 0] },
  to_px: () => [0, 0],
}));
jest.mock("../parameters/paramReader", () => ({
  paramReader: { read: jest.fn(), has: jest.fn() },
}));
jest.mock("../parameters/glossaryRegistry", () => ({
  getGlossary: () => ({}),
}));
jest.mock("../psychojs/src/data/MultiStairHandler.js", () => ({
  MultiStairHandler: class {},
}));
jest.mock("../components/errorHandling", () => ({ warning: jest.fn() }));
jest.mock("../components/eyeTrackingFacilitation", () => ({
  getAppleCoordinatePosition: jest.fn(() => 0),
  getScreenDimensions: jest.fn(() => [800, 600]),
}));
jest.mock("../components/readingAddons", () => ({
  pxToPt: (px: number) => px,
}));
jest.mock("../components/readPhrases", () => ({
  useWordDigitBool: { current: false },
}));
jest.mock("../components/letter", () => ({
  logWebGLInfoToFormspree: jest.fn(),
}));
jest.mock("../components/webglRequirements", () => ({
  measureWebGLCapabilities: jest.fn(() => ({ supported: false })),
}));
jest.mock("../components/fontInstancing", () => ({
  getFontInstancingTimesMs: jest.fn(() => null),
  getFontInstancingTotalTimeMs: jest.fn(() => null),
}));
jest.mock("../components/longTaskRecorder", () => ({
  createLongTaskRecorder: () => ({ flushTrial: jest.fn(), record: jest.fn() }),
}));
jest.mock("../components/multiple-displays/globals.ts", () => ({
  Screens: [
    {
      pxPerCm: 40,
      window: { _size: [800, 600] },
      fixationConfig: {
        pos: [0, 0],
        nominalPos: [0, 0],
        markingFixationMotionRadiusDeg: 0,
        markingFixationMotionSpeedDegPerSec: 0,
      },
      nearestPointXYZDeg: [0, 0],
      nearestPointXYZPx: [0, 0],
    },
  ],
}));
jest.mock("../components/multiple-displays/utils.ts", () => ({
  XYPxOfDeg: jest.fn((_: number, xy: any) =>
    Array.isArray(xy[0])
      ? xy.map((point: number[]) => [point[0] * 40, point[1] * 40])
      : [xy[0] * 40, xy[1] * 40],
  ),
  XYDegOfPx: jest.fn((_: number, xy: any) =>
    Array.isArray(xy[0])
      ? xy.map((point: number[]) => [point[0] / 40, point[1] / 40])
      : [xy[0] / 40, xy[1] / 40],
  ),
}));

import {
  letterConfig,
  targetEccentricityDeg,
  targetKind,
  viewingDistanceCm,
} from "../components/global";
import { psychoJS } from "../components/globalPsychoJS";
import { Screens } from "../components/multiple-displays/globals.ts";
import { Rectangle } from "../components/utils";
import { paramReader } from "../parameters/paramReader";

const mockClearRect = jest.fn();
const mockGetContext = jest
  .spyOn(HTMLCanvasElement.prototype, "getContext")
  .mockReturnValue({ clearRect: mockClearRect } as any);

const {
  _getCharacterSetBoundingBox,
  clearBoundingBoxCanvasV1,
  constrainLevelByThresholdParameterMax,
  getLargestBoundsRatio,
  getTypographicLevelMax,
  restrictLevel,
  restrictSizeDeg,
  restrictSpacingDeg,
} =
  require("../components/bounding") as typeof import("../components/bounding");

const readMock = paramReader.read as unknown as jest.Mock;
const addDataMock = psychoJS.experiment.addData as unknown as jest.Mock;
let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

const makeCharacterRect = (width = 1, height = 1) => {
  const rect = new Rectangle(
    [-width / 2, -height / 2],
    [width / 2, height / 2],
    "pix",
  ) as any;
  rect.characterOffsetPxPerFontSize = 1 / 3;
  return rect;
};

const makeScreen = (width = 800, height = 600) =>
  new Rectangle([-width / 2, -height / 2], [width / 2, height / 2], "pix");

const runRestrictLevel = (overrides: Record<string, any> = {}) => {
  const o = {
    proposedLevel: Math.log10(2),
    thresholdParameter: "targetSizeDeg",
    characterSetRectPx: makeCharacterRect(),
    spacingDirection: "horizontal",
    spacingRelationToSize: "ratio",
    spacingSymmetry: "retina",
    spacingOverSizeRatio: 2,
    targetSizeIsHeightBool: true,
    spacingIsOuterBool: true,
    showTripletBoundingBox: false,
    ...overrides,
  };
  return restrictLevel(
    o.proposedLevel,
    o.thresholdParameter,
    o.characterSetRectPx,
    o.spacingDirection,
    o.spacingRelationToSize,
    o.spacingSymmetry,
    o.spacingOverSizeRatio,
    o.targetSizeIsHeightBool,
    o.spacingIsOuterBool,
    o.showTripletBoundingBox,
  );
};

const runRestrictSize = (overrides: Record<string, any> = {}) => {
  const o = {
    proposedLevel: Math.log10(2),
    targetXYDeg: [0, 0],
    targetKind: "letter",
    screenRectPx: makeScreen(),
    spacingRelationToSize: "ratio",
    targetSizeIsHeightBool: true,
    characterSetRectPx: makeCharacterRect(),
    spacingOverSizeRatio: 2,
    thresholdParameter: "targetSizeDeg",
    fixationRotationRadiusXYPx: [0, 0],
    ...overrides,
  };
  return restrictSizeDeg(
    o.proposedLevel,
    o.targetXYDeg,
    o.targetKind,
    o.screenRectPx,
    o.spacingRelationToSize,
    o.targetSizeIsHeightBool,
    o.characterSetRectPx,
    o.spacingOverSizeRatio,
    o.thresholdParameter,
    o.fixationRotationRadiusXYPx,
  );
};

const runRestrictSpacing = (overrides: Record<string, any> = {}) => {
  const o = {
    proposedLevel: Math.log10(2),
    targetXYDeg: [0, 0],
    targetKind: "letter",
    screenRectPx: makeScreen(),
    spacingRelationToSize: "ratio",
    targetSizeIsHeightBool: true,
    characterSetRectPx: makeCharacterRect(),
    spacingOverSizeRatio: 2,
    spacingSymmetry: "retina",
    thresholdParameter: "spacingDeg",
    spacingIsOuterBool: true,
    fixationRotationRadiusXYPx: [0, 0],
    showTripletBoundingBox: false,
    ...overrides,
  };
  return restrictSpacingDeg(
    o.proposedLevel,
    o.targetXYDeg,
    o.targetKind,
    o.screenRectPx,
    o.spacingRelationToSize,
    o.targetSizeIsHeightBool,
    o.characterSetRectPx,
    o.spacingOverSizeRatio,
    o.spacingSymmetry,
    o.thresholdParameter,
    o.spacingIsOuterBool,
    o.fixationRotationRadiusXYPx,
    o.showTripletBoundingBox,
  );
};

beforeEach(() => {
  Object.assign(letterConfig, {
    targetMinimumPix: 1,
    fontMaxPhysicalPx: 1000,
    targetSizeDeg: 1.5,
    spacingDirection: "horizontal",
  });
  Object.assign(targetEccentricityDeg, { x: 0, y: 0 });
  Object.assign(viewingDistanceCm, { current: 40, desired: 40 });
  targetKind.current = "letter";
  Screens[0].window._size = [800, 600];
  Screens[0].pxPerCm = 40;
  Screens[0].fixationConfig.pos = [0, 0];
  Screens[0].fixationConfig.markingFixationMotionRadiusDeg = 0;
  Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec = 0;
  Object.defineProperty(window, "devicePixelRatio", {
    value: 1,
    configurable: true,
  });
  readMock.mockReset().mockImplementation((name: string) => {
    if (name === "fontPadding" || name === "fontBoundingScalar") {
      return name === "fontPadding" ? 0 : 1;
    }
    if (name === "targetSizeDeg") return letterConfig.targetSizeDeg;
    return undefined;
  });
  addDataMock.mockClear();
  mockClearRect.mockClear();
  mockTextStims.length = 0;
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

afterAll(() => mockGetContext.mockRestore());

describe("_getCharacterSetBoundingBox", () => {
  it("normalizes font metrics and forwards text layout options", () => {
    const rect = _getCharacterSetBoundingBox(
      ["a", "b"],
      "TestFont",
      null,
      1,
      100,
      2,
      0.1,
      "kern",
      "ab",
    );

    expect(mockTextStims[0].config).toMatchObject({
      font: "TestFont",
      height: 100,
      padding: 2,
      letterSpacing: 10,
      kerning: "kern",
      characterSet: "ab",
    });
    expect(rect.toArray()).toEqual([
      [-0.25, -0.1],
      [0.25, 0.4],
    ]);
    expect(rect.xHeight).toBeCloseTo(0.25);
    expect(rect.spacing).toBeCloseTo(0.5);
    expect(rect.characterSetHeight).toBeCloseTo(0.5);
    expect(rect.characterOffsetPxPerFontSize).toBeCloseTo(1 / 6);
    expect(rect.typographicFactor).toBeCloseTo(0.5);
    expect(rect.ascentToDescent).toBeCloseTo(0.8);
  });

  it("measures repeated strings and singles, preserving per-text center offsets", () => {
    const rect = _getCharacterSetBoundingBox(["a"], "TestFont", null, 2, 100);

    expect(rect.toArray()).toEqual([
      [-0.5, -0.25],
      [0.5, 0.4],
    ]);
    expect(Object.keys(rect.centers).sort()).toEqual(["a", "aa"]);
    expect(rect.centers.aa[0]).toBeCloseTo(0);
    expect(rect.centers.aa[1]).toBeCloseTo(0.075);
    expect(rect.centers.a[0]).toBeCloseTo(0);
    expect(rect.centers.a[1]).toBeCloseTo(-0.075);
  });
});

describe("threshold maximum and canvas cleanup", () => {
  it.each([
    [3, 2],
    [1, 1],
  ])(
    "constrainLevelByThresholdParameterMax maps proposed level %s to %s and records it",
    (proposed, expected) => {
      const reader = { read: jest.fn(() => 100) };
      expect(
        constrainLevelByThresholdParameterMax(proposed, reader as any, "1_1"),
      ).toBe(expected);
      expect(reader.read).toHaveBeenCalledWith("thresholdParameterMax", "1_1");
      expect(addDataMock).toHaveBeenCalledWith(
        "levelConstrainedByThresholdParameterMax",
        expected,
      );
    },
  );

  it("clears the measurement canvas", () => {
    clearBoundingBoxCanvasV1();
    expect(mockClearRect).toHaveBeenCalledWith(0, 0, 300, 150);
  });
});

describe("getLargestBoundsRatio", () => {
  it("returns the largest target-relative screen bound ratio", () => {
    const stimulus = new Rectangle([-50, -25], [75, 100]);
    expect(
      getLargestBoundsRatio(
        stimulus,
        makeScreen(202, 202),
        [0, 0],
        "targetSizeDeg",
        "ratio",
      ),
    ).toBeCloseTo(1);
  });

  it("deducts fixed letter size when spacing alone scales", () => {
    const stimulus = new Rectangle([-60, -40], [80, 60]);
    expect(
      getLargestBoundsRatio(
        stimulus,
        makeScreen(202, 202),
        [0, 0],
        "spacingDeg",
        "none",
        20,
        20,
      ),
    ).toBeCloseTo(7 / 9);
  });

  it("rejects malformed rectangles and unsupported threshold parameters", () => {
    expect(() =>
      getLargestBoundsRatio(
        new Rectangle([1, 1], [-1, -1]),
        makeScreen(),
        [0, 0],
        "targetSizeDeg",
        "ratio",
      ),
    ).toThrow("stimulus width < 0");
    expect(() =>
      getLargestBoundsRatio(
        makeCharacterRect(),
        makeScreen(),
        [0, 0],
        "sizeDeg",
        "ratio",
      ),
    ).toThrow(/expects thresholdParameter/);
  });

  it("rejects off-screen targets and wholly non-positive bounds", () => {
    expect(() =>
      getLargestBoundsRatio(
        new Rectangle([10, 10], [20, 20]),
        new Rectangle([0, 0], [202, 202]),
        [0, 0],
        "targetSizeDeg",
        "ratio",
      ),
    ).toThrow(/Target is offscreen/);
    expect(() =>
      getLargestBoundsRatio(
        new Rectangle([0, 0], [0, 0]),
        makeScreen(),
        [0, 0],
        "targetSizeDeg",
        "ratio",
      ),
    ).toThrow("Largest ratio is non-positive.");
  });
});

describe("restrictLevel", () => {
  it.each([
    ["spacingDirection", "diagonal", /spacingDirection/],
    ["spacingRelationToSize", "fixed", /spacingRelationToSize/],
    ["spacingSymmetry", "symmetric", /spacingSymmetry/],
    ["thresholdParameter", "sizeDeg", /thresholdParameter/],
  ])("validates %s", (field, value, message) => {
    expect(() => runRestrictLevel({ [field]: value })).toThrow(message);
  });

  it("dispatches targetSizeDeg and returns its log level", () => {
    const [level, parameters] = runRestrictLevel();
    expect(level).toBeCloseTo(Math.log10(2));
    expect(parameters).toMatchObject({
      sizeDeg: 2,
      heightDeg: 2,
      heightPx: 80,
      widthPx: 80,
      targetAndFlankersXYPx: [[0, 0]],
    });
  });

  it("dispatches spacingDeg and returns foveal horizontal flankers", () => {
    const [level, parameters] = runRestrictLevel({
      thresholdParameter: "spacingDeg",
    });
    expect(level).toBeCloseTo(Math.log10(2));
    expect(parameters).toMatchObject({
      spacingDeg: 2,
      sizeDeg: 1,
      heightPx: 40,
      widthPx: 40,
      flankerXYDegs: [
        [-2, 0],
        [2, 0],
      ],
      targetAndFlankersXYPx: [
        [0, 0],
        [-80, 0],
        [80, 0],
      ],
    });
  });
});

describe("restrictSizeDeg", () => {
  it("supports width-based target sizes", () => {
    const [sizeDeg, parameters] = runRestrictSize({
      targetSizeIsHeightBool: false,
      characterSetRectPx: makeCharacterRect(2, 1),
    });
    expect(sizeDeg).toBeCloseTo(2);
    expect(parameters).toMatchObject({
      heightDeg: 1,
      heightPx: 40,
      widthPx: 80,
    });
  });

  it("raises size to meet targetMinimumPix", () => {
    letterConfig.targetMinimumPix = 100;
    const [sizeDeg, parameters] = runRestrictSize({ proposedLevel: 0 });
    expect(sizeDeg).toBeCloseTo(2.5);
    expect(parameters.heightPx).toBeCloseTo(100);
  });

  it("lowers size to meet fontMaxPhysicalPx", () => {
    letterConfig.fontMaxPhysicalPx = 60;
    const [sizeDeg, parameters] = runRestrictSize();
    expect(sizeDeg).toBeCloseTo(1.5);
    expect(parameters.heightPx).toBeCloseTo(60);
  });

  it("iteratively shrinks an off-screen target to the one-pixel screen margin", () => {
    const [sizeDeg, parameters] = runRestrictSize({
      proposedLevel: Math.log10(4),
      screenRectPx: makeScreen(100, 100),
    });
    expect(sizeDeg).toBeCloseTo(2.45);
    expect(parameters.heightPx).toBeCloseTo(98);
  });

  it("rejects unsupported target kinds", () => {
    expect(() => runRestrictSize({ targetKind: "gabor" })).toThrow(
      /targetKind must be letter/,
    );
  });
});

describe("restrictSpacingDeg size relations and directions", () => {
  it("keeps target size fixed when spacingRelationToSize is none", () => {
    const [spacingDeg, parameters] = runRestrictSpacing({
      spacingRelationToSize: "none",
    });
    expect(spacingDeg).toBeCloseTo(2);
    expect(parameters).toMatchObject({ sizeDeg: 1.5, heightPx: 60 });
  });

  it("derives typographic target size from spacing", () => {
    const [spacingDeg, parameters] = runRestrictSpacing({
      spacingRelationToSize: "typographic",
    });
    expect(spacingDeg).toBeCloseTo(2);
    expect(parameters).toMatchObject({
      spacingDeg: 2,
      sizeDeg: 6,
      heightDeg: 6,
      heightPx: 240,
      widthPx: 240,
      targetAndFlankersXYPx: [[0, 0]],
      flankerXYDegs: [],
    });
  });

  it.each(["retina", "screen"])(
    "places equal inner and outer radial flankers with %s symmetry",
    (spacingSymmetry) => {
      letterConfig.spacingDirection = "radial";
      const [, parameters] = runRestrictSpacing({
        targetXYDeg: [5, 0],
        spacingSymmetry,
      });
      expect(parameters.flankerXYDegs).toEqual([
        [7, 0],
        [3, 0],
      ]);
    },
  );

  it("uses cortical magnification for inner radial spacing", () => {
    letterConfig.spacingDirection = "radial";
    const [, parameters] = runRestrictSpacing({
      targetXYDeg: [5, 0],
      spacingSymmetry: "cortex",
    });
    const eccentricity = 5;
    const outer = 2;
    const cortical =
      Math.log10(eccentricity + outer + 0.15) - Math.log10(eccentricity + 0.15);
    const innerEccentricity =
      Math.pow(10, Math.log10(eccentricity + 0.15) - cortical) - 0.15;
    const inner = eccentricity - innerEccentricity;
    expect(parameters.flankerXYDegs[0][0]).toBeCloseTo(7);
    expect(parameters.flankerXYDegs[1][0]).toBeCloseTo(5 - inner);
  });

  it("places tangential flankers around a peripheral target", () => {
    letterConfig.spacingDirection = "tangential";
    const [, parameters] = runRestrictSpacing({ targetXYDeg: [5, 0] });
    expect(parameters.flankerXYDegs).toEqual([
      [5, 2],
      [5, -2],
    ]);
  });

  it("places all four flankers for combined directions", () => {
    letterConfig.spacingDirection = "horizontalAndVertical";
    const [, foveal] = runRestrictSpacing();
    expect(foveal.flankerXYDegs).toEqual([
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]);

    letterConfig.spacingDirection = "radialAndTangential";
    const [, peripheral] = runRestrictSpacing({ targetXYDeg: [5, 0] });
    expect(peripheral.flankerXYDegs).toEqual([
      [7, 0],
      [3, 0],
      [5, 2],
      [5, -2],
    ]);
  });

  it.each([
    [[0, 0], "radial", /Radial flankers/],
    [[0, 0], "tangential", /Tangential flankers/],
    [[0, 0], "radialAndTangential", /Radial and tangential flankers/],
    [[5, 0], "horizontal", /Horizontal flankers/],
    [[5, 0], "vertical", /Vertical flankers/],
    [[5, 0], "horizontalAndVertical", /Horizontal and vertical flankers/],
  ])(
    "rejects %s direction at target %s",
    (targetXYDeg, spacingDirection, message) => {
      letterConfig.spacingDirection = spacingDirection;
      expect(() => runRestrictSpacing({ targetXYDeg })).toThrow(message);
    },
  );

  it("requires fixed target size and a supported target kind", () => {
    letterConfig.targetSizeDeg = undefined;
    expect(() => runRestrictSpacing({ spacingRelationToSize: "none" })).toThrow(
      /Must provide value for targetSizeDeg/,
    );
    expect(() => runRestrictSpacing({ targetKind: "gabor" })).toThrow(
      /targetKind must be letter/,
    );
  });
});

describe("restrictSpacingDeg physical and screen limits", () => {
  it("raises ratio-linked spacing to meet targetMinimumPix", () => {
    letterConfig.targetMinimumPix = 100;
    const [spacingDeg, parameters] = runRestrictSpacing();
    expect(spacingDeg).toBeCloseTo(5);
    expect(parameters.heightPx).toBeCloseTo(100);
  });

  it("lowers ratio-linked spacing to meet fontMaxPhysicalPx", () => {
    letterConfig.fontMaxPhysicalPx = 60;
    const [spacingDeg, parameters] = runRestrictSpacing({
      proposedLevel: Math.log10(4),
    });
    expect(spacingDeg).toBeLessThan(4);
    expect(parameters.heightPx).toBeLessThanOrEqual(60);
    expect(parameters.sizeDeg).toBeCloseTo(spacingDeg / 2);
  });

  it("rejects a fixed target size above fontMaxPhysicalPx", () => {
    letterConfig.fontMaxPhysicalPx = 60;
    letterConfig.targetSizeDeg = 2;
    expect(() => runRestrictSpacing({ spacingRelationToSize: "none" })).toThrow(
      /targetSizeDeg 2 greater than largest allowed sizeDeg/,
    );
  });

  it("iteratively reduces off-screen ratio-linked spacing", () => {
    const [spacingDeg, parameters] = runRestrictSpacing({
      proposedLevel: Math.log10(4),
      spacingOverSizeRatio: 4,
      screenRectPx: makeScreen(100, 100),
    });
    expect(spacingDeg).toBeCloseTo(49 / 45);
    expect(parameters.heightPx).toBeCloseTo((49 / 45) * 10);
  });

  it("uses the largest realizable typographic level when the request is off-screen", () => {
    Screens[0].window._size = [200, 200];
    const [spacingDeg, parameters] = runRestrictSpacing({
      spacingRelationToSize: "typographic",
      screenRectPx: makeScreen(200, 200),
    });
    expect(spacingDeg).toBeCloseTo(5 / 3);
    expect(parameters).toMatchObject({
      spacingDeg,
      sizeDeg: 5,
      heightDeg: 5,
      heightPx: 200,
      widthPx: 200,
      flankerXYDegs: [],
    });
  });
});

describe("getTypographicLevelMax", () => {
  it.each([
    [1000, 20],
    [8, 8],
  ])(
    "applies targetMinimumPix, then lets fontMaxPhysicalPx=%s cap the result at %s",
    (fontMaxPhysicalPx, expected) => {
      Screens[0].window._size = [20, 20];
      letterConfig.targetMinimumPix = 20;
      letterConfig.fontMaxPhysicalPx = fontMaxPhysicalPx;
      const result = getTypographicLevelMax(makeCharacterRect(2, 2), false);
      expect(result.fontSizeMaxPx).toBe(expected);
      expect(result.spacingMaxDeg).toBeCloseTo(expected / 120);
      expect(result.levelMax).toBeCloseTo(Math.log10(expected / 120));
    },
  );
});
