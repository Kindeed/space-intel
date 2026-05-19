import type { ReactNode } from 'react';

export function PageShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <span>商业航天情报站</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </div>
  );
}
