import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  icon?: string;
  tone?: "default" | "achievement";
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
const emit = () => listeners.forEach((l) => l());

/** Show a small toast for ~3s. */
export function toast(t: Omit<ToastItem, "id">) {
  const id = nextId++;
  items = [...items, { ...t, id }];
  emit();
  setTimeout(() => {
    items = items.filter((x) => x.id !== id);
    emit();
  }, 3200);
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
    () => items,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className={cn(
              "flex w-full max-w-sm items-center gap-3 rounded-card border-2 bg-background px-4 py-3 shadow-xl",
              t.tone === "achievement" ? "border-gold" : "border-border",
            )}
            role="status"
          >
            {t.icon && <span className="text-[28px] leading-none">{t.icon}</span>}
            <div className="min-w-0">
              {t.tone === "achievement" && <p className="text-[12px] font-extrabold uppercase tracking-wide text-gold">Achievement unlocked</p>}
              <p className="font-extrabold">{t.title}</p>
              {t.body && <p className="text-caption text-muted-foreground">{t.body}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
