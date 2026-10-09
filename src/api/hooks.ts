import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./index";
import type { AnswerRecord, Difficulty, FeedbackKind, Profile } from "./types";

// The only data entry point for components. Each hook calls `api`; nothing else knows where data lives.

export const keys = {
  session: ["session"] as const,
  careers: ["careers"] as const,
  questions: (slug: string, difficulty?: Difficulty) => ["questions", slug, difficulty ?? "all"] as const,
  profile: ["profile"] as const,
  progress: (slug: string) => ["progress", slug] as const,
  certificate: (id: string) => ["certificate", id] as const,
  myCertificates: ["certificates", "mine"] as const,
  leaderboard: ["leaderboard"] as const,
  weeklyXp: ["weeklyXp"] as const,
  quests: ["quests"] as const,
};

// ---------- session ----------

export function useSession() {
  return useQuery({ queryKey: keys.session, queryFn: () => api.getSession() });
}

export function useStartGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nickname: string) => api.startGuest(nickname),
    onSuccess: (s) => {
      qc.setQueryData(keys.session, s);
      void qc.invalidateQueries();
    },
  });
}

export function useSendMagicLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.sendMagicLink(email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.session });
      void qc.invalidateQueries({ queryKey: keys.profile });
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: () => qc.clear(),
  });
}

// ---------- content ----------

export function useCareers() {
  return useQuery({ queryKey: keys.careers, queryFn: () => api.listCareers(), staleTime: Infinity });
}

/** One career by slug, from the cached list. */
export function useCareer(slug: string | null | undefined) {
  const q = useCareers();
  return { ...q, data: q.data?.find((c) => c.slug === slug) };
}

export function useQuestions(career_slug: string | undefined, difficulty?: Difficulty) {
  return useQuery({
    queryKey: keys.questions(career_slug ?? "", difficulty),
    queryFn: () => api.listQuestions({ career_slug: career_slug!, difficulty }),
    enabled: !!career_slug,
    staleTime: Infinity,
  });
}

// ---------- profile + progress ----------

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: () => api.getProfile() });
}

function useProfileWriter() {
  const qc = useQueryClient();
  return (p: Profile) => {
    qc.setQueryData(keys.profile, p);
    void qc.invalidateQueries({ queryKey: keys.leaderboard });
    void qc.invalidateQueries({ queryKey: keys.weeklyXp });
    void qc.invalidateQueries({ queryKey: keys.quests });
  };
}

export function useUpdateProfile() {
  const setProfile = useProfileWriter();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateProfile>[0]) => api.updateProfile(patch),
    onSuccess: setProfile,
  });
}

export function useRecordAnswer() {
  const setProfile = useProfileWriter();
  return useMutation({ mutationFn: (a: AnswerRecord) => api.recordAnswer(a), onSuccess: setProfile });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  const setProfile = useProfileWriter();
  return useMutation({
    mutationFn: (p: Parameters<typeof api.completeLesson>[0]) => api.completeLesson(p),
    onSuccess: (r, vars) => {
      setProfile(r.profile);
      void qc.invalidateQueries({ queryKey: keys.progress(vars.career_slug) });
    },
  });
}

export function useLessonProgress(career_slug: string | undefined) {
  return useQuery({
    queryKey: keys.progress(career_slug ?? ""),
    queryFn: () => api.listLessonProgress(career_slug!),
    enabled: !!career_slug,
  });
}

export function useRefillHeart() {
  const setProfile = useProfileWriter();
  return useMutation({ mutationFn: () => api.refillHeartByPractice(), onSuccess: setProfile });
}

export function useBuyStreakFreeze() {
  const setProfile = useProfileWriter();
  return useMutation({ mutationFn: () => api.buyStreakFreeze(), onSuccess: setProfile });
}

// ---------- certificates ----------

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { career_slug: string; score: number }) => api.issueCertificate(p),
    onSuccess: (c) => {
      qc.setQueryData(keys.certificate(c.id), c);
      void qc.invalidateQueries({ queryKey: keys.myCertificates });
    },
  });
}

export function useCertificate(id: string | undefined) {
  return useQuery({ queryKey: keys.certificate(id ?? ""), queryFn: () => api.getCertificate(id!), enabled: !!id });
}

export function useMyCertificates() {
  return useQuery({ queryKey: keys.myCertificates, queryFn: () => api.listMyCertificates() });
}

// ---------- social + stats ----------

export function useLeaderboard() {
  return useQuery({ queryKey: keys.leaderboard, queryFn: () => api.getWeeklyLeaderboard() });
}

export function useWeeklyXp() {
  return useQuery({ queryKey: keys.weeklyXp, queryFn: () => api.getWeeklyXp() });
}

export function useQuests() {
  return useQuery({ queryKey: keys.quests, queryFn: () => api.getQuests() });
}

// ---------- crowd-verification + sponsor ----------

export function useSubmitFeedback() {
  return useMutation({ mutationFn: (f: { question_id: string; kind: FeedbackKind }) => api.submitQuestionFeedback(f) });
}

export function useSyncToNotion() {
  return useMutation({ mutationFn: () => api.syncToNotion() });
}

// ---------- mock only ----------

/** Present only when the API implements resetDemoData (the mock). */
export function useResetDemoData() {
  const qc = useQueryClient();
  const reset = api.resetDemoData;
  const mutation = useMutation({
    mutationFn: async () => {
      await reset?.();
    },
    onSuccess: () => qc.clear(),
  });
  return reset ? mutation : null;
}

export const serverNow = () => api.serverNow();
