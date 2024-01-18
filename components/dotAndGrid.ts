import {
  getAppleCoordinatePosition,
  getPsychoJSCoordinatePositionFromAppleCoordinatePosition,
} from "./eyeTrackingFacilitation";
import { XYPixOfXYDeg, XYDegOfXYPix } from "./utils";
import { ShapeStim, Polygon } from "../psychojs/src/visual";
import { psychoJS } from "./globalPsychoJS";
import { util } from "../psychojs/src";
import { PsychoJS } from "../psychojs/src/core";
import { Color } from "../psychojs/src/util";

export const getDotAndBackGrid = (
  showDot: string,
  showBackGrid: string
): [Dot | undefined, BackGrid | undefined] => {
  let dot: Dot | undefined;
  let grid: BackGrid | undefined;

  if (showDot.split(",").length === 7) {
    const [xPix, yPix, diameterDeg, ...colorRGBA] = showDot.split(",");
    const colorRGBAStr = colorRGBA.join(",");
    const pos: [number, number] = [Number(xPix), Number(yPix)];
    dot = new Dot(pos, Number(diameterDeg), colorRGBAStr);
  }

  if (showBackGrid.split(",").length === 5) {
    const [spacingDeg, thicknessDeg, lengthDeg, xCenterPx, yCenterPx] =
      showBackGrid.split(",");
    grid = new BackGrid({
      spacingDeg: Number(spacingDeg),
      thicknessDeg: Number(thicknessDeg),
      lengthDeg: Number(lengthDeg),
      xCenterPx: Number(xCenterPx),
      yCenterPx: Number(yCenterPx),
    });
  }
  return [dot, grid];
};

class Dot {
  pos: number[];
  diameterPx: number;
  color: number[];
  opacity: number;
  status: PsychoJS.Status;
  stim: Polygon;
  constructor(pos: [number, number], diameterDeg: number, colorRGBA: string) {
    this.pos = getPsychoJSCoordinatePositionFromAppleCoordinatePosition(
      pos[0],
      pos[1]
    );
    this.diameterPx =
      XYPixOfXYDeg([-diameterDeg / 2, 0])[0] -
      XYPixOfXYDeg([diameterDeg / 2, 0])[0];
    // @ts-ignore
    let colorArray = colorRGBA.split(",");
    this.color = colorArray.slice(0, 3).map((c) => Number(c));
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
      lineColor: new util.Color(this.color, Color.COLOR_SPACE.RGB255),
      // @ts-ignore
      fillColor: new util.Color(this.color, Color.COLOR_SPACE.RGB255),
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
}

class BackGrid {
  spacingDeg: number;
  spacingPx: number;
  thicknessDeg: number;
  thicknessPx: number;
  lengthDeg: number;
  lengthPx: number;
  xyCenterPxApple: number[];
  xyCenterPxPsychoJS: number[];
  nLines: number;
  status: PsychoJS.Status;
  stims: ShapeStim[];
  constructor(config: backGrid) {
    // Arbitrary? I don't think this is well defined?
    let pxScalar = (degScalar: number) =>
      Math.abs(
        XYPixOfXYDeg([-degScalar / 2, 0])[0] -
          XYPixOfXYDeg([degScalar / 2, 0])[0]
      );
    this.spacingDeg = config.spacingDeg;
    this.spacingPx = pxScalar(this.spacingDeg);
    this.thicknessDeg = config.thicknessDeg;
    this.thicknessPx = pxScalar(this.thicknessDeg);
    this.lengthDeg = config.lengthDeg;
    this.lengthPx = pxScalar(this.lengthDeg);
    // Apple coordinates, ie origin top left
    this.xyCenterPxApple = [config.xCenterPx, config.yCenterPx];
    // PsychoJS coordinates, ie origin center of screen
    this.xyCenterPxPsychoJS =
      getPsychoJSCoordinatePositionFromAppleCoordinatePosition(
        config.xCenterPx,
        config.yCenterPx
      );
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
    const xy = this.xyCenterPxPsychoJS;
    const lineIds = [...new Array(this.nLines).keys()].map(
      (i) => i - Math.floor(this.nLines / 2)
    );
    let gridLines: ShapeStim[] = [];
    for (const orientation of ["vertical", "horizontal"]) {
      for (let n = 0; n < this.nLines; n++) {
        const id = lineIds[n];
        const pos =
          orientation === "vertical"
            ? [xy[0] + id * this.spacingPx, xy[1]]
            : [xy[0], xy[1] + id * this.spacingPx];
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
          })
        );
      }
    }
    return gridLines;
  }
  getNumberOfGridLines() {
    return Math.floor(this.lengthDeg / this.spacingDeg) + 1;
  }
}
