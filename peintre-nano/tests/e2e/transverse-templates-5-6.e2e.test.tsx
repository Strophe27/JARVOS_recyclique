// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
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
  window.history.pushState({}, '', '/');
  cleanup();
});

function renderServedApp() {
  return render(
    <RootProviders>
      <App />
    </RootProviders>,
  );
}

function assertTransverseHubInMain(
  main: HTMLElement,
  expectedFamily: 'dashboard' | 'listing' | 'admin',
) {
  const unmapped = within(main).getByTestId('page-slot-unmapped');
  const shell = within(unmapped).getByTestId('transverse-page-shell');
  expect(shell.getAttribute('data-transverse-layout')).toBe('hub');
  expect(shell.getAttribute('data-transverse-family')).toBe(expectedFamily);
  expect(within(shell).getByTestId('transverse-page-state-slot').getAttribute('data-transverse-state')).toBe(
    'nominal',
  );
  expect(within(shell).getByTestId('transverse-page-header')).toBeTruthy();
  expect(within(shell).getByTestId('transverse-body-grid')).toBeTruthy();
}

describe('E2E — templates transverses (story 5.6)', () => {
  it('chemin nominal : dashboard → gabarit hub + famille dashboard sous page-slot-unmapped', () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button'));

    expect(window.location.pathname).toBe('/dashboard');
    const main = screen.getByTestId('shell-zone-main');
    assertTransverseHubInMain(main, 'dashboard');
  });

  it('chemin nominal : listing articles → même patron hub que le dashboard (famille listing)', () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-listing-articles')).getByRole('button'));

    expect(window.location.pathname).toBe('/listings/articles');
    const main = screen.getByTestId('shell-zone-main');
    assertTransverseHubInMain(main, 'listing');
  });

  it('chemin nominal : consultation article → patron consultation (deux colonnes + pied)', () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(
      within(within(nav).getByTestId('nav-entry-transverse-consultation-article')).getByRole('button'),
    );

    expect(window.location.pathname).toBe('/consultation/article');
    const main = screen.getByTestId('shell-zone-main');
    const unmapped = within(main).getByTestId('page-slot-unmapped');
    const shell = within(unmapped).getByTestId('transverse-page-shell');
    expect(shell.getAttribute('data-transverse-layout')).toBe('consultation');
    expect(shell.getAttribute('data-transverse-family')).toBe('consultation');
    expect(within(shell).getByTestId('transverse-two-column-body')).toBeTruthy();
    expect(within(shell).getByTestId('transverse-consultation-col-primary')).toBeTruthy();
    expect(within(shell).getByTestId('transverse-consultation-col-secondary')).toBeTruthy();
    expect(within(shell).getByTestId('transverse-consultation-footer')).toBeTruthy();
  });

  it('admin hub : gabarit hub famille admin', () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));

    expect(window.location.pathname).toBe('/admin');
    const main = screen.getByTestId('shell-zone-main');
    assertTransverseHubInMain(main, 'admin');
  });

  it('cas critique : accueil démo — pas de coquille transverse (page hors préfixe transverse-)', () => {
    renderServedApp();
    const root = screen.getByTestId('runtime-demo-root');
    expect(within(root).queryByTestId('transverse-page-shell')).toBeNull();
  });
});
