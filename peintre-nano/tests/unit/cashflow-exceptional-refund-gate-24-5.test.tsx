// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowExceptionalRefundWizard } from '../../src/domains/cashflow/CashflowExceptionalRefundWizard';
import '../../src/registry';

describe('Story 24.5 — garde remboursement exceptionnel (enveloppe + refund.exceptional)', () => {
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

  it('bloque si refund.exceptional manque dans l’enveloppe', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-000000000123',
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowExceptionalRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-exceptional-refund-entry-block')).toBeTruthy();
    expect(screen.getByText(new RegExp(PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND))).toBeTruthy();
    expect(screen.queryByTestId('cashflow-exceptional-refund-amount')).toBeNull();
  });

  it('affiche le formulaire si les permissions sont présentes', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-000000000124',
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowExceptionalRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-exceptional-refund-amount')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /Remboursement exceptionnel sans ticket/i }),
    ).toBeTruthy();
  });

  it('signale la justification manquante', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-000000000125',
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowExceptionalRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    fireEvent.change(screen.getByTestId('cashflow-exceptional-refund-amount'), {
      target: { value: '12.5' },
    });
    fireEvent.change(screen.getByTestId('cashflow-exceptional-refund-pin'), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByTestId('cashflow-exceptional-refund-submit'));
    expect(screen.getByText(/justification est obligatoire/i)).toBeTruthy();
  });

  it('signale un montant invalide avant toute autre validation', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-000000000126',
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowExceptionalRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    fireEvent.click(screen.getByTestId('cashflow-exceptional-refund-submit'));
    expect(screen.getByText(/montant de remboursement positif/i)).toBeTruthy();
  });

  it('demande un PIN step-up d’au moins 4 chiffres', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: '00000000-0000-4000-8000-000000000127',
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowExceptionalRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    fireEvent.change(screen.getByTestId('cashflow-exceptional-refund-amount'), {
      target: { value: '19.9' },
    });
    fireEvent.change(screen.getByTestId('cashflow-exceptional-refund-justification'), {
      target: { value: 'Test QA : oubli de ticket.' },
    });
    fireEvent.change(screen.getByTestId('cashflow-exceptional-refund-pin'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByTestId('cashflow-exceptional-refund-submit'));
    expect(screen.getByText('Saisissez le PIN step-up (4 chiffres minimum).')).toBeTruthy();
  });
});
