import { Bot, Briefcase, Bug, Cloud, Cpu, HelpCircle, Lock, Network, Radar, Shield, Siren, Swords, Terminal, type LucideProps } from "lucide-react";

// Career icon names as stored in src/data/careers.ts → lucide components.
const ICONS = { Radar, Swords, Siren, Bug, Cloud, Terminal, Network, Shield, Briefcase, Lock, Cpu, Bot } as const;

export function CareerIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? HelpCircle;
  return <Icon aria-hidden {...props} />;
}

/** Icon on a career-coloured rounded square. `color` comes from the career row (data, not a token). */
export function CareerBadge({ icon, color, size = 48, className }: { icon: string; color: string; size?: number; className?: string }) {
  return (
    <span
      className={"inline-grid shrink-0 place-items-center rounded-[14px] text-white " + (className ?? "")}
      style={{ width: size, height: size, background: color, boxShadow: `0 4px 0 color-mix(in srgb, ${color} 75%, black)` }}
    >
      <CareerIcon name={icon} size={size * 0.55} strokeWidth={2.4} />
    </span>
  );
}
