// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('E2E — états transverses (story 5.7)', () => {
  it('dashboard : chargement via ?transverseState=loading', async () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button'));
    expect(window.location.pathname).toBe('/dashboard');

    window.history.pushState({}, '', '/dashboard?transverseState=loading');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      const main = screen.getByTestId('shell-zone-main');
      const dash = within(main).getByTestId('widget-legacy-dashboard-workspace');
      expect(within(dash).getByTestId('transverse-state-loading')).toBeTruthy();
      expect(
        within(dash).getByTestId('transverse-page-state-slot').getAttribute('data-transverse-state'),
      ).toBe('loading');
    });
  });

  it('listing articles : liste vide via ?transverseState=empty', async () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-listing-articles')).getByRole('button'));
    expect(window.location.pathname).toBe('/listings/articles');

    window.history.pushState({}, '', '/listings/articles?transverseState=empty');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      const main = screen.getByTestId('shell-zone-main');
      const shell = within(within(main).getByTestId('page-slot-unmapped')).getByTestId('transverse-page-shell');
      expect(within(shell).getByTestId('transverse-state-empty')).toBeTruthy();
    });
  });

  it('consultation article : erreur via ?transverseState=error', async () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(
      within(within(nav).getByTestId('nav-entry-transverse-consultation-article')).getByRole('button'),
    );
    expect(window.location.pathname).toBe('/consultation/article');

    window.history.pushState({}, '', '/consultation/article?transverseState=error');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      const main = screen.getByTestId('shell-zone-main');
      const shell = within(within(main).getByTestId('page-slot-unmapped')).getByTestId('transverse-page-shell');
      expect(within(shell).getByTestId('transverse-state-error')).toBeTruthy();
      expect(within(shell).getByTestId('transverse-state-error').textContent).toContain('TRANSVERSE_DEMO_FETCH_FAILED');
    });
  });

  it('admin : shell reste présent (navigation + zone main) en état erreur', async () => {
    renderServedApp();
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
    expect(window.location.pathname).toBe('/admin');

    window.history.pushState({}, '', '/admin?transverseState=error');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Zone navigation' })).toBeTruthy();
      const main = screen.getByTestId('shell-zone-main');
      const shell = within(within(main).getByTestId('page-slot-unmapped')).getByTestId('transverse-page-shell');
      expect(within(shell).getByTestId('transverse-state-error')).toBeTruthy();
    });
  });
});
