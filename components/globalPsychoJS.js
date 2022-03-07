import { PsychoJS } from "../psychojs/src/core/index.js";
import * as visual from "../psychojs/src/visual/index.js";
import * as util from "../psychojs/src/util/index.js";
import { instructionFont } from "./global.js";

const { TextStim } = visual;
const { Color } = util;

export const psychoJS = new PsychoJS({
  debug: false,
});

export const renderObj = Object.seal({
  tinyHint: undefined,
});

export const getTinyHint = () => {
  renderObj.tinyHint = new TextStim({
    win: psychoJS.window,
    name: "tinyHint",
    text: "",
    font: instructionFont.current,
    units: "pix",
    pos: [0, -window.innerHeight / 2],
    alignHoriz: "center",
    alignVert: "bottom",
    height: 20,
    wrapWidth: window.innerWidth,
    ori: 0.0,
    color: new Color("black"),
    opacity: 1.0,
    depth: -20.0,
    isInstruction: false,
    autoDraw: false,
  });
};
