import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useCareer, useCareers, useRecordAnswer } from "@/api/hooks";
import { ArenaFrame, ArenaRound, type ArenaResult } from "@/components/arena/ArenaRound";
import { Podium } from "@/components/arena/Podium";
import { Byte } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { MEET_THE_JOBS } from "@/data/meetTheJobs";
import { celebrate } from "@/lib/confetti";
import { meetTheJobsToArena, pickMeetTheJobs } from "@/lib/game";
import { useAnswerKeys } from "@/lib/useKeys";
import { CAREERS } from "@/data/careers";

const TIME = 15;

/** Meet the Jobs: 6 Kahoot-style questions about what each job does, always including yours. */
export default function Warmup() {
  const { career: slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: careers } = useCareers();
  const record = useRecordAnswer();
  const items = useMemo(() => pickMeetTheJobs(MEET_THE_JOBS, slug, 6).map((q) => meetTheJobsToArena(q)), [slug]);
  const [results, setResults] = useState<ArenaResult[] | null>(null);

  if (!CAREERS.some((c) => c.slug === slug)) return <Navigate to="/start" replace />;
  if (results) return <WarmupEnd slug={slug} results={results} />;

  return (
    <ArenaRound
      items={items}
      timeLimit={TIME}
      scored
      intro={{ mood: "talking", title: "Meet the Jobs", subtitle: "Six quick questions about what cyber people actually do all day. Faster answers score more." }}
      onExit={() => navigate("/start")}
      onAnswer={(r) => record.mutate({ question_id: `warmup:${r.item.id}`, correct: r.correct, xp_earned: 0, mode: "warmup" })}
      revealExtra={(r) => {
        const c = careers?.find((x) => x.slug === r.item.careerSlug);
        return c ? (
          <p className="flex items-center gap-2 font-bold">
            <CareerBadge icon={c.icon} color={c.color} size={32} />
            <span>
              {c.job_title}: {c.one_liner}
            </span>
          </p>
        ) : null;
      }}
      onFinish={setResults}
    />
  );
}

function WarmupEnd({ slug, results }: { slug: string; results: ArenaResult[] }) {
  const navigate = useNavigate();
  const { data: career } = useCareer(slug);
  const score = results.reduce((s, r) => s + r.points, 0);
  const correct = results.filter((r) => r.correct).length;
  const high = correct >= Math.ceil(results.length * 0.66);
  let best = 0;
  let run = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const start = () => navigate(`/learn/${slug}`);
  useAnswerKeys({ onEnter: start });

  useEffect(() => {
    if (high) setTimeout(() => celebrate(true), 1300);
  }, [high]);

  return (
    <ArenaFrame onExit={() => navigate(`/learn/${slug}`)}>
      <div className="flex flex-1 flex-col items-center gap-6 pt-2 text-center">
        <Byte mood={high ? "level-up" : "smug"} size={120} />
        <h1 className="font-arena text-[28px] font-black sm:text-[36px]">{high ? "You know your jobs!" : "Round over"}</h1>
        <Podium
          className="w-full max-w-[520px]"
          columns={[
            { place: 1, label: "Score", value: score.toLocaleString() },
            { place: 2, label: "Correct", value: `${correct}/${results.length}` },
            { place: 3, label: "Best streak", value: `🔥${best}` },
          ]}
        />
        {career && (
          <div className="flex w-full max-w-[520px] items-center gap-4 rounded-card bg-arena-glass p-4 text-left">
            <CareerBadge icon={career.icon} color={career.color} size={56} />
            <div className="min-w-0">
              <p className="text-caption font-extrabold uppercase tracking-wide text-arena-muted">Your path</p>
              <p className="text-[22px] font-extrabold leading-tight">{career.job_title}</p>
              <p className="text-caption text-arena-muted">{career.day_to_day}</p>
            </div>
          </div>
        )}
        <ChunkyButton className="mt-auto w-full max-w-[520px] text-[17px]" onClick={start}>
          Start learning
        </ChunkyButton>
      </div>
    </ArenaFrame>
  );
}
