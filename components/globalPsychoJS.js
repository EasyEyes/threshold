import { PsychoJS, Mouse } from "../psychojs/src/core/index.js";
import * as util from "../psychojs/src/util/index.js";
import { instructionFont } from "./global.js";
import { HTMLTextStim } from "../psychojs/src/visual/HTMLTextStim.js";
import { renderInstructionMarkdown } from "./markdownInline.js";

export const psychoJS = new PsychoJS({
  debug: false,
});

export const clock = Object.seal({
  global: undefined,
});

export const renderObj = Object.seal({
  tinyHint: undefined,
});

export const getTinyHint = () => {
  // DOM overlay (Markdown+HTML via textRenderer) — phrases like
  // "Press **space** ..." render rich text.
  renderObj.tinyHint = new HTMLTextStim({
    win: psychoJS.window,
    textRenderer: renderInstructionMarkdown,
    name: "tinyHint",
    text: "",
    font: instructionFont.current,
    units: "pix",
    pos: [0, -window.innerHeight / 2],
    alignHoriz: "center",
    alignVert: "bottom",
    height: 20,
    isInstruction: false,
    wrapWidth: window.innerWidth,
    color: "#000000",
    opacity: 1.0,
    autoDraw: false,
  });
};

export let psychojsMouse;
export const initMouse = () => {
  psychojsMouse = new Mouse({
    name: "psychojsMouse",
    win: psychoJS.window,
    autoLog: false,
  });
};

export const to_px = util.to_px;
