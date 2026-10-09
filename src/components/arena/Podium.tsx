import { useEffect } from "react";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

export interface PodiumColumn {
  label: string;
  value: string;
  sub?: string;
  place: 1 | 2 | 3;
}

const STYLE = {
  1: { h: 180, bg: "bg-gold", lip: "var(--gold-lip)", text: "text-foreground", delay: 0.9 },
  2: { h: 130, bg: "bg-silver", lip: "var(--silver-lip)", text: "text-foreground", delay: 0.45 },
  3: { h: 100, bg: "bg-bronze", lip: "var(--bronze-lip)", text: "text-foreground", delay: 0.1 },
} as const;

/** Three rising blocks, 2nd · 1st · 3rd, with a drum roll into a hit. */
export function Podium({ columns, className }: { columns: PodiumColumn[]; className?: string }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    playSound("podium");
  }, []);
  const order = [2, 1, 3].map((p) => columns.find((c) => c.place === p)).filter(Boolean) as PodiumColumn[];

  return (
    <div className={cn("flex items-end justify-center gap-2 sm:gap-4", className)}>
      {order.map((c) => {
        const s = STYLE[c.place];
        return (
          <div key={c.place} className="flex w-[30%] max-w-[180px] flex-col items-center gap-2">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : s.delay + 0.35 }}
              className="text-center"
            >
              <p className="font-arena text-[26px] font-black leading-none tabular-nums sm:text-[40px]">{c.value}</p>
              {c.sub && <p className="mt-1 text-caption font-bold text-arena-muted">{c.sub}</p>}
            </motion.div>
            <motion.div
              initial={reduce ? false : { height: 0 }}
              animate={{ height: s.h }}
              transition={{ delay: reduce ? 0 : s.delay, type: "spring", stiffness: 140, damping: 16 }}
              className={cn("flex w-full items-start justify-center overflow-hidden rounded-t-tile pt-3", s.bg, s.text)}
              style={{ boxShadow: `inset 0 -6px 0 ${s.lip}` }}
            >
              <span className="px-1 text-center font-arena text-[13px] font-black uppercase leading-tight sm:text-[15px]">{c.label}</span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
