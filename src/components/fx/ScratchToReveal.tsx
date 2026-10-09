import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Scratch-to-reveal: a canvas cover the player rubs away. Reveals fully once ~45% is cleared,
 * or on tap of "Reveal". Reduced motion: shows the content straight away.
 */
export function ScratchToReveal({ children, onReveal, className, label = "Scratch to reveal" }: { children: ReactNode; onReveal?: () => void; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(reduce);
  const drawing = useRef(false);

  useEffect(() => {
    if (reduce) onReveal?.(); // reduced motion: no scratching, content shows at once
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    onReveal?.();
  };

  useEffect(() => {
    if (revealed) return;
    const c = canvas.current;
    const b = box.current;
    if (!c || !b) return;
    const r = b.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, css.getPropertyValue("--blue").trim());
    g.addColorStop(1, css.getPropertyValue("--purple").trim());
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.fillStyle = css.getPropertyValue("--primary-fg").trim();
    ctx.font = "900 20px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("? ? ?", r.width / 2, r.height / 2 - 6);
    ctx.font = "800 14px Nunito, sans-serif";
    ctx.fillText(label.toUpperCase(), r.width / 2, r.height / 2 + 18);
  }, [revealed, label]);

  const scratch = (e: React.PointerEvent) => {
    if (!drawing.current || revealed) return;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = c.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - r.left, e.clientY - r.top, 28, 0, Math.PI * 2);
    ctx.fill();
    // sample coverage occasionally
    if (Math.random() < 0.15) {
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++;
      if (clear / (data.length / 64) > 0.45) reveal();
    }
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      {children}
      {!revealed && (
        <>
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full cursor-grab touch-none rounded-card"
            onPointerDown={(e) => {
              drawing.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              scratch(e);
            }}
            onPointerMove={scratch}
            onPointerUp={() => (drawing.current = false)}
            aria-hidden
          />
          <button type="button" onClick={reveal} className="absolute -bottom-3 right-3 rounded-full border-2 border-border bg-background px-3 py-1 text-[12px] font-extrabold uppercase text-link">
            Reveal
          </button>
        </>
      )}
    </div>
  );
}
