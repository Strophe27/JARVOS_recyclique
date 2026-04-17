// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowNominalWizard } from '../../src/domains/cashflow/CashflowNominalWizard';
import {
  addTicketLine,
  resetCashflowDraft,
  setCashSessionIdInput,
  setTotalAmount,
} from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';

describe('Story 6.9 — erreur API : pas d’écran succès', () => {
  afterEach(() => {
    cleanup();
    resetCashflowDraft();
    vi.unstubAllGlobals();
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
    resetCashflowDraft();
    addTicketLine({
      category: 'EEE-1',
      quantity: 1,
      weight: 1,
      unitPrice: 5,
      totalPrice: 5,
    });
    setTotalAmount(5);
    setCashSessionIdInput('00000000-0000-4000-8000-000000000001');

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
                context: { site_id: 's' },
                effective_open_state: 'open',
                cash_session_effectiveness: 'open_effective',
                observed_at: new Date().toISOString(),
              }),
          });
        }
        if (url.includes('payment-method-options')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
          });
        }
        if (url.includes('/v1/sales/') && !url.includes('/v1/sales/held') && !url.includes('payment-method-options')) {
          return Promise.resolve({
            ok: false,
            status: 409,
            statusText: 'Conflict',
            text: async () =>
              JSON.stringify({
                code: 'IDEMPOTENCY_KEY_CONFLICT',
                detail: 'Conflit clé idempotence',
                retryable: false,
                correlation_id: 'corr-test-99',
                state: null,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '[]',
        });
      }),
    );
  });

  it('affiche l’erreur structurée et ne passe pas en ticket succès', async () => {
    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByRole('tab', { name: /paiement/i }));

    await waitFor(() => {
      expect((screen.getByTestId('cashflow-submit-sale') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-submit-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-error-correlation-id').textContent).toMatch(/corr-test-99/);
    expect(screen.getByTestId('cashflow-ticket-sale-id').textContent).toMatch(/Aucune vente finalisée/i);
  });
});

describe('Story 6.9 — erreur API retryable (AR21 / UI)', () => {
  afterEach(() => {
    cleanup();
    resetCashflowDraft();
    vi.unstubAllGlobals();
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
    resetCashflowDraft();
    addTicketLine({
      category: 'EEE-1',
      quantity: 1,
      weight: 1,
      unitPrice: 5,
      totalPrice: 5,
    });
    setTotalAmount(5);
    setCashSessionIdInput('00000000-0000-4000-8000-000000000001');

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
                context: { site_id: 's' },
                effective_open_state: 'open',
                cash_session_effectiveness: 'open_effective',
                observed_at: new Date().toISOString(),
              }),
          });
        }
        if (url.includes('payment-method-options')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
          });
        }
        if (url.includes('/v1/sales/') && !url.includes('/v1/sales/held') && !url.includes('payment-method-options')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () =>
              JSON.stringify({
                code: 'TEMP_UNAVAILABLE',
                detail: 'Réessayez dans un instant',
                retryable: true,
                correlation_id: 'corr-retry-1',
                state: null,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '[]',
        });
      }),
    );
  });

  it('affiche l’indication « nouvel essai possible » quand retryable est vrai', async () => {
    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByRole('tab', { name: /paiement/i }));

    await waitFor(() => {
      expect((screen.getByTestId('cashflow-submit-sale') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-submit-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-submit-error').textContent).toMatch(/Nouvel essai possible/i);
    expect(screen.getByTestId('cashflow-ticket-sale-id').textContent).toMatch(/Aucune vente finalisée/i);
  });
});
