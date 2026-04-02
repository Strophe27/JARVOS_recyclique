// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/styles/tokens.css';

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

/** Même arbre que `main.tsx` sans `StrictMode` : en test, StrictMode peut laisser plusieurs racines dans le document. */
function renderFullApp() {
  return render(
    <RootProviders>
      <App />
    </RootProviders>,
  );
}

describe('E2E — shell Peintre_nano (rendu racine)', () => {
  it('affiche le shell, les cinq zones et le titre principal visible', () => {
    renderFullApp();

    expect(screen.getByTestId('peintre-nano-shell')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-header')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-main')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-aside')).toBeTruthy();
    expect(screen.getByTestId('shell-zone-footer')).toBeTruthy();

    expect(
      screen.getByRole('heading', { level: 1, name: /Socle Peintre_nano/i }),
    ).toBeTruthy();
  });

  it('place le contenu de page dans la zone main (pas seulement le shell vide)', () => {
    renderFullApp();

    const main = screen.getByTestId('shell-zone-main');
    expect(
      within(main).getByRole('heading', { level: 1, name: /Socle Peintre_nano/i }),
    ).toBeTruthy();
    expect(within(main).getByText(/Quatre artefacts minimaux/i)).toBeTruthy();
  });

  it('expose la navigation latérale avec un nom accessible', () => {
    renderFullApp();

    expect(screen.getByRole('navigation', { name: 'Zone navigation' })).toBeTruthy();
  });

  it('affiche le statut de validation des manifests dans la zone main (jeu valide)', () => {
    renderFullApp();

    const main = screen.getByTestId('shell-zone-main');
    const status = within(main).getByTestId('manifest-bundle-ok');
    expect(status).toBeTruthy();
    expect(status.textContent ?? '').toMatch(/Manifests validés/i);
  });

  it('rend le catalogue démo déclaratif dans les zones shell (manifest valide)', () => {
    renderFullApp();

    expect(within(screen.getByTestId('shell-zone-header')).getByTestId('widget-demo-text-block')).toBeTruthy();
    expect(within(screen.getByTestId('shell-zone-main')).getByTestId('widget-demo-kpi')).toBeTruthy();
    expect(within(screen.getByTestId('shell-zone-main')).getByTestId('widget-demo-card')).toBeTruthy();
    expect(within(screen.getByTestId('shell-zone-aside')).getByTestId('widget-demo-list-simple')).toBeTruthy();
  });
});
