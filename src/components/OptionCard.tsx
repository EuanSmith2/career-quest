import * as React from "react";
import { cn } from "@/lib/utils";

export type OptionState = "idle" | "selected" | "scanning" | "correct" | "wrong" | "dimmed";

const STATES: Record<OptionState, { className: string; badge: string; lip: string }> = {
  idle: { className: "border-border bg-background text-foreground", badge: "border-border text-muted-foreground", lip: "var(--border-deep)" },
  // picked: lifts with a blue glow (Midnight video tile)
  selected: {
    className: "border-blue-border bg-blue-soft text-selected-fg -translate-y-1 shadow-[0_0_0_1px_var(--blue-ring),0_10px_30px_var(--blue-shadow)]",
    badge: "border-blue-border text-selected-fg",
    lip: "var(--blue-lip)",
  },
  scanning: { className: "border-blue-border bg-blue-soft text-selected-fg", badge: "border-blue-border text-selected-fg", lip: "var(--blue-lip)" },
  correct: { className: "border-correct bg-correct-soft text-correct-text", badge: "border-correct text-correct-text", lip: "var(--correct)" },
  wrong: { className: "border-wrong bg-wrong-soft text-wrong-text", badge: "border-wrong text-wrong-text", lip: "var(--wrong)" },
  dimmed: { className: "border-border bg-background text-foreground opacity-[0.35]", badge: "border-border text-muted-foreground", lip: "var(--border-deep)" },
};

export interface OptionCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  index: number; // 0-based; keys 1–4 still pick it, no badge is shown
  state?: OptionState;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/** An answer card: optional icon chip and a bold label. Long answers wrap. */
export function OptionCard({ index, state = "idle", icon, className, style, children, ...props }: OptionCardProps) {
  const s = STATES[state];
  return (
    <button
      type="button"
      aria-pressed={state === "selected"}
      data-key={index + 1}
      className={cn(
        "chunky relative flex w-full items-center gap-3 rounded-card border-2 p-3 text-left text-body font-bold",
        state === "wrong" && "animate-shake",
        s.className,
        className,
      )}
      style={{ "--lip-color": s.lip, ...style } as React.CSSProperties}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-[9px]",
            state === "selected" ? "bg-blue text-primary-fg [--bars-on:currentColor]" : "bg-muted text-muted-icon",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </button>
  );
}
