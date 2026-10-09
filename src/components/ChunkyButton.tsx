import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ChunkyVariant = "primary" | "secondary" | "danger" | "correct" | "outline" | "ghost" | "gold";

// primary = green in Light, blue (with black text) in Midnight. "correct" stays green in both.
const VARIANTS: Record<ChunkyVariant, { className: string; lip: string | null }> = {
  primary: { className: "bg-primary text-primary-fg", lip: "var(--primary-lip)" },
  secondary: { className: "bg-blue text-white dark:text-primary-fg", lip: "var(--blue-lip)" },
  danger: { className: "bg-wrong text-white dark:text-primary-fg", lip: "var(--red-lip)" },
  correct: { className: "bg-correct text-white dark:text-primary-fg", lip: "var(--green-lip)" },
  outline: { className: "border-2 border-border bg-background text-link", lip: "var(--border-deep)" },
  ghost: { className: "bg-transparent text-link hover:bg-muted", lip: null },
  gold: { className: "bg-gold text-ink-bright", lip: "var(--gold-lip)" },
};

export interface ChunkyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChunkyVariant;
  block?: boolean;
  asChild?: boolean;
}

/** The signature 3D button (pop-button press). Every primary action uses it. */
export const ChunkyButton = React.forwardRef<HTMLButtonElement, ChunkyButtonProps>(function ChunkyButton(
  { variant = "primary", block, asChild, className, style, disabled, type = "button", ...props },
  ref,
) {
  const v = VARIANTS[variant];
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        "btn-text inline-flex min-h-[50px] select-none items-center justify-center gap-2 rounded-btn px-4 py-2 text-center leading-tight",
        v.lip ? "chunky" : "transition-colors duration-200",
        disabled ? "cursor-not-allowed border-0 bg-disabled-bg text-disabled-fg" : v.className,
        block && "w-full",
        className,
      )}
      style={{ ...(v.lip ? ({ "--lip-color": v.lip } as React.CSSProperties) : null), ...style }}
      {...props}
    />
  );
});
