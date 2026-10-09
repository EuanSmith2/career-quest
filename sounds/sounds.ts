/**
 * Career Quest sound effects — synthesised with the Web Audio API, no audio files.
 *
 *   import { playSound } from "@/lib/sounds";
 *   playSound("correct", { streak: 3 });   // chime climbs a semitone per streak step
 *
 * Styled after Duolingo (lessons) and Kahoot (live battle), but every sound is generated here,
 * so there are no copied assets. Sounds are ON by default; `setSoundEnabled(false)` mutes and the
 * choice is remembered in localStorage. The AudioContext is created on the first call, which is
 * always inside a click, so browsers allow it.
 */
import { useSyncExternalStore } from "react";

export type SoundName =
  // lessons (Duolingo-style)
  | "tap" | "correct" | "wrong" | "complete" | "levelUp" | "heartLost" | "outOfHearts"
  | "xp" | "streak" | "chest"
  // live battle (Kahoot-style)
  | "tick" | "tickUrgent" | "timeUp" | "countdown" | "go" | "answerLocked" | "drumroll" | "podium";

const STORAGE_KEY = "cq-sound-enabled";
const MASTER_VOLUME = 0.55;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = readEnabled();
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, String(on));
  } catch {
    /* private mode: keep it in memory only */
  }
  listeners.forEach((l) => l());
}

/** `const [soundOn, setSoundOn] = useSoundEnabled();` for the profile toggle. */
export function useSoundEnabled(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => enabled,
    () => true,
  );
  return [on, setSoundEnabled];
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ---------- building blocks ----------

const NOTE: Record<string, number> = {};
["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].forEach((n, i) => {
  for (let oct = 2; oct <= 7; oct++) NOTE[`${n}${oct}`] = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
});
const semis = (freq: number, n: number) => freq * Math.pow(2, n / 12);

interface ToneOpts {
  freq: number;
  at?: number; // seconds from now
  dur?: number; // decay length
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  glideTo?: number; // pitch slide target
  partials?: [ratio: number, gain: number][]; // extra sines for a bell timbre
  lowpass?: number;
  vibrato?: number; // Hz depth
}

function tone(ac: AudioContext, o: ToneOpts) {
  const t = ac.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.3;
  const peak = o.gain ?? 0.3;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + (o.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  let out: AudioNode = env;
  if (o.lowpass) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lowpass;
    env.connect(f);
    out = f;
  }
  out.connect(master!);

  const layers: [number, number, OscillatorType][] = [[1, 1, o.type ?? "sine"], ...(o.partials ?? []).map(([r, g]) => [r, g, "sine"] as [number, number, OscillatorType])];
  for (const [ratio, g, type] of layers) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(o.freq * ratio, t);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo * ratio, t + dur * 0.8);
    if (o.vibrato) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.value = o.vibrato * ratio;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const lg = ac.createGain();
    lg.gain.value = g;
    osc.connect(lg).connect(env);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

function noise(ac: AudioContext, o: { at?: number; dur?: number; gain?: number; type?: BiquadFilterType; freq?: number; sweepTo?: number; attack?: number }) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.2;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.setValueAtTime(o.freq ?? 2000, t);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(o.gain ?? 0.2, t + (o.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(env).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const BELL: [number, number][] = [[2, 0.35], [3, 0.12], [4.2, 0.05]];
const sparkle = (ac: AudioContext, at: number, base = NOTE.C7, count = 6) => {
  for (let i = 0; i < count; i++)
    tone(ac, { freq: semis(base, [0, 4, 7, 12, 7, 16][i % 6]), at: at + i * 0.045, dur: 0.25, gain: 0.07, partials: [[2.01, 0.3]] });
};

// ---------- the sounds ----------

const SOUNDS: Record<SoundName, (ac: AudioContext, o: { streak?: number }) => void> = {
  /** Soft click when an answer tile is selected. */
  tap: (ac) => tone(ac, { freq: 720, glideTo: 520, dur: 0.07, gain: 0.18, type: "triangle" }),

  /** Bright two-note "ding-ding". Pass `streak` to climb a semitone per correct answer in a row (max +7). */
  correct: (ac, { streak = 0 }) => {
    const up = Math.min(Math.max(streak - 1, 0), 7);
    tone(ac, { freq: semis(NOTE.C6, up), dur: 0.22, gain: 0.26, partials: BELL });
    tone(ac, { freq: semis(NOTE.G6, up), at: 0.085, dur: 0.6, gain: 0.3, partials: BELL });
    tone(ac, { freq: semis(NOTE.C7, up), at: 0.085, dur: 0.35, gain: 0.06 });
  },

  /** Low, rounded "bwom-bwom": clearly wrong, never harsh. */
  wrong: (ac) => {
    tone(ac, { freq: NOTE["A#3"], dur: 0.16, gain: 0.32, type: "square", lowpass: 700, glideTo: NOTE.A3 });
    tone(ac, { freq: NOTE.F3, at: 0.15, dur: 0.32, gain: 0.34, type: "square", lowpass: 600, glideTo: NOTE.E3 });
  },

  /** Lesson complete: rising arpeggio into a held major chord with sparkles. */
  complete: (ac) => {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone(ac, { freq: f, at: i * 0.1, dur: 0.3, gain: 0.22, type: "triangle", partials: [[2, 0.2]] }));
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f) =>
      tone(ac, { freq: f, at: 0.42, dur: 1.4, gain: 0.12, type: "triangle", attack: 0.02, vibrato: 3 }),
    );
    sparkle(ac, 0.45);
  },

  /** Level up / certificate: fast two-octave run and a bigger shimmer. */
  levelUp: (ac) => {
    const run = [NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
    run.forEach((f, i) => tone(ac, { freq: f, at: i * 0.055, dur: 0.2, gain: 0.18, type: "square", lowpass: 3500 }));
    [NOTE.C6, NOTE.G6, NOTE.C7].forEach((f) => tone(ac, { freq: f, at: 0.4, dur: 1.6, gain: 0.14, partials: BELL, vibrato: 4 }));
    noise(ac, { at: 0.4, dur: 1.2, gain: 0.05, type: "highpass", freq: 7000 });
    sparkle(ac, 0.5, NOTE.E7, 8);
  },

  /** A heart breaks: short pop then a falling slide. */
  heartLost: (ac) => {
    noise(ac, { dur: 0.06, gain: 0.25, freq: 1500 });
    tone(ac, { freq: 640, glideTo: 180, at: 0.03, dur: 0.45, gain: 0.25, type: "triangle" });
  },

  /** No hearts left: slow sad minor descent. */
  outOfHearts: (ac) => {
    [NOTE.G4, NOTE["D#4"], NOTE.C4].forEach((f, i) =>
      tone(ac, { freq: f, at: i * 0.28, dur: i === 2 ? 1.1 : 0.35, gain: 0.22, type: "triangle", vibrato: i === 2 ? 4 : 0 }),
    );
  },

  /** XP gained / coin: quick two-step blip. Fire repeatedly while a counter ticks up. */
  xp: (ac) => {
    tone(ac, { freq: NOTE.B5, dur: 0.08, gain: 0.14, type: "square", lowpass: 4000 });
    tone(ac, { freq: NOTE.E6, at: 0.06, dur: 0.25, gain: 0.14, type: "square", lowpass: 4000 });
  },

  /** Streak extended: whoosh of flame then a warm chime. */
  streak: (ac) => {
    noise(ac, { dur: 0.5, gain: 0.18, type: "bandpass", freq: 400, sweepTo: 3000, attack: 0.15 });
    [NOTE.E5, NOTE.A5, NOTE.E6].forEach((f, i) => tone(ac, { freq: f, at: 0.35 + i * 0.07, dur: 0.6, gain: 0.16, partials: BELL }));
  },

  /** Quest chest opens: wooden rattle, then sparkle. */
  chest: (ac) => {
    [0, 0.07, 0.13, 0.18].forEach((at) => noise(ac, { at, dur: 0.05, gain: 0.22, freq: 900 }));
    tone(ac, { freq: 140, at: 0.26, dur: 0.18, gain: 0.3, type: "triangle" });
    sparkle(ac, 0.32, NOTE.C7, 10);
  },

  /** Timer tick (woodblock). Use every second for the last 10s. */
  tick: (ac) => tone(ac, { freq: 1250, dur: 0.05, gain: 0.2, partials: [[2.7, 0.3]] }),

  /** Higher, louder tick for the last 5 seconds. */
  tickUrgent: (ac) => {
    tone(ac, { freq: 1700, dur: 0.06, gain: 0.28, partials: [[2.7, 0.3]] });
    tone(ac, { freq: 220, dur: 0.08, gain: 0.15, type: "triangle" });
  },

  /** Time's up: low gong. */
  timeUp: (ac) => {
    tone(ac, { freq: 110, dur: 1.6, gain: 0.35, partials: [[2.76, 0.3], [5.4, 0.12], [8.9, 0.05]] });
    noise(ac, { dur: 0.3, gain: 0.08, type: "lowpass", freq: 900 });
  },

  /** 3-2-1 countdown beep. Call once per number, then `go`. */
  countdown: (ac) => tone(ac, { freq: NOTE.A5, dur: 0.18, gain: 0.22, type: "square", lowpass: 2500 }),

  /** "Go!" after the countdown. */
  go: (ac) => {
    tone(ac, { freq: NOTE.A6, dur: 0.5, gain: 0.24, type: "square", lowpass: 3000 });
    tone(ac, { freq: NOTE.E6, dur: 0.5, gain: 0.16, type: "triangle" });
  },

  /** Player's phone after tapping a tile. */
  answerLocked: (ac) => {
    tone(ac, { freq: NOTE.E5, dur: 0.1, gain: 0.2, type: "triangle" });
    tone(ac, { freq: NOTE.B5, at: 0.07, dur: 0.2, gain: 0.2, type: "triangle" });
  },

  /** Snare roll before the podium reveal (~2s), ends on a cymbal. Follow with `podium`. */
  drumroll: (ac) => {
    let t = 0;
    for (let i = 0; i < 34; i++) {
      noise(ac, { at: t, dur: 0.07, gain: 0.06 + (i / 34) * 0.16, type: "bandpass", freq: 1800 });
      t += 0.075 - i * 0.0012;
    }
    noise(ac, { at: t, dur: 1.4, gain: 0.22, type: "highpass", freq: 5000 });
    tone(ac, { freq: 80, at: t, dur: 0.4, gain: 0.4 });
  },

  /** Winner fanfare on the podium. */
  podium: (ac) => {
    const seq: [number, number, number][] = [[NOTE.G4, 0, 0.12], [NOTE.G4, 0.13, 0.12], [NOTE.G4, 0.26, 0.12], [NOTE.C5, 0.4, 0.5], [NOTE.E5, 0.62, 0.18], [NOTE.G5, 0.8, 1.4]];
    seq.forEach(([f, at, dur]) => tone(ac, { freq: f, at, dur, gain: 0.2, type: "sawtooth", lowpass: 2800, vibrato: dur > 1 ? 4 : 0 }));
    [NOTE.C4, NOTE.E4, NOTE.G4].forEach((f) => tone(ac, { freq: f, at: 0.8, dur: 1.5, gain: 0.1, type: "triangle" }));
    noise(ac, { at: 0.8, dur: 1.2, gain: 0.1, type: "highpass", freq: 6000 });
    sparkle(ac, 0.9, NOTE.G6, 10);
  },
};

export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];

/** Play a sound. Silently does nothing if muted, on the server, or if audio is unavailable. */
export function playSound(name: SoundName, opts: { streak?: number } = {}) {
  if (!enabled) return;
  const ac = audio();
  if (!ac || !master) return;
  try {
    SOUNDS[name](ac, opts);
  } catch {
    /* never let a sound break the lesson */
  }
}
