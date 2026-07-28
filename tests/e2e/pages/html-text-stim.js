/**
 * Test page for visual.HTMLTextStim (tests/e2e/html-text-stim.e2e.test.ts).
 * Builds a tinyHint-like stim over a fixed 800×600 canvas and exposes hooks.
 */
import { marked } from "marked";
import { HTMLTextStim } from "/psychojs/src/visual/HTMLTextStim.js";
import { renderInstructionMarkdown } from "/components/markdownInline.js";
import { dynamicSetSize } from "/components/dynamicSetSize.js";

window.marked = marked;

const canvas = document.getElementById("cv");

// Minimal Window stand-in: what HTMLTextStim actually touches.
const win = { size: [800, 600], _renderer: { view: canvas } };

const stim = new HTMLTextStim({
  win,
  textRenderer: renderInstructionMarkdown,
  name: "tinyHint",
  text: "Press **space** for next page.",
  font: "Arial",
  units: "pix",
  height: 20,
  isInstruction: false,
  pos: [0, -300],
  alignHoriz: "center",
  alignVert: "bottom",
  color: "#000000",
  autoDraw: true,
});

window.__stim = stim;
window.__win = win;

// Block-instructions stim: pt font (isInstruction), top-left anchored,
// wrapped — exercises the _instructionSetup + dynamicSetSize interaction.
const longText = Array(30)
  .fill("Read this instruction **carefully** before you proceed.")
  .join(" ");
const instr = new HTMLTextStim({
  win,
  textRenderer: renderInstructionMarkdown,
  name: "instructions",
  text: longText,
  font: "Arial",
  units: "pix",
  height: 25,
  isInstruction: true,
  wrapWidth: 600,
  pos: [-320, 280],
  alignHoriz: "left",
  alignVert: "top",
  color: "#000000",
  autoDraw: true,
});

window.__instr = instr;
window.__dynamicSetSize = dynamicSetSize;
