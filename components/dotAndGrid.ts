import { XYDegOfXYPix, XYPixOfXYDeg, pxScalar } from "./utils";
import { ShapeStim, Polygon } from "../psychojs/src/visual";
import { psychoJS } from "./globalPsychoJS";
import { util } from "../psychojs/src";
import { PsychoJS } from "../psychojs/src/core";
import { Color } from "../psychojs/src/util";
import { fixationConfig } from "./global";

function randomPointOnUnitVector(): number[] {
  const theta = Math.random() * 2 * Math.PI;
  return [Math.cos(theta), Math.sin(theta)];
}
function randomPointInUnitCircle() {
  let x, y;
  do {
    x = Math.random() * 2 - 1; // A sample between -1 and 1.
    y = Math.random() * 2 - 1; // "
  } while (x * x + y * y > 1); // Replace if outside the circle.
  return [x, y];
}
/**
 * Map from 0-1 to -1-1
 */
function denisRBGColorSpaceToPsychoJS(rgb: number[]): number[] {
  return rgb.map((x) => x * 2 - 1);
}
export const getFlies = (
  showFlies: string,
  gravity: string,
): Swarm | undefined => {
  let swarm: Swarm | undefined;

  // NOTE update preprocess/experimentFileChecks.ts/areMarkDotGridAndFLiesParamsCorrectLength() if this specification changes
  if (showFlies.split(",").length === 10) {
    const [
      n,
      radiusDeg,
      degPerSec,
      centeredOnNominalFixationBool,
      thicknessDeg,
      lengthDeg,
      ...colorRGBA
    ] = showFlies.split(",");
    const colorRGBAStr = colorRGBA.join(",");
    swarm = new Swarm(
      Number(n),
      Number(radiusDeg),
      Number(degPerSec),
      centeredOnNominalFixationBool.toLowerCase() === "true",
      Number(thicknessDeg),
      Number(lengthDeg),
      colorRGBAStr,
      Number(gravity),
    );
  }
  return swarm;
};

export const getDotAndBackGrid = (
  showDot: string,
  showBackGrid: string,
): [Dot | undefined, BackGrid | undefined] => {
  let dot: Dot | undefined;
  let grid: BackGrid | undefined;

  // NOTE update preprocess/experimentFileChecks.ts/areMarkDotGridAndFLiesParamsCorrectLength() if this specification changes
  if (showDot.split(",").length === 7) {
    const [xDeg, yDeg, diameterDeg, ...colorRGBA] = showDot.split(",");
    const colorRGBAStr = colorRGBA.join(",");
    const [xPx, yPx] = XYPixOfXYDeg([xDeg, yDeg], false);
    const pos: [number, number] = [xPx, yPx];
    dot = new Dot(pos, Number(diameterDeg), colorRGBAStr);
  }

  // NOTE update preprocess/experimentFileChecks.ts/areMarkDotGridAndFLiesParamsCorrectLength() if this specification changes
  if (showBackGrid.split(",").length === 7) {
    const [spacingDeg, thicknessDeg, lengthDeg, ...colorRGBA] =
      showBackGrid.split(",");
    const [xPx, yPx] = XYPixOfXYDeg([0, 0], false);
    grid = new BackGrid({
      spacingDeg: Number(spacingDeg),
      thicknessDeg: Number(thicknessDeg),
      lengthDeg: Number(lengthDeg),
      xCenterPx: Number(xPx),
      yCenterPx: Number(yPx),
      colorRGBA: colorRGBA.join(","),
    });
  }
  return [dot, grid];
};

class Fly {
  id: number;
  center: number[];
  radiusPx: number;
  pxStep: number;
  thicknessPx: number;
  lengthPx: number;
  color: number[];
  opacity: number;
  pos: number[];
  stims: ShapeStim[];
  constructor(
    i: number,
    center: number[],
    radiusPx: number,
    pxStep: number,
    thicknessPx: number,
    lengthPx: number,
    colorRGBA: string,
  ) {
    this.id = i;
    this.center = center;
    this.radiusPx = radiusPx;
    this.pos = this.getRandomPosition();
    this.pxStep = pxStep;
    this.thicknessPx = thicknessPx;
    this.lengthPx = lengthPx;

    let colorArray = colorRGBA.split(",");
    this.color = denisRBGColorSpaceToPsychoJS(
      colorArray.slice(0, 3).map((c) => Number(c)),
    );
    this.opacity = Number(colorArray[3]);

    this.stims = this.generateStims();
  }
  draw(bool = true) {
    this.stims.forEach((s) => s.setAutoDraw(bool));
  }
  generateStims(): ShapeStim[] {
    return [
      // @ts-ignore
      new ShapeStim({
        name: `fly-${this.id}-horizontal`,
        win: psychoJS.window as unknown as Window,
        units: "pix",
        lineWidth: this.thicknessPx,
        //@ts-ignore
        fillColor: new util.Color(this.color, Color.COLOR_SPACE.RGB),
        //@ts-ignore
        lineColor: new util.Color(this.color, Color.COLOR_SPACE.RGB),
        closeShape: false,
        opacity: this.opacity,
        vertices: [
          [-0.5, 0],
          [0.5, 0],
        ],
        depth: 1,
        ori: 0.0,
        pos: this.pos,
        interpolate: false,
        size: this.lengthPx,
        autoLog: true,
        autoDraw: false,
      }),
      // @ts-ignore
      new ShapeStim({
        name: `fly-${this.id}-vertical`,
        win: psychoJS.window as unknown as Window,
        units: "pix",
        lineWidth: this.thicknessPx,
        //@ts-ignore
        fillColor: new util.Color(this.color, Color.COLOR_SPACE.RGB),
        //@ts-ignore
        lineColor: new util.Color(this.color, Color.COLOR_SPACE.RGB),
        closeShape: false,
        opacity: this.opacity,
        vertices: [
          [0, -0.5],
          [0, 0.5],
        ],
        depth: 1,
        ori: 0.0,
        pos: this.pos,
        interpolate: false,
        size: this.lengthPx,
        autoLog: true,
        autoDraw: false,
      }),
    ];
  }

  takeStep(newCenter: number[]) {
    this.center = newCenter;

    const directionVector = randomPointOnUnitVector();
    this.pos = this.pos.map((z, i) => z + directionVector[i] * this.pxStep);
    if (!this.closeEnough()) this.pos = this.getRandomPosition();
    this.stims.forEach((s) => s.setPos(this.pos));
  }
  closeEnough(): boolean {
    return this.distanceFromCenter() <= this.radiusPx;
  }
  distanceFromCenter(): number {
    return Math.sqrt(
      Math.pow(this.pos[0] - this.center[0], 2) +
        Math.pow(this.pos[1] - this.center[1], 2),
    );
  }
  getRandomPosition(): number[] {
    const r = this.radiusPx * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const x = this.center[0] + r * Math.cos(theta);
    const y = this.center[1] + r * Math.sin(theta);
    return [x, y];
  }
}
class Swarm {
  n: number;
  centeredOnNominalFixationBool: boolean;
  radiusPx: number;
  degPerSec: number;
  thicknessPx: number;
  lengthPx: number;
  colorRGBA: string;
  center: number[];
  flies: Fly[];
  stims: ShapeStim[];
  status: PsychoJS.Status;
  markFliesGravity: number;
  constructor(
    n = 10,
    radiusDeg = 2,
    degPerSec = 1,
    centeredOnNominalFixationBool = true,
    thicknessDeg = 0.03,
    lengthDeg = 1,
    colorRGBA = "0,0,0,1",
    markFliesGravity = 0,
  ) {
    this.n = n;
    this.status = PsychoJS.Status.NOT_STARTED;
    this.centeredOnNominalFixationBool = centeredOnNominalFixationBool;
    // TODO ought this depend on this.centeredOnNominalFixationBool?
    this.radiusPx = pxScalar(radiusDeg);
    this.degPerSec = degPerSec;
    this.thicknessPx = pxScalar(thicknessDeg);
    this.lengthPx = pxScalar(lengthDeg);
    this.colorRGBA = colorRGBA;

    this.center = this.getCenter();
    this.markFliesGravity = markFliesGravity;
    this.flies = this.spawnFlies();
    this.stims = this.flies.map((f) => f.stims).flat();
  }
  draw(bool = true) {
    this.status = bool ? PsychoJS.Status.STARTED : PsychoJS.Status.FINISHED;
    this.flies.forEach((f) => f.draw(bool));
  }
  getCenter(): number[] {
    return this.centeredOnNominalFixationBool
      ? fixationConfig.nominalPos
      : fixationConfig.pos;
  }
  spawnFlies(): Fly[] {
    //@ts-ignore
    const fHz = psychoJS.window.getActualFrameRate();
    const stepPx: number = pxScalar(this.degPerSec / fHz);
    return [...new Array(this.n).keys()].map(
      (i) =>
        new Fly(
          i,
          this.center,
          this.radiusPx,
          stepPx,
          this.thicknessPx,
          this.lengthPx,
          this.colorRGBA,
        ),
    );
  }

  applyGravity() {
    //@ts-ignore
    const fHz = psychoJS.window.getActualFrameRate();
    const flyXYDeg = [];
    for (let i = 0; i < this.flies.length; i++) {
      flyXYDeg[i] = XYDegOfXYPix([this.flies[i].pos[0], this.flies[i].pos[1]]);
    }
    for (let i = 0; i < this.flies.length; i++) {
      for (let j = i + 1; j < this.flies.length; j++) {
        const dx = flyXYDeg[i][0] - flyXYDeg[j][0];
        const dy = flyXYDeg[i][1] - flyXYDeg[j][1];
        const distanceSquared = dx * dx + dy * dy;
        const dDeg = Math.sqrt(distanceSquared);

        let hDeg = 0;
        if (dDeg > 0) {
          hDeg = this.markFliesGravity / (fHz * distanceSquared);
        }

        const gravityVectorXDeg = hDeg * dx;
        const gravityVectorYDeg = hDeg * dy;

        if (this.markFliesGravity > 0) {
          flyXYDeg[i][0] += gravityVectorXDeg;
          flyXYDeg[i][1] += gravityVectorYDeg;
        } else {
          flyXYDeg[i][0] -= gravityVectorXDeg;
          flyXYDeg[i][1] -= gravityVectorYDeg;
        }

        if (this.markFliesGravity > 0) {
          flyXYDeg[j][0] -= gravityVectorXDeg;
          flyXYDeg[j][1] -= gravityVectorYDeg;
        } else {
          flyXYDeg[j][0] += gravityVectorXDeg;
          flyXYDeg[j][1] += gravityVectorYDeg;
        }

        this.flies[i].pos = XYPixOfXYDeg([flyXYDeg[i][0], flyXYDeg[i][1]]);
        this.flies[j].pos = XYPixOfXYDeg([flyXYDeg[j][0], flyXYDeg[j][1]]);
      }
    }
  }

  everyFrame() {
    if (this.markFliesGravity !== 0) {
      this.applyGravity();
    }
    this.center = this.getCenter();
    this.flies.forEach((f) => f.takeStep(this.center));
  }
}

class Dot {
  pos: number[];
  diameterPx: number;
  color: number[];
  opacity: number;
  status: PsychoJS.Status;
  stim: Polygon;
  constructor(pos: [number, number], diameterDeg: number, colorRGBA: string) {
    this.pos = pos;
    this.diameterPx =
      XYPixOfXYDeg([-diameterDeg / 2, 0])[0] -
      XYPixOfXYDeg([diameterDeg / 2, 0])[0];
    // @ts-ignore
    let colorArray = colorRGBA.split(",");
    this.color = denisRBGColorSpaceToPsychoJS(
      colorArray.slice(0, 3).map((c) => Number(c)),
    );
    this.opacity = Number(colorArray[3]);
    this.status = PsychoJS.Status.NOT_STARTED;
    // @ts-ignore
    this.stim = new Polygon({
      name: "stimulusDot",
      win: psychoJS.window as unknown as Window,
      units: "pix",
      edges: 360,
      radius: this.diameterPx / 2,
      ori: 0,
      size: 1,
      pos: this.pos,
      lineWidth: 1,
      // @ts-ignore
      lineColor: new util.Color(this.color, Color.COLOR_SPACE.RGB),
      // @ts-ignore
      fillColor: new util.Color(this.color, Color.COLOR_SPACE.RGB),
      opacity: this.opacity,
      depth: 1,
      interpolate: true,
      autoLog: true,
      autoDraw: false,
    });
  }
  draw(bool = true) {
    this.stim.setAutoDraw(bool);
    this.status = bool ? PsychoJS.Status.STARTED : PsychoJS.Status.FINISHED;
  }
}

let lineVertices = new Map([
  [
    "vertical",
    [
      [0, -1],
      [0, 1],
    ],
  ],
  [
    "horizontal",
    [
      [-1, 0],
      [1, 0],
    ],
  ],
]);

// Defines a square grid, static background stimulus
interface backGrid {
  spacingDeg: number;
  thicknessDeg: number;
  lengthDeg: number;
  xCenterPx: number;
  yCenterPx: number;
  colorRGBA: string;
}

class BackGrid {
  spacingDeg: number;
  spacingPx: number;
  thicknessDeg: number;
  thicknessPx: number;
  lengthDeg: number;
  lengthPx: number;
  xyCenterPx: number[];
  color: number[];
  opacity: number;
  nLines: number;
  status: PsychoJS.Status;
  stims: ShapeStim[];
  constructor(config: backGrid) {
    this.spacingDeg = config.spacingDeg;
    this.spacingPx = pxScalar(this.spacingDeg);
    this.thicknessDeg = config.thicknessDeg;
    this.thicknessPx = pxScalar(this.thicknessDeg);
    this.lengthDeg = config.lengthDeg;
    this.lengthPx = pxScalar(this.lengthDeg);
    this.xyCenterPx = [config.xCenterPx, config.yCenterPx];
    let colorArray = config.colorRGBA.split(",");
    this.color = denisRBGColorSpaceToPsychoJS(
      colorArray.slice(0, 3).map((c) => Number(c)),
    );
    this.opacity = Number(colorArray[3]);
    this.nLines = this.getNumberOfGridLines();
    this.status = PsychoJS.Status.NOT_STARTED;
    this.stims = this.getGridStims();
  }
  draw(bool = true) {
    this.stims.forEach((s) => s.setAutoDraw(bool));
    this.status = bool ? PsychoJS.Status.STARTED : PsychoJS.Status.FINISHED;
  }
  getGridStims(): ShapeStim[] {
    // Denis-coords, ie origin at fixation with psychojs axes
    const xy = this.xyCenterPx;
    const lineIds = [...new Array(this.nLines).keys()].map(
      (i) => i - Math.floor(this.nLines / 2),
    );
    let gridLines: ShapeStim[] = [];
    for (const orientation of ["vertical", "horizontal"]) {
      for (let n = 0; n < this.nLines; n++) {
        const id = lineIds[n];
        const pos =
          orientation === "vertical"
            ? [xy[0] + id * this.spacingPx + this.spacingPx / 2, xy[1]]
            : [xy[0], xy[1] + id * this.spacingPx + this.spacingPx / 2];
        const vertices = lineVertices.get(orientation);
        gridLines.push(
          // @ts-ignore
          new ShapeStim({
            name: `grid-stim-line-${n}-${orientation}`,
            win: psychoJS.window as unknown as Window,
            units: "pix",
            lineWidth: this.thicknessPx,
            fillColor: new util.Color("black"),
            lineColor: new util.Color("black"),
            closeShape: false,
            opacity: 1.0,
            vertices: vertices,
            depth: 1,
            ori: 0.0,
            pos: pos,
            interpolate: false,
            size: this.lengthPx,
            autoLog: true,
            autoDraw: false,
          }),
        );
      }
    }
    return gridLines;
  }
  getNumberOfGridLines() {
    return Math.floor(this.lengthDeg / this.spacingDeg) + 1;
  }
}
