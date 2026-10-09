/**
 * Sound effects. Off by default; the choice lives in localStorage under `cq.sound` (client-side,
 * not through the API). Audio unlocks on the first user gesture and never autoplays.
 *
 *   playSound("correct");
 *   const { enabled, toggle } = useSound();
 *
 * Each sound is public/sounds/<SoundName>.mp3. If a file is missing or fails to load, the sound is
 * synthesised with the Web Audio API instead (src/lib/synth.ts), so the feature always works.
 */
import { useSyncExternalStore } from "react";
import { SYNTH } from "./synth";

export type SoundName =
  | "select"
  | "correct"
  | "wrong"
  | "heart-lost"
  | "tick"
  | "time-up"
  | "lesson-complete"
  | "boss-pass"
  | "boss-fail"
  | "chest-open"
  | "streak"
  | "achievement"
  | "pair-match"
  | "podium"
  | "join";

/** One map, so renaming a file is a one-line change. */
export const SOUND_FILES: Record<SoundName, string> = {
  select: "/sounds/select.mp3",
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  "heart-lost": "/sounds/heart-lost.mp3",
  tick: "/sounds/tick.mp3",
  "time-up": "/sounds/time-up.mp3",
  "lesson-complete": "/sounds/lesson-complete.mp3",
  "boss-pass": "/sounds/boss-pass.mp3",
  "boss-fail": "/sounds/boss-fail.mp3",
  "chest-open": "/sounds/chest-open.mp3",
  streak: "/sounds/streak.mp3",
  achievement: "/sounds/achievement.mp3",
  "pair-match": "/sounds/pair-match.mp3",
  podium: "/sounds/podium.mp3",
  join: "/sounds/join.mp3",
};

export const SOUND_NAMES = Object.keys(SOUND_FILES) as SoundName[];

const STORAGE_KEY = "cq.sound";
const MASTER_VOLUME = 0.5;
const REPEAT_GUARD_MS = 80;

let enabled = readEnabled();
let unlocked = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SoundName, AudioBuffer | "missing" | Promise<void>>();
const lastPlayed = new Map<SoundName, number>();
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* private mode: keep it in memory */
  }
  if (on) unlock();
  listeners.forEach((l) => l());
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !unlocked) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Called from the first user gesture (installed below) — browsers only allow audio after one. */
function unlock() {
  unlocked = true;
  if (enabled) audio();
}

if (typeof window !== "undefined") {
  const once = () => {
    unlock();
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("keydown", once);
  };
  window.addEventListener("pointerdown", once);
  window.addEventListener("keydown", once);
}

function load(name: SoundName, ac: AudioContext) {
  if (buffers.has(name)) return;
  buffers.set(
    name,
    fetch(SOUND_FILES[name])
      .then((r) => {
        if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("audio")) throw new Error("missing");
        return r.arrayBuffer();
      })
      .then((data) => ac.decodeAudioData(data))
      .then((buf) => void buffers.set(name, buf))
      .catch(() => void buffers.set(name, "missing")),
  );
}

/** Play a sound. Does nothing when muted, before the first gesture, or without Web Audio. */
export function playSound(name: SoundName) {
  if (!enabled) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < REPEAT_GUARD_MS) return;
  lastPlayed.set(name, now);

  const ac = audio();
  if (!ac || !master) return;
  load(name, ac);
  const b = buffers.get(name);
  try {
    if (b instanceof AudioBuffer) {
      const src = ac.createBufferSource();
      src.buffer = b;
      src.connect(master);
      src.start();
    } else {
      // Still loading or missing: synthesise so the sound is never late or silent.
      SYNTH[name](ac, master);
    }
  } catch {
    /* never let a sound break the game */
  }
}

/** `const { enabled, setEnabled, toggle, play } = useSound();` */
export function useSound() {
  const on = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled,
    () => false,
  );
  return { enabled: on, setEnabled: setSoundEnabled, toggle: () => setSoundEnabled(!on), play: playSound };
}
