import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useCompleteLesson, useIssueCertificate, useMyCertificates, useQuestions, useRecordAnswer } from "@/api/hooks";
import { ArenaFrame, ArenaRound, type ArenaResult } from "@/components/arena/ArenaRound";
import { Podium } from "@/components/arena/Podium";
import { Byte } from "@/components/Byte";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ErrorState, LoadingState } from "@/components/States";
import { CAREERS } from "@/data/careers";
import { celebrate } from "@/lib/confetti";
import { BOSS_PASS_MARK, bossPassed, questionToArena, sliceLessons } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";

const TIME = 20;

/** Boss Level: the 8 hard questions in the arena. 6/8 passes and unlocks the certificate. */
export default function Boss() {
  const { career: slug = "" } = useParams();
  const navigate = useNavigate();
  const questions = useQuestions(slug);
  const certs = useMyCertificates();
  const record = useRecordAnswer();
  const [results, setResults] = useState<ArenaResult[] | null>(null);
  const [round, setRound] = useState(0);
  const career = CAREERS.find((c) => c.slug === slug);

  const items = useMemo(
    () => (questions.data ? sliceLessons(questions.data).boss.map((q) => questionToArena(q)) : []),
    [questions.data, round], // eslint-disable-line react-hooks/exhaustive-deps -- reshuffle on retry
  );
  const xpById = useMemo(() => new Map(questions.data?.map((q) => [q.id, q.xp])), [questions.data]);
  const best = useMemo(
    () => Math.max(0, ...(certs.data ?? []).filter((c) => c.career_slug === slug).map((c) => c.score)),
    // best before this run: freeze it once loaded
    [certs.isSuccess], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!career) return <Navigate to="/start" replace />;

  if (questions.isLoading)
    return (
      <ArenaFrame onExit={() => navigate(`/learn/${slug}`)}>
        <LoadingState label="Summoning the boss…" rows={2} />
      </ArenaFrame>
    );
  if (questions.isError || !items.length)
    return (
      <ArenaFrame onExit={() => navigate(`/learn/${slug}`)}>
        <ErrorState onRetry={() => questions.refetch()} />
      </ArenaFrame>
    );

  if (results)
    return (
      <BossEnd
        slug={slug}
        results={results}
        best={best}
        onRetry={() => {
          setResults(null);
          setRound((r) => r + 1);
        }}
      />
    );

  return (
    <ArenaRound
      key={round}
      items={items}
      timeLimit={TIME}
      scored
      intro={{ mood: "locked-in", title: "Boss Level", subtitle: `${career.job_title}: ${BOSS_PASS_MARK} of ${items.length} correct earns your certificate. Faster answers score more.` }}
      onExit={() => navigate(`/learn/${slug}`)}
      onAnswer={(r) => record.mutate({ question_id: r.item.id, correct: r.correct, xp_earned: r.correct ? (xpById.get(r.item.id) ?? 30) : 0, mode: "boss" })}
      onFinish={setResults}
    />
  );
}

function BossEnd({ slug, results, best, onRetry }: { slug: string; results: ArenaResult[]; best: number; onRetry: () => void }) {
  const navigate = useNavigate();
  const issue = useIssueCertificate();
  const complete = useCompleteLesson();
  const correct = results.filter((r) => r.correct).length;
  const points = results.reduce((s, r) => s + r.points, 0);
  const percent = Math.round((correct / results.length) * 100);
  const passed = bossPassed(correct);
  const sent = useRef(false);

  // after the podium's drum roll
  useEffect(() => {
    const t = setTimeout(() => {
      playSound(passed ? "boss-pass" : "boss-fail");
      if (passed) celebrate(true);
    }, 1600);
    return () => clearTimeout(t);
  }, [passed]);

  useEffect(() => {
    if (sent.current || !passed) return;
    sent.current = true;
    issue.mutate({ career_slug: slug, score: percent });
    complete.mutate({ career_slug: slug, lesson_key: "boss", accuracy: percent, perfect: correct === results.length });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cont = () => (passed ? navigate(`/certificate/${slug}`) : onRetry());
  useAnswerKeys({ onEnter: () => (!passed || issue.isSuccess ? cont() : undefined) });

  return (
    <ArenaFrame onExit={() => navigate(`/learn/${slug}`)}>
      <div className="flex flex-1 flex-col items-center gap-6 pt-2 text-center">
        <Byte mood={passed ? "level-up" : "sad"} size={160} />
        <h1 className="font-arena text-[28px] font-black sm:text-[40px]">{passed ? "Boss beaten!" : "So close"}</h1>
        <p className="text-arena-muted">
          {correct} of {results.length} correct · {passed ? "certificate unlocked" : `you need ${BOSS_PASS_MARK} to pass`}
        </p>
        <Podium
          className="w-full max-w-[520px]"
          columns={[
            { place: 1, label: "This run", value: `${percent}%`, sub: `${points.toLocaleString()} pts` },
            { place: 2, label: "Your best", value: best ? `${best}%` : "—" },
            { place: 3, label: "Correct", value: `${correct}/${results.length}` },
          ]}
        />
        <div className="mt-auto flex w-full max-w-[520px] flex-col gap-3">
          {passed ? (
            <ChunkyButton onClick={cont} disabled={!issue.isSuccess} autoFocus>
              {issue.isPending ? "Issuing certificate…" : issue.isError ? "Couldn't issue it" : "Continue"}
            </ChunkyButton>
          ) : (
            <ChunkyButton onClick={cont} autoFocus>
              Try again
            </ChunkyButton>
          )}
          <ChunkyButton variant="ghost" className="text-white hover:bg-arena-glass" onClick={() => navigate(`/learn/${slug}`)}>
            Back to path
          </ChunkyButton>
        </div>
      </div>
    </ArenaFrame>
  );
}
