// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import type { CategoryAdminListRowDto } from '../../src/api/admin-categories-client';
import { CategoryReparentDraftPanel } from '../../src/domains/admin-config/categories/CategoryReparentDraftPanel';
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

const row = (over: Partial<CategoryAdminListRowDto>): CategoryAdminListRowDto => ({
  id: 'id',
  name: 'N',
  official_name: null,
  is_active: true,
  parent_id: null,
  price: null,
  max_price: null,
  display_order: 0,
  display_order_entry: 0,
  is_visible: true,
  shortcut_key: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...over,
});

function wrap(ui: ReactElement) {
  return <RootProviders authAdapter={authStub}>{ui}</RootProviders>;
}

describe('CategoryReparentDraftPanel', () => {
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

  it("affiche l'alerte simulation sans onApply", () => {
    const parent = row({ id: 'p', name: 'Parent', parent_id: null });
    const child = row({ id: 'c', name: 'Enfant', parent_id: 'p' });
    render(
      wrap(
        <CategoryReparentDraftPanel rows={[parent, child]} categoryId="c" initialParentId="p" />,
      ),
    );
    expect(screen.getByTestId('category-reparent-draft-panel')).toBeTruthy();
    expect(screen.getByTestId('category-reparent-readonly-notice')).toBeTruthy();
  });

  it('affiche le bouton Enregistrer désactivé si onApply est fourni mais aucun changement', () => {
    const parent = row({ id: 'p', name: 'Parent', parent_id: null });
    const child = row({ id: 'c', name: 'Enfant', parent_id: 'p' });
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      wrap(
        <CategoryReparentDraftPanel
          rows={[parent, child]}
          categoryId="c"
          initialParentId="p"
          onApply={onApply}
        />,
      ),
    );
    const btn = screen.getByTestId('category-reparent-apply') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
