// @vitest-environment jsdom
/**
 * Story 10.3 — smoke rendu runtime (NFR28 / AR18) : parcours CREOS critiques, jsdom, pas de navigateur réel.
 */
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FormEvent } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LiveAuthLoginControllerProvider } from '../../src/app/auth/LiveAuthLoginControllerContext';
import type { LiveAuthLoginController } from '../../src/app/auth/LiveAuthLoginControllerContext';
import { buildPageManifestRegions } from '../../src/app/PageRenderer';
import { ManifestErrorBanner } from '../../src/app/ManifestErrorBanner';
import { RootShell } from '../../src/app/layouts/RootShell';
import { RootProviders } from '../../src/app/providers/RootProviders';
import navigationBandeauLiveSlice from '../../../contracts/creos/manifests/navigation-bandeau-live-slice.json';
import navigationTransverseServed from '../../../contracts/creos/manifests/navigation-transverse-served.json';
import pageBandeauLiveSandbox from '../../../contracts/creos/manifests/page-bandeau-live-sandbox.json';
import pageCashflowNominal from '../../../contracts/creos/manifests/page-cashflow-nominal.json';
import pageDemoHome from '../../../contracts/creos/manifests/page-demo-home.json';
import pageReceptionNominal from '../../../contracts/creos/manifests/page-reception-nominal.json';
import pageTransverseDashboard from '../../../contracts/creos/manifests/page-transverse-dashboard.json';
import widgetsCatalogBandeauLive from '../../../contracts/creos/manifests/widgets-catalog-bandeau-live.json';
import pageLoginPublic from '../../../contracts/creos/manifests/page-login-public.json';
import pageTransverseDashboardBenevole from '../../../contracts/creos/manifests/page-transverse-dashboard-benevole.json';
import pageTransverseAdminPlaceholder from '../../../contracts/creos/manifests/page-transverse-admin-placeholder.json';
import pageTransverseAdminAccessOverview from '../../../contracts/creos/manifests/page-transverse-admin-access-overview.json';
import pageTransverseAdminSiteOverview from '../../../contracts/creos/manifests/page-transverse-admin-site-overview.json';
import pageTransverseAdminUsers from '../../../contracts/creos/manifests/page-transverse-admin-users.json';
import pageTransverseAdminGroups from '../../../contracts/creos/manifests/page-transverse-admin-groups.json';
import pageTransverseAdminCategories from '../../../contracts/creos/manifests/page-transverse-admin-categories.json';
import pageTransverseAdminAuditLog from '../../../contracts/creos/manifests/page-transverse-admin-audit-log.json';
import pageTransverseAdminAccounting from '../../../contracts/creos/manifests/page-transverse-admin-accounting.json';
import pageTransverseAdminAccountingExpert from '../../../contracts/creos/manifests/page-transverse-admin-accounting-expert.json';
import pageTransverseAdminCashRegisters from '../../../contracts/creos/manifests/page-transverse-admin-cash-registers.json';
import pageTransverseAdminSites from '../../../contracts/creos/manifests/page-transverse-admin-sites.json';
import pageTransverseAdminSitesAndRegisters from '../../../contracts/creos/manifests/page-transverse-admin-sites-and-registers.json';
import pageTransverseAdminSessionManager from '../../../contracts/creos/manifests/page-transverse-admin-session-manager.json';
import pageTransverseAdminSettings from '../../../contracts/creos/manifests/page-transverse-admin-settings.json';
import pageTransverseAdminModules from '../../../contracts/creos/manifests/page-transverse-admin-modules.json';
import pageTransverseAdminHealth from '../../../contracts/creos/manifests/page-transverse-admin-health.json';
import pageTransverseAdminReceptionStats from '../../../contracts/creos/manifests/page-transverse-admin-reception-stats.json';
import pageTransverseAdminReceptionSessions from '../../../contracts/creos/manifests/page-transverse-admin-reception-sessions.json';
import pageTransverseAdminReportsHub from '../../../contracts/creos/manifests/page-transverse-admin-reports-hub.json';
import pageTransverseListingArticles from '../../../contracts/creos/manifests/page-transverse-listing-articles.json';
import pageTransverseListingDons from '../../../contracts/creos/manifests/page-transverse-listing-dons.json';
import pageTransverseConsultationArticle from '../../../contracts/creos/manifests/page-transverse-consultation-article.json';
import pageTransverseConsultationDon from '../../../contracts/creos/manifests/page-transverse-consultation-don.json';
import pageCashflowSpecialOpsHub from '../../../contracts/creos/manifests/page-cashflow-special-ops-hub.json';
import pageCashflowRefund from '../../../contracts/creos/manifests/page-cashflow-refund.json';
import pageCashflowExceptionalRefund from '../../../contracts/creos/manifests/page-cashflow-exceptional-refund.json';
import pageCashflowExchange from '../../../contracts/creos/manifests/page-cashflow-exchange.json';
import pageCashflowDisbursement from '../../../contracts/creos/manifests/page-cashflow-disbursement.json';
import pageCashflowInternalTransfer from '../../../contracts/creos/manifests/page-cashflow-internal-transfer.json';
import pageCashflowClose from '../../../contracts/creos/manifests/page-cashflow-close.json';
import pageAdminCashSessionDetail from '../../../contracts/creos/manifests/page-admin-cash-session-detail.json';
import pageAdminReceptionTicketDetail from '../../../contracts/creos/manifests/page-admin-reception-ticket-detail.json';
import { loadManifestBundle } from '../../src/runtime/load-manifest-bundle';
import { parsePageManifestJson } from '../../src/validation/page-manifest-ingest';
import { defaultAllowedWidgetTypeSet } from '../../src/validation/allowed-widget-types';
import '../../src/registry';
import '../../src/styles/tokens.css';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const LOGIN_PUBLIC_PATH = join(REPO_ROOT, 'contracts/creos/manifests/page-login-public.json');

const MANIFEST_POLLING_INTERVAL_S =
  (widgetsCatalogBandeauLive as {
    widgets: Array<{ type?: string; data_contract?: { polling_interval_s?: number } }>;
  }).widgets.find((w) => w.type === 'bandeau-live')?.data_contract?.polling_interval_s ?? 30;

function pageBandeauLiveSandboxWithLiveSource(): typeof pageBandeauLiveSandbox {
  const mainBandeau = pageBandeauLiveSandbox.slots.find(
    (s) => s.slot_id === 'main' && s.widget_type === 'bandeau-live',
  );
  return {
    ...pageBandeauLiveSandbox,
    slots: pageBandeauLiveSandbox.slots.map((slot) =>
      slot.widget_type === 'bandeau-live'
        ? {
            ...slot,
            widget_props: {
              ...(typeof mainBandeau?.widget_props === 'object' && mainBandeau?.widget_props !== null
                ? mainBandeau.widget_props
                : {}),
              use_live_source: true,
              polling_interval_s: MANIFEST_POLLING_INTERVAL_S,
            },
          }
        : slot,
    ),
  };
}

const TRANSVERSE_SERVED_PAGES_JSON = [
  JSON.stringify(pageDemoHome),
  JSON.stringify(pageBandeauLiveSandboxWithLiveSource()),
  JSON.stringify(pageTransverseDashboard),
  JSON.stringify(pageTransverseDashboardBenevole),
  JSON.stringify(pageTransverseAdminPlaceholder),
  JSON.stringify(pageTransverseAdminAccessOverview),
  JSON.stringify(pageTransverseAdminSiteOverview),
  JSON.stringify(pageTransverseAdminUsers),
  JSON.stringify(pageTransverseAdminGroups),
  JSON.stringify(pageTransverseAdminCategories),
  JSON.stringify(pageTransverseAdminAuditLog),
  JSON.stringify(pageTransverseAdminAccounting),
  JSON.stringify(pageTransverseAdminAccountingExpert),
  JSON.stringify(pageTransverseAdminCashRegisters),
  JSON.stringify(pageTransverseAdminSites),
  JSON.stringify(pageTransverseAdminSitesAndRegisters),
  JSON.stringify(pageTransverseAdminSessionManager),
  JSON.stringify(pageTransverseAdminSettings),
  JSON.stringify(pageTransverseAdminModules),
  JSON.stringify(pageTransverseAdminHealth),
  JSON.stringify(pageTransverseAdminReceptionStats),
  JSON.stringify(pageTransverseAdminReceptionSessions),
  JSON.stringify(pageTransverseAdminReportsHub),
  JSON.stringify(pageTransverseListingArticles),
  JSON.stringify(pageTransverseListingDons),
  JSON.stringify(pageTransverseConsultationArticle),
  JSON.stringify(pageTransverseConsultationDon),
  JSON.stringify(pageCashflowNominal),
  JSON.stringify(pageCashflowSpecialOpsHub),
  JSON.stringify(pageCashflowRefund),
  JSON.stringify(pageCashflowExceptionalRefund),
  JSON.stringify(pageCashflowExchange),
  JSON.stringify(pageCashflowDisbursement),
  JSON.stringify(pageCashflowInternalTransfer),
  JSON.stringify(pageCashflowClose),
  JSON.stringify(pageAdminCashSessionDetail),
  JSON.stringify(pageAdminReceptionTicketDetail),
  JSON.stringify(pageReceptionNominal),
  JSON.stringify(pageLoginPublic),
];

function loadTransverseServedBundle() {
  return loadManifestBundle({
    navigationJson: JSON.stringify(navigationTransverseServed),
    pageManifestsJson: TRANSVERSE_SERVED_PAGES_JSON,
    allowedWidgetTypes: defaultAllowedWidgetTypeSet(),
  });
}

function CreosPageHarness(props: {
  readonly navigationJson: string;
  readonly pageManifestsJson: readonly string[];
  readonly pageKey: string;
  readonly mainTestId: string;
}) {
  const result = loadManifestBundle({
    navigationJson: props.navigationJson,
    pageManifestsJson: props.pageManifestsJson,
    allowedWidgetTypes: defaultAllowedWidgetTypeSet(),
  });
  if (!result.ok) {
    return (
      <RootProviders>
        <RootShell>
          <ManifestErrorBanner issues={result.issues} />
        </RootShell>
      </RootProviders>
    );
  }
  const page = result.bundle.pages.find((p) => p.pageKey === props.pageKey);
  if (!page) {
    throw new Error(`page_key manquant dans le bundle : ${props.pageKey}`);
  }
  const regions = buildPageManifestRegions(page);
  return (
    <RootProviders>
      <RootShell
        regions={{
          header: regions.header,
          nav: regions.nav,
          aside: regions.aside,
          footer: regions.footer,
          main: <div data-testid={props.mainTestId}>{regions.mainWidgets}</div>,
        }}
      />
    </RootProviders>
  );
}

function makeLoginController(): LiveAuthLoginController {
  return {
    username: '',
    password: '',
    setUsername: vi.fn(),
    setPassword: vi.fn(),
    onSubmit: (e: FormEvent) => {
      e.preventDefault();
    },
    formError: null,
    busy: false,
    hasStoredToken: false,
    onRetryStoredToken: vi.fn(),
    onClearStoredSession: vi.fn(),
  };
}

function LoginPublicHarness() {
  const raw = readFileSync(LOGIN_PUBLIC_PATH, 'utf8');
  const { manifest, issues } = parsePageManifestJson(raw, 'page-login-public.json');
  if (!manifest || issues.length > 0) {
    return (
      <RootProviders>
        <RootShell>
          <ManifestErrorBanner issues={issues} />
        </RootShell>
      </RootProviders>
    );
  }
  const regions = buildPageManifestRegions(manifest);
  return (
    <RootProviders>
      <LiveAuthLoginControllerProvider value={makeLoginController()}>
        <RootShell
          regions={{
            header: regions.header,
            nav: regions.nav,
            aside: regions.aside,
            footer: regions.footer,
            main: <div data-testid="smoke-login-public-main">{regions.mainWidgets}</div>,
          }}
        />
      </LiveAuthLoginControllerProvider>
    </RootProviders>
  );
}

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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

function stubBenignFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    }),
  );
}

describe('Smoke CREOS — parcours de rendu critiques (Story 10.3)', () => {
  it('lot transverse servi : loadManifestBundle réussi (allowlist registre par défaut)', () => {
    const result = loadTransverseServedBundle();
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  it('login public — page seule sans nav servie', () => {
    render(<LoginPublicHarness />);
    expect(screen.getByTestId('public-login-banner')).toBeTruthy();
  });

  it('dashboard transverse — navigation-transverse-served + page transverse-dashboard', () => {
    stubBenignFetch();
    render(
      <CreosPageHarness
        navigationJson={JSON.stringify(navigationTransverseServed)}
        pageManifestsJson={TRANSVERSE_SERVED_PAGES_JSON}
        pageKey="transverse-dashboard"
        mainTestId="smoke-dashboard-main"
      />,
    );
    const main = screen.getByTestId('smoke-dashboard-main');
    expect(within(main).getByTestId('widget-legacy-dashboard-workspace')).toBeTruthy();
  });

  it('bandeau live — navigation-bandeau-live-slice + sandbox', () => {
    stubBenignFetch();
    render(
      <CreosPageHarness
        navigationJson={JSON.stringify(navigationBandeauLiveSlice)}
        pageManifestsJson={[JSON.stringify(pageBandeauLiveSandboxWithLiveSource())]}
        pageKey="bandeau-live-sandbox"
        mainTestId="smoke-bandeau-main"
      />,
    );
    const main = screen.getByTestId('smoke-bandeau-main');
    expect(within(main).getByTestId('widget-bandeau-live')).toBeTruthy();
  });

  it('caisse nominale — bundle transverse + page cashflow-nominal', () => {
    stubBenignFetch();
    render(
      <CreosPageHarness
        navigationJson={JSON.stringify(navigationTransverseServed)}
        pageManifestsJson={TRANSVERSE_SERVED_PAGES_JSON}
        pageKey="cashflow-nominal"
        mainTestId="smoke-cashflow-main"
      />,
    );
    const main = screen.getByTestId('smoke-cashflow-main');
    expect(within(main).getByTestId('cashflow-nominal-wizard')).toBeTruthy();
  });

  it('réception nominale — bundle transverse + page reception-nominal', () => {
    stubBenignFetch();
    render(
      <CreosPageHarness
        navigationJson={JSON.stringify(navigationTransverseServed)}
        pageManifestsJson={TRANSVERSE_SERVED_PAGES_JSON}
        pageKey="reception-nominal"
        mainTestId="smoke-reception-main"
      />,
    );
    const main = screen.getByTestId('smoke-reception-main');
    expect(within(main).getByTestId('reception-nominal-wizard')).toBeTruthy();
  });
});
