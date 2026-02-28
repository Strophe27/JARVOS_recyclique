import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './app-shell.css';

export interface AppShellProps {
  nav: ReactNode;
  children: ReactNode;
}

export function AppShell({ nav, children }: AppShellProps) {
  const { user } = useAuth();

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-shell__header" data-testid="app-shell-header">
        <h1 className="app-shell__brand">RecyClique</h1>
        <p className="app-shell__header-meta" data-testid="app-shell-user">
          {user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Session non connectee'}
        </p>
      </header>
      <div className="app-shell__body" data-testid="app-shell-body">
        <aside className="app-shell__sidebar" data-testid="app-shell-sidebar">
          {nav}
        </aside>
        <main className="app-shell__main" data-testid="app-shell-main">
          <div className="app-shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}
