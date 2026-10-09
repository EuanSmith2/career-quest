// Pure game logic: speed points, option shuffling, Vibe Check ranking, lesson slicing.
// No React, no I/O, so everything here is unit-tested in game.test.ts.

import type { Question } from "@/api/types";
import type { VibeQuestion } from "@/data/vibeCheck";
import type { MeetTheJobsQuestion } from "@/data/meetTheJobs";

export type Rng = () => number;

// ---------- boss ----------

export const BOSS_PASS_MARK = 6; // of 8

export function bossPassed(correctCount: number): boolean {
  return correctCount >= BOSS_PASS_MARK;
}

// ---------- shuffling ----------

/** Fisher–Yates, returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Letter = "A" | "B" | "C" | "D";
export interface ShownOption {
  letter: Letter;
  text: string;
}
export interface ShuffledQuestion {
  options: ShownOption[];
  /** index into `options` of the correct answer, after shuffling */
  correctIndex: number;
}

/** Shuffle a question's four options and track where the correct one ended up. */
export function shuffleOptions(q: Question, rng: Rng = Math.random): ShuffledQuestion {
  const all: ShownOption[] = [
    { letter: "A", text: q.option_a },
    { letter: "B", text: q.option_b },
    { letter: "C", text: q.option_c },
    { letter: "D", text: q.option_d },
  ];
  const options = shuffle(all, rng);
  return { options, correctIndex: options.findIndex((o) => o.letter === q.answer_letter) };
}

// ---------- lessons ----------

export const UNIT_LESSONS = 4;
export const LESSON_SIZE = 4;
export const LESSON_KEYS = [
  "easy-1",
  "easy-2",
  "easy-3",
  "easy-4",
  "medium-1",
  "medium-2",
  "medium-3",
  "medium-4",
  "boss",
] as const;
export type LessonKey = (typeof LESSON_KEYS)[number];

export function isLessonKey(k: string): k is LessonKey {
  return (LESSON_KEYS as readonly string[]).includes(k);
}

const byId = (a: Question, b: Question) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Slice one career's questions into lessons. Within a career, sort by id; easy 1–4 are easy-1,
 * 5–8 are easy-2… the same for medium; boss is all the hard ones (8).
 */
export function sliceLessons(questions: Question[]): Record<LessonKey, Question[]> {
  const sorted = [...questions].sort(byId);
  const easy = sorted.filter((q) => q.difficulty === "easy");
  const medium = sorted.filter((q) => q.difficulty === "medium");
  const out = { boss: sorted.filter((q) => q.difficulty === "hard") } as Record<LessonKey, Question[]>;
  for (let i = 0; i < UNIT_LESSONS; i++) {
    out[`easy-${i + 1}` as LessonKey] = easy.slice(i * LESSON_SIZE, (i + 1) * LESSON_SIZE);
    out[`medium-${i + 1}` as LessonKey] = medium.slice(i * LESSON_SIZE, (i + 1) * LESSON_SIZE);
  }
  return out;
}

/** The first lesson not yet done, in path order; null if everything is done. */
export function currentLesson(doneKeys: Iterable<string>): LessonKey | null {
  const done = new Set(doneKeys);
  return LESSON_KEYS.find((k) => !done.has(k)) ?? null;
}

/** "Lesson 2 of 4" for easy-2; unit 1 = easy, unit 2 = medium, unit 3 = boss. */
export function lessonPosition(key: LessonKey): { unit: 1 | 2 | 3; index: number; of: number } {
  if (key === "boss") return { unit: 3, index: 1, of: 1 };
  const [kind, n] = key.split("-");
  return { unit: kind === "easy" ? 1 : 2, index: Number(n), of: UNIT_LESSONS };
}

/** XP on offer for a lesson: the sum of its questions' xp (shown as "+40 XP"; finish bonuses come on top). */
export function lessonXpOnOffer(questions: Question[]): number {
  return questions.reduce((s, q) => s + q.xp, 0);
}

/** "Topics" for a unit's guidebook: the distinct standards its questions cite (text before " — "). */
export function unitTopics(questions: Question[]): string[] {
  return [...new Set(questions.map((q) => q.source.split(" — ")[0].trim()).filter(Boolean))];
}

/** Zig-zag offset for the n-th bubble on the path: 0, −40, −70, −40, 0, +40, +70… */
export function pathOffset(i: number): number {
  const cycle = [0, -40, -70, -40, 0, 40, 70, 40];
  return cycle[((i % cycle.length) + cycle.length) % cycle.length];
}

// ---------- Vibe Check ----------

/** The most points each career can earn: per question, the best single answer for that career. */
export function maxPossiblePoints(quiz: VibeQuestion[]): Record<string, number> {
  const max: Record<string, number> = {};
  for (const q of quiz) {
    const best: Record<string, number> = {};
    for (const a of q.answers) for (const [slug, p] of Object.entries(a.points)) best[slug] = Math.max(best[slug] ?? 0, p);
    for (const [slug, p] of Object.entries(best)) max[slug] = (max[slug] ?? 0) + p;
  }
  return max;
}

export interface VibeResult {
  slug: string;
  points: number;
  percent: number;
}

/**
 * Rank careers from the chosen answer index per question (null = timed out).
 * Score = points / maxPossiblePoints(career) × 100. Ties break on raw points, then slug.
 */
export function rankVibeCheck(quiz: VibeQuestion[], picks: (number | null)[]): VibeResult[] {
  const max = maxPossiblePoints(quiz);
  const points: Record<string, number> = Object.fromEntries(Object.keys(max).map((s) => [s, 0]));
  quiz.forEach((q, i) => {
    const pick = picks[i];
    if (pick == null || !q.answers[pick]) return;
    for (const [slug, p] of Object.entries(q.answers[pick].points)) points[slug] += p;
  });
  return Object.keys(max)
    .map((slug) => ({ slug, points: points[slug], percent: Math.round((points[slug] / max[slug]) * 100) }))
    .sort((a, b) => b.percent - a.percent || b.points - a.points || a.slug.localeCompare(b.slug));
}

// ---------- Meet the Jobs ----------

/** One question in a lesson-style round (Meet the Jobs, Boss, test-out). */
export interface RoundItem {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  source?: string;
  careerSlug?: string;
  difficulty?: Question["difficulty"];
  /** true when it's a real bank question that can be flagged (TOO EASY / REPORT) */
  reportable?: boolean;
}

/** Pick `n` warm-up questions at random, always including the chosen career's, in random order. */
export function pickMeetTheJobs(
  all: MeetTheJobsQuestion[],
  chosenSlug: string | null,
  n = 6,
  rng: Rng = Math.random,
): MeetTheJobsQuestion[] {
  const mine = all.find((q) => q.career_slug === chosenSlug);
  const rest = shuffle(
    all.filter((q) => q !== mine),
    rng,
  );
  const picked = mine ? [mine, ...rest.slice(0, n - 1)] : rest.slice(0, n);
  return shuffle(picked, rng);
}

export function meetTheJobsToItem(q: MeetTheJobsQuestion, rng: Rng = Math.random): RoundItem {
  const options = shuffle([q.answer, ...q.distractors], rng);
  return {
    id: q.career_slug,
    prompt: q.prompt,
    options,
    correctIndex: options.indexOf(q.answer),
    careerSlug: q.career_slug,
  };
}

export function questionToItem(q: Question, rng: Rng = Math.random): RoundItem {
  const s = shuffleOptions(q, rng);
  return {
    id: q.id,
    prompt: q.question,
    options: s.options.map((o) => o.text),
    correctIndex: s.correctIndex,
    explanation: q.explanation,
    source: q.source,
    difficulty: q.difficulty,
    reportable: true,
  };
}

// ---------- time ----------

/** Local calendar date, YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

/** Monday 00:00 local time of the week containing `now`. */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d;
}

/** ms until the league resets (next Monday 00:00 local). */
export function msUntilWeeklyReset(now: Date = new Date()): number {
  const next = weekStart(now);
  next.setDate(next.getDate() + 7);
  return next.getTime() - now.getTime();
}

/** "2d 4h", "5h 12m", "3m 9s". */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/** m:ss */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- hearts ----------

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;

/** ms until the next heart regenerates, or null when full. */
export function msUntilNextHeart(hearts: number, heartsUpdatedAt: string, now = Date.now()): number | null {
  if (hearts >= MAX_HEARTS) return null;
  const elapsed = now - new Date(heartsUpdatedAt).getTime();
  return HEART_REGEN_MS - (((elapsed % HEART_REGEN_MS) + HEART_REGEN_MS) % HEART_REGEN_MS);
}

/** Lesson XP shown on the complete screen. */
export function lessonAccuracy(firstTryCorrect: number, total: number): number {
  return total === 0 ? 0 : Math.round((firstTryCorrect / total) * 100);
}

// ---------- Match pairs ----------

export interface PairCard {
  slug: string;
  text: string;
}

/**
 * "Match the job": `n` careers (always including `mustInclude`), job titles on the left and
 * one-liners on the right, each side shuffled independently.
 */
export function pickPairs<T extends { slug: string; job_title: string; one_liner: string }>(
  careers: T[],
  mustInclude: string | null,
  n = 5,
  rng: Rng = Math.random,
): { left: PairCard[]; right: PairCard[] } {
  const mine = careers.find((c) => c.slug === mustInclude);
  const rest = shuffle(
    careers.filter((c) => c !== mine),
    rng,
  );
  const chosen = (mine ? [mine, ...rest] : rest).slice(0, n);
  return {
    left: shuffle(
      chosen.map((c) => ({ slug: c.slug, text: c.job_title })),
      rng,
    ),
    right: shuffle(
      chosen.map((c) => ({ slug: c.slug, text: c.one_liner })),
      rng,
    ),
  };
}

/** Unit test-out ("JUMP HERE?"): `n` questions drawn from the unit, passing needs `pass`. */
export const TEST_OUT_SIZE = 6;
export const TEST_OUT_PASS = 5;
export function pickTestOut(questions: Question[], n = TEST_OUT_SIZE, rng: Rng = Math.random): Question[] {
  return shuffle(questions, rng).slice(0, n);
}
