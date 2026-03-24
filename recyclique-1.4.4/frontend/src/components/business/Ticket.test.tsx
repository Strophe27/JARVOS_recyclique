import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Ticket from './Ticket';

// Mock des stores
vi.mock('../../stores/categoryStore', () => ({
  useCategoryStore: () => ({
    getCategoryById: vi.fn((id) => ({
      id,
      name: `Category ${id}`,
      price: 10,
      max_price: 20
    })),
    fetchCategories: vi.fn()
  })
}));

vi.mock('../../stores/presetStore', () => ({
  usePresetStore: () => ({
    selectedPreset: null,
    notes: '',
    setNotes: vi.fn(),
    presets: []
  })
}));

// Mock des hooks
vi.mock('../../utils/features', () => ({
  useFeatureFlag: vi.fn(() => false)
}));

describe('Ticket Component - Note Display', () => {
  const mockItem = {
    id: '1',
    category: 'cat1',
    subcategory: 'sub1',
    quantity: 2,
    weight: 1.5,
    price: 10,
    total: 20,
    categoryName: 'Test Category',
    subcategoryName: 'Test Subcategory'
  };

  const defaultProps = {
    items: [mockItem],
    onRemoveItem: vi.fn(),
    onUpdateItem: vi.fn(),
    onFinalizeSale: vi.fn(),
    loading: false
  };

  it('does not show note section when no note is provided', () => {
    render(<Ticket {...defaultProps} />);

    expect(screen.queryByText('Note contextuelle:')).not.toBeInTheDocument();
  });

  it('shows note section when note is provided', () => {
    render(<Ticket {...defaultProps} saleNote="This is a test note" />);

    expect(screen.getByText('Note contextuelle:')).toBeInTheDocument();
    expect(screen.getByText('This is a test note')).toBeInTheDocument();
  });

  it('displays note with proper styling', () => {
    render(<Ticket {...defaultProps} saleNote="Test note for styling" />);

    const noteContainer = screen.getByText('Note contextuelle:').closest('div');
    expect(noteContainer).toBeInTheDocument();

    // Vérifier que le conteneur a les bonnes classes de style
    const computedStyle = window.getComputedStyle(noteContainer!);
    expect(computedStyle.backgroundColor).toBe('rgb(255, 243, 205)'); // #fff3cd
    expect(computedStyle.borderLeftColor).toBe('rgb(255, 152, 0)'); // #ff9800
  });

  it('handles empty string note gracefully', () => {
    render(<Ticket {...defaultProps} saleNote="" />);

    expect(screen.queryByText('Note contextuelle:')).not.toBeInTheDocument();
  });

  it('handles null note gracefully', () => {
    render(<Ticket {...defaultProps} saleNote={null} />);

    expect(screen.queryByText('Note contextuelle:')).not.toBeInTheDocument();
  });

  it('displays note with special characters and formatting', () => {
    const noteWithFormatting = "Note with spécial characters: éàù, numbers: 123, symbols: @#$%";
    render(<Ticket {...defaultProps} saleNote={noteWithFormatting} />);

    expect(screen.getByText(`Note contextuelle: ${noteWithFormatting}`)).toBeInTheDocument();
  });

  it('displays long notes properly', () => {
    const longNote = "This is a very long note that should test how the component handles text that might wrap to multiple lines and potentially cause layout issues if not handled properly in the component styling and layout.";
    render(<Ticket {...defaultProps} saleNote={longNote} />);

    expect(screen.getByText(`Note contextuelle: ${longNote}`)).toBeInTheDocument();
  });
});















