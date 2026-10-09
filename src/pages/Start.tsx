import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCareers, useUpdateProfile } from "@/api/hooks";
import { Byte, useLipSync } from "@/components/Byte";
import { CareerBadge } from "@/components/CareerIcon";
import { Logo } from "@/components/Logo";
import { Page } from "@/components/Page";
import { ErrorState, LoadingState } from "@/components/States";

const LINE = "What do you want to be? Pick a job, or let me help you find one.";

/** "What do you want to be?" — 12 career cards plus "I don't know yet". */
export default function Start() {
  const navigate = useNavigate();
  const careers = useCareers();
  const update = useUpdateProfile();
  const { typed, mouth, mouthShape, done, skip } = useLipSync(LINE);

  const pick = (slug: string) => {
    update.mutate({ chosen_career: slug });
    navigate(`/warmup/${slug}`);
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-[900px] items-center px-4 py-4">
        <Logo />
      </header>
      <Page className="mx-auto max-w-[900px] px-4 pb-16">
        <div className="mb-6 flex items-end gap-3">
          <Byte mood={done ? "idle" : "talking"} mouth={mouth} mouthShape={mouthShape} size={96} followPointer />
          <button
            type="button"
            onClick={skip}
            className="relative mb-6 min-h-[56px] flex-1 rounded-card border-2 border-border bg-background px-4 py-3 text-left text-body font-bold"
          >
            <span aria-hidden className="absolute -left-[9px] bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-border bg-background" />
            <span aria-live="polite">{typed}</span>
            <span className="sr-only">{LINE}</span>
          </button>
        </div>

        <h1 className="mb-4 text-title-sm sm:text-title">What do you want to be?</h1>

        {careers.isLoading ? (
          <LoadingState label="Loading careers…" />
        ) : careers.isError ? (
          <ErrorState onRetry={() => careers.refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-3">
            {careers.data?.map((c, i) => (
              <motion.button
                key={c.slug}
                type="button"
                onClick={() => pick(c.slug)}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 22 }}
                className="chunky flex items-center gap-3 rounded-card border-2 border-border bg-background p-4 text-left hover:bg-muted"
              >
                <CareerBadge icon={c.icon} color={c.color} size={48} />
                <span className="min-w-0">
                  <span className="block font-extrabold leading-tight">{c.job_title}</span>
                  <span className="block text-caption text-muted-foreground">{c.one_liner}</span>
                </span>
              </motion.button>
            ))}
            <motion.button
              type="button"
              onClick={() => navigate("/vibe-check")}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 22 }}
              className="chunky flex items-center gap-3 rounded-card border-2 border-blue-border bg-blue-soft p-4 text-left min-[400px]:col-span-2 md:col-span-3"
              style={{ "--lip-color": "var(--blue-border)" } as React.CSSProperties}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-background text-[28px]">🤷</span>
              <span>
                <span className="block font-extrabold text-blue-text">I don't know yet 🤷</span>
                <span className="block text-caption text-muted-foreground">Take the 8-question Vibe Check and we'll match you.</span>
              </span>
            </motion.button>
          </div>
        )}
      </Page>
    </div>
  );
}
