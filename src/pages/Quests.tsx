import { Lock, Medal } from "lucide-react";
import { useQuests } from "@/api/hooks";
import { Byte } from "@/components/Byte";
import { Page } from "@/components/Page";
import { QuestList, QuestRefresh } from "@/components/QuestList";
import { ErrorState, LoadingState } from "@/components/States";

/** Daily quests, a locked "more soon" row and the monthly challenge badge. */
export default function Quests() {
  const quests = useQuests();
  const month = new Date().toLocaleDateString(undefined, { month: "long" });
  return (
    <Page className="flex flex-col gap-6">
      <section className="flex items-center gap-4 overflow-hidden rounded-card bg-purple p-5 text-ink-bright">
        <div className="min-w-0 flex-1">
          <h1 className="text-title-sm font-black leading-tight">Welcome!</h1>
          <p className="font-bold">Complete quests to earn rewards. Quests refresh every day.</p>
        </div>
        <Byte mood="chest" size={140} className="-my-4 shrink-0" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-section">Daily quests</h2>
          {quests.data && <QuestRefresh quests={quests.data} />}
        </div>
        {quests.isLoading ? (
          <LoadingState rows={3} label="Loading quests…" />
        ) : quests.isError || !quests.data ? (
          <ErrorState onRetry={() => quests.refetch()} />
        ) : (
          <div className="rounded-card border-2 border-border p-5">
            <QuestList quests={quests.data} />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 rounded-card border-2 border-dashed border-border p-4 text-muted-foreground">
        <Lock className="h-6 w-6 shrink-0" />
        <p className="font-bold">More quests unlock soon</p>
      </div>

      <section>
        <h2 className="mb-3 text-section">Monthly challenge</h2>
        <div className="flex items-center gap-4 rounded-card border-2 border-border p-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-gold text-ink-bright">
            <Medal className="h-9 w-9" />
          </span>
          <div>
            <p className="text-caption font-extrabold uppercase tracking-wide text-gold">{month} badge</p>
            <p className="font-extrabold">Complete 20 quests this month</p>
            <p className="text-caption text-muted-foreground">Earn the {month} badge for your profile.</p>
          </div>
        </div>
      </section>
    </Page>
  );
}
