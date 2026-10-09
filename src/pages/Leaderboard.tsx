import { useNavigate } from "react-router-dom";
import { Clock, Crown, Shield } from "lucide-react";
import { ChunkyButton } from "@/components/ChunkyButton";
import { useLeaderboard, useProfile } from "@/api/hooks";
import { Byte } from "@/components/Byte";
import { Page } from "@/components/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useNow } from "@/components/StatusChips";
import { formatCountdown, LEAGUE_UNLOCK_LESSONS, msUntilWeeklyReset } from "@/lib/game";
import { cn } from "@/lib/utils";

const MEDAL: Record<number, string> = { 1: "bg-gold text-ink-bright", 2: "bg-silver text-ink-bright", 3: "bg-bronze text-ink-bright" };

/** Weekly XP league: top 20, the user's row pinned, resets Monday. */
export default function Leaderboard() {
  const board = useLeaderboard();
  const { data: profile } = useProfile();
  const now = useNow(1000);
  const navigate = useNavigate();
  const rows = board.data ?? [];
  const me = rows.find((r) => r.user_id === profile?.user_id);
  const top = rows.filter((r) => r.rank <= 20);

  if (profile && profile.completed_lessons < LEAGUE_UNLOCK_LESSONS) {
    const left = LEAGUE_UNLOCK_LESSONS - profile.completed_lessons;
    return (
      <Page className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-end gap-3" aria-hidden>
          <Shield className="h-16 w-16 text-bronze" fill="currentColor" />
          <Shield className="h-24 w-24 text-gold" fill="currentColor" />
          <Shield className="h-16 w-16 text-silver" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-title-sm sm:text-title">Unlock Leaderboards!</h1>
          <p className="text-muted-foreground">
            Complete {left} more lesson{left === 1 ? "" : "s"} to start competing in the weekly league.
          </p>
        </div>
        <ChunkyButton onClick={() => navigate(profile.chosen_career ? `/learn/${profile.chosen_career}` : "/start")}>Start a lesson</ChunkyButton>
        <ol className="flex w-full flex-col gap-2 opacity-50" aria-hidden>
          {[1, 2, 3, 4, 5].map((r) => (
            <li key={r} className="flex items-center gap-3 rounded-card px-3 py-2.5">
              <span className="h-8 w-8 rounded-full bg-muted" />
              <span className="h-10 w-10 rounded-full bg-muted" />
              <span className="h-4 flex-1 rounded-full bg-muted" />
              <span className="h-4 w-14 rounded-full bg-muted" />
            </li>
          ))}
        </ol>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-6 flex items-center gap-4">
        {me && me.rank <= 3 ? <Byte mood="smug" size={96} /> : <Crown className="h-16 w-16 shrink-0 text-gold" fill="currentColor" />}
        <div>
          <h1 className="text-title-sm sm:text-title">Weekly league</h1>
          <p className="flex items-center gap-1.5 font-bold text-flame">
            <Clock className="h-5 w-5" /> Resets Monday · {formatCountdown(msUntilWeeklyReset(new Date(now)))}
          </p>
        </div>
      </div>

      {board.isLoading ? (
        <LoadingState label="Loading the league…" rows={6} />
      ) : board.isError ? (
        <ErrorState onRetry={() => board.refetch()} />
      ) : top.length === 0 ? (
        <EmptyState title="No one's here yet" body="Earn XP this week to start the league." />
      ) : (
        <ol className="flex flex-col gap-1 pb-20">
          {top.map((r) => (
            <Row key={r.user_id} rank={r.rank} name={r.display_name} xp={r.weekly_xp} mine={r.user_id === profile?.user_id} />
          ))}
        </ol>
      )}

      {me && (
        <div className="sticky bottom-[84px] z-10 md:bottom-4">
          <ol>
            <Row rank={me.rank} name={`${me.display_name} (you)`} xp={me.weekly_xp} mine pinned />
          </ol>
        </div>
      )}
    </Page>
  );
}

function Row({ rank, name, xp, mine, pinned }: { rank: number; name: string; xp: number; mine?: boolean; pinned?: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-card px-3 py-2.5",
        mine ? "border-2 border-blue-border bg-blue-soft" : "border-2 border-transparent",
        pinned && "shadow-lg",
      )}
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-caption font-extrabold", MEDAL[rank] ?? "text-muted-foreground")}>{rank}</span>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-body font-extrabold text-muted-foreground">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className={cn("min-w-0 flex-1 truncate font-bold", mine && "text-selected-fg")}>{name}</span>
      <span className="shrink-0 font-bold text-muted-foreground">{xp} XP</span>
    </li>
  );
}
