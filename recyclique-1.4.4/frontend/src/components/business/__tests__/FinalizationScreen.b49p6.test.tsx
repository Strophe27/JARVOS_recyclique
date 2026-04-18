/**
 * Story B49-P6: Tests pour nouvelle condition écran spécial (recyclage/déchèterie)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('FinalizationScreen - B49-P6 Condition Écran Spécial', () => {
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

  it('affiche l\'écran spécial si un item a presetId recyclage', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0, presetId: 'recyclage' }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    expect(screen.getByText(/Transaction spéciale/i)).toBeInTheDocument();
    expect(screen.getByText(/dons ou de sorties uniquement/i)).toBeInTheDocument();
  });

  it('affiche l\'écran spécial si un item a presetId decheterie', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0, presetId: 'decheterie' }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    expect(screen.getByText(/Transaction spéciale/i)).toBeInTheDocument();
    expect(screen.getByText(/dons ou de sorties uniquement/i)).toBeInTheDocument();
  });

  it('affiche l\'écran spécial si plusieurs items dont au moins un recyclage/déchèterie', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 10, total: 10, presetId: undefined },
      { id: '2', category: 'cat2', quantity: 1, weight: 1.0, price: 0, total: 0, presetId: 'recyclage' }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={10}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    expect(screen.getByText(/Transaction spéciale/i)).toBeInTheDocument();
  });

  it('n\'affiche pas l\'écran spécial si aucun item recyclage/déchèterie', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 10, total: 10, presetId: undefined },
      { id: '2', category: 'cat2', quantity: 1, weight: 1.0, price: 5, total: 5, presetId: undefined }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={15}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    expect(screen.queryByText(/Transaction spéciale/i)).not.toBeInTheDocument();
  });

  it('n\'affiche pas l\'écran spécial si items vides', () => {
    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={[]}
      />
    );

    expect(screen.queryByText(/Transaction spéciale/i)).not.toBeInTheDocument();
  });

  it('affiche l\'écran spécial même si totalAmount > 0 mais item recyclage présent', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0, presetId: 'recyclage' },
      { id: '2', category: 'cat2', quantity: 1, weight: 1.0, price: 10, total: 10, presetId: undefined }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={10}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    // L'écran spécial devrait s'afficher car il y a un item recyclage
    expect(screen.getByText(/Transaction spéciale/i)).toBeInTheDocument();
  });

  it('permet la validation à 0€ pour transaction spéciale recyclage', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0, presetId: 'recyclage' }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    const confirmButton = screen.getByTestId('confirm-finalization');
    expect(confirmButton).not.toBeDisabled(); // Bouton activé même à 0€
  });

  it('permet la validation à 0€ pour transaction spéciale déchèterie', () => {
    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0, presetId: 'decheterie' }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    const confirmButton = screen.getByTestId('confirm-finalization');
    expect(confirmButton).not.toBeDisabled(); // Bouton activé même à 0€
  });

  it('permet la validation en mode prix global sans total manuel pour transaction spéciale', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    const items = [
      { id: '1', category: 'cat1', quantity: 1, weight: 2.5, price: 0, total: 0, presetId: 'recyclage' }
    ];

    render(
      <FinalizationScreen
        open={true}
        totalAmount={0}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        items={items}
      />
    );

    const confirmButton = screen.getByTestId('confirm-finalization');
    expect(confirmButton).not.toBeDisabled(); // Bouton activé même sans total manuel pour transaction spéciale
  });
});
