import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Target, Zap } from "lucide-react";
import {
  useCareer,
  useCompleteLesson,
  useLessonProgress,
  useProfile,
  useQuestions,
  useRecordAnswer,
  useRefillHeart,
  useWeeklyXp,
} from "@/api/hooks";
import type { Question } from "@/api/types";
import { ChunkyButton } from "@/components/ChunkyButton";
import { burstFrom } from "@/components/fx/burst";
import { OptionCard, type OptionState } from "@/components/OptionCard";
import { MatchPairs } from "@/components/round/MatchPairs";
import { RoundEnd } from "@/components/round/RoundEnd";
import { CheckBar, FeedbackSheet, QuestionHeading, QuestionSlide, QuestionTag, QuitDialog, RoundShell } from "@/components/round/RoundParts";
import { StatTile } from "@/components/StatTile";
import { HeartsChip, WeekDots } from "@/components/StatusChips";
import { ErrorState, LoadingState } from "@/components/States";
import { CAREERS } from "@/data/careers";
import { celebrate } from "@/lib/confetti";
import { formatDuration, isLessonKey, lessonAccuracy, pickTestOut, REVIEW_SIZE, shuffleOptions, sliceLessons } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";

type Stage = "play" | "complete" | "streak" | "out-of-hearts";
type Step = { kind: "question"; q: Question } | { kind: "pairs" };

/** Where the "Match the job" exercise goes: after the 2nd question, once per lesson. */
const PAIRS_AT = 2;

export default function Lesson() {
  const { career: slug = "", lessonKey = "" } = useParams();
  const [params] = useSearchParams();
  const practice = params.get("practice") === "1";
  const questions = useQuestions(slug);
  const profile = useProfile();

  if (!CAREERS.some((c) => c.slug === slug) || !isLessonKey(lessonKey)) return <Navigate to="/learn" replace />;
  if (lessonKey === "boss") return <Navigate to={`/boss/${slug}`} replace />;

  if (questions.isLoading || profile.isLoading)
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <LoadingState label="Getting your lesson ready…" rows={4} className="mx-auto max-w-app px-4" />
      </div>
    );
  if (questions.isError || !questions.data || !profile.data)
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <ErrorState onRetry={() => questions.refetch()} />
      </div>
    );

  return (
    <LessonPlayer
      key={`${slug}/${lessonKey}/${practice}`}
      slug={slug}
      lessonKey={lessonKey}
      practice={practice}
      questions={sliceLessons(questions.data)[lessonKey]}
      startHearts={profile.data.hearts}
    />
  );
}

function LessonPlayer({ slug, lessonKey, practice, questions: pool, startHearts }: { slug: string; lessonKey: string; practice: boolean; questions: Question[]; startHearts: number }) {
  // a unit review (trophy node) samples REVIEW_SIZE questions from the whole unit
  const [questions] = useState(() => (lessonKey.startsWith("review") ? pickTestOut(pool, REVIEW_SIZE) : pool));
  const navigate = useNavigate();
  const { data: career } = useCareer(slug);
  const { data: profile } = useProfile();
  const record = useRecordAnswer();
  const complete = useCompleteLesson();
  const refill = useRefillHeart();

  const [steps, setSteps] = useState<Step[]>(() => {
    const s: Step[] = questions.map((q) => ({ kind: "question", q }));
    if (!lessonKey.startsWith("review")) s.splice(Math.min(PAIRS_AT, s.length), 0, { kind: "pairs" });
    return s;
  });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | { correct: boolean }>(null);
  const [pairsDone, setPairsDone] = useState(false);
  const [hearts, setHearts] = useState(startHearts);
  const [heartPulse, setHeartPulse] = useState(0);
  const [stage, setStage] = useState<Stage>(!practice && startHearts <= 0 ? "out-of-hearts" : "play");
  const [quitOpen, setQuitOpen] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [summary, setSummary] = useState<{ xp: number; accuracy: number; ms: number; perfect: boolean } | null>(null);
  const missed = useRef(new Set<string>()); // answered wrong at least once: no first-try XP, re-queued once
  const pairMistakes = useRef(0);
  const startedAt = useRef(Date.now());
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  const step = steps[index];
  const q = step?.kind === "question" ? step.q : null;
  // Shuffle every time a question is shown (a re-queued question gets a fresh order).
  const shown = useMemo(() => (q ? shuffleOptions(q) : null), [q, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep hearts in sync with what the API returns
  useEffect(() => {
    if (profile && !practice) setHearts(profile.hearts);
  }, [profile, practice]);

  const loseHeart = () => {
    if (practice) return;
    setHearts((h) => Math.max(0, h - 1));
    setHeartPulse((p) => p + 1);
    setTimeout(() => playSound("heart-lost"), 350);
  };

  const check = (skip = false) => {
    if (checked || !q || !shown || (!skip && selected === null)) return;
    const ok = !skip && selected === shown.correctIndex;
    setChecked({ correct: ok });
    const firstTry = !missed.current.has(q.id);
    const xp = ok && firstTry && !practice ? q.xp : 0;
    if (ok) {
      playSound("correct");
      setXpEarned((x) => x + xp);
      if (selected !== null) burstFrom(cards.current[selected]);
    } else {
      playSound("wrong");
      if (firstTry) setSteps((s) => [...s, { kind: "question", q }]); // re-queue once
      missed.current.add(q.id);
      loseHeart();
    }
    record.mutate({ question_id: q.id, correct: ok, xp_earned: xp, mode: practice ? "practice" : "lesson" });
  };

  const finish = () => {
    const ms = Date.now() - startedAt.current;
    const accuracy = lessonAccuracy(questions.length - missed.current.size, questions.length);
    const perfect = missed.current.size === 0 && pairMistakes.current === 0;
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
    const advanced = step?.kind === "pairs" ? pairsDone : !!checked;
    if (!advanced) return;
    if (!practice && hearts <= 0) return setStage("out-of-hearts");
    if (index + 1 >= steps.length) return finish();
    setIndex(index + 1);
    setSelected(null);
    setChecked(null);
  };

  useAnswerKeys(
    {
      onPick: (k) => {
        if (!checked && q) {
          setSelected(k);
          playSound("select");
        }
      },
      onEnter: () => (step?.kind === "pairs" ? next() : checked ? next() : check()),
    },
    stage === "play" && !quitOpen,
  );

  if (stage === "out-of-hearts") return <OutOfHearts slug={slug} />;
  if (stage === "complete" && summary)
    return <LessonComplete summary={summary} practice={practice} review={lessonKey.startsWith("review")} onContinue={() => (practice ? navigate(`/learn/${slug}`) : setStage("streak"))} />;
  if (stage === "streak") return <StreakScreen onContinue={() => navigate(`/learn/${slug}`)} />;
  if (!step) return null;

  const optionState = (k: number): OptionState => {
    if (!checked) return k === selected ? "selected" : "idle";
    if (k === shown?.correctIndex) return "correct";
    if (k === selected) return "wrong";
    return "dimmed";
  };

  const done = index + (checked || (step.kind === "pairs" && pairsDone) ? 1 : 0);

  return (
    <RoundShell
      progress={done / steps.length}
      onClose={() => setQuitOpen(true)}
      right={
        practice ? (
          <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[12px] font-extrabold uppercase text-ink-bright">Practice</span>
        ) : (
          <HeartsChip hearts={hearts} heartsUpdatedAt={profile?.hearts_updated_at} pulse={heartPulse} />
        )
      }
      footer={
        step.kind === "pairs" ? (
          <CheckBar canCheck={pairsDone} onCheck={next} label="Continue" />
        ) : checked && q && shown ? (
          <FeedbackSheet
            key={index}
            correct={checked.correct}
            answer={shown.options[shown.correctIndex].text}
            explanation={q.explanation}
            source={q.source}
            questionId={q.id}
            onContinue={next}
          />
        ) : (
          <CheckBar canCheck={selected !== null} onCheck={() => check()} onSkip={() => check(true)} />
        )
      }
    >
      <QuestionSlide k={index}>
        {step.kind === "pairs" ? (
          <>
            <QuestionTag context={`Cyber · ${career?.name ?? ""}`} />
            <MatchPairs
              careerSlug={slug}
              onMistake={() => {
                pairMistakes.current++;
                loseHeart();
                record.mutate({ question_id: "pairs", correct: false, xp_earned: 0, mode: practice ? "practice" : "lesson" });
              }}
              onDone={() => setPairsDone(true)}
            />
          </>
        ) : (
          q &&
          shown && (
            <>
              <QuestionTag
                difficulty={q.difficulty}
                context={`Cyber · ${career?.name ?? q.career}`}
                extra={missed.current.has(q.id) && !checked ? <span className="text-[12px] font-extrabold uppercase tracking-wide text-flame">Previous mistake</span> : null}
              />
              <QuestionHeading>{q.question}</QuestionHeading>
              <div className="flex flex-col gap-3" role="group" aria-label="Answers">
                {shown.options.map((o, k) => (
                  <OptionCard
                    key={o.letter}
                    index={k}
                    state={optionState(k)}
                    disabled={!!checked}
                    onClick={() => {
                      setSelected(k);
                      playSound("select");
                    }}
                  >
                    <span ref={(el) => void (cards.current[k] = el?.closest("button") ?? null)}>{o.text}</span>
                  </OptionCard>
                ))}
              </div>
            </>
          )
        )}
      </QuestionSlide>
      <QuitDialog open={quitOpen} onOpenChange={setQuitOpen} onQuit={() => navigate(`/learn/${slug}`)} />
    </RoundShell>
  );
}

function LessonComplete({ summary, practice, review, onContinue }: { summary: { xp: number; accuracy: number; ms: number; perfect: boolean }; practice: boolean; review: boolean; onContinue: () => void }) {
  useEffect(() => {
    playSound("lesson-complete");
    celebrate(summary.perfect);
  }, [summary.perfect]);
  return (
    <RoundEnd
      mood={summary.perfect ? "smug" : "level-up"}
      title={practice ? "Practice complete!" : review ? "Unit review complete!" : summary.perfect ? "Perfect lesson!" : "Lesson complete!"}
      subtitle={practice ? <span className="font-bold text-red">+1 ❤️ heart refilled</span> : undefined}
      stats={
        <>
          <StatTile tone="gold" label="Total XP" value={summary.xp} icon={<Zap className="h-5 w-5" />} />
          <StatTile tone="green" label="Accuracy" value={`${summary.accuracy}%`} icon={<Target className="h-5 w-5" />} />
          <StatTile tone="blue" label="Time" value={formatDuration(summary.ms)} icon={<Clock className="h-5 w-5" />} />
        </>
      }
      onEnter={onContinue}
      actions={
        <ChunkyButton block onClick={onContinue} autoFocus>
          Continue
        </ChunkyButton>
      }
    />
  );
}

function StreakScreen({ onContinue }: { onContinue: () => void }) {
  const { data: profile } = useProfile();
  const { data: week } = useWeeklyXp();
  useEffect(() => {
    playSound("streak");
  }, []);
  return (
    <RoundEnd
      mood="idle"
      title={`🔥 ${profile?.streak ?? 1} day streak`}
      titleClass="text-flame"
      subtitle="Come back tomorrow to keep it burning."
      onEnter={onContinue}
      actions={
        <ChunkyButton block onClick={onContinue} autoFocus>
          Continue
        </ChunkyButton>
      }
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className="-order-1 text-[96px] leading-none"
        aria-hidden
      >
        🔥
      </motion.div>
      {week && <WeekDots week={week} className="w-full rounded-card border-2 border-border p-4" />}
    </RoundEnd>
  );
}

function OutOfHearts({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: progress } = useLessonProgress(slug);
  // Replay the most recently finished lesson as practice.
  const finished = [...(progress ?? [])].filter((p) => p.lesson_key !== "boss").sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  return (
    <RoundEnd
      mood="out-of-hearts"
      title="Out of hearts"
      titleClass="text-foreground"
      subtitle="Practise a lesson you've finished to earn a heart back, or wait for them to refill (1 every 30 minutes)."
      actions={
        <>
          <ChunkyButton block disabled={!finished} onClick={() => finished && navigate(`/lesson/${slug}/${finished.lesson_key}?practice=1`)}>
            Practice to refill
          </ChunkyButton>
          {!finished && <p className="text-caption text-muted-foreground">Finish a lesson first to unlock practice.</p>}
          <ChunkyButton block variant="ghost" onClick={() => navigate(`/learn/${slug}`)}>
            No thanks
          </ChunkyButton>
        </>
      }
    >
      <HeartsChip hearts={profile?.hearts ?? 0} heartsUpdatedAt={profile?.hearts_updated_at} />
    </RoundEnd>
  );
}
