// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('CashflowNominalWizard — workspace kiosque grille catégories (Story 13.8)', () => {
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

  it('avec sale_kiosk_category_workspace : charge GET /v1/categories/ et affiche la grille', async () => {
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
                  id: 'cat-demo-1',
                  name: 'EEE',
                  parent_id: null,
                  is_active: true,
                  display_order: 0,
                  shortcut_key: 'E',
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
      expect(screen.getByTestId('cashflow-kiosk-category-grid')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-kiosk-unified-layout')).toBeTruthy();
    const catBtn = screen.getByTestId('cashflow-kiosk-category-cat-demo-1');
    expect(catBtn).toBeTruthy();
    expect(catBtn.getAttribute('aria-keyshortcuts')).toBe('E');
    expect(catBtn.textContent ?? '').toMatch(/EEE, touche E/i);
    expect(catBtn.textContent ?? '').toMatch(/Clavier/);

    catBtn.focus();
    fireEvent.keyDown(catBtn, { key: 'e', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-readonly-category').textContent ?? '').toMatch(/EEE/);
    });

    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    expect(screen.queryByTestId('cashflow-step-prev')).toBeNull();
    expect(screen.queryByTestId('cashflow-step-next')).toBeNull();
    expect(screen.queryByTestId('cashflow-open-social-don')).toBeNull();
    expect(screen.queryByTestId('cashflow-open-special-don')).toBeNull();
    expect(screen.queryByTestId('cashflow-trigger-stale')).toBeNull();
    expect(screen.queryByTestId('cashflow-sync-notice-generic')).toBeNull();
  });

  it('sans shortcut_key en API : touche positionnelle A (même grille AZERTY que le legacy caisse)', async () => {
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
                  id: 'cat-no-sk',
                  name: 'Tri vente',
                  parent_id: null,
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
      expect(screen.getByTestId('cashflow-kiosk-category-cat-no-sk')).toBeTruthy();
    });
    const catBtn = screen.getByTestId('cashflow-kiosk-category-cat-no-sk');
    expect(catBtn.getAttribute('aria-keyshortcuts')).toBe('A');
    expect(catBtn.textContent ?? '').toMatch(/Tri vente, touche A/i);
    catBtn.focus();
    fireEvent.keyDown(catBtn, { key: 'a', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-readonly-category').textContent ?? '').toMatch(/Tri vente/);
    });
  });

  it('capte aussi le raccourci global sans focus préalable sur une tuile', async () => {
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
                  id: 'cat-root',
                  name: 'Racine',
                  parent_id: null,
                  is_active: true,
                  display_order: 0,
                },
                {
                  id: 'cat-child',
                  name: 'Enfant',
                  parent_id: 'cat-root',
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
      expect(screen.getByTestId('cashflow-kiosk-category-cat-root')).toBeTruthy();
    });

    fireEvent.keyDown(document, { key: 'a', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-category-cat-child')).toBeTruthy();
    });

    fireEvent.keyDown(document, { key: 'a', bubbles: true, cancelable: true });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-readonly-category').textContent ?? '').toMatch(/Enfant/);
    });
  });

  it('sans sale_kiosk_category_workspace : pas de grille kiosque', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return { ok: true, status: 200, text: async () => 'null' } as Response;
        }
        if (url.includes('live-snapshot')) {
          return { ok: true, status: 200, text: async () => '{}' } as Response;
        }
        return { ok: true, status: 200, text: async () => '[]' } as Response;
      }),
    );

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    expect(screen.queryByTestId('cashflow-kiosk-category-grid')).toBeNull();
  });
});
