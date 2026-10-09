import { useMemo, useRef, useState } from "react";
import { useCareers } from "@/api/hooks";
import { burstFrom } from "@/components/fx/burst";
import { pickPairs, type PairCard } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";
import { cn } from "@/lib/utils";

const LOCKOUT_MS = 400;

/**
 * "Match the job": 5 job titles ↔ 5 one-liners. Tap one on each side. A right pair greys out with a
 * green burst; a wrong pair flashes red and calls onMistake (costs a heart in lessons). 400 ms lockout
 * after each pair so fast taps can't glitch it. Keys 1–5 pick on the left, 6–0 on the right.
 */
export function MatchPairs({ careerSlug, onMistake, onDone }: { careerSlug: string; onMistake: () => void; onDone: () => void }) {
  const { data: careers = [] } = useCareers();
  const { left, right } = useMemo(() => pickPairs(careers, careerSlug), [careers, careerSlug]);
  const [sel, setSel] = useState<{ side: "l" | "r"; slug: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const locked = useRef(false);
  const els = useRef(new Map<string, HTMLButtonElement | null>());

  const tap = (side: "l" | "r", card: PairCard) => {
    if (locked.current || matched.has(card.slug)) return;
    if (!sel || sel.side === side) {
      setSel({ side, slug: card.slug });
      playSound("select");
      return;
    }
    locked.current = true;
    setTimeout(() => (locked.current = false), LOCKOUT_MS);
    if (sel.slug === card.slug) {
      const next = new Set(matched).add(card.slug);
      setMatched(next);
      setSel(null);
      playSound("pair-match");
      burstFrom(els.current.get(`l:${card.slug}`) ?? null, { colors: ["--correct"], count: 8 });
      burstFrom(els.current.get(`r:${card.slug}`) ?? null, { colors: ["--correct"], count: 8 });
      if (next.size === left.length) setTimeout(onDone, 500);
    } else {
      setWrong([`${sel.side}:${sel.slug}`, `${side}:${card.slug}`]);
      setSel(null);
      playSound("wrong");
      onMistake();
      setTimeout(() => setWrong([]), LOCKOUT_MS);
    }
  };

  useAnswerKeys({
    maxKeys: 10,
    onPick: (k) => (k < 5 ? left[k] && tap("l", left[k]) : right[k - 5] && tap("r", right[k - 5])),
  });

  const cell = (side: "l" | "r", c: PairCard) => {
    const key = `${side}:${c.slug}`;
    const isMatched = matched.has(c.slug);
    const isSel = sel?.side === side && sel.slug === c.slug;
    const isWrong = wrong.includes(key);
    return (
      <button
        key={key}
        ref={(el) => void els.current.set(key, el)}
        type="button"
        disabled={isMatched}
        onClick={() => tap(side, c)}
        className={cn(
          "chunky relative flex min-h-[64px] w-full items-center rounded-card border-2 px-3 py-2 text-left font-bold leading-snug",
          side === "l" ? "text-body" : "text-caption",
          isMatched
            ? "border-border bg-muted text-disabled-fg"
            : isWrong
              ? "animate-shake border-wrong bg-wrong-soft text-wrong-text"
              : isSel
                ? "border-blue-border bg-blue-soft text-selected-fg"
                : "border-border bg-background text-foreground",
        )}
        style={{ "--lip-color": isSel ? "var(--blue-lip)" : "var(--border-deep)" } as React.CSSProperties}
        aria-pressed={isSel}
      >
        <span className="break-words">{c.text}</span>
      </button>
    );
  };

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold leading-[32px] sm:text-[32px] sm:leading-[40px]">Match the job</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">{left.map((c) => cell("l", c))}</div>
        <div className="flex flex-col gap-3">{right.map((c) => cell("r", c))}</div>
      </div>
    </div>
  );
}
