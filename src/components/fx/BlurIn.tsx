import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Blur-in reveal (opacity 0, blur 14px, +18px → clear) over 0.9s. Reduced motion: fade only (index.css). */
export function BlurIn({ as: Tag = "div", delay = 0, className, children }: { as?: ElementType; delay?: number; className?: string; children: ReactNode }) {
  return (
    <Tag className={cn("animate-blur-in", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </Tag>
  );
}
