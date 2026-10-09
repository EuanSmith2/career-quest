import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  gold: { border: "border-gold", head: "bg-gold text-ink-bright", value: "text-gold" },
  green: { border: "border-correct", head: "bg-correct text-white dark:text-primary-fg", value: "text-correct-text" },
  blue: { border: "border-blue", head: "bg-blue text-white dark:text-primary-fg", value: "text-selected-fg" },
  flame: { border: "border-flame", head: "bg-flame text-white dark:text-primary-fg", value: "text-flame" },
} as const;

/** Lesson-complete stat: coloured header label over a white value box. */
export function StatTile({
  label,
  value,
  icon,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone: keyof typeof TONES;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border-2", t.border, className)}>
      <div className={cn("px-2 py-1 text-center text-[13px] font-extrabold uppercase tracking-wide", t.head)}>{label}</div>
      <div className={cn("flex items-center justify-center gap-1.5 bg-background px-2 py-3 text-[22px] font-extrabold", t.value)}>
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
