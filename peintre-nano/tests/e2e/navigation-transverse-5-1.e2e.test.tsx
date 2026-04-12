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
    expect(within(nav).getByTestId('nav-entry-transverse-dashboard-benevole')).toBeTruthy();
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

  it('parcours admin : clic nav → hub PageManifest transverse-admin-reports-hub (stories 5.4 + 18.1)', () => {
    renderServedApp();

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
    fireEvent.click(adminBtn);

    expect(window.location.pathname).toBe('/admin');
    const main = screen.getByTestId('shell-zone-main');
    expect(
      within(main).getByRole('heading', {
        level: 1,
        name: /Rapports admin et supervision caisse/i,
      }),
    ).toBeTruthy();
    const hub = within(main).getByTestId('admin-reports-supervision-hub');
    expect(hub).toBeTruthy();
    expect(within(hub).getByText(/recyclique_admin_reports_cashSessionsExportBulk/i)).toBeTruthy();
    expect(within(hub).getByText(/recyclique_admin_reports_receptionTicketsExportBulk/i)).toBeTruthy();
    expect(within(hub).getByTestId('admin-hub-link-cash-registers')).toBeTruthy();
    expect(within(hub).getByTestId('admin-hub-link-pending')).toBeTruthy();
    expect(within(hub).getByTestId('admin-hub-link-sites')).toBeTruthy();
    expect(within(hub).getByTestId('admin-hub-link-session-manager')).toBeTruthy();
    expect(within(hub).getByTestId('admin-hub-link-reception-stats')).toBeTruthy();
    expect(within(hub).getByTestId('admin-hub-link-reception-sessions')).toBeTruthy();
    expect(within(hub).getByRole('heading', { name: /Entrées de supervision/i })).toBeTruthy();
    expect(within(hub).getByRole('heading', { name: /Sessions de caisse/i })).toBeTruthy();
    expect(within(main).getByTestId('admin-legacy-dashboard-home')).toBeTruthy();
    expect(within(main).getByRole('heading', { name: /Statistiques quotidiennes/i })).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-access')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-site')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-pending')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-cash-registers')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-sites')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-session-manager')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-reception-stats')).toBeTruthy();
    expect(within(nav).getByTestId('nav-entry-transverse-admin-reception-sessions')).toBeTruthy();
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
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-pending')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-cash-registers')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-sites')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-session-manager')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-stats')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-sessions')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-reports')).toBeNull();
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
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-pending')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-cash-registers')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-sites')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-session-manager')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-stats')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-sessions')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-transverse-admin-reports')).toBeNull();
  });

  describe('Story 5.2 — dashboard transverse (slots CREOS, cohérence nav)', () => {
    it('rend le manifest page-transverse-dashboard (sans topstrip — marque dans la nav en live ; bac à sable sans widget header)', async () => {
      renderServedApp();

      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const dashBtn = within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button');
      fireEvent.click(dashBtn);

      expect(window.location.pathname).toBe('/dashboard');
      expect(screen.queryByTestId('widget-demo-legacy-app-topstrip')).toBeNull();
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-legacy-dashboard-workspace')).toBeTruthy();
      await waitFor(() => {
        expect(within(main).getByTestId('stat-sales-revenue')).toBeTruthy();
      });
      expect(
        within(main).getByRole('heading', { name: /Ventes \(Sorties\)/i }),
      ).toBeTruthy();
    });

    it('URL profonde /dashboard/benevole : composition PageManifest transverse-dashboard-benevole', () => {
      window.history.pushState({}, '', '/dashboard/benevole');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const personalBtn = within(within(nav).getByTestId('nav-entry-transverse-dashboard-benevole')).getByRole(
        'button',
      );
      expect(personalBtn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-legacy-dashboard-personal')).toBeTruthy();
      expect(
        within(main).getByRole('heading', {
          level: 1,
          name: /Bienvenue,/i,
        }),
      ).toBeTruthy();
    });

    it('depuis le workspace dashboard, navigation vers /dashboard/benevole (popstate) affiche l’espace personnel', async () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-dashboard')).getByRole('button'));
      const main = screen.getByTestId('shell-zone-main');
      await waitFor(() => {
        expect(within(main).getByTestId('widget-legacy-dashboard-workspace')).toBeTruthy();
      });
      window.history.pushState({}, '', '/dashboard/benevole');
      fireEvent.popState(window);
      await waitFor(() => {
        expect(within(screen.getByTestId('shell-zone-main')).getByTestId('widget-legacy-dashboard-personal')).toBeTruthy();
      });
      const personalNav = within(within(nav).getByTestId('nav-entry-transverse-dashboard-benevole')).getByRole(
        'button',
      );
      expect(personalNav.getAttribute('aria-current')).toBe('true');
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
    it('expose les entrées nav admin du lot y compris pending (libellés contrat)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(within(nav).getByTestId('nav-entry-transverse-admin')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-access')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-site')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-pending')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-cash-registers')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-sites')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-session-manager')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-reception-stats')).toBeTruthy();
      expect(within(nav).getByTestId('nav-entry-transverse-admin-reception-sessions')).toBeTruthy();
      // Pas d’entrée nav `transverse-admin-reports` : collision `page_key` avec `/admin` (18.1).
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
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-pending')).getByRole('button', {
          name: 'Utilisateurs en attente',
        }),
      ).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-cash-registers')).getByRole('button', {
          name: 'Caisses enregistrées',
        }),
      ).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-sites')).getByRole('button', {
          name: 'Sites (legacy)',
        }),
      ).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-session-manager')).getByRole('button', {
          name: 'Sessions caisse (supervision)',
        }),
      ).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-reception-stats')).getByRole('button', {
          name: 'Stats reception (supervision)',
        }),
      ).toBeTruthy();
      expect(
        within(within(nav).getByTestId('nav-entry-transverse-admin-reception-sessions')).getByRole('button', {
          name: 'Sessions reception (tickets)',
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
          level: 1,
          name: /Rapports admin et supervision caisse/i,
        }),
      ).toBeTruthy();
      const hubDeep = within(main).getByTestId('admin-reports-supervision-hub');
      expect(within(hubDeep).getByTestId('admin-hub-link-cash-registers')).toBeTruthy();
      expect(within(hubDeep).getByTestId('admin-hub-link-session-manager')).toBeTruthy();
      expect(within(hubDeep).getByTestId('admin-hub-link-reception-stats')).toBeTruthy();
      expect(within(hubDeep).getByTestId('admin-hub-link-reception-sessions')).toBeTruthy();
      expect(within(hubDeep).getByText(/recyclique_admin_reports_receptionTicketsExportBulk/i)).toBeTruthy();
    });

    it('alias /admin/reports → /admin + sélection transverse-admin + page transverse-admin-reports-hub (Story 18.1 CR)', () => {
      window.history.pushState({}, '', '/admin/reports');
      renderServedApp();
      expect(window.location.pathname).toBe('/admin');
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      expect(within(nav).queryByTestId('nav-entry-transverse-admin-reports')).toBeNull();
      const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
      expect(adminBtn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(
        within(main).getByRole('heading', {
          level: 1,
          name: /Rapports admin et supervision caisse/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByTestId('admin-reports-supervision-hub')).toBeTruthy();
    });

    it('URL profonde /admin/users : même hub admin CREOS (transverse-admin-reports-hub + legacy)', () => {
      window.history.pushState({}, '', '/admin/users');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
      expect(adminBtn.getAttribute('aria-current')).toBe('true');
      expect(window.location.pathname).toBe('/admin/users');
      const main = screen.getByTestId('shell-zone-main');
      const hubUsers = within(main).getByTestId('admin-reports-supervision-hub');
      expect(hubUsers).toBeTruthy();
      expect(within(hubUsers).getByTestId('admin-hub-link-pending')).toBeTruthy();
      expect(within(main).getByTestId('admin-legacy-dashboard-home')).toBeTruthy();
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

    it('parcours admin pending : clic nav → /admin/pending + shell hub + placeholder (story 17.1)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-pending')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/pending');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('admin');
      expect(
        within(main).getByRole('heading', {
          level: 1,
          name: /Utilisateurs en attente de validation/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
      const demo = within(main).getByTestId('widget-admin-pending-users-demo');
      expect(demo).toBeTruthy();
      expect(within(demo).getByText(/GET \/v1\/admin\/users\/pending/i)).toBeTruthy();
      expect(within(main).getByTestId('admin-detail-simple-demo-strip')).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/pending (story 17.1 + 17.3)', () => {
      window.history.pushState({}, '', '/admin/pending');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-pending')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-admin-pending-users-demo')).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
    });

    it('parcours admin cash-registers : clic nav → /admin/cash-registers + shell hub + placeholder (story 17.2 + 17.3 shell mutualisé)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-cash-registers')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/cash-registers');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('admin');
      expect(
        within(main).getByRole('heading', {
          level: 1,
          name: /Caisses enregistrees/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
      const demo = within(main).getByTestId('widget-admin-cash-registers-demo');
      expect(demo).toBeTruthy();
      expect(within(demo).getByText(/Epic 16/i)).toBeTruthy();
      expect(within(demo).getByText(/recyclique-api\.yaml/i)).toBeTruthy();
      expect(within(main).getByTestId('admin-detail-simple-demo-strip')).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/cash-registers (story 17.2 + 17.3)', () => {
      window.history.pushState({}, '', '/admin/cash-registers');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-cash-registers')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-admin-cash-registers-demo')).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
    });

    it('parcours admin sites : clic nav → /admin/sites + shell hub + placeholder (story 17.2 + 17.3 shell mutualisé)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-sites')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/sites');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('admin');
      expect(
        within(main).getByRole('heading', {
          level: 1,
          name: /Sites \(CRUD legacy\)/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
      const demo = within(main).getByTestId('widget-admin-sites-demo');
      expect(demo).toBeTruthy();
      expect(within(demo).getByText(/\/admin\/site/i)).toBeTruthy();
      expect(within(demo).getByText(/recyclique-api\.yaml/i)).toBeTruthy();
      expect(within(main).getByTestId('admin-detail-simple-demo-strip')).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/sites (story 17.2 + 17.3)', () => {
      window.history.pushState({}, '', '/admin/sites');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-sites')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-admin-sites-demo')).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
    });

    it('parcours admin session-manager : clic nav → /admin/session-manager + shell + gap K (story 18.2)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-session-manager')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/session-manager');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('admin');
      expect(
        within(main).getByRole('heading', {
          level: 1,
          name: /Gestionnaire de sessions/i,
        }),
      ).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
      const demo = within(main).getByTestId('widget-admin-session-manager-demo');
      expect(demo).toBeTruthy();
      expect(demo.textContent).toContain('GET /v1/cash-sessions/ ni');
      expect(demo.textContent).toContain('GET /v1/cash-sessions/stats/summary');
      expect(within(main).getByTestId('admin-session-manager-export-debt')).toBeTruthy();
      expect(within(main).getByTestId('admin-detail-simple-demo-strip')).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/session-manager (story 18.2)', () => {
      window.history.pushState({}, '', '/admin/session-manager');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-session-manager')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-admin-session-manager-demo')).toBeTruthy();
      expect(within(main).getByTestId('admin-list-page-shell')).toBeTruthy();
    });

    it('parcours admin reception-stats : clic nav → /admin/reception-stats + shell + operation_id (story 19.1)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-reception-stats')).getByRole('button');
      fireEvent.click(btn);
      expect(window.location.pathname).toBe('/admin/reception-stats');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe('admin');
      expect(within(main).getByTestId('widget-admin-reception-stats-supervision')).toBeTruthy();
      expect(within(main).getByTestId('admin-reception-stats-operation-anchors').textContent).toContain(
        'recyclique_stats_receptionSummary',
      );
      expect(within(main).getByTestId('admin-reception-nominative-gap-k')).toBeTruthy();
      expect(within(main).getByTestId('admin-detail-simple-demo-strip')).toBeTruthy();
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/reception-stats (story 19.1)', () => {
      window.history.pushState({}, '', '/admin/reception-stats');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-reception-stats')).getByRole('button');
      expect(btn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-admin-reception-stats-supervision')).toBeTruthy();
    });

    it('parcours admin reception-sessions : clic nav + liste tickets + ancrage listTickets (story 19.2)', async () => {
      const origFetch = global.fetch;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof input === 'string' ? input : input.toString();
        if (u.includes('/v1/reception/tickets?') || (u.includes('/v1/reception/tickets') && u.includes('page='))) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                tickets: [],
                total: 0,
                page: 1,
                per_page: 20,
                total_pages: 0,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return origFetch(input as Request, init);
      }) as typeof fetch;
      try {
        renderServedApp();
        const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
        const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-reception-sessions')).getByRole(
          'button',
        );
        fireEvent.click(btn);
        expect(window.location.pathname).toBe('/admin/reception-sessions');
        const main = screen.getByTestId('shell-zone-main');
        await waitFor(() => {
          expect(within(main).getByTestId('transverse-page-shell').getAttribute('data-transverse-family')).toBe(
            'admin',
          );
          expect(within(main).getByTestId('admin-reception-tickets-operation-anchors').textContent).toContain(
            'recyclique_reception_listTickets',
          );
        });
        expect(within(main).getByTestId('widget-admin-reception-tickets-list')).toBeTruthy();
      } finally {
        global.fetch = origFetch;
      }
    });

    it('synchronise la sélection nav depuis l’URL profonde /admin/reception-sessions (story 19.2)', async () => {
      const origFetch = global.fetch;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof input === 'string' ? input : input.toString();
        if (u.includes('/v1/reception/tickets?')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                tickets: [],
                total: 0,
                page: 1,
                per_page: 20,
                total_pages: 0,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return origFetch(input as Request, init);
      }) as typeof fetch;
      try {
        window.history.pushState({}, '', '/admin/reception-sessions');
        renderServedApp();
        const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
        const btn = within(within(nav).getByTestId('nav-entry-transverse-admin-reception-sessions')).getByRole(
          'button',
        );
        expect(btn.getAttribute('aria-current')).toBe('true');
        const main = screen.getByTestId('shell-zone-main');
        await waitFor(() => {
          expect(within(main).getByTestId('widget-admin-reception-tickets-list')).toBeTruthy();
        });
      } finally {
        global.fetch = origFetch;
      }
    });

    it('URL profonde /admin/reception-tickets/<uuid> : widget détail + sélection hub admin (story 19.2)', async () => {
      const ticketUuid = '00000000-0000-4000-8000-000000000099';
      const origFetch = global.fetch;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof input === 'string' ? input : input.toString();
        if (u.includes(`/v1/reception/tickets/${ticketUuid}`) && !u.includes('download-token')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: ticketUuid,
                poste_id: 'p-demo',
                benevole_username: 'demo',
                created_at: '2026-01-01T00:00:00Z',
                closed_at: null,
                status: 'open',
                lignes: [],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return origFetch(input as Request, init);
      }) as typeof fetch;
      try {
        window.history.pushState({}, '', `/admin/reception-tickets/${ticketUuid}`);
        expect(window.location.pathname).toBe(`/admin/reception-tickets/${ticketUuid}`);
        renderServedApp();
        expect(window.location.pathname).toBe(`/admin/reception-tickets/${ticketUuid}`);
        const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
        const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
        expect(adminBtn.getAttribute('aria-current')).toBe('true');
        const main = screen.getByTestId('shell-zone-main');
        await waitFor(() => {
          expect(within(main).getByTestId('admin-reception-ticket-detail')).toBeTruthy();
        });
        expect(within(main).getByTestId('admin-reception-ticket-detail-operation-anchor').textContent).toContain(
          'recyclique_reception_getTicketDetail',
        );
        expect(within(main).getByTestId('admin-reception-ticket-excluded-actions')).toBeTruthy();
      } finally {
        global.fetch = origFetch;
      }
    });

    it('Story 19.2 — drill-down liste → détail (Détail + getTicketDetail, mocks)', async () => {
      const ticketUuid = '00000000-0000-4000-8000-0000000000aa';
      const ticketSummary = {
        id: ticketUuid,
        poste_id: 'p-drill',
        benevole_username: 'vol-demo',
        created_at: '2026-01-02T00:00:00Z',
        closed_at: null,
        status: 'open',
        total_lignes: 1,
        total_poids: 2.5,
        poids_entree: 1,
        poids_direct: 0,
        poids_sortie: 1.5,
      };
      const origFetch = global.fetch;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof input === 'string' ? input : input.toString();
        if (u.includes(`/v1/reception/tickets/${ticketUuid}`) && !u.includes('download-token')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: ticketUuid,
                poste_id: ticketSummary.poste_id,
                benevole_username: ticketSummary.benevole_username,
                created_at: ticketSummary.created_at,
                closed_at: null,
                status: 'open',
                lignes: [],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        if (u.includes('/v1/reception/tickets?') || (u.includes('/v1/reception/tickets') && u.includes('page='))) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                tickets: [ticketSummary],
                total: 1,
                page: 1,
                per_page: 20,
                total_pages: 1,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return origFetch(input as Request, init);
      }) as typeof fetch;
      try {
        window.history.pushState({}, '', '/admin/reception-sessions');
        renderServedApp();
        const main = screen.getByTestId('shell-zone-main');
        await waitFor(() => {
          expect(within(main).getByTestId(`admin-reception-ticket-row-${ticketUuid}`)).toBeTruthy();
        });
        fireEvent.click(within(main).getByTestId(`admin-reception-ticket-open-${ticketUuid}`));
        expect(window.location.pathname).toBe(`/admin/reception-tickets/${ticketUuid}`);
        await waitFor(() => {
          expect(within(screen.getByTestId('shell-zone-main')).getByTestId('admin-reception-ticket-detail')).toBeTruthy();
        });
        expect(
          within(screen.getByTestId('shell-zone-main')).getByTestId('admin-reception-ticket-detail-operation-anchor')
            .textContent,
        ).toContain('recyclique_reception_getTicketDetail');
      } finally {
        global.fetch = origFetch;
      }
    });

    it('URL profonde /admin/cash-sessions/:id : widget détail + sélection hub admin (story 18.2, non-régression)', () => {
      window.history.pushState({}, '', '/admin/cash-sessions/demo-session-18-2');
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      const adminBtn = within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button');
      expect(adminBtn.getAttribute('aria-current')).toBe('true');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('admin-cash-session-detail')).toBeTruthy();
      expect(within(main).getByText(/Session demo-session-18-2/i)).toBeTruthy();
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

    /**
     * Story 18.3 — preuve répétable : navigation secondaire hub → session-manager (gap K visible)
     * puis retour via entrée nav « Administration » — sans appeler d’operationId absents du YAML.
     */
    it('Story 18.3 — hub lien Sessions caisse puis retour Administration (gap K + structure)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin');
      const mainHub = screen.getByTestId('shell-zone-main');
      const hub = within(mainHub).getByTestId('admin-reports-supervision-hub');
      fireEvent.click(within(hub).getByTestId('admin-hub-link-session-manager'));
      expect(window.location.pathname).toBe('/admin/session-manager');
      const mainSm = screen.getByTestId('shell-zone-main');
      const demo = within(mainSm).getByTestId('widget-admin-session-manager-demo');
      expect(demo.textContent).toContain('GET /v1/cash-sessions/ ni');
      expect(demo.textContent).toContain('GET /v1/cash-sessions/stats/summary');
      expect(within(mainSm).getByTestId('admin-session-manager-export-debt')).toBeTruthy();
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin');
      expect(
        within(screen.getByTestId('shell-zone-main')).getByRole('heading', {
          level: 1,
          name: /Rapports admin et supervision caisse/i,
        }),
      ).toBeTruthy();
    });

    /**
     * Story 19.1 — preuve répétable : hub 18.1 → lien manifesté « Stats réception » (AC 8),
     * sans dépendre d’appels API live pour l’assert principal (présence shell + ancrages contrat).
     */
    it('Story 19.1 — hub lien Stats réception → /admin/reception-stats (widget + operation_id)', () => {
      renderServedApp();
      const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
      fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
      expect(window.location.pathname).toBe('/admin');
      const mainHub = screen.getByTestId('shell-zone-main');
      const hub = within(mainHub).getByTestId('admin-reports-supervision-hub');
      fireEvent.click(within(hub).getByTestId('admin-hub-link-reception-stats'));
      expect(window.location.pathname).toBe('/admin/reception-stats');
      const main = screen.getByTestId('shell-zone-main');
      expect(within(main).getByTestId('widget-admin-reception-stats-supervision')).toBeTruthy();
      expect(within(main).getByTestId('admin-reception-stats-operation-anchors').textContent).toContain(
        'recyclique_stats_receptionSummary',
      );
      expect(within(main).getByTestId('admin-reception-nominative-gap-k')).toBeTruthy();
    });

    it('Story 19.2 — hub lien Sessions reception (tickets) → /admin/reception-sessions (AC 7, mock liste)', async () => {
      const origFetch = global.fetch;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof input === 'string' ? input : input.toString();
        if (u.includes('/v1/reception/tickets?')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                tickets: [],
                total: 0,
                page: 1,
                per_page: 20,
                total_pages: 0,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return origFetch(input as Request, init);
      }) as typeof fetch;
      try {
        renderServedApp();
        const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
        fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
        const hub = within(screen.getByTestId('shell-zone-main')).getByTestId('admin-reports-supervision-hub');
        fireEvent.click(within(hub).getByTestId('admin-hub-link-reception-sessions'));
        expect(window.location.pathname).toBe('/admin/reception-sessions');
        const main = screen.getByTestId('shell-zone-main');
        await waitFor(() => {
          expect(within(main).getByTestId('widget-admin-reception-tickets-list')).toBeTruthy();
        });
        expect(within(main).getByTestId('admin-reception-tickets-operation-anchors').textContent).toContain(
          'recyclique_reception_listTickets',
        );
      } finally {
        global.fetch = origFetch;
      }
    });

    /**
     * Story 19.3 — chaîne hub → stats → hub → sessions : exports **B** et gap manifeste visibles ;
     * aucune entrée nav `/admin/reception-reports` (ligne matrice réception-reports isolée).
     */
    it('Story 19.3 — hub → stats → hub → sessions : dettes B nommées, sans nav reception-reports', async () => {
      const origFetch = global.fetch;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const u = typeof input === 'string' ? input : input.toString();
        if (u.includes('/v1/reception/tickets?')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                tickets: [],
                total: 0,
                page: 1,
                per_page: 20,
                total_pages: 0,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return origFetch(input as Request, init);
      }) as typeof fetch;
      try {
        renderServedApp();
        const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
        expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-reports')).toBeNull();
        fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
        expect(window.location.pathname).toBe('/admin');
        const hub0 = within(screen.getByTestId('shell-zone-main')).getByTestId('admin-reports-supervision-hub');
        fireEvent.click(within(hub0).getByTestId('admin-hub-link-reception-stats'));
        expect(window.location.pathname).toBe('/admin/reception-stats');
        const mainStats = screen.getByTestId('shell-zone-main');
        expect(within(mainStats).getByTestId('admin-reception-nominative-gap-k')).toBeTruthy();
        expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-reports')).toBeNull();
        fireEvent.click(within(within(nav).getByTestId('nav-entry-transverse-admin')).getByRole('button'));
        const hub1 = within(screen.getByTestId('shell-zone-main')).getByTestId('admin-reports-supervision-hub');
        fireEvent.click(within(hub1).getByTestId('admin-hub-link-reception-sessions'));
        expect(window.location.pathname).toBe('/admin/reception-sessions');
        const mainSess = screen.getByTestId('shell-zone-main');
        await waitFor(() => {
          expect(within(mainSess).getByTestId('widget-admin-reception-tickets-list')).toBeTruthy();
        });
        expect(within(mainSess).getByText(/recyclique_admin_reports_receptionTicketsExportBulk/i)).toBeTruthy();
        expect(within(mainSess).getByTestId('admin-reception-tickets-scope-note')).toBeTruthy();
        expect(within(nav).queryByTestId('nav-entry-transverse-admin-reception-reports')).toBeNull();
      } finally {
        global.fetch = origFetch;
      }
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
