import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHAPE_LABEL, TILE_SHAPES, TileShape } from "./TileShape";

const TILES = [
  { bg: "bg-tile-red", text: "text-white", lip: "var(--tile-red-lip)" },
  { bg: "bg-tile-blue", text: "text-white", lip: "var(--tile-blue-lip)" },
  { bg: "bg-tile-yellow", text: "text-foreground", lip: "var(--tile-yellow-lip)" },
  { bg: "bg-tile-green", text: "text-white", lip: "var(--tile-green-lip)" },
] as const;

export type TileState = "idle" | "picked" | "correct" | "wrong" | "dimmed";

export interface AnswerTileProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  index: number; // 0 red ▲, 1 blue ◆, 2 yellow ●, 3 green ■
  state?: TileState;
  children: React.ReactNode;
}

/** Arena answer tile: colour + lip + shape, min-height 96px, text wraps and the tile grows. */
export function AnswerTile({ index, state = "idle", className, style, children, ...props }: AnswerTileProps) {
  const t = TILES[index % 4];
  const shape = TILE_SHAPES[index % 4];
  return (
    <button
      type="button"
      aria-label={`${SHAPE_LABEL[shape]} (${index + 1}): ${typeof children === "string" ? children : ""}`}
      data-pressed={state === "picked" || undefined}
      className={cn(
        "chunky relative flex min-h-[96px] w-full items-center gap-4 rounded-tile px-4 py-3 text-left font-arena text-[20px] font-extrabold leading-tight sm:text-[22px]",
        t.bg,
        t.text,
        state === "dimmed" && "opacity-30",
        state === "wrong" && "opacity-30",
        state === "correct" && "ring-4 ring-white",
        className,
      )}
      style={{ "--lip-color": t.lip, ...style } as React.CSSProperties}
      {...props}
    >
      <TileShape shape={shape} className={index === 2 ? "text-foreground" : "text-white"} />
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {state === "correct" && <Check className="h-8 w-8 shrink-0" strokeWidth={4} aria-label="Correct" />}
      {state === "wrong" && <X className="h-8 w-8 shrink-0" strokeWidth={4} aria-label="Your answer" />}
    </button>
  );
}
