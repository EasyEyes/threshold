import { sound } from "../lib/psychojs-2021.3.0.js";
const { TonePlayer } = sound;

const synth = new Tone.Synth({
  oscillator: {
    type: "sine",
  },
}).toDestination();

export const playCorrectSynth = () => {
  synth.triggerAttackRelease(2000, 0.05);
};

export const playWrongSynth = () => {
  synth.triggerAttackRelease(500, 0.5);
};

export const playPurrSynth = () => {
  synth.triggerAttackRelease(200, 0.6);
};

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
