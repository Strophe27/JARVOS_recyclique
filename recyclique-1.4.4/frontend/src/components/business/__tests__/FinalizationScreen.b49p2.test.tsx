/**
 * Story B49-P2: Tests pour FinalizationScreen avec mode prix global
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mocks
vi.mock('../../../utils/features', () => ({
  useFeatureFlag: vi.fn(() => false)
}));

const mockUseFeatureFlag = vi.mocked(useFeatureFlag);

describe('FinalizationScreen - B49-P2 Mode Prix Global', () => {
  const mockItems = [
    { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0 },
    { id: '2', category: 'cat2', quantity: 1, weight: 1.0, price: 15, total: 15 }
  ];

  const mockOnCancel = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(false);
    
    // Reset mock state
    mockCashSessionStoreState = {
      currentRegisterOptions: null,
      currentSaleItems: [],
      currentSession: null,
      loading: false,
      error: null
    };
  });

  it('affiche le champ "Total à payer" en mode prix global', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    render(
      <FinalizationScreen
        open={true}
        totalAmount={15}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={mockItems}
      />
    );

    const totalInput = screen.getByTestId('manual-total-input');
    expect(totalInput).toBeInTheDocument();
  });

  it('affiche le sous-total si au moins un item a un prix >0', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    render(
      <FinalizationScreen
        open={true}
        totalAmount={15}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={mockItems}
      />
    );

    const subtotalDisplay = screen.getByTestId('subtotal-display');
    expect(subtotalDisplay).toBeInTheDocument();
    expect(subtotalDisplay).toHaveTextContent('15.00 €');
  });

  it('valide que le total ne peut pas être inférieur au sous-total', async () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    render(
      <FinalizationScreen
        open={true}
        totalAmount={15}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={mockItems}
      />
    );

    const totalInput = screen.getByTestId('manual-total-input') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(totalInput, { target: { value: '10' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Le total à payer.*ne peut pas être inférieur au sous-total/)).toBeInTheDocument();
    });
  });

  it('ferme la popup avec Escape', async () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    render(
      <FinalizationScreen
        open={true}
        totalAmount={15}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={mockItems}
      />
    );

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('valide que le total peut être 0€ si pas de sous-total (tous items à 0€)', async () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    const itemsAllZero = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0 },
      { id: '2', category: 'cat2', quantity: 1, weight: 1.0, price: 0, total: 0 }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={itemsAllZero}
      />
    );

    const totalInput = screen.getByTestId('manual-total-input') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(totalInput, { target: { value: '0' } });
    });

    // Le sous-total ne doit pas être affiché si tous les items sont à 0€
    const subtotalDisplay = screen.queryByTestId('subtotal-display');
    expect(subtotalDisplay).not.toBeInTheDocument();

    // Le total 0€ doit être valide (pas d'erreur)
    await waitFor(() => {
      const errorMessage = screen.queryByText(/Le total à payer.*ne peut pas être inférieur au sous-total/);
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  it('valide que le total = 0€ est accepté quand pas de sous-total', async () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    const itemsAllZero = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0 }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={itemsAllZero}
      />
    );

    const totalInput = screen.getByTestId('manual-total-input') as HTMLInputElement;
    const confirmButton = screen.getByTestId('confirm-button');
    
    await act(async () => {
      fireEvent.change(totalInput, { target: { value: '0' } });
    });

    // Le bouton de confirmation doit être activé (pas d'erreur de validation)
    expect(confirmButton).not.toBeDisabled();
  });
});
