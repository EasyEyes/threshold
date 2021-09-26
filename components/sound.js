import { sound } from "../lib/psychojs-2021.3.0.js";
const { TonePlayer } = sound;

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
    note: 200,
    duration_s: 0.6,
    volume: 0.55,
    loops: 0,
  });
};
