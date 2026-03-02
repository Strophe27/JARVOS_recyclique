/**
 * Tests Story 18-8 AC2/AC3/AC4 — Composant FinalizationScreen.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { FinalizationScreen } from './FinalizationScreen';
import type { FinalizationScreenProps } from './FinalizationScreen';
import type { CartLine } from './CashRegisterSalePage';

const fakeCart: CartLine[] = [
  {
    id: 'l1',
    category_id: 'cat-1',
    preset_id: null,
    category_name: 'Livres',
    preset_name: undefined,
    quantity: 2,
    unit_price: 150,
    total_price: 300,
    weight: null,
  },
  {
    id: 'l2',
    category_id: 'cat-2',
    preset_id: null,
    category_name: 'Vetements',
    preset_name: undefined,
    quantity: 1,
    unit_price: 500,
    total_price: 500,
    weight: null,
  },
];
const cartTotal = 800;

function buildProps(overrides: Partial<FinalizationScreenProps> = {}): FinalizationScreenProps {
  return {
    cart: fakeCart,
    cartTotal,
    payments: [],
    paymentMethod: 'especes',
    paymentAmountEur: '',
    onPaymentMethodChange: vi.fn(),
    onPaymentAmountChange: vi.fn(),
    onAddPayment: vi.fn(),
    onRemovePayment: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    submitting: false,
    error: null,
    successMessage: null,
    ...overrides,
  };
}

function renderScreen(props: FinalizationScreenProps) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <FinalizationScreen {...props} />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('FinalizationScreen \u2014 Story 18-8 AC2/AC3/AC4', () => {
  it('affiche le recapitulatif du ticket (lignes et total)', () => {
    renderScreen(buildProps());

    expect(screen.getByText('Livres')).toBeInTheDocument();
    expect(screen.getByText('Vetements')).toBeInTheDocument();
    expect(screen.getByText(/8\.00/)).toBeInTheDocument();
  });

  it('affiche data-testid="finalization-screen"', () => {
    renderScreen(buildProps());

    expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
  });

  it('bouton Annuler appelle onCancel', () => {
    const onCancel = vi.fn();
    renderScreen(buildProps({ onCancel }));

    fireEvent.click(screen.getByTestId('finalization-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('bouton Valider desactive si paymentsTotal != cartTotal', () => {
    renderScreen(buildProps({ payments: [] }));

    expect(screen.getByTestId('finalization-confirm')).toBeDisabled();
  });

  it('bouton Valider actif si paymentsTotal === cartTotal', () => {
    renderScreen(buildProps({
      payments: [{ payment_method: 'especes', amount: 800 }],
    }));

    expect(screen.getByTestId('finalization-confirm')).not.toBeDisabled();
  });

  it('affiche le rendu monnaie si paiement especes > total (rendu-monnaie)', () => {
    renderScreen(buildProps({
      payments: [{ payment_method: 'especes', amount: 1000 }],
    }));

    expect(screen.getByTestId('rendu-monnaie')).toBeInTheDocument();
    expect(screen.getByTestId('rendu-monnaie')).toHaveTextContent('2.00');
  });

  it('ne calcule pas de rendu monnaie pour un paiement cheque', () => {
    renderScreen(buildProps({
      payments: [{ payment_method: 'cheque', amount: 1000 }],
    }));

    expect(screen.queryByTestId('rendu-monnaie')).not.toBeInTheDocument();
  });

  it('bouton Montant exact pre-remplit le champ avec le total exact', () => {
    const onPaymentAmountChange = vi.fn();
    renderScreen(buildProps({ onPaymentAmountChange }));

    fireEvent.click(screen.getByTestId('btn-montant-exact'));
    expect(onPaymentAmountChange).toHaveBeenCalledWith('8.00');
  });

  it('touche E selectionne le mode especes (hors input)', () => {
    const onPaymentMethodChange = vi.fn();
    renderScreen(buildProps({ onPaymentMethodChange }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    });
    expect(onPaymentMethodChange).toHaveBeenCalledWith('especes');
  });

  it('touche C selectionne le mode carte bancaire (hors input)', () => {
    const onPaymentMethodChange = vi.fn();
    renderScreen(buildProps({ onPaymentMethodChange }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    });
    expect(onPaymentMethodChange).toHaveBeenCalledWith('cb');
  });

  it('touche Q selectionne le mode cheque (hors input)', () => {
    const onPaymentMethodChange = vi.fn();
    renderScreen(buildProps({ onPaymentMethodChange }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
    });
    expect(onPaymentMethodChange).toHaveBeenCalledWith('cheque');
  });

  it('touche Echap appelle onCancel', () => {
    const onCancel = vi.fn();
    renderScreen(buildProps({ onCancel }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it('affiche le message succes data-testid="sale-success" si successMessage est fourni', () => {
    renderScreen(buildProps({ successMessage: 'Ticket enregistre \u2014 1 articles, 8.00 EUR' }));

    expect(screen.getByTestId('sale-success')).toBeInTheDocument();
    expect(screen.getByTestId('sale-success')).toHaveTextContent('Ticket enregistre');
  });
});
