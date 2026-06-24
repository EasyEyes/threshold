/**
 * Fixation crosshair rendering, motion, and coordinate-space utilities.
 *
 * Pure functions (testable, no global state reads):
 *   getFixationAfterTargetOnsetBehavior  — maps parameter → behavior booleans
 *   shouldUndrawFixationAtTargetOffset   — maps parameter → boolean
 *   computeFixationPosAt                 — deterministic position on circle
 *   getAngleAtTime                        — angle helper
 *   reflectInsideUnitCircle              — boundary reflection for random walk
 *   randomWalkInsideCircle               — random walk step
 *
 * Orchestration (writes to Screens[0].fixationConfig + fixation visual):
 *   gyrateFixation, moveFixation, gyrateRandomMotionFixation
 *
 * Stimulus offset:
 *   offsetRelativelyPositionedStimuli — shifts stim groups to track a moving reference point
 *   isCorrectlyTrackingDuringStimulusForRsvpReading — RSVP tracking check
 */

import { Polygon, ShapeStim, TextStim } from "../psychojs/src/visual";
import { Color, to_px } from "../psychojs/src/util";
import { psychoJS } from "./globalPsychoJS";
import {
  displayOptions,
  fixationConfig,
  rsvpReadingTargetSets,
  rsvpReadingTiming,
  status,
  targetEccentricityDeg,
  targetTextStimConfig,
  viewingDistanceCm,
} from "./global";
import {
  xyPxOfDeg,
  cursorNearFixation,
  colorRGBASnippetToRGBA,
  sleep,
  hideCursor,
  showCursor,
} from "./utils";
import { warning } from "./errorHandling";
import { Screens } from "./multiple-displays/globals.js";
import { XYDegOfPx, XYPxOfDeg } from "./multiple-displays/utils.js";
import { setEEState, simulateActive } from "./simulatedState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FixationAfterTargetOnset =
  | "disappear"
  | "freeze"
  | "continueMovingButIndependently"
  | "continueMovingAsOrigin";

export interface FixationBehavior {
  /** Whether the crosshair is visible during stimulus. */
  showFixation: boolean;
  /** Whether to update the crosshair's visual position each frame. */
  moveFixation: boolean;
  /** Whether to update the coordinate origin (fixationConfig.pos). */
  moveOrigin: boolean;
}

// ---------------------------------------------------------------------------
// Pure decision functions (no global state)
// ---------------------------------------------------------------------------

/**
 * Map the `markingFixationAfterTargetOnset` parameter value to three
 * boolean behaviors.
 *
 * @param value  The parameter value (case-sensitive), or undefined.
 * @returns      Object with showFixation, moveFixation, moveOrigin flags.
 */
export const getFixationAfterTargetOnsetBehavior = (
  value: string | undefined,
): FixationBehavior => {
  switch (value) {
    case "disappear":
      return { showFixation: false, moveFixation: false, moveOrigin: false };
    case "continueMovingButIndependently":
      return { showFixation: true, moveFixation: true, moveOrigin: false };
    case "continueMovingAsOrigin":
      return { showFixation: true, moveFixation: true, moveOrigin: true };
    case "freeze":
    default:
      // Default: freeze — show static crosshair, no motion
      return { showFixation: true, moveFixation: false, moveOrigin: false };
  }
};

/**
 * Map `markingFixationAfterTargetOffsetBool` to a boolean decision.
 * Default is TRUE (undraw fixation alongside target).
 *
 * @param value  The parameter value, or undefined.
 */
export const shouldUndrawFixationAtTargetOffset = (
  value: boolean | undefined,
): boolean => {
  // Only explicit false disables the undraw; everything else defaults to true.
  return value !== false;
};

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

export const getFixationPos = (
  blockN: any,
  paramReader: any,
  targetImageSection?: { spareFraction: number; where: string },
) => {
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
  let specifiedLocationXYDenisCoords = paramReader
    .read("fixationOriginXYScreen", blockN)[0]
    .split(",")
    .map(Number);

  // When the screen is divided into a target section and a spare section
  // (targetImageSpareFraction > 0), treat the target section as the screen:
  // remap the requested origin (0..1 across the whole screen) into the
  // sub-rectangle that the target section occupies. The default origin
  // (0.5, 0.5) thus lands at the center of the target section.
  if (targetImageSection && targetImageSection.spareFraction > 0) {
    const f = targetImageSection.spareFraction;
    const where = targetImageSection.where || "top";
    // Denis coords: x 0=left..1=right, y 0=bottom..1=top.
    let xMin = 0;
    let xMax = 1;
    let yMin = 0;
    let yMax = 1;
    if (where === "top") yMin = f;
    else if (where === "bottom") yMax = 1 - f;
    else if (where === "left") xMax = 1 - f;
    else xMin = f; // right
    const [ox, oy] = specifiedLocationXYDenisCoords;
    specifiedLocationXYDenisCoords = [
      xMin + ox * (xMax - xMin),
      yMin + oy * (yMax - yMin),
    ];
  }

  const specifiedLocationXYNorm = specifiedLocationXYDenisCoords.map(
    (z: any) => 2 * z - 1,
  );
  const specifiedLocationXYPx = to_px(
    specifiedLocationXYNorm,
    "norm",
    psychoJS.window as any,
  ).map(Math.round);
  return specifiedLocationXYPx;
};

// ---------------------------------------------------------------------------
// Fixation class
// ---------------------------------------------------------------------------

export class Fixation {
  stims: any[];
  bold: boolean;
  previousPos?: [number, number]; // Set each time setPos() is called

  constructor() {
    const win = psychoJS.window as any;
    this.stims = [
      new ShapeStim({
        win,
        name: "fixation-0",
        units: "pix",
        vertices: getFixationVertices(Screens[0].fixationConfig.strokeLength),
        lineWidth: Screens[0].fixationConfig.strokeWidth,
        closeShape: false,
        lineColor: new Color("black"),
        opacity: undefined,
        depth: -6.0,
      } as any),
    ];
    this.bold = false;
  }

  // static, as in not dependent on the actual target size for this trial
  _updateStaticState(reader: any, BC: any) {
    this.bold = false;
    Screens[0].fixationConfig.markingBlankedNearTargetBool = reader.read(
      "markingBlankedNearTargetBool",
      BC,
    );
    Screens[0].fixationConfig.markingBlankingRadiusReEccentricity = reader.read(
      "markingBlankingRadiusReEccentricity",
      BC,
    );
    Screens[0].fixationConfig.markingBlankingRadiusReTargetHeight = reader.read(
      "markingBlankingRadiusReTargetHeight",
      BC,
    );
    Screens[0].fixationConfig.markingFixationStrokeLengthDeg = reader.read(
      "markingFixationStrokeLengthDeg",
      BC,
    );
    Screens[0].fixationConfig.markingFixationStrokeThicknessDeg = reader.read(
      "markingFixationStrokeThicknessDeg",
      BC,
    );
    Screens[0].fixationConfig.markingFixationMotionRadiusDeg = reader.read(
      "markingFixationMotionRadiusDeg",
      BC,
    );
    const markingFixationMotionSpeedDegPerSec = reader.read(
      "markingFixationMotionSpeedDegPerSec",
      BC,
    );
    Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec =
      markingFixationMotionSpeedDegPerSec;
    Screens[0].fixationConfig.markingFixationMotionPeriodSec =
      markingFixationMotionSpeedDegPerSec === 0
        ? 0
        : (2 *
            Math.PI *
            Screens[0].fixationConfig.markingFixationMotionRadiusDeg) /
          markingFixationMotionSpeedDegPerSec;

    // TODO find the correct, general across conditions, location
    Screens[0].fixationConfig.markingBlankingPos =
      Screens[0].fixationConfig.pos;

    Screens[0].fixationConfig.markingFixationHotSpotRadiusDeg = reader.read(
      "markingFixationHotSpotRadiusDeg",
      BC,
    );
    Screens[0].fixationConfig.show = reader.read("markTheFixationBool", BC);
    Screens[0].fixationConfig.markingOffsetBeforeTargetOnsetSecs = reader.read(
      "markingOffsetBeforeTargetOnsetSecs",
      BC,
    );
    Screens[0].fixationConfig.markingFixationStrokeThickening = reader.read(
      "markingFixationStrokeThickening",
      BC,
    );
    Screens[0].fixationConfig.color = colorRGBASnippetToRGBA(
      reader.read("markingColorRGBA", BC),
    );
    if (["pxPerCm", "nearestPointXYZPx"].every((s) => (Screens[0] as any)[s])) {
      // Diameter
      Screens[0].fixationConfig.strokeLength =
        (
          XYPxOfDeg(0, [
            Screens[0].fixationConfig.markingFixationStrokeLengthDeg as number,
            0,
          ]) as number[]
        )[0] - (Screens[0].fixationConfig.pos[0] as number);
      Screens[0].fixationConfig.strokeWidth =
        (
          XYPxOfDeg(0, [
            0,
            Screens[0].fixationConfig
              .markingFixationStrokeThicknessDeg as number,
          ]) as number[]
        )[1] - (Screens[0].fixationConfig.pos[1] as number);
      Screens[0].fixationConfig.markingFixationHotSpotRadiusPx = Math.abs(
        (Screens[0].fixationConfig.pos[0] as number) -
          (
            XYPxOfDeg(0, [
              Screens[0].fixationConfig
                .markingFixationHotSpotRadiusDeg as number,
              0,
            ]) as number[]
          )[0],
      );
    }
    if (
      typeof Screens[0].fixationConfig.offset === "undefined" ||
      !Screens[0].fixationConfig.preserveOffset
    )
      Screens[0].fixationConfig.offset =
        Math.random() *
        Screens[0].fixationConfig.markingFixationMotionPeriodSec;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _updateDynamicState(reader: any, BC: any, trialN?: any) {
    this.setPos(Screens[0].fixationConfig.pos);

    // if the viewing distance changes, redraw the fixation at its new size
    Screens[0].fixationConfig.strokeLength =
      (
        XYPxOfDeg(0, [
          Screens[0].fixationConfig.markingFixationStrokeLengthDeg as number,
          0,
        ]) as number[]
      )[0] - (Screens[0].fixationConfig.pos[0] as number);
    Screens[0].fixationConfig.strokeWidth =
      (
        XYPxOfDeg(0, [
          0,
          Screens[0].fixationConfig.markingFixationStrokeThicknessDeg as number,
        ]) as number[]
      )[1] - (Screens[0].fixationConfig.pos[1] as number);
    this.redraw();
  }

  update(reader: any, BC: any, targetHeightPx: any, targetXYPx: any) {
    this._updateStaticState(reader, BC);

    if (this.stims && targetHeightPx && targetXYPx) {
      this.setPos(Screens[0].fixationConfig.pos);
      const theseVertices = getFixationVertices(
        Screens[0].fixationConfig.strokeLength,
        targetHeightPx,
        targetXYPx,
      );
      this.setVertices(theseVertices);
      this.setLineWidth(Screens[0].fixationConfig.strokeWidth);
      this.setColor(Screens[0].fixationConfig.color);
    }
  }

  redraw() {
    this.setVertices(
      getFixationVertices(Screens[0].fixationConfig.strokeLength),
    );
    this.setLineWidth(Screens[0].fixationConfig.strokeWidth);
    this.setColor(Screens[0].fixationConfig.color);
  }

  /**
   * Given a set of independent groups of vertices,
   * ie the coordinates of the fixation cross and of the fixation blanking circle,
   * set those vertices corresponding to the fixation cross (blanking circle
   * doesn't use vertices), generating new stim objects if necessary.
   * @param {number[][][]} vertices aka vertexGroups, ie list of groups of coordinates
   */
  setVertices(vertices: any) {
    vertices.forEach((vertexGroup: any, i: any) => {
      // Single value represents radius, indicating blanking circle
      if (vertexGroup[0].length == 1) {
        if (this.stims[i]) {
          this.stims[i].setRadius(vertexGroup[0][0]);
        } else {
          this.stims[i] = new Polygon({
            win: psychoJS.window as any,
            name: `blanking-fixation-${i}`,
            units: "pix",
            radius: vertexGroup[0][0],
            edges: 99,
            closeShape: true,
            fillColor: (psychoJS.window as any)?.color,
            lineColor: (psychoJS.window as any)?.color,
            opacity: undefined,
            depth: -5.0,
            lineWidth: 0,
          } as any);
        }

        // Otherwise, treat as a ShapeStim
      } else {
        if (this.stims[i]) {
          this.stims[i].setVertices(vertexGroup);
        } else {
          this.stims[i] = new ShapeStim({
            win: psychoJS.window as any,
            name: `fixation-${i}`,
            units: "pix",
            vertices: vertexGroup,
            lineWidth: Screens[0].fixationConfig.strokeWidth,
            closeShape: false,
            lineColor: new Color("black"),
            opacity: undefined,
            depth: -6.0,
          } as any);
        }
      }
    });
    this.stims
      .slice(vertices.length)
      .forEach((stim: any) => stim.setAutoDraw(false));
    this.stims = this.stims.slice(0, vertices.length);
  }
  setAutoDraw(bool: any) {
    this.stims.forEach((stim: any) => stim.setAutoDraw(bool));
  }
  setPos(positionXYPx: any) {
    if (simulateActive) {
      setEEState({
        fixationPx: `(${positionXYPx[0].toFixed(0)}, ${positionXYPx[1].toFixed(
          0,
        )})`,
      });
    }
    // Save previous visual position before overwriting
    const shapeStim = this.stims.find(
      (s: any) => !Polygon.prototype.isPrototypeOf(s),
    );
    if (shapeStim && shapeStim.pos) {
      this.previousPos = [shapeStim.pos[0], shapeStim.pos[1]];
    }
    this.stims.forEach((stim: any) => {
      // If this stim is the blanking circle, set it to that position instead
      if (Polygon.prototype.isPrototypeOf(stim)) {
        stim.setPos(Screens[0].fixationConfig.markingBlankingPos);
      } else {
        stim.setPos(positionXYPx);
      }
    });
  }
  setBold(on: any = true) {
    const multiplier =
      Screens[0].fixationConfig.markingFixationStrokeThickening;
    if (typeof multiplier !== "undefined") {
      if (on) {
        this.setLineWidth(Screens[0].fixationConfig.strokeWidth * multiplier);
        this.bold = true;
      } else {
        this.setLineWidth(Screens[0].fixationConfig.strokeWidth);
        this.bold = false;
      }
    }
  }
  boldIfCursorNearFixation() {
    const fixPos = this.stims[0].pos;
    if (cursorNearFixation(undefined, undefined, fixPos) && !this.bold) {
      this.setBold(true);
    } else if (!cursorNearFixation(undefined, undefined, fixPos) && this.bold) {
      this.setBold(false);
    }
  }
  _updateIfNeeded() {
    this.stims.forEach((stim) => stim._updateIfNeeded());
  }
  refresh() {
    this.stims.forEach((stim) => stim.refresh());
  }
  setLineWidth(width: any) {
    this.stims.forEach((stim) => stim.setLineWidth(width));
  }
  setColor(color: any) {
    color = new Color(color);
    this.stims.forEach((stim: any) => {
      // Set color of fixation, but not blanking circle
      if (!(stim instanceof Polygon)) {
        stim.setLineColor(color);
      } else {
        (stim as any).setFillColor?.((psychoJS.window as any)?.color);
      }
    });
  }
  drawBadTrackingFeedback() {
    const feedbackDurationMs = 1000;
    const redCross = new TextStim(
      Object.assign(targetTextStimConfig as any, {
        win: psychoJS.window as any,
        text: "X",
        color: new Color("red"),
        height: 350,
        depth: Infinity,
        pos: Screens[0].fixationConfig.pos,
      }),
    );

    redCross.setAutoDraw(true, false);
    hideCursor();
    setTimeout(() => {
      redCross.setAutoDraw(false, false);
      rsvpReadingTargetSets.skippedDueToBadTracking = 2;
      showCursor();
    }, feedbackDurationMs);
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

// ---------------------------------------------------------------------------
// Fixation vertices
// ---------------------------------------------------------------------------

export const getFixationVertices = (
  strokeDiameterPx: any,
  targetHeightPx?: any,
  targetXYPx?: any,
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
    Screens[0].fixationConfig.markingBlankedNearTargetBool &&
    targetHeightPx &&
    targetXYPx
  ) {
    const targetEccPx = Math.hypot(
      targetXYPx[0] - Screens[0].fixationConfig.pos[0],
      targetXYPx[1] - Screens[0].fixationConfig.pos[1],
    );
    const eccentricityRadiusValue =
      targetEccPx *
      Screens[0].fixationConfig.markingBlankingRadiusReEccentricity;
    const targetHeightRadiusValue =
      targetHeightPx *
      Screens[0].fixationConfig.markingBlankingRadiusReTargetHeight;
    const blankingRadiusPx = Math.max(
      eccentricityRadiusValue,
      targetHeightRadiusValue,
    );
    // TODO should not be located at fixation position, but near (all possible locations for) fixation
    vertices.push([[blankingRadiusPx], Screens[0].fixationConfig.pos]);
  }
  return vertices;
};

// ---------------------------------------------------------------------------
// Pure computation: circular motion
// ---------------------------------------------------------------------------

/**
 * Compute the angle (radians) of the fixation on its circular path at time t.
 *
 * @param t       Current time in seconds.
 * @param period  Period of one full revolution (seconds). 0 = no motion.
 * @param offset  Random starting offset (seconds).
 */
export const getAngleAtTime = (
  t: number,
  period: number,
  offset: number,
): number => {
  if (period === 0) return 0;
  return (t + offset) / (period / (2 * Math.PI));
};

/**
 * Compute the fixation crosshair position (in pixels) at time t on its
 * circular motion path around `nominalPos`.
 *
 * Pure function — does not read global state.
 *
 * @param t           Current time in seconds.
 * @param nominalPos  Center of the motion circle in px [x, y].
 * @param radiusPx    Radius of the motion circle in px.
 * @param period      Period of one full revolution (seconds).
 * @param offset      Random starting offset (seconds).
 * @returns           [x, y] position in px.
 */
export const computeFixationPosAt = (
  t: number,
  nominalPos: [number, number],
  radiusPx: number,
  period: number,
  offset: number,
): [number, number] => {
  if (period === 0) {
    // No motion — return the nominal position
    return [nominalPos[0], nominalPos[1]];
  }

  const angle = getAngleAtTime(t, period, offset);
  return [
    nominalPos[0] + radiusPx * Math.cos(angle),
    nominalPos[1] + radiusPx * Math.sin(angle),
  ];
};

// ---------------------------------------------------------------------------
// Orchestration: reads + writes global state
// ---------------------------------------------------------------------------

const getRadiusPx = (): number => {
  const [radiusPx] = XYPxOfDeg(
    0,
    [Screens[0].fixationConfig.markingFixationMotionRadiusDeg as number, 0],
    false,
  ) as number[];
  return radiusPx;
};

/**
 * Compute fixation position at time `t` using current global state.
 * Thin wrapper around the pure `computeFixationPosAt` for callers that
 * don't need to manage the state themselves.
 */
export const computeFixationPosNow = (t: number): [number, number] => {
  const cfg = Screens[0].fixationConfig;
  return computeFixationPosAt(
    t,
    cfg.nominalPos as [number, number],
    getRadiusPx(),
    cfg.markingFixationMotionPeriodSec as number,
    cfg.offset as number,
  );
};

export const gyrateFixation = (
  fixation: Fixation,
  updateOrigin: boolean = true,
): void => {
  const t = performance.now() / 1000.0;
  const newPos = computeFixationPosNow(t);

  if (updateOrigin) {
    Screens[0].fixationConfig.pos = newPos;
  }
  fixation.setPos(newPos);
};

/**
 * Move the fixation crosshair — dispatches on markingFixationMotionPath.
 *
 * @param updateOrigin  If false, the visual crosshair moves but
 *                      fixationConfig.pos (the coordinate origin) is not
 *                      updated. Used for continueMovingButIndependently.
 */
export const moveFixation = (
  fixation: Fixation,
  reader: any,
  updateOrigin: boolean = true,
): void => {
  if (
    reader.read("markingFixationMotionPath", status.block_condition) ===
    "circle"
  ) {
    gyrateFixation(fixation, updateOrigin);
  } else {
    gyrateRandomMotionFixation(fixation, updateOrigin);
  }
};

// ---------------------------------------------------------------------------
// Random walk motion (stateful)
// ---------------------------------------------------------------------------

export const reflectInsideUnitCircle = (
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number } => {
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
};

const randomWalkInsideCircle = (
  xDeg: number,
  yDeg: number,
  dDeg: number,
  rDeg: number,
  xCenterDeg: number,
  yCenterDeg: number,
): { xDeg: number; yDeg: number } => {
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

export const gyrateRandomMotionFixation = (
  fixation: Fixation,
  updateOrigin: boolean = true,
): void => {
  // rPx computation is independent of current position — pos is always
  // [0,0] at center, so this simplifies to the radius in pixels.
  const rPx = Math.abs(
    (Screens[0].fixationConfig.pos[0] as number) -
      (
        XYPxOfDeg(0, [
          Screens[0].fixationConfig.markingFixationMotionRadiusDeg as number,
          0,
        ]) as number[]
      )[0],
  );
  const frameRateHz = 60;
  const speedDegPerSec =
    Screens[0].fixationConfig.markingFixationMotionSpeedDegPerSec;
  const dDeg = (speedDegPerSec / frameRateHz) * rPx;

  // Read the step origin from the appropriate state:
  //   updateOrigin=true  → pos (the coordinate origin, used by trial instruction & continueMovingAsOrigin)
  //   updateOrigin=false → the stim's visual position (set via fixation.setPos, for continueMovingButIndependently)
  const startX = updateOrigin
    ? (Screens[0].fixationConfig.pos[0] as number)
    : (fixation.stims[0].pos[0] as number);
  const startY = updateOrigin
    ? (Screens[0].fixationConfig.pos[1] as number)
    : (fixation.stims[0].pos[1] as number);

  const newPos = randomWalkInsideCircle(
    startX,
    startY,
    dDeg,
    rPx,
    Screens[0].fixationConfig.nominalPos[0],
    Screens[0].fixationConfig.nominalPos[1],
  );

  const newXY: [number, number] = [newPos.xDeg, newPos.yDeg];
  if (updateOrigin) {
    Screens[0].fixationConfig.pos = newXY;
  }
  fixation.setPos(newXY);
};

// ---------------------------------------------------------------------------
// Stimulus offset
// ---------------------------------------------------------------------------

export const isCorrectlyTrackingDuringStimulusForRsvpReading = (
  fixation: Fixation,
  t: number,
): boolean => {
  // Guard: no active target set to track
  if (
    typeof rsvpReadingTargetSets.current === "undefined" ||
    (rsvpReadingTargetSets.current as any).stims.length === 0
  )
    return true;

  const isTracking = cursorNearFixation(
    undefined,
    undefined,
    fixation.stims[0].pos,
  );
  if (isTracking) return true;
  psychoJS.experiment?.addData("endOfTrialDueToBadTracking", true);
  // Undraw current rsvp target
  (rsvpReadingTargetSets.current as any).stims.forEach((s: any) =>
    s.setAutoDraw(false),
  );
  // Remove the upcoming targetSets from the roster
  (rsvpReadingTiming.current as any).finishSec = t;
  rsvpReadingTargetSets.past.push(
    rsvpReadingTargetSets.current,
    //...rsvpReadingTargetSets.upcoming,
  );
  rsvpReadingTargetSets.current = undefined;
  rsvpReadingTargetSets.upcoming = [];
  rsvpReadingTargetSets.skippedDueToBadTracking = 1;

  // Undraw fixation
  fixation.setAutoDraw(false);
  // Draw red x, and undraw after 1 sec
  fixation.drawBadTrackingFeedback();
  return false;
};
