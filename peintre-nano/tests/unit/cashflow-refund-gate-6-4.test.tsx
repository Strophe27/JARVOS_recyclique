// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowRefundWizard } from '../../src/domains/cashflow/CashflowRefundWizard';
import '../../src/registry';

describe('Story 6.4 — garde remboursement (enveloppe + caisse.refund)', () => {
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

  it('bloque si caisse.refund manque alors que caisse.access est présent', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-refund-context-blocked')).toBeTruthy();
    expect(screen.getByText(new RegExp(PERMISSION_CASHFLOW_REFUND))).toBeTruthy();
    expect(screen.queryByTestId('cashflow-refund-step-select')).toBeNull();
  });

  it('affiche l’étape 1 si access + refund sont dans l’enveloppe', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-refund-step-select')).toBeTruthy();
    expect(screen.getByText(/Quel ticket rembourser \?/)).toBeTruthy();
  });
});
