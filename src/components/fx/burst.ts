/**
 * Tiny particle burst from an element (cool-mode / burst). Plain DOM so it can fire from any handler.
 * Colours come from CSS tokens; nothing runs under prefers-reduced-motion.
 */
export function burstFrom(el: Element | null, opts: { colors?: string[]; count?: number } = {}) {
  if (!el || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const css = getComputedStyle(document.documentElement);
  const colors = (opts.colors ?? ["--correct", "--gold", "--blue"]).map((c) => (c.startsWith("--") ? css.getPropertyValue(c).trim() : c));
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < (opts.count ?? 14); i++) {
    const p = document.createElement("span");
    const size = 6 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    Object.assign(p.style, {
      position: "fixed",
      left: `${cx}px`,
      top: `${cy}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: Math.random() < 0.5 ? "50%" : "2px",
      background: colors[i % colors.length],
      pointerEvents: "none",
      zIndex: "100",
    });
    document.body.appendChild(p);
    p.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.3)`, opacity: 0 },
      ],
      { duration: 600 + Math.random() * 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    ).onfinish = () => p.remove();
  }
}
