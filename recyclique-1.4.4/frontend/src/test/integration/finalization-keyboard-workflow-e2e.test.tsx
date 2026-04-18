/**
 * Story B50-P9 QA: Test E2E workflow clavier avec champ "Total à payer" vide
 * 
 * Vérifie que le workflow clavier fonctionne correctement en mode prix global
 * quand le champ Total est initialement vide (fix B2).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FinalizationScreen from '../../components/business/FinalizationScreen';

// Mock des stores et providers
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    currentUser: { id: 'user-1', role: 'user', username: 'test@example.com' }
  })
}));

vi.mock('../../providers/CashStoreProvider', () => ({
  useCashStores: () => ({
    cashSessionStore: {
      currentRegisterOptions: {
        features: {
          no_item_pricing: {
            enabled: true,
            label: 'Mode prix global'
          }
        }
      }
    }
  })
}));

vi.mock('../../utils/features', () => ({
  useFeatureFlag: (flag: string) => flag === 'cashChequesV2'
}));

describe('FinalizationScreen - Keyboard Workflow E2E (Story B50-P9)', () => {
  const defaultProps = {
    open: true,
    totalAmount: 0,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    items: [
      { id: 'item-1', category: 'EEE-1', quantity: 1, weight: 2.5, price: 0, total: 0 }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Champ Total vide à l\'ouverture (Fix B2)', () => {
    it('should have empty Total field when modal opens in no_item_pricing mode', async () => {
      render(<FinalizationScreen {...defaultProps} />);

      // Le champ Total doit être vide (fix B2)
      const totalInput = screen.getByTestId('manual-total-input');
      expect(totalInput).toHaveValue(null); // Input type=number with empty string = null value
    });

    it('should allow manual entry in empty Total field', async () => {
      const user = userEvent.setup();
      render(<FinalizationScreen {...defaultProps} />);

      const totalInput = screen.getByTestId('manual-total-input');
      
      // Saisir un montant
      await user.type(totalInput, '25.50');
      
      expect(totalInput).toHaveValue(25.5);
    });
  });

  describe('Navigation clavier séquentielle', () => {
    it('should navigate from Total to Payment method on Enter', async () => {
      const user = userEvent.setup();
      render(<FinalizationScreen {...defaultProps} />);

      const totalInput = screen.getByTestId('manual-total-input');
      const paymentSelect = screen.getByTestId('payment-select');

      // Focus sur Total
      await user.click(totalInput);
      expect(totalInput).toHaveFocus();

      // Saisir un montant et appuyer sur Enter
      await user.type(totalInput, '20');
      await user.keyboard('{Enter}');

      // Le focus doit passer au moyen de paiement
      await waitFor(() => {
        expect(paymentSelect).toHaveFocus();
      });
    });

    it('should navigate from Payment method to Amount received on Enter', async () => {
      const user = userEvent.setup();
      render(<FinalizationScreen {...defaultProps} />);

      const paymentSelect = screen.getByTestId('payment-select');
      const amountReceivedInput = screen.getByTestId('amount-received-input');

      // Focus sur moyen de paiement
      await user.click(paymentSelect);
      await user.keyboard('{Enter}');

      // Le focus doit passer au montant reçu
      await waitFor(() => {
        expect(amountReceivedInput).toHaveFocus();
      });
    });

    it('should navigate from Amount received to Donation on Enter', async () => {
      const user = userEvent.setup();
      render(<FinalizationScreen {...defaultProps} />);

      const amountReceivedInput = screen.getByTestId('amount-received-input');
      const donationInput = screen.getByTestId('donation-input');

      // Focus sur montant reçu
      await user.click(amountReceivedInput);
      await user.keyboard('{Enter}');

      // Le focus doit passer au don
      await waitFor(() => {
        expect(donationInput).toHaveFocus();
      });
    });
  });

  describe('Workflow complet avec overrideTotalAmount', () => {
    it('should complete full keyboard workflow and submit with override total', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      
      render(<FinalizationScreen {...defaultProps} onConfirm={onConfirm} />);

      // 1. Saisir le total (champ vide initialement - fix B2)
      const totalInput = screen.getByTestId('manual-total-input');
      await user.type(totalInput, '50');
      await user.keyboard('{Enter}');

      // 2. Confirmer le moyen de paiement (espèces par défaut)
      const paymentSelect = screen.getByTestId('payment-select');
      await waitFor(() => expect(paymentSelect).toHaveFocus());
      await user.keyboard('{Enter}');

      // 3. Saisir le montant reçu
      const amountReceivedInput = screen.getByTestId('amount-received-input');
      await waitFor(() => expect(amountReceivedInput).toHaveFocus());
      await user.type(amountReceivedInput, '50');
      await user.keyboard('{Enter}');

      // 4. Passer le don (0 par défaut)
      const donationInput = screen.getByTestId('donation-input');
      await waitFor(() => expect(donationInput).toHaveFocus());
      await user.keyboard('{Enter}');

      // Vérifier que onConfirm est appelé avec overrideTotalAmount
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            overrideTotalAmount: 50,
            paymentMethod: 'cash'
          })
        );
      });
    });

    it('should cancel on Escape key', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<FinalizationScreen {...defaultProps} onCancel={onCancel} />);

      // Appuyer sur Escape
      await user.keyboard('{Escape}');

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Validation du total manuel', () => {
    it('should not allow negative total', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      
      render(<FinalizationScreen {...defaultProps} onConfirm={onConfirm} />);

      const totalInput = screen.getByTestId('manual-total-input');
      await user.type(totalInput, '-10');

      // Le bouton Valider ne doit pas être actif
      const submitButton = screen.getByTestId('confirm-finalization');
      expect(submitButton).toBeDisabled();
    });

    it('should require total in no_item_pricing mode', async () => {
      const onConfirm = vi.fn();
      
      render(<FinalizationScreen {...defaultProps} onConfirm={onConfirm} />);

      // Sans saisie de total, le bouton doit être désactivé
      const submitButton = screen.getByTestId('confirm-finalization');
      expect(submitButton).toBeDisabled();
    });
  });
});






