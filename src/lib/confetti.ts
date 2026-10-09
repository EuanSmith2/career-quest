import confetti from "canvas-confetti";

/** Brand-coloured confetti; skipped entirely for prefers-reduced-motion. Reads colours from the CSS tokens. */
export function celebrate(big = false) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const css = getComputedStyle(document.documentElement);
  const colors = ["--green", "--blue", "--gold", "--red", "--flame"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  const base = { colors, disableForReducedMotion: true, zIndex: 100 };
  confetti({ ...base, particleCount: big ? 160 : 90, spread: big ? 100 : 75, origin: { y: 0.6 } });
  if (big) {
    setTimeout(() => confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 250);
    setTimeout(() => confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 250);
  }
}
