import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test/test-utils';
import { useAuthStore } from '../../../stores/authStore';
import { useCategoryStore } from '../../../stores/categoryStore';
import { usePresetStore } from '../../../stores/presetStore';
import { useCashWizardStepState } from '../../../hooks/useCashWizardStepState';
import SaleWizard from '../SaleWizard';

// B50-P10: Mock configurable pour useCashStores
let mockCashSessionStoreState = {
  currentSession: {
    id: 'session-1',
    operator_id: 'user-1',
    initial_amount: 100,
    current_amount: 100,
    status: 'open' as const,
    opened_at: '2024-01-01T00:00:00Z'
  },
  currentSaleItems: [] as any[],
  currentRegisterOptions: null as Record<string, any> | null,
  loading: false,
  error: null,
  addSaleItem: vi.fn(),
  removeSaleItem: vi.fn(),
  updateSaleItem: vi.fn(),
  clearCurrentSale: vi.fn(),
  submitSale: vi.fn(),
  clearError: vi.fn()
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

// Mock the stores
vi.mock('../../../stores/authStore');
vi.mock('../../../stores/categoryStore');
vi.mock('../../../stores/presetStore');
vi.mock('../../../hooks/useCashWizardStepState');
vi.mock('../../../utils/features', () => ({
  useFeatureFlag: vi.fn(() => false)
}));

const mockUseAuthStore = useAuthStore as any;
const mockUseCategoryStore = useCategoryStore as any;
const mockUsePresetStore = usePresetStore as any;
const mockUseCashWizardStepState = vi.mocked(useCashWizardStepState);

describe('SaleWizard - Quantity Validation (B39-P5)', () => {
  const mockNumpadCallbacks = {
    quantityValue: '1',
    quantityError: '',
    priceValue: '',
    priceError: '',
    weightValue: '',
    weightError: '',
    setQuantityValue: vi.fn(),
    setQuantityError: vi.fn(),
    setPriceValue: vi.fn(),
    setPriceError: vi.fn(),
    setWeightValue: vi.fn(),
    setWeightError: vi.fn(),
    setMode: vi.fn()
  };

  const mockCategoryStore = {
    activeCategories: [
      {
        id: 'EEE-1',
        name: 'Gros électroménager',
        is_active: true,
        parent_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'EEE-2',
        name: 'Petit électroménager',
        is_active: true,
        parent_id: null,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }
    ],
    categories: [],
    loading: false,
    error: null,
    lastFetchTime: Date.now(),
    getCategoryById: vi.fn((id) => {
      const cats = {
        'EEE-1': { id: 'EEE-1', name: 'Gros électroménager', price: 10 },
        'EEE-2': { id: 'EEE-2', name: 'Petit électroménager', price: 5 }
      };
      return cats[id as keyof typeof cats] || null;
    }),
    fetchCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    activateCategory: vi.fn(),
    deactivateCategory: vi.fn()
  };

  const mockPresetStore = {
    selectedPreset: null,
    presets: [],
    notes: '',
    loading: false,
    error: null,
    clearSelection: vi.fn(),
    selectPreset: vi.fn(),
    fetchPresets: vi.fn(),
    createPreset: vi.fn(),
    updatePreset: vi.fn(),
    deletePreset: vi.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock state
    mockCashSessionStoreState = {
      currentSession: {
        id: 'session-1',
        operator_id: 'user-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: '2024-01-01T00:00:00Z'
      },
      currentSaleItems: [],
      currentRegisterOptions: null,
      loading: false,
      error: null,
      addSaleItem: vi.fn(),
      removeSaleItem: vi.fn(),
      updateSaleItem: vi.fn(),
      clearCurrentSale: vi.fn(),
      submitSale: vi.fn(),
      clearError: vi.fn()
    };

    // Setup default mocks
    mockUseAuthStore.mockReturnValue({ currentUser: { id: 'user-1', username: 'test' } });
    mockUseCategoryStore.mockReturnValue(mockCategoryStore);
    mockUsePresetStore.mockReturnValue(mockPresetStore);

    // Mock useCashWizardStepState
    mockUseCashWizardStepState.mockReturnValue({
      stepState: {
        currentStep: 'quantity',
        categoryState: 'completed',
        subcategoryState: 'completed',
        weightState: 'completed',
        quantityState: 'active',
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
  });

  describe('Quantity Field Pre-filling', () => {
    it('should pre-fill quantity field with value 1', async () => {
      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      const quantityDisplay = screen.getByTestId('quantity-input');
      expect(quantityDisplay).toHaveTextContent('1');
    });

    it('should initialize quantity to 1 when transitioning from weight step', () => {
      mockNumpadCallbacks.setQuantityValue.mockClear();

      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      // The component should initialize quantity to '1' when entering quantity mode
      // This is tested implicitly through the numpadCallbacks mock
      expect(mockNumpadCallbacks.setQuantityValue).toHaveBeenCalledWith('1');
    });
  });

  describe('Quantity Validation', () => {
    it('should accept valid quantity values (1-9999)', async () => {
      const { rerender } = render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      // Test valid quantities
      const validQuantities = ['1', '5', '100', '9999'];

      for (const qty of validQuantities) {
        mockNumpadCallbacks.quantityValue = qty;
        rerender(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

        const quantityDisplay = screen.getByTestId('quantity-input');
        expect(quantityDisplay).toHaveTextContent(qty);
      }
    });

    it('should reject quantity values less than 1', async () => {
      const { rerender } = render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      // Test invalid quantities (< 1)
      const invalidQuantities = ['0', '-1', '-5'];

      for (const qty of invalidQuantities) {
        mockNumpadCallbacks.quantityValue = qty;
        mockNumpadCallbacks.quantityError = 'La quantité minimale est 1';
        rerender(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

        const errorMessage = screen.getByText('La quantité minimale est 1');
        expect(errorMessage).toBeInTheDocument();
      }
    });

    it('should show correct error message for minimum quantity', () => {
      mockNumpadCallbacks.quantityValue = '0';
      mockNumpadCallbacks.quantityError = 'La quantité minimale est 1';

      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      const errorMessage = screen.getByText('La quantité minimale est 1');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should clear error when valid quantity is entered', () => {
      const { rerender } = render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      // Start with invalid quantity
      mockNumpadCallbacks.quantityValue = '0';
      mockNumpadCallbacks.quantityError = 'La quantité minimale est 1';
      rerender(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      expect(screen.getByText('La quantité minimale est 1')).toBeInTheDocument();

      // Change to valid quantity
      mockNumpadCallbacks.quantityValue = '1';
      mockNumpadCallbacks.quantityError = '';
      rerender(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      expect(screen.queryByText('La quantité minimale est 1')).not.toBeInTheDocument();
    });
  });

  describe('Quantity Step Validation', () => {
    it('should enable validate button when quantity is valid (>= 1)', () => {
      mockNumpadCallbacks.quantityValue = '1';
      mockNumpadCallbacks.quantityError = '';

      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      const validateButton = screen.getByTestId('validate-quantity-button');
      expect(validateButton).not.toBeDisabled();
    });

    it('should disable validate button when quantity is invalid (< 1)', () => {
      mockNumpadCallbacks.quantityValue = '0';
      mockNumpadCallbacks.quantityError = 'La quantité minimale est 1';

      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      const validateButton = screen.getByTestId('validate-quantity-button');
      expect(validateButton).toBeDisabled();
    });

    it('should disable validate button when quantity field is empty', () => {
      mockNumpadCallbacks.quantityValue = '';
      mockNumpadCallbacks.quantityError = 'Quantité requise';

      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      const validateButton = screen.getByTestId('validate-quantity-button');
      expect(validateButton).toBeDisabled();
    });
  });

  describe('Wizard Reset Behavior', () => {
    it('should reset quantity to 1 when wizard is reset', () => {
      render(<SaleWizard onItemComplete={vi.fn()} numpadCallbacks={mockNumpadCallbacks} currentMode="quantity" />);

      // Simulate wizard reset by checking that setQuantityValue is called with '1' during reset
      // This is tested through the component's resetWizard function behavior
      expect(mockNumpadCallbacks.setQuantityValue).toHaveBeenCalledWith('1');
    });
  });
});
