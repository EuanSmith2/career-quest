import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCareers, useProfile, useSession } from "@/api/hooks";
import { Byte, type ByteMood } from "@/components/Byte";
import { CareerBadge, CareerIcon } from "@/components/CareerIcon";
import { ChunkyButton } from "@/components/ChunkyButton";
import { Logo } from "@/components/Logo";
import { useAccountUi } from "@/components/AccountSheets";
import { CAREERS, SHORT_NAMES } from "@/data/careers";

// Where each floating icon sits in the left cloud (percent of the cloud box).
const CLOUD = [
  [8, 6], [42, 2], [74, 10], [20, 30], [56, 26], [86, 36],
  [4, 56], [36, 52], [68, 58], [16, 80], [50, 82], [82, 78],
];

export default function Landing() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const { data: careers = CAREERS } = useCareers();
  const { askNickname, openSaveProgress } = useAccountUi();
  const [mood, setMood] = useState<ByteMood>("wave");

  useEffect(() => {
    const t = setTimeout(() => setMood("idle"), 2600);
    return () => clearTimeout(t);
  }, []);

  const getStarted = () => {
    if (!session) return askNickname(() => navigate("/start"));
    navigate(profile?.chosen_career ? `/learn/${profile.chosen_career}` : "/start");
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-landing items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/styleguide" className="text-caption font-bold text-muted-foreground hover:text-blue">
          Styleguide
        </Link>
      </header>

      <main className="mx-auto max-w-landing px-4">
        <section className="grid items-center gap-8 py-8 md:grid-cols-[1fr_auto_1fr] md:py-16">
          {/* floating career icons */}
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[280px] md:aspect-square md:max-w-[340px]" aria-hidden>
            {careers.map((c, i) => (
              <motion.div
                key={c.slug}
                className="absolute"
                style={{ left: `${CLOUD[i][0]}%`, top: `${CLOUD[i][1]}%` }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 18 }}
              >
                <div className="animate-drift" style={{ animationDelay: `${-i * 0.8}s`, animationDuration: `${8 + (i % 4)}s` }}>
                  <CareerBadge icon={c.icon} color={c.color} size={i % 3 === 0 ? 52 : 44} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <Byte mood={mood} size={200} followPointer />
            <h1 className="max-w-[420px] text-title-sm sm:text-title">
              Find your cyber career. <span className="text-green">Learn it in 5 minutes a day.</span>
            </h1>
          </div>

          <div className="mx-auto flex w-full max-w-[330px] flex-col gap-3">
            <ChunkyButton block onClick={getStarted}>
              Get started
            </ChunkyButton>
            <ChunkyButton block variant="outline" onClick={() => openSaveProgress("signin")}>
              I already have an account
            </ChunkyButton>
          </div>
        </section>
      </main>

      {/* career strip, like a language picker */}
      <nav className="border-t-2 border-border" aria-label="Careers">
        <ul className="scrollbar-none mx-auto flex max-w-landing gap-2 overflow-x-auto px-4 py-4">
          {careers.map((c) => (
            <li key={c.slug} className="shrink-0">
              <button
                type="button"
                onClick={getStarted}
                className="flex items-center gap-2 rounded-btn px-3 py-2 btn-text text-muted-foreground hover:bg-muted"
              >
                <CareerIcon name={c.icon} className="h-6 w-6" style={{ color: c.color }} strokeWidth={2.4} />
                {SHORT_NAMES[c.slug] ?? c.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
