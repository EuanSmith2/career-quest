import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { AccountUiProvider } from "@/components/AccountSheets";
import { AppShell } from "@/components/AppShell";
import { GuestGate } from "@/components/GuestGate";
import { useProfile } from "@/api/hooks";
import Landing from "@/pages/Landing";
import Start from "@/pages/Start";
import VibeCheck from "@/pages/VibeCheck";
import Match from "@/pages/Match";
import Warmup from "@/pages/Warmup";
import Learn from "@/pages/Learn";
import Lesson from "@/pages/Lesson";
import Boss from "@/pages/Boss";
import CertificatePage from "@/pages/Certificate";
import CertificateVerify from "@/pages/CertificateVerify";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Styleguide from "@/pages/Styleguide";
import NotFound from "@/pages/NotFound";

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
            </AccountUiProvider>
          </BrowserRouter>
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
