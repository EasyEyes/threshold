import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";
import { grid, fixationConfig } from "./global.js";
import { logger, XYDegOfXYPix_OLD, XYPixOfXYDeg_OLD } from "./utils.js";

import { degreesToPixels, xyPxOfDeg, xyDegOfPx, isInRect } from "./utils.js";

const ptMultiplier = 24;
const inMultiplier = 1 / 5;
const fat = 5;
const thin = 1;

/*
GRIDS. Participant page.
For verification, provide optional grids over the whole screen.
Each grid should be labeled  with numbers and units on the major axes.
The "cm" grid has cm units, origin in lower left, thick lines at
5 cm, and regular lines at 1 cm. The "deg" grid has deg units,
origin at fixation, thick lines at 5 deg, and regular lines at 1
deg. The "pix" grid has pix units, origin at lower left, thick
lines at 500 pix, and regular lines at 100 pix.
*/
export class Grid {
  /**
   * Setup the grid.
   * @param {("px" | "cm" | "deg" | "degDynamic" | "none")} units Which type of grid should be shown.
   * @param {object} displayOptions Current values about the screen, trial, etc
   * @param {PsychoJS} psychoJS PsychoJS instance for the experiment
   */
  constructor(units, displayOptions, psychoJS) {
    this.units = units ? units : "none";
    this.displayOptions = displayOptions;
    this.psychoJS = psychoJS;
    this.visible = false;
    this.allGrids = {};
    this.lines = [];
    this.labels = [];
    this.opacity = 0.9;
    this.dimensions = this.psychoJS.window._size;
    this.gridkey = { key: ["`", "~"], code: "Backquote", keyCode: 192 };

    this.spawnGridStims();

    window.onkeydown = (e) => {
      if (e.code === this.gridkey.code || this.gridkey.key.includes(e.key)) {
        this.cycle();
        if (psychoJS && psychoJS.experiment)
          psychoJS.experiment.addData("cycledGridTo", this.units);
      }
      e.stopPropagation();
    };
    // EXPERIMENTAL window.onresize = (e) => this.update();
    this._reflectVisibility();
  }

  /**
   * Re-spawn grids, given new `displayOptions` values (eg to reflect a new viewing distance)
   * and optionally change which is the current grid
   */
  update(units = undefined, displayOptions = undefined) {
    if (units) {
      this.units = units;
      grid.units = units; // Persist selected grid across rerunning trialInstructionRoutineBegin
    }
    if (displayOptions) this.displayOptions = displayOptions;
    if (this.units === "disabled") return;
    this.visible = true;
    this._undraw();
    this.spawnGridStims();
    [this.lines, this.labels] = this.allGrids[this.units];
    this._reflectVisibility(); // Draw new stims if visible==true
  }

  /**
   * Grid ought to be shown.
   * Set `visible` to reflect this desire, and call `_draw()` to draw the stims.
   */
  show() {
    this.visible = true;
    this._draw();
  }

  /**
   * Grid ought not be shown.
   * Set `visible` to reflect this desire, and call `_undraw()` to remove the stims.
   */
  hide() {
    this.visible = false;
    this._undraw();
  }
  /**
   * Change to showing the grid corresponding to the next units
   * [Triggered on relevant keypress, ie tilde]
   */
  cycle() {
    this._undraw();
    this.units = this._cycleUnits(this.units);
    grid.units = this.units;
    this.spawnGridStims(this.units);
    [this.lines, this.labels] = this.allGrids[this.units];
    this._reflectVisibility();
  }

  /**
   * Generate the stims for the grid, and store in `this._allGridStims`.
   * Generates all grids if now parameter is provided, or else just the provided unit's grid.
   */
  spawnGridStims(units = undefined) {
    if (units) this.allGrids[units] = this._getGridStims(units);
    else
      for (const unit of [
        "px",
        "pt",
        "cm",
        "in",
        "deg",
        "degDynamic",
        "mmV4",
        "none",
        "disabled",
      ]) {
        this.allGrids[unit] = this._getGridStims(unit);
      }
  }

  /**
   * Set autoDraw=false for all lines&labels of the current grid.
   */
  _undraw() {
    const stims = [...this.lines, ...this.labels];
    stims.forEach((s) => {
      if (s) s.setAutoDraw(false);
    });
  }

  /**
   * Set autoDraw=ture for all lines&labels of the current grid.
   */
  _draw() {
    const stims = [...this.lines, ...this.labels];
    stims.forEach((s) => {
      if (s) s.setAutoDraw(true);
    });
  }

  /**
   * Set autoDraw of all stims ot the current value of `visible`,
   * ie `_draw` if `visible===true`, else `_undraw`
   */
  _reflectVisibility() {
    if (this.visible) {
      this._draw();
    } else {
      this._undraw();
    }
  }

  _getGridStims(units) {
    switch (units) {
      case "px":
        return this._getPixelGridStims();
      case "pt":
        return this._getPointGridStims();
      case "cm":
        return this._getCmGridStims();
      case "in":
        return this._getInchGridStims();
      case "deg":
        return this._getDegGridStims(false);
      case "degDynamic":
        return this._getDegGridStims(true);
      case "mmV4":
        return this._getMmGridStims();
      case "none":
        return [[], []];
      case "disabled":
        return [[], []];
    }
  }

  _getNumberOfGridLines = (units, dynamic = false) => {
    this.dimensionsCm = this.dimensions.map(
      (dim) => dim / this.displayOptions.pixPerCm,
    );
    this.dimensionsIn = this.dimensionsCm.map((dim) => dim / 2.54);
    this.dimensionsPt = this.dimensionsIn.map((dim) => dim * 72);
    const [w, h] = this.dimensions;
    // ie psychojs pix units
    const fixationXYPx = dynamic
      ? fixationConfig.pos
      : fixationConfig.nominalPos;

    //ie of fixation
    // const pxToTheLeft = fixationXYPx[0] + w/2;
    // const pxToTheRight = w - pxToTheLeft;
    // const pxDown = fixationXYPx[1] + h/2;
    // const pxUp = h - pxDown;

    this.dimensionsDeg = [
      // right, left
      [xyDegOfPx([w, 0], dynamic)[0], xyDegOfPx([-w, 0], dynamic)[0]],
      // lower, upper
      [xyDegOfPx([0, -h], dynamic)[1], xyDegOfPx([0, h], dynamic)[1]],
    ];

    switch (units) {
      case "px":
        return this.dimensions.map((dim) => Math.floor(dim / 100) + 1);
      case "pt":
        return this.dimensionsPt.map(
          (dim) => (Math.floor(dim) + 1) / ptMultiplier,
        );
      case "in":
        return this.dimensionsIn.map(
          (dim) => (Math.floor(dim) + 1) / inMultiplier,
        );
      case "cm":
        return this.dimensionsCm.map((dim) => Math.floor(dim) + 1);
      case "deg":
        return this.dimensionsDeg.map((dims) =>
          dims.map((dim) => Math.ceil(Math.abs(dim)) + 1),
        );
    }
  };

  _cycleUnits(previousUnits) {
    switch (previousUnits) {
      case "none":
        return "px";
      case "px":
        return "pt";
      case "pt":
        return "cm";
      case "cm":
        return "in";
      case "in":
        return "degDynamic";
      case "degDynamic":
        return "deg";
      case "deg":
        return "mmV4";
      case "mmV4":
        return "none";
      case "disabled":
        return "disabled";
    }
    return "none";
  }

  _getPixelGridStims = () => {
    const spacing = 100;
    const origin = [
      -Math.round(this.dimensions[0] / 2),
      -Math.round(this.dimensions[1] / 2),
    ];
    const numberOfGridLines = this._getNumberOfGridLines("px");
    const [lines, labels] = [[], []];
    for (const region of ["vertical", "horizontal"]) {
      const nGridlines =
        region === "vertical" ? numberOfGridLines[0] : numberOfGridLines[1];
      for (let i = 0; i < nGridlines; i++) {
        const vertices =
          region === "vertical"
            ? [
                [
                  +(origin[0] + i * spacing),
                  +Math.round(this.dimensions[1] / 2),
                ],
                [
                  +(origin[0] + i * spacing),
                  -Math.round(this.dimensions[1] / 2),
                ],
              ]
            : [
                [
                  +Math.round(this.dimensions[0] / 2),
                  +(origin[1] + i * spacing),
                ],
                [
                  -Math.round(this.dimensions[0] / 2),
                  +(origin[1] + i * spacing),
                ],
              ];
        const pos =
          region === "vertical"
            ? [origin[0] + i * spacing + 3, origin[1]]
            : [origin[0] + 3, origin[1] + i * spacing];
        const lineName = `${region}-grid-line-${i}`;
        lines.push(
          new visual.ShapeStim({
            name: lineName,
            win: this.psychoJS.window,
            units: "pix",
            lineWidth: i % 5 === 0 ? fat : thin,
            lineColor: new util.Color(getColor("px")),
            // fillColor: new util.Color("black"),
            opacity: this.opacity,
            vertices: vertices,
            depth: -999999,
            ori: 0.0,
            interpolate: false,
            size: 1,
            autoLog: false,
          }),
        );
        if (i % 5 === 0)
          labels.push(
            new visual.TextStim({
              name: `${region}-grid-line-label-${i}`,
              win: this.psychoJS.window,
              text: `${spacing * i} px`,
              font: "Arial",
              units: "pix",
              pos: pos,
              alignHoriz: "left",
              alignVert: "bottom",
              height: 8,
              ori: 0.0,
              color: new util.Color(getColor("px")),
              opacity: 1.0,
              depth: 0.0,
              autoLog: false,
            }),
          );
      }
    }
    return [lines, labels];
  };

  _getFixedSpacingGrid = (spacing, unit) => {
    const origin = [
      -Math.round(this.dimensions[0] / 2),
      -Math.round(this.dimensions[1] / 2),
    ];
    const numberOfGridLines = this._getNumberOfGridLines(unit);
    const color = getColor(unit);
    const [lines, labels] = [[], []];
    for (const region of ["vertical", "horizontal"]) {
      const nGridlines =
        region === "vertical" ? numberOfGridLines[0] : numberOfGridLines[1];
      for (let i = 0; i < nGridlines; i++) {
        const vertices =
          region === "vertical"
            ? [
                [
                  +(origin[0] + i * spacing),
                  +Math.round(this.dimensions[1] / 2),
                ],
                [
                  +(origin[0] + i * spacing),
                  -Math.round(this.dimensions[1] / 2),
                ],
              ]
            : [
                [
                  +Math.round(this.dimensions[0] / 2),
                  +(origin[1] + i * spacing),
                ],
                [
                  -Math.round(this.dimensions[0] / 2),
                  +(origin[1] + i * spacing),
                ],
              ];
        const pos =
          region === "vertical"
            ? [origin[0] + i * spacing + 3, origin[1]]
            : [origin[0] + 3, origin[1] + i * spacing];
        const n = unit === "pt" ? 3 : 5;
        lines.push(
          new visual.ShapeStim({
            name: `${region}-grid-line-${unit}-${i}`,
            win: this.psychoJS.window,
            units: "pix",
            lineWidth: i % n === 0 ? fat : thin,
            lineColor: new util.Color(color),
            // fillColor: new u©til.Color("blue"),
            opacity: this.opacity,
            vertices: vertices,
            depth: -999999,
            ori: 0.0,
            interpolate: false,
            size: 1,
            autoLog: false,
          }),
        );
        const multiplier = ["in", "pt"].includes(unit)
          ? unit === "in"
            ? inMultiplier
            : ptMultiplier
          : 1;
        if (i % n === 0)
          labels.push(
            new visual.TextStim({
              name: `${region}-${unit}-grid-line-label-${i}`,
              win: this.psychoJS.window,
              text: `${i * multiplier} ${unit}`,
              font: "Arial",
              units: "pix",
              alignHoriz: "left",
              alignVert: "bottom",
              pos: pos,
              height: 8,
              ori: 0.0,
              color: new util.Color(color),
              opacity: 1.0,
              depth: 0.0,
              autoLog: false,
            }),
          );
      }
    }
    return [lines, labels];
  };

  _getCmGridStims = () => {
    return this._getFixedSpacingGrid(this.displayOptions.pixPerCm, "cm");
  };
  _getInchGridStims = () => {
    return this._getFixedSpacingGrid(
      (this.displayOptions.pixPerCm * 2.54) / 5,
      "in",
    ); // line every 1/5th inch
  };
  _getPointGridStims = () => {
    return this._getFixedSpacingGrid(
      ((this.displayOptions.pixPerCm * 2.54) / 72) * ptMultiplier, // line every 24pt
      "pt",
    );
  };

  _getDegGridStims = (dynamic = false) => {
    const numberOfGridLinesPerSide = this._getNumberOfGridLines("deg", dynamic);
    const [lines, labels] = [[], []];
    const color = dynamic ? getColor("degDynamic") : getColor("deg");
    for (const region of ["right", "left", "upper", "lower"]) {
      let nGridlines;
      switch (region) {
        case "left":
          nGridlines = numberOfGridLinesPerSide[0][1];
          break;
        case "right":
          nGridlines = numberOfGridLinesPerSide[0][0];
          break;
        case "upper":
          nGridlines = numberOfGridLinesPerSide[1][1];
          break;
        case "lower":
          nGridlines = numberOfGridLinesPerSide[1][0];
          break;
      }
      // nGridlines *= 3;

      for (let i = 0; i < nGridlines; i++) {
        if (["left", "lower"].includes(region) && i === 0) continue;
        let [vertices, pos] = this._getDegGridPathVertices(i, region, dynamic);
        lines.push(
          new visual.ShapeStim({
            name: `${region}-grid-line${dynamic ? "-dynamic" : ""}-${i}`,
            win: this.psychoJS.window,
            units: "pix",
            lineWidth: i % 5 === 0 ? fat : thin,
            lineColor: new util.Color(color),
            closeShape: false,
            opacity: this.opacity,
            vertices: vertices,
            depth: -999999,
            ori: 0.0,
            interpolate: false,
            size: 1,
            autoLog: false,
          }),
        );
        if (i % 5 === 0) {
          const unitLabel = dynamic ? "deg\ndynamic" : "deg";
          labels.push(
            new visual.TextStim({
              name: `${region}-grid-line-label${
                dynamic ? "-dynamic" : ""
              }-${i}`,
              win: this.psychoJS.window,
              text: `${i} ${unitLabel}`,
              font: "Arial",
              units: "pix",
              pos: pos,
              height: Math.min(
                Math.round(degreesToPixels(0.25, [0, 0], "horizontal")),
                12,
              ),
              alignHoriz: "left",
              alignVert: "bottom",
              ori: 0.0,
              color: new util.Color(color),
              opacity: 1.0,
              depth: 0.0,
              autoLog: false,
            }),
          );
        }
      }
    }
    return [lines, labels];
  };

  _getDegGridPathVertices = (lineId, region, dynamic = false) => {
    const vertices = [];
    let pos = [];
    // in psychoJS px units, ie origin at center of screen
    const screenRect = {
      left: -this.dimensions[0] / 2,
      right: this.dimensions[0] / 2,
      top: this.dimensions[1] / 2,
      bottom: -this.dimensions[1] / 2,
    };
    let pointOnScreen = true;
    let e = 0;
    while (pointOnScreen) {
      let posPoint, negPoint;
      switch (region) {
        case "left":
          posPoint = xyPxOfDeg([-lineId, e], dynamic);
          negPoint = xyPxOfDeg([-lineId, -e], dynamic);
          break;
        case "right":
          posPoint = xyPxOfDeg([lineId, e], dynamic);
          negPoint = xyPxOfDeg([lineId, -e], dynamic);
          break;
        case "upper":
          posPoint = xyPxOfDeg([e, lineId], dynamic);
          negPoint = xyPxOfDeg([-e, lineId], dynamic);
          break;
        case "lower":
          posPoint = xyPxOfDeg([e, -lineId], dynamic);
          negPoint = xyPxOfDeg([-e, -lineId], dynamic);
          break;
      }
      pointOnScreen =
        isInRect(...posPoint, screenRect) || isInRect(...negPoint, screenRect);

      if (pointOnScreen) e += 0.1;
      vertices.unshift(negPoint);
      vertices.push(posPoint);
    }
    pos = ["left", "right"].includes(region)
      ? [vertices[Math.floor(vertices.length / 2)][0], screenRect.bottom + 5]
      : [screenRect.left + 5, vertices[Math.floor(vertices.length / 2)][1]];
    return [vertices, pos];
  };

  /**
   * rMm = 38*log10((norm(xy)+0.15)/0.15) [1]
   * rMm/38 = log10((r+0.15)/0.15)        [2]
   * 10**(rMm/38) = (r+0.15)/0.15         [3]
   * 10**(rMm/38)*0.15 = r + 0.15         [4]
   * 10**(rMm/38)*0.15 - 0.15 = r         [5]
   */
  _getMmGridStims = () => {
    const fixation = fixationConfig.pos;
    const screen = {
      top: this.dimensions[1] / 2,
      bottom: -this.dimensions[1] / 2,
      left: -this.dimensions[0] / 2,
      right: this.dimensions[0] / 2,
    };
    const circle = {
      top: fixation[1],
      bottom: fixation[1],
      left: fixation[0],
      right: fixation[0],
    };
    let moreCirclesNeeded =
      circle.top < screen.top ||
      circle.bottom > screen.bottom ||
      circle.right < screen.right ||
      circle.left > screen.left;
    const [circles, labels] = [[], []];
    let rMm = 0;
    while (moreCirclesNeeded) {
      const labeled = rMm % 5 === 0 ? true : false;
      // Find new r, aka norm(xy). See [5] above.
      const r = Math.pow(10, rMm / 38) * 0.15 - 0.15;
      const rPix = xyPxOfDeg([r, 0])[0] - fixationConfig.pos[0];
      if (rPix < 50) {
        rMm += 1;
        continue;
      }
      // Create circle
      circles.push(
        new visual.Polygon({
          win: this.psychoJS.window,
          name: `mmV4-grid-circle-${rMm}`,
          units: "pix",
          edges: 360,
          radius: rPix,
          ori: 0,
          size: 1,
          pos: fixationConfig.pos,
          lineWidth: labeled ? fat : thin,
          lineColor: new util.Color(getColor("mmV4")),
          opacity: this.opacity,
          depth: -999999,
          interpolate: true,
          autoLog: false,
        }),
      );

      if (labeled) {
        // Create label
        const spaceToTheRight = fixationConfig.pos[0] < 0 ? 1 : -1;
        const pos = xyPxOfDeg([spaceToTheRight * r, 0]);
        labels.push(
          new visual.TextStim({
            name: `mmV4-grid-label-${rMm}`,
            win: this.psychoJS.window,
            text: `${rMm} mmV4`,
            font: "Arial",
            units: "pix",
            alignHoriz: "center",
            pos: pos,
            height: 8,
            ori: 0.0,
            color: new util.Color(getColor("mm")),
            opacity: 1.0,
            depth: 0.0,
            autoLog: false,
          }),
        );
      }
      // Add & update
      rMm += 1;
      circle.top = xyPxOfDeg([0, r])[1];
      circle.bottom = xyPxOfDeg([0, -r])[1];
      circle.left = xyPxOfDeg([-r, 0])[0];
      circle.right = xyPxOfDeg([r, 0])[0];
      moreCirclesNeeded =
        circle.top < screen.top ||
        circle.bottom > screen.bottom ||
        circle.right < screen.right ||
        circle.left > screen.left;
    }
    return [circles, labels];
  };
}

const getColor = (unit) => {
  switch (unit) {
    case "px":
      return "#91014e";
    case "cm":
      return "#910187";
    case "in":
      return "#310191";
    case "pt":
      return "#01910b";
    case "deg":
      return "#007056";
    case "degDynamic":
      return "#873100";
    case "mmV4":
      return "#3b0066";
  }
};
