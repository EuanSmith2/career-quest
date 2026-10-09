import { useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

/** Text with a few twinkling sparkles around it (sparkles-text). */
export function SparklesText({ children, className, color = "var(--gold)" }: { children: string; className?: string; color?: string }) {
  const reduce = useReducedMotion();
  const dots = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ x: 5 + Math.random() * 90, y: Math.random() * 100, d: i * 0.25, s: 8 + Math.random() * 8 })),
    [],
  );
  return (
    <span className={cn("relative inline-block", className)}>
      {!reduce &&
        dots.map((p, i) => (
          <motion.svg
            key={i}
            viewBox="0 0 24 24"
            className="pointer-events-none absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2, fill: color }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 90] }}
            transition={{ duration: 1.2, delay: p.d, repeat: 2 }}
            aria-hidden
          >
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
          </motion.svg>
        ))}
      <span className="relative">{children}</span>
    </span>
  );
}
