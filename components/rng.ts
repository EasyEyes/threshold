/**
 * App-side RNG source: seeded, named, deterministic streams for simulation
 * and replay; Math.random passthrough for real participants (behavior
 * unchanged). Every app-side randomness site must draw from here — never
 * Math.random directly — so that same-seed runs are reproducible for
 * differential testing.
 *
 * Streams are NAMED per subsystem: each name derives an independent substream
 * from the master seed (FNV-1a of the name, XOR the master), so draws in one
 * subsystem cannot shift another's sequence — divergences stay localizable.
 *
 * Seed sources, in priority order (lazy, on first use):
 *   1. window.__SIM_SEED__ (simulator, injected before page scripts)
 *   2. ?rngSeed=N URL param (manual replay)
 *   3. none → unseeded (real participant: Math.random throughout)
 *
 * Seedrandom-based PsychoJS handlers (TrialHandler, MultiStairHandler) get
 * their seeds from handlerSeed(): deterministic when seeded, wall-clock when
 * not (their legacy behavior).
 */

import { mulberry32 } from "./simulationModel";

export type Rng = () => number;

let masterSeed: number | null = null;
let seedSource: "sim" | "url" | "unseeded" = "unseeded";
let initAttempted = false;
const streams = new Map<string, Rng>();

/** FNV-1a 32-bit string hash — integer ops, stable across JS engines. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function substreamSeed(name: string): number {
  // masterSeed is non-null at every call site (checked before use).
  return ((masterSeed as number) ^ hash32(name)) >>> 0;
}

/** Seed all streams (idempotent; clears existing streams). */
export function initRng(seed: number, source: "sim" | "url"): void {
  masterSeed = seed >>> 0;
  seedSource = source;
  streams.clear();
  initAttempted = true;
}

function ensureInit(): void {
  if (initAttempted || typeof window === "undefined") {
    initAttempted = true;
    return;
  }
  initAttempted = true;
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.__SIM_SEED__ === "number" && Number.isFinite(w.__SIM_SEED__)) {
    initRng(w.__SIM_SEED__, "sim");
    return;
  }
  const p = new URLSearchParams(window.location.search).get("rngSeed");
  if (p !== null && p !== "" && Number.isFinite(Number(p))) {
    initRng(Number(p), "url");
  }
}

/** How the run was seeded. */
export function getSeedSource(): "sim" | "url" | "unseeded" {
  ensureInit();
  return seedSource;
}

/** The master seed, or null when unseeded. */
export function getMasterSeed(): number | null {
  ensureInit();
  return masterSeed;
}

/** One draw from the named stream (Math.random when unseeded). */
export function random(name = "misc"): number {
  ensureInit();
  if (masterSeed === null) return Math.random();
  let rng = streams.get(name);
  if (!rng) {
    rng = mulberry32(substreamSeed(name));
    streams.set(name, rng);
  }
  return rng();
}

/** Stream handle for APIs taking () => number (e.g. shuffle(arr, rng)). */
export function rngFor(name: string): Rng {
  return () => random(name);
}

/**
 * Seed for seedrandom-based PsychoJS handlers. Deterministic per name when
 * seeded; full-entropy draw when not (NOT wall-clock ms — two handlers
 * constructed in the same tick must not share a seed, which would interleave
 * their conditions identically).
 */
export function handlerSeed(name: string): number {
  ensureInit();
  if (masterSeed === null) return Math.floor(Math.random() * 2 ** 31);
  return substreamSeed(name);
}

/** Test-only: drop all state. */
export function resetRngForTests(): void {
  masterSeed = null;
  seedSource = "unseeded";
  initAttempted = false;
  streams.clear();
}
