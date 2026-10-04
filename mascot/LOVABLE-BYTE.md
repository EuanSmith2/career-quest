# Byte → Lovable hand-off

Live demo: https://claude.ai/artifact/5tRyCrdsTvdQmcxXJZRP93

## 1. What to give Lovable
Just `mascot/Byte.tsx`. There are no image files: every mood is drawn in code.
(`mascot/svg/byte-*.svg` are stills for the pitch deck / favicon; Lovable doesn't need them.)

## 2. Paste this into Lovable

```
Add our mascot. I'm pasting one component file below.

1. Create src/components/Byte.tsx with EXACTLY the code I paste below. Do not rewrite, restyle or "improve" it.
2. Add two CSS variables:
   --byte-shadow: #dfe1ee and --byte-backdrop: transparent in light mode,
   --byte-shadow: #0d1518 and --byte-backdrop: #263840 in .dark.
3. Replace every existing mascot/robot placeholder with <Byte mood="..." />:
   - Onboarding speech bubble: "idle", lip-synced to the text with useLipSync (step 4)
   - Lesson: "correct" on a right answer, "wrong" on a wrong one, then back to "idle" after ~1.5s
   - Lesson complete: "level-up" (keep the existing confetti)
   - Out-of-hearts screen: "out-of-hearts". Quit modal and streak lost: "sad"
   - Live quiz countdown: "locked-in". Boss question reveal: "shocked"
   - Any loading state: "coding". Streak kept: "smug"
   - /quests hero card: "chest"
   - Learner idle for 20s mid-lesson: "stare"
4. Whenever Byte says something in a speech bubble, use the exported useLipSync hook so his beak moves with the text:
   const { typed, mouth, skip } = useLipSync(line);  render {typed} in the bubble (click = skip) and pass mouth={mouth} to <Byte />.
   This works on top of any mood, e.g. <Byte mood="correct" mouth={mouth} />. Don't build a separate typing animation.
5. Sizes: 180px in lessons, 140px on the path, 240px on the landing hero, 160px on the quests card.

Do not draw any other mascot art, add new moods, or change the component's animation values.

[paste Byte.tsx here]
```
