// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  DEMO_PERMISSION_VIEW_HOME,
  DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
  NAV_LABEL_KEY_TRANSVERSE_DASHBOARD,
  RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
  TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
  TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
  TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
} from '../../src/app/auth/default-demo-auth-adapter';
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

describe('E2E — navigation transverse commanditaire (story 5.1)', () => {
  it('expose les entrées dashboard et admin issues du manifest servi (libellés contrat)', () => {
    renderServedApp();

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).getByTestId('nav-entry-transverse-dashboard')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin')).toBeTruthy();
    expect(
      within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button', {
        name: DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
      }),
    ).toBeTruthy();
    expect(
      within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button', {
        name: 'Administration',
      }),
    ).toBeTruthy();
  });

  it('parcours dashboard : clic nav → composition PageManifest transverse-dashboard (story 5.2)', async () => {
    renderServedApp();

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const dashBtn = within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button');
    fireEvent.click(dashBtn);

    expect(window.location.pathname).toBe('/dashboard');
    const main = screen.getByTestId('shell-zone-main');
    expect(
      within(main).getByRole('heading', {
        level: 1,
        name: /Bienvenue sur RecyClique/i,
      }),
    ).toBeTruthy();
    expect(within(main).getByTestId('widget-legacy-dashboard-workspace')).toBeTruthy();
    await waitFor(() => {
      expect(within(main).getByTestId('stat-sales-revenue')).toBeTruthy();
    });
  });

  it('parcours admin : clic nav → hub PageManifest transverse-admin-placeholder (story 5.4)', () => {
    renderServedApp();

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
    fireEvent.click(adminBtn);

    expect(window.location.pathname).toBe('/admin');
    const main = screen.getByTestId('shell-zone-main');
    expect(
      within(main).getByRole('heading', {
        level: 2,
        name: /Admin transverse — hub/i,
      }),
    ).toBeTruthy();
    expect(within(main).getByText(/\/admin\/access/i)).toBeTruthy();
    expect(within(main).getByText(/\/admin\/site/i)).toBeTruthy();
  });

  it('synchronise la sélection nav depuis l’URL profonde /dashboard au montage', () => {
    window.history.pushState({}, '', '/dashboard');
    renderServedApp();

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const dashBtn = within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button');
    expect(dashBtn.getAttribute('aria-current')).toBe('true');

    const main = screen.getByTestId('shell-zone-main');
    expect(
      within(main).getByRole('heading', {
        level: 1,
        name: /Bienvenue sur RecyClique/i,
      }),
    ).toBeTruthy();
  });

  it('masque dashboard / admin sans permissions transverse (politique filtre manifeste)', () => {
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'demo-user' },
      envelope: createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [DEMO_PERMISSION_VIEW_HOME, RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND],
        },
      }),
    });

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).queryByTestId('nav-entry-transverse-dashboard')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-access')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-site')).toBeNull();
  });

  it('masque les entrées transverses si le marqueur site est absent (contexts_any)', () => {
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 'demo-user' },
      envelope: createDefaultDemoEnvelope({
        siteId: null,
        contextMarkers: [],
      }),
    });

    render(
      <RootProviders authAdapter={adapter}>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).queryByTestId('nav-entry-transverse-dashboard')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-access')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-site')).toBeNull();
  });

  describe('Story 5.2 — dashboard transverse (slots CREOS, cohérence nav)', () => {
    it('rend le manifest page-transverse-dashboard (topstrip shell + workspace legacy observable)', async () => {
      renderServedApp();

      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const dashBtn = within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button');
      fireEvent.click(dashBtn);

      expect(window.location.pathname).toBe('/dashboard');
      const header = screen.getByTestId('shell-zone-header');
      expect(within(header).getByTestId('widget-demo-legacy-app-topstrip')).toBeTruthy();
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-legacy-dashboard-workspace')).toBeTruthy();
      await waitFor(() => {
        expect(within(main).getByTestId('stat-sales-revenue')).toBeTruthy();
      });
      expect(
        within(main).getByRole('heading', { name: /Ventes \(Sorties\)/i }),
      ).toBeTruthy();
    });

    it('cohérence navigation : dashboard → accueil → dashboard (aria-current + URL)', async () => {
      renderServedApp();

      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const dashBtn = within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button');
      const homeBtn = within(within(nav).getByTestId('nav-entry-root-home')).getByRole('button');

      fireEvent.click(dashBtn);
      expect(window.location.pathname).toBe('/dashboard');
      expect(dashBtn.getAttribute('aria-current')).toBe('true');

      fireEvent.click(homeBtn);
      expect(window.location.pathname).toBe('/');
      expect(homeBtn.getAttribute('aria-current')).toBe('true');
      expect(dashBtn.getAttribute('aria-current')).toBeNull();

      const mainHome = screen.getByTestId('shell-zone-main');
      // Sur `/`, le bac à sable runtime compose la page démo (KPI manifeste, etc.) — pas forcément le h2 « Démo composition » dans cette zone.
      expect(within(mainHome).getByTestId('widget-demo-kpi')).toBeTruthy();
      expect(within(mainHome).getByText('42')).toBeTruthy();

      fireEvent.click(dashBtn);
      expect(window.location.pathname).toBe('/dashboard');
      expect(dashBtn.getAttribute('aria-current')).toBe('true');
      const mainDash = screen.getByTestId('shell-zone-main');
      await waitFor(() => {
        expect(within(mainDash).getByTestId('stat-sales-revenue')).toBeTruthy();
      });
    });
  });

  describe('Story 5.3 — listings et consultation transverses', () => {
    it('expose les quatre entrées nav du lot (libellés contrat)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(within(nav).getByTestId('nav-entry-transverse-listing-articles')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-listing-dons')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-consultation-article')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-consultation-don')).toBeTruthy();
    });

    it('parcours listing : articles → composition PageManifest + URL /listings/articles', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-listing-articles')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/listings/articles');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Listing transverse — articles \(stock\)/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByText(/Aucun widget data_contract/i)).toBeTruthy();
    });

    it('parcours consultation : fiche-type article → /consultation/article', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-consultation-article')).getByRole(
        'button',
      );
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/consultation/article');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Consultation transverse — fiche-type article/i,
        }),
      ).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /listings/dons', () => {
      window.history.pushState({}, '', '/listings/dons');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-listing-dons')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Listing transverse — dons \(entrée\)/i,
        }),
      ).toBeTruthy();
    });

    it('masque uniquement les entrées listings si transverse.listings.hub.view est absente', () => {
      const adapter = createMockAuthAdapter({
        session: { authenticated: true, userId: 'demo-user' },
        envelope: createDefaultDemoEnvelope({
          permissions: {
            permissionKeys: [
              DEMO_PERMISSION_VIEW_HOME,
              RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
              TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
              TRANSVERSE_PERMISSION_ADMIN_VIEW,
              TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
            ],
          },
        }),
      });
      render(
        <RootProviders authAdapter={adapter}>
          <App />
        </RootProviders>,
      );
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(within(nav).queryByTestId('nav-entry-transverse-listing-articles')).toBeNull();
      expect(within(nav).queryByTestId('nav-entry-transverse-listing-dons')).toBeNull();
      expect(within(nav).getByTestId('nav-entry-transverse-consultation-article')).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /consultation/don', () => {
      window.history.pushState({}, '', '/consultation/don');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-consultation-don')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Consultation transverse — fiche-type don/i,
        }),
      ).toBeTruthy();
      expect(
        within(main).getByText(/Epic 6 à 9/i),
      ).toBeTruthy();
    });

    it('masque uniquement les entrées consultation si transverse.consultation.hub.view est absente', () => {
      const adapter = createMockAuthAdapter({
        session: { authenticated: true, userId: 'demo-user' },
        envelope: createDefaultDemoEnvelope({
          permissions: {
            permissionKeys: [
              DEMO_PERMISSION_VIEW_HOME,
              RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
              TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
              TRANSVERSE_PERMISSION_ADMIN_VIEW,
              TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
            ],
          },
        }),
      });
      render(
        <RootProviders authAdapter={adapter}>
          <App />
        </RootProviders>,
      );
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(within(nav).queryByTestId('nav-entry-transverse-consultation-article')).toBeNull();
      expect(within(nav).queryByTestId('nav-entry-transverse-consultation-don')).toBeNull();
      expect(within(nav).getByTestId('nav-entry-transverse-listing-articles')).toBeTruthy();
    });
  });

  describe('Story 5.4 — admin transverse (lot access + site)', () => {
    it('expose les trois entrées nav admin du lot (libellés contrat)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(within(nav).getByTestId('nav-entry-transverse-admin')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-access')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-site')).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-access')).getByRole('button', {
          name: 'Accès et visibilité',
        }),
      ).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-site')).getByRole('button', {
          name: 'Site et périmètre',
        }),
      ).toBeTruthy();
    });

    it('parcours admin access : clic nav → /admin/access + composition overview', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-access')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/access');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Admin transverse — accès et visibilité/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByText(/Aucun widget data_contract/i)).toBeTruthy();
    });

    it('parcours admin site : clic nav → /admin/site + composition overview', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-site')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/site');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Admin transverse — site et périmètre/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByText(/Aucun widget data_contract/i)).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin au montage', () => {
      window.history.pushState({}, '', '/admin');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
      expect(adminBtn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Admin transverse — hub/i,
        }),
      ).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/site', () => {
      window.history.pushState({}, '', '/admin/site');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-site')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 2,
          name: /Admin transverse — site et périmètre/i,
        }),
      ).toBeTruthy();
    });

    it('hub admin puis sous-page access : deux clics, URL et titres cohérents', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin');
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin-access')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin/access');
      expect(
        within(screen.getByTestId('shell-zone-main')).getByRole('heading', {
          level: 2,
          name: /accès et visibilité/i,
        }),
      ).toBeTruthy();
    });

    it('hub admin puis sous-page site : deux clics, URL et titres cohérents', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin');
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin-site')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin/site');
      expect(
        within(screen.getByTestId('shell-zone-main')).getByRole('heading', {
          level: 2,
          name: /site et périmètre/i,
        }),
      ).toBeTruthy();
    });
  });

  describe('Story 5.5 — libellés backend + restriction_message', () => {
    it('affiche le texte résolu depuis presentation_labels pour le dashboard transverse', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button', {
          name: DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
        }),
      ).toBeTruthy();
    });

    it('fallback documenté : clé manifeste affichée si la valeur presentation_labels est absente ou vide', () => {
      const adapter = createMockAuthAdapter({
        session: { authenticated: true, userId: 'demo-user' },
        envelope: createDefaultDemoEnvelope({
          presentationLabels: { [NAV_LABEL_KEY_TRANSVERSE_DASHBOARD]: '' },
        }),
      });
      render(
        <RootProviders authAdapter={adapter}>
          <App />
        </RootProviders>,
      );
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button', {
          name: NAV_LABEL_KEY_TRANSVERSE_DASHBOARD,
        }),
      ).toBeTruthy();
    });

    it('ne montre pas le bandeau restriction_message quand l’enveloppe ne l’expose pas', () => {
      renderServedApp();
      expect(screen.queryByTestId('context-envelope-restriction-banner')).toBeNull();
    });

    it('affiche restriction_message sans court-circuiter la garde page (contexte dégradé)', () => {
      const adapter = createMockAuthAdapter({
        session: { authenticated: true, userId: 'demo-user' },
        envelope: createDefaultDemoEnvelope({
          restrictionMessage: 'Contexte dégradé (démo QA).',
          runtimeStatus: 'degraded',
        }),
      });
      render(
        <RootProviders authAdapter={adapter}>
          <App />
        </RootProviders>,
      );
      expect(screen.getByTestId('context-envelope-restriction-banner').textContent).toContain(
        'Contexte dégradé (démo QA).',
      );
      const blocked = screen.getByTestId('page-access-blocked');
      expect(blocked).toBeTruthy();
      expect(blocked.getAttribute('data-block-code')).toBe('DEGRADED_CONTEXT');
    });

    it('affiche restriction_message avec contexte forbidden + PageAccessBlocked FORBIDDEN', () => {
      const adapter = createMockAuthAdapter({
        session: { authenticated: true, userId: 'demo-user' },
        envelope: createDefaultDemoEnvelope({
          restrictionMessage: 'Contexte interdit (démo QA).',
          runtimeStatus: 'forbidden',
        }),
      });
      render(
        <RootProviders authAdapter={adapter}>
          <App />
        </RootProviders>,
      );
      expect(screen.getByTestId('context-envelope-restriction-banner').textContent).toContain(
        'Contexte interdit (démo QA).',
      );
      const blocked = screen.getByTestId('page-access-blocked');
      expect(blocked.getAttribute('data-block-code')).toBe('FORBIDDEN');
    });
  });
});
