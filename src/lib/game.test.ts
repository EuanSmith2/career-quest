import { describe, expect, it } from "vitest";
import type { Question } from "@/api/types";
import { VIBE_CHECK } from "@/data/vibeCheck";
import { MEET_THE_JOBS } from "@/data/meetTheJobs";
import { CAREERS } from "@/data/careers";
import { QUESTION_FIXTURES } from "@/data/fixtures/questions";
import {
  addDays,
  bossPassed,
  currentLesson,
  formatCountdown,
  formatDuration,
  lessonPosition,
  maxPossiblePoints,
  msUntilNextHeart,
  msUntilWeeklyReset,
  pathOffset,
  pickMeetTheJobs,
  pickPairs,
  pickTestOut,
  rankVibeCheck,
  shuffleOptions,
  sliceLessons,
  weekStart,
} from "./game";

/** mulberry32 */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const q = (id: string, difficulty: Question["difficulty"], answer_letter: Question["answer_letter"] = "A"): Question => ({
  id,
  career_slug: "x",
  career: "X",
  difficulty,
  xp: 10,
  question: id,
  option_a: "a",
  option_b: "b",
  option_c: "c",
  option_d: "d",
  answer_letter,
  explanation: "",
  source: "",
});

describe("bossPassed", () => {
  it("needs 6 of 8", () => {
    expect(bossPassed(5)).toBe(false);
    expect(bossPassed(6)).toBe(true);
  });
});

describe("shuffleOptions", () => {
  it("tracks the correct option after shuffling", () => {
    for (const letter of ["A", "B", "C", "D"] as const) {
      for (let s = 1; s < 30; s++) {
        const question = { ...q("Q1", "easy", letter), option_a: "A!", option_b: "B!", option_c: "C!", option_d: "D!" };
        const r = shuffleOptions(question, seeded(s));
        expect(r.options).toHaveLength(4);
        expect(r.options[r.correctIndex].text).toBe(`${letter}!`);
        expect(new Set(r.options.map((o) => o.letter)).size).toBe(4);
      }
    }
  });
  it("actually moves the answer around", () => {
    const positions = new Set<number>();
    for (let s = 1; s < 40; s++) positions.add(shuffleOptions(q("Q", "easy", "A"), seeded(s)).correctIndex);
    expect(positions.size).toBe(4);
  });
});

describe("sliceLessons", () => {
  it("sorts by id and slices 4 easy lessons, 4 medium lessons and the boss", () => {
    const qs = [
      ...Array.from({ length: 16 }, (_, i) => q(`E${String(16 - i).padStart(2, "0")}`, "easy")),
      ...Array.from({ length: 16 }, (_, i) => q(`M${String(i + 1).padStart(2, "0")}`, "medium")),
      ...Array.from({ length: 8 }, (_, i) => q(`H${i + 1}`, "hard")),
    ];
    const l = sliceLessons(qs);
    expect(l["easy-1"].map((x) => x.id)).toEqual(["E01", "E02", "E03", "E04"]);
    expect(l["easy-4"].map((x) => x.id)).toEqual(["E13", "E14", "E15", "E16"]);
    expect(l["medium-2"].map((x) => x.id)).toEqual(["M05", "M06", "M07", "M08"]);
    expect(l.boss).toHaveLength(8);
  });
  it("gives every career a full path from the fixtures", () => {
    for (const c of CAREERS) {
      const l = sliceLessons(QUESTION_FIXTURES.filter((x) => x.career_slug === c.slug));
      for (const [key, list] of Object.entries(l)) expect(list.length, `${c.slug} ${key}`).toBe(key === "boss" ? 8 : 4);
    }
  });
});

describe("path helpers", () => {
  it("finds the current lesson", () => {
    expect(currentLesson([])).toBe("easy-1");
    expect(currentLesson(["easy-1", "easy-2", "easy-3", "easy-4"])).toBe("medium-1");
  });
  it("describes a lesson's position", () => {
    expect(lessonPosition("easy-2")).toEqual({ unit: 1, index: 2, of: 4 });
    expect(lessonPosition("boss").unit).toBe(3);
  });
  it("zig-zags in a sine pattern", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(pathOffset)).toEqual([0, -40, -70, -40, 0, 40, 70]);
  });
});

describe("Vibe Check", () => {
  it("computes each career's max from the data", () => {
    const max = maxPossiblePoints(VIBE_CHECK);
    expect(Object.keys(max)).toHaveLength(12);
    expect(max.security_analyst).toBe(2 + 1 + 3 + 1); // game, instagram, tuesday, work
  });
  it("ranks the career whose answers you picked first, at 100%", () => {
    // Every answer that gives security_consultant points
    const picks = VIBE_CHECK.map((qq) => {
      let best = 0;
      qq.answers.forEach((a, i) => {
        if ((a.points.security_consultant ?? 0) > (qq.answers[best].points.security_consultant ?? 0)) best = i;
      });
      return best;
    });
    const r = rankVibeCheck(VIBE_CHECK, picks);
    expect(r[0].slug).toBe("security_consultant");
    expect(r[0].percent).toBe(100);
    expect(r).toHaveLength(12);
  });
  it("handles timeouts", () => {
    const r = rankVibeCheck(VIBE_CHECK, VIBE_CHECK.map(() => null));
    expect(r.every((x) => x.percent === 0)).toBe(true);
  });
});

describe("Meet the Jobs", () => {
  it("picks 6 and always includes the chosen career", () => {
    for (let s = 1; s < 20; s++) {
      const picked = pickMeetTheJobs(MEET_THE_JOBS, "devsecops", 6, seeded(s));
      expect(picked).toHaveLength(6);
      expect(picked.some((x) => x.career_slug === "devsecops")).toBe(true);
      expect(new Set(picked).size).toBe(6);
    }
  });
});

describe("time helpers", () => {
  it("finds Monday", () => {
    const sunday = new Date(2026, 9, 11, 15, 0); // Sun 11 Oct 2026
    expect(weekStart(sunday).getDay()).toBe(1);
    expect(weekStart(sunday).getDate()).toBe(5);
    expect(msUntilWeeklyReset(sunday)).toBe(9 * 3600 * 1000);
  });
  it("formats", () => {
    expect(formatDuration(83_000)).toBe("1:23");
    expect(formatCountdown(2 * 86400_000 + 4 * 3600_000)).toBe("2d 4h");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
  it("counts down to the next heart", () => {
    const now = Date.parse("2026-10-09T12:00:00Z");
    expect(msUntilNextHeart(5, new Date(now).toISOString(), now)).toBeNull();
    expect(msUntilNextHeart(3, new Date(now - 10 * 60_000).toISOString(), now)).toBe(20 * 60_000);
  });
});

describe("Match pairs", () => {
  it("pairs 5 careers including yours, each side shuffled", () => {
    for (let seed = 1; seed < 10; seed++) {
      const { left, right } = pickPairs(CAREERS, "devsecops", 5, seeded(seed));
      expect(left).toHaveLength(5);
      expect(right).toHaveLength(5);
      expect(left.some((c) => c.slug === "devsecops")).toBe(true);
      expect(new Set(left.map((c) => c.slug))).toEqual(new Set(right.map((c) => c.slug)));
    }
  });
});

describe("Test-out", () => {
  it("draws 6 distinct questions", () => {
    const qs = Array.from({ length: 16 }, (_, i) => q(`E${i}`, "easy"));
    const picked = pickTestOut(qs, 6, seeded(3));
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((x) => x.id)).size).toBe(6);
  });
});
