import { Clock, Gift } from "lucide-react";
import type { Quest } from "@/api/types";
import { ProgressBar } from "./ProgressBar";
import { useNow } from "./StatusChips";
import { formatCountdown } from "@/lib/game";
import { cn } from "@/lib/utils";

/** "⏱ 4 HOURS" until the daily quests refresh. */
export function QuestRefresh({ quests, className }: { quests: Quest[]; className?: string }) {
  const now = useNow(30_000);
  const ms = quests[0] ? new Date(quests[0].resets_at).getTime() - now : 0;
  const hours = Math.floor(ms / 3_600_000);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wide text-flame", className)}>
      <Clock className="h-4 w-4" /> {hours >= 1 ? `${hours} hour${hours === 1 ? "" : "s"}` : formatCountdown(ms)}
    </span>
  );
}

/** Daily quests: title, progress bar with a chest at the end. */
export function QuestList({ quests, compact }: { quests: Quest[]; compact?: boolean }) {
  return (
    <ul className={cn("flex flex-col", compact ? "gap-4" : "gap-5")}>
      {quests.map((q) => {
        const done = q.progress >= q.target;
        return (
          <li key={q.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={cn("mb-1.5 flex justify-between gap-2 font-extrabold", compact && "text-caption")}>
                <span>{q.title}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {q.progress}/{q.target}
                </span>
              </p>
              <ProgressBar value={q.progress / q.target} color="var(--gold)" height={compact ? 14 : 18} label={q.title} />
            </div>
            <Gift className={cn("h-8 w-8 shrink-0", done ? "text-gold" : "text-muted-icon")} fill={done ? "currentColor" : "none"} strokeWidth={2} aria-label={done ? "Reward earned" : `${q.reward_xp} XP reward`} />
          </li>
        );
      })}
    </ul>
  );
}
