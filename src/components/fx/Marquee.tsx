import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Endless horizontal scroll that pauses on hover (marquee). Reduced motion: a plain scrollable row. */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("group overflow-hidden motion-reduce:overflow-x-auto", className)}>
      <div className="flex w-max animate-marquee gap-2 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <div className="flex gap-2">{children}</div>
        <div className="flex gap-2 motion-reduce:hidden" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
