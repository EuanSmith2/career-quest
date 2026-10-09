import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our custom font sizes, or it mistakes `text-body` for a colour and drops `text-red`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["title", "title-sm", "section", "body", "caption"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
