import { useEffect, useState } from "react";
import { Flame, Gem, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useCareer, useProfile } from "@/api/hooks";
import { CareerIcon } from "./CareerIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { formatCountdown, MAX_HEARTS, msUntilNextHeart } from "@/lib/game";
import { cn } from "@/lib/utils";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
export { useNow };

export function StreakChip({ streak, className }: { streak: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-extrabold", streak > 0 ? "text-flame" : "text-disabled-fg", className)} aria-label={`${streak} day streak`}>
      <Flame className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
      {streak}
    </span>
  );
}

export function XpChip({ xp, className }: { xp: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-extrabold text-blue", className)} aria-label={`${xp} XP`}>
      <Gem className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
      {xp}
    </span>
  );
}

/** ❤️ count; tap for the refill countdown (from hearts_updated_at). `pulse` animates a heart breaking. */
export function HeartsChip({ hearts, heartsUpdatedAt, pulse, className }: { hearts: number; heartsUpdatedAt?: string; pulse?: number; className?: string }) {
  const now = useNow();
  const next = heartsUpdatedAt ? msUntilNextHeart(hearts, heartsUpdatedAt, now) : null;
  return (
    <Popover>
      <PopoverTrigger className={cn("inline-flex items-center gap-1 font-extrabold", hearts > 0 ? "text-red" : "text-disabled-fg", className)} aria-label={`${hearts} hearts`}>
        <motion.span
          key={pulse}
          initial={pulse ? { scale: 1.5, rotate: -12 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className="inline-flex"
        >
          <Heart className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
        </motion.span>
        {hearts}
      </PopoverTrigger>
      <PopoverContent className="w-60 border-2 border-border bg-background text-center">
        <p className="font-extrabold">Hearts</p>
        <p className="text-caption text-muted-foreground">
          {hearts >= MAX_HEARTS
            ? "You're full. Each wrong answer costs one."
            : `Next heart in ${formatCountdown(next ?? 0)}. Or finish a practice lesson for +1.`}
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** The top bar row: career icon, 🔥 streak, 💎 XP, ❤️ hearts. */
export function StatusRow({ className }: { className?: string }) {
  const { data: p } = useProfile();
  const { data: career } = useCareer(p?.chosen_career);
  return (
    <div className={cn("flex items-center justify-between gap-2 text-body", className)}>
      <span className="inline-grid h-9 w-9 place-items-center rounded-[10px] border-2 border-border" style={career ? { color: career.color } : undefined} title={career?.job_title}>
        <CareerIcon name={career?.icon ?? "Shield"} className={cn("h-5 w-5", !career && "text-disabled-fg")} strokeWidth={2.4} />
      </span>
      <StreakChip streak={p?.streak ?? 0} />
      <XpChip xp={p?.xp ?? 0} />
      <HeartsChip hearts={p?.hearts ?? MAX_HEARTS} heartsUpdatedAt={p?.hearts_updated_at} />
    </div>
  );
}
