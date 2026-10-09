import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Flame, Swords } from "lucide-react";
import { useCareers, useProfile, useUpdateProfile } from "@/api/hooks";
import type { Profile } from "@/api/types";
import { CareerIcon } from "@/components/CareerIcon";
import { Conversation } from "@/components/onboarding/Conversation";
import { OptionCard } from "@/components/OptionCard";
import { ErrorState, LoadingState } from "@/components/States";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";
import { cn } from "@/lib/utils";

const LEVELS = ["I'm brand new", "I know some terms", "I've done a few labs/CTFs", "I study it", "I work in it"];
const GOALS: { xp: Profile["daily_goal_xp"]; time: string; label: string }[] = [
  { xp: 10, time: "5 min / day", label: "Casual" },
  { xp: 20, time: "10 min / day", label: "Regular" },
  { xp: 30, time: "15 min / day", label: "Serious" },
  { xp: 40, time: "20 min / day", label: "Intense" },
];
const ACHIEVE = [
  { icon: Swords, title: "Think like an attacker", body: "Real scenarios from pen tests, SOCs and incident rooms." },
  { icon: Brain, title: "Know the frameworks employers ask for", body: "NIST, MITRE ATT&CK, OWASP, CIS: every question cites one." },
  { icon: Flame, title: "Build a daily habit", body: "Five-minute lessons, streaks and XP." },
];

/** Signal-strength icon: 0–4 bars lit in --blue. */
function SignalBars({ lit }: { lit: number }) {
  return (
    <svg viewBox="0 0 20 16" className="h-5 w-5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={12 - i * 4} width="3.5" height={4 + i * 4} rx="1" fill={i < lit ? "var(--bars-on, var(--blue))" : "currentColor"} opacity={i < lit ? 1 : 0.35} />
      ))}
    </svg>
  );
}

type Step = "level" | "goal" | "achieve" | "career";

/**
 * Onboarding as a conversation with Byte, then "What do you want to be?".
 * Returning players (a career already chosen, or ?pick=1) go straight to the career grid.
 */
export default function Start() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: profile, isLoading } = useProfile();
  const careers = useCareers();
  const update = useUpdateProfile();
  const [level, setLevel] = useState<number | null>(null);
  const [goal, setGoal] = useState<Profile["daily_goal_xp"] | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [knows, setKnows] = useState(false); // "I already know what career I want" → show the grid

  if (isLoading) return <LoadingState className="mx-auto max-w-app px-4" />;
  const current: Step = step ?? (params.get("pick") === "1" || profile?.chosen_career ? "career" : "level");
  const order: Step[] = ["level", "goal", "achieve", "career"];
  const at = order.indexOf(current);
  const go = (s: Step) => setStep(s);
  const back = () => (at <= 0 ? navigate("/") : go(order[at - 1]));
  const forward = () => go(order[at + 1]);

  const pickCareer = (slug: string) => {
    update.mutate({ chosen_career: slug });
    navigate(`/learn/${slug}`); // straight to the path, no quiz
  };

  if (current === "level")
    return (
      <PickStep
        step={1}
        steps={order.length}
        line="Hi, I'm Byte! How much cyber do you know?"
        onBack={back}
        value={level}
        options={LEVELS.map((l, i) => ({ label: l, icon: <SignalBars lit={i} /> }))}
        onPick={setLevel}
        onContinue={() => {
          update.mutate({ starting_level: level as Profile["starting_level"] });
          forward();
        }}
      />
    );

  if (current === "goal")
    return (
      <PickStep
        step={2}
        steps={order.length}
        line="What's your daily goal?"
        onBack={back}
        value={goal === null ? null : GOALS.findIndex((g) => g.xp === goal)}
        options={GOALS.map((g) => ({ label: g.time, right: g.label }))}
        onPick={(i) => setGoal(GOALS[i].xp)}
        onContinue={() => {
          if (goal) update.mutate({ daily_goal_xp: goal });
          forward();
        }}
      />
    );

  if (current === "achieve")
    return (
      <Conversation step={3} steps={order.length} line="Here's what you'll achieve" onBack={back} onContinue={forward}>
        <ul className="flex flex-col gap-5">
          {ACHIEVE.map((a, i) => (
            <motion.li key={a.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }} className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-muted text-blue">
                <a.icon className="h-6 w-6" strokeWidth={2.4} />
              </span>
              <span>
                <span className="block font-extrabold">{a.title}</span>
                <span className="block text-caption text-muted-foreground">{a.body}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </Conversation>
    );

  // career step: two big choices first, then the grid for players who already know
  return (
    <Conversation
      key={knows ? "grid" : "choose"}
      step={order.length}
      steps={order.length}
      line={knows ? "Which one? Pick your career." : "What do you want to be?"}
      onBack={() => (knows ? setKnows(false) : step || !profile?.chosen_career ? back() : navigate(-1))}
      onContinue={() => undefined}
      wide
      hideProgress
      hideFooter
    >
      {!knows ? (
        // two big halves filling the screen under Byte, side by side, content centred
        <div className="grid min-h-[calc(100dvh-210px)] grid-cols-2 gap-3 sm:gap-5">
          <MagicCard color="var(--blue)" delay={0} highlight stack className="h-full" onClick={() => navigate("/vibe-check")}>
            <span className="grid h-20 w-20 place-items-center rounded-[22px] bg-blue text-[44px] sm:h-28 sm:w-28 sm:text-[64px]">🤷</span>
            <span className="block text-[22px] font-black leading-tight text-selected-fg sm:text-[32px]">I don't know yet</span>
            <span className="block text-[15px] text-muted-foreground sm:text-body">Take the 8-question Vibe Check and Byte will match you.</span>
          </MagicCard>
          <MagicCard color="var(--purple)" delay={0.08} stack className="h-full" onClick={() => setKnows(true)}>
            <span className="grid h-20 w-20 place-items-center rounded-[22px] bg-purple text-[44px] sm:h-28 sm:w-28 sm:text-[64px]">🎯</span>
            <span className="block text-[22px] font-black leading-tight sm:text-[32px]">I already know what career I want</span>
            <span className="block text-[15px] text-muted-foreground sm:text-body">Pick it from the 12 cyber careers and start learning.</span>
          </MagicCard>
        </div>
      ) : careers.isLoading ? (
        <LoadingState label="Loading careers…" />
      ) : careers.isError ? (
        <ErrorState onRetry={() => careers.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3">
          {careers.data?.map((c, i) => (
            <MagicCard key={c.slug} color={c.color} delay={i * 0.03} onClick={() => pickCareer(c.slug)}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted" style={{ color: c.color }}>
                <CareerIcon name={c.icon} className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold leading-tight">{c.job_title}</span>
                <span className="block text-[13px] text-muted-foreground">{c.one_liner}</span>
              </span>
            </MagicCard>
          ))}
        </div>
      )}
    </Conversation>
  );
}

/** A single-choice onboarding step with option cards (2 columns when short). */
function PickStep({
  step,
  steps,
  line,
  onBack,
  value,
  options,
  onPick,
  onContinue,
}: {
  step: number;
  steps: number;
  line: string;
  onBack: () => void;
  value: number | null;
  options: { label: string; icon?: React.ReactNode; right?: string }[];
  onPick: (i: number) => void;
  onContinue: () => void;
}) {
  useAnswerKeys({ maxKeys: options.length, onPick: (i) => (onPick(i), playSound("select")) });
  return (
    <Conversation step={step} steps={steps} line={line} onBack={onBack} canContinue={value !== null} onContinue={onContinue}>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label={line}>
        {options.map((o, i) => (
          <OptionCard
            key={o.label}
            index={i}
            icon={o.icon}
            state={value === i ? "selected" : "idle"}
            role="radio"
            aria-checked={value === i}
            onClick={() => {
              onPick(i);
              playSound("select");
            }}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{o.label}</span>
              {o.right && <span className="text-caption font-bold text-muted-foreground">{o.right}</span>}
            </span>
          </OptionCard>
        ))}
      </div>
    </Conversation>
  );
}

/** Career tile with a spotlight that follows the cursor in the career's colour (magic-card). */
function MagicCard({
  color,
  delay,
  highlight,
  stack,
  className,
  onClick,
  children,
}: {
  color: string;
  delay: number;
  highlight?: boolean;
  stack?: boolean; // column layout, centred (the two big choices)
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 22 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "chunky group relative flex items-center gap-3 overflow-hidden rounded-card border-2 text-left hover:-translate-y-1",
        stack ? "justify-center p-4 sm:p-8" : "px-3 py-2.5",
        highlight ? "border-blue-border bg-blue-soft" : "border-border bg-background",
        className,
      )}
      style={{ "--lip-color": highlight ? "var(--blue-lip)" : "var(--border-deep)" } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: `radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ${color} 28%, transparent), transparent 70%)` }}
      />
      <span className={cn("relative flex gap-3", stack ? "w-full flex-col items-center justify-center gap-4 text-center" : "items-center")}>{children}</span>
    </motion.button>
  );
}
