import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Byte, type ByteMood } from "@/components/Byte";
import { AnswerTile, type TileState } from "@/components/AnswerTile";
import { ChunkyButton } from "@/components/ChunkyButton";
import { SourceChip } from "@/components/SourceChip";
import { speedPoints, type ArenaItem } from "@/lib/game";
import { playSound, useSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

export interface ArenaResult {
  item: ArenaItem;
  pick: number | null; // null = time ran out
  correct: boolean;
  points: number;
  timeLeft: number;
}

/** Full-screen dark arena with the circuit grid, a sound toggle and an exit. App chrome is hidden. */
export function ArenaFrame({ children, onExit, className }: { children: ReactNode; onExit?: () => void; className?: string }) {
  const sound = useSound();
  const navigate = useNavigate();
  return (
    <div className={cn("circuit-grid arena-surface fixed inset-0 z-40 overflow-y-auto text-white", className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onExit ?? (() => navigate(-1))}
          className="grid h-10 w-10 place-items-center rounded-full bg-arena-glass text-white hover:bg-arena-line"
          aria-label="Leave the round"
        >
          <X className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={sound.toggle}
          className="grid h-10 w-10 place-items-center rounded-full bg-arena-glass text-white hover:bg-arena-line"
          aria-label={sound.enabled ? "Mute sound" : "Turn sound on"}
          aria-pressed={sound.enabled}
        >
          {sound.enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-[900px] flex-col px-4 pb-6">{children}</div>
    </div>
  );
}

/** Round intro: Byte, title, START. */
export function ArenaIntro({
  mood,
  title,
  subtitle,
  meta,
  onStart,
  cta = "Start",
}: {
  mood: ByteMood;
  title: string;
  subtitle?: string;
  meta?: string;
  onStart: () => void;
  cta?: string;
}) {
  useAnswerKeys({ onEnter: onStart });
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Byte mood={mood} size={mood === "talking" ? 96 : 120} />
      <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-arena text-[32px] font-black leading-tight sm:text-[48px]">
        {title}
      </motion.h1>
      {subtitle && <p className="max-w-md text-body text-arena-muted">{subtitle}</p>}
      {meta && <p className="rounded-full bg-arena-glass px-4 py-1 font-arena text-caption font-extrabold uppercase tracking-wider">{meta}</p>}
      <ChunkyButton variant="arena" className="w-full max-w-xs" onClick={onStart}>
        {cta}
      </ChunkyButton>
    </div>
  );
}

function Countdown({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, timeLeft / timeLimit);
  return (
    <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center sm:h-[88px] sm:w-[88px]" aria-label={`${Math.ceil(timeLeft)} seconds left`} role="timer">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="var(--tile-blue-lip)" stroke="var(--arena-line)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--white)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="relative font-arena text-[26px] font-black tabular-nums sm:text-[32px]">{Math.ceil(timeLeft)}</span>
    </div>
  );
}

function TimerBar({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const frac = Math.max(0, timeLeft / timeLimit);
  const color = frac > 0.5 ? "var(--tile-green)" : frac > 0.25 ? "var(--tile-yellow)" : "var(--tile-red)";
  return (
    <div className="h-4 flex-1 overflow-hidden rounded-full bg-arena-glass" aria-hidden>
      <div className="h-full rounded-full transition-[background-color] duration-300" style={{ width: `${frac * 100}%`, background: color }} />
    </div>
  );
}

interface Props {
  items: ArenaItem[];
  timeLimit: number; // seconds
  scored: boolean;
  intro: { mood: ByteMood; title: string; subtitle?: string };
  /** Called once per answered/expired question (record it via the API here). */
  onAnswer?: (r: ArenaResult) => void;
  /** Extra line under the reveal (e.g. the job's one_liner). */
  revealExtra?: (r: ArenaResult) => ReactNode;
  onFinish: (results: ArenaResult[]) => void;
  onExit?: () => void;
}

type Phase = "intro" | "question" | "reveal";

/** A Kahoot-style round: intro → (question → reveal) × n → onFinish. */
export function ArenaRound({ items, timeLimit, scored, intro, onAnswer, revealExtra, onFinish, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [i, setI] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [flash, setFlash] = useState<null | { ok: boolean; text: string }>(null);
  const startedAt = useRef(0);
  const lastTick = useRef<number>(Infinity);
  const answeredFor = useRef(-1); // guards a tap and the timer landing on the same tick
  const reduce = useReducedMotion();
  const item = items[i];
  const current = results[i];
  const streak = (() => {
    let s = 0;
    for (let k = results.length - 1; k >= 0 && results[k].correct; k--) s++;
    return s;
  })();

  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const answer = useCallback(
    (pick: number | null) => {
      if (phase !== "question" || !item || answeredFor.current === i) return;
      answeredFor.current = i;
      const left = Math.max(0, timeLimit - (performance.now() - startedAt.current) / 1000);
      const correct = item.correctIndex !== null && pick === item.correctIndex;
      const points = scored ? speedPoints(correct, left, timeLimit) : 0;
      const r: ArenaResult = { item, pick, correct, points, timeLeft: left };
      setResults((rs) => [...rs, r]);
      setPhase("reveal");
      onAnswerRef.current?.(r);
      if (pick === null) playSound("time-up");
      else playSound("select");
      if (item.correctIndex !== null) {
        setTimeout(() => playSound(correct ? "correct" : "wrong"), pick === null ? 450 : 120);
        setFlash({ ok: correct, text: correct ? `Correct! +${points}` : pick === null ? "Time's up" : "Not quite" });
        setTimeout(() => setFlash(null), reduce ? 700 : 1100);
      }
    },
    [phase, item, i, timeLimit, scored, reduce],
  );
  const answerRef = useRef(answer);
  answerRef.current = answer;

  // the clock
  useEffect(() => {
    if (phase !== "question") return;
    startedAt.current = performance.now();
    lastTick.current = Infinity;
    setTimeLeft(timeLimit);
    const t = setInterval(() => {
      const left = Math.max(0, timeLimit - (performance.now() - startedAt.current) / 1000);
      setTimeLeft(left);
      const whole = Math.ceil(left);
      if (whole <= 5 && whole > 0 && whole < lastTick.current) {
        lastTick.current = whole;
        playSound("tick");
      }
      if (left <= 0) {
        clearInterval(t);
        answerRef.current(null);
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, i, timeLimit]);

  const next = useCallback(() => {
    if (phase !== "reveal") return;
    if (i + 1 >= items.length) {
      onFinish(results);
    } else {
      setI(i + 1);
      setPhase("question");
    }
  }, [phase, i, items.length, onFinish, results]);

  useAnswerKeys(
    {
      onPick: (k) => phase === "question" && answer(k),
      onEnter: () => (phase === "reveal" && !flash ? next() : undefined),
    },
    phase !== "intro",
  );

  if (phase === "intro") {
    return (
      <ArenaFrame onExit={onExit}>
        <ArenaIntro
          mood={intro.mood}
          title={intro.title}
          subtitle={intro.subtitle}
          meta={`${items.length} questions · ${timeLimit}s each`}
          onStart={() => setPhase("question")}
        />
      </ArenaFrame>
    );
  }

  const tileState = (k: number): TileState => {
    if (phase !== "reveal" || !current) return "idle";
    if (item.correctIndex === null) return k === current.pick ? "picked" : "dimmed";
    if (k === item.correctIndex) return "correct";
    if (k === current.pick) return "wrong";
    return "dimmed";
  };

  return (
    <ArenaFrame onExit={onExit}>
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col gap-4"
        >
          <div className="rounded-card bg-arena-card px-5 py-6 text-center shadow-lg">
            <h1 className="font-arena text-[22px] font-extrabold leading-snug text-arena-ink sm:text-[30px]">{item.prompt}</h1>
          </div>

          <div className="flex items-center gap-4">
            <Countdown timeLeft={phase === "reveal" ? (current?.timeLeft ?? 0) : timeLeft} timeLimit={timeLimit} />
            <TimerBar timeLeft={phase === "reveal" ? (current?.timeLeft ?? 0) : timeLeft} timeLimit={timeLimit} />
            <span className="shrink-0 font-arena text-[20px] font-black tabular-nums">
              {i + 1} / {items.length}
            </span>
          </div>

          <div className="mt-auto grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
            {item.options.map((text, k) => (
              <AnswerTile key={k} index={k} state={tileState(k)} disabled={phase !== "question"} onClick={() => answer(k)}>
                {text}
              </AnswerTile>
            ))}
          </div>

          {phase === "reveal" && current && !flash && (
            <motion.div
              initial={reduce ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col gap-3 rounded-card bg-arena-glass p-4"
              role="status"
            >
              <div className="flex flex-wrap items-center gap-2">
                {item.correctIndex === null ? (
                  <p className="font-arena text-[18px] font-extrabold">{current.pick === null ? "No pick this time" : `You picked: ${item.options[current.pick]}`}</p>
                ) : (
                  <p className="font-arena text-[18px] font-extrabold">{current.correct ? `+${current.points} points` : `Answer: ${item.options[item.correctIndex]}`}</p>
                )}
                {scored && streak >= 2 && (
                  <span className="rounded-full bg-flame px-3 py-0.5 font-arena text-caption font-black">answer streak 🔥{streak}</span>
                )}
              </div>
              {revealExtra?.(current)}
              {item.explanation && <p className="text-body text-arena-muted">{item.explanation}</p>}
              {item.source && <SourceChip source={item.source} dark />}
              <ChunkyButton variant="arena" block onClick={next} autoFocus>
                {i + 1 >= items.length ? "See results" : "Next"}
              </ChunkyButton>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("pointer-events-none fixed inset-0 z-50 grid place-items-center", flash.ok ? "bg-flash-correct" : "bg-flash-wrong")}
            role="alert"
          >
            <motion.p
              initial={reduce ? false : { scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="px-4 text-center font-arena text-[48px] font-black leading-tight text-white sm:text-[64px]"
            >
              {flash.text}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </ArenaFrame>
  );
}
