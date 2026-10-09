import * as React from "react";
import { cn } from "@/lib/utils";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const STATES: Record<OptionState, { className: string; badge: string; lip: string }> = {
  idle: { className: "border-border bg-background text-foreground", badge: "border-border text-disabled-fg", lip: "var(--border)" },
  selected: { className: "border-blue-border bg-blue-soft text-blue-text", badge: "border-blue-border text-blue-text", lip: "var(--blue-border)" },
  correct: { className: "border-green bg-green-soft text-green-lip", badge: "border-green text-green-lip", lip: "var(--green)" },
  wrong: { className: "border-red bg-red-soft text-red-lip", badge: "border-red text-red-lip", lip: "var(--red)" },
  dimmed: { className: "border-border bg-background text-disabled-fg", badge: "border-border text-disabled-fg", lip: "var(--border)" },
};

export interface OptionCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  index: number; // 0-based; shown as 1–4
  state?: OptionState;
  children: React.ReactNode;
}

/** A lesson answer option: lip card with a 1–4 number badge. Long answers wrap, never truncate. */
export function OptionCard({ index, state = "idle", className, style, children, ...props }: OptionCardProps) {
  const s = STATES[state];
  return (
    <button
      type="button"
      aria-pressed={state === "selected"}
      className={cn(
        "chunky flex w-full items-center gap-3 rounded-card border-2 p-3 text-left text-body font-bold",
        state === "wrong" && "animate-shake",
        s.className,
        className,
      )}
      style={{ "--lip-color": s.lip, ...style } as React.CSSProperties}
      {...props}
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 text-caption font-extrabold", s.badge)}>{index + 1}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </button>
  );
}
