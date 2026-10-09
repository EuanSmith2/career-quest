import { useRef, useState, type ReactNode } from "react";
import { OptionCard, type OptionState } from "@/components/OptionCard";
import { burstFrom } from "@/components/fx/burst";
import type { RoundItem } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";
import { CheckBar, FeedbackSheet, QuestionHeading, QuestionSlide, QuestionTag, QuitDialog, RoundShell } from "./RoundParts";

export interface RoundResult {
  item: RoundItem;
  pick: number | null; // null = skipped
  correct: boolean;
}

/**
 * A lesson-style round with no hearts: Meet the Jobs, the Boss Level and unit test-outs.
 * Pick → CHECK → feedback sheet → CONTINUE, then onFinish with every result.
 */
export function RoundPlayer({
  items,
  context,
  right,
  onAnswer,
  feedbackExtra,
  onFinish,
  onQuit,
}: {
  items: RoundItem[];
  context?: string;
  right?: ReactNode;
  onAnswer?: (r: RoundResult) => void;
  feedbackExtra?: (r: RoundResult) => ReactNode;
  onFinish: (results: RoundResult[]) => void;
  onQuit: () => void;
}) {
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [quit, setQuit] = useState(false);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const item = items[i];
  const current = results[i];

  const pick = (k: number) => {
    if (current || k >= item.options.length) return;
    setSelected(k);
    playSound("select");
  };

  const check = (skip = false) => {
    if (current || (!skip && selected === null)) return;
    const p = skip ? null : selected;
    const r: RoundResult = { item, pick: p, correct: p === item.correctIndex };
    setResults((rs) => [...rs, r]);
    onAnswer?.(r);
    playSound(r.correct ? "correct" : "wrong");
    if (r.correct && p !== null) burstFrom(cards.current[p]);
  };

  const next = () => {
    if (!current) return;
    if (i + 1 >= items.length) return onFinish(results);
    setI(i + 1);
    setSelected(null);
  };

  useAnswerKeys({ onPick: pick, onEnter: () => (current ? next() : check()) }, !quit);

  const state = (k: number): OptionState => {
    if (!current) return k === selected ? "selected" : "idle";
    if (k === item.correctIndex) return "correct";
    if (k === current.pick) return "wrong";
    return "dimmed";
  };

  return (
    <RoundShell
      progress={(i + (current ? 1 : 0)) / items.length}
      onClose={() => setQuit(true)}
      right={right}
      footer={
        current ? (
          <FeedbackSheet
            key={i}
            correct={current.correct}
            answer={item.options[item.correctIndex]}
            explanation={item.explanation}
            source={item.source}
            extra={feedbackExtra?.(current)}
            questionId={item.reportable ? item.id : undefined}
            onContinue={next}
          />
        ) : (
          <CheckBar canCheck={selected !== null} onCheck={() => check()} onSkip={() => check(true)} />
        )
      }
    >
      <QuestionSlide k={i}>
        <QuestionTag difficulty={item.difficulty} context={context} />
        <QuestionHeading>{item.prompt}</QuestionHeading>
        <div className="flex flex-col gap-3" role="group" aria-label="Answers">
          {item.options.map((text, k) => (
            <OptionCard key={k} index={k} state={state(k)} disabled={!!current} onClick={() => pick(k)}>
              <span ref={(el) => void (cards.current[k] = el?.closest("button") ?? null)}>{text}</span>
            </OptionCard>
          ))}
        </div>
      </QuestionSlide>
      <QuitDialog open={quit} onOpenChange={setQuit} onQuit={onQuit} />
    </RoundShell>
  );
}
