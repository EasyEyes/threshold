import { Polygon, ShapeStim } from "../psychojs/src/visual";
import { Color, to_px } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import { displayOptions, fixationConfig } from "./global";
import { xyPxOfDeg, cursorNearFixation, colorRGBASnippetToRGBA } from "./utils";
import { warning } from "./errorHandling";

export const getFixationPos = (blockN, paramReader) => {
  const locationStrategy = paramReader.read(
    "fixationLocationStrategy",
    blockN,
  )[0];
  if (locationStrategy !== "centerFixation") {
    warning(
      `fixationLocationStrategy=${locationStrategy} not yet supported, using a default fixation px pos at the center of the screen.`,
    );
    return [0, 0];
  }
  const specifiedLocationXYDenisCoords = paramReader
    .read("fixationOriginXYScreen", blockN)[0]
    .split(",")
    .map(Number);

  const specifiedLocationXYNorm = specifiedLocationXYDenisCoords.map(
    (z) => 2 * z - 1,
  );
  const specifiedLocationXYPx = to_px(
    specifiedLocationXYNorm,
    "norm",
    psychoJS.window,
  ).map(Math.round);
  return specifiedLocationXYPx;
};

export class Fixation {
  constructor() {
    this.stims = [
      new ShapeStim({
        win: psychoJS.window,
        name: "fixation-0",
        units: "pix",
        vertices: getFixationVertices(fixationConfig.strokeLength),
        lineWidth: fixationConfig.strokeWidth,
        closeShape: false,
        color: new Color("black"),
        opacity: undefined,
        depth: -6.0,
      }),
    ];
    this.bold = false;
  }

  update(reader, BC, targetHeightPx, targetXYPx) {
    this.bold = false;
    fixationConfig.markingBlankedNearTargetBool = reader.read(
      "markingBlankedNearTargetBool",
      BC,
    );
    fixationConfig.markingBlankingRadiusReEccentricity = reader.read(
      "markingBlankingRadiusReEccentricity",
      BC,
    );
    fixationConfig.markingBlankingRadiusReTargetHeight = reader.read(
      "markingBlankingRadiusReTargetHeight",
      BC,
    );
    // TODO find the correct, general across conditions, location
    fixationConfig.markingBlankingPos = fixationConfig.pos;
    fixationConfig.markingFixationStrokeLengthDeg = reader.read(
      "markingFixationStrokeLengthDeg",
      BC,
    );
    fixationConfig.markingFixationStrokeThicknessDeg = reader.read(
      "markingFixationStrokeThicknessDeg",
      BC,
    );
    fixationConfig.markingFixationMotionRadiusDeg = reader.read(
      "markingFixationMotionRadiusDeg",
      BC,
    );
    const markingFixationMotionSpeedDegPerSec = reader.read(
      "markingFixationMotionSpeedDegPerSec",
      BC,
    );
    fixationConfig.markingFixationMotionSpeedDegPerSec =
      markingFixationMotionSpeedDegPerSec;
    fixationConfig.markingFixationMotionPeriodSec =
      markingFixationMotionSpeedDegPerSec === 0
        ? 0
        : (2 * Math.PI * fixationConfig.markingFixationMotionRadiusDeg) /
          markingFixationMotionSpeedDegPerSec;
    fixationConfig.markingFixationHotSpotRadiusDeg = reader.read(
      "markingFixationHotSpotRadiusDeg",
      BC,
    );
    fixationConfig.show = reader.read("markTheFixationBool", BC);
    fixationConfig.markingOffsetBeforeTargetOnsetSecs = reader.read(
      "markingOffsetBeforeTargetOnsetSecs",
      BC,
    );
    fixationConfig.markingFixationStrokeThickening = reader.read(
      "markingFixationStrokeThickening",
      BC,
    );
    fixationConfig.color = colorRGBASnippetToRGBA(
      reader.read("markingColorRGBA", BC),
    );
    if (
      ["pixPerCm", "nearPointXYDeg", "nearPointXYPix"].every(
        (s) => displayOptions[s],
      )
    ) {
      // Diameter
      fixationConfig.strokeLength =
        xyPxOfDeg(
          [fixationConfig.markingFixationStrokeLengthDeg, 0],
          displayOptions,
        )[0] - fixationConfig.pos[0];
      fixationConfig.strokeWidth =
        xyPxOfDeg(
          [0, fixationConfig.markingFixationStrokeThicknessDeg],
          displayOptions,
        )[1] - fixationConfig.pos[1];
      fixationConfig.markingFixationHotSpotRadiusPx = Math.abs(
        fixationConfig.pos[0] -
          xyPxOfDeg([fixationConfig.markingFixationHotSpotRadiusDeg, 0])[0],
      );
    }
    if (
      typeof fixationConfig.offset === "undefined" ||
      !fixationConfig.preserveOffset
    )
      fixationConfig.offset =
        Math.random() * fixationConfig.markingFixationMotionPeriodSec;

    if (this.stims && targetHeightPx && targetXYPx) {
      this.setPos(fixationConfig.pos);
      const theseVertices = getFixationVertices(
        fixationConfig.strokeLength,
        targetHeightPx,
        targetXYPx,
      );
      this.setVertices(theseVertices);
      this.setLineWidth(fixationConfig.strokeWidth);
      this.setColor(fixationConfig.color);
    }
  }
  /**
   * Given a set of independent groups of vertices,
   * ie the coordinates of the fixation cross and of the fixation blanking circle,
   * set those vertices corresponding to the fixation cross (blanking circle
   * doesn't use vertices), generating new stim objects if necessary.
   * @param {number[][][]} vertices aka vertexGroups, ie list of groups of coordinates
   */
  setVertices(vertices) {
    vertices.forEach((vertexGroup, i) => {
      // Single value represents radius, indicating blanking circle
      if (vertexGroup[0].length == 1) {
        if (this.stims[i]) {
          this.stims[i].setRadius(vertexGroup[0][0]);
        } else {
          this.stims[i] = new Polygon({
            win: psychoJS.window,
            name: `blanking-fixation-${i}`,
            units: "pix",
            radius: vertexGroup[0][0],
            edges: 99,
            closeShape: true,
            fillColor: psychoJS.window.color,
            lineColor: psychoJS.window.color,
            opacity: undefined,
            depth: -5.0,
            lineWidth: 0,
          });
        }

        // Otherwise, treat as a ShapeStim
      } else {
        if (this.stims[i]) {
          this.stims[i].setVertices(vertexGroup);
        } else {
          this.stims[i] = new ShapeStim({
            win: psychoJS.window,
            name: `fixation-${i}`,
            units: "pix",
            vertices: vertexGroup,
            lineWidth: fixationConfig.strokeWidth,
            closeShape: false,
            color: new Color("black"),
            opacity: undefined,
            depth: -6.0,
          });
        }
      }
    });
    this.stims
      .slice(vertices.length)
      .forEach((stim) => stim.setAutoDraw(false));
    this.stims = this.stims.slice(0, vertices.length);
  }
  setAutoDraw(bool) {
    this.stims.forEach((stim) => stim.setAutoDraw(bool));
  }
  setPos(positionXYPx) {
    this.stims.forEach((stim) => {
      // If this stim is the blanking circle, set it to that position instead
      if (Polygon.prototype.isPrototypeOf(stim)) {
        stim.setPos(fixationConfig.markingBlankingPos);
      } else {
        stim.setPos(positionXYPx);
      }
    });
  }
  setBold(on = true) {
    const multiplier = fixationConfig.markingFixationStrokeThickening;
    if (typeof multiplier !== "undefined") {
      if (on) {
        this.setLineWidth(fixationConfig.strokeWidth * multiplier);
        this.bold = true;
      } else {
        this.setLineWidth(fixationConfig.strokeWidth);
        this.bold = false;
      }
    }
  }
  boldIfCursorNearFixation() {
    if (cursorNearFixation() && !this.bold) {
      this.setBold(true);
    } else if (!cursorNearFixation() && this.bold) {
      this.setBold(false);
    }
  }
  _updateIfNeeded() {
    this.stims.forEach((stim) => stim._updateIfNeeded());
  }
  refresh() {
    this.stims.forEach((stim) => stim.refresh());
  }
  setLineWidth(width) {
    this.stims.forEach((stim) => stim.setLineWidth(width));
  }
  setColor(color) {
    color = new Color(color);
    this.stims.forEach((stim) => {
      // Set color of fixation, but not blanking circle
      if (!(stim instanceof Polygon)) {
        stim.setLineColor(color);
      } else {
        stim.setFillColor(psychoJS.window.color);
      }
    });
  }
  get status() {
    return this.stims[0].status;
  }
  get tStart() {
    return this.stims[0].tStart;
  }
  get frameNStart() {
    return this.stims[0].frameNStart;
  }
  set status(s) {
    this.stims.forEach((stim) => (stim.status = s));
  }
  set tStart(t) {
    this.stims.forEach((stim) => (stim.tStart = t));
  }
  set frameNStart(f) {
    this.stims.forEach((stim) => (stim.frameNStart = f));
  }
}

export const getFixationVertices = (
  strokeDiameterPx,
  targetHeightPx,
  targetXYPx,
) => {
  const strokeRadiusPx = Math.round(strokeDiameterPx / 2);
  const vertices = [
    [
      [-strokeRadiusPx, 0],
      [0, 0],
      [strokeRadiusPx, 0],
      [0, 0],
      [0, -strokeRadiusPx],
      [0, 0],
      [0, strokeRadiusPx],
    ],
  ];
  // If we should blank near the target...
  if (
    fixationConfig.markingBlankedNearTargetBool &&
    targetHeightPx &&
    targetXYPx
  ) {
    const targetEccPx = Math.hypot(
      targetXYPx[0] - fixationConfig.pos[0],
      targetXYPx[1] - fixationConfig.pos[1],
    );
    const eccentricityRadiusValue =
      targetEccPx * fixationConfig.markingBlankingRadiusReEccentricity;
    const targetHeightRadiusValue =
      targetHeightPx * fixationConfig.markingBlankingRadiusReTargetHeight;
    const blankingRadiusPx = Math.max(
      eccentricityRadiusValue,
      targetHeightRadiusValue,
    );
    // TODO should not be located at fixation position, but near (all possible locations for) fixation
    vertices.push([[blankingRadiusPx], fixationConfig.pos]);
  }
  return vertices;
};

export const gyrateFixation = (fixation) => {
  const t = performance.now() / 1000.0;
  const rPx = Math.abs(
    fixationConfig.pos[0] -
      xyPxOfDeg([fixationConfig.markingFixationMotionRadiusDeg, 0])[0],
  );
  const period = fixationConfig.markingFixationMotionPeriodSec;
  if (period !== 0) {
    const newFixationXY = [
      fixationConfig.nominalPos[0] +
        Math.cos((t + fixationConfig.offset) / (period / (2 * Math.PI))) * rPx,
      fixationConfig.nominalPos[1] +
        Math.sin((t + fixationConfig.offset) / (period / (2 * Math.PI))) * rPx,
    ];
    fixationConfig.pos = newFixationXY;
    fixation.setPos(newFixationXY);
  }
};

function reflectInsideUnitCircle(x, y, dx, dy) {
  // This function now assumes (x, y) and (dx, dy) are normalized to a unit circle
  while (true) {
    let xNew = x + dx;
    let yNew = y + dy;

    if (xNew * xNew + yNew * yNew <= 1) {
      // If inside the unit circle, return the new position
      return { x: xNew, y: yNew };
    }

    // Calculate reflection
    // Intersection time 't' for a unit circle
    const t =
      (-dx * x -
        dy * y +
        Math.sqrt(
          -dx * dx * y * y +
            dx * dx +
            2 * dx * dy * x * y -
            dy * dy * x * x +
            dy * dy,
        )) /
      (dx * dx + dy * dy);
    let d = Math.sqrt(dx * dx + dy * dy);
    x += dx * t;
    y += dy * t;

    const fraction = (d - t) / d;
    dx = dx * fraction;
    dy = dy * fraction;

    const a = dx * x + dy * y;
    const b = -dx * y + dy * x;
    dx = -a * x - b * y;
    dy = -a * y + b * x;
  }
}

const randomWalkInsideCircle = (
  xDeg,
  yDeg,
  dDeg,
  rDeg,
  xCenterDeg,
  yCenterDeg,
) => {
  // TODO: Check for errors
  const angle = Math.random() * 2 * Math.PI;
  const dx = (Math.cos(angle) * dDeg) / rDeg;
  const dy = (Math.sin(angle) * dDeg) / rDeg;

  // Apply reflection within the unit circle, then scale result back to actual radius
  let result = reflectInsideUnitCircle(
    (xDeg - xCenterDeg) / rDeg,
    (yDeg - yCenterDeg) / rDeg,
    dx,
    dy,
  );
  return {
    xDeg: result.x * rDeg + xCenterDeg,
    yDeg: result.y * rDeg + yCenterDeg,
  };
};

export const gyrateRandomMotionFixation = (fixation) => {
  const rPx = Math.abs(
    fixationConfig.pos[0] -
      xyPxOfDeg([fixationConfig.markingFixationMotionRadiusDeg, 0])[0],
  );
  const frameRateHz = 60; // Frame rate in Hz
  const speedDegPerSec = fixationConfig.markingFixationMotionSpeedDegPerSec; // Speed in units per second
  const dDeg = (speedDegPerSec / frameRateHz) * rPx; // Step size per frame in units

  const newPos = randomWalkInsideCircle(
    fixationConfig.pos[0],
    fixationConfig.pos[1],
    dDeg,
    rPx,
    fixationConfig.nominalPos[0],
    fixationConfig.nominalPos[1],
  );

  fixationConfig.pos = [newPos.xDeg, newPos.yDeg];
  fixation.setPos(fixationConfig.pos);
};

/**
 * Move the provided stimuli based on the fixation's current position relative to it's nominal position,
 * ie the position based upon which the stimuli were generated.
 * Should be used iff fixation is in motion, eg gyrateFixation() is used.
 * @param {psychoJS.VisualStim[]} stims Array of psychojs stims
 */
export const offsetStimsToFixationPos = (stims) => {
  const fixationDisplacement = [
    fixationConfig.pos[0] - fixationConfig.nominalPos[0],
    fixationConfig.pos[1] - fixationConfig.nominalPos[1],
  ];
  for (const stim of stims) {
    const nominalPos = stim.getPos();
    const offsetPos = [
      nominalPos[0] + fixationDisplacement[0],
      nominalPos[1] + fixationDisplacement[1],
    ];
    stim.setPos(offsetPos);
  }
};
