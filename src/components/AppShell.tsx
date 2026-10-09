import { Suspense, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, ExternalLink, Flame, Gift, ShieldOff, Target, Trophy, User } from "lucide-react";
import { useCareer, useLeaderboard, useProfile, useQuests, useWeeklyXp } from "@/api/hooks";
import { useAccountUi } from "./AccountSheets";
import { ChunkyButton } from "./ChunkyButton";
import { QuestList, QuestRefresh } from "./QuestList";
import { LEAGUE_UNLOCK_LESSONS, localDateKey } from "@/lib/game";
import { cn } from "@/lib/utils";
import { CareerBadge } from "./CareerIcon";
import { Logo } from "./Logo";
import { StatusRow } from "./StatusChips";
import { LoadingState } from "./States";
import { Skeleton } from "./ui/skeleton";

function useNavItems() {
  const { data: p } = useProfile();
  return [
    { to: p?.chosen_career ? `/learn/${p.chosen_career}` : "/start", match: "/learn", label: "Learn", icon: BookOpen },
    { to: "/leaderboard", match: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/quests", match: "/quests", label: "Quests", icon: Gift },
    { to: "/profile", match: "/profile", label: "Profile", icon: User },
  ];
}

/**
 * Layout by width:
 *  < 897px  single column, top status bar + bottom tab bar
 *  ≥ 897px  fixed 256px left sidebar + centred column
 *  ≥ 1024px plus a 360px right rail
 */
export function AppShell() {
  const nav = useNavItems();
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh bg-background">
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col gap-2 border-r-2 border-border px-4 py-6 md:flex">
        <Link to="/" className="mb-6 px-3">
          <Logo />
        </Link>
        {nav.map((n) => (
          <NavLink
            key={n.label}
            to={n.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 rounded-btn border-2 px-4 py-3 btn-text transition-colors",
                isActive || pathname.startsWith(n.match)
                  ? "border-blue-border bg-blue-soft text-blue-text"
                  : "border-transparent text-muted-foreground hover:bg-muted",
              )
            }
          >
            <n.icon className="h-7 w-7" strokeWidth={2.4} />
            {n.label}
          </NavLink>
        ))}
      </aside>

      <div className="md:pl-[256px] lg:pr-[360px]">
        {/* top bar (mobile + tablet) */}
        <header className="sticky top-0 z-20 border-b-2 border-border bg-background px-4 py-2 lg:hidden">
          <StatusRow className="mx-auto max-w-app" />
        </header>
        <main className="mx-auto w-full max-w-app px-4 pb-28 pt-6 md:pb-12">
          {/* keep the chrome on screen while a lazy page loads */}
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <RightRail />

      {/* bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {nav.map((n) => (
          <NavLink
            key={n.label}
            to={n.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[12px] font-extrabold uppercase tracking-wide transition-transform duration-150 active:scale-110",
                isActive || pathname.startsWith(n.match) ? "text-blue-text" : "text-disabled-fg",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("rounded-btn border-2 px-3 py-1", isActive || pathname.startsWith(n.match) ? "border-blue-border bg-blue-soft" : "border-transparent")}>
                  <n.icon className="h-6 w-6" strokeWidth={2.4} />
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function RailCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card border-2 border-border p-5">
      <h3 className="mb-3 flex items-center gap-2 text-[19px] font-extrabold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Daily-goal ring (animated circular progress). */
function GoalRing({ value, goal }: { value: number; goal: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, value / goal);
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" role="img" aria-label={`${Math.min(value, goal)} of ${goal} XP today`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        style={{ transition: "stroke-dashoffset 0.8s var(--ease-out)" }}
      />
    </svg>
  );
}

function RightRail() {
  const { data: p, isLoading } = useProfile();
  const { data: week } = useWeeklyXp();
  const { data: board } = useLeaderboard();
  const { data: quests } = useQuests();
  const { data: career } = useCareer(p?.chosen_career);
  const { openSaveProgress } = useAccountUi();
  const today = week?.find((d) => d.date === localDateKey())?.xp ?? 0;
  const goal = p?.daily_goal_xp ?? 30;
  const me = board?.find((r) => r.user_id === p?.user_id);
  const toUnlock = Math.max(0, LEAGUE_UNLOCK_LESSONS - (p?.completed_lessons ?? 0));

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-rail flex-col gap-4 overflow-y-auto px-6 py-6 lg:flex">
      <StatusRow />
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          {toUnlock > 0 ? (
            <RailCard title="Unlock Leaderboards!">
              <div className="flex items-center gap-3">
                <ShieldOff className="h-10 w-10 shrink-0 text-muted-icon" />
                <p className="text-caption text-muted-foreground">
                  Complete {toUnlock} more lesson{toUnlock === 1 ? "" : "s"} to start competing.
                </p>
              </div>
            </RailCard>
          ) : (
            <RailCard title="Weekly league" icon={<Trophy className="h-6 w-6 text-gold" fill="currentColor" />}>
              {me ? (
                <p className="text-caption text-muted-foreground">
                  You're <strong className="text-foreground">#{me.rank}</strong> with {me.weekly_xp} XP this week.{" "}
                  <Link to="/leaderboard" className="font-bold text-link">
                    View league
                  </Link>
                </p>
              ) : (
                <Skeleton className="h-5" />
              )}
            </RailCard>
          )}

          {quests && (
            <section className="rounded-card border-2 border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[19px] font-extrabold">Daily Quests</h3>
                <Link to="/quests" className="btn-text text-link">
                  View all
                </Link>
              </div>
              <QuestRefresh quests={quests} className="mb-3" />
              <QuestList quests={quests} compact />
            </section>
          )}

          <RailCard title="Daily goal" icon={<Target className="h-6 w-6 text-gold" />}>
            <div className="flex items-center gap-4">
              <GoalRing value={today} goal={goal} />
              <p className="text-caption text-muted-foreground">
                <strong className="text-foreground">
                  {Math.min(today, goal)}/{goal} XP
                </strong>{" "}
                today. {today >= goal ? "Goal smashed!" : "Keep going."}
              </p>
            </div>
          </RailCard>

          <RailCard title={`${p?.streak ?? 0} day streak`} icon={<Flame className="h-6 w-6 text-flame" fill="currentColor" />}>
            <p className="text-caption text-muted-foreground">{p?.streak ? "Earn XP today to keep it going." : "Finish a lesson to start a streak."}</p>
          </RailCard>

          {p?.is_guest && (
            <RailCard title="Create a profile to save your progress!">
              <div className="flex flex-col gap-3">
                <ChunkyButton variant="correct" block onClick={() => openSaveProgress("save")}>
                  Create a profile
                </ChunkyButton>
                <ChunkyButton variant="secondary" block onClick={() => openSaveProgress("signin")}>
                  Sign in
                </ChunkyButton>
              </div>
            </RailCard>
          )}

          {career && (
            <RailCard title="Your next real cert">
              <div className="flex items-start gap-3">
                <CareerBadge icon={career.icon} color={career.color} size={40} />
                <div className="min-w-0">
                  <p className="font-extrabold">{career.next_cert}</p>
                  {career.thm_path && (
                    <a href={career.thm_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-caption font-bold text-link">
                      TryHackMe path <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </RailCard>
          )}
        </>
      )}
    </aside>
  );
}
