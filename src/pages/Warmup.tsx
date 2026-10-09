import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Clock, Target, Trophy } from "lucide-react";
import { useCareer, useCareers, useRecordAnswer } from "@/api/hooks";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { RoundEnd } from "@/components/round/RoundEnd";
import { RoundPlayer, type RoundResult } from "@/components/round/RoundPlayer";
import { StatTile } from "@/components/StatTile";
import { CAREERS } from "@/data/careers";
import { MEET_THE_JOBS } from "@/data/meetTheJobs";
import { celebrate } from "@/lib/confetti";
import { formatDuration, lessonAccuracy, meetTheJobsToItem, pickMeetTheJobs } from "@/lib/game";
import { playSound } from "@/lib/sound";

/** Meet the Jobs: 6 quick questions about what each job does, always including yours. */
export default function Warmup() {
  const { career: slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: careers } = useCareers();
  const record = useRecordAnswer();
  const items = useMemo(() => pickMeetTheJobs(MEET_THE_JOBS, slug, 6).map((q) => meetTheJobsToItem(q)), [slug]);
  const started = useRef(Date.now());
  const [done, setDone] = useState<{ results: RoundResult[]; ms: number } | null>(null);

  if (!CAREERS.some((c) => c.slug === slug)) return <Navigate to="/start" replace />;
  if (done) return <WarmupEnd slug={slug} results={done.results} ms={done.ms} />;

  return (
    <RoundPlayer
      items={items}
      context="Meet the jobs"
      onQuit={() => navigate(`/learn/${slug}`)}
      onAnswer={(r) => record.mutate({ question_id: `warmup:${r.item.id}`, correct: r.correct, xp_earned: 0, mode: "warmup" })}
      feedbackExtra={(r) => {
        const c = careers?.find((x) => x.slug === r.item.careerSlug);
        return c ? (
          <p className="flex items-center gap-3 text-left font-bold">
            <CareerBadge icon={c.icon} color={c.color} size={36} />
            <span>
              {c.job_title}: {c.one_liner}
            </span>
          </p>
        ) : null;
      }}
      onFinish={(results) => setDone({ results, ms: Date.now() - started.current })}
    />
  );
}

function WarmupEnd({ slug, results, ms }: { slug: string; results: RoundResult[]; ms: number }) {
  const navigate = useNavigate();
  const { data: career } = useCareer(slug);
  const correct = results.filter((r) => r.correct).length;
  const high = correct >= Math.ceil(results.length * 0.66);
  const start = () => navigate(`/learn/${slug}`);

  useEffect(() => {
    playSound("lesson-complete");
    if (high) celebrate();
  }, [high]);

  return (
    <RoundEnd
      mood={high ? "level-up" : "smug"}
      title={high ? "You know your jobs!" : "Round complete"}
      stats={
        <>
          <StatTile tone="gold" label="Correct" value={`${correct}/${results.length}`} icon={<Trophy className="h-5 w-5" />} />
          <StatTile tone="green" label="Accuracy" value={`${lessonAccuracy(correct, results.length)}%`} icon={<Target className="h-5 w-5" />} />
          <StatTile tone="blue" label="Time" value={formatDuration(ms)} icon={<Clock className="h-5 w-5" />} />
        </>
      }
      onEnter={start}
      actions={
        <ChunkyButton block onClick={start} autoFocus>
          Start learning
        </ChunkyButton>
      }
    >
      {career && (
        <div className="flex w-full items-center gap-4 rounded-card border-2 border-border p-4 text-left">
          <CareerBadge icon={career.icon} color={career.color} size={56} />
          <div className="min-w-0">
            <p className="text-caption font-extrabold uppercase tracking-wide text-muted-foreground">Your path</p>
            <p className="text-[22px] font-extrabold leading-tight">{career.job_title}</p>
            <p className="text-caption text-muted-foreground">{career.day_to_day}</p>
          </div>
        </div>
      )}
    </RoundEnd>
  );
}
