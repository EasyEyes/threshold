import {
  getDot,
  updateMarkingStimsEveryFrame,
} from "/components/dotAndGrid.ts";
import { psychoJS } from "/components/globalPsychoJS.js";
import { viewingDistanceCm } from "/components/global.js";
import { Screens } from "/components/multiple-displays/globals.ts";

try {
  const screen = Screens[0];
  screen.pxPerCm = 40;
  screen.viewingDistanceCm = 50;
  screen.nearestPointXYZPx = [0, 0];
  screen.fixationXYZPx = [0, 0, 0];
  screen.fixationConfig.nominalPos = [0, 0];
  screen.fixationConfig.pos = [100, 0];
  viewingDistanceCm.current = 50;
  psychoJS.openWindow({ fullscr: false, autoLog: false });

  const dot = getDot({
    xyDeg: [0, 0],
    diameterDeg: 0.3,
    colorRGBA: "1,0,0,1",
    trackFixationBool: true,
  });
  const snapshot = () => ({
    dot: [...dot.pos],
    pixiX: dot.stim._pixi.position.x,
  });
  dot.draw();
  const before = snapshot();

  screen.fixationConfig.pos = [220, 0];
  updateMarkingStimsEveryFrame(dot, undefined);
  dot.stim.draw();
  const after = snapshot();
  dot.release();
  window.__markDotResult = { before, after };
} catch (error) {
  window.__markDotError = String(error?.stack ?? error);
}
