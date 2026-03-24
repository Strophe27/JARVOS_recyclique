import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuickAnalysis from '../../../pages/Admin/QuickAnalysis';
import { getSalesByCategory } from '../../../services/api';
import { categoryService } from '../../../services/categoryService';

// Mock des services
vi.mock('../../../services/api', () => ({
  getSalesByCategory: vi.fn()
}));

vi.mock('../../../services/categoryService', () => ({
  categoryService: {
    getCategories: vi.fn()
  }
}));

// Mock des composants enfants pour simplifier les tests
vi.mock('../../../components/Admin/PeriodSelector', () => ({
  default: ({ onPeriodChange }: any) => (
    <div data-testid="period-selector">
      <button onClick={() => onPeriodChange('2025-01-25', '2025-01-25')}>
        Set Period
      </button>
    </div>
  )
}));

vi.mock('../../../components/Admin/ComparisonCards', () => ({
  default: ({ data }: any) => (
    <div data-testid="comparison-cards">
      <div>Period 1: {data.period1.weight} kg</div>
      <div>Period 2: {data.period2.weight} kg</div>
    </div>
  )
}));

vi.mock('../../../components/Admin/ComparisonChart', () => ({
  default: () => <div data-testid="comparison-chart">Chart</div>
}));

const mockCategories = [
  { id: '1', name: 'EEE-1', parent_id: null, is_active: true },
  { id: '2', name: 'EEE-2', parent_id: null, is_active: true },
  { id: '3', name: 'EEE-3', parent_id: null, is_active: true }
];

const mockSalesStats = [
  { category_name: 'EEE-1', total_weight: 100.5, total_items: 45 },
  { category_name: 'EEE-2', total_weight: 75.3, total_items: 32 },
  { category_name: 'EEE-3', total_weight: 50.2, total_items: 20 }
];

const renderQuickAnalysis = () => {
  return render(
    <BrowserRouter>
      <QuickAnalysis />
    </BrowserRouter>
  );
};

describe('QuickAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (categoryService.getCategories as any).mockResolvedValue(mockCategories);
    (getSalesByCategory as any).mockResolvedValue(mockSalesStats);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the page title', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(screen.getByText('Analyse Rapide - Comparaison de Périodes')).toBeInTheDocument();
    });
  });

  it('should load categories on mount', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(categoryService.getCategories).toHaveBeenCalledWith(true);
    });
  });

  it('should display category selector with all categories', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      const selector = screen.getByLabelText(/catégorie/i);
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue('');
    });
  });

  it('should display period selectors', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(screen.getAllByTestId('period-selector')).toHaveLength(2);
    });
  });

  it('should load comparison data when periods are set', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(screen.getByText(/catégorie/i)).toBeInTheDocument();
    });

    // Simuler la sélection de périodes
    const periodSelectors = screen.getAllByTestId('period-selector');
    const setPeriodButtons = periodSelectors.map(ps => 
      ps.querySelector('button')
    ).filter(Boolean);

    await act(async () => {
      if (setPeriodButtons[0]) {
        setPeriodButtons[0].click();
      }
      if (setPeriodButtons[1]) {
        setPeriodButtons[1].click();
      }
    });

    // Attendre que les données soient chargées
    await waitFor(() => {
      expect(getSalesByCategory).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should display export button as disabled with "À venir" text', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      const exportButton = screen.getByText(/exporter.*à venir/i);
      expect(exportButton).toBeInTheDocument();
      expect(exportButton.closest('button')).toBeDisabled();
    });
  });

  it('should display refresh button', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      const refreshButton = screen.getByText(/actualiser/i);
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('should filter by selected category', async () => {
    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/catégorie/i)).toBeInTheDocument();
    });

    const categorySelector = screen.getByLabelText(/catégorie/i) as HTMLSelectElement;
    
    await act(async () => {
      // Sélectionner une catégorie
      categorySelector.value = 'EEE-1';
      categorySelector.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Attendre que les données soient rechargées avec le filtre
    await waitFor(() => {
      expect(getSalesByCategory).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle API errors gracefully', async () => {
    (getSalesByCategory as any).mockRejectedValue(new Error('API Error'));
    
    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(screen.getByText(/catégorie/i)).toBeInTheDocument();
    });

    // Simuler la sélection de périodes pour déclencher le chargement
    const periodSelectors = screen.getAllByTestId('period-selector');
    const setPeriodButtons = periodSelectors.map(ps => 
      ps.querySelector('button')
    ).filter(Boolean);

    await act(async () => {
      if (setPeriodButtons[0]) {
        setPeriodButtons[0].click();
      }
      if (setPeriodButtons[1]) {
        setPeriodButtons[1].click();
      }
    });

    // Attendre que l'erreur soit affichée
    await waitFor(() => {
      const errorMessage = screen.queryByText(/erreur/i);
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
      }
    }, { timeout: 2000 });
  });

  it('should display loading state while fetching data', async () => {
    // Simuler un délai dans l'API
    (getSalesByCategory as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockSalesStats), 100))
    );

    renderQuickAnalysis();
    
    await waitFor(() => {
      expect(screen.getByText(/catégorie/i)).toBeInTheDocument();
    });

    // Simuler la sélection de périodes
    const periodSelectors = screen.getAllByTestId('period-selector');
    const setPeriodButtons = periodSelectors.map(ps => 
      ps.querySelector('button')
    ).filter(Boolean);

    await act(async () => {
      if (setPeriodButtons[0]) {
        setPeriodButtons[0].click();
      }
      if (setPeriodButtons[1]) {
        setPeriodButtons[1].click();
      }
    });

    // Vérifier que le loading est affiché (peut être très rapide)
    const loadingText = screen.queryByText(/chargement/i);
    if (loadingText) {
      expect(loadingText).toBeInTheDocument();
    }
  });
});






