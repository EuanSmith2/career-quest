import { ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** "Verified questions": every question cites the standard it comes from. Tap for the explainer. */
export function SourceChip({ source, className, dark }: { source: string; className?: string; dark?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex max-w-full items-start gap-1.5 rounded-full border-2 px-3 py-1 text-left text-caption font-bold",
          dark ? "border-arena-line bg-arena-glass text-white" : "border-border bg-background text-muted-foreground",
          className,
        )}
      >
        <ShieldCheck className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-white" : "text-green-lip")} />
        <span className="break-words">Source: {source}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 border-2 border-border bg-background text-caption text-foreground">
        Every question in Career Quest cites the standard it comes from.
      </PopoverContent>
    </Popover>
  );
}
