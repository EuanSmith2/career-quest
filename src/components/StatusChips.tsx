import { useEffect, useState } from "react";
import { Flame, Heart, Zap } from "lucide-react";
import { useCareer, useProfile, useWeeklyXp } from "@/api/hooks";
import type { DayXp } from "@/api/types";
import { CareerIcon } from "./CareerIcon";
import { NumberTicker } from "./fx/NumberTicker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { formatCountdown, localDateKey, MAX_HEARTS, msUntilNextHeart } from "@/lib/game";
import { cn } from "@/lib/utils";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const HUD = "inline-flex items-center gap-1 text-[20px] font-black tabular-nums";
const POP = "w-64 border-2 border-border bg-background text-foreground";

const dayLetter = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "narrow" });
};

/** The last 7 days as dots (streak calendar). */
export function WeekDots({ week, className }: { week: DayXp[]; className?: string }) {
  const today = localDateKey();
  return (
    <div className={cn("flex justify-between gap-1", className)}>
      {week.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1">
          <span className={cn("text-[12px] font-extrabold", d.date === today ? "text-flame" : "text-muted-foreground")}>{dayLetter(d.date)}</span>
          <span className={cn("grid h-7 w-7 place-items-center rounded-full text-[12px] font-black", d.xp > 0 ? "bg-flame text-white dark:text-primary-fg" : "bg-muted", d.date === today && "ring-2 ring-flame")}>
            {d.xp > 0 ? "✓" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StreakChip({ streak, className }: { streak: number; className?: string }) {
  const { data: week } = useWeeklyXp();
  return (
    <Popover>
      <PopoverTrigger className={cn(HUD, streak > 0 ? "text-flame" : "text-disabled-fg", className)} aria-label={`${streak} day streak`}>
        <Flame className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
        <NumberTicker value={streak} />
      </PopoverTrigger>
      <PopoverContent className={POP}>
        <p className="font-extrabold">{streak} day streak</p>
        <p className="mb-3 text-caption text-muted-foreground">{streak ? "Earn XP today to keep it going." : "Finish a lesson to start one."}</p>
        {week && <WeekDots week={week} />}
      </PopoverContent>
    </Popover>
  );
}

export function XpChip({ xp, className }: { xp: number; className?: string }) {
  const { data: week } = useWeeklyXp();
  const max = Math.max(10, ...(week ?? []).map((d) => d.xp));
  return (
    <Popover>
      <PopoverTrigger className={cn(HUD, "text-gold", className)} aria-label={`${xp} XP`}>
        <Zap className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
        <NumberTicker value={xp} />
      </PopoverTrigger>
      <PopoverContent className={POP}>
        <p className="font-extrabold">{xp} XP total</p>
        <p className="mb-3 text-caption text-muted-foreground">Last 7 days</p>
        <div className="flex h-16 items-end gap-1.5" aria-label="XP per day, last 7 days">
          {(week ?? []).map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.xp} XP`}>
              <div className="w-full rounded-t-[4px] bg-gold" style={{ height: `${(d.xp / max) * 48}px`, minHeight: d.xp ? 3 : 0 }} />
              <span className="text-[11px] font-bold text-muted-foreground">{dayLetter(d.date)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** ❤️ count; tap for the refill timer (from hearts_updated_at). `pulse` shakes the heart when one is lost. */
export function HeartsChip({ hearts, heartsUpdatedAt, pulse, className }: { hearts: number; heartsUpdatedAt?: string; pulse?: number; className?: string }) {
  const now = useNow();
  const next = heartsUpdatedAt ? msUntilNextHeart(hearts, heartsUpdatedAt, now) : null;
  return (
    <Popover>
      <PopoverTrigger className={cn(HUD, hearts > 0 ? "text-red" : "text-disabled-fg", className)} aria-label={`${hearts} hearts`}>
        <span key={pulse} className={cn("inline-flex", pulse ? "animate-heart-shake" : "")}>
          <Heart className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
        </span>
        <NumberTicker value={hearts} duration={300} />
      </PopoverTrigger>
      <PopoverContent className={cn(POP, "text-center")}>
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

/** The stats HUD: career icon · 🔥 streak · ⚡ XP · ❤️ hearts. */
export function StatusRow({ className }: { className?: string }) {
  const { data: p } = useProfile();
  const { data: career } = useCareer(p?.chosen_career);
  return (
    <div className={cn("flex items-center justify-between gap-[22px]", className)}>
      <span className="inline-grid h-9 w-9 place-items-center rounded-[9px] bg-muted" style={career ? { color: career.color } : undefined} title={career?.job_title}>
        <CareerIcon name={career?.icon ?? "Shield"} className={cn("h-5 w-5", !career && "text-muted-icon")} strokeWidth={2.4} />
      </span>
      <StreakChip streak={p?.streak ?? 0} />
      <XpChip xp={p?.xp ?? 0} />
      <HeartsChip hearts={p?.hearts ?? MAX_HEARTS} heartsUpdatedAt={p?.hearts_updated_at} />
    </div>
  );
}
