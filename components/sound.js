import * as sound from "../psychojs/src/sound/index.js";
import ReadingPageFlip from "./sounds/reading-page-flip.mp3";

const { TonePlayer } = sound;

const default_env = {
  attack: 0.001,
  decay: 0.001,
  sustain: 1,
  release: 0.001,
};

export const getCorrectSynth = (psychoJS) => {
  return new TonePlayer({
    psychoJS: psychoJS,
    note: 2000,
    duration_s: 0.05,
    volume: 0.6,
    loops: 0,
    wave: "sine",
    envelope: default_env,
  });
};

export const getWrongSynth = (psychoJS) => {
  return new TonePlayer({
    psychoJS: psychoJS,
    note: 500,
    duration_s: 0.5,
    volume: 0.5,
    loops: 0,
    wave: "sine",
    envelope: default_env,
  });
};

export const getPurrSynth = (psychoJS) => {
  return new TonePlayer({
    psychoJS: psychoJS,
    note: 200,
    duration_s: 0.6,
    volume: 0.7,
    loops: 0,
    wave: "sine",
    envelope: default_env,
  });
};

/* -------------------------------------------------------------------------- */

export const getReadingSound = () => {
  const sound = new Audio(ReadingPageFlip);
  return sound;
};
