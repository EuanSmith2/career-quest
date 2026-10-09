import { forwardRef } from "react";
import { Award, ShieldCheck } from "lucide-react";
import type { Career, Certificate } from "@/api/types";
import { CareerBadge } from "./CareerIcon";
import { Logo } from "./Logo";

export const certificateName = (career: Career) => `Career Quest · ${career.job_title} · Level 1 complete`;

/** The printable certificate card (also rendered to PNG). */
export const CertificateCard = forwardRef<HTMLDivElement, { cert: Certificate; career: Career }>(function CertificateCard({ cert, career }, ref) {
  const date = new Date(cert.issued_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  return (
    <div ref={ref} data-print-card className="rounded-card bg-background p-2">
      <div className="relative overflow-hidden rounded-card border-[6px] border-gold bg-background px-5 py-8 text-center sm:px-10">
        <div className="absolute inset-2 rounded-[10px] border-2 border-gold-lip opacity-40" aria-hidden />
        <div className="relative flex flex-col items-center gap-3">
          <Logo />
          <p className="text-caption font-extrabold uppercase tracking-[3px] text-muted-foreground">Certificate of completion</p>
          <CareerBadge icon={career.icon} color={career.color} size={64} />
          <h2 className="text-[24px] font-black leading-tight sm:text-[28px]">
            Career Quest · {career.job_title} · <span className="text-green-lip">Level 1 complete</span>
          </h2>
          <p className="text-caption text-muted-foreground">awarded to</p>
          <p className="break-all text-[30px] font-black leading-tight text-blue-text">{cert.display_name}</p>
          <div className="mt-2 grid w-full grid-cols-3 gap-2 text-caption">
            <div>
              <p className="font-extrabold uppercase text-muted-foreground">Date</p>
              <p className="font-bold">{date}</p>
            </div>
            <div>
              <p className="font-extrabold uppercase text-muted-foreground">Score</p>
              <p className="flex items-center justify-center gap-1 font-bold">
                <Award className="h-4 w-4 text-gold-lip" />
                {cert.score}%
              </p>
            </div>
            <div>
              <p className="font-extrabold uppercase text-muted-foreground">Verify ID</p>
              <p className="break-all font-mono font-bold">{cert.id}</p>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[12px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />A Career Quest completion badge, not an industry certification.
          </p>
        </div>
      </div>
    </div>
  );
});
