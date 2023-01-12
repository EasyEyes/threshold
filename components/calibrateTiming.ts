// TODO add compiler check that interval request string is even
// TODO add compiler check that string is intervals,duration order, ie i%2==0=>Int
// SEE https://stackoverflow.com/questions/4122268/using-settimeout-synchronously-in-javascript

import { logger } from "./utils";

export const calibrateTiming = async (intervals: number[]) => {
  // const measured = intervals.map(measureTimingSleep);
  // return Promise.allSettled(measured).then(measures => measures.map(m => m.status === "fulfilled" && m.value));
  const measured = [];
  for (let i = 0; i < intervals.length; i++) {
    const measurement = await measureTimingSleep(intervals[i]);
    measured.push(measurement);
  }
  return measured;
};

export const interpretCalibrateTimingIntervalsString = (
  requestedIntervals: string
): number[] => {
  const splitIntervals = requestedIntervals.split(",");
  if (splitIntervals.length % 2 !== 0) return [];
  const actionableIntervals = [];
  for (let i = 0; i < splitIntervals.length - 1; i += 2) {
    const iterations = Math.round(Number(splitIntervals[i]));
    const duration = Number(splitIntervals[i + 1]);
    actionableIntervals.push(...Array(iterations).fill(duration));
  }
  return actionableIntervals;
};

const measureTimingWhilePause = (durationSec: number) => {
  const pause = (ms: number) => {
    const dt = performance.now();
    while (performance.now() - dt <= ms) {}
  };
  const durationMs = durationSec * 1000;
  const startTime = performance.now();
  pause(durationMs);
  const stopTime = performance.now();
  return (stopTime - startTime) / 1000;
};

const measureTimingTimeout = (durationSec: number, startTime?: number) => {
  if (typeof startTime === "undefined") {
    const newStartTime = performance.now();
    setTimeout(() => {
      measureTimingTimeout(durationSec, newStartTime);
    }, durationSec * 1000);
    return;
  }
  const stopTime = performance.now();
  const measuredDurationMs = stopTime - startTime;
  const measuredDurationSec = measuredDurationMs / 1000;
  return measuredDurationSec;
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const measureTimingSleep = async (durationSec: number) => {
  const durationMs = durationSec * 1000;
  const startTime = performance.now();
  console.log("durationMs", durationMs);
  await sleep(durationMs);
  const stopTime = performance.now();
  const measuredDurationMs = stopTime - startTime;
  const measuredDurationSec = measuredDurationMs / 1000;
  return measuredDurationSec;
};
