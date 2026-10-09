import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shield chip + the lowercase wordmark "career quest" in --primary. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <span className="chunky grid h-9 w-9 place-items-center rounded-[10px] bg-primary text-primary-fg" style={{ "--lip-color": "var(--primary-lip)" } as React.CSSProperties}>
        <ShieldCheck className="h-5 w-5" strokeWidth={2.6} />
      </span>
      {!compact && <span className="text-[24px] font-black leading-none tracking-[-0.045em]">career quest</span>}
    </span>
  );
}

/** The big closing wordmark, clamp(48px, 8.5vw, 108px). */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("block font-black lowercase leading-none tracking-[-0.045em] text-primary text-[clamp(48px,8.5vw,108px)]", className)}>career quest</span>;
}
