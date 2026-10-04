import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Byte, useLipSync, type ByteMood } from "../Byte";

type MoodInfo = { mood: ByteMood; label: string; when: string; rig?: boolean };

const MOODS: MoodInfo[] = [
  { mood: "idle", label: "Idle", when: "Default on every screen", rig: true },
  { mood: "talking", label: "Talking", when: "While a speech bubble types", rig: true },
  { mood: "stare", label: "Stare", when: "Idle 20s in a lesson", rig: true },
  { mood: "smug", label: "Smug", when: "Streak kept", rig: true },
  { mood: "shocked", label: "Shocked", when: "Boss question appears", rig: true },
  { mood: "sad", label: "Sad", when: "Streak lost, quit modal", rig: true },
  { mood: "locked-in", label: "Locked in", when: "Live quiz countdown", rig: true },
  { mood: "correct", label: "Correct", when: "Right answer" },
  { mood: "wrong", label: "Wrong", when: "Wrong answer" },
  { mood: "level-up", label: "Level up", when: "Lesson or unit complete" },
  { mood: "coding", label: "Coding", when: "Loading or lab starting" },
  { mood: "out-of-hearts", label: "Out of hearts", when: "No hearts left" },
  { mood: "chest", label: "Chest", when: "Quests page, rewards" },
  { mood: "wave", label: "Wave", when: "Onboarding hello" },
  { mood: "thinking", label: "Thinking", when: "Matching your career" },
];

const LESSON: { mood: ByteMood; line: string; ms: number }[] = [
  { mood: "talking", line: "Right. Phishing. Let's see if you'd click it.", ms: 2600 },
  { mood: "locked-in", line: "Q1: which link is the real bank?", ms: 2200 },
  { mood: "correct", line: "Correct. Checked the domain, nice.", ms: 2200 },
  { mood: "shocked", line: "Q2: your boss emails asking for gift cards…", ms: 2200 },
  { mood: "wrong", line: "That was the attacker. Never gift cards.", ms: 2400 },
  { mood: "coding", line: "Spinning up the lab…", ms: 2200 },
  { mood: "level-up", line: "Unit complete. +40 XP.", ms: 2600 },
  { mood: "stare", line: "…you're still here. Do another one.", ms: 3000 },
];

function App() {
  // ?mood=correct deep-links straight to a mood
  const initial = new URLSearchParams(location.search).get("mood") as ByteMood | null;
  const [mood, setMood] = useState<ByteMood>(initial && MOODS.some((m) => m.mood === initial) ? initial : "idle");
  const [line, setLine] = useState("Hi. I'm Byte. I haven't slept since the last breach.");
  const [playing, setPlaying] = useState(false);
  const [replay, setReplay] = useState(0);      // remount to replay a one-shot reaction
  const [gridRun, setGridRun] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setPlaying(false); };
  useEffect(() => stop, []);

  const play = () => {
    stop();
    setPlaying(true);
    let t = 0;
    LESSON.forEach((step) => {
      timers.current.push(setTimeout(() => { setMood(step.mood); setLine(step.line); }, t));
      t += step.ms;
    });
    timers.current.push(setTimeout(() => { setMood("idle"); setLine("Again?"); setPlaying(false); }, t));
  };

  // one clock drives the typed bubble and the beak (Duolingo-style viseme lip sync)
  const speech = useLipSync(line);

  const pick = (m: MoodInfo) => {
    stop();
    if (m.mood === mood) setReplay((n) => n + 1);
    setMood(m.mood);
    setLine(m.when);
  };
  const current = MOODS.find((m) => m.mood === mood)!;

  return (
    <>
      <header className="top">
        <h1>Byte</h1>
        <p className="sub">The Career Quest mascot. Fifteen moods, one vector rig, no image files.</p>
      </header>

      <section className="stage-wrap">
        <div className="stage">
          <div className="bubble" aria-live="polite" onClick={speech.skip}>
            <span aria-hidden="true">{speech.typed}</span>
            <span className="sr-only">{line}</span>
          </div>
          <Byte key={replay} mood={mood} mouth={speech.mouth} mouthShape={speech.mouthShape} followPointer size={280} />
        </div>

        <div className="controls">
          <div className="now">
            <span className="eyebrow">Now showing</span>
            <code>&lt;Byte mood="{mood}" /&gt;</code>
            <span className={current.rig ? "chip rig" : "chip pose"}>{current.rig ? "Face rig" : "Body pose"}</span>
          </div>

          <button className="chunky green" onClick={playing ? stop : play} id="play-lesson">
            {playing ? "Stop" : "Play a lesson"}
          </button>

          <div className="group">
            <span className="eyebrow">Moods</span>
            <div className="moods" role="group" aria-label="Pick a mood">
              {MOODS.map((m) => (
                <button
                  key={m.mood}
                  id={`mood-${m.mood}`}
                  className={"mood" + (m.mood === mood ? " on" : "")}
                  aria-pressed={m.mood === mood}
                  onClick={() => pick(m)}
                >
                  {m.label}
                  {m.rig && <span className="dot" aria-label="live rig" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sheet">
        <div className="sheet-head">
          <h2>All moods, running at once</h2>
          <button className="mood" id="replay-all" onClick={() => setGridRun((n) => n + 1)}>Replay reactions</button>
        </div>
        <p className="note">
          Every line in the bubble is lip-synced: the beak opens, narrows and widens with the letters as they type, on top of
          whatever pose he's in. The big Byte's eyes follow your pointer.
          Green dot: face moods that blink, glance and talk. The rest are body poses on the same rig: switching swings the arms
          rather than swapping a picture. Reactions like Correct and Wrong play once and hold; pick one again to replay it.
        </p>
        {[{ title: "Face moods", rig: true }, { title: "Body poses", rig: false }].map((g) => (
          <div key={g.title} className="group">
            <span className="eyebrow">{g.title}</span>
            <div className={g.rig ? "grid faces" : "grid bodies"} key={gridRun}>
              {MOODS.filter((m) => !!m.rig === g.rig).map((m) => (
                <figure key={m.mood} className="cell">
                  <Byte mood={m.mood} size={112} />
                  <figcaption>
                    <strong>{m.label}{m.rig && <span className="dot" />}</strong>
                    <span>{m.when}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
