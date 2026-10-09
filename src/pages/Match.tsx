import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useCareers, useUpdateProfile } from "@/api/hooks";
import { Byte, type ByteMood } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ScratchToReveal } from "@/components/fx/ScratchToReveal";
import { celebrate } from "@/lib/confetti";
import type { VibeResult } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Three-dot "Byte is typing" bubble (typing-indicator). */
function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-card border-2 border-border bg-background px-4 py-3" role="status" aria-label="Byte is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/** Vibe Check result: scratch to reveal the top match, then pick it or one of the next two. */
export default function Match() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { ranking?: VibeResult[] } | null };
  const ranking = state?.ranking;
  const { data: careers } = useCareers();
  const update = useUpdateProfile();
  const [stage, setStage] = useState<"thinking" | "scratch" | "revealed">("thinking");
  const [mood, setMood] = useState<ByteMood>("thinking");
  const [picked, setPicked] = useState(ranking?.[0]?.slug);

  useEffect(() => {
    const t = setTimeout(() => setStage("scratch"), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!ranking?.length) return <Navigate to="/vibe-check" replace />;
  const top3 = ranking.slice(0, 3).map((r) => ({ ...r, career: careers?.find((c) => c.slug === r.slug) }));

  const onReveal = () => {
    setStage("revealed");
    setMood("shocked");
    playSound("achievement");
    celebrate();
    setTimeout(() => setMood("correct"), 1100);
  };

  const go = () => {
    if (!picked) return;
    update.mutate({ chosen_career: picked });
    navigate(`/warmup/${picked}`);
  };

  const card = (r: (typeof top3)[number], i: number) =>
    r.career ? (
      <motion.button
        key={r.slug}
        type="button"
        onClick={() => stage === "revealed" && setPicked(r.slug)}
        aria-pressed={picked === r.slug}
        initial={i === 0 ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: i * 0.15, type: "spring", stiffness: 260, damping: 20 }}
        className={cn(
          "chunky flex w-full items-center gap-4 rounded-card border-2 text-left transition-transform",
          i === 0 ? "p-5" : "p-3",
          picked === r.slug && stage === "revealed"
            ? "-translate-y-1 border-blue-border bg-blue-soft shadow-[0_0_0_1px_var(--blue-ring),0_10px_30px_var(--blue-shadow)]"
            : "border-border bg-background",
        )}
        style={{ "--lip-color": picked === r.slug ? "var(--blue-lip)" : "var(--border-deep)" } as React.CSSProperties}
      >
        <CareerBadge icon={r.career.icon} color={r.career.color} size={i === 0 ? 56 : 44} />
        <span className="min-w-0 flex-1">
          {i === 0 && <span className="block text-caption font-extrabold uppercase tracking-wide text-correct-text">Top match</span>}
          <span className={cn("block font-extrabold leading-tight", i === 0 ? "text-[20px] sm:text-[24px]" : "text-body")}>{r.career.job_title}</span>
          <span className="block text-caption text-muted-foreground">{r.career.one_liner}</span>
        </span>
        <span className="flex shrink-0 flex-col items-center">
          <span className={cn("font-black tabular-nums", i === 0 ? "text-[26px] text-correct-text sm:text-[32px]" : "text-[20px] text-muted-foreground")}>{r.percent}%</span>
          {picked === r.slug && stage === "revealed" && <Check className="h-5 w-5 text-selected-fg" strokeWidth={3} aria-label="Selected" />}
        </span>
      </motion.button>
    ) : null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col gap-6 px-4 pb-8 pt-4">
        <button type="button" onClick={() => navigate("/vibe-check")} className="self-start text-muted-foreground hover:text-foreground" aria-label="Retake the Vibe Check">
          <ArrowLeft className="h-7 w-7" strokeWidth={3} />
        </button>
        <div className="flex items-end gap-3">
          <Byte mood={mood} size={stage === "thinking" ? 120 : 140} />
          {stage === "thinking" ? (
            <div className="mb-8">
              <TypingIndicator />
            </div>
          ) : (
            <h1 className="mb-6 text-title-sm sm:text-title">{stage === "revealed" ? "Your match!" : "I've got it…"}</h1>
          )}
        </div>

        {stage !== "thinking" && top3[0] && (
          <ScratchToReveal onReveal={onReveal} label="Scratch to see your career">
            {card(top3[0], 0)}
          </ScratchToReveal>
        )}

        {stage === "revealed" && (
          <>
            <div className="flex flex-col gap-3">{top3.slice(1).map((r, i) => card(r, i + 1))}</div>
            <p className="text-center text-body text-muted-foreground">Day to day: {careers?.find((c) => c.slug === picked)?.day_to_day}</p>
            <ChunkyButton className="mt-auto" block onClick={go}>
              Meet the jobs
            </ChunkyButton>
          </>
        )}
      </div>
    </div>
  );
}
