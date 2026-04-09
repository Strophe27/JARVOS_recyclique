// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

describe('Story 6.1 — DATA_STALE bloque le paiement', () => {
  afterEach(() => {
    cleanup();
    resetCashflowDraft();
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
  });

  it('désactive le POST vente lorsque le widget critique est DATA_STALE', () => {
    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByRole('tab', { name: /paiement/i }));

    const submitBefore = screen.getByTestId('cashflow-submit-sale') as HTMLButtonElement;
    expect(submitBefore.disabled).toBe(false);

    fireEvent.click(screen.getByTestId('cashflow-trigger-stale'));
    expect((screen.getByTestId('cashflow-submit-sale') as HTMLButtonElement).disabled).toBe(true);
  });
});
