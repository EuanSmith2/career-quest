import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArenaRound } from "@/components/arena/ArenaRound";
import { VIBE_CHECK } from "@/data/vibeCheck";
import { rankVibeCheck, type ArenaItem } from "@/lib/game";

/** Kahoot-style personality quiz: 8 questions, 20s each, no right answers. */
export default function VibeCheck() {
  const navigate = useNavigate();
  const items = useMemo<ArenaItem[]>(
    () =>
      VIBE_CHECK.map((q, i) => ({
        id: `vibe-${i}`,
        prompt: q.prompt,
        options: q.answers.map((a) => a.text),
        correctIndex: null,
      })),
    [],
  );

  return (
    <ArenaRound
      items={items}
      timeLimit={20}
      scored={false}
      intro={{ mood: "talking", title: "Vibe Check", subtitle: "No right answers. Pick what sounds most like you and Byte will match you to a career." }}
      onExit={() => navigate("/start")}
      onFinish={(results) => {
        const ranking = rankVibeCheck(
          VIBE_CHECK,
          results.map((r) => r.pick),
        );
        navigate("/match", { state: { ranking } });
      }}
    />
  );
}
