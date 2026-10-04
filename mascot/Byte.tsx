import { useEffect, useId, useState } from "react";
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
const DOWN: [Arm, Arm] = [{ a: -40, len: 50 }, { a: -40, len: 50 }];

const POSES: Record<ByteMood, Pose> = {
  idle:      { face: F(), arms: DOWN },
  talking:   { face: F(), arms: [{ a: -30, len: 50 }, { a: -40, len: 50 }] },
  stare:     { face: F({ center: true, pupil: 0.55 }), arms: [{ a: -50, len: 50 }, { a: -50, len: 50 }] },
  smug:      { face: F({ lid: 24, look: 6, lift: 3, pupil: 0.95 }), arms: [{ a: -40, len: 50 }, { a: -40, len: 50 }] },
  shocked:   { face: F({ center: true, pupil: 0.5, jaw: 15 }), arms: [{ a: 18, len: 62 }, { a: 18, len: 62 }] },
  sad:       { face: F({ lid: 14, tilt: -16, lower: 9, lift: 6, pupil: 0.9 }), arms: [{ a: -62, len: 48 }, { a: -62, len: 48 }], props: ["tears"] },
  "locked-in": { face: F({ lid: 22, tilt: 12, lower: 12, center: true, pupil: 0.8 }), arms: [{ a: -55, len: 50 }, { a: -55, len: 50 }], props: ["glow"] },
  correct:   { face: F({ lift: -3, jaw: 11 }), arms: [{ a: 58, len: 70 }, { a: 58, len: 70 }], props: ["sparkles"] },
  wrong:     { face: F({ lid: 20, tilt: 10, look: 7, pupil: 0.9 }),
               arms: [{ a: 184, len: 80, front: true, dy: 10 }, { a: 184, len: 80, front: true, dy: 24 }], props: ["smoke"] },
  "level-up": { face: F({ happy: true, jaw: 9 }), arms: [{ a: 24, len: 66 }, { a: 24, len: 66 }], props: ["sparkles", "heart"] },
  coding:    { face: F({ lid: 20, tilt: 8, lower: 10, center: true, lift: 4, pupil: 0.8 }),
               arms: [{ a: 248, len: 42, front: true }, { a: 248, len: 42, front: true }], props: ["glow", "laptop"] },
  "out-of-hearts": { face: F({ lid: 20, tilt: -12, lower: 6, lift: 8, pupil: 0.85 }),
               arms: [{ a: -78, len: 46 }, { a: -78, len: 46 }], props: ["brim", "tear", "broken-heart"] },
  chest:     { face: F({ lift: -4, jaw: 9 }),
               arms: [{ a: 236, len: 54, front: true }, { a: 236, len: 54, front: true }], props: ["chest"] },
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

/* ================================================================ component */

export function Byte({ mood = "idle", size = 160, className }: Props) {
  const reduce = !!useReducedMotion();
  const pop = useAnimationControls();
  useEffect(() => { if (!reduce) pop.start(POP); }, [mood, reduce, pop]);

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
          <ByteRig mood={mood} reduce={reduce} />
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

const EYES = [{ side: "L", cx: 79, sign: 1 }, { side: "R", cx: 121, sign: -1 }] as const;
const EYE_Y = 66, EYE_W = 38, EYE_H = 50;
const SHOULDER = { x: 47, y: 140 };
const FACE_D = "M100 154 C70 146 48 124 48 96 C48 66 70 45 100 45 C130 45 152 66 152 96 C152 124 130 146 100 154 Z";
const BODY_D = "M100 8 C122 8 140 28 150 56 C157 78 160 98 162 116 C176 138 180 166 174 182 C170 194 158 198 142 198 L58 198 C42 198 30 194 26 182 C20 166 24 138 38 116 C40 98 43 78 50 56 C60 28 78 8 100 8 Z";
const spring = { type: "spring" as const, stiffness: 300, damping: 22 };

/** One sleeve, pivoting at the shoulder. The right arm is the left one mirrored. */
function Sleeve({ arm, right, still }: { arm: Arm; right?: boolean; still?: boolean }) {
  const L = arm.len;
  const parts = (
    <>
      {/* front sleeves cross the same-colour hoodie, so one flat shade shape underneath separates them */}
      {arm.front && <rect x={-L} y={-9} width={L + 14} height={28} rx={14} fill={C.shade} />}
      {/* the same charcoal over the hoodie would vanish, so front sleeves sit one step lighter */}
      <rect x={-L} y={-14} width={L + 14} height={28} rx={14} fill={arm.front ? C.hoodFront : C.hood} />
      {arm.front && <rect x={-L} y={-14} width={16} height={28} rx={8} fill={C.faceShade} />}
    </>
  );
  return (
    <g transform={right ? "translate(200 0) scale(-1 1)" : undefined}>
      <g transform={`translate(${SHOULDER.x} ${SHOULDER.y + (arm.dy ?? 0)})`}>
        {/* the rotating group's bbox is the sleeve rect, so its pivot (local 0,0) sits at L/(L+14) */}
        {still ? <g transform={`rotate(${arm.a})`}>{parts}</g> : (
          <motion.g initial={false} animate={{ rotate: arm.a }} transition={spring}
            style={{ originX: L / (L + 14), originY: 0.5 }}>{parts}</motion.g>
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
export function ByteRig({ mood = "idle", reduce = false, still = false }: {
  mood?: ByteMood; reduce?: boolean;
  /** Plain SVG transforms instead of framer-motion, for server-rendered / exported stills. */
  still?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const pose = POSES[mood] ?? POSES.idle;
  const f = pose.face;
  const has = (p: Prop) => pose.props?.includes(p) ?? false;
  const shut = useBlink(!["stare", "shocked", "level-up"].includes(mood) && !reduce && !still);
  const glance = useGlance(mood === "idle" && !reduce);
  const flap = useFlap(mood === "talking" && !reduce);
  const jawDrop = flap ? 7 : f.jaw;
  const quick = { duration: 0.1, ease: "easeOut" as const };
  const [left, right] = pose.arms;

  return (
    <svg viewBox={VIEWBOX} width="100%" height="100%" aria-hidden="true" style={{ overflow: "visible" }}>
      <style>{CSS}</style>
      <defs>
        {EYES.map((e) => (
          <clipPath key={e.side} id={`eye${e.side}-${uid}`}>
            <rect x={e.cx - EYE_W / 2} y={EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_W / 2} />
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

      {/* hood + body: one bell silhouette; hood shadow on the forehead; face */}
      <path fill={C.hood} d={BODY_D} />
      <path fill={C.shade} transform="translate(0 -7)" d={FACE_D} />
      <path fill={C.face} d={FACE_D} />
      <g fill={C.faceShade}>
        <path d="M58 104 C60 124 94 128 98 112 C90 120 66 120 58 104 Z" />
        <path d="M142 104 C140 124 106 128 102 112 C110 120 134 120 142 104 Z" />
      </g>

      {/* screen light on the lower face */}
      {has("glow") && (
        <motion.path d="M66 128 C80 124 120 124 134 128 C126 142 114 150 100 153 C86 150 74 142 66 128 Z" fill={C.green}
          initial={{ opacity: 0.3 }}
          animate={reduce ? { opacity: 0.3 } : { opacity: [0.26, 0.36, 0.28, 0.34, 0.26], transition: { duration: 1.2, ...forever } }} />
      )}

      {/* eyes */}
      {f.happy
        ? EYES.map((e) => (
            <path key={e.side} d={`M${e.cx - 13} 96 Q${e.cx} 78 ${e.cx + 13} 96`} stroke={C.shade} strokeWidth={6} strokeLinecap="round" fill="none" />
          ))
        : EYES.map((e) => {
            const px = (f.center ? 0 : 6 * e.sign) + f.look + glance;
            const py = (f.center ? -2 : 5) + f.lift;
            return (
              <g key={e.side}>
                <rect x={e.cx - EYE_W / 2} y={EYE_Y} width={EYE_W} height={EYE_H} rx={EYE_W / 2} fill={C.white} />
                <g clipPath={`url(#eye${e.side}-${uid})`}>
                  {still ? (
                    <>
                      <g transform={`translate(${px} ${py}) translate(${e.cx} ${EYE_Y + 27}) scale(${f.pupil}) translate(${-e.cx} ${-(EYE_Y + 27)})`}>
                        <rect x={e.cx - 8} y={EYE_Y + 15} width={16} height={24} rx={8} fill={C.shade} />
                        <circle cx={e.cx - 2.5} cy={EYE_Y + 21} r={2.8} fill={C.white} />
                      </g>
                      <rect x={e.cx - 35} y={EYE_Y + EYE_H - f.lower} width={70} height={70} fill={C.face} />
                      <rect x={e.cx - 35} y={EYE_Y - 70 + f.lid} width={70} height={70} fill={C.faceShade}
                        transform={`rotate(${f.tilt * e.sign} ${e.cx} ${EYE_Y + f.lid})`} />
                    </>
                  ) : (
                    <>
                      <motion.g initial={false} animate={{ x: px, y: py, scale: f.pupil }} transition={spring}
                        style={{ originX: 0.5, originY: 0.5 }}>
                        <rect x={e.cx - 8} y={EYE_Y + 15} width={16} height={24} rx={8} fill={C.shade} />
                        <circle cx={e.cx - 2.5} cy={EYE_Y + 21} r={2.8} fill={C.white} />
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
        <path fill={C.hood} d="M46 98 C46 64 70 40 100 40 C130 40 154 64 154 98 C140 86 122 82 100 82 C78 82 60 86 46 98 Z" />
      )}

      {(has("tears") || has("tear")) && (
        <g>
          {(has("tears") ? [62, 138] : [136]).map((x) => (
            <path key={x} className="byte-tear" fill={C.tear}
              d={`M${x} 106 C${x + 3} 111 ${x + 5} 114 ${x + 5} 116 A5 5 0 0 1 ${x - 5} 116 C${x - 5} 114 ${x - 3} 111 ${x} 106 Z`} />
          ))}
        </g>
      )}

      {/* beak: mouth + tongue sit behind the jaw and show when it drops */}
      {still ? (
        <>
          <g transform={`translate(0 116) scale(1 ${1 + jawDrop / 9}) translate(0 -116)`}>
            <path d="M91 116 L109 116 L105 124 C103 126 97 126 95 124 Z" fill={C.shade} />
            <ellipse cx={100} cy={123} rx={5} ry={2.4} fill={C.tongue} />
          </g>
          <path d="M90 116 C94 118 106 118 110 116 C108 124 104 128 100 128 C96 128 92 124 90 116 Z" fill={C.beakLow}
            transform={`translate(0 ${jawDrop})`} />
        </>
      ) : (
        <>
          <motion.g initial={false} animate={{ scaleY: 1 + jawDrop / 9 }} transition={quick} style={{ originY: 0 }}>
            <path d="M91 116 L109 116 L105 124 C103 126 97 126 95 124 Z" fill={C.shade} />
            <ellipse cx={100} cy={123} rx={5} ry={2.4} fill={C.tongue} />
          </motion.g>
          <motion.path d="M90 116 C94 118 106 118 110 116 C108 124 104 128 100 128 C96 128 92 124 90 116 Z" fill={C.beakLow}
            initial={false} animate={{ y: jawDrop }} transition={quick} />
        </>
      )}
      <path d="M85 112 C87 103 93 100 100 100 C107 100 113 103 115 112 C111 118 89 118 85 112 Z" fill={C.beak} />

      {/* drawstrings + zip */}
      <g stroke={C.green} strokeWidth={6} strokeLinecap="round" fill="none">
        <path d="M88 158 C87 165 86 170 86 177" /><path d="M112 158 C113 165 114 170 114 177" />
      </g>
      <g fill={C.green}>
        <rect x={81} y={175} width={10} height={13} rx={5} /><rect x={109} y={175} width={10} height={13} rx={5} />
      </g>
      <rect x={95} y={163} width={10} height={17} rx={5} fill={C.zip} />

      {/* feet */}
      <g fill={C.beakLow}>
        <rect x={56} y={192} width={34} height={17} rx={8.5} /><rect x={110} y={192} width={34} height={17} rx={8.5} />
      </g>

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

export default Byte;
