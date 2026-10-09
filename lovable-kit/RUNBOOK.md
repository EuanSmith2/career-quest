# Hackathon day: Career Quest in Lovable

Fri 9 Oct, 13:00–20:00. Everything here is ready; this is the order to do it in.

## Timeline
| Time | Do |
|---|---|
| 13:40 | Notion HQ intro: note any **prize categories** and the **submission format**. Ask an organiser if they're not said |
| 14:00 | Team formed. Split roles (see `NOTION-HQ.md`). Paste HQ text straight away |
| 14:20 | Prompt 1 goes in the minute building opens |
| ~14:40 | Byte installed, then 1B → 2 → **2B (demo round)** → import CSV |
| 16:00 | Lunch: run the 10-question demo round with people from other teams. Count how many played and ask one question ("did you know what a pen tester does day to day?"). Those numbers go in the pitch |
| ~16:20 | Prompt 3 → Prompt 4 (Notion) |
| 17:15 | **Feature freeze.** Screen-record a 60s demo as backup. Rehearse `PITCH.md` once, out loud, timed |
| 17:35 | Submit: Lovable URL, repo, video, HQ filled in |

## 1. Build the app (≈15 min)
1. New Lovable project. Paste **Prompt 1** from `LOVABLE-PROMPT.md`.
   Attach `lovable-kit/refs/duolingo-style-ref.png` + `kahoot-style-ref.png`, captioned "style reference only, don't copy logos, mascots or text".
2. Wait for it to finish. Don't send anything else yet.

## 2. Add Byte (≈2 min)
**Route A, GitHub (preferred, nothing to paste):**
1. In Lovable: GitHub → Connect → create the repo (it lands on your GitHub account).
2. On the laptop:
   ```bash
   cd ~/Claude/career-quest
   ./lovable-kit/install-byte.sh https://github.com/<you>/<lovable-repo>.git
   ```
   It copies `Byte.tsx`, adds the two CSS variables and framer-motion, commits and pushes.
   Lovable syncs it within seconds. Re-run it any time to restore Byte if Lovable touches him.

**Route B, paste (no GitHub):** paste all of `lovable-kit/prompt-1A-byte.md` below the line as one message.

## 3. Finish the build
Send in order, each after the last finishes: **Prompt 1B** → **Prompt 2** (Live Battle) → **Prompt 2B** (`lovable-kit/prompt-2B-demo-round.md`) → **Prompt 3** (polish) → **Prompt 4** (Notion).
Open `/admin/import` in the app and upload `share/questions.csv` (480 questions) as soon as Prompt 1 is done.

⚠️ **Use the Demo round for anything judges see.** In 379 of the 480 questions the correct answer is the longest option, so a random battle can be won by always picking the longest. The 10 demo questions (`lovable-kit/demo-battle.csv`) were picked so it never is.

**Prompt 4 needs, before you send it:** a Notion internal integration (notion.so/profile/integrations → New → copy the secret), a Notion database shared with that integration (••• → Connections), and its ID from the URL. Put them in Lovable as secrets `NOTION_TOKEN` / `NOTION_DATABASE_ID`. Use the team's Notion HQ workspace so judges see it there.

## 4. Check Byte (≈3 min)
- [ ] Onboarding: he waves, then talks. His beak moves with the bubble text and his eyes follow the cursor.
- [ ] Lesson: right answer → hop and sparkles; wrong → crossed arms and steam; then back to idle.
- [ ] Lesson complete → level-up. Out of hearts → hood down, broken heart.
- [ ] `/quests` → hugging the chest. Vibe Check reveal → thinking pose.
- [ ] Dark mode: he stands on a slate disc, not invisible against the background.

## If something goes wrong
| Problem | Fix |
|---|---|
| Lovable draws its own mascot or robot | Reply: "Revert that. Use src/components/Byte.tsx exactly as it is. Do not draw or modify any mascot." |
| Lovable edited `Byte.tsx` | Re-run `install-byte.sh` (it overwrites with the original). |
| Paste rejected as too long | Use Route A. |
| Byte invisible in dark mode | The CSS variables are missing. Re-run `install-byte.sh`. |
| Need to show him without the app | Demo: https://claude.ai/artifact/5tRyCrdsTvdQmcxXJZRP93 · stills in `mascot/svg/` for slides |

## Already verified (4 Oct)
Byte builds and runs with zero errors or warnings on both React 19 + framer-motion 14 + TypeScript 6
(today's Vite template, strictest settings) and React 18 + framer-motion 11. `install-byte.sh` tested
on a Lovable-shaped project, including a re-run.
