import { playSound, SOUND_NAMES, type SoundName } from "./sounds";
const groups: [string, SoundName[]][] = [
  ["Lessons", ["tap", "correct", "wrong", "complete", "levelUp", "heartLost", "outOfHearts", "xp", "streak", "chest"]],
  ["Live battle", ["countdown", "go", "tick", "tickUrgent", "answerLocked", "timeUp", "drumroll", "podium"]],
];
const root = document.getElementById("app")!;
for (const [title, names] of groups) {
  const h = document.createElement("h2"); h.textContent = title; root.append(h);
  const row = document.createElement("div"); row.className = "row"; root.append(row);
  for (const n of names) {
    const b = document.createElement("button"); b.textContent = n;
    b.onclick = () => playSound(n); row.append(b);
  }
}
const h = document.createElement("h2"); h.textContent = "Sequences"; root.append(h);
const row = document.createElement("div"); row.className = "row"; root.append(row);
const seq = (label: string, steps: [SoundName, number, number?][]) => {
  const b = document.createElement("button"); b.textContent = label; b.className = "seq";
  b.onclick = () => steps.forEach(([n, ms, streak]) => setTimeout(() => playSound(n, { streak }), ms));
  row.append(b);
};
seq("streak of 6 correct", [1, 2, 3, 4, 5, 6].map((s, i) => ["correct", i * 650, s] as [SoundName, number, number]));
seq("lesson: tap, correct, tap, wrong, heart lost", [["tap", 0], ["correct", 250], ["tap", 1200], ["wrong", 1450], ["heartLost", 2000]]);
seq("battle start 3-2-1-go", [["countdown", 0], ["countdown", 1000], ["countdown", 2000], ["go", 3000]]);
seq("last 10 seconds", [...Array(10)].map((_, i) => [i < 5 ? "tick" : "tickUrgent", i * 1000] as [SoundName, number]).concat([["timeUp", 10000]]));
seq("podium reveal", [["drumroll", 0], ["podium", 2300]]);
console.log("sounds:", SOUND_NAMES.length);
