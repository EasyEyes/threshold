import * as util from "../psychojs/src/util/index.js";
import * as visual from "../psychojs/src/visual/index.js";
import { fixationConfig } from "./global.js";

import {
  degreesToPixels,
  pixelsToDegrees,
  getPixPerCm,
  XYPixOfXYDeg,
  XYDegOfXYPix,
  isInRect,
  logger,
} from "./utils.js";

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
   * @param {("px" | "cm" | "deg" | "none")} units Which type of grid should be shown.
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
    this.opacity = 0.3;
    this.dimensions = this.psychoJS.window._size;
    this.gridkey = { key: ["`", "~"], code: "Backquote", keyCode: 192 };

    this.spawnGridStims();

    window.onkeydown = (e) => {
      if (
        e.code === this.gridkey.code ||
        this.gridkey.key.includes(e.key) ||
        e.keyCode === this.gridkey.keyCode
      )
        this.cycle();
      e.stopPropagation();
    };
    // EXPERIMENTAL window.onresize = (e) => this.update();
    this._reflectVisibility();
  }

  /**
   * Re-spawn grids, given new `displayOptions` values (eg to reflect a new viewing distance)
   * and optionally change which is the current grid
   * @param {("px" | "cm" | "deg" | "none" | "disabled")} units The grid-type to set as current.
   * @param {object} displayOptions
   */
  update(units = undefined, displayOptions = undefined) {
    if (units) this.units = units;
    if (displayOptions) this.displayOptions = displayOptions;
    this.visible = this.units === "disabled" ? false : true;
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
    this._undraw(true);
    this.units = this._cycleUnits(this.units);
    // this.spawnGridStims(this.units);
    [this.lines, this.labels] = this.allGrids[this.units];
    this._reflectVisibility();
  }

  /**
   * Generate the stims for the grid, and store in `this._allGridStims`.
   * Generates all three grids if now parameter is provided, or else just the provided unit's grid.
   * @param {("px" | "cm" | "deg" | "mm" | "none")} units
   */
  spawnGridStims(units = undefined) {
    if (units) this.allGrids[units] = this._getGridStims(units);
    else
      for (const unit of ["px", "cm", "deg", "mm", "none", "disabled"]) {
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
    const stims = [...this.lines, ...this.labels];
    stims.forEach((s) => {
      if (s) s.setAutoDraw(this.visible);
    });
  }

  _getGridStims(units) {
    switch (units) {
      case "px":
        return this._getPixelGridStims();
      case "cm":
        return this._getCmGridStims();
      case "deg":
        return this._getDegGridStims();
      case "mm":
        return this._getMmGridStims();
      case "none":
        return [[], []];
      case "disabled":
        return [[], []];
    }
  }

  _getNumberOfGridLines = (units) => {
    this.dimensionsCm = this.dimensions.map(
      (dim) => dim / this.displayOptions.pixPerCm
    );
    // TODO generalize to fixation != [0,0]
    this.dimensionsDeg = [
      [
        XYDegOfXYPix(
          [
            fixationConfig.currentPos[0] - this.dimensions[0] / 2,
            fixationConfig.currentPos[1],
          ],
          this.displayOptions
        )[0],
        XYDegOfXYPix(
          [
            fixationConfig.currentPos[0] + this.dimensions[0] / 2,
            fixationConfig.currentPos[1],
          ],
          this.displayOptions
        )[0],
      ],
      [
        XYDegOfXYPix(
          [
            fixationConfig.currentPos[0],
            fixationConfig.currentPos[1] + this.dimensions[1] / 2,
          ],
          this.displayOptions
        )[1],
        XYDegOfXYPix(
          [
            fixationConfig.currentPos[0],
            fixationConfig.currentPos[1] - this.dimensions[1] / 2,
          ],
          this.displayOptions
        )[1],
      ],
    ];

    switch (units) {
      case "px":
        return this.dimensions.map((dim) => Math.floor(dim / 100) + 1);
      case "cm":
        return this.dimensionsCm.map((dim) => Math.floor(dim / 1) + 1);
      case "deg":
        // logger("dim [origin[0], height/2]", XYDegOfXYPix([fixationConfig.pos[0], this.dimensions[1]/2], this.displayOptions))
        // logger("this.dimensionsDeg", this.dimensionsDeg)
        // const labels = ["xDeg", "yDeg", "xPx", "yPx", "orientation"]
        // const rows = [labels]
        // logger("this.displayOptions.fixationXYDeg", fixationConfig.pos)
        // for (let x=fixationConfig.pos[0]; x<this.dimensionsDeg[0]; x++){
        //   // if (i % 100 === 0) logger(`dim i=${i}`, XYDegOfXYPix([fixationConfig.pos[0] + i, this.dimensions[1]/2], this.displayOptions))
        //   for (let ydeg=1; ydeg<25; ydeg++){
        //     const point = XYPixOfXYDeg([x, ydeg], this.displayOptions)
        //     rows.push([x, ydeg, ...point, "vertical"])
        //   }
        // }
        // for (let y=fixationConfig.pos[1]; y<this.dimensionsDeg[1]; y++){
        //   for (let deg=1; deg<25; deg++){
        //     const point = XYPixOfXYDeg([deg, y], this.displayOptions)
        //     rows.push([deg, y, ...point, "horizontal"])
        //   }
        // }
        // // https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
        // let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        // var encodedUri = encodeURI(csvContent)
        // window.open(encodedUri)

        return this.dimensionsDeg.map((dims) =>
          dims.map((dim) => Math.abs(Math.floor(dim / 1)) + 1)
        );
    }
  };

  _cycleUnits(previousUnits) {
    switch (previousUnits) {
      case "none":
        return "px";
      case "px":
        return "cm";
      case "cm":
        return "deg";
      case "deg":
        return "mm";
      case "mm":
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
        const verticies =
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
            lineWidth: i % 5 === 0 ? 5 : 2,
            lineColor: new util.Color("black"),
            fillColor: new util.Color("black"),
            opacity: this.opacity,
            vertices: verticies,
            depth: -999999,
            ori: 0.0,
            interpolate: false,
            size: 1,
            autoLog: false,
          })
        );
        if (i % 5 === 0)
          labels.push(
            new visual.TextStim({
              name: `${region}-grid-line-label-${i}`,
              win: this.psychoJS.window,
              text: `${spacing * i} pix`,
              font: "Arial",
              units: "pix",
              pos: pos,
              alignHoriz: "left",
              alignVert: "bottom",
              height: 15,
              ori: 0.0,
              color: new util.Color("black"),
              opacity: 1.0,
              depth: 0.0,
              autoLog: false,
            })
          );
      }
    }
    return [lines, labels];
  };

  _getCmGridStims = () => {
    const spacing = this.displayOptions.pixPerCm;
    const origin = [
      -Math.round(this.dimensions[0] / 2),
      -Math.round(this.dimensions[1] / 2),
    ];
    const numberOfGridLines = this._getNumberOfGridLines("cm");
    const [lines, labels] = [[], []];
    for (const region of ["vertical", "horizontal"]) {
      const nGridlines =
        region === "vertical" ? numberOfGridLines[0] : numberOfGridLines[1];
      for (let i = 0; i < nGridlines; i++) {
        const verticies =
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
        lines.push(
          new visual.ShapeStim({
            name: `${region}-grid-line-${i}`,
            win: this.psychoJS.window,
            units: "pix",
            lineWidth: i % 5 === 0 ? 5 : 2,
            lineColor: new util.Color("blue"),
            fillColor: new util.Color("blue"),
            opacity: 1.0,
            vertices: verticies,
            depth: -999999,
            ori: 0.0,
            interpolate: false,
            size: 1,
            autoLog: false,
          })
        );
        if (i % 5 === 0)
          labels.push(
            new visual.TextStim({
              name: `${region}-grid-line-label-${i}`,
              win: this.psychoJS.window,
              text: `${i} cm`,
              font: "Arial",
              units: "pix",
              alignHoriz: "left",
              alignVert: "bottom",
              pos: pos,
              height: 15,
              ori: 0.0,
              color: new util.Color("black"),
              opacity: 1.0,
              depth: 0.0,
              autoLog: false,
            })
          );
      }
    }
    return [lines, labels];
  };

  _getDegGridStims = () => {
    const numberOfGridLinesPerSide = this._getNumberOfGridLines("deg");
    logger("numberOfGridLinesPerSide", numberOfGridLinesPerSide);
    const [lines, labels] = [[], []];
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

      for (let i = 0; i < nGridlines; i++) {
        if (["left", "lower"].includes(region) && i === 0) continue;
        let [verticies, pos] = this._getDegGridPathVerticies(i, region);
        lines.push(
          new visual.ShapeStim({
            name: `${region}-grid-line-${i}`,
            win: this.psychoJS.window,
            units: "pix",
            lineWidth: i % 5 === 0 ? 5 : 2,
            lineColor: new util.Color("crimson"),
            // fillColor: new util.Color("crimson"),
            closeShape: false,
            opacity: this.opacity,
            vertices: verticies,
            depth: -999999,
            ori: 0.0,
            interpolate: false,
            size: 1,
            autoLog: false,
          })
        );
        if (i % 5 === 0) {
          labels.push(
            new visual.TextStim({
              name: `${region}-grid-line-label-${i}`,
              win: this.psychoJS.window,
              text: `${i} deg`,
              font: "Arial",
              units: "pix",
              pos: pos,
              height: Math.min(
                Math.round(degreesToPixels(1, this.displayOptions)),
                50
              ),
              alignHoriz: "left",
              alignVert: "bottom",
              ori: 0.0,
              color: new util.Color("black"),
              opacity: 1.0,
              depth: 0.0,
              autoLog: false,
            })
          );
        }
      }
    }
    return [lines, labels];
  };

  _getDegGridPathVerticies = (lineId, region) => {
    const verticies = [];
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
          posPoint = XYPixOfXYDeg([-lineId, e], this.displayOptions);
          negPoint = XYPixOfXYDeg([-lineId, -e], this.displayOptions);
          break;
        case "right":
          posPoint = XYPixOfXYDeg([lineId, e], this.displayOptions);
          negPoint = XYPixOfXYDeg([lineId, -e], this.displayOptions);
          break;
        case "upper":
          posPoint = XYPixOfXYDeg([e, lineId], this.displayOptions);
          negPoint = XYPixOfXYDeg([-e, lineId], this.displayOptions);
          break;
        case "lower":
          posPoint = XYPixOfXYDeg([e, -lineId], this.displayOptions);
          negPoint = XYPixOfXYDeg([-e, -lineId], this.displayOptions);
          break;
      }
      pointOnScreen =
        isInRect(...posPoint, screenRect) || isInRect(...negPoint, screenRect);

      if (pointOnScreen) e += 0.1;
      verticies.unshift(negPoint);
      verticies.push(posPoint);
    }
    pos = ["left", "right"].includes(region)
      ? [verticies[Math.floor(verticies.length / 2)][0], screenRect.bottom + 5]
      : [screenRect.left + 5, verticies[Math.floor(verticies.length / 2)][1]];
    return [verticies, pos];
  };

  /**
   * rMm = 38*log10((norm(xy)+0.15)/0.15) [1]
   * rMm/38 = log10((r+0.15)/0.15)        [2]
   * 10**(rMm/38) = (r+0.15)/0.15         [3]
   * 10**(rMm/38)*0.15 = r + 0.15         [4]
   * 10**(rMm/38)*0.15 - 0.15 = r         [5]
   */
  _getMmGridStims = () => {
    const fixation = fixationConfig.currentPos;
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
      const rPix =
        XYPixOfXYDeg([r, 0], this.displayOptions)[0] -
        fixationConfig.currentPos[0];
      if (rPix < 50) {
        rMm += 1;
        continue;
      }
      // Create circle
      circles.push(
        new visual.Polygon({
          win: this.psychoJS.window,
          name: `mm-grid-circle-${rMm}`,
          units: "pix",
          edges: 360,
          radius: rPix,
          ori: 0,
          size: 1,
          pos: fixationConfig.currentPos,
          lineWidth: labeled ? 4 : 1,
          lineColor: new util.Color("plum"),
          opacity: 1,
          depth: -999999,
          interpolate: true,
          autoLog: false,
        })
      );

      if (labeled) {
        // Create label
        const spaceToTheRight = fixationConfig.currentPos[0] < 0 ? 1 : -1;
        const pos = XYPixOfXYDeg([spaceToTheRight * r, 0], this.displayOptions);
        labels.push(
          new visual.TextStim({
            name: `mm-grid-label-${rMm}`,
            win: this.psychoJS.window,
            text: `${rMm} mm`,
            font: "Arial",
            units: "pix",
            alignHoriz: "center",
            pos: pos,
            height: 15,
            ori: 0.0,
            color: new util.Color("black"),
            opacity: 1.0,
            depth: 0.0,
            autoLog: false,
          })
        );
      }
      // Add & update
      rMm += 1;
      circle.top = XYPixOfXYDeg([0, r], this.displayOptions)[1];
      circle.bottom = XYPixOfXYDeg([0, -r], this.displayOptions)[1];
      circle.left = XYPixOfXYDeg([-r, 0], this.displayOptions)[0];
      circle.right = XYPixOfXYDeg([r, 0], this.displayOptions)[0];
      moreCirclesNeeded =
        circle.top < screen.top ||
        circle.bottom > screen.bottom ||
        circle.right < screen.right ||
        circle.left > screen.left;
    }
    return [circles, labels];
  };
}
