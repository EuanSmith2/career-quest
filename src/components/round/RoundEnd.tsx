import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Byte, type ByteMood } from "@/components/Byte";
import { useAnswerKeys } from "@/lib/useKeys";

/** End-of-round screen in the lesson-complete layout: Byte, a big title, stat tiles, then actions. */
export function RoundEnd({
  mood,
  title,
  titleClass = "text-gold",
  subtitle,
  stats,
  children,
  actions,
  onEnter,
}: {
  mood: ByteMood;
  title: string;
  titleClass?: string;
  subtitle?: ReactNode;
  stats?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  onEnter?: () => void;
}) {
  useAnswerKeys({ onEnter }, !!onEnter);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-app flex-col items-center justify-center gap-6 px-4 py-8 text-center">
        <Byte mood={mood} size={160} />
        <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={"text-title-sm sm:text-title " + titleClass}>
          {title}
        </motion.h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        {stats && <div className="flex w-full gap-3">{stats}</div>}
        {children}
        <div className="mt-2 flex w-full flex-col gap-3">{actions}</div>
      </div>
    </div>
  );
}
