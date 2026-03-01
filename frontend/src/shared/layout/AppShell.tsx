import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from '@mantine/core';
import { useAuth } from '../../auth/AuthContext';
import { AppShellNav } from './AppShellNav';
import { CAISSE_PIN_PATH } from '../../caisse/cashRegisterRoutes';
import './app-shell.css';

export interface AppShellProps {
  children: ReactNode;
}

const LOGIN_PATH = '/login';

function isAuthPage(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === CAISSE_PIN_PATH;
}

const FULL_SCREEN_PATHS = ['/cash-register/sale'] as const;

function isFullScreenPage(pathname: string): boolean {
  return FULL_SCREEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const fullScreen = isFullScreenPage(location.pathname);
  const showNav = !isAuthPage(location.pathname) && !fullScreen;

  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
    : 'Session non connectée';

  if (fullScreen) {
    return (
      <div className="app-shell" data-testid="app-shell">
        {children}
      </div>
    );
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <header
        className="app-shell__header app-shell__header--brand"
        data-testid="app-shell-header"
      >
        <div className="app-shell__header-left">
          <Link to="/dashboard" className="app-shell__logo" data-testid="app-shell-logo">
            <RecycleIcon />
            <span className="app-shell__brand-text">RecyClique</span>
          </Link>
        </div>

        <div className="app-shell__header-center">
          {showNav && <AppShellNav />}
        </div>

        <div className="app-shell__header-right">
          {user && (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <button
                  type="button"
                  className="app-shell__user-trigger"
                  data-testid="app-shell-user"
                >
                  <span className="app-shell__user-name">{displayName}</span>
                  <ChevronIcon />
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item component={Link} to="/profil">
                  Profil
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={() => void logout()}>
                  Déconnexion
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
          {!user && (
            <span className="app-shell__user-anonymous" data-testid="app-shell-user">
              {displayName}
            </span>
          )}
        </div>
      </header>
      <div className="app-shell__body" data-testid="app-shell-body">
        <main className="app-shell__main" data-testid="app-shell-main">
          <div className="app-shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}

function RecycleIcon() {
  return (
    <svg
      className="app-shell__logo-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="app-shell__chevron"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}
