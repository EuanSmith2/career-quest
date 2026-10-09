# Prompt 3S: wire up sound effects

Run `install-sounds.sh` first (or, with no GitHub, paste `sounds/sounds.ts` into a message asking Lovable to create `src/lib/sounds.ts` with exactly that content). Then send everything below the line. It replaces the "Sounds" bullet in Prompt 3: skip that bullet if Prompt 3 hasn't gone in yet.

---

Sound effects are already in `src/lib/sounds.ts`. Don't edit that file and don't add audio files or sound libraries. Import `playSound` and `useSoundEnabled` from `@/lib/sounds` and call them at these moments:

**Lessons**
- Selecting an answer tile: `playSound("tap")`
- Correct answer (when the green banner appears): `playSound("correct", { streak })`, where `streak` is the number of correct answers in a row in this lesson (1, 2, 3…), so the chime climbs.
- Wrong answer (red banner): `playSound("wrong")`, then `playSound("heartLost")` 400ms later if a heart is lost.
- Hearts reach 0: `playSound("outOfHearts")`
- Lesson complete screen: `playSound("complete")`. While the XP total counts up, `playSound("xp")` every ~120ms (max 8 times).
- Certificate earned or level up: `playSound("levelUp")`
- Daily streak extended (the flame screen): `playSound("streak")`
- Opening a quest chest: `playSound("chest")`

**Live Battle**
- 3-2-1 before each question: `playSound("countdown")` on each number, `playSound("go")` when the question appears.
- Timer: `playSound("tick")` each second from 10s to 6s left, `playSound("tickUrgent")` each second from 5s to 1s, `playSound("timeUp")` at 0. Host screen only.
- Player taps a tile on their phone: `playSound("answerLocked")`
- Before the podium: `playSound("drumroll")`, then `playSound("podium")` 2.3s later as 1st place is revealed.

**Toggle**
- A speaker icon button in the top bar (and a switch in the profile) using `const [soundOn, setSoundOn] = useSoundEnabled()`. Sound is ON by default; the choice is remembered.

Only call `playSound` from event handlers or effects that run after a user action. Never on page load.
