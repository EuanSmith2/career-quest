import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Thick rounded progress bar: primary fill, light highlight stripe, and a glowing knob that pulses when it moves forward. */
export function ProgressBar({
  value,
  className,
  color = "var(--primary)",
  height = 16,
  label,
  knob = false,
}: {
  value: number; // 0–1
  className?: string;
  color?: string;
  height?: number;
  label?: string;
  knob?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const last = useRef(pct);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (pct > last.current) setPulse((p) => p + 1);
    last.current = pct;
  }, [pct]);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? "Progress"}
      className={cn("relative w-full rounded-full bg-border", className)}
      style={{ height }}
    >
      <motion.div
        className="relative h-full rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {pct > 4 && (
          <span
            className="absolute left-2 right-3 rounded-full bg-white opacity-30"
            style={{ top: Math.max(3, height * 0.22), height: Math.max(3, height * 0.22) }}
          />
        )}
        {knob && pct > 0 && (
          <span
            key={pulse}
            className="absolute right-0 top-1/2 h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 animate-knob-pulse rounded-full border-[3px] border-background shadow-[0_0_12px_var(--blue-glow)]"
            style={{ background: color }}
            aria-hidden
          />
        )}
      </motion.div>
    </div>
  );
}
