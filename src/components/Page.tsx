import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

/** Page transition: slide in over 250ms. Not for full-screen (fixed) pages: a transform would trap them. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
