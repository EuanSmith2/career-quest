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
| `completeLesson(p)` | End of a lesson or unit review (`review-1/2`); boss pass (`lesson_key: "boss"`) | +10 XP, +5 if perfect; stores/updates `best_accuracy`; `completed_lessons += 1` the first time |
| `listLessonProgress(slug)` | Path bubble states; out-of-hearts practice pick | Rows from `cq.mock.progress` |
| `claimChest({career_slug, chest_key})` | Opening a chest node on the path (`chest-u1`, `chest-u2`) | +20 XP once; stored as a progress row with that key |
| `unlockUnit({career_slug, unit, accuracy})` | Passing a test-out ("JUMP HERE?" or onboarding "Find my level", 5/6) | Adds progress rows for the unit's lessons + review (not the chest) |
| `refillHeartByPractice` | Finishing a practice lesson (`?practice=1`) | +1 heart, max 5 |
| `buyStreakFreeze` | Profile → Streak freezes | −200 XP, +1 freeze; throws if XP < 200 |
| `issueCertificate({career_slug, score})` | Boss passed (score = % correct) | Creates `CQ-XXXX-XXXX` |
| `getCertificate(id)` | `/certificate/verify/:id` (public) | Looks it up locally (so only works in the same browser) |
| `listMyCertificates` | Certificate page, profile, boss "your best" | Filters by current user |
| `getWeeklyLeaderboard` | /leaderboard, right rail league card | 15 seeded bots (re-seeded each Monday) + you; top 20, plus your row if you're outside it |
| `getWeeklyXp` | Profile chart, streak screen week dots, daily goal | Last 7 days from the XP log, oldest first |
| `getQuests` | `/quests`, Daily Quests card in the right rail | Earn the daily goal, 5 right in a row, a lesson at 90%+; computed from today's stats; `resets_at` = local midnight |
| `listAchievements` | Profile badges grid; "Achievement unlocked" toast | 6 badges computed from progress; `unlocked_at` saved the first time each is earned |
| `submitQuestionFeedback` | TOO EASY · TOO DIFFICULT · REPORT links on every feedback sheet | Appends to `cq.mock.feedback` |
| `syncToNotion` | Profile → Sync to Notion | Waits 1.5 s; `{ok:true}` with **no** `page_url` 4 times in 5 (no real page exists, so the UI shows no link), an error 1 time in 5. The real backend should return the page's URL; the UI then shows "Open in Notion" |
| `battle` | Live Battle (Prompt 2) | `{}` placeholder |
| `serverNow` | Live Battle, if it's built (on hold) | `Date.now()` |
| `resetDemoData?` | Mock-only link in /profile | Clears every `cq.mock.*` key |
| `refillHeartsForDemo?` | Mock-only "Refill hearts to 5 (demo)" on Out of hearts, the hearts popover and /profile | Hearts back to 5. Leave it undefined in the real API and the buttons disappear |

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
- **Path order.** `easy-1, easy-2, chest-u1, easy-3, easy-4, review-1, medium-1, medium-2, chest-u2, medium-3, medium-4, review-2, boss`
  (`PATH` in `src/lib/game.ts`). `listLessonProgress` returns one row per finished key, chests included.
- **Chests / test-outs.** A chest pays 20 XP once. `unlockUnit` must only follow a verified 5/6 test-out.
- **Weekly league unlock.** The UI hides the league until `completed_lessons >= 3`.
- **Boss / certificates.** Pass = 6 of 8 correct. Only issue a certificate for a verified pass. `getCertificate`
  must be readable without auth.
- **Answers are secret.** Ideally don't send `answer_letter` to the browser before the answer is locked. See `lovable-kit/prompt-2C-anti-cheat.md`.

## Loading, empty and error states

| Screen | Call | Loading | Empty | Error |
|---|---|---|---|---|
| `/` landing | `getSession`, `getProfile`, `listCareers` | falls back to static careers | — | — |
| `/start` (onboarding) | `getProfile`, `updateProfile` (starting_level, daily_goal_xp, chosen_career), `listCareers` | Byte thinking + skeletons | — | ErrorState + retry |
| `/test-out/:career/:unit` | `listQuestions`, `recordAnswer`, `unlockUnit` | "Building your test…"; button waits for the unlock | — | ErrorState + retry |
| `/quests` | `getQuests` | Byte thinking + skeletons | locked "More quests unlock soon" row | ErrorState + retry |
| `/match` | (route state from Vibe Check) | "Byte is thinking…" | no ranking → back to `/vibe-check` | — |
| `/vibe-check`, `/warmup/:career` | `listCareers`, `recordAnswer` | — | unknown career → `/start` | — |
| `/learn/:career` | `listQuestions`, `listLessonProgress`, `getProfile` | Byte thinking + skeletons | — | ErrorState + retry |
| `/lesson/:career/:key` | `listQuestions`, `getProfile`, `recordAnswer`, `completeLesson`, `refillHeartByPractice` | Byte thinking + skeletons | 0 hearts → Out of hearts screen | ErrorState + retry |
| `/boss/:career` | `listQuestions`, `listMyCertificates`, `recordAnswer`, `issueCertificate`, `completeLesson` | "Summoning the boss…"; the button shows "Issuing certificate…" | — | ErrorState + retry; "Couldn't issue it" on the button |
| `/certificate/:career` | `listMyCertificates`, `listCareers` | Byte thinking | "No certificate yet" + back to path | ErrorState + retry |
| `/certificate/verify/:id` | `getCertificate` | Byte thinking | "Not found" (Byte shocked) | ErrorState + retry |
| `/leaderboard` | `getWeeklyLeaderboard`, `getProfile` | Byte thinking + skeletons | locked state (< 3 lessons); "No one's here yet" | ErrorState + retry |
| `/profile` | `getProfile`, `getWeeklyXp`, `listMyCertificates`, `listAchievements`, `syncToNotion`, `buyStreakFreeze` | Byte thinking per section | no career / no certificates / no XP this week | ErrorState + retry; freeze error text; Notion error + Try again (Byte wrong) |
| Right rail (≥1024px) | `getProfile`, `getWeeklyXp`, `getWeeklyLeaderboard`, `getQuests` | skeletons | Unlock Leaderboards card; sign-up nudge for guests | — |
| Nickname / email sheets | `startGuest`, `sendMagicLink` | button shows "Starting…" / "Sending…" | — | "Couldn't send the link" |
