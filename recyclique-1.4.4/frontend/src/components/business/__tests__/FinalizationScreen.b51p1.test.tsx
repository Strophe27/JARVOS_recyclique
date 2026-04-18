/**
 * Story B51-P1: Bug ticket avec un seul don – finalisation impossible
 *
 * Objectif: Vérifier qu'un ticket contenant uniquement une ligne de don
 * peut être finalisé (bouton activé, paiement pré-configuré en "Gratuit / Don").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import FinalizationScreen from '../FinalizationScreen';
import { useFeatureFlag } from '../../../utils/features';

// B50-P10: Mock configurable pour useCashStores
let mockCashSessionStoreState = {
  currentRegisterOptions: null as Record<string, any> | null,
  currentSaleItems: [] as any[],
  currentSession: null,
  loading: false,
  error: null
};

vi.mock('../../../providers/CashStoreProvider', () => ({
  useCashStores: () => ({
    cashSessionStore: mockCashSessionStoreState,
    categoryStore: {},
    presetStore: {},
    isVirtualMode: false,
    isDeferredMode: false
  })
}));

vi.mock('../../../utils/features', () => ({
  useFeatureFlag: vi.fn(() => false)
}));

const mockUseFeatureFlag = vi.mocked(useFeatureFlag);

describe('FinalizationScreen - B51-P1 Ticket avec un seul don', () => {
  const donationOnlyItems = [
    {
      id: '1',
      category: 'don',
      quantity: 1,
      weight: 1,
      price: 0,
      total: 0,
      presetId: 'don-0'
    }
  ];

  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(false);
    mockCashSessionStoreState = {
      currentRegisterOptions: null,
      currentSaleItems: [],
      currentSession: null,
      loading: false,
      error: null
    };
  });

  it('pré-sélectionne "Gratuit / Don" pour un ticket avec un seul don (0€)', () => {
    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={onCancel}
        onConfirm={onConfirm}
        items={donationOnlyItems}
      />
    );

    const paymentSelect = screen.getByTestId('payment-select') as HTMLSelectElement;
    expect(paymentSelect.value).toBe('free');

    const confirmButton = screen.getByTestId('confirm-finalization');
    expect(confirmButton).not.toBeDisabled();
  });

  it('permet de finaliser le ticket "don seul" sans montant reçu ni total manuel', async () => {
    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={onCancel}
        onConfirm={onConfirm}
        items={donationOnlyItems}
      />
    );

    const confirmButton = screen.getByTestId('confirm-finalization');

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0];

    expect(payload.paymentMethod).toBe('free');
    expect(payload.donation).toBe(0);
  });

  it('le champ "Total à payer" n\'est pas requis pour un ticket "don seul" en mode prix global', () => {
    // Activer le mode prix global
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={onCancel}
        onConfirm={onConfirm}
        items={donationOnlyItems}
      />
    );

    const totalInput = screen.getByTestId('manual-total-input') as HTMLInputElement;
    
    // Le champ ne doit pas avoir l'attribut required pour un ticket "don seul"
    expect(totalInput.hasAttribute('required')).toBe(false);
    
    // Le champ doit être pré-rempli avec "0" pour éviter l'erreur de validation HTML5
    expect(totalInput.value).toBe('0');
    
    // Le bouton de validation doit être activé
    const confirmButton = screen.getByTestId('confirm-finalization');
    expect(confirmButton).not.toBeDisabled();
  });
});


