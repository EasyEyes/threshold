/**
 * @jest-environment jsdom
 *
 * Tone.js strict-increase crash ("Start time must be strictly greater than
 * previous start time"): with Tone.context.lookAhead = 0 (set by
 * TonePlayer._initSoundLibrary to avoid a note-trigger delay), two beeps
 * triggered in the same JS task / AudioContext quantum read the same
 * Tone.context.currentTime. Tone's Source.start() then throws its
 * strict-increase assertion and crashes the routine — observed in real runs
 * (any two beeps in one task) and semi-common in simulated ones (headless
 * throttling stacks beeps).
 *
 * TonePlayer.play() is the funnel for ALL beep playback (correctSynth /
 * wrongSynth / purrSynth), so the guarantee lives there: every scheduled
 * start time is strictly increasing, nudged +1e-6 s past the previous when
 * the audio clock has not advanced (far below one audio sample ≈ 2.3e-5 s,
 * imperceptible).
 *
 * Uses the faithful tone mock (tests/__mocks__/tone.js): deterministic
 * audio clock + the real assertion.
 */
import { TonePlayer } from "../../psychojs/src/sound/TonePlayer";
import * as tone from "tone";

const psychoJSStub = {
  logger: { info: () => {}, exp: () => {} },
  _addAttribute: undefined,
};

const makePlayer = (note = "C4") =>
  new TonePlayer({
    psychoJS: psychoJSStub,
    note,
    duration_s: 0.1,
    volume: 1.0,
    loops: 0,
    autoLog: false,
  });

const setAudioTime = (t: number) => (tone as any).__setAudioTime(t);

describe("TonePlayer.play — strictly-increasing start times (Tone.js)", () => {
  beforeEach(() => {
    setAudioTime(1.0);
    (tone as any).startedTimes.length = 0;
  });

  test("GATE: two plays in the same AudioContext quantum must not throw", () => {
    const player = makePlayer();
    expect(() => {
      player.play();
      player.play();
    }).not.toThrow();
  });

  test("MECHANISM: successive start times are strictly increasing", () => {
    const player = makePlayer();
    player.play();
    player.play();
    player.play();
    const times = (tone as any).startedTimes as number[];
    expect(times).toHaveLength(3);
    for (let i = 1; i < times.length; i++)
      expect(times[i]).toBeGreaterThan(times[i - 1]);
  });

  test("MECHANISM: overlapping same-quantum double beep schedules the second after the first ends", () => {
    // Two beeps in one JS task cannot overlap on one synth: Tone's
    // StateTimeline rejects a retrigger before the previous note's stop.
    // The second beep must be scheduled at/after the first's end.
    const player = makePlayer(); // duration_s = 0.1
    player.play();
    player.play();
    const times = (tone as any).startedTimes as number[];
    expect(times).toHaveLength(2);
    expect(times[1]).toBeGreaterThanOrEqual(times[0] + 0.1);
  });

  test("CORRECTNESS: a single play schedules at the current audio time", () => {
    setAudioTime(12.5);
    const player = makePlayer();
    player.play();
    expect((tone as any).startedTimes).toEqual([12.5]);
  });

  test("CORRECTNESS: plays spaced across quanta schedule at their own times", () => {
    const player = makePlayer();
    setAudioTime(2.0);
    player.play();
    setAudioTime(2.1);
    player.play();
    expect((tone as any).startedTimes).toEqual([2.0, 2.1]);
  });
});

describe("TonePlayer.play — indefinite tones (duration_s = -1)", () => {
  beforeEach(() => {
    setAudioTime(1.0);
    (tone as any).startedTimes.length = 0;
  });

  test("CORRECTNESS: replay after stop() beeps promptly, not eons later", () => {
    // Public API: duration_s = -1 plays indefinitely (actualDuration_s
    // becomes 1e6). stop() releases the note. A replay on the same player
    // must schedule at the current audio time — the release supersedes the
    // old scheduled stop, so the next start must not be pushed out to the
    // abandoned note's would-be end (a beep scheduled 10^6 s away is a
    // SILENT failure, worse than the crash this tracking was built to fix).
    const player = new TonePlayer({
      psychoJS: psychoJSStub,
      note: "C4",
      duration_s: -1,
      volume: 1.0,
      loops: 0,
      autoLog: false,
    });
    setAudioTime(1.0);
    player.play();
    setAudioTime(1.5);
    player.stop();
    setAudioTime(2.0);
    expect(() => player.play()).not.toThrow();
    const times = (tone as any).startedTimes as number[];
    expect(times).toHaveLength(2);
    expect(times[1]).toBeLessThan(2.001); // ~now, not 1e6 s away
  });
});
