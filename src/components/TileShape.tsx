import { cn } from "@/lib/utils";

export type TileShapeName = "triangle" | "diamond" | "circle" | "square";
export const TILE_SHAPES: TileShapeName[] = ["triangle", "diamond", "circle", "square"];

/** The white shape that pairs with each tile colour: ▲ red, ◆ blue, ● yellow, ■ green. */
export function TileShape({ shape, className }: { shape: TileShapeName; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 shrink-0 fill-current", className)} aria-hidden>
      {shape === "triangle" && <path d="M16 4 L29 27 H3 Z" />}
      {shape === "diamond" && <path d="M16 2 L30 16 L16 30 L2 16 Z" />}
      {shape === "circle" && <circle cx="16" cy="16" r="13" />}
      {shape === "square" && <rect x="4" y="4" width="24" height="24" rx="2" />}
    </svg>
  );
}

export const SHAPE_LABEL: Record<TileShapeName, string> = {
  triangle: "Triangle",
  diamond: "Diamond",
  circle: "Circle",
  square: "Square",
};
