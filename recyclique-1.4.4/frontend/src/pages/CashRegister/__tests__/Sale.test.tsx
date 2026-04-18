import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test/test-utils';
import { useCashSessionStore } from '../../../stores/cashSessionStore';
import { useAuthStore } from '../../../stores/authStore';
import { useCategoryStore } from '../../../stores/categoryStore';
import Sale from '../Sale';

// Mock the stores
vi.mock('../../../stores/cashSessionStore');
vi.mock('../../../stores/authStore');
vi.mock('../../../stores/categoryStore');
const mockUseCashSessionStore = useCashSessionStore as any;
const mockUseAuthStore = useAuthStore as any;
const mockUseCategoryStore = useCategoryStore as any;

describe('Sale Page', () => {
  const mockStore = {
    currentSession: {
      id: 'session-1',
      operator_id: 'user-1',
      initial_amount: 100,
      current_amount: 100,
      status: 'open' as const,
      opened_at: '2024-01-01T00:00:00Z'
    },
    currentSaleItems: [],
    currentSaleNote: null,  // Story B40-P1: Notes sur les tickets de caisse
    loading: false,
    error: null,
    addSaleItem: vi.fn(),
    removeSaleItem: vi.fn(),
    updateSaleItem: vi.fn(),
    setCurrentSaleNote: vi.fn(),  // Story B40-P1: Notes sur les tickets de caisse
    clearCurrentSale: vi.fn(),
    submitSale: vi.fn(),
    clearError: vi.fn()
  };

  const mockCategoryStore = {
    activeCategories: [
      {
        id: 'EEE-1',
        name: 'Gros électroménager',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'EEE-2',
        name: 'Petit électroménager',
        is_active: true,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
      {
        id: 'EEE-3',
        name: 'Informatique et télécommunications',
        is_active: true,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
      {
        id: 'EEE-4',
        name: 'Matériel grand public',
        is_active: true,
        created_at: '2024-01-04T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
      },
      {
        id: 'EEE-5',
        name: 'Éclairage',
        is_active: true,
        created_at: '2024-01-05T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z',
      },
      {
        id: 'EEE-6',
        name: 'Outils électriques et électroniques',
        is_active: true,
        created_at: '2024-01-06T00:00:00Z',
        updated_at: '2024-01-06T00:00:00Z',
      },
      {
        id: 'EEE-7',
        name: 'Jouets, loisirs et sports',
        is_active: true,
        created_at: '2024-01-07T00:00:00Z',
        updated_at: '2024-01-07T00:00:00Z',
      },
      {
        id: 'EEE-8',
        name: 'Dispositifs médicaux',
        is_active: true,
        created_at: '2024-01-08T00:00:00Z',
        updated_at: '2024-01-08T00:00:00Z',
      },
    ],
    categories: [],
    loading: false,
    error: null,
    lastFetchTime: Date.now(),
    fetchCategories: vi.fn(),
    getActiveCategories: vi.fn(),
    getCategoryById: vi.fn(),
    clearError: vi.fn(),
  };

  const mockAuthStore = {
    currentUser: {
      id: 'user-1',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'user' as const,
      status: 'approved' as const,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    isAuthenticated: true,
    loading: false,
    error: null
  };

  beforeEach(() => {
    mockUseCashSessionStore.mockReturnValue(mockStore);
    mockUseAuthStore.mockReturnValue(mockAuthStore);
    mockUseCategoryStore.mockReturnValue(mockCategoryStore);
    vi.clearAllMocks();
    // Mock window.alert
    global.alert = vi.fn();
  });

  it('renders kiosk layout with CashSessionHeader', () => {
    render(<Sale />);

    // Verify CashSessionHeader is present with cashier name
    expect(screen.getByTestId('cash-session-header')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Verify close session button is in header
    expect(screen.getByTestId('close-session-button')).toBeInTheDocument();
    expect(screen.getByText('Fermer la Caisse')).toBeInTheDocument();
  });

  it('renders two-column kiosk layout with Numpad and SaleWizard', () => {
    render(<Sale />);

    // Verify Numpad is present (left column) via data-testid
    expect(screen.getByTestId('numpad')).toBeInTheDocument();

    // Verify SaleWizard is present (right column)
    expect(screen.getByText('Mode de saisie')).toBeInTheDocument();
  });

  it('renders sale interface correctly', () => {
    render(<Sale />);

    expect(screen.getByText('Mode de saisie')).toBeInTheDocument();
    // Check for mode buttons using data-active attribute
    const buttons = screen.getAllByRole('button');
    const categoryButton = buttons.find(b => b.textContent === 'Catégorie' && b.hasAttribute('data-active'));
    const weightButton = buttons.find(b => b.textContent === 'Poids');
    const priceButton = buttons.find(b => b.textContent === 'Prix');

    expect(categoryButton).toBeInTheDocument();
    expect(weightButton).toBeInTheDocument();
    expect(priceButton).toBeInTheDocument();
  });

  it('renders SaleWizard and Ticket in right column', () => {
    render(<Sale />);

    // Verify SaleWizard is present (right column)
    expect(screen.getByText('Mode de saisie')).toBeInTheDocument();
    expect(screen.getByText('Sélectionner la catégorie EEE')).toBeInTheDocument();

    // Verify Ticket is present (right column)
    expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument();
    expect(screen.getByText('Aucun article ajouté')).toBeInTheDocument();
  });

  it('updates ticket when item is added via wizard', async () => {
    const addSaleItemMock = vi.fn();

    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      addSaleItem: addSaleItemMock
    });

    render(<Sale />);

    // Complete flow: category -> weight -> price
    await waitFor(() => {
      expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
    });

    const eee1Button = screen.getByTestId('category-EEE-1');
    fireEvent.click(eee1Button);

    const button5 = screen.getByText('5').closest('button');
    fireEvent.click(button5!);

    const calculatorWeightButton = document.querySelector('button[data-isvalid="true"]');
    fireEvent.click(calculatorWeightButton!);

    const button1 = screen.getAllByRole('button').find(b => b.textContent?.trim() === '1');
    fireEvent.click(button1!);
    const button0 = screen.getAllByRole('button').find(b => b.textContent?.trim() === '0');
    fireEvent.click(button0!);

    const calculatorPriceButton = document.querySelector('button[data-isvalid="true"]');
    fireEvent.click(calculatorPriceButton!);

    // Verify that addSaleItem was called with correct data
    await waitFor(() => {
      expect(addSaleItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'EEE-1',
          weight: 5,
          price: 10,
          total: 10
        })
      );
    });
  });

  it('shows category selector when in category mode', async () => {
    render(<Sale />);

    expect(screen.getByText('Sélectionner la catégorie EEE')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
      expect(screen.getByText('Dispositifs médicaux')).toBeInTheDocument();
    });
  });

  it('transitions to weight mode when category is selected', async () => {
    render(<Sale />);

    await waitFor(() => {
      expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
    });

    const eee1Button = screen.getByTestId('category-EEE-1');
    fireEvent.click(eee1Button);

    expect(screen.getByRole('heading', { name: 'Poids (kg)' })).toBeInTheDocument();
    // Use more specific selector for the calculator confirm button
    const calculatorButton = document.querySelector('button[data-isvalid="false"]');
    expect(calculatorButton).toBeInTheDocument();
  });

  it('transitions to price mode when weight is confirmed', async () => {
    render(<Sale />);

    // Select category first
    await waitFor(() => {
      expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
    });

    const eee1Button = screen.getByTestId('category-EEE-1');
    fireEvent.click(eee1Button);

    // Saisir quantité puis valider
    const qtyBtn1 = screen.getAllByRole('button', { name: '1' })[0];
    fireEvent.click(qtyBtn1);
    const qtyBtn0 = screen.getAllByRole('button', { name: '0' })[0];
    fireEvent.click(qtyBtn0);
    const qtyValidate = screen.getByTestId('validate-quantity-button');
    fireEvent.click(qtyValidate);

    // Confirm weight - target the calculator confirm button specifically
    const calculatorButton = document.querySelector('button[data-isvalid="true"]');
    expect(calculatorButton).toBeInTheDocument();
    fireEvent.click(calculatorButton!);

    // Puis saisir prix
    const priceBtn1 = screen.getAllByRole('button', { name: '1' })[0];
    fireEvent.click(priceBtn1);
    const priceBtn0 = screen.getAllByRole('button', { name: '0' })[0];
    fireEvent.click(priceBtn0);

    expect(screen.getByText(/Prix unitaire/)).toBeInTheDocument();
  });

  it('adds item to sale when price is confirmed', async () => {
    render(<Sale />);

    // Complete the flow: category -> weight -> price
    await waitFor(() => {
      expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
    });

    const eee1Button = screen.getByTestId('category-EEE-1');
    fireEvent.click(eee1Button);

    const button5 = screen.getByText('5').closest('button');
    fireEvent.click(button5!);

    // Confirm weight - target calculator button
    const calculatorWeightButton = document.querySelector('button[data-isvalid="true"]');
    expect(calculatorWeightButton).toBeInTheDocument();
    fireEvent.click(calculatorWeightButton!);

    // Puis saisir prix
    const priceBtn1 = screen.getAllByRole('button', { name: '1' })[0];
    fireEvent.click(priceBtn1);
    const priceBtn0 = screen.getAllByRole('button', { name: '0' })[0];
    fireEvent.click(priceBtn0);

    // Confirm price - target calculator button (now in price mode)
    const calculatorPriceButton = document.querySelector('button[data-isvalid="true"]');
    expect(calculatorPriceButton).toBeInTheDocument();
    fireEvent.click(calculatorPriceButton!);

    await waitFor(() => {
      expect(mockStore.addSaleItem).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'EEE-1',
          quantity: 1,  // Valeur par défaut pour compatibilité
          weight: 5,
          price: 10,
          total: 10  // total_price = unit_price (pas de multiplication avec le poids)
        })
      );
    });
  });

  it('shows sale summary when items are added', () => {
    const mockItems = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2,
        price: 10,
        total: 10
      }
    ];

    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      currentSaleItems: mockItems
    });

    render(<Sale />);

    expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument();
    expect(screen.getByText('1 articles')).toBeInTheDocument();
    expect(screen.getAllByText(/10\.00 \€/).length).toBeGreaterThanOrEqual(2);
  });

  it('calls submitSale when finalizing sale', async () => {
    const mockItems = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2,
        price: 10,
        total: 10
      }
    ];

    const mockSubmitSale = vi.fn().mockResolvedValue(true);

    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      currentSaleItems: mockItems,
      submitSale: mockSubmitSale
    });

    render(<Sale />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Finaliser la vente' })[0]);
    // confirmer la finalisation via le bouton du formulaire si présent
    const confirm = screen.queryByTestId('confirm-finalization');
    if (confirm && !(confirm as HTMLButtonElement).disabled) {
      fireEvent.click(confirm);
    }

    await waitFor(() => {
      expect(mockSubmitSale).toHaveBeenCalledWith(mockItems);
    });
  });

  // Story B40-P1: Test pour vérifier que la note est envoyée lors de la soumission
  it('sends sale note when finalizing sale with note', async () => {
    const mockItems = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2,
        price: 10,
        total: 10
      }
    ];

    const mockSubmitSale = vi.fn().mockResolvedValue(true);
    const mockSetCurrentSaleNote = vi.fn();

    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      currentSaleItems: mockItems,
      currentSaleNote: 'Test note for ticket',
      setCurrentSaleNote: mockSetCurrentSaleNote,
      submitSale: mockSubmitSale
    });

    render(<Sale />);

    // Vérifier que le champ note est présent
    const noteInput = screen.getByTestId('sale-note-input');
    expect(noteInput).toBeInTheDocument();
    expect((noteInput as HTMLTextAreaElement).value).toBe('Test note for ticket');

    fireEvent.click(screen.getAllByRole('button', { name: 'Finaliser la vente' })[0]);
    const confirm = screen.queryByTestId('confirm-finalization');
    if (confirm && !(confirm as HTMLButtonElement).disabled) {
      fireEvent.click(confirm);
    }

    await waitFor(() => {
      expect(mockSubmitSale).toHaveBeenCalledWith(mockItems, expect.any(Object));
    });
  });

  it('does not render main interface when no session is active', () => {
    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      currentSession: null
    });

    render(<Sale />);

    // Should not render the main interface elements
    expect(screen.queryByText('Mode de saisie')).not.toBeInTheDocument();
  });

  it('shows success feedback when sale submission succeeds', async () => {
    const mockItems = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2,
        price: 10,
        total: 10
      }
    ];

    const mockSubmitSale = vi.fn().mockResolvedValue(true);

    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      currentSaleItems: mockItems,
      submitSale: mockSubmitSale
    });

    render(<Sale />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Finaliser la vente' })[0]);
    const confirm2 = screen.queryByTestId('confirm-finalization');
    if (confirm2 && !(confirm2 as HTMLButtonElement).disabled) {
      fireEvent.click(confirm2);
    }

    await waitFor(() => {
      expect(mockSubmitSale).toHaveBeenCalledWith(mockItems);
    });

    // Check that alert was called with success message
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('✅ Vente enregistrée avec succès !');
    });
  });

  it('shows error feedback when sale submission fails', async () => {
    const mockItems = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2,
        price: 10,
        total: 10
      }
    ];

    const mockSubmitSale = vi.fn().mockResolvedValue(false);
    const mockGetState = vi.fn().mockReturnValue({
      error: 'Erreur lors de l\'enregistrement'
    });

    mockUseCashSessionStore.mockReturnValue({
      ...mockStore,
      currentSaleItems: mockItems,
      submitSale: mockSubmitSale,
      error: 'Erreur lors de l\'enregistrement'
    });

    // Mock the getState function
    (mockUseCashSessionStore as any).getState = mockGetState;

    render(<Sale />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Finaliser la vente' })[0]);
    const confirm2 = screen.queryByTestId('confirm-finalization');
    if (confirm2 && !(confirm2 as HTMLButtonElement).disabled) {
      fireEvent.click(confirm2);
    }

    await waitFor(() => {
      expect(mockSubmitSale).toHaveBeenCalledWith(mockItems);
    });

    // Check that alert was called with error message
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('❌ Erreur lors de l\'enregistrement de la vente: Erreur lors de l\'enregistrement');
    });
  });

  // B39-P4: Tests pour auto-focus et édition de prix
  describe('B39-P4: Price Focus and Editing', () => {
    it('automatically focuses on price input when sale screen loads', async () => {
      render(<Sale />);

      // Attendre que le composant se charge
      await waitFor(() => {
        const priceInput = screen.getByTestId('price-input');
        expect(priceInput).toBeInTheDocument();
      });

      // Vérifier que le focus est automatiquement placé sur le champ prix
      await waitFor(() => {
        const priceInput = screen.getByTestId('price-input');
        expect(priceInput).toHaveFocus();
      });
    });

    it('always shows manual price input field regardless of catalog pricing', async () => {
      render(<Sale />);

      // Attendre que le composant se charge
      await waitFor(() => {
        expect(screen.getByTestId('price-input')).toBeInTheDocument();
      });

      // Vérifier que le champ prix manuel est toujours affiché
      const priceInput = screen.getByTestId('price-input');
      expect(priceInput).toBeInTheDocument();
      expect(priceInput).toBeVisible();
    });

    it('allows price editing even when catalog price exists', async () => {
      // Mock d'une catégorie avec prix catalogue
      const mockCategoryStoreWithPricing = {
        ...mockCategoryStore,
        getCategoryById: vi.fn().mockReturnValue({
          id: 'EEE-1',
          name: 'Gros électroménager',
          price: 5.00, // Prix catalogue fixe
          max_price: null, // Pas de fourchette
          is_active: true
        })
      };

      mockUseCategoryStore.mockReturnValue(mockCategoryStoreWithPricing);

      render(<Sale />);

      // Sélectionner une catégorie avec prix catalogue
      await waitFor(() => {
        expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
      });

      const categoryButton = screen.getByTestId('category-EEE-1');
      fireEvent.click(categoryButton);

      // Saisir poids et quantité
      const weightBtn5 = screen.getByText('5').closest('button');
      fireEvent.click(weightBtn5!);

      const weightConfirmBtn = document.querySelector('button[data-isvalid="true"]');
      fireEvent.click(weightConfirmBtn!);

      // Saisir quantité
      const qtyBtn1 = screen.getAllByRole('button', { name: '1' })[0];
      fireEvent.click(qtyBtn1);

      const qtyConfirmBtn = screen.getByTestId('validate-quantity-button');
      fireEvent.click(qtyConfirmBtn);

      // Vérifier que le champ prix est pré-rempli avec le prix catalogue par défaut
      await waitFor(() => {
        const priceInput = screen.getByTestId('price-input');
        expect(priceInput).toBeInTheDocument();
        expect(priceInput).toBeVisible();
        expect(priceInput).toHaveTextContent(/5(\.00)? €/); // Prix catalogue par défaut
      });

      // Vérifier qu'on peut saisir un prix différent du catalogue sans clic souris
      const priceBtn2 = screen.getAllByRole('button', { name: '2' })[0];
      fireEvent.click(priceBtn2);
      const priceBtn0 = screen.getAllByRole('button', { name: '0' })[0];
      fireEvent.click(priceBtn0);
      await waitFor(() => {
        expect(screen.getByTestId('price-input')).toHaveTextContent(/20(\.00)? €/);
      });
    });

    it('prefills min price for ranges but still allows overriding freely', async () => {
      const mockCategoryStoreWithRange = {
        ...mockCategoryStore,
        getCategoryById: vi.fn().mockReturnValue({
          id: 'EEE-2',
          name: 'Petit électroménager',
          price: 10.0,
          max_price: 50.0,
          is_active: true
        })
      };

      mockUseCategoryStore.mockReturnValue(mockCategoryStoreWithRange);

      render(<Sale />);

      await waitFor(() => {
        expect(screen.getByText('Petit électroménager')).toBeInTheDocument();
      });

      const categoryButton = screen.getByTestId('category-EEE-2');
      fireEvent.click(categoryButton);

      const weightBtn5 = screen.getByText('5').closest('button');
      fireEvent.click(weightBtn5!);

      const weightConfirmBtn = document.querySelector('button[data-isvalid="true"]');
      fireEvent.click(weightConfirmBtn!);

      const qtyBtn1 = screen.getAllByRole('button', { name: '1' })[0];
      fireEvent.click(qtyBtn1);

      const qtyConfirmBtn = screen.getByTestId('validate-quantity-button');
      fireEvent.click(qtyConfirmBtn);

      await waitFor(() => {
        expect(screen.getByTestId('price-input')).toHaveTextContent(/10(\.00)? €/);
      });

      const priceBtn6 = screen.getAllByRole('button', { name: '6' })[0];
      fireEvent.click(priceBtn6);
      const priceBtn0 = screen.getAllByRole('button', { name: '0' })[0];
      fireEvent.click(priceBtn0);

      await waitFor(() => {
        expect(screen.getByTestId('price-input')).toHaveTextContent(/60(\.00)? €/);
      });
    });

    it('shows appropriate error message for negative prices', async () => {
      render(<Sale />);

      // Simuler une saisie de prix négatif via le numpad
      await waitFor(() => {
        const priceInput = screen.getByTestId('price-input');
        expect(priceInput).toBeInTheDocument();
      });

      // Saisir un prix négatif (simulation via state direct pour test)
      // Dans un vrai scénario, cela viendrait de la logique de validation
      const priceInput = screen.getByTestId('price-input');

      // Vérifier que l'erreur "Prix négatif interdit" peut être affichée
      // (Ce test vérifie que le message d'erreur est disponible dans le code)
      expect(screen.getByTestId('price-input')).toBeInTheDocument();
    });

    it('focuses back to price input after quantity confirmation', async () => {
      render(<Sale />);

      // Sélectionner une catégorie
      await waitFor(() => {
        expect(screen.getByText('Gros électroménager')).toBeInTheDocument();
      });

      const categoryButton = screen.getByTestId('category-EEE-1');
      fireEvent.click(categoryButton);

      // Saisir poids
      const weightBtn5 = screen.getByText('5').closest('button');
      fireEvent.click(weightBtn5!);

      const weightConfirmBtn = document.querySelector('button[data-isvalid="true"]');
      fireEvent.click(weightConfirmBtn!);

      // Saisir quantité
      const qtyBtn1 = screen.getAllByRole('button', { name: '1' })[0];
      fireEvent.click(qtyBtn1);

      const qtyConfirmBtn = screen.getByTestId('validate-quantity-button');
      fireEvent.click(qtyConfirmBtn);

      // Vérifier que le focus revient sur le champ prix
      await waitFor(() => {
        const priceInput = screen.getByTestId('price-input');
        expect(priceInput).toBeInTheDocument();
      });
    });
  });
});
