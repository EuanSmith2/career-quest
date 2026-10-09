import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Target, Clock, Shield } from "lucide-react";
import { BorderBeam } from "@/components/fx/BorderBeam";
import { NumberTicker } from "@/components/fx/NumberTicker";
import { SparklesText } from "@/components/fx/SparklesText";
import { useTheme } from "@/lib/theme";
import { Byte, MOODS, type ByteMood } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { ChunkyButton, type ChunkyVariant } from "@/components/ChunkyButton";
import { Logo, Wordmark } from "@/components/Logo";
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
  "background", "foreground", "muted-foreground", "muted", "muted-icon", "border", "border-deep",
  "primary", "primary-lip", "primary-fg", "correct", "correct-soft", "wrong", "wrong-soft",
  "blue", "blue-lip", "blue-soft", "blue-text", "purple", "gold", "flame", "red",
  "node-locked", "node-locked-icon", "boss", "noise-1", "noise-2", "disabled-bg",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border-2 border-border p-5">
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
  const [theme, setTheme] = useTheme();
  const [ticker, setTicker] = useState(120);
  const variants: ChunkyVariant[] = ["primary", "secondary", "correct", "danger", "outline", "ghost", "gold"];
  const optionStates: OptionState[] = ["idle", "selected", "scanning", "correct", "wrong", "dimmed"];

  return (
    <div className="mx-auto flex max-w-landing flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/" className="font-bold text-blue">
          Home
        </Link>
      </header>
      <h1 className="text-title">Styleguide</h1>
      <label className="flex items-center gap-3 font-bold">
        <Switch checked={theme === "midnight"} onCheckedChange={(on) => setTheme(on ? "midnight" : "light")} /> Midnight theme
      </label>

      <Section title="Type">
        <p className="text-title">Page title 32/40 · 800</p>
        <p className="text-section">Section heading 24/32 · 800</p>
        <p className="text-body">Body 17/24 · 500. Rounded and friendly.</p>
        <p className="text-caption text-muted-foreground">Caption 15px</p>
        <p className="btn-text">Button 15 · 700 · uppercase</p>
        <p className="mt-2 text-[56px] font-black leading-[1.02] tracking-[-0.035em]">
          You want a job in <span className="font-serif text-[1.12em] font-normal italic leading-[0.9]">cyber.</span>
        </p>
        <p className="font-mono text-[15px] text-muted-foreground">JetBrains Mono · fine print and stats</p>
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

      <Section title="Effects">
        <div className="flex flex-wrap items-center gap-8">
          <span className="relative grid h-[66px] w-[72px] place-items-center rounded-full bg-primary text-primary-fg">
            <Shield className="h-8 w-8" />
            <BorderBeam />
          </span>
          <button type="button" className="text-[32px] font-black text-gold" onClick={() => setTicker((t) => t + 45)}>
            <NumberTicker value={ticker} /> XP
          </button>
          <span className="text-section text-correct-text">
            <SparklesText>Amazing!</SparklesText>
          </span>
          <Wordmark className="text-[48px]" />
          <p className="font-mono text-[15px] text-muted-foreground">480 questions · each one linked to a real source</p>
          <p className="text-[40px] font-black leading-none tracking-[-0.035em]">
            Five minutes <span className="font-serif text-[1.12em] font-normal italic leading-[0.9]">a day.</span>
          </p>
        </div>
      </Section>

      <Section title="ProgressBar · SourceChip · StatTile">
        <div className="flex flex-col gap-4">
          <ProgressBar value={progress} knob />
          <input type="range" min={0} max={1} step={0.05} value={progress} onChange={(e) => setProgress(Number(e.target.value))} aria-label="Progress value" />
          <SourceChip source="NIST SP 800-115 — Planning" />
          <div className="flex gap-3">
            <StatTile tone="gold" label="Total XP" value={55} icon={<Zap className="h-5 w-5" />} />
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
