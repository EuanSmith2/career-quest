import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useCareers, useUpdateProfile } from "@/api/hooks";
import { ArenaFrame } from "@/components/arena/ArenaRound";
import { Byte, type ByteMood } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { celebrate } from "@/lib/confetti";
import type { VibeResult } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Vibe Check result: top match big, the next two smaller; pre-selected to the top match. */
export default function Match() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { ranking?: VibeResult[] } | null };
  const ranking = state?.ranking;
  const { data: careers } = useCareers();
  const update = useUpdateProfile();
  const [stage, setStage] = useState<"thinking" | "reveal">("thinking");
  const [mood, setMood] = useState<ByteMood>("thinking");
  const [picked, setPicked] = useState(ranking?.[0]?.slug);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStage("reveal");
      setMood("shocked");
      playSound("achievement");
      celebrate();
    }, 1800);
    const t2 = setTimeout(() => setMood("correct"), 2900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!ranking?.length) return <Navigate to="/vibe-check" replace />;

  const top3 = ranking.slice(0, 3).map((r) => ({ ...r, career: careers?.find((c) => c.slug === r.slug) }));

  const go = () => {
    if (!picked) return;
    update.mutate({ chosen_career: picked });
    navigate(`/warmup/${picked}`);
  };

  return (
    <ArenaFrame onExit={() => navigate("/start")}>
      <div className="flex flex-1 flex-col items-center gap-6 pt-4">
        <Byte mood={mood} size={stage === "thinking" ? 120 : 140} />
        {stage === "thinking" ? (
          <p className="font-arena text-[24px] font-black" aria-live="polite">
            Byte is thinking…
          </p>
        ) : (
          <>
            <h1 className="text-center font-arena text-[28px] font-black sm:text-[36px]">Your match</h1>
            <div className="flex w-full max-w-[560px] flex-col gap-3">
              {top3.map((r, i) =>
                r.career ? (
                  <motion.button
                    key={r.slug}
                    type="button"
                    onClick={() => setPicked(r.slug)}
                    aria-pressed={picked === r.slug}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.15, type: "spring", stiffness: 260, damping: 20 }}
                    className={cn(
                      "chunky flex w-full items-center gap-4 rounded-card border-2 bg-arena-card text-left text-foreground",
                      i === 0 ? "p-5" : "p-3",
                      picked === r.slug ? "border-blue-border bg-blue-soft" : "border-border",
                    )}
                    style={{ "--lip-color": picked === r.slug ? "var(--blue-border)" : "var(--border)" } as React.CSSProperties}
                  >
                    <CareerBadge icon={r.career.icon} color={r.career.color} size={i === 0 ? 56 : 44} />
                    <span className="min-w-0 flex-1">
                      {i === 0 && <span className="block text-caption font-extrabold uppercase tracking-wide text-green-lip">Top match</span>}
                      <span className={cn("block font-extrabold leading-tight", i === 0 ? "text-[20px] sm:text-[24px]" : "text-body")}>{r.career.job_title}</span>
                      <span className="block text-caption text-muted-foreground">{r.career.one_liner}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-center">
                      <span className={cn("font-arena font-black tabular-nums", i === 0 ? "text-[26px] text-green-lip sm:text-[32px]" : "text-[20px] text-muted-foreground")}>
                        {r.percent}%
                      </span>
                      {picked === r.slug && <Check className="h-5 w-5 text-blue-text" strokeWidth={3} aria-label="Selected" />}
                    </span>
                  </motion.button>
                ) : null,
              )}
            </div>
            {top3[0]?.career && (
              <p className="max-w-[560px] text-center text-body text-arena-muted">
                Day to day: {careers?.find((c) => c.slug === picked)?.day_to_day}
              </p>
            )}
            <ChunkyButton variant="primary" className="mt-auto w-full max-w-[560px]" onClick={go}>
              Meet the jobs
            </ChunkyButton>
          </>
        )}
      </div>
    </ArenaFrame>
  );
}
