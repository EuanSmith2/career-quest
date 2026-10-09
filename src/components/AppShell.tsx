import { Suspense, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, ExternalLink, Flame, Target, Trophy, User } from "lucide-react";
import { useCareer, useLeaderboard, useProfile, useWeeklyXp } from "@/api/hooks";
import { localDateKey } from "@/lib/game";
import { cn } from "@/lib/utils";
import { CareerBadge } from "./CareerIcon";
import { Logo } from "./Logo";
import { ProgressBar } from "./ProgressBar";
import { StatusRow } from "./StatusChips";
import { LoadingState } from "./States";
import { Skeleton } from "./ui/skeleton";

function useNavItems() {
  const { data: p } = useProfile();
  return [
    { to: p?.chosen_career ? `/learn/${p.chosen_career}` : "/start", match: "/learn", label: "Learn", icon: BookOpen },
    { to: "/leaderboard", match: "/leaderboard", label: "Leaderboard", icon: Trophy },
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
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[12px] font-extrabold uppercase tracking-wide",
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

function RightRail() {
  const { data: p, isLoading } = useProfile();
  const { data: week } = useWeeklyXp();
  const { data: board } = useLeaderboard();
  const { data: career } = useCareer(p?.chosen_career);
  const today = week?.find((d) => d.date === localDateKey())?.xp ?? 0;
  const goal = p?.daily_goal_xp ?? 30;
  const me = board?.find((r) => r.user_id === p?.user_id);

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-rail flex-col gap-4 overflow-y-auto px-6 py-6 lg:flex">
      <StatusRow />
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <RailCard title={`${p?.streak ?? 0} day streak`} icon={<Flame className="h-6 w-6 text-flame" fill="currentColor" />}>
            <p className="text-caption text-muted-foreground">
              {p?.streak ? "Earn XP today to keep it going." : "Finish a lesson to start a streak."}
            </p>
          </RailCard>
          <RailCard title="Daily goal" icon={<Target className="h-6 w-6 text-correct" />}>
            <div className="flex items-center gap-3">
              <ProgressBar value={today / goal} label="Daily goal" />
              <span className="shrink-0 text-caption font-extrabold text-muted-foreground">
                {Math.min(today, goal)}/{goal} XP
              </span>
            </div>
          </RailCard>
          <RailCard title="Weekly league" icon={<Trophy className="h-6 w-6 text-gold" fill="currentColor" />}>
            {me ? (
              <p className="text-caption text-muted-foreground">
                You're <strong className="text-foreground">#{me.rank}</strong> with {me.weekly_xp} XP this week.{" "}
                <Link to="/leaderboard" className="font-bold text-blue">
                  View league
                </Link>
              </p>
            ) : (
              <Skeleton className="h-5" />
            )}
          </RailCard>
          {career && (
            <RailCard title="Your next real cert">
              <div className="flex items-start gap-3">
                <CareerBadge icon={career.icon} color={career.color} size={40} />
                <div className="min-w-0">
                  <p className="font-extrabold">{career.next_cert}</p>
                  {career.thm_path && (
                    <a href={career.thm_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-caption font-bold text-blue">
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
