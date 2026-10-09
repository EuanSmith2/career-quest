import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { Download, ExternalLink, Printer, Share2 } from "lucide-react";
import { useCareer, useMyCertificates } from "@/api/hooks";
import type { Career, Certificate } from "@/api/types";
import { Byte } from "@/components/Byte";
import { CertificateCard, certificateName } from "@/components/CertificateCard";
import { ChunkyButton } from "@/components/ChunkyButton";
import { Page } from "@/components/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";

export function linkedInUrl(cert: Certificate, career: Career) {
  const issued = new Date(cert.issued_at);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certificateName(career),
    organizationName: "Career Quest",
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: `${window.location.origin}/certificate/verify/${cert.id}`,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default function CertificatePage() {
  const { career: slug = "" } = useParams();
  const certs = useMyCertificates();
  const career = useCareer(slug);
  const card = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const cert = certs.data?.find((c) => c.career_slug === slug);

  if (certs.isLoading || career.isLoading) return <LoadingState label="Fetching your certificate…" />;
  if (certs.isError) return <ErrorState onRetry={() => certs.refetch()} />;
  if (!career.data) return <EmptyState title="Unknown career" action={<Link to="/start" className="font-bold text-blue">Pick a career</Link>} />;
  if (!cert)
    return (
      <EmptyState
        title="No certificate yet"
        body={`Beat the ${career.data.job_title} Boss Level (6 of 8 correct) to earn it.`}
        action={
          <ChunkyButton asChild>
            <Link to={`/learn/${slug}`}>Back to the path</Link>
          </ChunkyButton>
        }
      />
    );

  const c = career.data;
  const download = async () => {
    if (!card.current) return;
    setSaving(true);
    try {
      let url: string;
      try {
        url = await toPng(card.current, { pixelRatio: 2, cacheBust: true });
      } catch {
        url = await toPng(card.current, { pixelRatio: 2, skipFonts: true }); // offline: system fonts
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `career-quest-${c.slug}-${cert.id}.png`;
      a.click();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Byte mood="level-up" size={120} />
        <div>
          <h1 className="text-title-sm sm:text-title">You did it!</h1>
          <p className="text-muted-foreground">Share it, print it, then take the next real step.</p>
        </div>
      </div>

      <CertificateCard ref={card} cert={cert} career={c} />

      <div className="grid gap-3 sm:grid-cols-2">
        <ChunkyButton asChild variant="secondary">
          <a href={linkedInUrl(cert, c)} target="_blank" rel="noreferrer">
            <Share2 className="h-5 w-5" /> Add to LinkedIn
          </a>
        </ChunkyButton>
        <ChunkyButton variant="outline" onClick={download} disabled={saving}>
          <Download className="h-5 w-5" /> {saving ? "Rendering…" : "Download PNG"}
        </ChunkyButton>
      </div>
      <ChunkyButton variant="ghost" onClick={() => window.print()}>
        <Printer className="h-5 w-5" /> Print
      </ChunkyButton>

      <section className="rounded-card border-2 border-blue-border bg-blue-soft p-5">
        <h2 className="mb-1 text-[19px] font-extrabold text-blue-text">Next real-world step</h2>
        <p className="mb-3 font-bold">{c.next_cert}</p>
        {c.thm_path && (
          <a href={c.thm_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-extrabold text-blue-text underline">
            Start the TryHackMe path <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </section>

      <p className="text-center text-caption text-muted-foreground">
        Public link:{" "}
        <Link to={`/certificate/verify/${cert.id}`} className="font-bold text-blue">
          /certificate/verify/{cert.id}
        </Link>
      </p>
    </Page>
  );
}
