# Byte mascot

One React component, no image files. All 13 moods are the same vector rig in a different configuration.
The body, face, eyes, beak, feet and flippers are measured from the front pose of `src/sheet.jpg`
(silhouette overlap 95.4%), so the rig is a 1:1 of the original design; the poses and props are new.

```tsx
<Byte mood="correct" size={160} />
```

| Path | What |
|---|---|
| `Byte.tsx` | The component (react + framer-motion). Also exports `ByteRig` (the bare SVG) and `MOODS`. |
| `svg/byte-<mood>.svg` | A still of every mood, for the pitch deck, Notion and the favicon. Exported from the rig. |
| `src/sheet.jpg` | The GPT-image model sheet the character was designed from. |
| `demo/` | Playground. `?mood=chest` deep-links. `export-rig.tsx` re-exports the stills. |
| `LOVABLE-BYTE.md` | Hand-off for the Lovable build. |

## Moods
| Kind | Moods |
|---|---|
| Face (blink, glance, talk) | idle, talking, stare, smug, shocked, sad, locked-in |
| Body | correct, wrong, level-up, coding, out-of-hearts, chest |

- A pose is arm angles + a face (eyelid drop/tilt, pupil offset/scale, beak) + props (sparkles, heart, smoke,
  laptop, chest, tears, broken heart, hood brim). Add a mood by adding one entry to `POSES`.
- Switching moods swings the arms and re-forms the face, with a small squash on every change.
- Reactions (correct, wrong, shocked, level-up) play once and hold. Everything else loops gently.
- `prefers-reduced-motion`: no loops, blinks, glances or flaps; expressions still show.

## Talking (lip sync)
Modelled on how Duolingo animates its characters (Rive state machines with a separate mouth layer driven by
viseme timings, per their 2022 engineering blog). Byte's mouth is its own layer: pass `mouth` (0–1) on top of
any mood. `useLipSync(text)` types the line and returns the matching beak openness from one clock, so the
bubble and the beak can't drift apart:

```tsx
const { typed, mouth, skip } = useLipSync(line);
<Bubble onClick={skip}>{typed}</Bubble>
<Byte mood="correct" mouth={mouth} />
```
Vowels open wide, o/u round, m/b/p close, punctuation pauses. An idle Byte also nods or tilts every 7–12 s.

## Theming
`--byte-shadow` (floor pill, a darker shade of the ground) and `--byte-backdrop` (flat disc behind him;
set it in dark mode, e.g. `#263840` on `#131f24`, or the charcoal hood disappears).

## Build / test
```bash
cd demo
npx tsc --noEmit --jsx react-jsx --strict --esModuleInterop --skipLibCheck --moduleResolution bundler --module esnext --target es2020 --lib es2020,dom main.tsx ../Byte.tsx
npx esbuild main.tsx --bundle --minify --format=iife --jsx=automatic --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js && cp index.html dist/
npx esbuild export-rig.tsx --bundle --platform=node --jsx=automatic --format=cjs --outfile=/tmp/x.cjs && node /tmp/x.cjs ../svg
```

## Gotchas found in testing
- framer-motion **transform keyframes don't apply to SVG elements** here (static targets do). SVG loops use
  state toggles (beak flap) or CSS keyframes (tears, sparkles, smoke); body motion and the shadow are HTML.
- Never put `initial={false}` on a looping keyframe animation: it jumps to the end and never starts.
- framer resolves SVG transform origins at runtime, so server-rendered stills use `still` mode (plain SVG transforms).
- Same-colour sleeves over the hoodie vanish: front sleeves are one step lighter with a shade shape under them.
- Headless Chrome won't lay out narrower than 500px and its virtual clock doesn't tick framer loops: test mobile
  in a 375px iframe and motion over CDP in real time.
