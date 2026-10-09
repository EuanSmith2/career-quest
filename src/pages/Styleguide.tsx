import { useState } from "react";
import { Link } from "react-router-dom";
import { Gem, Target, Clock } from "lucide-react";
import { AnswerTile, type TileState } from "@/components/AnswerTile";
import { Byte, MOODS, type ByteMood } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton, type ChunkyVariant } from "@/components/ChunkyButton";
import { Logo } from "@/components/Logo";
import { OptionCard, type OptionState } from "@/components/OptionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SourceChip } from "@/components/SourceChip";
import { StatTile } from "@/components/StatTile";
import { EmptyState, LoadingState } from "@/components/States";
import { Switch } from "@/components/ui/switch";
import { CAREERS } from "@/data/careers";
import { playSound, SOUND_NAMES, useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const TOKENS = [
  "background", "foreground", "muted-foreground", "muted", "border", "info-bg",
  "green", "green-lip", "green-soft", "blue", "blue-lip", "blue-soft", "blue-border",
  "red", "red-lip", "red-soft", "gold", "gold-lip", "flame", "disabled-bg", "disabled-fg",
  "arena", "arena-deep", "tile-red", "tile-blue", "tile-yellow", "tile-green",
];

function Section({ title, children, dark }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={cn("rounded-card p-5", dark ? "circuit-grid arena-surface text-white" : "border-2 border-border")}>
      <h2 className="mb-4 text-section">{title}</h2>
      {children}
    </section>
  );
}

/** Every building block on one page, plus a Byte mood picker and a sound-test grid. */
export default function Styleguide() {
  const [mood, setMood] = useState<ByteMood>("idle");
  const [progress, setProgress] = useState(0.4);
  const sound = useSound();
  const variants: ChunkyVariant[] = ["primary", "secondary", "danger", "outline", "ghost", "gold"];
  const optionStates: OptionState[] = ["idle", "selected", "correct", "wrong", "dimmed"];
  const tileStates: TileState[] = ["idle", "picked", "correct", "dimmed"];

  return (
    <div className="mx-auto flex max-w-landing flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/" className="font-bold text-blue">
          Home
        </Link>
      </header>
      <h1 className="text-title">Styleguide</h1>

      <Section title="Type">
        <p className="text-title">Page title 32/40 · 800</p>
        <p className="text-section">Section heading 24/32 · 800</p>
        <p className="text-body">Body 17/24 · 500. Rounded and friendly.</p>
        <p className="text-caption text-muted-foreground">Caption 15px</p>
        <p className="btn-text">Button 15 · 700 · uppercase</p>
        <p className="mt-2 font-arena text-[32px] font-extrabold">Arena question · Montserrat 800</p>
        <p className="font-arena text-[64px] font-black leading-none">870</p>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {TOKENS.map((t) => (
            <div key={t} className="text-[12px] font-bold">
              <div className="mb-1 h-12 rounded-btn border-2 border-border" style={{ background: `var(--${t})` }} />
              --{t}
            </div>
          ))}
        </div>
      </Section>

      <Section title="ChunkyButton">
        <div className="grid gap-3 sm:grid-cols-3">
          {variants.map((v) => (
            <ChunkyButton key={v} variant={v}>
              {v}
            </ChunkyButton>
          ))}
          <ChunkyButton disabled>Disabled</ChunkyButton>
          <ChunkyButton className="sm:col-span-2">A much longer label that has to wrap onto two lines instead of overflowing</ChunkyButton>
        </div>
      </Section>

      <Section title="OptionCard">
        <div className="flex flex-col gap-3">
          {optionStates.map((s, i) => (
            <OptionCard key={s} index={i % 4} state={s}>
              {s === "idle" ? "An idle option with a long answer that wraps over more than one line rather than being truncated" : s}
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section title="AnswerTile" dark>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <AnswerTile key={i} index={i}>
              {["Penetration Tester", "SOC Analyst", "Malware Analyst", "A very long answer that wraps and makes the tile grow taller"][i]}
            </AnswerTile>
          ))}
          {tileStates.map((s, i) => (
            <AnswerTile key={s} index={i} state={s}>
              {s}
            </AnswerTile>
          ))}
        </div>
      </Section>

      <Section title="ProgressBar · SourceChip · StatTile">
        <div className="flex flex-col gap-4">
          <ProgressBar value={progress} />
          <input type="range" min={0} max={1} step={0.05} value={progress} onChange={(e) => setProgress(Number(e.target.value))} aria-label="Progress value" />
          <SourceChip source="NIST SP 800-115 — Planning" />
          <div className="flex gap-3">
            <StatTile tone="gold" label="Total XP" value={55} icon={<Gem className="h-5 w-5" />} />
            <StatTile tone="green" label="Accuracy" value="100%" icon={<Target className="h-5 w-5" />} />
            <StatTile tone="blue" label="Time" value="1:42" icon={<Clock className="h-5 w-5" />} />
          </div>
        </div>
      </Section>

      <Section title="Career icons">
        <div className="flex flex-wrap gap-3">
          {CAREERS.map((c) => (
            <div key={c.slug} className="flex w-20 flex-col items-center gap-1 text-center text-[12px] font-bold">
              <CareerBadge icon={c.icon} color={c.color} size={48} />
              {c.job_title}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Byte mood picker">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Byte mood={mood} size={200} followPointer />
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={cn("rounded-btn border-2 px-3 py-1.5 text-caption font-bold", m === mood ? "border-blue-border bg-blue-soft text-blue-text" : "border-border")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Sound test">
        <label className="mb-4 flex items-center gap-3 font-bold">
          <Switch checked={sound.enabled} onCheckedChange={sound.setEnabled} /> Sound {sound.enabled ? "on" : "off (turn on to test)"}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SOUND_NAMES.map((n) => (
            <ChunkyButton key={n} variant="outline" className="normal-case" disabled={!sound.enabled} onClick={() => playSound(n)}>
              {n}
            </ChunkyButton>
          ))}
        </div>
      </Section>

      <Section title="States">
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingState rows={2} />
          <EmptyState title="Nothing here yet" body="Empty states use Byte idle." />
        </div>
      </Section>
    </div>
  );
}
