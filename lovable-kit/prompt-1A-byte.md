# Prompt 1A: add Byte (paste-in fallback)

Use this only if install-byte.sh can't be used (no GitHub connected). Paste everything below the line
into the Lovable chat as ONE message, right after Prompt 1 has finished.

---

Add our mascot, Byte. The complete component is below.

1. Create src/components/Byte.tsx containing EXACTLY the code below. Do not rewrite, reformat, restyle,
   split or "improve" it, and never edit it later.
2. Make sure framer-motion is installed.
3. Add to src/index.css:
   :root { --byte-shadow: #dfe1ee; --byte-backdrop: transparent; }
   .dark { --byte-shadow: #0d1518; --byte-backdrop: #263840; }
4. Don't place Byte anywhere yet; the next prompts say where. Never draw any other mascot art.

```tsx
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion, type TargetAndTransition } from "framer-motion";

/**
 * Byte, the Career Quest mascot.
 *
 *   <Byte mood="correct" size={160} />
 *
 * One vector character, no image files. Every mood is the same rig in a different
 * configuration: arm angles, eyelids / pupils / beak, and a few props (sparkles,
 * laptop, chest…). Switching moods swings the arms and re-forms the face rather than
 * swapping pictures. Reactions play once and hold; ambient moods loop gently.
 *
 * Theming: --byte-shadow (floor pill) and --byte-backdrop (disc behind him, for dark mode).
 */

export type MouthShape = "open" | "round" | "wide";

export const MOODS = [
  "idle", "talking", "stare", "smug", "shocked", "sad", "locked-in",
  "correct", "wrong", "level-up", "coding", "out-of-hearts", "chest", "wave", "thinking",
] as const;
export type ByteMood = (typeof MOODS)[number];

type Props = {
  mood?: ByteMood;
  /** Mouth openness 0–1, driven from outside (see useLipSync). Runs as its own layer on top of
   *  any mood, so Byte can talk while celebrating. Leave undefined to let the mood decide. */
  mouth?: number;
  /** Beak shape while talking: "round" for o/u, "wide" for e/i (useLipSync returns it). */
  mouthShape?: MouthShape;
  /** Pupils follow the pointer (hero, onboarding). Off by default: in lessons it competes with the content. */
  followPointer?: boolean;
  /** Width in px. Height is size × 0.93. */
  size?: number;
  className?: string;
};

/** Canvas: character is ~200 units wide, floor at y=208, room around him for props. */
const VIEWBOX = "-40 -40 280 260";
const ASPECT = 260 / 280;

const C = {
  hood: "#354254", hoodFront: "#46536B", shade: "#272C36", face: "#DEE1F9", faceShade: "#BABEEC",
  white: "#FFFFFF", beak: "#FFB31F", beakLow: "#F89413", green: "#75DA31",
  zip: "#8B8E96", tongue: "#FA779B", tear: "#71C4F9", yellow: "#FBBA1A", blue: "#71C4F9",
  smoke: "#8B8E96", heartGrey: "#AFB3BF", laptop: "#53575E", laptopEdge: "#8B8E96",
  blush: "#FF9DB6", wood: "#D9822B", woodShade: "#B4651C", gold: "#FFC800", glow: "#FFE7A3",
};

/* ================================================================ poses */

type Face = {
  lid: number;      // upper lid drop: 0 open, 52 shut
  tilt: number;     // upper lid rotation: + inner corners down (focused), − inner corners up (sad)
  lower: number;    // lower lid rise
  center: boolean;  // pupils centred (stare / shock) instead of low-and-inward (Duolingo rule)
  look: number;     // sideways look
  lift: number;     // pupil vertical offset
  pupil: number;    // pupil scale
  jaw: number;      // beak open amount
  happy?: boolean;  // closed ∩ eyes
  blush?: boolean;  // pink cheeks (pleased, proud, excited)
  glossy?: boolean; // big watery highlights (sad)
};
// Every flipper is the same shape and size in every pose (as Duolingo keeps Duo's wings): a pose only
// sets the angle, whether it sits in front of the body, and a small pivot nudge for reaching across.
type Arm = { a: number; front?: boolean; dx?: number; dy?: number };
const ARM_LEN = 46;
type Prop = "sparkles" | "heart" | "smoke" | "laptop" | "chest" | "glow" | "tears" | "tear" | "broken-heart" | "brim" | "dots";
type Pose = { face: Face; arms: [Arm, Arm]; props?: Prop[] };

const F = (o: Partial<Face> = {}): Face => ({ lid: 0, tilt: 0, lower: 0, center: false, look: 0, lift: 0, pupil: 1, jaw: 0, ...o });
// Arm angle a: 0 = straight out sideways, + raises, − lowers, ~180–240 = across the front.
const DOWN: [Arm, Arm] = [{ a: -44 }, { a: -44 }];

const POSES: Record<ByteMood, Pose> = {
  idle:      { face: F(), arms: DOWN },
  talking:   { face: F(), arms: [{ a: -34 }, { a: -44 }] },
  stare:     { face: F({ center: true, pupil: 0.55 }), arms: [{ a: -54 }, { a: -54 }] },
  smug:      { face: F({ lid: 24, look: 6, lift: 3, pupil: 0.95 }), arms: [{ a: -26 }, { a: -26 }] },
  shocked:   { face: F({ center: true, pupil: 0.5, jaw: 15 }), arms: [{ a: 34 }, { a: 34 }] },
  sad:       { face: F({ lid: 14, tilt: -16, lower: 9, lift: 6, pupil: 1.12, glossy: true }), arms: [{ a: -68 }, { a: -68 }], props: ["tears"] },
  "locked-in": { face: F({ lid: 22, tilt: 12, lower: 12, center: true, pupil: 0.8 }), arms: [{ a: -58 }, { a: -58 }], props: ["glow"] },
  correct:   { face: F({ lift: -3, jaw: 11, blush: true }), arms: [{ a: 64 }, { a: 64 }], props: ["sparkles"] },
  wrong:     { face: F({ lid: 20, tilt: 10, look: 7, pupil: 0.9 }),
               arms: [{ a: 200, front: true, dx: 16, dy: 4 }, { a: 166, front: true, dx: 16, dy: 22 }], props: ["smoke"] },
  "level-up": { face: F({ happy: true, jaw: 9, blush: true }), arms: [{ a: 28 }, { a: 28 }], props: ["sparkles", "heart"] },
  coding:    { face: F({ lid: 20, tilt: 8, lower: 10, center: true, lift: 4, pupil: 0.8 }),
               arms: [{ a: 250, front: true, dx: 8 }, { a: 250, front: true, dx: 8 }], props: ["glow", "laptop"] },
  "out-of-hearts": { face: F({ lid: 20, tilt: -12, lower: 6, lift: 8, pupil: 1.05, glossy: true }),
               arms: [{ a: -76 }, { a: -76 }], props: ["brim", "tear", "broken-heart"] },
  // right flipper up; ByteRig swings it between 62° and 96° while waving
  wave:      { face: F({ lift: -2, jaw: 7, blush: true }), arms: [{ a: -44 }, { a: 78 }] },
  // right flipper to the chin, eyes up and away, thought dots
  thinking:  { face: F({ lid: 8, look: -6, lift: -7, pupil: 0.9 }),
               arms: [{ a: -44 }, { a: 146, front: true, dx: 6 }], props: ["dots"] },
  chest:     { face: F({ lift: -4, jaw: 9, blush: true }),
               arms: [{ a: 244, front: true, dx: 4 }, { a: 244, front: true, dx: 4 }], props: ["chest"] },
};

// Whole-body attitude per mood (held, not looped): slump, stretch, lean, tilt. Duolingo poses act with
// the whole body, not just the face.
const LEAN: Partial<Record<ByteMood, TargetAndTransition>> = {
  stare:     { scaleY: 1.02, scaleX: 0.99 },
  smug:      { rotate: -5, y: -1 },
  shocked:   { scaleY: 1.06, scaleX: 0.96, y: -2 },
  sad:       { y: 4, scaleY: 0.95, scaleX: 1.03, rotate: 2 },
  "locked-in": { y: 3, scaleY: 0.97, scaleX: 1.02 },
  wrong:     { rotate: 3 },
  coding:    { y: 2 },
  "out-of-hearts": { y: 6, scaleY: 0.92, scaleX: 1.05 },
  chest:     { rotate: -2 },
  wave:      { rotate: -3 },
  thinking:  { rotate: 5, x: -2 },
};
const UPRIGHT = { rotate: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };

/* ================================================================ motion */

const forever = { repeat: Infinity };
// HTML-level body motion (framer keyframes work on HTML; not on SVG transforms).
const BODY: Partial<Record<ByteMood, TargetAndTransition>> = {
  idle:      { scaleY: [1, 1.025, 1], transition: { duration: 2.6, ease: "easeInOut", ...forever } },
  stare:     { scaleY: [1, 1.01, 1], transition: { duration: 3.6, ease: "easeInOut", ...forever } },
  talking:   { y: [0, -2, 0], transition: { duration: 0.5, ease: "easeInOut", ...forever } },
  smug:      { rotate: [0, -3, 0], transition: { duration: 2.4, ease: "easeInOut", ...forever } },
  sad:       { y: [0, 2, 0], scaleY: [1, 0.985, 1], transition: { duration: 2.8, ease: "easeInOut", ...forever } },
  "locked-in": { scale: [1, 1.015, 1], transition: { duration: 1.6, ease: "easeInOut", ...forever } },
  coding:    { y: [0, -1.5, 0], transition: { duration: 0.3, ease: "linear", ...forever } },
  "out-of-hearts": { y: [0, 2, 0], scaleY: [1, 0.98, 1], transition: { duration: 3.2, ease: "easeInOut", ...forever } },
  chest:     { y: [0, -3, 0], transition: { duration: 1.4, ease: "easeInOut", ...forever } },
  wave:      { rotate: [0, 2, 0, -1, 0], transition: { duration: 1.1, ease: "easeInOut", ...forever } },
  thinking:  { rotate: [0, -3, -3, 0], transition: { duration: 3, times: [0, 0.3, 0.7, 1], ease: "easeInOut", ...forever } },
  shocked:   { y: [0, -12, 0], scaleY: [1, 1.06, 1], transition: { duration: 0.4, ease: "easeOut" } },
  wrong:     { x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.5, ease: "easeInOut" } },
  // reactions crouch first (anticipation), then launch, then squash on landing
  correct:   { y: [0, 3, -26, 0, 0], scaleY: [1, 0.9, 1.07, 0.92, 1], scaleX: [1, 1.07, 0.96, 1.06, 1],
               transition: { duration: 0.72, times: [0, 0.14, 0.45, 0.78, 1], ease: "easeOut", repeat: 1, repeatDelay: 0.12 } },
  "level-up": { y: [0, 2, -14, 0], scaleY: [1, 0.94, 1.04, 1], rotate: [0, 0, -5, 0],
               transition: { duration: 0.85, times: [0, 0.2, 0.55, 1], ease: "easeInOut", repeat: 2, repeatDelay: 0.2 } },
};
const SHADOW: Partial<Record<ByteMood, TargetAndTransition>> = {
  correct:   { scaleX: [1, 1.05, 0.7, 1, 1], opacity: [1, 1, 0.6, 1, 1], transition: BODY.correct!.transition },
  "level-up": { scaleX: [1, 1.03, 0.82, 1], transition: BODY["level-up"]!.transition },
  shocked:   { scaleX: [1, 0.85, 1], transition: BODY.shocked!.transition },
  chest:     { scaleX: [1, 0.97, 1], transition: BODY.chest!.transition },
};
// A quick squash on every mood change, so he visibly "reacts" to the switch.
const POP = { scaleX: [1.08, 0.97, 1], scaleY: [0.9, 1.04, 1], transition: { duration: 0.35, ease: "easeOut" as const } };
const FIDGET_NOD = { y: [0, 4, 0, 2, 0], transition: { duration: 0.9, ease: "easeInOut" as const } };
const FIDGET_TILT = { rotate: [0, -4, -4, 0], transition: { duration: 1.6, times: [0, 0.25, 0.75, 1], ease: "easeInOut" as const } };

/* ================================================================ component */

export function Byte({ mood = "idle", mouth, mouthShape, followPointer = false, size = 160, className }: Props) {
  const reduce = !!useReducedMotion();
  const pop = useAnimationControls();
  useEffect(() => { if (!reduce) pop.start(POP); }, [mood, reduce, pop]);

  // Idle behaviour layer: every 7–12 s an idle Byte nods or tilts his head, so he never freezes.
  useEffect(() => {
    if (reduce || mood !== "idle") return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        pop.start(Math.random() < 0.5 ? FIDGET_NOD : FIDGET_TILT);
        next();
      }, 7000 + Math.random() * 5000);
    };
    next();
    return () => clearTimeout(t);
  }, [mood, reduce, pop]);

  const box = useRef<HTMLDivElement>(null);
  const gaze = useGaze(box, followPointer && !reduce);
  const fill = { position: "absolute" as const, inset: 0, width: "100%", height: "100%" };

  return (
    <div ref={box} className={className} style={{ position: "relative", width: size, height: size * ASPECT }}
      role="img" aria-label={`Byte, ${mood.replace(/-/g, " ")}`}>
      <svg viewBox={VIEWBOX} style={fill} aria-hidden="true">
        <circle cx={100} cy={112} r={112} style={{ fill: "var(--byte-backdrop, transparent)" }} />
      </svg>
      {/* floor shadow: a pill, never an oval, a darker shade of the ground */}
      <motion.div
        key={`shadow-${mood}`}
        aria-hidden="true"
        style={{
          position: "absolute", left: `${(76 / 280) * 100}%`, width: `${(128 / 280) * 100}%`,
          top: `${(242 / 260) * 100}%`, height: `${(11 / 260) * 100}%`,
          borderRadius: 999, background: "var(--byte-shadow, #E5E5E5)",
        }}
        animate={reduce ? undefined : SHADOW[mood]}
      />
      <motion.div style={{ ...fill, originY: 0.9 }} animate={pop}>
        <motion.div style={{ ...fill, originY: 0.9 }} initial={false}
          animate={reduce ? UPRIGHT : { ...UPRIGHT, ...LEAN[mood] }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}>
        <motion.div style={{ ...fill, originY: 0.9 }} animate={reduce ? undefined : BODY[mood]}>
          <ByteRig mood={mood} mouth={mouth} mouthShape={mouthShape} gaze={gaze} reduce={reduce} />
        </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ================================================================ hooks */

/** Random blink every 3–6 s. */
function useBlink(enabled: boolean) {
  const [shut, setShut] = useState(false);
  useEffect(() => {
    if (!enabled) { setShut(false); return; }
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => { setShut(true); t = setTimeout(() => { setShut(false); next(); }, 110); }, 3000 + Math.random() * 3000);
    };
    next();
    return () => clearTimeout(t);
  }, [enabled]);
  return shut;
}

/** Beak flap while talking: state toggle + static targets (SVG transform keyframes don't apply). */
function useFlap(enabled: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!enabled) { setOpen(false); return; }
    const id = setInterval(() => setOpen((o) => !o), 120);
    return () => clearInterval(id);
  }, [enabled]);
  return open;
}

/** Pupil offset towards the pointer, in rig units (±5 x, ±4 y). rAF-throttled. */
function useGaze(ref: { current: HTMLElement | null }, enabled: boolean) {
  const [g, setG] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) { setG({ x: 0, y: 0 }); return; }
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.35);
        const k = (v: number) => Math.max(-1, Math.min(1, v / 220));
        setG({ x: k(dx) * 5.5, y: k(dy) * 4.5 });
      });
    };
    const reset = () => setG({ x: 0, y: 0 });
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", reset);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", reset); };
  }, [ref, enabled]);
  return g;
}

/** Waving flipper: alternates between two angles (static targets, so it works on SVG). */
function useWave(enabled: boolean) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!enabled) { setUp(false); return; }
    const id = setInterval(() => setUp((u) => !u), 260);
    return () => clearInterval(id);
  }, [enabled]);
  return up;
}

/** Occasional glance left/right. */
function useGlance(enabled: boolean) {
  const [dx, setDx] = useState(0);
  useEffect(() => {
    if (!enabled) { setDx(0); return; }
    const id = setInterval(() => setDx((d) => (d !== 0 ? 0 : Math.random() < 0.5 ? -4 : 4)), 2400);
    return () => clearInterval(id);
  }, [enabled]);
  return dx;
}

/* ================================================================ rig */

const EYES = [{ side: "L", cx: 76.3, sign: 1 }, { side: "R", cx: 123.7, sign: -1 }] as const;
// All body / face geometry below is measured from the front pose of the model sheet (src/sheet.jpg).
const EYE_Y = 58, EYE_W = 33.6, EYE_H = 44.8, EYE_RY = 20, EYE_CY = EYE_Y + EYE_H / 2;
// Shoulder + rest-pose flipper fitted to the sheet silhouette (IoU 0.954).
const SHOULDER = { x: 44, y: 139 };
const FACE_D = "M100.0 41.6 C103.7 41.6 107.0 41.6 111.2 42.5 C115.4 43.4 121.5 45.4 125.0 46.8 C128.5 48.2 130.2 49.7 132.3 51.1 C134.4 52.5 135.9 54.0 137.5 55.4 C139.1 56.8 140.7 58.3 141.8 59.7 C143.0 61.1 143.5 62.6 144.4 64.0 C145.3 65.4 146.3 66.8 147.0 68.3 C147.7 69.8 148.1 71.2 148.7 72.7 C149.3 74.2 150.0 75.6 150.4 77.0 C150.8 78.4 151.0 79.9 151.3 81.3 C151.6 82.7 152.0 83.4 152.2 85.6 C152.3 87.8 152.3 92.0 152.2 94.2 C152.1 96.4 152.1 97.1 151.7 98.5 C151.3 99.9 150.4 101.4 149.6 102.8 C148.8 104.2 148.3 105.7 147.0 107.1 C145.7 108.5 144.0 110.0 141.8 111.4 C139.6 112.9 137.0 114.3 134.0 115.8 C131.0 117.2 127.1 118.7 123.7 120.1 C120.3 121.5 116.5 123.0 113.8 124.4 C111.1 125.8 109.6 127.4 107.3 128.7 C105.0 130.0 102.4 132.0 100.0 132.0 C97.6 132.0 95.0 130.0 92.7 128.7 C90.4 127.4 88.9 125.8 86.2 124.4 C83.5 123.0 79.7 121.5 76.3 120.1 C72.9 118.7 69.0 117.2 66.0 115.8 C63.0 114.3 60.4 112.9 58.2 111.4 C56.0 110.0 54.3 108.5 53.0 107.1 C51.7 105.7 51.2 104.2 50.4 102.8 C49.6 101.4 48.7 99.9 48.3 98.5 C47.9 97.1 47.9 96.4 47.8 94.2 C47.7 92.0 47.6 87.8 47.8 85.6 C47.9 83.4 48.4 82.7 48.7 81.3 C49.0 79.9 49.2 78.4 49.6 77.0 C50.0 75.6 50.7 74.2 51.3 72.7 C51.9 71.2 52.3 69.8 53.0 68.3 C53.7 66.8 54.7 65.4 55.6 64.0 C56.5 62.6 57.1 61.1 58.2 59.7 C59.4 58.3 60.9 56.8 62.5 55.4 C64.1 54.0 65.6 52.5 67.7 51.1 C69.8 49.7 71.5 48.2 75.0 46.8 C78.5 45.4 84.6 43.4 88.8 42.5 C93.0 41.6 96.3 41.6 100.0 41.6 Z";
const BODY_D = "M100.0 6.4 C104.0 6.4 108.8 7.0 112.1 7.5 C115.4 8.0 117.3 8.8 119.6 9.5 C121.9 10.2 123.8 11.1 125.8 12.0 C127.8 12.9 129.5 13.8 131.4 15.0 C133.3 16.2 135.2 17.5 137.1 19.0 C139.0 20.5 141.0 22.2 142.8 24.0 C144.7 25.8 146.5 27.8 148.2 30.0 C149.9 32.2 151.6 34.5 153.2 37.0 C154.8 39.5 156.2 42.2 157.6 45.0 C159.0 47.8 160.3 50.8 161.4 54.0 C162.5 57.2 163.5 60.5 164.3 64.0 C165.1 67.5 165.9 71.5 166.4 75.0 C166.9 78.5 167.1 82.2 167.3 85.0 C167.5 87.8 167.4 89.5 167.4 91.5 C167.4 93.5 167.4 95.1 167.2 97.0 C167.0 98.9 166.6 100.8 166.0 102.8 C165.4 104.8 164.5 106.5 163.9 109.0 C163.3 111.5 162.6 114.8 162.2 118.0 C161.8 121.2 161.8 124.0 161.6 128.0 C161.4 132.0 161.6 137.5 161.0 142.0 C160.4 146.5 159.3 151.2 158.0 155.0 C156.7 158.8 155.0 161.5 153.0 165.0 C151.0 168.5 148.3 172.8 146.0 176.0 C143.7 179.2 141.8 182.1 139.0 184.5 C136.2 186.9 133.0 188.9 129.0 190.5 C125.0 192.1 119.8 193.1 115.0 193.8 C110.2 194.5 105.0 194.5 100.0 194.5 C95.0 194.5 89.8 194.5 85.0 193.8 C80.2 193.1 75.0 192.1 71.0 190.5 C67.0 188.9 63.8 186.9 61.0 184.5 C58.2 182.1 56.3 179.2 54.0 176.0 C51.7 172.8 49.0 168.5 47.0 165.0 C45.0 161.5 43.3 158.8 42.0 155.0 C40.7 151.2 39.6 146.5 39.0 142.0 C38.4 137.5 38.6 132.0 38.4 128.0 C38.2 124.0 38.2 121.2 37.8 118.0 C37.4 114.8 36.7 111.5 36.1 109.0 C35.5 106.5 34.5 104.8 34.0 102.8 C33.5 100.8 33.0 98.9 32.8 97.0 C32.6 95.1 32.6 93.5 32.6 91.5 C32.6 89.5 32.5 87.8 32.7 85.0 C32.9 82.2 33.1 78.5 33.6 75.0 C34.1 71.5 34.9 67.5 35.7 64.0 C36.5 60.5 37.5 57.2 38.6 54.0 C39.7 50.8 41.0 47.8 42.4 45.0 C43.8 42.2 45.2 39.5 46.8 37.0 C48.4 34.5 50.1 32.2 51.8 30.0 C53.5 27.8 55.3 25.8 57.2 24.0 C59.0 22.2 61.0 20.5 62.9 19.0 C64.8 17.5 66.7 16.2 68.6 15.0 C70.5 13.8 72.2 12.9 74.2 12.0 C76.2 11.1 78.1 10.2 80.4 9.5 C82.7 8.8 84.6 8.0 87.9 7.5 C91.2 7.0 96.0 6.4 100.0 6.4 Z";
const spring = { type: "spring" as const, stiffness: 300, damping: 22 };

/** One flipper, pivoting at the shoulder. Same shape and size in every pose; the right one is mirrored. */
function Sleeve({ arm, right, still }: { arm: Arm; right?: boolean; still?: boolean }) {
  const L = ARM_LEN;
  // tapered: root radius 13 (hidden at the shoulder), tip radius 17 (the rounded mitten end)
  const d = `M14 -13 L${-L + 17} -17 A17 17 0 0 0 ${-L + 17} 17 L14 13 A13 13 0 0 0 14 -13 Z`;
  const tip = `M${-L + 20} -16.7 A17 17 0 0 0 ${-L + 20} 16.7 Z`;
  const parts = (
    <>
      {/* front flippers cross the same-colour hoodie, so one flat shade shape underneath separates them */}
      {arm.front && <path d={d} transform="translate(0 5)" fill={C.shade} />}
      {/* the same charcoal over the hoodie would vanish, so front flippers sit one step lighter */}
      <path d={d} fill={arm.front ? C.hoodFront : C.hood} />
      {arm.front && <path d={tip} fill={C.faceShade} />}
    </>
  );
  return (
    <g transform={right ? "translate(200 0) scale(-1 1)" : undefined}>
      <g transform={`translate(${SHOULDER.x + (arm.dx ?? 0)} ${SHOULDER.y + (arm.dy ?? 0)})`}>
        {/* the rotating group's bbox runs x −L…27, so its pivot (local 0,0) sits at L/(L+27) */}
        {still ? <g transform={`rotate(${arm.a})`}>{parts}</g> : (
          <motion.g initial={false} animate={{ rotate: arm.a }} transition={spring}
            style={{ originX: L / (L + 27), originY: 0.5 }}>{parts}</motion.g>
        )}
      </g>
    </g>
  );
}

const Sparkle = ({ x, y, s, c, d }: { x: number; y: number; s: number; c: string; d: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path className="byte-twinkle" style={{ animationDelay: `${d}s` }} fill={c}
      d="M0 -10 C1.5 -2.5 2.5 -1.5 10 0 C2.5 1.5 1.5 2.5 0 10 C-1.5 2.5 -2.5 1.5 -10 0 C-2.5 -1.5 -1.5 -2.5 0 -10 Z" />
  </g>
);
const SWING: ByteMood[] = ["correct", "level-up", "shocked", "wrong"];
const HEART_D = "M0 6 C-7 0 -13 -4 -10 -10 C-7 -15 -1 -13 0 -8 C1 -13 7 -15 10 -10 C13 -4 7 0 0 6 Z";

// CSS keyframes for SVG-internal loops (framer transform keyframes don't apply inside SVG).
const CSS = `
  .byte-twinkle { transform-box: fill-box; transform-origin: center; animation: byte-twinkle 1.6s ease-in-out infinite }
  @keyframes byte-twinkle { 0%,100% { transform: scale(1) rotate(0) } 50% { transform: scale(.7) rotate(20deg) } }
  .byte-float { animation: byte-float 2.4s ease-in-out infinite }
  @keyframes byte-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
  .byte-smoke { animation: byte-smoke 1.8s ease-out infinite }
  @keyframes byte-smoke { 0% { opacity: 0; transform: translateY(6px) } 25% { opacity: 1 } 100% { opacity: 0; transform: translateY(-10px) } }
  .byte-tear { animation: byte-tear 1.8s ease-in infinite }
  .byte-tear + .byte-tear { animation-delay: .6s }
  @keyframes byte-tear { 0% { opacity: 0; transform: translateY(0) } 15% { opacity: 1; transform: translateY(2px) }
    80% { opacity: 1; transform: translateY(14px) } 100% { opacity: 0; transform: translateY(18px) } }
  .byte-pop { transform-box: fill-box; transform-origin: center; animation: byte-pop .32s cubic-bezier(.34,1.56,.64,1) both }
  @keyframes byte-pop { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: scale(1) } }
  .byte-rise { animation: byte-rise .34s cubic-bezier(.34,1.56,.64,1) both }
  @keyframes byte-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
  .byte-dot { transform-box: fill-box; transform-origin: center; animation: byte-dot 1.2s ease-in-out infinite }
  @keyframes byte-dot { 0%,100% { opacity: .45; transform: scale(.85) } 50% { opacity: 1; transform: scale(1) } }
  .byte-string { transform-box: fill-box; transform-origin: 50% 0 }
  .byte-sway .byte-string { animation: byte-sway 3.2s ease-in-out infinite }
  .byte-sway .byte-string + .byte-string { animation-delay: -1.1s }
  @keyframes byte-sway { 0%,100% { transform: rotate(2deg) } 50% { transform: rotate(-2deg) } }
  .byte-swing .byte-string { animation: byte-swing .9s ease-out 2 }
  .byte-swing .byte-string + .byte-string { animation-delay: .06s }
  @keyframes byte-swing { 0% { transform: rotate(0) } 20% { transform: rotate(11deg) } 45% { transform: rotate(-8deg) }
    70% { transform: rotate(4deg) } 100% { transform: rotate(0) } }
  @media (prefers-reduced-motion: reduce) {
    .byte-twinkle, .byte-float, .byte-smoke, .byte-tear, .byte-string, .byte-pop, .byte-rise, .byte-dot { animation: none !important }
    .byte-tear { transform: translateY(2px) }
  }
`;

/** The full figure. Exported for static use (favicon, og-image). */
export function ByteRig({ mood = "idle", mouth, mouthShape, gaze, reduce = false, still = false }: {
  mood?: ByteMood; mouth?: number; mouthShape?: MouthShape; gaze?: { x: number; y: number }; reduce?: boolean;
  /** Plain SVG transforms instead of framer-motion, for server-rendered / exported stills. */
  still?: boolean;
}) {
  // React 18 ids contain ":", React 19 ids contain "«»"; keep only characters safe in url(#…)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pose = POSES[mood] ?? POSES.idle;
  const f = pose.face;
  const has = (p: Prop) => pose.props?.includes(p) ?? false;
  const shut = useBlink(!["stare", "shocked", "level-up"].includes(mood) && !reduce && !still);
  const glance = useGlance(mood === "idle" && !gaze?.x && !gaze?.y && !reduce);
  const flap = useFlap(mood === "talking" && mouth === undefined && !reduce);
  // mouth layer wins over the mood's own beak; otherwise the talking flap, otherwise the pose
  const jawDrop = mouth !== undefined ? Math.max(0, Math.min(1, mouth)) * 10 : flap ? 7 : f.jaw;
  const quick = { duration: 0.1, ease: "easeOut" as const };
  // tracking the pointer wants a much snappier spring than mood changes do
  const eyeSpring = gaze && (gaze.x || gaze.y) ? { type: "spring" as const, stiffness: 900, damping: 42 } : spring;
  // viseme width: o/u narrow the beak, e/i widen it (only while the mouth layer is driving)
  const beakW = mouth !== undefined && mouthShape === "round" ? 0.82 : mouth !== undefined && mouthShape === "wide" ? 1.12 : 1;
  const waving = useWave(mood === "wave" && !reduce && !still);
  const [left, rightPose] = pose.arms;
  const right = mood === "wave" ? { ...rightPose, a: waving ? 96 : 62 } : rightPose;
  // prop entrances are for live use; exported stills must show everything at frame 0
  const popIn = still ? undefined : "byte-pop";
  const riseIn = still ? undefined : "byte-rise";

  return (
    <svg viewBox={VIEWBOX} width="100%" height="100%" aria-hidden="true" style={{ overflow: "visible" }}>
      <style>{CSS}</style>
      <defs>
        {EYES.map((e) => (
          <clipPath key={e.side} id={`eye${e.side}-${uid}`}>
            <rect x={e.cx - EYE_W / 2} y={EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_W / 2} ry={EYE_RY} />
          </clipPath>
        ))}
      </defs>

      {/* props behind him */}
      {has("smoke") && (
        <g className={popIn}><g className="byte-smoke" fill={C.smoke}>
          <circle cx={160} cy={8} r={13} /><circle cx={176} cy={-2} r={12} /><circle cx={184} cy={14} r={11} />
          <circle cx={170} cy={18} r={10} /><circle cx={154} cy={26} r={5} />
        </g></g>
      )}

      {/* back sleeves (tucked behind the body, so no shoulder joint shows) */}
      {!left.front && <Sleeve arm={left} still={still} />}
      {!right.front && <Sleeve arm={right} right still={still} />}

      {/* feet, tucked behind the body's round bottom as on the sheet */}
      <g fill={C.beakLow}>
        <rect x={62.1} y={186} width={31} height={22.7} rx={10} /><rect x={108.6} y={186} width={31} height={22.7} rx={10} />
      </g>
      {/* hood + body silhouette, the hood rim's shade under the face, then the face (all traced from the sheet) */}
      <path fill={C.hood} d={BODY_D} />
      <path fill={C.shade} transform="translate(0 3.5)" d={FACE_D} />
      <path fill={C.face} d={FACE_D} />
      <g fill={C.faceShade}>
        <ellipse cx={73.3} cy={103} rx={15.5} ry={8.6} />
        <ellipse cx={126.7} cy={103} rx={15.5} ry={8.6} />
      </g>
      {f.blush && (
        <g fill={C.blush} className={still ? undefined : "byte-pop"}>
          <ellipse cx={64} cy={109} rx={9} ry={4.6} /><ellipse cx={136} cy={109} rx={9} ry={4.6} />
        </g>
      )}

      {/* screen light on the lower face */}
      {has("glow") && (
        <motion.path d="M56 98 C72 94 128 94 144 98 C141 114 123 127 100 132 C77 127 59 114 56 98 Z" fill={C.green}
          initial={{ opacity: 0.2 }}
          animate={reduce ? { opacity: 0.2 } : { opacity: [0.16, 0.24, 0.18, 0.22, 0.16], transition: { duration: 1.2, ...forever } }} />
      )}

      {/* eyes */}
      {f.happy
        ? EYES.map((e) => (
            <path key={e.side} d={`M${e.cx - 13} 84 Q${e.cx} 66 ${e.cx + 13} 84`} stroke={C.shade} strokeWidth={6} strokeLinecap="round" fill="none" />
          ))
        : EYES.map((e) => {
            const px = (f.center ? 0 : 3.4 * e.sign) + f.look + glance + (gaze?.x ?? 0);
            const py = (f.center ? 0 : 3.5) + f.lift + (gaze?.y ?? 0);
            return (
              <g key={e.side}>
                <rect x={e.cx - EYE_W / 2} y={EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_W / 2} ry={EYE_RY} fill={C.white} />
                <g clipPath={`url(#eye${e.side}-${uid})`}>
                  {still ? (
                    <>
                      <g transform={`translate(${px} ${py}) translate(${e.cx} ${EYE_CY}) scale(${f.pupil}) translate(${-e.cx} ${-EYE_CY})`}>
                        <rect x={e.cx - 7.35} y={EYE_CY - 12} width={14.7} height={24} rx={7.35} fill={C.shade} />
                        <circle cx={e.cx - 2.2} cy={EYE_CY - 6.5} r={f.glossy ? 3.4 : 2.6} fill={C.white} />
                        {f.glossy && <circle cx={e.cx + 2.6} cy={EYE_CY + 5.5} r={1.6} fill={C.white} />}
                      </g>
                      <rect x={e.cx - 35} y={EYE_Y + EYE_H - f.lower} width={70} height={70} fill={C.face} />
                      <rect x={e.cx - 35} y={EYE_Y - 70 + f.lid} width={70} height={70} fill={C.faceShade}
                        transform={`rotate(${f.tilt * e.sign} ${e.cx} ${EYE_Y + f.lid})`} />
                    </>
                  ) : (
                    <>
                      <motion.g initial={false} animate={{ x: px, y: py, scale: f.pupil }} transition={eyeSpring}
                        style={{ originX: 0.5, originY: 0.5 }}>
                        <rect x={e.cx - 7.35} y={EYE_CY - 12} width={14.7} height={24} rx={7.35} fill={C.shade} />
                        <circle cx={e.cx - 2.2} cy={EYE_CY - 6.5} r={f.glossy ? 3.4 : 2.6} fill={C.white} />
                        {f.glossy && <circle cx={e.cx + 2.6} cy={EYE_CY + 5.5} r={1.6} fill={C.white} />}
                      </motion.g>
                      <motion.rect x={e.cx - 35} y={EYE_Y + EYE_H} width={70} height={70} fill={C.face}
                        initial={false} animate={{ y: -(shut ? 0 : f.lower) }} transition={spring} />
                      <motion.rect x={e.cx - 35} y={EYE_Y - 70} width={70} height={70} fill={C.faceShade}
                        initial={false}
                        animate={{ y: shut ? EYE_H + 2 : f.lid, rotate: shut ? 0 : f.tilt * e.sign }}
                        transition={shut ? { duration: 0.06 } : spring}
                        style={{ originX: 0.5, originY: 1 }} />
                    </>
                  )}
                </g>
              </g>
            );
          })}

      {/* hood pulled down over his eyes (out of hearts) */}
      {has("brim") && (
        <path fill={C.hood} d="M44 90 C44 56 68 34 100 34 C132 34 156 56 156 90 C142 76 122 72 100 72 C78 72 58 76 44 90 Z" />
      )}

      {(has("tears") || has("tear")) && (
        <g>
          {(has("tears") ? [61, 139] : [137]).map((x) => (
            <path key={x} className="byte-tear" fill={C.tear}
              d={`M${x} 95 C${x + 3} 100 ${x + 5} 103 ${x + 5} 105 A5 5 0 0 1 ${x - 5} 105 C${x - 5} 103 ${x - 3} 100 ${x} 95 Z`} />
          ))}
        </g>
      )}

      {/* beak: mouth + tongue sit behind the jaw and show when it drops */}
      {still ? (
        <>
          <g transform={`translate(0 98.8) scale(1 ${1 + jawDrop / 8}) translate(0 -98.8)`} opacity={jawDrop > 0 ? 1 : 0}>
            <path d="M92.5 98.8 C95 98.5 106.8 98.5 109.3 98.8 C108.6 103.6 105 107.6 100.9 107.9 C96.8 107.6 93.2 103.6 92.5 98.8 Z" fill={C.shade} />
            <ellipse cx={100.9} cy={105.4} rx={5} ry={2.4} fill={C.tongue} />
          </g>
          <path d="M93.4 98.6 C96.6 100.6 105.2 100.6 108.4 98.6 C107 103.6 103.6 107.6 100.9 108.2 C98.2 107.6 94.8 103.6 93.4 98.6 Z" fill={C.beakLow}
            transform={`translate(0 ${jawDrop})`} />
        </>
      ) : (
        <>
          <motion.g initial={false} animate={{ scaleY: 1 + jawDrop / 8, scaleX: beakW, opacity: jawDrop > 0 ? 1 : 0 }} transition={quick} style={{ originY: 0, originX: 0.5 }}>
            <path d="M92.5 98.8 C95 98.5 106.8 98.5 109.3 98.8 C108.6 103.6 105 107.6 100.9 107.9 C96.8 107.6 93.2 103.6 92.5 98.8 Z" fill={C.shade} />
            <ellipse cx={100.9} cy={105.4} rx={5} ry={2.4} fill={C.tongue} />
          </motion.g>
          <motion.path d="M93.4 98.6 C96.6 100.6 105.2 100.6 108.4 98.6 C107 103.6 103.6 107.6 100.9 108.2 C98.2 107.6 94.8 103.6 93.4 98.6 Z" fill={C.beakLow}
            initial={false} animate={{ y: jawDrop, scaleX: beakW }} transition={quick} style={{ originX: 0.5 }} />
        </>
      )}
      <path d="M90.2 93.2 C90.6 90.4 95 89.6 100.9 89.6 C106.8 89.6 111.2 90.4 111.6 93.2 C110.8 97.8 104.8 101.8 100.9 102.6 C97 101.8 91 97.8 90.2 93.2 Z" fill={C.beak} />

      {/* drawstrings: secondary motion. They sway gently, and swing after a jolt (hop, shock, shake). */}
      <g key={`strings-${mood}`} className={still ? undefined : SWING.includes(mood) ? "byte-swing" : "byte-sway"}>
        {[{ x: 82.25, tip: 76.7 }, { x: 119.55, tip: 114.7 }].map((d) => (
          <g key={d.x} className="byte-string">
            <path d={`M${d.x} 130 L${d.x - 0.3} 156`} stroke={C.green} strokeWidth={5.5} strokeLinecap="round" fill="none" />
            <rect x={d.tip} y={153} width={10.3} height={12} rx={5.15} fill={C.green} />
          </g>
        ))}
      </g>
      <rect x={94} y={135.6} width={12} height={19.8} rx={6} fill={C.zip} />


      {/* the chest sits in front of his body, under his arms (he's hugging it) */}
      {has("chest") && (
        <g className={riseIn}><g transform="translate(100 206) scale(1.14) translate(-100 -206)">
          {/* light spilling from the open lid */}
          <path d="M66 166 C78 151 122 151 134 166 Z" fill={C.glow} />
          <rect x={62} y={166} width={76} height={40} rx={8} fill={C.wood} />
          <rect x={62} y={166} width={76} height={8} rx={4} fill={C.woodShade} />
          {/* lid, hinged at the back and tipped open below his beak */}
          <g transform="rotate(-12 62 166)">
            <rect x={60} y={147} width={80} height={20} rx={9} fill={C.wood} />
            <rect x={76} y={147} width={8} height={20} rx={3} fill={C.gold} />
            <rect x={116} y={147} width={8} height={20} rx={3} fill={C.gold} />
          </g>
          <g fill={C.gold}>
            <rect x={76} y={166} width={8} height={40} rx={3} /><rect x={116} y={166} width={8} height={40} rx={3} />
            <rect x={91} y={176} width={18} height={16} rx={5} />
          </g>
          <rect x={98} y={180} width={4} height={8} rx={2} fill={C.woodShade} />
        </g></g>
      )}
      {/* arms that sit in front of the body; the laptop goes over them (hands on the keyboard) */}
      {/* right first, so the left (descending) arm lies on top when they cross */}
      {right.front && <Sleeve arm={right} right still={still} />}
      {left.front && <Sleeve arm={left} still={still} />}

      {has("laptop") && (
        <g className={riseIn}>
          <rect x={52} y={140} width={96} height={56} rx={9} fill={C.laptop} />
          <rect x={92} y={160} width={16} height={12} rx={3} fill={C.green} />
          <path d="M95.5 163 L99 166 L95.5 169" stroke={C.laptop} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x={100.5} y={168} width={5} height={2} rx={1} fill={C.laptop} />
          <rect x={38} y={194} width={124} height={12} rx={6} fill={C.laptopEdge} />
        </g>
      )}

      {has("chest") && <Sparkle x={152} y={128} s={1} c={C.yellow} d={0} />}
      {has("chest") && <Sparkle x={48} y={140} s={0.7} c={C.yellow} d={0.5} />}

      {/* props in front */}
      {has("sparkles") && (
        <g className={popIn}>
          <Sparkle x={8} y={34} s={1.1} c={C.yellow} d={0} />
          <Sparkle x={196} y={22} s={1} c={C.blue} d={0.4} />
          <Sparkle x={-6} y={120} s={0.8} c={C.blue} d={0.8} />
          <Sparkle x={210} y={110} s={1} c={C.yellow} d={0.2} />
        </g>
      )}
      {has("heart") && (
        <g className={popIn}><g className="byte-float"><path d={HEART_D} transform="translate(186 46) scale(1.5)" fill={C.tongue} /></g></g>
      )}
      {has("dots") && (
        <g className={popIn} fill={C.heartGrey}>
          {[0, 1, 2].map((i) => (
            <circle key={i} className="byte-dot" style={{ animationDelay: `${i * 0.18}s` }} cx={160 + i * 13} cy={18 - i * 7} r={4 + i * 1.6} />
          ))}
        </g>
      )}
      {has("broken-heart") && (
        <g className={popIn}><g className="byte-float">
          <path d={HEART_D} transform="translate(170 26) scale(1.6)" fill={C.heartGrey} />
          <path d="M170 10 L166 20 L173 26 L168 36" stroke={C.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g></g>
      )}
    </svg>
  );
}

/* ================================================================ lip sync */

// Letters → beak openness (a cut-down viseme set: wide, mid, round, small, closed).
const VISEME: Record<string, number> = {};
"aá".split("").forEach((c) => (VISEME[c] = 1));
"eéiíy".split("").forEach((c) => (VISEME[c] = 0.6));
"oóuúwq".split("").forEach((c) => (VISEME[c] = 0.75));
"mbp".split("").forEach((c) => (VISEME[c] = 0));
"fv".split("").forEach((c) => (VISEME[c] = 0.2));
const PAUSE: Record<string, number> = { ",": 140, ";": 160, ":": 160, ".": 260, "!": 260, "?": 260, "…": 320 };

/**
 * Types `text` out and returns the beak openness for each moment, from one clock, so the speech
 * bubble and the beak can never drift apart.
 *
 *   const { typed, mouth, mouthShape, skip } = useLipSync(line);
 *   <Bubble onClick={skip}>{typed}</Bubble>  <Byte mood="idle" mouth={mouth} mouthShape={mouthShape} />
 */
export function useLipSync(text: string, { cps = 30, enabled = true }: { cps?: number; enabled?: boolean } = {}) {
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setI(0);
    if (!enabled) { setI(text.length); return; }
    let n = 0;
    const step = () => {
      n += 1;
      setI(n);
      if (n >= text.length) return;
      const ch = text[n - 1];
      timer.current = setTimeout(step, 1000 / cps + (PAUSE[ch] ?? 0));
    };
    timer.current = setTimeout(step, 1000 / cps);
    return () => clearTimeout(timer.current);
  }, [text, cps, enabled]);
  const skip = useCallback(() => { clearTimeout(timer.current); setI(text.length); }, [text]);
  const done = i >= text.length;
  const ch = (text[i - 1] ?? " ").toLowerCase();
  const mouth = done ? undefined : /[a-z\u00c0-\u017f]/.test(ch) ? VISEME[ch] ?? 0.3 : 0;
  const mouthShape: MouthShape = "oóuúwq".includes(ch) ? "round" : "eéiíy".includes(ch) ? "wide" : "open";
  return { typed: text.slice(0, i), mouth, mouthShape, done, skip };
}

export default Byte;
```
