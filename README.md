# Career Quest

Pick a cyber security career and learn it five minutes a day, Duolingo style.
Built by Euan Smith, Rhys Garbutt and Maksim Viktorov at the Notion × Dublin AI Week Student Hackathon (TU Dublin, 9 Oct 2026).

**Live app:** https://lnkd.in/d6BJizhe

## What's in it
- 12 cyber security careers, each with its own lesson path
- 480 multiple-choice questions, every one citing a source (NIST, OWASP, MITRE, CIS)
- Streaks, XP and hearts, with Byte the mascot reacting to every answer
- Notion as the backend for questions, careers and player progress

| Path | What |
|---|---|
| `src/` | The app (React, TypeScript, Tailwind) |
| `share/questions.csv` | The question bank |
| `mascot/` | Byte: one React component, 15 vector moods. See `mascot/README.md` |
| `sounds/` | 18 synthesised sound effects, no audio files. `open sounds/index.html` to hear them |
| `intro/` | The intro animation. `open intro/index.html` |
| `data/raw/` | TryHackMe learning-path data used to map careers |

## Run it

```bash
npm install
npm run dev        # http://localhost:8080
npm test
npm run build
```

No environment variables needed. Data goes through `src/api/` to a local mock that serves the 480 questions in
`share/questions.csv`. Copy `.env.example` to `.env.local` to sync progress to your own Notion database.
`/styleguide` shows every component, Byte's moods and the sounds.
