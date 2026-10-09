import { useEffect, useRef } from "react";

/** Keys 1–4 pick an answer; Enter checks or continues. Ignored while typing in a field. */
export function useAnswerKeys(handlers: { onPick?: (index: number) => void; onEnter?: () => void }, active = true) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["1", "2", "3", "4"].includes(e.key) && ref.current.onPick) {
        e.preventDefault();
        ref.current.onPick(Number(e.key) - 1);
      } else if (e.key === "Enter" && ref.current.onEnter) {
        e.preventDefault();
        ref.current.onEnter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
