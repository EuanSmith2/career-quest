// All shared types. Field names deliberately match the future database and questions.csv,
// so the backend can return rows unchanged.

export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "lesson" | "boss" | "warmup" | "practice";

export interface Career {
  slug: string;
  name: string;
  job_title: string;
  icon: string;
  color: string;
  one_liner: string;
  day_to_day: string;
  tools: string;
  next_cert: string;
  thm_path: string | null;
}

export interface Question {
  // identical columns to questions.csv
  id: string;
  career_slug: string;
  career: string;
  difficulty: Difficulty;
  xp: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_letter: "A" | "B" | "C" | "D";
  explanation: string;
  source: string;
}

export interface Session {
  user_id: string;
  is_guest: boolean;
  email: string | null;
}

export interface Profile {
  user_id: string;
  display_name: string;
  is_guest: boolean;
  chosen_career: string | null;
  xp: number;
  streak: number;
  last_active: string | null; // ISO date
  hearts: number;
  hearts_updated_at: string;
  daily_goal_xp: 10 | 20 | 30 | 40;
  starting_level: 0 | 1 | 2 | 3 | 4;
  streak_freezes: number;
  completed_lessons: number;
}

export interface AnswerRecord {
  question_id: string;
  correct: boolean;
  xp_earned: number;
  mode: Mode;
}

export interface LessonProgress {
  career_slug: string;
  lesson_key: string;
  completed_at: string;
  best_accuracy: number;
}

export interface Certificate {
  id: string;
  user_id: string;
  display_name: string;
  career_slug: string;
  score: number;
  issued_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  weekly_xp: number;
  rank: number;
}

export interface DayXp {
  date: string;
  xp: number;
} // 7 entries, oldest first

export interface Quest {
  id: string;
  title: string;
  progress: number;
  target: number;
  reward_xp: number;
  claimed: boolean;
}

export type FeedbackKind =
  | "too_easy"
  | "too_difficult"
  | "report_wrong_answer"
  | "report_bad_source"
  | "report_typo"
  | "report_other";

export interface NotionSyncResult {
  ok: boolean;
  page_url?: string;
  error?: string;
}

// Live Battle types are in Prompt 2. Placeholder so the interface compiles until then.
export type BattleApi = Record<string, never>;
