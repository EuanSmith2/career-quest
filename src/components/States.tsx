import type { ReactNode } from "react";
import { Byte } from "./Byte";
import { ChunkyButton } from "./ChunkyButton";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

/** Pending state: Byte thinking over a few skeleton rows. */
export function LoadingState({ label = "Loading…", rows = 3, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-8", className)} aria-busy="true" aria-live="polite">
      <Byte mood="thinking" size={80} />
      <p className="text-caption font-bold text-muted-foreground">{label}</p>
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Empty state: Byte idle with a line and an optional action. */
export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}>
      <Byte mood="idle" size={120} />
      <h2 className="text-section">{title}</h2>
      {body && <p className="max-w-sm text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-10 text-center", className)} role="alert">
      <Byte mood="sad" size={120} />
      <h2 className="text-section">Hmm, that didn't load</h2>
      <p className="max-w-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <ChunkyButton variant="outline" onClick={onRetry}>
          Try again
        </ChunkyButton>
      )}
    </div>
  );
}
