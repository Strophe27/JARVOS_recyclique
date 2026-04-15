// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RootShell } from '../../src/app/layouts/RootShell';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/styles/tokens.css';

describe('RootShell — présentation locale (data-*)', () => {
  it('applique shellPresentation sur le nœud racine', () => {
    render(
      <RootProviders disableUserPrefsPersistence>
        <RootShell shellPresentation={{ uiDensity: 'compact', sidebarPanelOpen: false }}>
          <span>main</span>
        </RootShell>
      </RootProviders>,
    );
    const shell = screen.getByTestId('peintre-nano-shell');
    expect(shell.getAttribute('data-pn-ui-density')).toBe('compact');
    expect(shell.getAttribute('data-pn-sidebar-panel')).toBe('closed');
  });
});

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
});

describe('RootShell (grille et zones nommées)', () => {
  it('rend les régions shell avec data-testid attendus', () => {
    render(
      <RootProviders>
        <RootShell>
          <span>contenu main</span>
        </RootShell>
      </RootProviders>,
    );

    const shell = screen.getByTestId('peintre-nano-shell');
    expect(shell).toBeTruthy();
    expect(shell.getAttribute('data-pn-ui-density')).toBe('comfortable');
    expect(shell.getAttribute('data-pn-sidebar-panel')).toBe('open');
    expect(screen.getByTestId('shell-zone-header')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-main')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-aside')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-footer')).toBeTruthy();
    expect(screen.getByText('contenu main')).toBeTruthy();
  });

  it('permet de surcharger une zone via regions sans casser les data-testid shell', () => {
    render(
      <RootProviders>
        <RootShell regions={{ header: <span data-testid="custom-header">H</span> }}>
          <span>main body</span>
        </RootShell>
      </RootProviders>,
    );

    expect(screen.getByTestId('shell-zone-header')).toBeTruthy();
    expect(screen.getByTestId('custom-header')).toBeTruthy();
    expect(screen.getByText('main body')).toBeTruthy();
  });

  it('minimalChrome sans regions.header : pas de rangée header shell (alignement live / dashboard sans topstrip)', () => {
    render(
      <RootProviders>
        <RootShell minimalChrome regions={{ main: <span data-testid="live-main-only">corps</span> }}>
          <span>ignored</span>
        </RootShell>
      </RootProviders>,
    );

    expect(screen.queryByTestId('shell-zone-header')).toBeNull();
    expect(screen.getByTestId('live-main-only')).toBeTruthy();
  });

  it('hideNav : pas de zone nav, marqueur kiosque vente, grille sans colonne nav (story 11.3)', () => {
    render(
      <RootProviders>
        <RootShell hideNav regions={{ main: <span>plein écran caisse</span> }}>
          <span>ignored</span>
        </RootShell>
      </RootProviders>,
    );

    const shell = screen.getByTestId('peintre-nano-shell');
    expect(shell.getAttribute('data-pn-kiosk-nav-hidden')).toBe('true');
    expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();
    expect(screen.getByText('plein écran caisse')).toBeTruthy();
  });

  it('hideNav + minimalChrome : la zone aside reste observable (kiosque `/cash-register/sale`, shell live)', () => {
    render(
      <RootProviders>
        <RootShell
          hideNav
          minimalChrome
          regions={{
            main: <span data-testid="kiosk-sale-main">corps</span>,
            aside: <span data-testid="kiosk-sale-aside-slot">ticket</span>,
          }}
        />
      </RootProviders>,
    );

    const aside = screen.getByTestId('shell-zone-aside');
    expect(getComputedStyle(aside).display).not.toBe('none');
    expect(within(aside).getByTestId('kiosk-sale-aside-slot')).toBeTruthy();
  });
});
