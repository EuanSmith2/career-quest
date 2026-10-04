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

export const MOODS = [
  "idle", "talking", "stare", "smug", "shocked", "sad", "locked-in",
  "correct", "wrong", "level-up", "coding", "out-of-hearts", "chest",
] as const;
export type ByteMood = (typeof MOODS)[number];

type Props = {
  mood?: ByteMood;
  /** Mouth openness 0–1, driven from outside (see useLipSync). Runs as its own layer on top of
   *  any mood, so Byte can talk while celebrating. Leave undefined to let the mood decide. */
  mouth?: number;
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
  wood: "#D9822B", woodShade: "#B4651C", gold: "#FFC800", glow: "#FFE7A3",
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
};
type Arm = { a: number; len: number; front?: boolean; dy?: number };
type Prop = "sparkles" | "heart" | "smoke" | "laptop" | "chest" | "glow" | "tears" | "tear" | "broken-heart" | "brim";
type Pose = { face: Face; arms: [Arm, Arm]; props?: Prop[] };

const F = (o: Partial<Face> = {}): Face => ({ lid: 0, tilt: 0, lower: 0, center: false, look: 0, lift: 0, pupil: 1, jaw: 0, ...o });
// Arm angle a: 0 = straight out sideways, + raises, − lowers, ~180–240 = across the front.
const DOWN: [Arm, Arm] = [{ a: -44, len: 40 }, { a: -44, len: 40 }];

const POSES: Record<ByteMood, Pose> = {
  idle:      { face: F(), arms: DOWN },
  talking:   { face: F(), arms: [{ a: -36, len: 40 }, { a: -44, len: 40 }] },
  stare:     { face: F({ center: true, pupil: 0.55 }), arms: [{ a: -50, len: 40 }, { a: -50, len: 40 }] },
  smug:      { face: F({ lid: 24, look: 6, lift: 3, pupil: 0.95 }), arms: DOWN },
  shocked:   { face: F({ center: true, pupil: 0.5, jaw: 15 }), arms: [{ a: 14, len: 48 }, { a: 14, len: 48 }] },
  sad:       { face: F({ lid: 14, tilt: -16, lower: 9, lift: 6, pupil: 0.9 }), arms: [{ a: -60, len: 38 }, { a: -60, len: 38 }], props: ["tears"] },
  "locked-in": { face: F({ lid: 22, tilt: 12, lower: 12, center: true, pupil: 0.8 }), arms: [{ a: -54, len: 40 }, { a: -54, len: 40 }], props: ["glow"] },
  correct:   { face: F({ lift: -3, jaw: 11 }), arms: [{ a: 60, len: 60 }, { a: 60, len: 60 }], props: ["sparkles"] },
  wrong:     { face: F({ lid: 20, tilt: 10, look: 7, pupil: 0.9 }),
               arms: [{ a: 186, len: 70, front: true, dy: 8 }, { a: 186, len: 70, front: true, dy: 22 }], props: ["smoke"] },
  "level-up": { face: F({ happy: true, jaw: 9 }), arms: [{ a: 18, len: 50 }, { a: 18, len: 50 }], props: ["sparkles", "heart"] },
  coding:    { face: F({ lid: 20, tilt: 8, lower: 10, center: true, lift: 4, pupil: 0.8 }),
               arms: [{ a: 250, len: 44, front: true }, { a: 250, len: 44, front: true }], props: ["glow", "laptop"] },
  "out-of-hearts": { face: F({ lid: 20, tilt: -12, lower: 6, lift: 8, pupil: 0.85 }),
               arms: [{ a: -70, len: 38 }, { a: -70, len: 38 }], props: ["brim", "tear", "broken-heart"] },
  chest:     { face: F({ lift: -4, jaw: 9 }),
               arms: [{ a: 238, len: 58, front: true }, { a: 238, len: 58, front: true }], props: ["chest"] },
};

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
  shocked:   { y: [0, -12, 0], scaleY: [1, 1.06, 1], transition: { duration: 0.4, ease: "easeOut" } },
  wrong:     { x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.5, ease: "easeInOut" } },
  correct:   { y: [0, -26, 0, 0], scaleY: [1, 1.06, 0.92, 1], scaleX: [1, 0.96, 1.06, 1],
               transition: { duration: 0.6, times: [0, 0.4, 0.75, 1], ease: "easeOut", repeat: 1, repeatDelay: 0.15 } },
  "level-up": { y: [0, -14, 0], rotate: [0, -5, 5, 0], transition: { duration: 0.8, ease: "easeInOut", repeat: 2, repeatDelay: 0.2 } },
};
const SHADOW: Partial<Record<ByteMood, TargetAndTransition>> = {
  correct:   { scaleX: [1, 0.7, 1, 1], opacity: [1, 0.6, 1, 1], transition: BODY.correct!.transition },
  "level-up": { scaleX: [1, 0.82, 1], transition: BODY["level-up"]!.transition },
  shocked:   { scaleX: [1, 0.85, 1], transition: BODY.shocked!.transition },
  chest:     { scaleX: [1, 0.97, 1], transition: BODY.chest!.transition },
};
// A quick squash on every mood change, so he visibly "reacts" to the switch.
const POP = { scaleX: [1.08, 0.97, 1], scaleY: [0.9, 1.04, 1], transition: { duration: 0.35, ease: "easeOut" as const } };
const FIDGET_NOD = { y: [0, 4, 0, 2, 0], transition: { duration: 0.9, ease: "easeInOut" as const } };
const FIDGET_TILT = { rotate: [0, -4, -4, 0], transition: { duration: 1.6, times: [0, 0.25, 0.75, 1], ease: "easeInOut" as const } };

/* ================================================================ component */

export function Byte({ mood = "idle", mouth, size = 160, className }: Props) {
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

  const fill = { position: "absolute" as const, inset: 0, width: "100%", height: "100%" };

  return (
    <div className={className} style={{ position: "relative", width: size, height: size * ASPECT }}
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
        <motion.div style={{ ...fill, originY: 0.9 }} animate={reduce ? undefined : BODY[mood]}>
          <ByteRig mood={mood} mouth={mouth} reduce={reduce} />
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
const BODY_D = "M100.0 6.4 C101.8 6.4 103.8 6.6 105.4 6.9 C107.0 7.2 107.8 7.7 109.6 8.4 C111.4 9.1 114.2 10.2 116.0 11.0 C117.8 11.8 119.0 12.6 120.5 13.4 C122.0 14.2 123.4 15.2 124.7 16.0 C126.0 16.8 126.1 16.8 128.1 18.3 C130.1 19.8 134.1 22.9 136.5 25.0 C138.9 27.1 140.8 28.8 142.7 30.8 C144.6 32.8 146.4 34.9 148.0 36.9 C149.6 38.9 151.1 40.9 152.4 42.9 C153.7 44.9 154.9 46.9 156.0 48.9 C157.1 50.9 158.0 53.0 158.9 55.0 C159.8 57.0 160.5 59.0 161.2 61.0 C161.9 63.0 162.5 64.8 163.1 66.8 C163.7 68.8 164.1 70.9 164.6 72.9 C165.1 74.9 165.6 76.9 166.0 78.9 C166.4 80.9 166.7 82.9 166.9 84.9 C167.1 86.9 167.4 89.0 167.4 91.0 C167.4 93.0 167.4 95.0 167.2 97.0 C167.0 99.0 166.6 100.8 166.0 102.8 C165.4 104.8 164.5 106.5 163.9 109.0 C163.3 111.5 162.6 114.8 162.2 118.0 C161.8 121.2 161.8 124.0 161.6 128.0 C161.4 132.0 161.6 137.5 161.0 142.0 C160.4 146.5 159.3 151.2 158.0 155.0 C156.7 158.8 155.0 161.5 153.0 165.0 C151.0 168.5 148.3 172.8 146.0 176.0 C143.7 179.2 141.8 182.1 139.0 184.5 C136.2 186.9 133.0 188.9 129.0 190.5 C125.0 192.1 119.8 193.1 115.0 193.8 C110.2 194.5 105.0 194.5 100.0 194.5 C95.0 194.5 89.8 194.5 85.0 193.8 C80.2 193.1 75.0 192.1 71.0 190.5 C67.0 188.9 63.8 186.9 61.0 184.5 C58.2 182.1 56.3 179.2 54.0 176.0 C51.7 172.8 49.0 168.5 47.0 165.0 C45.0 161.5 43.3 158.8 42.0 155.0 C40.7 151.2 39.6 146.5 39.0 142.0 C38.4 137.5 38.6 132.0 38.4 128.0 C38.2 124.0 38.2 121.2 37.8 118.0 C37.4 114.8 36.7 111.5 36.1 109.0 C35.5 106.5 34.5 104.8 34.0 102.8 C33.5 100.8 33.0 99.0 32.8 97.0 C32.6 95.0 32.5 93.0 32.6 91.0 C32.6 89.0 32.9 86.9 33.1 84.9 C33.3 82.9 33.6 80.9 34.0 78.9 C34.4 76.9 34.9 74.9 35.4 72.9 C35.9 70.9 36.3 68.8 36.9 66.8 C37.5 64.8 38.1 63.0 38.8 61.0 C39.5 59.0 40.2 57.0 41.1 55.0 C42.0 53.0 42.9 50.9 44.0 48.9 C45.1 46.9 46.3 44.9 47.6 42.9 C48.9 40.9 50.4 38.9 52.0 36.9 C53.6 34.9 55.4 32.8 57.3 30.8 C59.2 28.8 61.1 27.1 63.5 25.0 C65.9 22.9 69.9 19.8 71.9 18.3 C73.9 16.8 74.0 16.8 75.3 16.0 C76.6 15.2 78.0 14.2 79.5 13.4 C81.0 12.6 82.2 11.8 84.0 11.0 C85.8 10.2 88.6 9.1 90.4 8.4 C92.2 7.7 93.0 7.2 94.6 6.9 C96.2 6.6 98.2 6.4 100.0 6.4 Z";
const spring = { type: "spring" as const, stiffness: 300, damping: 22 };

/** One sleeve, pivoting at the shoulder. The right arm is the left one mirrored. */
function Sleeve({ arm, right, still }: { arm: Arm; right?: boolean; still?: boolean }) {
  const L = arm.len;
  const parts = (
    <>
      {/* front sleeves cross the same-colour hoodie, so one flat shade shape underneath separates them */}
      {arm.front && <rect x={-L} y={-11} width={L + 16} height={32} rx={16} fill={C.shade} />}
      {/* the same charcoal over the hoodie would vanish, so front sleeves sit one step lighter */}
      <rect x={-L} y={-16} width={L + 16} height={32} rx={16} fill={arm.front ? C.hoodFront : C.hood} />
      {arm.front && <rect x={-L} y={-16} width={18} height={32} rx={9} fill={C.faceShade} />}
    </>
  );
  return (
    <g transform={right ? "translate(200 0) scale(-1 1)" : undefined}>
      <g transform={`translate(${SHOULDER.x} ${SHOULDER.y + (arm.dy ?? 0)})`}>
        {/* the rotating group's bbox is the sleeve rect, so its pivot (local 0,0) sits at L/(L+16) */}
        {still ? <g transform={`rotate(${arm.a})`}>{parts}</g> : (
          <motion.g initial={false} animate={{ rotate: arm.a }} transition={spring}
            style={{ originX: L / (L + 16), originY: 0.5 }}>{parts}</motion.g>
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
  @media (prefers-reduced-motion: reduce) {
    .byte-twinkle, .byte-float, .byte-smoke, .byte-tear { animation: none }
    .byte-tear { transform: translateY(2px) }
  }
`;

/** The full figure. Exported for static use (favicon, og-image). */
export function ByteRig({ mood = "idle", mouth, reduce = false, still = false }: {
  mood?: ByteMood; mouth?: number; reduce?: boolean;
  /** Plain SVG transforms instead of framer-motion, for server-rendered / exported stills. */
  still?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const pose = POSES[mood] ?? POSES.idle;
  const f = pose.face;
  const has = (p: Prop) => pose.props?.includes(p) ?? false;
  const shut = useBlink(!["stare", "shocked", "level-up"].includes(mood) && !reduce && !still);
  const glance = useGlance(mood === "idle" && !reduce);
  const flap = useFlap(mood === "talking" && mouth === undefined && !reduce);
  // mouth layer wins over the mood's own beak; otherwise the talking flap, otherwise the pose
  const jawDrop = mouth !== undefined ? Math.max(0, Math.min(1, mouth)) * 10 : flap ? 7 : f.jaw;
  const quick = { duration: 0.1, ease: "easeOut" as const };
  const [left, right] = pose.arms;

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
        <g className="byte-smoke" fill={C.smoke}>
          <circle cx={150} cy={14} r={13} /><circle cx={166} cy={4} r={12} /><circle cx={174} cy={20} r={11} />
          <circle cx={160} cy={24} r={10} /><circle cx={140} cy={34} r={5} />
        </g>
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

      {/* screen light on the lower face */}
      {has("glow") && (
        <motion.path d="M70 112 C82 108 118 108 130 112 C122 122 112 128 100 131 C88 128 78 122 70 112 Z" fill={C.green}
          initial={{ opacity: 0.3 }}
          animate={reduce ? { opacity: 0.3 } : { opacity: [0.26, 0.36, 0.28, 0.34, 0.26], transition: { duration: 1.2, ...forever } }} />
      )}

      {/* eyes */}
      {f.happy
        ? EYES.map((e) => (
            <path key={e.side} d={`M${e.cx - 13} 84 Q${e.cx} 66 ${e.cx + 13} 84`} stroke={C.shade} strokeWidth={6} strokeLinecap="round" fill="none" />
          ))
        : EYES.map((e) => {
            const px = (f.center ? 0 : 3.4 * e.sign) + f.look + glance;
            const py = (f.center ? 0 : 3.5) + f.lift;
            return (
              <g key={e.side}>
                <rect x={e.cx - EYE_W / 2} y={EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_W / 2} ry={EYE_RY} fill={C.white} />
                <g clipPath={`url(#eye${e.side}-${uid})`}>
                  {still ? (
                    <>
                      <g transform={`translate(${px} ${py}) translate(${e.cx} ${EYE_CY}) scale(${f.pupil}) translate(${-e.cx} ${-EYE_CY})`}>
                        <rect x={e.cx - 7.35} y={EYE_CY - 12} width={14.7} height={24} rx={7.35} fill={C.shade} />
                        <circle cx={e.cx - 2.2} cy={EYE_CY - 6.5} r={2.6} fill={C.white} />
                      </g>
                      <rect x={e.cx - 35} y={EYE_Y + EYE_H - f.lower} width={70} height={70} fill={C.face} />
                      <rect x={e.cx - 35} y={EYE_Y - 70 + f.lid} width={70} height={70} fill={C.faceShade}
                        transform={`rotate(${f.tilt * e.sign} ${e.cx} ${EYE_Y + f.lid})`} />
                    </>
                  ) : (
                    <>
                      <motion.g initial={false} animate={{ x: px, y: py, scale: f.pupil }} transition={spring}
                        style={{ originX: 0.5, originY: 0.5 }}>
                        <rect x={e.cx - 7.35} y={EYE_CY - 12} width={14.7} height={24} rx={7.35} fill={C.shade} />
                        <circle cx={e.cx - 2.2} cy={EYE_CY - 6.5} r={2.6} fill={C.white} />
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
          <g transform={`translate(0 99.8) scale(1 ${1 + jawDrop / 8}) translate(0 -99.8)`} opacity={jawDrop > 0 ? 1 : 0}>
            <path d="M93.5 99.8 L108.2 99.8 L104.8 105.8 C103.2 107.2 98.6 107.2 97 105.8 Z" fill={C.shade} />
            <ellipse cx={100.9} cy={104.8} rx={4.4} ry={2} fill={C.tongue} />
          </g>
          <path d="M93.4 98.6 C96.6 100.6 105.2 100.6 108.4 98.6 C107 103.6 103.6 107.6 100.9 108.2 C98.2 107.6 94.8 103.6 93.4 98.6 Z" fill={C.beakLow}
            transform={`translate(0 ${jawDrop})`} />
        </>
      ) : (
        <>
          <motion.g initial={false} animate={{ scaleY: 1 + jawDrop / 8, opacity: jawDrop > 0 ? 1 : 0 }} transition={quick} style={{ originY: 0 }}>
            <path d="M93.5 99.8 L108.2 99.8 L104.8 105.8 C103.2 107.2 98.6 107.2 97 105.8 Z" fill={C.shade} />
            <ellipse cx={100.9} cy={104.8} rx={4.4} ry={2} fill={C.tongue} />
          </motion.g>
          <motion.path d="M93.4 98.6 C96.6 100.6 105.2 100.6 108.4 98.6 C107 103.6 103.6 107.6 100.9 108.2 C98.2 107.6 94.8 103.6 93.4 98.6 Z" fill={C.beakLow}
            initial={false} animate={{ y: jawDrop }} transition={quick} />
        </>
      )}
      <path d="M90.2 93.2 C90.6 90.4 95 89.6 100.9 89.6 C106.8 89.6 111.2 90.4 111.6 93.2 C110.8 97.8 104.8 101.8 100.9 102.6 C97 101.8 91 97.8 90.2 93.2 Z" fill={C.beak} />

      {/* drawstrings + zip */}
      <g stroke={C.green} strokeWidth={5.5} strokeLinecap="round" fill="none">
        <path d="M82.6 130 C82.3 140 82 148 81.9 156" /><path d="M119.2 130 C119.5 140 119.8 148 119.9 156" />
      </g>
      <g fill={C.green}>
        <rect x={76.7} y={153} width={10.3} height={12} rx={5.15} /><rect x={114.7} y={153} width={10.3} height={12} rx={5.15} />
      </g>
      <rect x={94} y={135.6} width={12} height={19.8} rx={6} fill={C.zip} />


      {/* the chest sits in front of his body, under his arms (he's hugging it) */}
      {has("chest") && (
        <g>
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
        </g>
      )}
      {/* arms that sit in front of the body; the laptop goes over them (hands on the keyboard) */}
      {left.front && <Sleeve arm={left} still={still} />}
      {right.front && <Sleeve arm={right} right still={still} />}

      {has("laptop") && (
        <g>
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
        <g>
          <Sparkle x={8} y={34} s={1.1} c={C.yellow} d={0} />
          <Sparkle x={196} y={22} s={1} c={C.blue} d={0.4} />
          <Sparkle x={-6} y={120} s={0.8} c={C.blue} d={0.8} />
          <Sparkle x={210} y={110} s={1} c={C.yellow} d={0.2} />
        </g>
      )}
      {has("heart") && (
        <g className="byte-float"><path d={HEART_D} transform="translate(176 52) scale(1.5)" fill={C.tongue} /></g>
      )}
      {has("broken-heart") && (
        <g className="byte-float">
          <path d={HEART_D} transform="translate(170 26) scale(1.6)" fill={C.heartGrey} />
          <path d="M170 10 L166 20 L173 26 L168 36" stroke={C.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
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
 *   const { typed, mouth, done, skip } = useLipSync(line);
 *   <Bubble>{typed}</Bubble>  <Byte mood="idle" mouth={mouth} />
 */
export function useLipSync(text: string, { cps = 30, enabled = true }: { cps?: number; enabled?: boolean } = {}) {
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
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
  return { typed: text.slice(0, i), mouth, done, skip };
}

export default Byte;
