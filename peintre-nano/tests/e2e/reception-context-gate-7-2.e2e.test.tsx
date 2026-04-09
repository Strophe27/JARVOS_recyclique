// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_RECEPTION_ACCESS,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const POSTE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
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

describe('E2E — contexte réception et blocages (Story 7.2)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  it('enveloppe forbidden sur /reception : shell bloqué (FORBIDDEN) — AC 1, 3', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story72' },
      envelope: createDefaultDemoEnvelope({
        runtimeStatus: 'forbidden',
        restrictionMessage: 'Refus serveur — réception',
      }),
    });

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      const el = screen.getByTestId('page-access-blocked');
      expect(el.getAttribute('data-block-code')).toBe('FORBIDDEN');
    });
    expect(screen.getByText(/Contexte interdit/i)).toBeTruthy();
    expect(screen.queryByTestId('reception-context-blocked')).toBeNull();
    expect(screen.queryByTestId('reception-open-poste')).toBeNull();
  });

  it('enveloppe degraded sur /reception : shell bloqué (DEGRADED_CONTEXT) — AC 1, 3', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story72' },
      envelope: createDefaultDemoEnvelope({
        runtimeStatus: 'degraded',
        restrictionMessage: 'Contexte partiel — ne pas réceptionner',
      }),
    });

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe('DEGRADED_CONTEXT');
    });
    expect(screen.queryByTestId('flow-renderer-reception-nominal')).toBeNull();
  });

  it('siteId null + page réception : MISSING_SITE au shell (requires_site) — AC 1, 4', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story72' },
      envelope: createDefaultDemoEnvelope({
        siteId: null,
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe('MISSING_SITE');
    });
    expect(screen.getByText(/Site actif requis/i)).toBeTruthy();
  });

  /**
   * Même séparation que caisse 6.2 : `requires_site` ne bloque que `siteId == null`.
   * Site uniquement espaces : page servie, garde wizard (enveloppe `siteId?.trim()`).
   */
  it('siteId uniquement espaces : shell OK, wizard bloqué (reception-context-blocked) — AC 1, 4', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story72' },
      envelope: createDefaultDemoEnvelope({
        siteId: '   ',
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-context-blocked')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-context-blocked').textContent ?? '').toMatch(/Site actif non résolu/i);
    expect(screen.queryByTestId('reception-open-poste')).toBeNull();
    expect(screen.queryByTestId('page-access-blocked')).toBeNull();
  });

  it('enveloppe périmée (issuedAt ancien) : STALE_CONTEXT — AC 3', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story72' },
      envelope: createDefaultDemoEnvelope({
        issuedAt: 0,
        maxAgeMs: 1000,
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe('STALE_CONTEXT');
    });
  });

  /**
   * Sans `reception.access`, la nav filtre l’entrée réception (aligné manifeste + `filterNavigation`).
   * Deep link `/reception` ne résout pas `reception-nominal` si l’entrée n’est pas dans la nav filtrée
   * (sélection reste sur l’accueil) — on vérifie l’absence d’accès UI, pas un shell `MISSING_PERMISSIONS` fantôme.
   */
  it('permission reception.access absente : pas d’entrée nav Réception — AC 2, 4', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_RECEPTION_ACCESS,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story72' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('manifest-bundle-ok')).toBeTruthy();
    });
    expect(screen.queryByTestId('nav-entry-reception-nominal')).toBeNull();
    expect(screen.queryByTestId('reception-nominal-wizard')).toBeNull();
  });

  it('refus API 403 après ouverture poste : alerte + remise à plat wizard (pas d’état avancé fantôme) — AC 2, 3', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (
        method === 'GET' &&
        url.includes('/v1/reception/tickets') &&
        !/\/v1\/reception\/tickets\/[^/?]+/.test(url)
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ tickets: [], total: 0, page: 1, per_page: 20, total_pages: 0 }),
        } as Response);
      }
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: POSTE_ID, status: 'opened' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: 'Permission réception refusée (ticket)' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => 'null',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-poste-id').textContent).toContain(POSTE_ID);
    });

    fireEvent.click(screen.getByRole('tab', { name: /2\. Ticket/i }));
    fireEvent.click(screen.getByTestId('reception-create-ticket'));

    await waitFor(() => {
      expect(screen.getByTestId('reception-api-error')).toBeTruthy();
      expect(screen.getByTestId('reception-api-error-http-status').textContent).toMatch(/403/);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('reception-poste-id')).toBeNull();
    });
  });
});
