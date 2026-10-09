import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, Heart, Lock, Shield, Star, Zap } from "lucide-react";
import { useCareers, useProfile, useSession } from "@/api/hooks";
import { useAccountUi } from "@/components/AccountSheets";
import { Byte, type ByteMood } from "@/components/Byte";
import { CareerBadge, CareerIcon } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { BlurIn } from "@/components/fx/BlurIn";
import { Marquee } from "@/components/fx/Marquee";
import { Logo, Wordmark } from "@/components/Logo";
import { CAREERS, SHORT_NAMES } from "@/data/careers";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

// ---------- the "noise": cyber jargon the product cuts through ----------
// Two bands (above and below the hero content) with fixed slots, so words never overlap each
// other or the headline. Phones get three per band; wider screens get seven.
const BAND = [
  ["SIEM", "mono"], ["OSCP", "display"], ["Security+", "serif"], ["ATT&CK", "archivo"], ["Burp Suite", "nunito"], ["YARA", "display"], ["Nmap", "mono"],
  ["Wireshark", "serif"], ["EDR", "mono"], ["Kerberos", "serif"], ["CTF", "display"], ["Zero Trust", "nunito"], ["Metasploit", "archivo"], ["TryHackMe", "nunito"],
] as const;
const PHONE_SLOTS = [0, 3, 6]; // which of the 7 per band show on phones
const NOISE_FONT: Record<string, string> = {
  mono: "font-mono",
  display: "font-display tracking-wide",
  serif: "font-serif italic",
  archivo: "font-['Archivo_Black']",
  nunito: "font-extrabold",
};

function NoiseField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {BAND.map(([word, font], i) => {
        const slot = i % 7;
        const top = i < 7;
        return (
          <span
            key={word}
            className={cn(
              "absolute -translate-x-1/2 animate-drift whitespace-nowrap text-[14px] md:text-[18px]",
              NOISE_FONT[font],
              i % 3 === 2 ? "text-noise-2" : "text-noise-1",
              !PHONE_SLOTS.includes(slot) && "hidden md:block",
            )}
            style={{
              left: `${8 + slot * 14}%`,
              [top ? "top" : "bottom"]: `${12 + (slot % 2) * 22}px`,
              animationDuration: `${18 + (i % 5) * 4}s`,
              animationDelay: `${-i * 1.7}s`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

/** Once per session: a blue dot appears, then a blue circle wipes outward to reveal the hero. Skippable. */
function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-background" exit={{ opacity: 0 }} transition={{ duration: 0.4 }} onClick={onDone}>
      <motion.span
        className="block rounded-full bg-blue"
        style={{ width: 18, height: 18, boxShadow: "0 0 24px 8px var(--blue-glow)" }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1, 1, 160] }}
        transition={{ duration: 1.8, times: [0, 0.25, 0.55, 1], ease: [0.22, 1, 0.36, 1] }}
      />
      <button type="button" onClick={onDone} className="absolute bottom-8 right-6 btn-text text-muted-foreground">
        Skip
      </button>
    </motion.div>
  );
}

const INTRO_KEY = "cq.introSeen"; // per-session convenience only

/** 12 career icons orbiting a central shield on two rings (orbiting-circles). */
function Orbit() {
  const { data: careers = CAREERS } = useCareers();
  const rings = [
    { list: careers.slice(0, 5), r: 78, dur: 30, size: 40 },
    { list: careers.slice(5), r: 138, dur: 46, size: 44 },
  ];
  return (
    <div className="relative mx-auto aspect-square w-[300px] sm:w-[320px]" aria-hidden>
      {rings.map((ring, ri) => (
        <div key={ri}>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" style={{ width: ring.r * 2, height: ring.r * 2 }} />
          <div
            className="absolute inset-0 animate-spin motion-reduce:animate-none"
            style={{ animationDuration: `${ring.dur}s`, animationDirection: ri ? "reverse" : "normal" }}
          >
            {ring.list.map((c, i) => {
              const a = (i / ring.list.length) * Math.PI * 2;
              return (
                <div key={c.slug} className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) translate(${Math.cos(a) * ring.r}px, ${Math.sin(a) * ring.r}px)` }}>
                  {/* counter-rotate so icons stay upright */}
                  <div className="animate-spin motion-reduce:animate-none" style={{ animationDuration: `${ring.dur}s`, animationDirection: ri ? "normal" : "reverse" }}>
                    <CareerBadge icon={c.icon} color={c.color} size={ring.size} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <span
        className="absolute left-1/2 top-1/2 grid h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[22px] bg-primary text-primary-fg"
        style={{ boxShadow: "0 6px 0 var(--primary-lip), 0 0 40px var(--blue-glow)" }}
      >
        <Shield className="h-10 w-10" strokeWidth={2.4} />
      </span>
    </div>
  );
}

/** Mini demo: the HUD above a short path, Byte talking beside it. */
function PathDemo() {
  const nodes: ("done" | "current" | "locked")[] = ["done", "done", "current", "locked", "locked"];
  const off = [0, 44, 66, 44, 0];
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-card border-2 border-border p-5" aria-hidden>
      <div className="mb-6 flex justify-between text-[20px] font-black tabular-nums">
        <span className="flex items-center gap-1 text-flame">
          <Flame className="h-6 w-6" fill="currentColor" />3
        </span>
        <span className="flex items-center gap-1 text-gold">
          <Zap className="h-6 w-6" fill="currentColor" />
          140
        </span>
        <span className="flex items-center gap-1 text-red">
          <Heart className="h-6 w-6" fill="currentColor" />5
        </span>
      </div>
      <div className="relative flex flex-col items-center gap-5">
        {nodes.map((s, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            className="chunky grid place-items-center rounded-[50%]"
            style={
              {
                x: off[i] - 40,
                width: 60,
                height: 55,
                background: s === "done" ? "var(--primary)" : s === "current" ? "var(--blue)" : "var(--node-locked)",
                color: s === "locked" ? "var(--node-locked-icon)" : "var(--primary-fg)",
                "--lip": "7px",
                "--lip-color": s === "locked" ? "var(--node-locked-lip)" : "var(--primary-lip)",
              } as React.CSSProperties
            }
          >
            {s === "done" ? <Check className="h-6 w-6" strokeWidth={3} /> : s === "current" ? <Star className="h-6 w-6" fill="currentColor" /> : <Lock className="h-6 w-6" />}
          </motion.span>
        ))}
        <div className="absolute -right-2 top-16">
          <Byte mood="talking" size={88} />
        </div>
      </div>
    </div>
  );
}

/** Mini demo: the 12 career tiles, scanning through them and landing on one (the "picked" state). */
function MatchDemo() {
  const reduce = useReducedMotion();
  const [scan, setScan] = useState(5);
  const [landed, setLanded] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    let n = 0;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      n++;
      if (n > 14) {
        setScan(5);
        setLanded(true);
        t = setTimeout(() => {
          n = 0;
          setLanded(false);
          step();
        }, 2600);
        return;
      }
      setScan((s) => (s + 1 + Math.floor(Math.random() * 4)) % CAREERS.length);
      t = setTimeout(step, 150);
    };
    t = setTimeout(step, 600);
    return () => clearTimeout(t);
  }, [reduce]);
  return (
    <div className="mx-auto grid w-full max-w-[420px] grid-cols-2 gap-2 min-[420px]:grid-cols-3" aria-hidden>
      {CAREERS.map((c, i) => {
        const on = i === scan;
        return (
          <div
            key={c.slug}
            className={cn(
              "flex items-center gap-2 rounded-tile border-2 px-3 py-2.5 text-[14px] font-extrabold leading-tight transition-all duration-200",
              on ? "border-blue bg-blue-soft text-selected-fg" : "border-border text-foreground",
              on && landed && "-translate-y-1 scale-[1.04] shadow-[0_0_0_1px_var(--blue-ring),0_10px_30px_var(--blue-shadow)]",
              landed && !on && "opacity-[0.35]",
            )}
            style={{ borderBottomWidth: 4, borderBottomColor: on ? "var(--blue-lip)" : "var(--border-deep)" }}
          >
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-[9px]", on && landed ? "bg-blue text-primary-fg" : "bg-muted")} style={on && landed ? undefined : { color: c.color }}>
              <CareerIcon name={c.icon} className="h-4 w-4" strokeWidth={2.6} />
            </span>
            <span className="min-w-0 break-words">{SHORT_NAMES[c.slug]}</span>
          </div>
        );
      })}
    </div>
  );
}

const Accent = ({ children }: { children: string }) => <span className="font-serif text-[1.12em] font-normal italic leading-[0.9]">{children}</span>;

export default function Landing() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: profile } = useProfile(!!session);
  const { data: careers = CAREERS } = useCareers();
  const { askNickname, openSaveProgress } = useAccountUi();
  const reduce = useReducedMotion();
  const [intro, setIntro] = useState(() => {
    if (reduce) return false;
    try {
      return sessionStorage.getItem(INTRO_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [mood, setMood] = useState<ByteMood>("wave");
  useEffect(() => {
    const t = setTimeout(() => setMood("idle"), 2600);
    return () => clearTimeout(t);
  }, []);

  const endIntro = () => {
    setIntro(false);
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode: it just plays again */
    }
  };

  const getStarted = () => {
    if (!session) return askNickname(() => navigate("/start"));
    navigate(profile?.chosen_career ? `/learn/${profile.chosen_career}` : "/start");
  };

  const buttons = (
    <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3 md:mx-0">
      <ChunkyButton block onClick={getStarted}>
        Get started
      </ChunkyButton>
      <ChunkyButton block variant="outline" onClick={() => openSaveProgress("signin")}>
        I already have an account
      </ChunkyButton>
    </div>
  );

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <AnimatePresence>{intro && <Intro onDone={endIntro} />}</AnimatePresence>

      <header className="relative z-10 mx-auto flex max-w-landing items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/styleguide" className="text-caption font-bold text-muted-foreground hover:text-link">
          Styleguide
        </Link>
      </header>

      {/* hero */}
      <section className="relative">
        <NoiseField />
        <div className="relative mx-auto grid max-w-landing items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="order-2 flex flex-col gap-6 text-center md:order-1 md:text-left">
            {!intro && (
              <>
                <BlurIn as="h1" className="text-balance text-[clamp(36px,6.4vw,84px)] font-black leading-[1.02] tracking-[-0.035em]">
                  You want a job in <Accent>cyber.</Accent> Where do you even start?
                </BlurIn>
                <BlurIn delay={0.25} as="p" className="text-body text-muted-foreground">
                  Find your cyber job. Learn it in 5 minutes a day.
                </BlurIn>
                <BlurIn delay={0.4}>{buttons}</BlurIn>
              </>
            )}
          </div>
          <div className="order-1 flex items-center justify-center md:order-2">
            <Orbit />
          </div>
        </div>
      </section>

      {/* career strip */}
      <nav className="border-y-2 border-border py-3" aria-label="Careers">
        <Marquee>
          {careers.map((c) => (
            <button key={c.slug} type="button" onClick={getStarted} className="flex shrink-0 items-center gap-2 rounded-btn px-3 py-2 btn-text text-muted-foreground hover:bg-muted">
              <CareerIcon name={c.icon} className="h-6 w-6" style={{ color: c.color }} strokeWidth={2.4} />
              {SHORT_NAMES[c.slug]}
            </button>
          ))}
        </Marquee>
      </nav>

      {/* split sections */}
      <section className="mx-auto grid max-w-landing items-center gap-10 px-4 py-20 md:grid-cols-2">
        <div className="text-center md:text-left">
          <h2 className="text-balance text-[clamp(34px,5.4vw,72px)] font-black leading-[1.02] tracking-[-0.035em]">
            Five minutes <Accent>a day.</Accent>
          </h2>
          <p className="mt-4 text-body text-muted-foreground">Short lessons, streaks and XP, like learning a language.</p>
        </div>
        <PathDemo />
      </section>

      <section className="mx-auto grid max-w-landing items-center gap-10 px-4 py-20 md:grid-cols-2">
        <div className="text-center md:order-2 md:text-left">
          <h2 className="text-balance text-[clamp(34px,5.4vw,72px)] font-black leading-[1.02] tracking-[-0.035em]">
            Matched to one of <Accent>12</Accent> cyber jobs.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">A quick vibe check picks the one that fits you.</p>
        </div>
        <div className="md:order-1">
          <MatchDemo />
        </div>
      </section>

      {/* closing block */}
      <section className="mx-auto flex max-w-landing flex-col items-center gap-6 px-4 pb-24 pt-10 text-center">
        <Byte mood={mood} size={160} followPointer />
        <Wordmark />
        <p className="text-balance text-[clamp(22px,3vw,32px)] font-black leading-tight tracking-[-0.02em]">
          Find your cyber job. Learn it in <Accent>5 minutes</Accent> a day.
        </p>
        <p className="font-mono text-[15px] font-medium text-muted-foreground">480 questions · each one linked to a real source</p>
        {buttons}
      </section>
    </div>
  );
}
