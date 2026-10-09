/**
 * Midnight / Light theme. Midnight is the default for everyone on first load (not tied to the OS).
 * Stored client-side under `cq.theme`; index.html applies it before first paint to avoid a flash.
 */
import { useSyncExternalStore } from "react";

export type Theme = "midnight" | "light";
const KEY = "cq.theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "midnight";
  } catch {
    return "midnight";
  }
}

let current: Theme = typeof document !== "undefined" ? ((document.documentElement.dataset.theme as Theme) ?? read()) : "midnight";

export function setTheme(t: Theme) {
  current = t;
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode: this visit only */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => "midnight" as Theme,
  );
  return [t, setTheme];
}
