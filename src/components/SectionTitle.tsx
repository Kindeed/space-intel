import type { LucideIcon } from 'lucide-react';

export function SectionTitle({ icon: Icon, title, kicker }: { icon: LucideIcon; title: string; kicker?: string }) {
  return (
    <div className="section-title">
      <Icon size={17} aria-hidden="true" />
      <div>
        {kicker ? <span>{kicker}</span> : null}
        <h2>{title}</h2>
      </div>
    </div>
  );
}
