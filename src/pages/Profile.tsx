import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookCheck, Flame, Moon, Snowflake, Volume2, Zap } from "lucide-react";
import {
  useAchievements,
  useBuyStreakFreeze,
  useCareer,
  useMyCertificates,
  useProfile,
  useResetDemoData,
  useSession,
  useSyncToNotion,
  useUpdateProfile,
  useWeeklyXp,
} from "@/api/hooks";
import type { DayXp } from "@/api/types";
import { useAccountUi } from "@/components/AccountSheets";
import { Byte } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { Page } from "@/components/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CAREERS } from "@/data/careers";
import { localDateKey } from "@/lib/game";
import { useSound } from "@/lib/sound";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function Profile() {
  const profile = useProfile();
  const { data: session } = useSession();
  const { data: career } = useCareer(profile.data?.chosen_career);
  const certs = useMyCertificates();
  const achievements = useAchievements();
  const week = useWeeklyXp();
  const update = useUpdateProfile();
  const freeze = useBuyStreakFreeze();
  const reset = useResetDemoData();
  const sound = useSound();
  const [theme, setTheme] = useTheme();
  const { openSaveProgress } = useAccountUi();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (profile.isLoading) return <LoadingState label="Loading your profile…" />;
  if (profile.isError || !profile.data) return <ErrorState onRetry={() => profile.refetch()} />;
  const p = profile.data;

  return (
    <Page className="flex flex-col gap-6">
      <header className="flex items-center gap-4 border-b-2 border-border pb-6">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-dashed border-blue-border bg-blue-soft text-[36px] font-black text-blue-text">
          {p.display_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) update.mutate({ display_name: name.trim() });
                setEditing(false);
              }}
            >
              <Input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
              <ChunkyButton type="submit" variant="secondary">
                Save
              </ChunkyButton>
            </form>
          ) : (
            <>
              <h1 className="truncate text-title-sm sm:text-title">{p.display_name}</h1>
              <button
                type="button"
                className="text-caption font-bold text-blue"
                onClick={() => {
                  setName(p.display_name);
                  setEditing(true);
                }}
              >
                Edit name
              </button>
            </>
          )}
          <p className="text-caption text-muted-foreground">{session?.email ?? (p.is_guest ? "Guest player" : "Signed in")}</p>
        </div>
      </header>

      {p.is_guest && (
        <section className="flex items-center gap-3 rounded-card border-2 border-blue-border bg-blue-soft p-4">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-blue-text">Save your progress</p>
            <p className="text-caption text-muted-foreground">Add an email so you don't lose your streak.</p>
          </div>
          <ChunkyButton variant="secondary" onClick={() => openSaveProgress("save")}>
            Save
          </ChunkyButton>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-section">Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Flame className="h-6 w-6 text-flame" fill="currentColor" />} value={p.streak} label="Day streak" />
          <Stat icon={<Zap className="h-6 w-6 text-gold" fill="currentColor" />} value={p.xp} label="Total XP" />
          <Stat icon={<BookCheck className="h-6 w-6 text-correct" />} value={p.completed_lessons} label="Lessons done" />
          <Stat icon={<Award className="h-6 w-6 text-gold" />} value={certs.data?.length ?? 0} label="Certificates" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-section">XP this week</h2>
        {week.isLoading ? <LoadingState rows={1} label="Loading XP…" /> : week.data ? <XpChart days={week.data} /> : <ErrorState onRetry={() => week.refetch()} />}
      </section>

      <section>
        <h2 className="mb-3 text-section">Achievements</h2>
        {achievements.isLoading ? (
          <LoadingState rows={2} label="Loading badges…" />
        ) : achievements.data ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {achievements.data.map((a) => {
              const got = !!a.unlocked_at;
              return (
                <li key={a.id} className={cn("flex flex-col items-center gap-1 rounded-card border-2 p-4 text-center", got ? "border-gold" : "border-border")}>
                  <span className={cn("text-[36px] leading-none", !got && "opacity-30 grayscale")} aria-hidden>
                    {a.icon}
                  </span>
                  <span className="font-extrabold leading-tight">{a.title}</span>
                  <span className="text-[13px] text-muted-foreground">{a.description}</span>
                  {!got && (
                    <span className="mt-1 text-[12px] font-extrabold tabular-nums text-muted-foreground">
                      {a.progress}/{a.target}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ErrorState onRetry={() => achievements.refetch()} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-section">Your career</h2>
        {career ? (
          <div className="flex items-center gap-3 rounded-card border-2 border-border p-4">
            <CareerBadge icon={career.icon} color={career.color} size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">{career.job_title}</p>
              <p className="text-caption text-muted-foreground">{career.one_liner}</p>
            </div>
            <Link to={`/learn/${career.slug}`} className="btn-text text-blue">
              Learn
            </Link>
          </div>
        ) : (
          <EmptyState title="No career yet" body="Pick one, or take the Vibe Check." action={<ChunkyButton asChild><Link to="/start">Choose a career</Link></ChunkyButton>} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-section">Certificates</h2>
        {certs.isLoading ? (
          <LoadingState rows={1} label="Loading certificates…" />
        ) : certs.data?.length ? (
          <ul className="flex flex-col gap-2">
            {certs.data.map((c) => {
              const cc = CAREERS.find((x) => x.slug === c.career_slug);
              return (
                <li key={c.id}>
                  <Link to={`/certificate/verify/${c.id}`} className="flex items-center gap-3 rounded-card border-2 border-border p-3 hover:bg-muted">
                    {cc && <CareerBadge icon={cc.icon} color={cc.color} size={40} />}
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{cc?.job_title} · Level 1</span>
                      <span className="block text-caption text-muted-foreground">
                        {c.score}% · {new Date(c.issued_at).toLocaleDateString()} · {c.id}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-card border-2 border-dashed border-border p-4 text-center text-muted-foreground">Beat a Boss Level to earn your first certificate.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-section">Settings</h2>
        <div className="flex items-center justify-between gap-3 rounded-card border-2 border-border p-4">
          <span className="flex items-center gap-2 font-bold">
            <Moon className="h-5 w-5 text-muted-foreground" /> Theme
          </span>
          <div className="flex gap-1" role="radiogroup" aria-label="Theme">
            {(["midnight", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => setTheme(t)}
                className={cn(
                  "rounded-btn border-2 px-3 py-1 text-caption font-extrabold capitalize",
                  theme === t ? "border-blue-border bg-blue-soft text-selected-fg" : "border-border text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-card border-2 border-border p-4">
          <span className="flex items-center gap-2 font-bold">
            <Volume2 className="h-5 w-5 text-muted-foreground" /> Sound effects
          </span>
          <Switch checked={sound.enabled} onCheckedChange={sound.setEnabled} aria-label="Sound effects" />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-card border-2 border-border p-4">
          <span className="font-bold">Daily goal</span>
          <div className="flex gap-1">
            {([10, 20, 30, 40] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update.mutate({ daily_goal_xp: g })}
                className={cn("rounded-btn border-2 px-2.5 py-1 text-caption font-extrabold", p.daily_goal_xp === g ? "border-blue-border bg-blue-soft text-blue-text" : "border-border text-muted-foreground")}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-card border-2 border-border p-4">
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-bold">
              <Snowflake className="h-5 w-5 text-blue" /> Streak freezes: {p.streak_freezes}
            </span>
            <span className="text-caption text-muted-foreground">
              {freeze.isError ? (freeze.error as Error).message : "Protects your streak for one missed day."}
            </span>
          </span>
          <ChunkyButton variant="outline" disabled={p.xp < 200 || freeze.isPending} onClick={() => freeze.mutate()}>
            200 XP
          </ChunkyButton>
        </div>
        <NotionSync />
      </section>

      {reset && (
        <button
          type="button"
          className="self-center text-caption font-bold text-muted-foreground underline hover:text-wrong-text"
          onClick={() => {
            if (confirm("Reset all demo data in this browser?")) reset.mutate(undefined, { onSuccess: () => (window.location.href = "/") });
          }}
        >
          Reset demo data
        </button>
      )}
    </Page>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border-2 border-border p-3">
      {icon}
      <div className="min-w-0">
        <p className="text-[20px] font-extrabold leading-tight">{value}</p>
        <p className="truncate text-caption text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** One series (XP per day): brand blue bars, rounded data-ends on the baseline, hover tooltip, today labelled. */
function XpChart({ days }: { days: DayXp[] }) {
  const max = Math.max(10, ...days.map((d) => d.xp));
  const today = localDateKey();
  const total = days.reduce((s, d) => s + d.xp, 0);
  const dayName = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
  };

  return (
    <figure className="rounded-card border-2 border-border p-4">
      <figcaption className="mb-4 text-caption text-muted-foreground">
        <strong className="text-foreground">{total} XP</strong> in the last 7 days
      </figcaption>
      {total === 0 && <p className="mb-2 text-caption text-muted-foreground">No XP yet this week. Finish a lesson to fill this up.</p>}
      <div className="relative flex h-40 items-end gap-2 border-b-2 border-border" aria-hidden>
        {days.map((d) => {
          const h = (d.xp / max) * 100;
          const isToday = d.date === today;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end" tabIndex={0}>
              {isToday && d.xp > 0 && <span className="mb-1 text-caption font-extrabold text-foreground">{d.xp}</span>}
              <div
                className={cn("w-full max-w-[36px] rounded-t-[4px] transition-[height] duration-500", isToday ? "bg-gold" : "bg-gold-lip")}
                style={{ height: `${Math.max(h, d.xp > 0 ? 3 : 0)}%` }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[12px] font-bold text-white group-hover:block group-focus:block">
                {dayName(d.date)}: {d.xp} XP
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        {days.map((d) => (
          <span key={d.date} className={cn("flex-1 text-center text-[12px] font-bold", d.date === today ? "text-foreground" : "text-muted-foreground")}>
            {dayName(d.date)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>XP per day, last 7 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.xp} XP</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function NotionSync() {
  const sync = useSyncToNotion();
  const mood = sync.isPending ? "coding" : sync.data?.ok ? "correct" : sync.data && !sync.data.ok ? "wrong" : null;
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-border p-4 text-center">
      {mood && <Byte mood={mood} size={96} />}
      <p className="font-bold">
        {sync.isPending
          ? "Syncing your progress to Notion…"
          : sync.data?.ok
            ? "Synced! Your study plan is in Notion."
            : sync.data
              ? sync.data.error
              : "Send your progress and study plan to Notion."}
      </p>
      {sync.data?.ok && sync.data.page_url && (
        <a href={sync.data.page_url} target="_blank" rel="noreferrer" className="font-bold text-link underline">
          Open in Notion
        </a>
      )}
      <ChunkyButton variant="outline" block disabled={sync.isPending} onClick={() => sync.mutate()}>
        {sync.data && !sync.data.ok ? "Try again" : "Sync to Notion"}
      </ChunkyButton>
    </div>
  );
}
