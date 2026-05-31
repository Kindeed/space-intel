import type { ReactNode } from 'react';

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <span>航天信息</span>
        <h1>{title}</h1>
      </header>
      {children}
    </div>
  );
}
