import { useEffect, useRef } from "react";

/**
 * Number keys pick an answer (1–4 by default; up to 1–9 then 0 for ten items); Enter checks or continues.
 * Ignored while typing in a field.
 */
export function useAnswerKeys(
  handlers: { onPick?: (index: number) => void; onEnter?: () => void; maxKeys?: number },
  active = true,
) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const max = ref.current.maxKeys ?? 4;
      const digit = "1234567890".indexOf(e.key);
      if (digit >= 0 && digit < max && ref.current.onPick) {
        e.preventDefault();
        ref.current.onPick(digit);
      } else if (e.key === "Enter" && ref.current.onEnter) {
        // inside a dialog or popover, Enter belongs to the focused control
        if (t?.closest('[role="dialog"], [data-radix-popper-content-wrapper]')) return;
        e.preventDefault(); // otherwise Enter always means check / continue, even with an option card focused
        ref.current.onEnter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
