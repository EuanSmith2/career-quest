import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Thick rounded progress bar: green fill with a light highlight stripe. */
export function ProgressBar({
  value,
  className,
  color = "var(--green)",
  height = 16,
  label,
}: {
  value: number; // 0–1
  className?: string;
  color?: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? "Progress"}
      className={cn("relative w-full overflow-hidden rounded-full bg-border", className)}
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
            className="absolute left-2 right-2 rounded-full bg-white opacity-30"
            style={{ top: Math.max(3, height * 0.22), height: Math.max(3, height * 0.22) }}
          />
        )}
      </motion.div>
    </div>
  );
}
