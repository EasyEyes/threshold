import { sound } from "../lib/psychojs-2021.3.0.js";
const { TonePlayer } = sound;

export const playCorrectSynth = () => {
  if (playTone) playTone(2000, 'sine', 0.5)
}

export const playWrongSynth = () => {
  if (playTone) playTone(500, 'sine', 0.5)
}

export const playPurrSynth = () => {
  if (playTone) playTone(200, 'sine', 0.6)
}

/* ------------------------------- Deprecated ------------------------------- */

export const getCorrectSynth = (psychoJS) => {
  return new TonePlayer({
    psychoJS: psychoJS,
    note: 2000,
    duration_s: 0.05,
    volume: 0.5,
    loops: 0,
  });
};

export const getWrongSynth = (psychoJS) => {
  return new TonePlayer({
    psychoJS: psychoJS,
    note: 500,
    duration_s: 0.5,
    volume: 0.5,
    loops: 0,
  });
};

export const getPurrSynth = (psychoJS) => {
  return new TonePlayer({
    psychoJS: psychoJS,
    note: 100,
    duration_s: 0.5,
    volume: 0.4,
    loops: 0,
  });
};
