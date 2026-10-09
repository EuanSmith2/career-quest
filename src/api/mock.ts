import type { CareerQuestApi } from "./client";
import type {
  Achievement,
  AnswerRecord,
  Certificate,
  DayXp,
  FeedbackKind,
  LeaderboardRow,
  LessonProgress,
  Profile,
  Quest,
  Session,
} from "./types";
import { CAREERS } from "@/data/careers";
import { addDays, CHEST_XP, HEART_REGEN_MS, localDateKey, MAX_HEARTS, unitLessonKeys, weekStart } from "@/lib/game";

/**
 * Working mock of CareerQuestApi: localStorage + in-memory, 150–400 ms simulated latency.
 * Implements the hearts, XP and streak rules so the UI behaves like the real thing.
 * Every key is prefixed `cq.mock.`.
 */

const PREFIX = "cq.mock.";
const memory = new Map<string, string>(); // fallback when localStorage is unavailable

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFIX + key);
  } catch {
    raw = memory.get(PREFIX + key) ?? null;
  }
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(PREFIX + key, raw);
  } catch {
    memory.set(PREFIX + key, raw);
  }
}

function clearAll() {
  memory.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing persisted */
  }
}

const latency = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
async function respond<T>(fn: () => T): Promise<T> {
  await latency();
  // structuredClone so callers can't mutate stored state
  return structuredClone(fn());
}

// The question bank is ~270 KB; load it on first use so it stays out of the main bundle.
const loadQuestions = () => import("@/data/fixtures/questions").then((m) => m.QUESTION_FIXTURES);

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();

// ---------- stored shapes ----------

interface XpEntry {
  date: string; // local YYYY-MM-DD
  xp: number;
}
interface League {
  week: string; // Monday's date key
  rows: { user_id: string; display_name: string; weekly_xp: number }[];
}
interface DayStats {
  date: string;
  answered: number;
  lessons: number;
  xp: number;
  run: number; // current correct-in-a-row
  bestRun: number;
  bestAccuracy: number; // best lesson accuracy today
}
const emptyDay = (date: string): DayStats => ({ date, answered: 0, lessons: 0, xp: 0, run: 0, bestRun: 0, bestAccuracy: 0 });

function today(): DayStats {
  const d = localDateKey();
  const s = read<DayStats>("today", emptyDay(d));
  return s.date === d ? { ...emptyDay(d), ...s } : emptyDay(d);
}

// ---------- profile rules ----------

function freshProfile(user_id: string, display_name: string): Profile {
  return {
    user_id,
    display_name,
    is_guest: true,
    chosen_career: null,
    xp: 0,
    streak: 0,
    last_active: null,
    hearts: MAX_HEARTS,
    hearts_updated_at: nowIso(),
    daily_goal_xp: 30,
    starting_level: 0,
    streak_freezes: 0,
    completed_lessons: 0,
  };
}

function ensureSession(): Session {
  let s = read<Session | null>("session", null);
  if (!s) {
    // Nothing is gated behind sign-up: a call that needs a user quietly creates a guest.
    s = { user_id: uid("guest"), is_guest: true, email: null };
    write("session", s);
    write("profile", freshProfile(s.user_id, `Guest ${Math.floor(1000 + Math.random() * 9000)}`));
  }
  return s;
}

/** Hearts regenerate 1 per 30 min; a missed day breaks the streak unless a freeze covers it. */
function applyPassiveRules(p: Profile, now = Date.now()): Profile {
  if (p.hearts < MAX_HEARTS) {
    const since = new Date(p.hearts_updated_at).getTime();
    const regen = Math.floor((now - since) / HEART_REGEN_MS);
    if (regen > 0) {
      p.hearts = Math.min(MAX_HEARTS, p.hearts + regen);
      p.hearts_updated_at = p.hearts >= MAX_HEARTS ? new Date(now).toISOString() : new Date(since + regen * HEART_REGEN_MS).toISOString();
    }
  }
  if (p.last_active && p.streak > 0) {
    const today = localDateKey(new Date(now));
    const yesterday = addDays(today, -1);
    if (p.last_active < yesterday) {
      let missed = 0;
      for (let d = addDays(p.last_active, 1); d < today; d = addDays(d, 1)) missed++;
      if (p.streak_freezes >= missed) {
        p.streak_freezes -= missed;
        p.last_active = yesterday;
      } else {
        p.streak = 0;
      }
    }
  }
  return p;
}

function loadProfile(): Profile {
  ensureSession();
  const p = applyPassiveRules(read<Profile>("profile", freshProfile("guest", "Guest")));
  write("profile", p);
  return p;
}

function bumpToday(patch: { answered?: number; lessons?: number; xp?: number; correct?: boolean; accuracy?: number }) {
  const s = today();
  s.answered += patch.answered ?? 0;
  s.lessons += patch.lessons ?? 0;
  s.xp += patch.xp ?? 0;
  if (patch.correct !== undefined) {
    s.run = patch.correct ? s.run + 1 : 0;
    s.bestRun = Math.max(s.bestRun, s.run);
  }
  if (patch.accuracy !== undefined) s.bestAccuracy = Math.max(s.bestAccuracy, patch.accuracy);
  write("today", s);
}

function nextMidnight(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

function addXp(p: Profile, amount: number) {
  if (amount <= 0) return;
  p.xp += amount;
  const today = localDateKey();
  if (p.last_active !== today) {
    p.streak = p.last_active === addDays(today, -1) ? p.streak + 1 : 1;
    p.last_active = today;
  }
  const log = read<XpEntry[]>("xplog", []);
  const entry = log.find((e) => e.date === today);
  if (entry) entry.xp += amount;
  else log.push({ date: today, xp: amount });
  write("xplog", log.slice(-60));
  bumpToday({ xp: amount });
}

// ---------- league ----------

const FAKE_NAMES = [
  "Aoife", "Cian", "Niamh", "Oisín", "Saoirse", "Darragh", "Ciara", "Fionn", "Róisín",
  "Tadhg", "Emma", "Liam", "Zara", "Kofi", "Mei", "Arjun", "Lena", "Mateo",
];

function league(): League {
  const week = localDateKey(weekStart());
  let l = read<League | null>("league", null);
  if (!l || l.week !== week) {
    const dayOfWeek = (new Date().getDay() + 6) % 7; // 0 = Monday
    const scale = 0.3 + dayOfWeek / 7;
    l = {
      week,
      rows: FAKE_NAMES.slice(0, 15).map((name, i) => ({
        user_id: `bot_${i}`,
        display_name: `${name} ${String.fromCharCode(65 + ((i * 7) % 26))}.`,
        weekly_xp: Math.round((40 + Math.random() * 600) * scale),
      })),
    };
    write("league", l);
  }
  return l;
}

function myWeeklyXp(): number {
  const start = localDateKey(weekStart());
  return read<XpEntry[]>("xplog", [])
    .filter((e) => e.date >= start)
    .reduce((s, e) => s + e.xp, 0);
}

// ---------- the mock ----------

export const mockApi: CareerQuestApi = {
  // session
  getSession: () => respond(() => read<Session | null>("session", null)),

  startGuest: (nickname) =>
    respond(() => {
      const existing = read<Session | null>("session", null);
      const session = existing ?? { user_id: uid("guest"), is_guest: true, email: null };
      write("session", session);
      const p = read<Profile | null>("profile", null) ?? freshProfile(session.user_id, nickname);
      p.display_name = nickname.trim().slice(0, 24) || p.display_name;
      write("profile", p);
      return session;
    }),

  sendMagicLink: (email) =>
    respond(() => {
      // The mock pretends the email was sent and the link clicked: same user, now with an email.
      const s = ensureSession();
      write("session", { ...s, email, is_guest: false });
      const p = loadProfile();
      p.is_guest = false;
      write("profile", p);
    }),

  signOut: () => respond(() => write("session", null)),

  // content
  listCareers: () => respond(() => CAREERS),

  listQuestions: async ({ career_slug, difficulty }) => {
    const all = await loadQuestions();
    return respond(() => all.filter((q) => q.career_slug === career_slug && (!difficulty || q.difficulty === difficulty)));
  },

  // profile + progress
  getProfile: () => respond(loadProfile),

  updateProfile: (patch) =>
    respond(() => {
      const p = { ...loadProfile(), ...patch };
      write("profile", p);
      return p;
    }),

  recordAnswer: (a: AnswerRecord) =>
    respond(() => {
      const p = loadProfile();
      if (a.correct) {
        addXp(p, Math.max(0, a.xp_earned));
      } else if (a.mode === "lesson" && p.hearts > 0) {
        if (p.hearts === MAX_HEARTS) p.hearts_updated_at = nowIso(); // regen clock starts on the first lost heart
        p.hearts -= 1;
      }
      bumpToday({ answered: 1, correct: a.correct });
      write("profile", p);
      return p;
    }),

  completeLesson: ({ career_slug, lesson_key, accuracy, perfect }) =>
    respond(() => {
      const p = loadProfile();
      const xp_bonus = 10 + (perfect ? 5 : 0);
      addXp(p, xp_bonus);
      const all = read<LessonProgress[]>("progress", []);
      const row = all.find((r) => r.career_slug === career_slug && r.lesson_key === lesson_key);
      if (row) {
        row.best_accuracy = Math.max(row.best_accuracy, accuracy);
        row.completed_at = nowIso();
      } else {
        all.push({ career_slug, lesson_key, completed_at: nowIso(), best_accuracy: accuracy });
        p.completed_lessons += 1;
      }
      write("progress", all);
      write("profile", p);
      bumpToday({ lessons: 1, accuracy });
      return { profile: p, xp_bonus };
    }),

  claimChest: ({ career_slug, chest_key }) =>
    respond(() => {
      const p = loadProfile();
      const all = read<LessonProgress[]>("progress", []);
      if (all.some((r) => r.career_slug === career_slug && r.lesson_key === chest_key)) return { profile: p, xp: 0 };
      addXp(p, CHEST_XP);
      all.push({ career_slug, lesson_key: chest_key, completed_at: nowIso(), best_accuracy: 100 });
      write("progress", all);
      write("profile", p);
      return { profile: p, xp: CHEST_XP };
    }),

  unlockUnit: ({ career_slug, unit, accuracy }) =>
    respond(() => {
      const all = read<LessonProgress[]>("progress", []);
      for (const key of unitLessonKeys(unit)) {
        if (!all.some((r) => r.career_slug === career_slug && r.lesson_key === key))
          all.push({ career_slug, lesson_key: key, completed_at: nowIso(), best_accuracy: accuracy });
      }
      write("progress", all);
      return all.filter((r) => r.career_slug === career_slug);
    }),

  listLessonProgress: (career_slug) =>
    respond(() => read<LessonProgress[]>("progress", []).filter((r) => r.career_slug === career_slug)),

  refillHeartByPractice: () =>
    respond(() => {
      const p = loadProfile();
      p.hearts = Math.min(MAX_HEARTS, p.hearts + 1);
      if (p.hearts === MAX_HEARTS) p.hearts_updated_at = nowIso();
      write("profile", p);
      return p;
    }),

  buyStreakFreeze: async () => {
    await latency();
    const p = loadProfile();
    if (p.xp < 200) throw new Error("You need 200 XP to buy a streak freeze.");
    p.xp -= 200;
    p.streak_freezes += 1;
    write("profile", p);
    return structuredClone(p);
  },

  // certificates
  issueCertificate: ({ career_slug, score }) =>
    respond(() => {
      const p = loadProfile();
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const cert: Certificate = {
        id: `CQ-${code.slice(0, 4)}-${code.slice(4, 8)}`,
        user_id: p.user_id,
        display_name: p.display_name,
        career_slug,
        score,
        issued_at: nowIso(),
      };
      write("certs", [cert, ...read<Certificate[]>("certs", [])]);
      return cert;
    }),

  getCertificate: (id) => respond(() => read<Certificate[]>("certs", []).find((c) => c.id === id) ?? null),

  listMyCertificates: () =>
    respond(() => {
      const me = read<Session | null>("session", null)?.user_id;
      return read<Certificate[]>("certs", []).filter((c) => c.user_id === me);
    }),

  // social + stats
  getWeeklyLeaderboard: () =>
    respond(() => {
      const p = loadProfile();
      const all = [...league().rows, { user_id: p.user_id, display_name: p.display_name, weekly_xp: myWeeklyXp() }]
        .sort((a, b) => b.weekly_xp - a.weekly_xp)
        .map((r, i): LeaderboardRow => ({ ...r, rank: i + 1 }));
      const top = all.slice(0, 20);
      const mine = all.find((r) => r.user_id === p.user_id);
      return mine && !top.includes(mine) ? [...top, mine] : top;
    }),

  getWeeklyXp: () =>
    respond(() => {
      const log = read<XpEntry[]>("xplog", []);
      const today = localDateKey();
      return Array.from({ length: 7 }, (_, i): DayXp => {
        const date = addDays(today, i - 6);
        return { date, xp: log.find((e) => e.date === date)?.xp ?? 0 };
      });
    }),

  getQuests: () =>
    respond(() => {
      const p = loadProfile();
      const t = today();
      const resets_at = nextMidnight();
      const quests: Quest[] = [
        { id: "daily-xp", title: `Earn ${p.daily_goal_xp} XP`, progress: Math.min(t.xp, p.daily_goal_xp), target: p.daily_goal_xp, reward_xp: 10, claimed: false, resets_at },
        { id: "daily-run", title: "Get 5 in a row right", progress: Math.min(t.bestRun, 5), target: 5, reward_xp: 15, claimed: false, resets_at },
        { id: "daily-90", title: "Finish a lesson with 90%+", progress: t.bestAccuracy >= 90 ? 1 : 0, target: 1, reward_xp: 15, claimed: false, resets_at },
      ];
      return quests;
    }),

  listAchievements: () =>
    respond(() => {
      const p = loadProfile();
      const progress = read<LessonProgress[]>("progress", []);
      const certs = read<Certificate[]>("certs", []).filter((c) => c.user_id === p.user_id);
      const lessons = progress.filter((r) => !r.lesson_key.startsWith("chest"));
      const chests = progress.filter((r) => r.lesson_key.startsWith("chest")).length;
      const perfect = lessons.some((r) => r.best_accuracy === 100) ? 1 : 0;
      const defs: Omit<Achievement, "unlocked_at">[] = [
        { id: "first-lesson", title: "First steps", description: "Finish your first lesson", icon: "🎯", progress: Math.min(lessons.length, 1), target: 1 },
        { id: "perfect", title: "Flawless", description: "Finish a lesson with no mistakes", icon: "💎", progress: perfect, target: 1 },
        { id: "streak-3", title: "On fire", description: "Reach a 3 day streak", icon: "🔥", progress: Math.min(p.streak, 3), target: 3 },
        { id: "xp-100", title: "Century", description: "Earn 100 XP", icon: "⚡", progress: Math.min(p.xp, 100), target: 100 },
        { id: "chest", title: "Treasure hunter", description: "Open a chest on the path", icon: "🎁", progress: Math.min(chests, 1), target: 1 },
        { id: "boss", title: "Boss slayer", description: "Pass a Boss Level", icon: "🏆", progress: Math.min(certs.length, 1), target: 1 },
      ];
      // remember when each was first earned
      const seen = read<Record<string, string>>("achievements", {});
      for (const d of defs) if (d.progress >= d.target && !seen[d.id]) seen[d.id] = nowIso();
      write("achievements", seen);
      return defs.map((d) => ({ ...d, unlocked_at: seen[d.id] ?? null }));
    }),

  // crowd-verification
  submitQuestionFeedback: (f: { question_id: string; kind: FeedbackKind }) =>
    respond(() => {
      write("feedback", [...read<unknown[]>("feedback", []), { ...f, at: nowIso() }]);
    }),

  // sponsor feature (Prompt 4)
  syncToNotion: async () => {
    await new Promise((r) => setTimeout(r, 1500));
    return Math.random() < 0.2
      ? { ok: false, error: "Notion didn't respond. Try again in a moment." }
      : { ok: true }; // no page_url: there's no real Notion page behind the mock, so the UI shows no link
  },

  // live battle (Prompt 2)
  battle: {},
  serverNow: () => Date.now(),

  // mock only
  refillHeartsForDemo: () =>
    respond(() => {
      const p = loadProfile();
      p.hearts = MAX_HEARTS;
      p.hearts_updated_at = nowIso();
      write("profile", p);
      return p;
    }),

  resetDemoData: async () => {
    clearAll();
  },
};
