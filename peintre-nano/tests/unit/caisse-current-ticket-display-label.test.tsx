// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CaisseCurrentTicketWidget } from '../../src/domains/cashflow/CaisseCurrentTicketWidget';
import {
  addTicketLine,
  resetCashflowDraft,
  setAfterSuccessfulSale,
  ticketLineDisplayLabel,
} from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/styles/tokens.css';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  resetCashflowDraft();
});

describe('ticketLineDisplayLabel', () => {
  it('préfère displayLabel non vide pour le ticket / a11y', () => {
    expect(
      ticketLineDisplayLabel({
        category: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
        displayLabel: 'Petit électroménager',
      }),
    ).toBe('Petit électroménager');
  });

  it('retombe sur category si displayLabel absent ou blanc', () => {
    expect(ticketLineDisplayLabel({ category: 'EEE-1' })).toBe('EEE-1');
    expect(ticketLineDisplayLabel({ category: 'EEE-1', displayLabel: '   ' })).toBe('EEE-1');
  });
});

describe('CaisseCurrentTicketWidget — mode kiosque unifié', () => {
  it('affiche la désignation lisible (displayLabel) dans la grille ticket', () => {
    resetCashflowDraft();
    addTicketLine({
      category: 'cat-uuid-runtime',
      displayLabel: 'Tri vente',
      quantity: 1,
      weight: 1,
      unitPrice: 5,
      totalPrice: 5,
    });

    render(
      <RootProviders disableUserPrefsPersistence>
        <CaisseCurrentTicketWidget widgetProps={{ sale_kiosk_unified_ui: true }} />
      </RootProviders>,
    );

    const grid = screen.getByTestId('caisse-ticket-lines-grid');
    expect(grid.textContent ?? '').toContain('Tri vente');
    expect(grid.textContent ?? '').not.toContain('cat-uuid-runtime');
  });

  it('revient à un ticket vide après vente finalisée tout en gardant la confirmation visible', async () => {
    resetCashflowDraft();
    addTicketLine({
      category: 'cat-uuid-runtime',
      displayLabel: 'Tri vente',
      quantity: 1,
      weight: 1,
      unitPrice: 5,
      totalPrice: 5,
    });
    setAfterSuccessfulSale('sale-12345678-abcdef');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 'sale-12345678-abcdef',
            total_amount: 5,
            items: [
              {
                category: 'cat-uuid-runtime',
                quantity: 1,
                weight: 1,
                total_price: 5,
              },
            ],
          }),
      })),
    );

    render(
      <RootProviders disableUserPrefsPersistence>
        <CaisseCurrentTicketWidget widgetProps={{ sale_kiosk_unified_ui: true }} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('caisse-ticket-loading')).toBeNull();
    });
    expect(screen.queryByTestId('caisse-ticket-lines-grid')).toBeNull();
    expect(screen.getByText(/Aucun article pour l’instant/i)).toBeTruthy();
    expect(screen.getByTestId('caisse-last-sale-id').textContent ?? '').toMatch(/Dernière vente/i);
    expect(screen.getByText(/Vente enregistree avec succes/i)).toBeTruthy();
    expect(screen.getByTestId('caisse-local-issue-message').textContent ?? '').toMatch(/Vente enregistrée localement/i);
  });
});
