import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { AccountUiProvider } from "@/components/AccountSheets";
import { AppShell } from "@/components/AppShell";
import { GuestGate } from "@/components/GuestGate";
import { useProfile } from "@/api/hooks";
import { LoadingState } from "@/components/States";
const Landing = lazy(() => import("@/pages/Landing"));
const Start = lazy(() => import("@/pages/Start"));
const VibeCheck = lazy(() => import("@/pages/VibeCheck"));
const Match = lazy(() => import("@/pages/Match"));
const Warmup = lazy(() => import("@/pages/Warmup"));
const Learn = lazy(() => import("@/pages/Learn"));
const Lesson = lazy(() => import("@/pages/Lesson"));
const Boss = lazy(() => import("@/pages/Boss"));
const CertificatePage = lazy(() => import("@/pages/Certificate"));
const CertificateVerify = lazy(() => import("@/pages/CertificateVerify"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const Styleguide = lazy(() => import("@/pages/Styleguide"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});

/** /learn with no career: go to the chosen one, or pick one. */
function LearnIndex() {
  const { data: p, isLoading } = useProfile();
  if (isLoading) return null;
  return <Navigate to={p?.chosen_career ? `/learn/${p.chosen_career}` : "/start"} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          <BrowserRouter>
            <AccountUiProvider>
              <Suspense fallback={<LoadingState className="mx-auto max-w-app px-4" />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/styleguide" element={<Styleguide />} />
                  <Route path="/certificate/verify/:id" element={<CertificateVerify />} />

                  <Route element={<GuestGate />}>
                    <Route path="/start" element={<Start />} />
                    <Route path="/vibe-check" element={<VibeCheck />} />
                    <Route path="/match" element={<Match />} />
                    <Route path="/warmup/:career" element={<Warmup />} />
                    <Route path="/lesson/:career/:lessonKey" element={<Lesson />} />
                    <Route path="/boss/:career" element={<Boss />} />

                    <Route element={<AppShell />}>
                      <Route path="/learn" element={<LearnIndex />} />
                      <Route path="/learn/:career" element={<Learn />} />
                      <Route path="/certificate/:career" element={<CertificatePage />} />
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/profile" element={<Profile />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AccountUiProvider>
          </BrowserRouter>
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
