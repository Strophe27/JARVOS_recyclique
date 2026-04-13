// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultDemoEnvelope, DEMO_AUTH_STUB_USER_ID } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import { CashflowNominalWizard } from '../../src/domains/cashflow/CashflowNominalWizard';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';
import '../../src/styles/tokens.css';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Nouvel objet port à chaque render + rafales de re-render — régresse si le fetch catégories dépend de `auth` en deps. */
function UnstableAuthPortHarness({ children }: { readonly children: ReactNode }) {
  const [, setBurst] = useState(0);
  useEffect(() => {
    const iv = window.setInterval(() => {
      setBurst((n) => n + 1);
    }, 2);
    const stop = window.setTimeout(() => window.clearInterval(iv), 150);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(stop);
    };
  }, []);

  const authAdapter = createMockAuthAdapter({
    session: { authenticated: true, userId: DEMO_AUTH_STUB_USER_ID },
    envelope: createDefaultDemoEnvelope(),
  });

  return (
    <RootProviders authAdapter={authAdapter} disableUserPrefsPersistence>
      {children}
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

describe('CashflowNominalWizard — micro-rail kiosque + drill sous-catégories', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    resetCashflowDraft();
    resetCoalescedGetCurrentOpenCashSessionForTests();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetCashflowDraft();
    resetCoalescedGetCurrentOpenCashSessionForTests();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  it('parent avec enfants → sous-grille → feuille → poids → prix → ligne (grille enrichie + micro-rail)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return { ok: true, status: 200, text: async () => 'null' } as Response;
        }
        if (url.includes('/v1/categories/')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([
                {
                  id: 'parent-cat',
                  name: 'EEE parent',
                  parent_id: null,
                  is_active: true,
                  display_order: 0,
                  shortcut_key: 'P',
                },
                {
                  id: 'leaf-cat',
                  name: 'EEE feuille',
                  parent_id: 'parent-cat',
                  is_active: true,
                  display_order: 0,
                },
              ]),
          } as Response;
        }
        if (url.includes('live-snapshot')) {
          return { ok: true, status: 200, text: async () => '{}' } as Response;
        }
        return { ok: true, status: 200, text: async () => '[]' } as Response;
      }),
    );

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{ sale_kiosk_category_workspace: true }} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-line-micro-rail')).toBeTruthy();
    });

    const parentTile = screen.getByTestId('cashflow-kiosk-category-parent-cat');
    expect(parentTile.textContent ?? '').toMatch(/1 sous-cat/);

    fireEvent.click(parentTile);

    await waitFor(() => {
      expect(screen.getByText('Sous-catégories')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-kiosk-category-leaf-cat'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-readonly-category')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-kiosk-readonly-category').textContent ?? '').toMatch(/EEE feuille/);

    fireEvent.click(screen.getByRole('button', { name: /Continuer vers le prix/i }));
    fireEvent.click(screen.getByTestId('cashflow-add-line'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-kpi-line-count').textContent ?? '').toBe('1');
    });
  });

  it('chargement catégories kiosque : fin du loader malgré identité `auth` instable pendant le GET (robustesse)', async () => {
    const categoriesBody = JSON.stringify([
      {
        id: 'solo-cat',
        name: 'Cat solo',
        parent_id: null,
        is_active: true,
        display_order: 0,
      },
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return { ok: true, status: 200, text: async () => 'null' } as Response;
        }
        if (url.includes('/v1/categories/')) {
          await new Promise((r) => {
            window.setTimeout(r, 120);
          });
          return {
            ok: true,
            status: 200,
            text: async () => categoriesBody,
          } as Response;
        }
        if (url.includes('live-snapshot')) {
          return { ok: true, status: 200, text: async () => '{}' } as Response;
        }
        return { ok: true, status: 200, text: async () => '[]' } as Response;
      }),
    );

    render(
      <UnstableAuthPortHarness>
        <CashflowNominalWizard widgetProps={{ sale_kiosk_category_workspace: true }} />
      </UnstableAuthPortHarness>,
    );

    expect(screen.getByTestId('cashflow-kiosk-category-loading')).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.queryByTestId('cashflow-kiosk-category-loading')).toBeNull();
        expect(screen.getByTestId('cashflow-kiosk-category-grid')).toBeTruthy();
        expect(screen.getByTestId('cashflow-kiosk-category-solo-cat')).toBeTruthy();
      },
      { timeout: 4000 },
    );
  });
});
