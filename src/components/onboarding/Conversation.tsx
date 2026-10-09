import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Byte, useLipSync } from "@/components/Byte";
import { ChunkyButton } from "@/components/ChunkyButton";
import { ProgressBar } from "@/components/ProgressBar";
import { useAnswerKeys } from "@/lib/useKeys";
import { cn } from "@/lib/utils";

/** Byte top-left, talking while his speech bubble types itself out (typing-animation). Returns the node + whether typing is done. */
export function useByteSays({ line, size = 96 }: { line: string; size?: number }) {
  const { typed, mouth, mouthShape, done, skip } = useLipSync(line);
  return { done, node: (
    <div className="mb-6 flex items-start gap-3">
      <Byte mood={done ? "idle" : "talking"} mouth={mouth} mouthShape={mouthShape} size={size} followPointer className="shrink-0" />
      <button
        type="button"
        onClick={skip}
        className="relative mt-2 min-h-[56px] flex-1 rounded-card border-2 border-border bg-background px-4 py-3 text-left text-[19px] font-extrabold leading-snug"
        aria-label={line}
      >
        <span aria-hidden className="absolute -left-[9px] top-5 h-4 w-4 rotate-45 border-b-2 border-l-2 border-border bg-background" />
        <span aria-hidden>{typed}</span>
        {!done && <span aria-hidden className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-foreground" />}
      </button>
    </div>
  ) };
}

/**
 * Onboarding / Vibe Check frame: ← back + thick progress bar on top, Byte's line, the answers,
 * and a CONTINUE that stays disabled until the typing finishes (and `canContinue`).
 */
export function Conversation({
  step,
  steps,
  line,
  onBack,
  canContinue = true,
  onContinue,
  continueLabel = "Continue",
  children,
  wide,
}: {
  step: number;
  steps: number;
  line: string;
  onBack: () => void;
  canContinue?: boolean;
  onContinue: () => void;
  continueLabel?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const said = useByteSays({ line });
  const ready = said.done && canContinue;
  useAnswerKeys({ onEnter: () => ready && onContinue() });
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
      <header className={cn("mx-auto flex w-full items-center gap-4 px-4 pb-2 pt-4", wide ? "max-w-[900px]" : "max-w-app")}>
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft className="h-7 w-7" strokeWidth={3} />
        </button>
        <ProgressBar value={step / steps} label={`Step ${step} of ${steps}`} knob />
      </header>
      <main className={cn("mx-auto flex w-full flex-1 flex-col px-4 pb-32 pt-6", wide ? "max-w-[900px]" : "max-w-app")}>
        {said.node}
        <div className={cn("transition-opacity duration-300", said.done ? "opacity-100" : "opacity-40")}>{children}</div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-border bg-background">
        <div className={cn("mx-auto flex justify-end px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]", wide ? "max-w-[900px]" : "max-w-app")}>
          <ChunkyButton className="w-full sm:w-auto sm:min-w-[180px]" disabled={!ready} onClick={onContinue}>
            {continueLabel}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
