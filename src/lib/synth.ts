/**
 * Web Audio fallback voices for src/lib/sound.ts, used when public/sounds/<name>.mp3 is missing.
 * Building blocks and most recipes come from the team's sounds/sounds.ts; names follow the app spec.
 * Soft and short: nothing over 1.5 s except the fanfares.
 */
import type { SoundName } from "./sound";

let noiseBuffer: AudioBuffer | null = null;

const NOTE: Record<string, number> = {};
["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].forEach((n, i) => {
  for (let oct = 2; oct <= 7; oct++) NOTE[`${n}${oct}`] = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
});

interface ToneOpts {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  glideTo?: number;
  partials?: [ratio: number, gain: number][];
  lowpass?: number;
  vibrato?: number;
}

function tone(ac: AudioContext, out: AudioNode, o: ToneOpts) {
  const t = ac.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.3;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(o.gain ?? 0.3, t + (o.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  let tail: AudioNode = env;
  if (o.lowpass) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lowpass;
    env.connect(f);
    tail = f;
  }
  tail.connect(out);

  const layers: [number, number, OscillatorType][] = [
    [1, 1, o.type ?? "sine"],
    ...(o.partials ?? []).map(([r, g]) => [r, g, "sine"] as [number, number, OscillatorType]),
  ];
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

function noise(
  ac: AudioContext,
  out: AudioNode,
  o: { at?: number; dur?: number; gain?: number; type?: BiquadFilterType; freq?: number; sweepTo?: number; attack?: number },
) {
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
  src.connect(f).connect(env).connect(out);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const BELL: [number, number][] = [
  [2, 0.35],
  [3, 0.12],
  [4.2, 0.05],
];
const semis = (freq: number, n: number) => freq * Math.pow(2, n / 12);
const sparkle = (ac: AudioContext, out: AudioNode, at: number, base = NOTE.C7, count = 6) => {
  for (let i = 0; i < count; i++)
    tone(ac, out, { freq: semis(base, [0, 4, 7, 12, 7, 16][i % 6]), at: at + i * 0.045, dur: 0.25, gain: 0.07, partials: [[2.01, 0.3]] });
};

type Recipe = (ac: AudioContext, out: AudioNode) => void;

export const SYNTH: Record<SoundName, Recipe> = {
  select: (ac, out) => tone(ac, out, { freq: 720, glideTo: 520, dur: 0.07, gain: 0.18, type: "triangle" }),

  correct: (ac, out) => {
    tone(ac, out, { freq: NOTE.C6, dur: 0.22, gain: 0.26, partials: BELL });
    tone(ac, out, { freq: NOTE.G6, at: 0.085, dur: 0.6, gain: 0.3, partials: BELL });
    tone(ac, out, { freq: NOTE.C7, at: 0.085, dur: 0.35, gain: 0.06 });
  },

  wrong: (ac, out) => {
    tone(ac, out, { freq: NOTE["A#3"], dur: 0.16, gain: 0.32, type: "square", lowpass: 700, glideTo: NOTE.A3 });
    tone(ac, out, { freq: NOTE.F3, at: 0.15, dur: 0.32, gain: 0.34, type: "square", lowpass: 600, glideTo: NOTE.E3 });
  },

  "heart-lost": (ac, out) => {
    tone(ac, out, { freq: 160, glideTo: 70, dur: 0.22, gain: 0.45, type: "sine" });
    noise(ac, out, { dur: 0.08, gain: 0.18, type: "lowpass", freq: 500 });
  },



  "lesson-complete": (ac, out) => {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) =>
      tone(ac, out, { freq: f, at: i * 0.1, dur: 0.3, gain: 0.22, type: "triangle", partials: [[2, 0.2]] }),
    );
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f) =>
      tone(ac, out, { freq: f, at: 0.42, dur: 1.4, gain: 0.12, type: "triangle", attack: 0.02, vibrato: 3 }),
    );
    sparkle(ac, out, 0.45);
  },

  "boss-pass": (ac, out) => {
    const run = [NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
    run.forEach((f, i) => tone(ac, out, { freq: f, at: i * 0.055, dur: 0.2, gain: 0.18, type: "square", lowpass: 3500 }));
    [NOTE.C6, NOTE.G6, NOTE.C7].forEach((f) => tone(ac, out, { freq: f, at: 0.4, dur: 1.6, gain: 0.14, partials: BELL, vibrato: 4 }));
    noise(ac, out, { at: 0.4, dur: 1.2, gain: 0.05, type: "highpass", freq: 7000 });
    sparkle(ac, out, 0.5, NOTE.E7, 8);
  },

  "boss-fail": (ac, out) => {
    [NOTE.G4, NOTE["D#4"], NOTE.C4].forEach((f, i) =>
      tone(ac, out, { freq: f, at: i * 0.28, dur: i === 2 ? 1.1 : 0.35, gain: 0.22, type: "triangle", vibrato: i === 2 ? 4 : 0 }),
    );
  },

  "chest-open": (ac, out) => {
    tone(ac, out, { freq: 300, glideTo: 900, dur: 0.12, gain: 0.25, type: "triangle" });
    sparkle(ac, out, 0.1, NOTE.C7, 10);
  },

  streak: (ac, out) => {
    noise(ac, out, { dur: 0.5, gain: 0.18, type: "bandpass", freq: 400, sweepTo: 3000, attack: 0.15 });
    [NOTE.E5, NOTE.A5, NOTE.E6].forEach((f, i) => tone(ac, out, { freq: f, at: 0.35 + i * 0.07, dur: 0.6, gain: 0.16, partials: BELL }));
  },

  achievement: (ac, out) => {
    [NOTE.E6, NOTE.B6].forEach((f, i) => tone(ac, out, { freq: f, at: i * 0.09, dur: 0.7, gain: 0.2, partials: BELL }));
  },

  "pair-match": (ac, out) => tone(ac, out, { freq: 500, glideTo: 1100, dur: 0.09, gain: 0.2, type: "sine" }),


};
