import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUp, BookOpen, Check, Dumbbell, ExternalLink, FastForward, Gift, Lock, Star, Trophy } from "lucide-react";
import { useCareer, useClaimChest, useLessonProgress, useProfile, useQuestions, useUpdateProfile } from "@/api/hooks";
import type { Career, Question } from "@/api/types";
import { Byte, type ByteMood } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { BorderBeam } from "@/components/fx/BorderBeam";
import { burstFrom } from "@/components/fx/burst";
import { Page } from "@/components/Page";
import { ErrorState, LoadingState } from "@/components/States";
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CAREERS } from "@/data/careers";
import { CHEST_XP, currentLesson, lessonPosition, lessonXpOnOffer, PATH, REVIEW_SIZE, sliceLessons, unitTopics, type LessonKey, type PathNode as Node } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const UNITS = [
  { n: 1 as const, title: "Foundations", body: "The basics every {job} needs.", bg: "bg-blue", lip: "var(--blue-lip)", fg: "text-white dark:text-primary-fg" },
  { n: 2 as const, title: "On the Job", body: "Real situations from a {job}'s week.", bg: "bg-purple", lip: "var(--purple-lip)", fg: "text-ink-bright" },
  { n: 3 as const, title: "Boss Level", body: "8 hard questions. Get 6 to earn your certificate.", bg: "bg-boss", lip: "var(--boss-lip)", fg: "text-white" },
];

type NodeState = "done" | "current" | "locked";

/** Zig-zag offsets: Prompt 1's 7-step sine on wider screens, the video's 0/44/66 on phones. */
const OFFSETS_WIDE = [0, -40, -70, -40, 0, 40, 70, 40];
const OFFSETS_PHONE = [0, -44, -66, -44, 0, 44, 66, 44];

function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 549px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 549px)");
    const on = () => setPhone(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return phone;
}

export default function Learn() {
  const { career: slug = "" } = useParams();
  const navigate = useNavigate();
  const career = useCareer(slug);
  const questions = useQuestions(slug);
  const progress = useLessonProgress(slug);
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const phone = useIsPhone();
  const [byteMood, setByteMood] = useState<ByteMood>("idle");
  const [guide, setGuide] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeUnit, setActiveUnit] = useState(1);
  const [currentOffscreen, setCurrentOffscreen] = useState<"up" | "down" | null>(null);
  const unitRefs = useRef<(HTMLElement | null)[]>([]);
  const currentRef = useRef<HTMLDivElement | null>(null);

  // remember the career when a path is opened directly
  const chosen = profile?.chosen_career;
  const hasProfile = !!profile;
  useEffect(() => {
    if (hasProfile && chosen !== slug && CAREERS.some((c) => c.slug === slug)) update.mutate({ chosen_career: slug });
  }, [hasProfile, chosen, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const lessons = useMemo(() => sliceLessons(questions.data ?? []), [questions.data]);
  const done = useMemo(() => new Set(progress.data?.map((p) => p.lesson_key)), [progress.data]);
  const current = currentLesson(done);
  const ready = !!career.data && !!questions.data && !!progress.data;

  // sticky unit header follows the unit you're scrolled into
  useEffect(() => {
    if (!ready) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveUnit(Number((visible.target as HTMLElement).dataset.unit));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    unitRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [ready]);

  // ↑ button when the current node is off screen
  useEffect(() => {
    if (!ready || !currentRef.current) return;
    const io = new IntersectionObserver(([e]) => setCurrentOffscreen(e.isIntersecting ? null : e.boundingClientRect.top < 0 ? "up" : "down"));
    io.observe(currentRef.current);
    return () => io.disconnect();
  }, [ready, current]);

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
  const stateOf = (k: string): NodeState => (done.has(k) ? "done" : k === current ? "current" : "locked");
  const offsets = phone ? OFFSETS_PHONE : OFFSETS_WIDE;
  const u = UNITS[activeUnit - 1];
  let i = 0;

  return (
    <Page>
      <div className="mb-4 flex items-center gap-3">
        <CareerBadge icon={c.icon} color={c.color} size={44} />
        <div className="min-w-0">
          <h1 className="text-section leading-tight">{c.job_title}</h1>
          <Link to="/start?pick=1" className="text-caption font-bold text-link">
            Change career
          </Link>
        </div>
      </div>

      {/* sticky unit header, recoloured per unit */}
      <div className="sticky top-[58px] z-10 -mx-1 mb-6 bg-background px-1 pb-2 pt-1 lg:top-0">
        <div className={cn("chunky flex items-center gap-3 rounded-card p-4 transition-colors duration-300", u.bg, u.fg)} style={{ "--lip-color": u.lip } as React.CSSProperties}>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-extrabold uppercase tracking-wide opacity-90">
              Unit {u.n} · {u.title}
            </p>
            <p className="text-body font-bold">{u.body.replace("{job}", c.job_title)}</p>
          </div>
          {u.n !== 3 && (
            <button
              type="button"
              onClick={() => setGuide(u.n)}
              className="chunky grid h-12 w-12 shrink-0 place-items-center rounded-btn border-2 border-current"
              style={{ "--lip-color": "rgb(0 0 0 / 0.25)" } as React.CSSProperties}
              aria-label={`Unit ${u.n} guidebook`}
            >
              <BookOpen className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {UNITS.map((unit) => {
        const nodes = PATH.filter((n) => n.unit === unit.n);
        const unitLocked = nodes.every((n) => stateOf(n.key) === "locked");
        const hasCurrent = nodes.some((n) => n.key === current);
        // Byte stands on the left of the unit's first node, where the zig-zag leaves room
        const byteAt = 0;
        return (
          <section key={unit.n} ref={(el) => void (unitRefs.current[unit.n - 1] = el)} data-unit={unit.n} className="mb-6" aria-label={`Unit ${unit.n}: ${unit.title}`}>
            {unit.n > 1 && (
              <div className="my-8 flex items-center gap-4 text-caption font-extrabold uppercase tracking-wide text-muted-foreground" role="separator">
                <span className="h-0.5 flex-1 bg-border" />
                {unit.title}
                <span className="h-0.5 flex-1 bg-border" />
              </div>
            )}
            <div className="relative flex flex-col items-center gap-10 pt-12">
              {unitLocked && unit.n === 2 && <JumpHere slug={slug} unit={unit.n} />}
              {nodes.map((n) => {
                const offset = offsets[i % offsets.length];
                const delay = i++ * 0.04;
                const st = stateOf(n.key);
                const byteSize = phone ? 110 : 130;
                return (
                  <div key={n.key} ref={n.key === current ? currentRef : undefined} className="relative">
                    {hasCurrent && unit.n !== 3 && n === nodes[byteAt] && (
                      <div
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                        style={{ left: `calc(50% + ${offset - 36 - 16 - byteSize}px)` }}
                        aria-hidden
                      >
                        <Byte mood={byteMood} size={byteSize} />
                      </div>
                    )}
                    <PathNodeView
                      node={n}
                      state={st}
                      offset={offset}
                      delay={delay}
                      career={c}
                      questions={n.kind === "chest" ? [] : (lessons[n.key as LessonKey] ?? [])}
                      hearts={profile?.hearts ?? 5}
                      open={openKey === n.key}
                      onOpenChange={(o) => {
                        setOpenKey(o ? n.key : null);
                        setByteMood(o && st === "locked" ? "stare" : "idle");
                      }}
                      onChest={() => setByteMood("chest")}
                    />
                  </div>
                );
              })}
            </div>

            <Sheet open={guide === unit.n} onOpenChange={(o) => setGuide(o ? unit.n : null)}>
              <SheetContent>
                <SheetTitle>
                  Unit {unit.n} · {unit.title}
                </SheetTitle>
                <SheetDescription className="mb-4">What you'll cover, and the standards every question cites.</SheetDescription>
                <ul className="mb-4 flex flex-col gap-2">
                  {unitTopics(unit.n === 1 ? lessons["review-1"] : lessons["review-2"]).map((t) => (
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
        <ChunkyButton block variant="gold" onClick={() => navigate(`/certificate/${slug}`)}>
          <Trophy className="h-5 w-5" /> View your certificate
        </ChunkyButton>
      )}

      {currentOffscreen && (
        <button
          type="button"
          onClick={() => currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="chunky fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full border-2 border-border bg-background text-link md:bottom-8 lg:right-[384px]"
          style={{ "--lip-color": "var(--border-deep)" } as React.CSSProperties}
          aria-label="Back to the current lesson"
        >
          <ArrowUp className={cn("h-7 w-7", currentOffscreen === "down" && "rotate-180")} strokeWidth={3} />
        </button>
      )}
    </Page>
  );
}

/** "JUMP HERE?" at the start of a locked unit: a purple fast-forward node into the test-out. */
function JumpHere({ slug, unit }: { slug: string; unit: 1 | 2 | 3 }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="animate-float rounded-btn border-2 border-border bg-background px-3 py-1.5 btn-text text-purple">Jump here?</span>
      <button
        type="button"
        onClick={() => navigate(`/test-out/${slug}/${unit}`)}
        className="chunky grid place-items-center rounded-[50%] bg-purple text-ink-bright"
        style={{ width: 72, height: 66, "--lip": "8px", "--lip-color": "var(--purple-lip)" } as React.CSSProperties}
        aria-label={`Jump to unit ${unit}: take a 6-question test`}
      >
        <FastForward className="h-8 w-8" fill="currentColor" />
      </button>
    </div>
  );
}

function PathNodeView({
  node,
  state,
  offset,
  delay,
  career,
  questions,
  hearts,
  open,
  onOpenChange,
  onChest,
}: {
  node: Node;
  state: NodeState;
  offset: number;
  delay: number;
  career: Career;
  questions: Question[];
  hearts: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChest: () => void;
}) {
  const navigate = useNavigate();
  const claim = useClaimChest();
  const btn = useRef<HTMLButtonElement>(null);
  const isBoss = node.kind === "boss";
  const w = isBoss ? 96 : 72;
  const h = isBoss ? 88 : 66;
  const xp = node.kind === "review" ? REVIEW_SIZE * (node.unit === 1 ? 10 : 20) : lessonXpOnOffer(questions);
  const href = node.kind === "boss" ? `/boss/${career.slug}` : `/lesson/${career.slug}/${node.key}`;

  const face =
    state === "done"
      ? { bg: "var(--primary)", lip: "var(--primary-lip)", fg: "var(--primary-fg)" }
      : state === "current"
        ? isBoss
          ? { bg: "var(--boss)", lip: "var(--boss-lip)", fg: "var(--gold)" }
          : node.kind === "chest"
            ? { bg: "var(--gold)", lip: "var(--gold-lip)", fg: "var(--ink-bright)" }
            : { bg: career.color, lip: `color-mix(in srgb, ${career.color} 70%, black)`, fg: "var(--white)" }
        : isBoss
          ? { bg: "var(--boss)", lip: "var(--boss-lip)", fg: "var(--node-locked-icon)" }
          : { bg: "var(--node-locked)", lip: "var(--node-locked-lip)", fg: "var(--node-locked-icon)" };

  const Icon = node.kind === "chest" ? Gift : node.kind === "review" || isBoss ? Trophy : state === "done" ? Check : state === "locked" ? Lock : Star;

  const openChest = () => {
    claim.mutate(
      { career_slug: career.slug, chest_key: node.key },
      {
        onSuccess: () => {
          playSound("chest-open");
          burstFrom(btn.current, { colors: ["--gold", "--flame", "--blue"], count: 20 });
          onChest();
        },
      },
    );
  };

  const title =
    node.kind === "chest"
      ? "Treasure chest"
      : node.kind === "review"
        ? `Unit ${node.unit} review`
        : isBoss
          ? "Boss Level · 8 questions"
          : (() => {
              const p = lessonPosition(node.key as LessonKey);
              return `Lesson ${p.index} of ${p.of}`;
            })();

  return (
    <motion.div
      className="relative"
      style={{ x: offset }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>
          <div className="relative" style={{ width: w, height: h + 8 }}>
            {state === "current" && (
              <>
                <span
                  className="absolute inset-x-0 top-0 animate-pulse-ring rounded-[50%]"
                  style={{ height: h, border: `6px solid ${isBoss || node.kind === "chest" ? "var(--gold)" : career.color}` }}
                  aria-hidden
                />
                <span className="absolute -top-12 left-1/2 z-10 -translate-x-1/2" aria-hidden>
                  {/* the float animation sits on an inner span so its transform can't undo the centring */}
                  <span
                    className="relative block animate-float whitespace-nowrap rounded-btn border-2 border-border bg-background px-3 py-1.5 btn-text"
                    style={{ color: isBoss || node.kind === "chest" ? "var(--gold)" : career.color }}
                  >
                    {node.kind === "chest" ? "Open" : "Start"}
                    <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-border bg-background" />
                  </span>
                </span>
              </>
            )}
            <button
              ref={btn}
              type="button"
              onClick={() => onOpenChange(!open)}
              className="chunky relative grid place-items-center rounded-[50%]"
              style={{ width: w, height: h, background: face.bg, color: face.fg, "--lip": "8px", "--lip-color": face.lip } as React.CSSProperties}
              aria-label={`${title}: ${state}`}
            >
              {state === "current" && <BorderBeam color={isBoss ? "var(--gold)" : "var(--white)"} />}
              <Icon className={isBoss ? "h-11 w-11" : "h-8 w-8"} strokeWidth={2.6} fill={Icon === Star || (Icon === Trophy && state !== "locked") ? "currentColor" : "none"} />
            </button>
          </div>
        </PopoverAnchor>
        <PopoverContent side="bottom" className="border-2 border-border bg-background text-foreground">
          <PopoverArrow className="fill-border" width={16} height={8} />
          {state === "locked" ? (
            <>
              <p className="font-extrabold">{title}</p>
              <p className="mb-3 text-caption text-muted-foreground">Complete all the levels above to unlock this.</p>
              <ChunkyButton block disabled>
                Locked
              </ChunkyButton>
            </>
          ) : node.kind === "chest" ? (
            state === "done" || claim.isSuccess ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <Byte mood="chest" size={96} />
                <p className="font-extrabold">Chest opened · +{CHEST_XP} XP</p>
              </div>
            ) : (
              <>
                <p className="font-extrabold">Treasure chest</p>
                <p className="mb-3 text-caption text-muted-foreground">A reward for getting this far.</p>
                <ChunkyButton block variant="gold" onClick={openChest} disabled={claim.isPending}>
                  {claim.isPending ? "Opening…" : `Open · +${CHEST_XP} XP`}
                </ChunkyButton>
              </>
            )
          ) : state === "done" ? (
            <>
              <p className="font-extrabold">{isBoss ? "Boss beaten!" : `${title} · complete`}</p>
              <p className="mb-3 text-caption text-muted-foreground">{isBoss ? "Try to beat your best score." : "Practise it again: no hearts lost, and finishing refills one."}</p>
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
                {title} · +{xp} XP
              </p>
              <p className="mb-3 text-caption text-muted-foreground">
                {isBoss
                  ? "No hearts at stake. Get 6 of 8 to earn your certificate."
                  : hearts <= 0
                    ? "You're out of hearts. Practise a finished lesson to refill."
                    : node.kind === "review"
                      ? "6 questions from across the unit."
                      : "4 questions and a matching round, about five minutes."}
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
