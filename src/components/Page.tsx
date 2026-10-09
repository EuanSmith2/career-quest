import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Screen-to-screen crossfade (0.6s). Opacity only, so fixed children aren't trapped by a transform. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className={cn(className)}>
      {children}
    </motion.div>
  );
}
