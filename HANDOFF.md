# Backend handoff

The app is UI-only. Every read and write goes through one interface, `CareerQuestApi` (`src/api/client.ts`).
Components only import hooks from `src/api/hooks.ts`. Today those hooks call a working mock (`src/api/mock.ts`,
localStorage + 150–400 ms fake latency).

**To connect: implement CareerQuestApi in src/api/real.ts and change the one export line in src/api/index.ts.**

```ts
// src/api/index.ts
export const api: CareerQuestApi = mockApi;   // → realApi
```

Nothing else needs to change. Leave `resetDemoData` undefined in the real API, and the "Reset demo data" link in
/profile disappears.

## Types match the data

`Question` has exactly the columns of `share/questions.csv` (`id, career_slug, career, difficulty, xp, question,
option_a…d, answer_letter, explanation, source`). `Career` has exactly the columns of the careers table
(`src/data/careers.ts` is the seed). Return rows unchanged; the UI does the sorting, slicing and option shuffling
(`src/lib/game.ts`).

The mock serves the real 480-question bank (bundled from `share/questions.csv`). It pads any gaps with labelled
placeholders, so every career always has 16 easy, 16 medium and 8 hard questions.

## Methods

| Method | What the UI calls it for | What the mock does |
|---|---|---|
| `getSession` | Decide whether to show the nickname sheet | Reads `cq.mock.session`, or null |
| `startGuest(nickname)` | Nickname sheet on first visit / GET STARTED | Creates (or renames) a guest user + profile |
| `sendMagicLink(email)` | "Save your progress" and "I already have an account" sheets | Pretends it sent the link and you clicked it: same user, `is_guest=false`, email stored |
| `signOut` | (not wired in Prompt 1) | Clears the session |
| `listCareers` | Landing strip, /start grid, match, path header, certificate | Returns `CAREERS` |
| `listQuestions({career_slug, difficulty?})` | Path (XP on offer, guidebook topics), lesson, boss | Filters the bundled question bank |
| `getProfile` | Top bar, right rail, lesson hearts, profile | Applies heart regen + streak expiry, then returns the profile. Creates a guest if none |
| `updateProfile(patch)` | Picking a career, opening a path, edit name, daily goal | Merges the patch |
| `recordAnswer(a)` | Every lesson / boss / warm-up answer | Correct: adds `xp_earned`, updates streak. Wrong in `lesson` mode: −1 heart |
| `completeLesson(p)` | End of a lesson; boss pass (`lesson_key: "boss"`) | +10 XP, +5 if perfect; stores/updates `best_accuracy`; `completed_lessons += 1` the first time |
| `listLessonProgress(slug)` | Path bubble states; out-of-hearts practice pick | Rows from `cq.mock.progress` |
| `refillHeartByPractice` | Finishing a practice lesson (`?practice=1`) | +1 heart, max 5 |
| `buyStreakFreeze` | Profile → Streak freezes | −200 XP, +1 freeze; throws if XP < 200 |
| `issueCertificate({career_slug, score})` | Boss passed (score = % correct) | Creates `CQ-XXXX-XXXX` |
| `getCertificate(id)` | `/certificate/verify/:id` (public) | Looks it up locally (so only works in the same browser) |
| `listMyCertificates` | Certificate page, profile, boss "your best" | Filters by current user |
| `getWeeklyLeaderboard` | /leaderboard, right rail league card | 15 seeded bots (re-seeded each Monday) + you; top 20, plus your row if you're outside it |
| `getWeeklyXp` | Profile chart, streak screen week dots, daily goal | Last 7 days from the XP log, oldest first |
| `getQuests` | (not shown yet; Prompt 3 `/quests`) | 3 daily quests computed from today's stats |
| `submitQuestionFeedback` | Flag button on the lesson feedback sheet | Appends to `cq.mock.feedback` |
| `syncToNotion` | Profile → Sync to Notion | Waits 1.5 s; `{ok:true, page_url}` 4 times in 5, an error 1 time in 5 |
| `battle` | Live Battle (Prompt 2) | `{}` placeholder |
| `serverNow` | Arena clocks once Live Battle lands | `Date.now()` |
| `resetDemoData?` | Mock-only link in /profile | Clears every `cq.mock.*` key |

## Rules the backend must enforce

The UI shows what the API returns (it may animate a heart loss early, but the server value wins).

- **Hearts.** Max 5. −1 per wrong answer in `mode: "lesson"` (not boss, warm-up or practice). +1 every 30 min
  from `hearts_updated_at`. The clock starts when the first heart is lost and resets when full. +1 from
  `refillHeartByPractice`. Return the regenerated value from `getProfile`.
- **XP.** The question's `xp` (10/20/30) for a first-try correct answer. The client sends `xp_earned`, but the server
  should check it against the question and against first-try (don't trust the client). +10 for finishing a lesson,
  +5 more if perfect.
- **Streak.** +1 when the user earns XP on a new local calendar day (yesterday → today). Missing a day resets it
  to 0, unless streak freezes cover the missed days (consume one per day).
- **Weekly leaderboard.** Window = Monday 00:00 → next Monday, in the user's local time (the UI countdown
  assumes this). Return the top 20 plus the caller's own row.
- **Boss / certificates.** Pass = 6 of 8 correct. Only issue a certificate for a verified pass. `getCertificate`
  must be readable without auth.
- **Answers are secret.** For Live Battle (and ideally lessons), don't send `answer_letter` to the browser before
  the answer is locked. See `lovable-kit/prompt-2C-anti-cheat.md`.

## Loading, empty and error states

| Screen | Call | Loading | Empty | Error |
|---|---|---|---|---|
| `/` landing | `getSession`, `getProfile`, `listCareers` | falls back to static careers | — | — |
| `/start` | `listCareers` | Byte thinking + skeletons | — | ErrorState + retry |
| `/match` | (route state from Vibe Check) | "Byte is thinking…" | no ranking → back to `/vibe-check` | — |
| `/warmup/:career` | `listCareers`, `recordAnswer` | — | unknown career → `/start` | — |
| `/learn/:career` | `listQuestions`, `listLessonProgress`, `getProfile` | Byte thinking + skeletons | — | ErrorState + retry |
| `/lesson/:career/:key` | `listQuestions`, `getProfile`, `recordAnswer`, `completeLesson`, `refillHeartByPractice` | Byte thinking + skeletons | 0 hearts → Out of hearts screen | ErrorState + retry |
| `/boss/:career` | `listQuestions`, `listMyCertificates`, `recordAnswer`, `issueCertificate`, `completeLesson` | "Summoning the boss…"; CONTINUE shows "Issuing certificate…" | — | ErrorState + retry; "Couldn't issue it" on the button |
| `/certificate/:career` | `listMyCertificates`, `listCareers` | Byte thinking | "No certificate yet" + back to path | ErrorState + retry |
| `/certificate/verify/:id` | `getCertificate` | Byte thinking | "Not found" (Byte shocked) | ErrorState + retry |
| `/leaderboard` | `getWeeklyLeaderboard`, `getProfile` | Byte thinking + skeletons | "No one's here yet" | ErrorState + retry |
| `/profile` | `getProfile`, `getWeeklyXp`, `listMyCertificates`, `syncToNotion`, `buyStreakFreeze` | Byte thinking per section | no career / no certificates / no XP this week | ErrorState + retry; freeze error text; Notion error + Try again (Byte wrong) |
| Right rail (≥1024px) | `getProfile`, `getWeeklyXp`, `getWeeklyLeaderboard` | skeletons | — | — |
| Nickname / email sheets | `startGuest`, `sendMagicLink` | button shows "Starting…" / "Sending…" | — | "Couldn't send the link" |
