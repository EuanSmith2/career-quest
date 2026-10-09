import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Check, Dumbbell, ExternalLink, Lock, Star, Trophy } from "lucide-react";
import { useCareer, useLessonProgress, useProfile, useQuestions, useUpdateProfile } from "@/api/hooks";
import type { Career, Question } from "@/api/types";
import { Byte, type ByteMood } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { Page } from "@/components/Page";
import { ErrorState, LoadingState } from "@/components/States";
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CAREERS } from "@/data/careers";
import { currentLesson, LESSON_KEYS, lessonPosition, lessonXpOnOffer, pathOffset, sliceLessons, unitTopics, type LessonKey } from "@/lib/game";
import { cn } from "@/lib/utils";

const UNITS = [
  { n: 1, title: "Foundations", body: "The basics every {job} needs.", keys: ["easy-1", "easy-2", "easy-3", "easy-4"] as LessonKey[], bg: "bg-green", lip: "var(--green-lip)" },
  { n: 2, title: "On the Job", body: "Real situations from a {job}'s week.", keys: ["medium-1", "medium-2", "medium-3", "medium-4"] as LessonKey[], bg: "bg-blue", lip: "var(--blue-lip)" },
  { n: 3, title: "Boss Level", body: "8 hard questions against the clock. Get 6 to earn your certificate.", keys: ["boss"] as LessonKey[], bg: "bg-boss", lip: "var(--boss-lip)" },
];

type NodeState = "done" | "current" | "locked";

export default function Learn() {
  const { career: slug = "" } = useParams();
  const career = useCareer(slug);
  const questions = useQuestions(slug);
  const progress = useLessonProgress(slug);
  const { data: profile } = useProfile();
  const [byteMood, setByteMood] = useState<ByteMood>("idle");
  const [guide, setGuide] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState<LessonKey | null>(null);

  const update = useUpdateProfile();
  const chosen = profile?.chosen_career;
  const hasProfile = !!profile;
  useEffect(() => {
    if (hasProfile && chosen !== slug && CAREERS.some((c) => c.slug === slug)) update.mutate({ chosen_career: slug });
  }, [hasProfile, chosen, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const lessons = useMemo(() => sliceLessons(questions.data ?? []), [questions.data]);
  const done = useMemo(() => new Set(progress.data?.map((p) => p.lesson_key)), [progress.data]);
  const current = currentLesson(done);

  if (!CAREERS.some((c) => c.slug === slug)) return <Navigate to="/start" replace />;
  if (career.isLoading || questions.isLoading || progress.isLoading) return <LoadingState label="Loading your path…" rows={4} />;
  if (questions.isError || progress.isError || !career.data)
    return (
      <ErrorState
        onRetry={() => {
          void questions.refetch();
          void progress.refetch();
        }}
      />
    );

  const c = career.data;
  const stateOf = (k: LessonKey): NodeState => (done.has(k) ? "done" : k === current ? "current" : "locked");
  let globalIndex = 0;

  return (
    <Page>
      <div className="mb-6 flex items-center gap-3">
        <CareerBadge icon={c.icon} color={c.color} size={44} />
        <div className="min-w-0">
          <h1 className="text-section leading-tight">{c.job_title}</h1>
          <Link to="/start" className="text-caption font-bold text-blue">
            Change career
          </Link>
        </div>
      </div>

      {UNITS.map((u) => {
        const unitQs = u.keys.flatMap((k) => lessons[k] ?? []);
        const hasCurrent = u.keys.includes(current as LessonKey);
        return (
          <section key={u.n} className="mb-10" aria-label={`Unit ${u.n}`}>
            <div className={cn("chunky mb-8 flex items-center gap-3 rounded-card p-4 text-white", u.bg)} style={{ "--lip-color": u.lip } as React.CSSProperties}>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-extrabold uppercase tracking-wide opacity-90">
                  Unit {u.n} · {u.title}
                </p>
                <p className="text-body font-bold">{u.body.replace("{job}", c.job_title)}</p>
              </div>
              <ChunkyButton variant="outline" className="shrink-0 border-white bg-transparent px-3 text-white" style={{ "--lip-color": "var(--border)" } as React.CSSProperties} onClick={() => setGuide(u.n)}>
                <BookOpen className="h-5 w-5" />
                <span className="hidden min-[400px]:inline">Guidebook</span>
              </ChunkyButton>
            </div>

            <div className="relative flex flex-col items-center gap-10">
              {u.keys.map((k) => {
                const offset = pathOffset(globalIndex++);
                const st = stateOf(k);
                return (
                  <PathNode
                    key={k}
                    lessonKey={k}
                    state={st}
                    offset={offset}
                    career={c}
                    questions={lessons[k] ?? []}
                    hearts={profile?.hearts ?? 5}
                    open={openKey === k}
                    onOpenChange={(o) => {
                      setOpenKey(o ? k : null);
                      setByteMood(o && st === "locked" ? "stare" : "idle");
                    }}
                  />
                );
              })}
              {hasCurrent && u.n !== 3 && (
                <div className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ left: "calc(50% + 90px)" }} aria-hidden>
                  <Byte mood={byteMood} size={80} />
                </div>
              )}
            </div>

            <Sheet open={guide === u.n} onOpenChange={(o) => setGuide(o ? u.n : null)}>
              <SheetContent>
                <SheetTitle>
                  Unit {u.n} · {u.title}
                </SheetTitle>
                <SheetDescription className="mb-4">What you'll cover, and the standards every question cites.</SheetDescription>
                <ul className="mb-4 flex flex-col gap-2">
                  {unitTopics(unitQs).map((t) => (
                    <li key={t} className="flex items-start gap-2 rounded-btn bg-muted px-3 py-2 font-bold">
                      <Star className="mt-0.5 h-5 w-5 shrink-0 text-gold" fill="currentColor" />
                      {t}
                    </li>
                  ))}
                </ul>
                {c.thm_path && (
                  <ChunkyButton asChild variant="secondary" block>
                    <a href={c.thm_path} target="_blank" rel="noreferrer">
                      TryHackMe path <ExternalLink className="h-4 w-4" />
                    </a>
                  </ChunkyButton>
                )}
              </SheetContent>
            </Sheet>
          </section>
        );
      })}

      {done.has("boss") && (
        <ChunkyButton asChild variant="gold" block>
          <Link to={`/certificate/${slug}`}>
            <Trophy className="h-5 w-5" /> View your certificate
          </Link>
        </ChunkyButton>
      )}
      {LESSON_KEYS.every((k) => done.has(k)) && <p className="mt-4 text-center text-caption text-muted-foreground">Path complete. Replay any lesson to practise.</p>}
    </Page>
  );
}

function PathNode({
  lessonKey,
  state,
  offset,
  career,
  questions,
  hearts,
  open,
  onOpenChange,
}: {
  lessonKey: LessonKey;
  state: NodeState;
  offset: number;
  career: Career;
  questions: Question[];
  hearts: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const isBoss = lessonKey === "boss";
  const size = isBoss ? 96 : 72;
  const pos = lessonPosition(lessonKey);
  const xp = lessonXpOnOffer(questions);
  const href = isBoss ? `/boss/${career.slug}` : `/lesson/${career.slug}/${lessonKey}`;

  const face =
    state === "done"
      ? { bg: "var(--gold)", lip: "var(--gold-lip)", fg: "var(--white)" }
      : state === "current"
        ? isBoss
          ? { bg: "var(--boss)", lip: "var(--boss-lip)", fg: "var(--gold)" }
          : { bg: career.color, lip: `color-mix(in srgb, ${career.color} 75%, black)`, fg: "var(--white)" }
        : { bg: isBoss ? "var(--boss)" : "var(--disabled-bg)", lip: isBoss ? "var(--boss-lip)" : "var(--disabled-fg)", fg: isBoss ? "var(--node-locked-icon)" : "var(--disabled-fg)" };

  const Icon = state === "done" ? (isBoss ? Trophy : Check) : state === "locked" ? (isBoss ? Trophy : Lock) : isBoss ? Trophy : Star;

  return (
    <motion.div
      className="relative"
      style={{ x: offset }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>
          <div className="relative" style={{ width: size, height: size + 6 }}>
            {state === "current" && (
              <>
                <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ height: size, border: `6px solid ${isBoss ? "var(--gold)" : career.color}` }} aria-hidden />
                <span
                  className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 animate-float whitespace-nowrap rounded-btn border-2 border-border bg-background px-3 py-1.5 btn-text"
                  style={{ color: isBoss ? "var(--boss)" : career.color }}
                  aria-hidden
                >
                  Start
                  <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-border bg-background" />
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(!open)}
              className="chunky relative grid place-items-center rounded-full"
              style={{ width: size, height: size, background: face.bg, color: face.fg, "--lip": "6px", "--lip-color": face.lip } as React.CSSProperties}
              aria-label={`${isBoss ? "Boss level" : `Unit ${pos.unit}, lesson ${pos.index}`}: ${state}`}
            >
              <Icon className={isBoss ? "h-11 w-11" : "h-8 w-8"} strokeWidth={3} fill={state !== "locked" && !isBoss && state !== "done" ? "currentColor" : "none"} />
            </button>
          </div>
        </PopoverAnchor>
        <PopoverContent side="bottom" className="border-2 border-border bg-background text-foreground">
          <PopoverArrow className="fill-border" width={16} height={8} />
          {state === "locked" ? (
            <>
              <p className="font-extrabold">{isBoss ? "Boss Level" : `Lesson ${pos.index} of ${pos.of}`}</p>
              <p className="mb-3 text-caption text-muted-foreground">Complete all the levels above to unlock this.</p>
              <ChunkyButton block disabled>
                Locked
              </ChunkyButton>
            </>
          ) : state === "done" ? (
            <>
              <p className="font-extrabold">{isBoss ? "Boss beaten!" : `Lesson ${pos.index} of ${pos.of} · complete`}</p>
              <p className="mb-3 text-caption text-muted-foreground">
                {isBoss ? "Try to beat your best score." : "Practise it again: no hearts lost, and finishing refills one."}
              </p>
              <ChunkyButton block variant="gold" onClick={() => navigate(isBoss ? href : `${href}?practice=1`)}>
                {isBoss ? (
                  "Play again"
                ) : (
                  <>
                    <Dumbbell className="h-5 w-5" /> Practise +1 ❤️
                  </>
                )}
              </ChunkyButton>
            </>
          ) : (
            <>
              <p className="font-extrabold">
                {isBoss ? "Boss Level · 8 questions" : `Lesson ${pos.index} of ${pos.of}`} · +{xp} XP
              </p>
              <p className="mb-3 text-caption text-muted-foreground">
                {isBoss ? "20 seconds each. Get 6 of 8 to earn your certificate." : hearts > 0 ? "4 questions, about five minutes." : "You're out of hearts. Practise a finished lesson to refill."}
              </p>
              <ChunkyButton block onClick={() => navigate(href)}>
                Start +{xp} XP
              </ChunkyButton>
            </>
          )}
        </PopoverContent>
      </Popover>
    </motion.div>
  );
}
