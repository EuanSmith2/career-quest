import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FastForward, Target } from "lucide-react";
import { useQuestions, useRecordAnswer, useUnlockUnit } from "@/api/hooks";
import { ChunkyButton } from "@/components/ChunkyButton";
import { RoundEnd } from "@/components/round/RoundEnd";
import { RoundPlayer, type RoundResult } from "@/components/round/RoundPlayer";
import { StatTile } from "@/components/StatTile";
import { ErrorState, LoadingState } from "@/components/States";
import { CAREERS } from "@/data/careers";
import { celebrate } from "@/lib/confetti";
import { pickTestOut, questionToItem, TEST_OUT_PASS, TEST_OUT_SIZE } from "@/lib/game";
import { playSound } from "@/lib/sound";

/**
 * "JUMP HERE?" test-out (also "Find my level" from onboarding): 6 questions from the unit,
 * 5/6 unlocks every lesson in it. No hearts at stake.
 */
export default function TestOut() {
  const { career: slug = "", unit: unitParam = "" } = useParams();
  const [params] = useSearchParams();
  const placement = params.get("placement") === "1";
  const unit = unitParam === "2" ? 2 : unitParam === "1" ? 1 : null;
  const navigate = useNavigate();
  const questions = useQuestions(slug, unit === 1 ? "easy" : "medium");
  const record = useRecordAnswer();
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[] | null>(null);
  const items = useMemo(
    () => (questions.data ? pickTestOut(questions.data).map((q) => questionToItem(q)) : []),
    [questions.data, round], // eslint-disable-line react-hooks/exhaustive-deps -- fresh draw on retry
  );
  const career = CAREERS.find((c) => c.slug === slug);

  if (!career || !unit) return <Navigate to="/learn" replace />;
  if (questions.isLoading) return <LoadingState label="Building your test…" className="mx-auto max-w-app px-4" />;
  if (questions.isError || !items.length) return <ErrorState onRetry={() => questions.refetch()} />;
  if (results)
    return (
      <TestOutEnd
        slug={slug}
        unit={unit}
        placement={placement}
        results={results}
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
      context={`${placement ? "Find my level" : "Jump ahead"} · Unit ${unit}`}
      right={
        <span className="shrink-0 rounded-full bg-purple px-2.5 py-1 text-[12px] font-extrabold uppercase text-ink-bright">
          {TEST_OUT_PASS}/{TEST_OUT_SIZE} to pass
        </span>
      }
      onQuit={() => navigate(`/learn/${slug}`)}
      onAnswer={(r) => record.mutate({ question_id: r.item.id, correct: r.correct, xp_earned: 0, mode: "practice" })}
      onFinish={setResults}
    />
  );
}

function TestOutEnd({ slug, unit, placement, results, onRetry }: { slug: string; unit: 1 | 2; placement: boolean; results: RoundResult[]; onRetry: () => void }) {
  const navigate = useNavigate();
  const unlock = useUnlockUnit();
  const correct = results.filter((r) => r.correct).length;
  const accuracy = Math.round((correct / results.length) * 100);
  const passed = correct >= TEST_OUT_PASS;
  const sent = useRef(false);

  useEffect(() => {
    playSound(passed ? "lesson-complete" : "boss-fail");
    if (passed) celebrate();
    if (passed && !sent.current) {
      sent.current = true;
      unlock.mutate({ career_slug: slug, unit, accuracy });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toPath = () => navigate(`/learn/${slug}`);
  return (
    <RoundEnd
      mood={passed ? "level-up" : "sad"}
      title={passed ? `Unit ${unit} unlocked!` : "Not this time"}
      titleClass={passed ? "text-purple" : "text-foreground"}
      subtitle={passed ? "You've skipped ahead. The chest is still there to open." : `You need ${TEST_OUT_PASS} of ${TEST_OUT_SIZE}. The lessons will get you there.`}
      stats={
        <>
          <StatTile tone="green" label="Correct" value={`${correct}/${results.length}`} icon={<Target className="h-5 w-5" />} />
          <StatTile tone="blue" label="Accuracy" value={`${accuracy}%`} icon={<FastForward className="h-5 w-5" />} />
        </>
      }
      onEnter={passed ? toPath : undefined}
      actions={
        <>
          {passed && placement && unit === 1 && (
            <ChunkyButton block variant="secondary" onClick={() => navigate(`/test-out/${slug}/2?placement=1`)}>
              Try the Unit 2 test
            </ChunkyButton>
          )}
          <ChunkyButton block onClick={toPath} disabled={passed && !unlock.isSuccess} autoFocus>
            {passed ? "Go to my path" : "Start the lessons"}
          </ChunkyButton>
          {!passed && (
            <ChunkyButton block variant="ghost" onClick={onRetry}>
              Try again
            </ChunkyButton>
          )}
        </>
      }
    />
  );
}
