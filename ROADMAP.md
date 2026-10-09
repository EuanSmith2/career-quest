# Career Quest roadmap

Build order for the app in `src/`. Each phase is pushed to the `app` branch when it builds and passes its tests.
Decisions from the team are recorded at the bottom.

## Done

### Phase 0 · Prompt 1 app
- [x] Design tokens, ChunkyButton, OptionCard, ProgressBar, SourceChip, StatTile, /styleguide
- [x] `src/api/` layer: types, `CareerQuestApi`, localStorage mock (hearts, XP, streak rules), React Query hooks
- [x] Landing, Start, Vibe Check, Match, Meet the Jobs, path, lesson, Boss, certificate + public verify, leaderboard, profile
- [x] Byte (real component), sound module, `HANDOFF.md`
- [x] **Question bank:** all 480 questions (12 careers × 16 easy / 16 medium / 8 hard) served from `share/questions.csv`.
  The 9 Oct paste was checked against it: same IDs, answer keys and difficulties

## Next (Prompt 1B, without the Kahoot look)

### Phase 1 · Kill the Kahoot
Everything that looked like a live quiz show becomes a Duolingo-style screen.
- [x] Vibe Check: Byte asks each question in his speech bubble, option cards, no timer, no coloured shape tiles; match reveal is typing dots → scratch card
- [x] Meet the Jobs: a normal lesson-style round (option cards, CHECK, feedback sheet), no timer or speed points
- [x] Boss Level: the 8 hard questions as a lesson screen, no hearts lost, 6/8 passes, score = % correct
- [x] End screens use the lesson-complete layout (stat tiles), not a podium
- [x] Delete ArenaRound, AnswerTile, TileShape, Podium, arena + tile tokens, speed-points logic
- [x] Sounds: drop `podium`/`tick`/`time-up`/`join`

### Phase 2 · Midnight theme (default)
- [x] `[data-theme="midnight"]` tokens from 1B §A; Light theme kept behind a toggle in /profile (`cq.theme`)
- [x] Tailwind `darkMode: ['selector', '[data-theme="midnight"]']`; primary actions blue with black text
- [x] Midnight cards/options: 14px radius, icon chip, picked = lift + blue glow; dimmed 0.35
- [ ] Path nodes 72×66 with 8px lip; done = primary blue; locked = dark grey
- [x] Fonts: Instrument Serif italic (one accent word per headline), JetBrains Mono (fine print), wordmark
- [ ] Blur-in reveals, 0.6s crossfades, reduced-motion = fade only
- [x] `it_security` colour → `#e6b400`; SHORT_NAMES updated

### Phase 3 · Onboarding as a conversation
- [ ] Byte top-left with a typing speech bubble; CONTINUE unlocks when typing ends
- [ ] Top progress bar + back arrow (stepper)
- [ ] Screens: How much cyber do you know (signal bars) → daily goal → what you'll achieve → start from scratch / find my level → career grid
- [ ] Saves `starting_level` and `daily_goal_xp` via `updateProfile`

### Phase 4 · Lesson details
- [x] Coloured tag with icon (NEW CONCEPT / HARD), 32px question, number-key badges bottom-right
- [x] SKIP + CHECK bottom bar; progress bar knob that glows and pulses
- [x] Correct: particle burst on the card, random praise with sparkles; Wrong: heart shakes, "Correct solution:"
- [x] TOO EASY · TOO DIFFICULT · REPORT links (report form + "Thanks, we'll check it" toast)
- [x] Match pairs exercise once per lesson (5 jobs ↔ 5 one-liners, 400 ms lockout, wrong pair costs a heart)
- [x] Quit modal copy from 1B

### Phase 5 · Path details
- [ ] Sticky unit header that recolours per unit; divider labels between units
- [ ] JUMP HERE? node at each locked unit → 6-question test-out, 5/6 unlocks (same flow as "Find my level")
- [ ] Node types: lesson · chest (+20 XP after lesson 2) · trophy (unit review) · final test
- [ ] Border beam on the current node; floating ↑ button back to it
- [ ] API: `claimChest`, `unlockUnit`

### Phase 6 · Rail, quests, leaderboard
- [x] Number tickers; stat popovers (streak calendar, XP history, heart timer)
- [ ] Unlock Leaderboards card (until 3 lessons), sign-up nudge for guests
- [ ] Daily Quests card + `/quests` page (Byte with chest, monthly challenge badge)
- [ ] Leaderboard locked state (3 league shields over grey rows)
- [ ] API: quests "Earn 30 XP", "Get 5 in a row right", "Finish a lesson with 90%+"

### Phase 7 · Landing in Midnight
- [ ] Jargon "noise" backdrop, headline "You want a job in cyber. Where do you even start?"
- [ ] Optional once-per-session intro (blue dot → wipe), skipped for reduced motion
- [ ] Three split sections with mini demos; closing block with Byte waving and the wordmark
- [ ] Orbiting career icons, marquee career strip

### Phase 8 · Profile + achievements
- [ ] Points chart, achievements grid, "Achievement unlocked" toast
- [ ] API: `listAchievements`

### Phase 9 · Wrap-up
- [ ] Update `HANDOFF.md` with new API methods and states
- [ ] Walkthrough on 390px / tablet / desktop in both themes, reduced motion on

## Later prompts
- **Prompt 2 Live Battle**: on hold. It was a Kahoot-style host screen + PIN join, which conflicts with "kill the Kahoot". Needs a team decision before building
- **Prompt 3** polish + `/quests` extras · **Prompt 4** Notion sync (UI exists, mock only) · **Prompt 5** questions from Notion

## Decisions
- **9 Oct · Kill the Kahoot.** Remove anything that looks like Kahoot (dark arena, countdowns, 4 coloured shape tiles,
  speed points, podium). Vibe Check, Meet the Jobs and the Boss become Duolingo-style screens
- **9 Oct · 21st.dev components.** 1B lists 21st.dev components. Where one only fits the Kahoot look (flickering grid,
  podium, animated lobby list) it's dropped. The rest (border beam, number ticker, marquee, typing animation, sparkles
  text, cool mode, orbiting circles) are written in-repo as small token-styled components. They work offline, and
  21st.dev needs an account to install
- **9 Oct · Questions.** The bank stays `share/questions.csv` (480 rows, all 12 careers)
