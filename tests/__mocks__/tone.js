// Virtual mock for `tone` (imported by psychojs/src/sound/TonePlayer.js).
// Faithful to the two behaviors TonePlayer depends on:
//   1. A controllable audio clock (Tone.context.currentTime) — tests
//      advance it explicitly instead of relying on real timing.
//   2. Synth.triggerAttackRelease enforces Tone's Source.start()
//      strict-increase invariant, which is what crashes real runs when two
//      beeps land in the same AudioContext quantum with lookAhead = 0.
//
// Test control: require("tone").__setAudioTime(seconds) advances the clock.

let currentTime = 0;
const startedTimes = [];

class Synth {
  constructor(_options) {
    this._lastStartTime = undefined;
    this._lastEndTime = undefined;
    this.connected = [];
  }
  connect(node) {
    this.connected.push(node);
    return this;
  }
  triggerAttackRelease(_note, duration, time) {
    // Tone.js invariants on one synth's oscillator/envelope timelines:
    //   1. Source.start(): strictly greater than the previous start.
    //   2. StateTimeline: not before the last scheduled event — a retrigger
    //      before the previous note's stop is out of order.
    if (this._lastStartTime !== undefined && time <= this._lastStartTime) {
      throw new Error(
        "Start time must be strictly greater than previous start time",
      );
    }
    if (this._lastEndTime !== undefined && time < this._lastEndTime) {
      throw new Error(
        "The time must be greater than or equal to the last scheduled time",
      );
    }
    this._lastStartTime = time;
    this._lastEndTime = time + duration;
    startedTimes.push(time);
  }
  triggerRelease() {
    // Release now: it cancels the previously scheduled stop, so the
    // effective last scheduled time becomes the current audio clock.
    this._lastEndTime = currentTime;
  }
  dispose() {}
}

class Volume {
  constructor(_db) {}
  connect() {
    return this;
  }
  toDestination() {
    return this;
  }
  toMaster() {
    return this;
  }
  dispose() {}
}

module.exports = {
  context: {
    get lookAhead() {
      return 0;
    },
    set lookAhead(_v) {},
    get currentTime() {
      return currentTime;
    },
  },
  now: () => currentTime,
  Transport: {
    state: "started",
    start() {},
    stop() {},
    scheduleRepeat: () => Math.floor(Math.random() * 1e6),
  },
  Synth,
  Volume,
  startedTimes,
  __setAudioTime: (t) => {
    currentTime = t;
  },
};
