// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowSpecialOpsHub } from '../../src/domains/cashflow/CashflowSpecialOpsHub';
import '../../src/registry';

describe('Story 24.2 — hub opérations spéciales caisse', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  it('affiche le catalogue PRD (cartes distinctes annulation vs remboursement + placeholders P1)', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSpecialOpsHub widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-special-ops-hub')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-annuler')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-rembourser')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-decaisser')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-mouvement-interne')).toBeTruthy();
    expect(screen.getByTestId('cashflow-special-ops-card-echanger')).toBeTruthy();
  });

  it('sans caisse.refund : pas de CTA remboursement, message explicite', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSpecialOpsHub widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.queryByTestId('cashflow-special-ops-rembourser-cta')).toBeNull();
    expect(screen.getByTestId('cashflow-special-ops-rembourser-blocked')).toBeTruthy();
  });

  it('avec caisse.access + caisse.refund : CTA vers parcours manifesté /caisse/remboursement', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSpecialOpsHub widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-special-ops-rembourser-cta')).toBeTruthy();
  });

  it('avec caisse.refund mais sans caisse.access : pas de CTA remboursement (aligné page remboursement)', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_NOMINAL,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSpecialOpsHub widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.queryByTestId('cashflow-special-ops-rembourser-cta')).toBeNull();
    expect(screen.getByTestId('cashflow-special-ops-rembourser-blocked')).toBeTruthy();
  });

  it('sans transverse.admin.view : pas de CTA journal sessions pour annulation/correction', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== TRANSVERSE_PERMISSION_ADMIN_VIEW,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowSpecialOpsHub widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.queryByTestId('cashflow-special-ops-annuler-cta')).toBeNull();
    expect(screen.getByTestId('cashflow-special-ops-annuler-blocked')).toBeTruthy();
  });
});
