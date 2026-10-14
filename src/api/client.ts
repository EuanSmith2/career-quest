import type {
  Achievement,
  AnswerRecord,
  BattleApi,
  Career,
  Certificate,
  DayXp,
  Difficulty,
  FeedbackKind,
  LeaderboardRow,
  LessonProgress,
  NotionSyncResult,
  Profile,
  Quest,
  Question,
  Session,
} from "./types";

/**
 * Everything the UI reads or writes goes through this interface. The mock (mock.ts) implements it
 * against localStorage; the real backend implements it in real.ts. Comments say what the real
 * backend must do.
 */
export interface CareerQuestApi {
  // ---------- session (guest first; magic link upgrades the same user) ----------

  /** Current session, or null if this browser has never started one. */
  getSession(): Promise<Session | null>;
  /** Create an anonymous user + profile with this nickname as display_name. Must not require email. */
  startGuest(nickname: string): Promise<Session>;
  /** Email a magic link. Signing in with it must upgrade the current guest user in place (keep user_id and progress). */
  sendMagicLink(email: string): Promise<void>;
  /** End the session. */
  signOut(): Promise<void>;

  // ---------- content (read-only for clients) ----------

  /** The 12 careers (careers table, same columns as src/data/careers.ts). */
  listCareers(): Promise<Career[]>;
  /** Questions for a career, optionally one difficulty. Rows exactly as in questions.csv. */
  listQuestions(q: { career_slug: string; difficulty?: Difficulty }): Promise<Question[]>;

  // ---------- profile + progress (owner only) ----------

  /** The caller's profile, with heart regeneration (1 per 30 min) and streak expiry already applied. */
  getProfile(): Promise<Profile>;
  /** Update the editable profile fields. */
  updateProfile(
    patch: Partial<Pick<Profile, "display_name" | "chosen_career" | "daily_goal_xp" | "starting_level">>,
  ): Promise<Profile>;
  /** Record one answer. Applies XP, hearts (−1 per wrong lesson answer), streak and regen rules. Returns the new profile. */
  recordAnswer(a: AnswerRecord): Promise<Profile>;
  /** Mark a lesson done: +10 XP for finishing, +5 if perfect. Store best_accuracy. */
  completeLesson(p: {
    career_slug: string;
    lesson_key: string;
    accuracy: number;
    perfect: boolean;
  }): Promise<{ profile: Profile; xp_bonus: number }>;
  /** Completed lessons for a career (one row per lesson_key). */
  listLessonProgress(career_slug: string): Promise<LessonProgress[]>;
  /** Open a path chest (lesson_key "chest-u1" / "chest-u2"): +20 XP once, recorded as a progress row. */
  claimChest(p: { career_slug: string; chest_key: string }): Promise<{ profile: Profile; xp: number }>;
  /** A passed test-out (5/6) or "Find my level": mark every lesson in the unit done. Must verify the pass server-side. */
  unlockUnit(p: { career_slug: string; unit: 1 | 2; accuracy: number }): Promise<LessonProgress[]>;
  /** +1 heart (max 5) after a finished practice lesson. */
  refillHeartByPractice(): Promise<Profile>;
  /** Spend 200 XP for one streak freeze. Must reject if the user has < 200 XP. */
  buyStreakFreeze(): Promise<Profile>;

  // ---------- certificates (public read by id) ----------

  /** Issue a certificate for a passed boss round. Must verify the pass server-side. */
  issueCertificate(p: { career_slug: string; score: number }): Promise<Certificate>;
  /** Public, unauthenticated read by id. null if it doesn't exist. */
  getCertificate(id: string): Promise<Certificate | null>;
  /** The caller's certificates, newest first. */
  listMyCertificates(): Promise<Certificate[]>;

  // ---------- social + stats ----------

  /** Weekly XP league (window starts Monday 00:00). Top 20, plus the caller's own row if outside it. */
  getWeeklyLeaderboard(): Promise<LeaderboardRow[]>;
  /** The caller's XP per day for the last 7 days, oldest first. */
  getWeeklyXp(): Promise<DayXp[]>;
  /** Today's quests with progress: earn the daily goal, 5 right in a row, a lesson at 90%+. */
  getQuests(): Promise<Quest[]>;
  /** Badges with progress; unlocked_at is set the first time each is earned. */
  listAchievements(): Promise<Achievement[]>;

  // ---------- crowd-verification ----------

  /** Store a player's flag on a question (too easy, wrong answer, bad source…). */
  submitQuestionFeedback(f: { question_id: string; kind: FeedbackKind }): Promise<void>;

  // ---------- sponsor feature ----------

  /** Push the caller's progress to their Notion page. */
  syncToNotion(): Promise<NotionSyncResult>;

  // ---------- live battle ----------

  battle: BattleApi;
  /** ms epoch from the server clock; the mock returns Date.now(). */
  serverNow(): number;

  // ---------- mock only ----------

  /** Wipe all demo data. Only the mock implements this; the real backend leaves it undefined. */
  resetDemoData?(): Promise<void>;
  /** Demo helper: hearts back to 5 so a presenter is never stuck. Only the mock implements this. */
  refillHeartsForDemo?(): Promise<Profile>;
}
