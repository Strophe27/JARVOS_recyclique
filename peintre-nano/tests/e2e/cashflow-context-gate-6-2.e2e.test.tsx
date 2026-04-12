// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
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

describe('E2E — contexte caisse et blocages sécurité (Story 6.2)', () => {
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
    resetCashflowDraft();
  });

  it('enveloppe forbidden sur /caisse : accès page bloqué (shell, code FORBIDDEN) — AC 1, 3', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story62' },
      envelope: createDefaultDemoEnvelope({
        runtimeStatus: 'forbidden',
        restrictionMessage: 'Refus serveur — compte caisse',
      }),
    });

    window.history.pushState({}, '', '/caisse');

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
    expect(screen.queryByTestId('cashflow-step-next')).toBeNull();
  });

  it('enveloppe degraded sur /caisse : accès page bloqué (DEGRADED_CONTEXT) — AC 1, 3', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story62' },
      envelope: createDefaultDemoEnvelope({
        runtimeStatus: 'degraded',
        restrictionMessage: 'Contexte partiel — ne pas caisser',
      }),
    });

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe('DEGRADED_CONTEXT');
    });
    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
  });

  it('siteId null + page caisse : MISSING_SITE au shell (requires_site) — AC 1, 4', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story62' },
      envelope: createDefaultDemoEnvelope({
        siteId: null,
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/caisse');

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
   * `requires_site` ne bloque que `siteId == null`. Un site « blanc » (`trim()` vide) passe le shell mais pas la nav
   * si `contextMarkers` est dérivé sans `site` — ici on utilise des espaces : marqueur `site` présent (nav /caisse
   * visible), page autorisée, garde wizard Story 6.2 — AC 1, 4.
   */
  it('siteId uniquement espaces : shell + nav OK, wizard bloqué (cashflow-context-blocked) — AC 1, 4', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story62' },
      envelope: createDefaultDemoEnvelope({
        siteId: '   ',
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/cash-register/sale');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-context-blocked')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-context-blocked').textContent ?? '').toMatch(/Site actif non résolu/i);
    expect(screen.queryByTestId('cashflow-step-next')).toBeNull();
    expect(screen.queryByTestId('page-access-blocked')).toBeNull();
  });

  it('enveloppe périmée (issuedAt ancien) : STALE_CONTEXT — AC 3', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story62' },
      envelope: createDefaultDemoEnvelope({
        issuedAt: 0,
        maxAgeMs: 1000,
        runtimeStatus: 'ok',
      }),
    });

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-access-blocked').getAttribute('data-block-code')).toBe('STALE_CONTEXT');
    });
  });
});
