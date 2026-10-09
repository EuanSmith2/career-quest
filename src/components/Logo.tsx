import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-black text-green", className)}>
      <span className="chunky grid h-9 w-9 place-items-center rounded-[10px] bg-green text-white" style={{ "--lip-color": "var(--green-lip)" } as React.CSSProperties}>
        <ShieldCheck className="h-5 w-5" strokeWidth={2.6} />
      </span>
      {!compact && <span className="text-[24px] leading-none tracking-tight">career quest</span>}
    </span>
  );
}
