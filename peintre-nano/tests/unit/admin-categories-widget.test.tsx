// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminCategoriesWidget } from '../../src/domains/admin-config/AdminCategoriesWidget';
import '../../src/styles/tokens.css';

const authStub: AuthContextPort = {
  getSession: () => ({ authenticated: true, userId: 'u1', userDisplayLabel: 'Test' }),
  getContextEnvelope: () => ({
    schemaVersion: '1',
    siteId: '550e8400-e29b-41d4-a716-446655440000',
    activeRegisterId: null,
    permissions: { permissionKeys: ['transverse.admin.view'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  }),
  getAccessToken: () => 'tok',
};

const parent = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Écrans',
  official_name: null,
  is_active: true,
  parent_id: null,
  price: null,
  max_price: null,
  display_order: 1,
  display_order_entry: 2,
  is_visible: true,
  shortcut_key: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  deleted_at: null,
};

const child = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Portable',
  official_name: 'Ordinateur portable',
  is_active: true,
  parent_id: parent.id,
  price: 15.5,
  max_price: 120,
  display_order: 0,
  display_order_entry: 1,
  is_visible: false,
  shortcut_key: 'P',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  deleted_at: null,
};

function okJson(body: unknown, status = 200) {
  return { ok: true, status, text: async () => JSON.stringify(body) };
}

function categoriesFetchMock(includeArchived: boolean): typeof fetch {
  const bodyFull = includeArchived
    ? [
        parent,
        child,
        { ...child, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Ancienne', deleted_at: '2026-01-03T00:00:00.000Z' },
      ]
    : [parent, child];
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('sale-tickets') || url.includes('entry-tickets')) {
      return okJson([parent, child]);
    }
    if (url.includes('/v1/categories/')) {
      if (url.includes('include_archived=true')) return okJson(bodyFull);
      return okJson([parent, child]);
    }
    return okJson([]);
  });
}

function wrap(ui: ReactElement) {
  return <RootProviders authAdapter={authStub}>{ui}</RootProviders>;
}

describe('AdminCategoriesWidget', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('affiche la hiérarchie et les tarifs après chargement', async () => {
    vi.stubGlobal('fetch', categoriesFetchMock(false));
    render(wrap(<AdminCategoriesWidget widgetId="w" pageManifest={{ page_key: 'x', slots: [] }} />));
    await waitFor(() => expect(screen.getByText('Écrans')).toBeTruthy());
    expect(screen.getByText('Portable')).toBeTruthy();
    expect(screen.getByText('Ordinateur portable')).toBeTruthy();
    expect(screen.getByText(/15,50\s/)).toBeTruthy();
  });

  it('filtre par recherche et recharge avec archivées', async () => {
    vi.stubGlobal('fetch', categoriesFetchMock(false));
    render(wrap(<AdminCategoriesWidget widgetId="w" pageManifest={{ page_key: 'x', slots: [] }} />));
    await waitFor(() => expect(screen.getByText('Portable')).toBeTruthy());
    expect(screen.getByRole('heading', { name: 'Gestion des catégories' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Recherche catégories'), { target: { value: 'port' } });
    expect(screen.getByText('Portable')).toBeTruthy();
    expect(screen.queryByText('Écrans')).toBeTruthy();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('include_archived=true')) {
        return okJson([parent, child, { ...child, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Ancienne', deleted_at: '2026-01-03T00:00:00.000Z' }]);
      }
      return okJson([parent, child]);
    });
    vi.stubGlobal('fetch', fetchMock);
    fireEvent.click(screen.getByRole('switch', { name: /Afficher les éléments archivés/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('include_archived=true'))).toBe(true);
    });
    await waitFor(() => expect(screen.getByText('Ancienne')).toBeTruthy());
    const root = screen.getByTestId('widget-admin-categories-demo');
    expect(within(root).getByText('Archivée')).toBeTruthy();
  });

  it('appelle sale-tickets lorsque la vue Caisse est sélectionnée', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('sale-tickets')) return okJson([parent, child]);
      return okJson([parent, child]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminCategoriesWidget widgetId="w" pageManifest={{ page_key: 'x', slots: [] }} />));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(within(screen.getByTestId('categories-data-source')).getByText('Caisse'));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('sale-tickets'))).toBe(true);
    });
  });
});
