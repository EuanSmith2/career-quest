import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, Dumbbell, Feather, Flag, Flame, Sparkles, X } from "lucide-react";
import { useSubmitFeedback } from "@/api/hooks";
import type { Difficulty, FeedbackKind } from "@/api/types";
import { Byte } from "@/components/Byte";
import { ChunkyButton } from "@/components/ChunkyButton";
import { SparklesText } from "@/components/fx/SparklesText";
import { ProgressBar } from "@/components/ProgressBar";
import { SourceChip } from "@/components/SourceChip";
import { toast } from "@/components/Toast";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

/** Full-screen lesson frame: ✕ · progress bar with knob · right slot. App chrome is hidden. */
export function RoundShell({
  progress,
  onClose,
  right,
  children,
  footer,
}: {
  progress: number;
  onClose: () => void;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
      <header className="mx-auto flex w-full max-w-app items-center gap-4 px-4 pb-2 pt-4">
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Quit">
          <X className="h-7 w-7" strokeWidth={3} />
        </button>
        <ProgressBar value={progress} label="Progress" knob />
        {right}
      </header>
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-4 pb-56 pt-6">{children}</main>
      {footer && <div className="fixed inset-x-0 bottom-0 z-10">{footer}</div>}
    </div>
  );
}

const TAGS: Record<Difficulty, { label: string; icon: typeof Sparkles; className: string }> = {
  easy: { label: "New concept", icon: Sparkles, className: "text-purple" },
  medium: { label: "On the job", icon: Briefcase, className: "text-blue" },
  hard: { label: "Hard", icon: Flame, className: "text-wrong-text" },
};

/** Coloured tag with an icon above the question, plus an optional context line. */
export function QuestionTag({ difficulty, context, extra }: { difficulty?: Difficulty; context?: string; extra?: ReactNode }) {
  const t = difficulty ? TAGS[difficulty] : null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      {t && (
        <span className={cn("inline-flex items-center gap-1.5 text-[14px] font-extrabold uppercase tracking-wide", t.className)}>
          <t.icon className="h-5 w-5" strokeWidth={2.6} />
          {t.label}
        </span>
      )}
      {context && <span className="text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground">{context}</span>}
      {extra}
    </div>
  );
}

/** The question heading: 32px/40px, 700 (a little smaller on narrow phones so options stay in reach). */
export function QuestionHeading({ children }: { children: ReactNode }) {
  return <h1 className="mb-6 text-[24px] font-bold leading-[32px] sm:text-[32px] sm:leading-[40px]">{children}</h1>;
}

/** Bottom bar before checking: SKIP on the left, CHECK (or a custom label) on the right. */
export function CheckBar({
  canCheck,
  onCheck,
  onSkip,
  label = "Check",
}: {
  canCheck: boolean;
  onCheck: () => void;
  onSkip?: () => void;
  label?: string;
}) {
  return (
    <div className="border-t-2 border-border bg-background">
      <div className="mx-auto flex max-w-app items-center justify-between gap-3 px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {onSkip ? (
          <ChunkyButton variant="outline" className="min-w-[96px] text-muted-foreground" onClick={onSkip}>
            Skip
          </ChunkyButton>
        ) : (
          <span />
        )}
        <ChunkyButton className="min-w-[140px] flex-1 sm:flex-none" disabled={!canCheck} onClick={onCheck}>
          {label}
        </ChunkyButton>
      </div>
    </div>
  );
}

const PRAISE = ["Amazing!", "Nice!", "Spot on!", "Nailed it!", "Great job!", "Brilliant!"];

/** The sheet that slides up after CHECK. */
export function FeedbackSheet({
  correct,
  answer,
  explanation,
  source,
  extra,
  questionId,
  onContinue,
}: {
  correct: boolean;
  answer: string;
  explanation?: string;
  source?: string;
  extra?: ReactNode;
  questionId?: string; // set for real bank questions so they can be flagged
  onContinue: () => void;
}) {
  const reduce = useReducedMotion();
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], []);
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { y: "100%" }}
      animate={reduce ? { opacity: 1 } : { y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("border-t-2 bg-background", correct ? "border-correct" : "border-wrong")}
      role="status"
    >
      <div className={cn("pb-[max(16px,env(safe-area-inset-bottom))]", correct ? "bg-correct-soft" : "bg-wrong-soft")}>
        <div className="mx-auto flex max-w-app flex-col gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", correct ? "bg-correct" : "bg-wrong")}>
              {correct ? <Check className="h-6 w-6 text-background" strokeWidth={4} /> : <X className="h-6 w-6 text-background" strokeWidth={4} />}
            </span>
            <div className="min-w-0 flex-1">
              {correct ? (
                <p className="text-section text-correct-text">
                  <SparklesText>{praise}</SparklesText>
                </p>
              ) : (
                <>
                  <p className="text-section text-wrong-text">Correct solution:</p>
                  <p className="font-extrabold text-wrong-text">{answer}</p>
                </>
              )}
            </div>
            <Byte mood={correct ? "correct" : "wrong"} size={72} className="-my-3 shrink-0" />
          </div>
          {extra}
          {explanation && <p className={cn("text-body", correct ? "text-correct-text" : "text-wrong-text")}>{explanation}</p>}
          {source && <SourceChip source={source} className="self-start" />}
          {questionId && <FeedbackLinks questionId={questionId} tone={correct ? "correct" : "wrong"} />}
          <ChunkyButton variant={correct ? "correct" : "danger"} block onClick={onContinue} autoFocus>
            {correct ? "Continue" : "Got it"}
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}

const REPORTS: { kind: FeedbackKind; label: string }[] = [
  { kind: "report_wrong_answer", label: "The answer is wrong" },
  { kind: "report_bad_source", label: "The source doesn't support it" },
  { kind: "report_typo", label: "Typo" },
  { kind: "report_other", label: "Other" },
];

/** TOO EASY · TOO DIFFICULT · REPORT: crowd-verification of questions. */
function FeedbackLinks({ questionId, tone }: { questionId: string; tone: "correct" | "wrong" }) {
  const submit = useSubmitFeedback();
  const [sent, setSent] = useState<FeedbackKind | null>(null);
  const [open, setOpen] = useState(false);
  const send = (kind: FeedbackKind) => {
    setSent(kind);
    setOpen(false);
    submit.mutate({ question_id: questionId, kind });
    toast({ title: "Thanks, we'll check it", body: "Every report is checked against the question's source.", icon: "🛡️" });
  };
  const link = cn(
    "inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wide disabled:opacity-50",
    tone === "correct" ? "text-correct-text" : "text-wrong-text",
  );
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      <button type="button" className={link} disabled={!!sent} onClick={() => send("too_easy")}>
        <Feather className="h-4 w-4" /> Too easy
      </button>
      <button type="button" className={link} disabled={!!sent} onClick={() => send("too_difficult")}>
        <Dumbbell className="h-4 w-4" /> Too difficult
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={link} disabled={!!sent}>
          <Flag className="h-4 w-4" /> Report
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 border-2 border-border bg-background p-2 text-foreground">
          <p className="px-2 pb-1 pt-1 text-caption font-extrabold">What's wrong?</p>
          <ul>
            {REPORTS.map((r) => (
              <li key={r.kind}>
                <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-caption font-bold hover:bg-muted" onClick={() => send(r.kind)}>
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** ✕ during a round: sad Byte, keep learning or end the session. */
export function QuitDialog({ open, onOpenChange, onQuit }: { open: boolean; onOpenChange: (o: boolean) => void; onQuit: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="flex flex-col items-center gap-4 text-center">
        <Byte mood="sad" size={120} />
        <DialogTitle>Wait, don't go!</DialogTitle>
        <DialogDescription>You'll lose your progress if you quit now.</DialogDescription>
        <ChunkyButton block variant="secondary" onClick={() => onOpenChange(false)} autoFocus>
          Keep learning
        </ChunkyButton>
        <button type="button" className="btn-text py-2 text-wrong-text hover:underline" onClick={onQuit}>
          End session
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Animated swap between questions. */
export function QuestionSlide({ k, children }: { k: string | number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={k}
        initial={reduce ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? undefined : { opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
