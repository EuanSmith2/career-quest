# Career Quest

Duolingo-style lessons plus Kahoot-style live quizzes for learning cybersecurity careers.
Built for the Notion × Dublin AI Week Student Hackathon (9 Oct 2026). Pre-event prep (allowed under the event rules):
the mascot, the Lovable build prompts, the question bank and the design research.

| Path | What |
|---|---|
| `src/`, `HANDOFF.md` | **The app** (React + TypeScript + Tailwind, Prompt 1). UI only, runs offline against a mock API. `HANDOFF.md` is for the backend teammate |
| `lovable-kit/` | **Start here on the day:** `RUNBOOK.md`, `install-byte.sh`, paste-in fallback, demo-round prompt + questions, anti-cheat (2C), Notion question sync (5), `APP-README.md` for the submitted repo |
| `PITCH.md`, `NOTION-HQ.md` | 4-minute pitch script with judge Q&A, and paste-in text for the Notion HQ |
| `LOVABLE-PROMPT.md`, `share/` | Build prompts for Lovable, and the shareable copy plus `questions.csv` |
| `sounds/` | 18 synthesised sound effects (`sounds.ts`, no audio files). `open sounds/index.html` to hear them. Shareable (with files for a teammate's Claude): [sounds](https://claude.ai/artifact/5gihPvhSCWzYQtUSBHJBnS) · [Byte](https://claude.ai/artifact/5tRyCrdsTvdQmcxXJZRP93) |
| `mascot/` | **Byte**, the mascot: one React component, 13 vector moods. See `mascot/README.md` |
| `data/raw/` | TryHackMe learning-path data used for the question bank |
| `duolingo-teardown/` | Reference measurements and screens from a Duolingo lesson walkthrough |

## Run the app

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # game logic tests
npm run build
```

No environment variables, no backend: data goes through `src/api/` to a localStorage mock that serves the
480 questions in `share/questions.csv`. `/styleguide` shows every component, Byte's moods and the sounds.
Sound is on by default (toggle it on /profile).

**Sync to Notion:** copy `.env.example` to `.env.local`, add a Notion integration secret and a database shared with
that integration, then restart `npm run dev`. Each player gets one page in the database with their stats and a study plan.
