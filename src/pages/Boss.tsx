import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Award, Target, Trophy } from "lucide-react";
import { useCompleteLesson, useIssueCertificate, useMyCertificates, useQuestions, useRecordAnswer } from "@/api/hooks";
import { ChunkyButton } from "@/components/ChunkyButton";
import { RoundEnd } from "@/components/round/RoundEnd";
import { RoundPlayer, type RoundResult } from "@/components/round/RoundPlayer";
import { StatTile } from "@/components/StatTile";
import { ErrorState, LoadingState } from "@/components/States";
import { CAREERS } from "@/data/careers";
import { celebrate } from "@/lib/confetti";
import { BOSS_PASS_MARK, bossPassed, questionToItem, sliceLessons } from "@/lib/game";
import { playSound } from "@/lib/sound";

/** Boss Level: the 8 hard questions as a lesson with no hearts at stake. 6/8 passes and unlocks the certificate. */
export default function Boss() {
  const { career: slug = "" } = useParams();
  const navigate = useNavigate();
  const questions = useQuestions(slug);
  const certs = useMyCertificates();
  const record = useRecordAnswer();
  const [results, setResults] = useState<RoundResult[] | null>(null);
  const [round, setRound] = useState(0);
  const career = CAREERS.find((c) => c.slug === slug);

  const items = useMemo(
    () => (questions.data ? sliceLessons(questions.data).boss.map((q) => questionToItem(q)) : []),
    [questions.data, round], // eslint-disable-line react-hooks/exhaustive-deps -- reshuffle on retry
  );
  const xpById = useMemo(() => new Map(questions.data?.map((q) => [q.id, q.xp])), [questions.data]);
  const best = useMemo(
    () => Math.max(0, ...(certs.data ?? []).filter((c) => c.career_slug === slug).map((c) => c.score)),
    // best before this run: freeze it once loaded
    [certs.isSuccess], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!career) return <Navigate to="/start" replace />;
  if (questions.isLoading) return <LoadingState label="Summoning the boss…" rows={4} className="mx-auto max-w-app px-4" />;
  if (questions.isError || !items.length) return <ErrorState onRetry={() => questions.refetch()} />;

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
    <RoundPlayer
      key={round}
      items={items}
      context={`Boss level · ${career.job_title}`}
      right={
        <span className="shrink-0 rounded-full bg-boss px-2.5 py-1 text-[12px] font-extrabold uppercase text-white" title="Correct answers needed to pass">
          {BOSS_PASS_MARK}/{items.length} to pass
        </span>
      }
      onQuit={() => navigate(`/learn/${slug}`)}
      onAnswer={(r) => record.mutate({ question_id: r.item.id, correct: r.correct, xp_earned: r.correct ? (xpById.get(r.item.id) ?? 30) : 0, mode: "boss" })}
      onFinish={setResults}
    />
  );
}

function BossEnd({ slug, results, best, onRetry }: { slug: string; results: RoundResult[]; best: number; onRetry: () => void }) {
  const navigate = useNavigate();
  const issue = useIssueCertificate();
  const complete = useCompleteLesson();
  const correct = results.filter((r) => r.correct).length;
  const percent = Math.round((correct / results.length) * 100);
  const passed = bossPassed(correct);
  const sent = useRef(false);

  useEffect(() => {
    playSound(passed ? "boss-pass" : "boss-fail");
    if (passed) celebrate(true);
  }, [passed]);

  useEffect(() => {
    if (sent.current || !passed) return;
    sent.current = true;
    issue.mutate({ career_slug: slug, score: percent });
    complete.mutate({ career_slug: slug, lesson_key: "boss", accuracy: percent, perfect: correct === results.length });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cont = () => (passed ? issue.isSuccess && navigate(`/certificate/${slug}`) : onRetry());

  return (
    <RoundEnd
      mood={passed ? "level-up" : "sad"}
      title={passed ? "Boss beaten!" : "So close"}
      titleClass={passed ? "text-gold" : "text-foreground"}
      subtitle={`${correct} of ${results.length} correct · ${passed ? "certificate unlocked" : `you need ${BOSS_PASS_MARK} to pass`}`}
      stats={
        <>
          <StatTile tone="gold" label="Score" value={`${percent}%`} icon={<Award className="h-5 w-5" />} />
          <StatTile tone="green" label="Correct" value={`${correct}/${results.length}`} icon={<Target className="h-5 w-5" />} />
          <StatTile tone="blue" label="Your best" value={best ? `${Math.max(best, passed ? percent : 0)}%` : passed ? `${percent}%` : "—"} icon={<Trophy className="h-5 w-5" />} />
        </>
      }
      onEnter={cont}
      actions={
        <>
          {passed ? (
            <ChunkyButton block onClick={cont} disabled={!issue.isSuccess} autoFocus>
              {issue.isPending ? "Issuing certificate…" : issue.isError ? "Couldn't issue it" : "See your certificate"}
            </ChunkyButton>
          ) : (
            <ChunkyButton block onClick={cont} autoFocus>
              Try again
            </ChunkyButton>
          )}
          <ChunkyButton block variant="ghost" onClick={() => navigate(`/learn/${slug}`)}>
            Back to path
          </ChunkyButton>
        </>
      }
    />
  );
}
