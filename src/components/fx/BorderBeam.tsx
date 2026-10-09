import { cn } from "@/lib/utils";

/** A light beam circling a rounded element (border-beam). Put it inside a `relative` parent. */
export function BorderBeam({ className, color = "var(--blue)", width = 3 }: { className?: string; color?: string; width?: number }) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] motion-reduce:hidden", className)}
      style={{
        padding: width,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    >
      <span
        className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-beam"
        style={{ background: `conic-gradient(from 0deg, transparent 0 300deg, ${color} 340deg, transparent 360deg)` }}
      />
    </span>
  );
}
