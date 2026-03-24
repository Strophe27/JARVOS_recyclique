import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Ticket from '../Ticket';
import { SaleItem } from '../../../stores/interfaces/ICashSessionStore';

// B50-P10: Mock useCashStores pour les tests
vi.mock('../../../providers/CashStoreProvider', () => ({
  useCashStores: () => ({
    cashSessionStore: {
      currentRegisterOptions: null,
      currentSession: null,
      currentSaleItems: [],
      loading: false,
      error: null
    },
    categoryStore: {},
    presetStore: {},
    isVirtualMode: false,
    isDeferredMode: false
  })
}));

// Mock useCashWizardStepState pour les tests
vi.mock('../../../hooks/useCashWizardStepState', () => ({
  useCashWizardStepState: () => ({
    stepState: {
      currentStep: 'category',
      categoryState: 'active',
      subcategoryState: 'inactive',
      weightState: 'inactive',
      quantityState: 'inactive',
      priceState: 'inactive'
    }
  })
}));

// Mock des fonctions
const mockOnRemoveItem = vi.fn();
const mockOnUpdateItem = vi.fn();
const mockOnFinalizeSale = vi.fn();
const mockOnSaleNoteChange = vi.fn();

describe('Ticket Component', () => {
  const mockItems: SaleItem[] = [
    {
      id: '1',
      category: 'EEE-3',
      quantity: 1,
      weight: 2.5,
      price: 15.0,
      total: 15.0
    },
    {
      id: '2',
      category: 'EEE-4',
      quantity: 1,
      weight: 1.2,
      price: 8.5,
      total: 8.5
    }
  ];

  it('should render ticket with items correctly', () => {
    render(
      <Ticket
        items={mockItems}
        onRemoveItem={mockOnRemoveItem}
        onUpdateItem={mockOnUpdateItem}
        onFinalizeSale={mockOnFinalizeSale}
      />
    );

    expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument();
    expect(screen.getByText('EEE-3')).toBeInTheDocument();
    expect(screen.getByText('EEE-4')).toBeInTheDocument();
    expect(screen.getByText('2.50 kg')).toBeInTheDocument();
    expect(screen.getByText('1.20 kg')).toBeInTheDocument();
    expect(screen.getByText('15.00 €')).toBeInTheDocument();
    expect(screen.getByText('8.50 €')).toBeInTheDocument();
  });

  it('should handle items with undefined weight and total gracefully', () => {
    const itemsWithUndefined: SaleItem[] = [
      {
        id: '1',
        category: 'EEE-3',
        quantity: 1,
        weight: undefined as any,
        price: 15.0,
        total: undefined as any
      }
    ];

    // Ne devrait pas lever d'erreur
    expect(() => {
      render(
        <Ticket
          items={itemsWithUndefined}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
        />
      );
    }).not.toThrow();

    // Devrait afficher 0.00 pour les valeurs undefined
    expect(screen.getByText('0.00 kg')).toBeInTheDocument();
    expect(screen.getByTestId('sale-total')).toHaveTextContent('0.00 €');
  });

  it('should display empty state when no items', () => {
    render(
      <Ticket
        items={[]}
        onRemoveItem={mockOnRemoveItem}
        onUpdateItem={mockOnUpdateItem}
        onFinalizeSale={mockOnFinalizeSale}
      />
    );

    expect(screen.getByText('Aucun article ajouté')).toBeInTheDocument();
  });

  it('should calculate total amount correctly', () => {
    render(
      <Ticket
        items={mockItems}
        onRemoveItem={mockOnRemoveItem}
        onUpdateItem={mockOnUpdateItem}
        onFinalizeSale={mockOnFinalizeSale}
      />
    );

    // Total attendu: 15.0 + 8.5 = 23.5
    expect(screen.getByText('23.50 €')).toBeInTheDocument();
  });

  it('should handle items with null values gracefully', () => {
    const itemsWithNull: SaleItem[] = [
      {
        id: '1',
        category: 'EEE-3',
        quantity: 1,
        weight: null as any,
        price: 15.0,
        total: null as any
      }
    ];

    expect(() => {
      render(
        <Ticket
          items={itemsWithNull}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('0.00 kg')).toBeInTheDocument();
    expect(screen.getByTestId('sale-total')).toHaveTextContent('0.00 €');
  });

  // Story B40-P1: Tests pour le champ note
  describe('Sale Note Field', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should display note input field when onSaleNoteChange is provided', () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote={null}
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input');
      expect(noteInput).toBeInTheDocument();
      expect(noteInput).toHaveAttribute('placeholder', 'Ajouter une note pour ce ticket...');
    });

    it('should not display note input field when onSaleNoteChange is not provided', () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote="Test note"
        />
      );

      const noteInput = screen.queryByTestId('sale-note-input');
      expect(noteInput).not.toBeInTheDocument();
    });

    it('should call onSaleNoteChange when note is entered', async () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote={null}
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input');
      fireEvent.change(noteInput, { target: { value: 'Test note content' } });

      await waitFor(() => {
        expect(mockOnSaleNoteChange).toHaveBeenCalledWith('Test note content');
      });
    });

    it('should call onSaleNoteChange with null when note is cleared', async () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote="Existing note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input') as HTMLTextAreaElement;
      expect(noteInput.value).toBe('Existing note');

      fireEvent.change(noteInput, { target: { value: '   ' } }); // Whitespace only

      await waitFor(() => {
        expect(mockOnSaleNoteChange).toHaveBeenCalledWith(null);
      });
    });

    it('should display existing note value in input field', () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote="Existing note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input') as HTMLTextAreaElement;
      expect(noteInput.value).toBe('Existing note');
    });

    it('should display note in read-only mode when onSaleNoteChange is not provided', () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote="Read-only note"
        />
      );

      expect(screen.getByText('Read-only note')).toBeInTheDocument();
      expect(screen.getByText(/^Note:/)).toBeInTheDocument();
    });

    it('should not display note section when note is null and onSaleNoteChange is not provided', () => {
      render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote={null}
        />
      );

      expect(screen.queryByText(/^Note:/)).not.toBeInTheDocument();
    });

    it('should persist note during wizard navigation', async () => {
      const { rerender } = render(
        <Ticket
          items={mockItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote="Persistent note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input') as HTMLTextAreaElement;
      expect(noteInput.value).toBe('Persistent note');

      // Simulate adding more items (wizard navigation)
      rerender(
        <Ticket
          items={[...mockItems, {
            id: '3',
            category: 'EEE-5',
            quantity: 1,
            weight: 1.0,
            price: 10.0,
            total: 10.0
          }]}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onFinalizeSale={mockOnFinalizeSale}
          saleNote="Persistent note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      // Note should still be there
      const updatedNoteInput = screen.getByTestId('sale-note-input') as HTMLTextAreaElement;
      expect(updatedNoteInput.value).toBe('Persistent note');
    });
  });
});