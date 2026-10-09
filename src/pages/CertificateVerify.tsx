import { Link, useParams } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { useCareer, useCertificate } from "@/api/hooks";
import { Byte } from "@/components/Byte";
import { CertificateCard } from "@/components/CertificateCard";
import { ChunkyButton } from "@/components/ChunkyButton";
import { Logo } from "@/components/Logo";
import { ErrorState, LoadingState } from "@/components/States";

/** Public, read-only certificate view. */
export default function CertificateVerify() {
  const { id = "" } = useParams();
  const cert = useCertificate(id);
  const career = useCareer(cert.data?.career_slug);

  return (
    <div className="min-h-dvh bg-muted">
      <header className="mx-auto flex max-w-app items-center px-4 py-4">
        <Link to="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex max-w-app flex-col gap-4 px-4 pb-12">
        {cert.isLoading || (cert.data && career.isLoading) ? (
          <LoadingState label="Checking certificate…" rows={2} />
        ) : cert.isError ? (
          <ErrorState onRetry={() => cert.refetch()} />
        ) : !cert.data || !career.data ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Byte mood="shocked" size={120} />
            <h1 className="text-section">Not found</h1>
            <p className="text-muted-foreground">
              No certificate has the ID <span className="font-mono font-bold">{id}</span>. Check the link and try again.
            </p>
          </div>
        ) : (
          <>
            <p className="flex items-center justify-center gap-2 rounded-full bg-green-soft px-4 py-2 font-extrabold text-green-lip">
              <BadgeCheck className="h-5 w-5" /> Verified Career Quest certificate
            </p>
            <CertificateCard cert={cert.data} career={career.data} />
          </>
        )}
        <ChunkyButton asChild variant="outline">
          <Link to="/">Try Career Quest</Link>
        </ChunkyButton>
      </main>
    </div>
  );
}
