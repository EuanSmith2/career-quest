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
  index: number; // 0-based; the keyboard key shown is index + 1 (10th = 0)
  state?: OptionState;
  icon?: React.ReactNode;
  hideKey?: boolean;
  children: React.ReactNode;
}

/** An answer card: optional icon chip, bold label, number-key badge bottom-right. Long answers wrap. */
export function OptionCard({ index, state = "idle", icon, hideKey, className, style, children, ...props }: OptionCardProps) {
  const s = STATES[state];
  return (
    <button
      type="button"
      aria-pressed={state === "selected"}
      className={cn(
        "chunky relative flex w-full items-center gap-3 rounded-card border-2 py-3 pl-3 text-left text-body font-bold",
        hideKey ? "pr-3" : "pr-10",
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
            state === "selected" ? "bg-blue text-primary-fg" : "bg-muted text-muted-icon",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {!hideKey && (
        <span
          className={cn("absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-lg border-2 text-[12px] font-extrabold", s.badge)}
          aria-hidden
        >
          {(index + 1) % 10}
        </span>
      )}
    </button>
  );
}
