import { useEffect, useRef } from "react";
import { useAchievements, useSession } from "@/api/hooks";
import { playSound } from "@/lib/sound";
import { toast } from "./Toast";

/** Shows an "Achievement unlocked" toast (with the chime) the moment a badge is first earned. */
export function AchievementWatcher() {
  const { data: session } = useSession();
  const { data } = useAchievements(!!session);
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) return;
    const unlocked = data.filter((a) => a.unlocked_at);
    if (known.current === null) {
      known.current = new Set(unlocked.map((a) => a.id)); // first load: no toasts for old badges
      return;
    }
    for (const a of unlocked) {
      if (known.current.has(a.id)) continue;
      known.current.add(a.id);
      playSound("achievement");
      toast({ title: a.title, body: a.description, icon: a.icon, tone: "achievement" });
    }
  }, [data]);

  return null;
}
