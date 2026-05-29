import type { ReactNode } from 'react';

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <span>商业航天情报站</span>
        <h1>{title}</h1>
      </header>
      {children}
    </div>
  );
}
