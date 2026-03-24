import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test/test-utils';
import { useCashSessionStore } from '../../../stores/cashSessionStore';
import { useFeatureFlag } from '../../../utils/features';
import Sale from '../Sale';

vi.mock('../../../stores/cashSessionStore');
vi.mock('../../../utils/features', () => ({
  useFeatureFlag: vi.fn(),
}));
const mockUseCashSessionStore = useCashSessionStore as any;
const mockUseFeatureFlag = vi.mocked(useFeatureFlag);

describe('Sale - Finalization Screen Integration', () => {
  const baseStore = {
    currentSession: { id: 'S1', status: 'open', operator_id: 'op', initial_amount: 0, current_amount: 0, opened_at: new Date().toISOString() },
    currentSaleItems: [
      { id: 'it1', category: 'EEE-1', quantity: 1, weight: 2, price: 10, total: 10 },
    ],
    addSaleItem: vi.fn(),
    removeSaleItem: vi.fn(),
    updateSaleItem: vi.fn(),
    submitSale: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCashSessionStore.mockReturnValue(baseStore);
    (mockUseCashSessionStore as any).getState = () => ({ error: null });
  });

  it('opens finalization modal and confirms with card', async () => {
    const submitSale = vi.fn().mockResolvedValue(true);
    mockUseCashSessionStore.mockReturnValue({
      ...baseStore,
      submitSale,
    });

    render(<Sale />);

    fireEvent.click(screen.getByRole('button', { name: 'Finaliser la vente' }));

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'card' } });
    fireEvent.click(screen.getByTestId('confirm-finalization'));

    await waitFor(() => {
      expect(submitSale).toHaveBeenCalled();
      const args = submitSale.mock.calls[0];
      expect(args[0]).toHaveLength(1);
      expect(args[1]).toMatchObject({ paymentMethod: 'card' });
    });
  });

  it('computes change and confirms with cash', async () => {
    const submitSale = vi.fn().mockResolvedValue(true);
    mockUseCashSessionStore.mockReturnValue({
      ...baseStore,
      submitSale,
    });

    render(<Sale />);
    fireEvent.click(screen.getByRole('button', { name: 'Finaliser la vente' }));

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });

    // donation 1, amount due = 11, cash given 20 -> change 9
    fireEvent.change(screen.getByTestId('donation-input'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '20' } });
    expect((screen.getByTestId('change-output') as HTMLInputElement).value).toBe('9.00');

    fireEvent.click(screen.getByTestId('confirm-finalization'));
    await waitFor(() => {
      expect(submitSale).toHaveBeenCalled();
      const payload = submitSale.mock.calls[0][1];
      expect(payload).toMatchObject({ paymentMethod: 'cash', donation: 1, change: 9.00 });
    });
  });

  it('handles check payment with donation and exact amount (cashChequesV2 enabled)', async () => {
    // Simule le bug passé : don + chèque + total imposé
    // Avec le nouveau comportement, chèque nécessite montant donné exact

    // Mock feature flag activé
    vi.mocked(useFeatureFlag).mockReturnValue(true);

    const submitSale = vi.fn().mockResolvedValue(true);
    mockUseCashSessionStore.mockReturnValue({
      ...baseStore,
      submitSale,
    });

    render(<Sale />);
    fireEvent.click(screen.getByRole('button', { name: 'Finaliser la vente' }));

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });

    // Ajouter un don de 5€
    fireEvent.change(screen.getByTestId('donation-input'), { target: { value: '5' } });

    // Sélectionner chèque - devrait maintenant montrer le champ montant donné
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    // Vérifier que le champ montant donné est visible
    expect(screen.getByTestId('cash-given-input')).toBeInTheDocument();

    // Total dû = 10€ (ticket) + 5€ (don) = 15€
    expect(screen.getByTestId('amount-due')).toHaveTextContent('15.00 €');

    // Donner exactement 15€ (pas de monnaie à rendre)
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '15' } });

    fireEvent.click(screen.getByTestId('confirm-finalization'));

    await waitFor(() => {
      expect(submitSale).toHaveBeenCalled();
      const payload = submitSale.mock.calls[0][1];
      expect(payload).toMatchObject({
        paymentMethod: 'check',
        donation: 5,
        cashGiven: 15.00
      });
      // Pas de change pour les chèques
      expect(payload.change).toBeUndefined();
    });
  });

  it('handles check payment with overpayment (cashChequesV2 enabled)', async () => {
    // Test avec surpaiement en chèque (devrait être autorisé comme pour les espèces)

    vi.mocked(useFeatureFlag).mockReturnValue(true);

    const submitSale = vi.fn().mockResolvedValue(true);
    mockUseCashSessionStore.mockReturnValue({
      ...baseStore,
      submitSale,
    });

    render(<Sale />);
    fireEvent.click(screen.getByRole('button', { name: 'Finaliser la vente' }));

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });

    // Ajouter un don de 2€
    fireEvent.change(screen.getByTestId('donation-input'), { target: { value: '2' } });

    // Sélectionner chèque
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    // Total dû = 10€ + 2€ = 12€
    expect(screen.getByTestId('amount-due')).toHaveTextContent('12.00 €');

    // Donner 20€ (surpaiement)
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '20' } });

    fireEvent.click(screen.getByTestId('confirm-finalization'));

    await waitFor(() => {
      expect(submitSale).toHaveBeenCalled();
      const payload = submitSale.mock.calls[0][1];
      expect(payload).toMatchObject({
        paymentMethod: 'check',
        donation: 2,
        cashGiven: 20.00
      });
      // Pas de change calculé pour les chèques
      expect(payload.change).toBeUndefined();
    });
  });

  it('prevents check payment confirmation without sufficient amount (cashChequesV2 enabled)', async () => {
    // Test de validation : chèque nécessite montant suffisant

    vi.mocked(useFeatureFlag).mockReturnValue(true);

    mockUseCashSessionStore.mockReturnValue({
      ...baseStore,
      submitSale: vi.fn(),
    });

    render(<Sale />);
    fireEvent.click(screen.getByRole('button', { name: 'Finaliser la vente' }));

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });

    // Sélectionner chèque
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    // Total dû = 10€
    expect(screen.getByTestId('amount-due')).toHaveTextContent('10.00 €');

    // Donner seulement 5€ (insuffisant)
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '5' } });

    // Bouton devrait être désactivé
    const confirmButton = screen.getByTestId('confirm-finalization');
    expect(confirmButton).toBeDisabled();
  });

  it('allows check payment without amount input (legacy behavior when flag disabled)', async () => {
    // Test comportement legacy : chèque sans montant requis

    vi.mocked(useFeatureFlag).mockReturnValue(false);

    const submitSale = vi.fn().mockResolvedValue(true);
    mockUseCashSessionStore.mockReturnValue({
      ...baseStore,
      submitSale,
    });

    render(<Sale />);
    fireEvent.click(screen.getByRole('button', { name: 'Finaliser la vente' }));

    await waitFor(() => {
      expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    });

    // Sélectionner chèque
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    // Avec l'ancien comportement, pas de champ montant donné
    expect(screen.queryByTestId('cash-given-input')).not.toBeInTheDocument();

    // Devrait pouvoir confirmer directement
    fireEvent.click(screen.getByTestId('confirm-finalization'));

    await waitFor(() => {
      expect(submitSale).toHaveBeenCalled();
      const payload = submitSale.mock.calls[0][1];
      expect(payload).toMatchObject({
        paymentMethod: 'check',
        donation: 0
      });
      // Pas de cashGiven ou change
      expect(payload.cashGiven).toBeUndefined();
      expect(payload.change).toBeUndefined();
    });
  });
});


