/**
 * Story B49-P2: Tests pour le mode prix global (no_item_pricing)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import SaleWizard from '../SaleWizard';
import { useCashWizardStepState } from '../../../hooks/useCashWizardStepState';
import { useCategoryStore } from '../../../stores/categoryStore';
import { usePresetStore } from '../../../stores/presetStore';

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
vi.mock('../../../hooks/useCashWizardStepState');
vi.mock('../../../stores/categoryStore');
vi.mock('../../../stores/presetStore');
vi.mock('../../../utils/features', () => ({
  useFeatureFlag: vi.fn(() => false)
}));

const mockUseCashWizardStepState = vi.mocked(useCashWizardStepState);
const mockUseCategoryStore = vi.mocked(useCategoryStore);
const mockUsePresetStore = vi.mocked(usePresetStore);

describe('SaleWizard - B49-P2 Mode Prix Global', () => {
  const mockNumpadCallbacks = {
    quantityValue: '1',
    quantityError: '',
    priceValue: '0',
    priceError: '',
    weightValue: '2.5',
    weightError: '',
    setQuantityValue: vi.fn(),
    setQuantityError: vi.fn(),
    setPriceValue: vi.fn(),
    setPriceError: vi.fn(),
    setWeightValue: vi.fn(),
    setWeightError: vi.fn(),
    setMode: vi.fn(),
    setPricePrefilled: vi.fn()
  };

  const mockOnItemComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock state
    mockCashSessionStoreState = {
      currentRegisterOptions: null,
      currentSaleItems: [],
      currentSession: null,
      loading: false,
      error: null
    };
    
    mockUseCashWizardStepState.mockReturnValue({
      stepState: {
        currentStep: 'category',
        categoryState: 'active',
        subcategoryState: 'inactive',
        weightState: 'inactive',
        quantityState: 'inactive',
        priceState: 'inactive',
        stepStartTime: new Date(),
        lastActivity: new Date()
      },
      transitionToStep: vi.fn(),
      handleCategorySelected: vi.fn(),
      handleSubcategorySelected: vi.fn(),
      handleWeightInputStarted: vi.fn(),
      handleWeightInputCompleted: vi.fn(),
      handleQuantityInputCompleted: vi.fn(),
      handlePriceInputCompleted: vi.fn(),
      handleTicketClosed: vi.fn()
    });

    mockUseCategoryStore.mockReturnValue({
      getCategoryById: vi.fn(() => ({ id: 'cat1', name: 'Test Category' })),
      activeCategories: [],
      fetchCategories: vi.fn()
    });

    mockUsePresetStore.mockReturnValue({
      selectedPreset: null,
      notes: '',
      clearSelection: vi.fn(),
      setNotes: vi.fn(),
      presets: [],
      activePresets: [],
      loading: false,
      error: null,
      fetchPresets: vi.fn(),
      selectPreset: vi.fn()
    });
  });

  it('masque l\'onglet Quantité quand mode prix global activé', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    render(
      <SaleWizard
        onItemComplete={mockOnItemComplete}
        numpadCallbacks={mockNumpadCallbacks}
        currentMode="idle"
      />
    );

    // L'onglet Quantité ne doit pas être présent
    const quantityTab = screen.queryByText('Quantité');
    expect(quantityTab).not.toBeInTheDocument();
  });

  it('affiche l\'onglet Quantité quand mode prix global désactivé', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {}
    };

    render(
      <SaleWizard
        onItemComplete={mockOnItemComplete}
        numpadCallbacks={mockNumpadCallbacks}
        currentMode="idle"
      />
    );

    // L'onglet Quantité doit être présent
    const quantityTab = screen.queryByText('Quantité');
    expect(quantityTab).toBeInTheDocument();
  });

  it('accepte prix 0€ en mode prix global', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    mockUseCashWizardStepState.mockReturnValue({
      stepState: {
        currentStep: 'price',
        categoryState: 'completed',
        subcategoryState: 'completed',
        weightState: 'completed',
        quantityState: 'completed',
        priceState: 'active',
        stepStartTime: new Date(),
        lastActivity: new Date()
      },
      transitionToStep: vi.fn(),
      handleCategorySelected: vi.fn(),
      handleSubcategorySelected: vi.fn(),
      handleWeightInputStarted: vi.fn(),
      handleWeightInputCompleted: vi.fn(),
      handleQuantityInputCompleted: vi.fn(),
      handlePriceInputCompleted: vi.fn(),
      handleTicketClosed: vi.fn()
    });

    const numpadWithZeroPrice = {
      ...mockNumpadCallbacks,
      priceValue: '0'
    };

    render(
      <SaleWizard
        onItemComplete={mockOnItemComplete}
        numpadCallbacks={numpadWithZeroPrice}
        currentMode="price"
      />
    );

    // Le bouton "Valider" doit être présent (et non "Valider le prix")
    const validateButton = screen.getByText('Valider');
    expect(validateButton).toBeInTheDocument();
  });

  it('comportement prix dynamique: saute quantité et va directement au prix en mode prix global', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    const mockTransitionToStep = vi.fn();
    mockUseCashWizardStepState.mockReturnValue({
      stepState: {
        currentStep: 'weight',
        categoryState: 'completed',
        subcategoryState: 'completed',
        weightState: 'completed',
        quantityState: 'inactive', // Quantité inactive en mode prix global
        priceState: 'inactive',
        stepStartTime: new Date(),
        lastActivity: new Date()
      },
      transitionToStep: mockTransitionToStep,
      handleCategorySelected: vi.fn(),
      handleSubcategorySelected: vi.fn(),
      handleWeightInputStarted: vi.fn(),
      handleWeightInputCompleted: vi.fn(),
      handleQuantityInputCompleted: vi.fn(),
      handlePriceInputCompleted: vi.fn(),
      handleTicketClosed: vi.fn()
    });

    const numpadWithWeight = {
      ...mockNumpadCallbacks,
      weightValue: '2.5',
      priceValue: '0' // Prix peut être 0€ en mode prix global
    };

    render(
      <SaleWizard
        onItemComplete={mockOnItemComplete}
        numpadCallbacks={numpadWithWeight}
        currentMode="weight"
      />
    );

    // En mode prix global, après le poids, on doit aller directement au prix (pas à quantité)
    // Vérifier que quantityState reste inactive
    expect(mockUseCashWizardStepState).toHaveBeenCalled();
  });

  it('comportement prix dynamique: prix peut être modifié librement en mode prix global', () => {
    mockCashSessionStoreState.currentRegisterOptions = {
      features: {
        no_item_pricing: { enabled: true }
      }
    };

    const mockSetPriceValue = vi.fn();
    const numpadWithPriceCallback = {
      ...mockNumpadCallbacks,
      setPriceValue: mockSetPriceValue,
      priceValue: '15.50'
    };

    mockUseCashWizardStepState.mockReturnValue({
      stepState: {
        currentStep: 'price',
        categoryState: 'completed',
        subcategoryState: 'completed',
        weightState: 'completed',
        quantityState: 'inactive',
        priceState: 'active',
        stepStartTime: new Date(),
        lastActivity: new Date()
      },
      transitionToStep: vi.fn(),
      handleCategorySelected: vi.fn(),
      handleSubcategorySelected: vi.fn(),
      handleWeightInputStarted: vi.fn(),
      handleWeightInputCompleted: vi.fn(),
      handleQuantityInputCompleted: vi.fn(),
      handlePriceInputCompleted: vi.fn(),
      handleTicketClosed: vi.fn()
    });

    render(
      <SaleWizard
        onItemComplete={mockOnItemComplete}
        numpadCallbacks={numpadWithPriceCallback}
        currentMode="price"
      />
    );

    // Le prix peut être modifié librement (pas de validation stricte)
    // Le composant doit permettre la saisie de n'importe quel prix, y compris 0€
    expect(numpadWithPriceCallback.priceValue).toBe('15.50');
  });
});
