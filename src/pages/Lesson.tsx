import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Flag, Gem, Target, X } from "lucide-react";
import {
  useCareer,
  useCompleteLesson,
  useLessonProgress,
  useProfile,
  useQuestions,
  useRecordAnswer,
  useRefillHeart,
  useSubmitFeedback,
  useWeeklyXp,
} from "@/api/hooks";
import type { FeedbackKind, Question } from "@/api/types";
import { Byte } from "@/components/Byte";
import { ChunkyButton } from "@/components/ChunkyButton";
import { OptionCard, type OptionState } from "@/components/OptionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SourceChip } from "@/components/SourceChip";
import { StatTile } from "@/components/StatTile";
import { HeartsChip } from "@/components/StatusChips";
import { ErrorState, LoadingState } from "@/components/States";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CAREERS } from "@/data/careers";
import { celebrate } from "@/lib/confetti";
import { formatDuration, isLessonKey, lessonAccuracy, localDateKey, shuffleOptions, sliceLessons } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

type Stage = "play" | "complete" | "streak" | "out-of-hearts";

export default function Lesson() {
  const { career: slug = "", lessonKey = "" } = useParams();
  const [params] = useSearchParams();
  const practice = params.get("practice") === "1";
  const questions = useQuestions(slug);
  const profile = useProfile();

  if (!CAREERS.some((c) => c.slug === slug) || !isLessonKey(lessonKey)) return <Navigate to="/learn" replace />;
  if (lessonKey === "boss") return <Navigate to={`/boss/${slug}`} replace />;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
      {questions.isLoading || profile.isLoading ? (
        <div className="mx-auto w-full max-w-app px-4">
          <LoadingState label="Getting your lesson ready…" rows={4} />
        </div>
      ) : questions.isError || !questions.data || !profile.data ? (
        <ErrorState onRetry={() => questions.refetch()} />
      ) : (
        <LessonPlayer
          key={`${slug}/${lessonKey}/${practice}`}
          slug={slug}
          lessonKey={lessonKey}
          practice={practice}
          questions={sliceLessons(questions.data)[lessonKey]}
          startHearts={profile.data.hearts}
        />
      )}
    </div>
  );
}

function LessonPlayer({
  slug,
  lessonKey,
  practice,
  questions,
  startHearts,
}: {
  slug: string;
  lessonKey: string;
  practice: boolean;
  questions: Question[];
  startHearts: number;
}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { data: career } = useCareer(slug);
  const { data: profile } = useProfile();
  const record = useRecordAnswer();
  const complete = useCompleteLesson();
  const refill = useRefillHeart();

  const [queue, setQueue] = useState<Question[]>(questions);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [hearts, setHearts] = useState(startHearts);
  const [heartPulse, setHeartPulse] = useState(0);
  const [stage, setStage] = useState<Stage>(!practice && startHearts <= 0 ? "out-of-hearts" : "play");
  const [quitOpen, setQuitOpen] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [summary, setSummary] = useState<{ xp: number; accuracy: number; ms: number; perfect: boolean } | null>(null);
  const missed = useRef(new Set<string>()); // answered wrong at least once (no first-try XP, re-queued once)
  const startedAt = useRef(Date.now());

  const q = queue[index];
  // Shuffle every time a question is shown (a re-queued question gets a fresh order).
  const shown = useMemo(() => (q ? shuffleOptions(q) : null), [q, index]); // eslint-disable-line react-hooks/exhaustive-deps
  const correct = checked && selected === shown?.correctIndex;

  // keep hearts in sync with what the API returns
  useEffect(() => {
    if (profile && !practice) setHearts(profile.hearts);
  }, [profile, practice]);

  const check = () => {
    if (selected === null || checked || !q || !shown) return;
    const ok = selected === shown.correctIndex;
    setChecked(true);
    const firstTry = !missed.current.has(q.id);
    const xp = ok && firstTry && !practice ? q.xp : 0;
    if (ok) {
      playSound("correct");
      setXpEarned((x) => x + xp);
    } else {
      playSound("wrong");
      if (firstTry) setQueue((qs) => [...qs, q]); // re-queue once
      missed.current.add(q.id);
      if (!practice) {
        setHearts((h) => Math.max(0, h - 1));
        setHeartPulse((p) => p + 1);
        setTimeout(() => playSound("heart-lost"), 350);
      }
    }
    record.mutate({ question_id: q.id, correct: ok, xp_earned: xp, mode: practice ? "practice" : "lesson" });
  };

  const finish = () => {
    const ms = Date.now() - startedAt.current;
    const accuracy = lessonAccuracy(questions.length - missed.current.size, questions.length);
    const perfect = missed.current.size === 0;
    if (practice) {
      refill.mutate();
      setSummary({ xp: 0, accuracy, ms, perfect });
      setStage("complete");
      return;
    }
    complete.mutate(
      { career_slug: slug, lesson_key: lessonKey, accuracy, perfect },
      {
        onSuccess: (r) => {
          setSummary({ xp: xpEarned + r.xp_bonus, accuracy, ms, perfect });
          setStage("complete");
        },
      },
    );
  };

  const next = () => {
    if (!checked) return;
    if (!correct && !practice && hearts <= 0) {
      setStage("out-of-hearts");
      return;
    }
    if (index + 1 >= queue.length) return finish();
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  };

  useAnswerKeys(
    {
      onPick: (k) => {
        if (!checked) {
          setSelected(k);
          playSound("select");
        }
      },
      onEnter: () => (checked ? next() : check()),
    },
    stage === "play" && !quitOpen,
  );

  if (stage === "out-of-hearts") return <OutOfHearts slug={slug} />;
  if (stage === "complete" && summary) return <LessonComplete summary={summary} practice={practice} onContinue={() => (practice ? navigate(`/learn/${slug}`) : setStage("streak"))} />;
  if (stage === "streak") return <StreakScreen onContinue={() => navigate(`/learn/${slug}`)} />;
  if (!q || !shown) return <LoadingState />;

  const optionState = (k: number): OptionState => {
    if (!checked) return k === selected ? "selected" : "idle";
    if (k === shown.correctIndex) return "correct";
    if (k === selected) return "wrong";
    return "dimmed";
  };

  return (
    <>
      {/* top bar */}
      <header className="mx-auto flex w-full max-w-app items-center gap-4 px-4 pb-2 pt-4">
        <button type="button" onClick={() => setQuitOpen(true)} className="text-disabled-fg hover:text-muted-foreground" aria-label="Quit lesson">
          <X className="h-7 w-7" strokeWidth={3} />
        </button>
        <ProgressBar value={(index + (checked ? 1 : 0)) / queue.length} label="Lesson progress" />
        {practice ? (
          <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[12px] font-extrabold uppercase text-foreground">Practice</span>
        ) : (
          <HeartsChip hearts={hearts} heartsUpdatedAt={profile?.hearts_updated_at} pulse={heartPulse} className="text-body" />
        )}
      </header>

      {/* question */}
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-4 pb-48 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[12px] font-extrabold uppercase tracking-wide",
                  q.difficulty === "easy" ? "bg-green-soft text-green-lip" : q.difficulty === "medium" ? "bg-blue-soft text-blue-text" : "bg-red-soft text-red-lip",
                )}
              >
                {q.difficulty}
              </span>
              <span className="text-[12px] font-extrabold uppercase tracking-wide text-muted-foreground">Cyber · {career?.name ?? q.career}</span>
              {missed.current.has(q.id) && !checked && <span className="text-[12px] font-extrabold uppercase tracking-wide text-flame">Previous mistake</span>}
            </div>
            <h1 className="mb-6 text-[22px] font-extrabold leading-snug sm:text-section">{q.question}</h1>
            <div className="flex flex-col gap-3" role="group" aria-label="Answers">
              {shown.options.map((o, k) => (
                <OptionCard
                  key={o.letter}
                  index={k}
                  state={optionState(k)}
                  disabled={checked}
                  onClick={() => {
                    setSelected(k);
                    playSound("select");
                  }}
                >
                  {o.text}
                </OptionCard>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* bottom bar / feedback sheet */}
      <div className="fixed inset-x-0 bottom-0 z-10">
        <AnimatePresence mode="wait" initial={false}>
          {!checked ? (
            <motion.div key="check" className="border-t-2 border-border bg-background" exit={{ opacity: 0 }}>
              <div className="mx-auto flex max-w-app justify-end px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                <ChunkyButton className="w-full sm:w-auto sm:min-w-[160px]" disabled={selected === null} onClick={check}>
                  Check
                </ChunkyButton>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="feedback"
              initial={reduce ? { opacity: 0 } : { y: "100%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn(correct ? "bg-green-soft" : "bg-red-soft")}
              role="status"
            >
              <div className="mx-auto flex max-w-app flex-col gap-3 px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                <div className="flex items-start gap-3">
                  <motion.div initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
                    <Byte mood={correct ? "correct" : "wrong"} size={72} />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    {correct ? (
                      <p className="text-section text-green-lip">✓ Nicely done!</p>
                    ) : (
                      <>
                        <p className="text-section text-red-lip">Correct answer:</p>
                        <p className="font-extrabold text-red-lip">{shown.options[shown.correctIndex].text}</p>
                      </>
                    )}
                  </div>
                  <ReportButton questionId={q.id} />
                </div>
                <p className={cn("text-body", correct ? "text-green-lip" : "text-red-lip")}>{q.explanation}</p>
                <SourceChip source={q.source} className="self-start" />
                <ChunkyButton variant={correct ? "primary" : "danger"} block onClick={next} autoFocus>
                  {correct ? "Continue" : "Got it"}
                </ChunkyButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={quitOpen} onOpenChange={setQuitOpen}>
        <DialogContent hideClose className="flex flex-col items-center gap-4 text-center">
          <Byte mood="sad" size={120} />
          <DialogTitle>Quit?</DialogTitle>
          <DialogDescription>You'll lose this lesson's progress.</DialogDescription>
          <ChunkyButton block variant="secondary" onClick={() => setQuitOpen(false)}>
            Keep learning
          </ChunkyButton>
          <ChunkyButton block variant="ghost" className="text-red-lip hover:bg-red-soft" onClick={() => navigate(`/learn/${slug}`)}>
            End session
          </ChunkyButton>
        </DialogContent>
      </Dialog>
    </>
  );
}

const REPORTS: { kind: FeedbackKind; label: string }[] = [
  { kind: "too_easy", label: "Too easy" },
  { kind: "too_difficult", label: "Too difficult" },
  { kind: "report_wrong_answer", label: "The answer is wrong" },
  { kind: "report_bad_source", label: "The source is wrong" },
  { kind: "report_typo", label: "There's a typo" },
  { kind: "report_other", label: "Something else" },
];

/** Crowd-verification: flag a question. */
function ReportButton({ questionId }: { questionId: string }) {
  const submit = useSubmitFeedback();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-background" aria-label="Report this question">
        <Flag className="h-5 w-5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 border-2 border-border bg-background p-2 text-foreground">
        {submit.isSuccess ? (
          <p className="p-2 text-caption font-bold text-green-lip">Thanks! We'll check it against its source.</p>
        ) : (
          <ul>
            {REPORTS.map((r) => (
              <li key={r.kind}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-caption font-bold hover:bg-muted"
                  onClick={() => submit.mutate({ question_id: questionId, kind: r.kind })}
                  disabled={submit.isPending}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function LessonComplete({
  summary,
  practice,
  onContinue,
}: {
  summary: { xp: number; accuracy: number; ms: number; perfect: boolean };
  practice: boolean;
  onContinue: () => void;
}) {
  useEffect(() => {
    playSound("lesson-complete");
    celebrate(summary.perfect);
  }, [summary.perfect]);
  useAnswerKeys({ onEnter: onContinue });

  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <Byte mood={summary.perfect ? "smug" : "level-up"} size={160} />
      <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-title-sm text-gold-lip sm:text-title">
        {practice ? "Practice complete!" : summary.perfect ? "Perfect lesson!" : "Lesson complete!"}
      </motion.h1>
      {practice && <p className="font-bold text-red">+1 ❤️ heart refilled</p>}
      <div className="flex w-full gap-3">
        <StatTile tone="gold" label="Total XP" value={summary.xp} icon={<Gem className="h-5 w-5" />} />
        <StatTile tone="green" label="Accuracy" value={`${summary.accuracy}%`} icon={<Target className="h-5 w-5" />} />
        <StatTile tone="blue" label="Time" value={formatDuration(summary.ms)} icon={<Clock className="h-5 w-5" />} />
      </div>
      <ChunkyButton block className="mt-4" onClick={onContinue} autoFocus>
        Continue
      </ChunkyButton>
    </div>
  );
}

function StreakScreen({ onContinue }: { onContinue: () => void }) {
  const { data: profile } = useProfile();
  const { data: week } = useWeeklyXp();
  const today = localDateKey();
  useEffect(() => {
    playSound("streak");
  }, []);
  useAnswerKeys({ onEnter: onContinue });

  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <motion.div
        initial={{ scale: 0.3, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className="text-[120px] leading-none"
        aria-hidden
      >
        <motion.span className="inline-block" animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          🔥
        </motion.span>
      </motion.div>
      <h1 className="text-title-sm text-flame sm:text-title">
        🔥 {profile?.streak ?? 1} day streak
      </h1>
      <div className="flex w-full justify-center gap-2 rounded-card border-2 border-border p-4" aria-label="This week">
        {(week ?? []).map((d) => {
          const lit = d.xp > 0;
          const isToday = d.date === today;
          const [y, m, day] = d.date.split("-").map(Number);
          const letter = new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: "narrow" });
          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <span className={cn("text-caption font-extrabold", isToday ? "text-flame" : "text-muted-foreground")}>{letter}</span>
              <motion.span
                initial={isToday ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                className={cn("grid h-9 w-9 place-items-center rounded-full", lit ? "bg-flame text-white" : "bg-border", isToday && "ring-4 ring-gold")}
              >
                {lit && "✓"}
              </motion.span>
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground">Come back tomorrow to keep it burning.</p>
      <ChunkyButton block onClick={onContinue} autoFocus>
        Continue
      </ChunkyButton>
    </div>
  );
}

function OutOfHearts({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: progress } = useLessonProgress(slug);
  // Replay the most recently finished lesson as practice.
  const finished = [...(progress ?? [])].filter((p) => p.lesson_key !== "boss").sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      <Byte mood="out-of-hearts" size={160} />
      <h1 className="text-title-sm sm:text-title">Out of hearts</h1>
      <p className="text-muted-foreground">Practise a lesson you've finished to earn a heart back, or wait for them to refill (1 every 30 minutes).</p>
      <HeartsChip hearts={profile?.hearts ?? 0} heartsUpdatedAt={profile?.hearts_updated_at} className="text-section" />
      <ChunkyButton block disabled={!finished} onClick={() => finished && navigate(`/lesson/${slug}/${finished.lesson_key}?practice=1`)}>
        Practice to refill
      </ChunkyButton>
      {!finished && <p className="text-caption text-muted-foreground">Finish a lesson first to unlock practice.</p>}
      <ChunkyButton block variant="ghost" onClick={() => navigate(`/learn/${slug}`)}>
        No thanks
      </ChunkyButton>
    </div>
  );
}
