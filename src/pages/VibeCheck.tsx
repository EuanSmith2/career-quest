import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Conversation } from "@/components/onboarding/Conversation";
import { OptionCard } from "@/components/OptionCard";
import { VIBE_CHECK } from "@/data/vibeCheck";
import { rankVibeCheck } from "@/lib/game";
import { playSound } from "@/lib/sound";
import { useAnswerKeys } from "@/lib/useKeys";

/** Vibe Check: 8 personality questions, no right answers, asked by Byte. */
export default function VibeCheck() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => VIBE_CHECK.map(() => null));
  const q = VIBE_CHECK[i];
  const pick = picks[i];

  const choose = (k: number) => {
    if (k > 3) return;
    setPicks((p) => p.map((v, j) => (j === i ? k : v)));
    playSound("select");
  };
  useAnswerKeys({ onPick: choose });

  const next = () => {
    if (pick === null) return;
    if (i + 1 < VIBE_CHECK.length) return setI(i + 1);
    navigate("/match", { state: { ranking: rankVibeCheck(VIBE_CHECK, picks) } });
  };

  return (
    <Conversation
      step={i + 1}
      steps={VIBE_CHECK.length}
      line={i === 0 ? `No right answers here. ${q.prompt}` : q.prompt}
      onBack={() => (i === 0 ? navigate("/start") : setI(i - 1))}
      canContinue={pick !== null}
      onContinue={next}
      continueLabel={i + 1 === VIBE_CHECK.length ? "See my match" : "Continue"}
    >
      <div className="flex flex-col gap-3" role="radiogroup" aria-label={q.prompt}>
        {q.answers.map((a, k) => (
          <OptionCard key={k} index={k} state={pick === k ? "selected" : "idle"} onClick={() => choose(k)} role="radio" aria-checked={pick === k}>
            {a.text}
          </OptionCard>
        ))}
      </div>
    </Conversation>
  );
}
