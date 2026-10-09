import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Byte, type ByteMood } from "@/components/Byte";
import { ChunkyButton } from "@/components/ChunkyButton";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

// The pitch slide shown before the demo. It keeps the Midnight look of the pitch intro (intro-v4) in both themes,
// so the slide looks the same even if the player has switched the app to Light.

const CARDS = [
  { label: "The problem", text: "Students want a cyber job but don't know which one fits them." },
  { label: "The gap", text: "To try a job, students start a 65-hour TryHackMe course." },
  {
    label: "Our fix",
    text: "Career Quest matches students to a job and lets them try it in five-minute lessons.",
    pick: true,
  },
];

// The intro's blur-in. MotionConfig reducedMotion="user" in App turns it into a plain fade.
// The filter is cleared afterwards: a leftover blur(0px) makes every later frame more expensive to paint.
const reveal = (delay: number) => ({
  initial: { opacity: 0, filter: "blur(14px)", y: 18 },
  animate: { opacity: 1, filter: "blur(0px)", y: 0, transitionEnd: { filter: "none" } },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay },
});

export default function About() {
  // The slide shows first. "Start the demo" plays the intro film; when it ends, or is skipped, the demo starts.
  const [film, setFilm] = useState(false);
  const navigate = useNavigate();
  const startDemo = () => navigate("/start");
  if (film) return <IntroFilm onDone={startDemo} onSkip={startDemo} />;
  return (
    <div className="min-h-dvh bg-black text-white" style={{ "--byte-shadow": "#1c1c1e" } as React.CSSProperties}>
      <header className="mx-auto flex h-16 max-w-[1080px] items-center justify-between px-4 md:px-6">
        <Link to="/" className="text-[22px] font-black tracking-[-.045em] text-[#1cb0f6]">
          career quest
        </Link>
        <nav className="flex gap-6 text-[15px] font-extrabold">
          <span aria-current="page" className="border-b-2 border-[#1cb0f6] py-1.5">
            About
          </span>
          <Link to="/start" className="border-b-2 border-transparent py-1.5 text-[#a1a1a6] hover:text-white">
            Demo
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1080px] flex-col gap-7 px-4 pb-8 pt-2 md:justify-center md:gap-9 md:px-6 md:pb-10 md:pt-6">
        <div className="flex flex-col-reverse items-center gap-3 text-center md:flex-row md:justify-between md:gap-8 md:text-left">
          <div>
            <motion.h1
              {...reveal(0)}
              className="text-[clamp(40px,5.6vw,76px)] font-black leading-[1.02] tracking-[-.035em] [text-wrap:balance]"
            >
              Find{" "}
              <span className="font-['Instrument_Serif',Georgia,serif] text-[1.12em] font-normal italic leading-[.9] tracking-[-.01em]">
                your
              </span>{" "}
              cyber job.
            </motion.h1>
            <motion.p {...reveal(0.12)} className="mt-3.5 text-[clamp(17px,1.7vw,22px)] font-extrabold text-[#a1a1a6]">
              Learn it in 5 minutes a day.
            </motion.p>
          </div>
          <HoppingByte />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.section
              key={card.label}
              {...reveal(0.3 + i * 0.12)}
              className={cn(
                "flex flex-col gap-3 rounded-[14px] border-2 border-b-4 p-[22px]",
                card.pick
                  ? "border-[#1cb0f6] bg-[#0a2433] shadow-[0_0_0_1px_rgba(28,176,246,.4),0_10px_30px_rgba(28,176,246,.25)]"
                  : "border-[#2c2c2e] bg-black",
              )}
            >
              <h2
                className={cn(
                  "text-[13px] font-extrabold uppercase tracking-[.06em]",
                  card.pick ? "text-[#8fd8fb]" : "text-[#a1a1a6]",
                )}
              >
                {card.label}
              </h2>
              <p className="text-[17px] font-extrabold leading-[1.35] tracking-[-.01em] [text-wrap:pretty] md:text-[19px]">
                {card.text}
              </p>
            </motion.section>
          ))}
        </div>

        <motion.div {...reveal(0.7)} className="md:self-center">
          <ChunkyButton variant="secondary" block className="text-black md:w-auto md:px-8" onClick={() => setFilm(true)}>
            Start the demo
            <ArrowRight className="h-5 w-5" strokeWidth={3} />
          </ChunkyButton>
        </motion.div>
      </main>
    </div>
  );
}

/**
 * The intro film (public/about-video/index.html, from the team's "Career Quest Midnight" artifact),
 * full-screen with a Skip button. The film posts "cq:intro-done" when it ends and "cq:intro-skip"
 * if Esc is pressed inside it; Esc on the page itself skips too.
 */
function IntroFilm({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handlers = useRef({ onDone, onSkip });
  handlers.current = { onDone, onSkip };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "cq:intro-done") handlers.current.onDone();
      if (e.data?.type === "cq:intro-skip") handlers.current.onSkip();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handlers.current.onSkip();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <iframe ref={frame} src="/about-video/index.html" title="Career Quest intro film" className="h-full w-full border-0" />
      <button
        type="button"
        onClick={onSkip}
        autoFocus
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border-2 border-[#2c2c2e] bg-black px-4 py-2 text-[13px] font-extrabold uppercase tracking-[.05em] text-[#8fd8fb] hover:border-[#1cb0f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1cb0f6] md:right-6 md:top-6"
      >
        Skip to the demo
        <ArrowRight className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}

// Byte's own "correct" reaction already crouches, hops twice and squashes on landing, with the floor
// shadow shrinking mid-air, so hopping is just switching moods. Don't animate a wrapper around him:
// the shadow would leave the floor too. The two hops take about 1.6 s; "correct" is held for 2.4 s because
// switching to idle while he's still in the air leaves him floating until the next hop.
function HoppingByte() {
  const reduce = useReducedMotion();
  const wide = useMedia("(min-width: 897px)");
  const [mood, setMood] = useState<ByteMood>("idle");

  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    const rest = () => {
      setMood("idle");
      timer = setTimeout(hop, 1600);
    };
    const hop = () => {
      setMood("correct");
      timer = setTimeout(rest, 2400);
    };
    timer = setTimeout(hop, 1000);
    return () => clearTimeout(timer);
  }, [reduce]);

  return <Byte className="shrink-0" mood={reduce ? "idle" : mood} size={wide ? 200 : 140} followPointer />;
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const list = matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
