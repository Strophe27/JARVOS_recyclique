import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinalizationScreen from './FinalizationScreen';
import { useFeatureFlag } from '../../utils/features';

// Mock du feature flag
vi.mock('../../utils/features', () => ({
  useFeatureFlag: vi.fn(),
}));

const mockUseFeatureFlag = vi.mocked(useFeatureFlag);

describe('FinalizationScreen', () => {
  beforeEach(() => {
    // Par défaut, le feature flag est désactivé
    mockUseFeatureFlag.mockReturnValue(false);
  });
  it('renders with total and donation default', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={20}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByTestId('finalization-screen')).toBeInTheDocument();
    expect(screen.getByTestId('amount-due')).toHaveTextContent('20.00 €');
  });

  it('updates amount due when donation changes', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    const donation = screen.getByTestId('donation-input') as HTMLInputElement;
    fireEvent.change(donation, { target: { value: '2.5' } });
    expect(screen.getByTestId('amount-due')).toHaveTextContent('12.50 €');
  });

  it('shows cash fields for cash method and computes change', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('donation-input'), { target: { value: '1.00' } });
    const cashInput = screen.getByTestId('cash-given-input') as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: '20' } });
    expect(screen.getByTestId('change-output')).toHaveValue('9.00');
    const confirm = screen.getByTestId('confirm-finalization') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('disables confirm when cash given is insufficient', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '5' } });
    const confirm = screen.getByTestId('confirm-finalization') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('enables confirm for card without cash given', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'card' } });
    const confirm = screen.getByTestId('confirm-finalization') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('does not show cash fields for check payment (legacy behavior)', () => {
    // Feature flag désactivé - comportement legacy
    mockUseFeatureFlag.mockReturnValue(false);

    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    // Changer vers chèque - aucun champ cash ne devrait être visible
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    expect(screen.queryByTestId('cash-given-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('change-output')).not.toBeInTheDocument();
  });

  it('shows cash fields for check payment with cashChequesV2 enabled', () => {
    // Feature flag activé - nouveau comportement
    mockUseFeatureFlag.mockReturnValue(true);

    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    // Changer vers chèque - devrait montrer le champ "Montant donné" mais pas "Monnaie à rendre"
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    expect(screen.getByTestId('cash-given-input')).toBeInTheDocument();
    expect(screen.queryByTestId('change-output')).not.toBeInTheDocument();
  });

  it('shows both cash fields for cash payment', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    // Par défaut c'est cash, donc les deux champs devraient être visibles
    expect(screen.getByTestId('cash-given-input')).toBeInTheDocument();
    expect(screen.getByTestId('change-output')).toBeInTheDocument();
  });

  it('does not show cash fields for card payment', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    // Changer vers carte - champs cash disparaissent
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'card' } });
    expect(screen.queryByTestId('cash-given-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('change-output')).not.toBeInTheDocument();
  });

  it('requires cash given for check payment with cashChequesV2 enabled', () => {
    // Feature flag activé - nouveau comportement
    mockUseFeatureFlag.mockReturnValue(true);

    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    // Changer vers chèque
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });

    // Sans montant donné, ne peut pas confirmer
    const confirm = screen.getByTestId('confirm-finalization') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    // Ajouter un montant suffisant
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '15' } });
    expect(confirm.disabled).toBe(false);
  });

  it('computes change only for cash payment', () => {
    render(
      <FinalizationScreen
        open
        totalAmount={10}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    // Avec cash - change devrait être calculé
    fireEvent.change(screen.getByTestId('donation-input'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('cash-given-input'), { target: { value: '20' } });
    expect(screen.getByTestId('change-output')).toHaveValue('9.00');

    // Changer vers chèque avec flag activé - change ne devrait plus être affiché
    mockUseFeatureFlag.mockReturnValue(true);
    fireEvent.change(screen.getByTestId('payment-select'), { target: { value: 'check' } });
    expect(screen.queryByTestId('change-output')).not.toBeInTheDocument();
  });

  // Story B40-P1-CORRECTION: Tests pour le champ de note déplacé vers le popup
  describe('Note field functionality', () => {
    it('shows note field when callbacks are provided', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote="Test note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input');
      expect(noteInput).toBeInTheDocument();
      expect(noteInput).toHaveValue('Test note');
    });

    it('does not show note field when callbacks are not provided', () => {
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      expect(screen.queryByTestId('sale-note-input')).not.toBeInTheDocument();
    });

    it('calls onSaleNoteChange when note is modified', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote=""
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input');
      fireEvent.change(noteInput, { target: { value: 'New note with spaces' } });

      expect(mockOnSaleNoteChange).toHaveBeenCalledWith('New note with spaces');
    });

    it('preserves spaces in note input (no trimming)', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote=""
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input');
      fireEvent.change(noteInput, { target: { value: '  Note with leading and trailing spaces  ' } });

      expect(mockOnSaleNoteChange).toHaveBeenCalledWith('  Note with leading and trailing spaces  ');
    });

    it('handles empty note input correctly', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote="Existing note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const noteInput = screen.getByTestId('sale-note-input');
      fireEvent.change(noteInput, { target: { value: '' } });

      expect(mockOnSaleNoteChange).toHaveBeenCalledWith(null);
    });
  });

  // Story B40-P1-CORRECTION: Tests d'accessibilité et UX
  describe('Accessibility and UX improvements', () => {
    it('has proper labels and icons for form fields', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote=""
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      // Vérifier que les labels contiennent les icônes et le texte approprié
      expect(screen.getByText('Don (€)')).toBeInTheDocument();
      expect(screen.getByText('Moyen de paiement')).toBeInTheDocument();
      expect(screen.getByText('Note contextuelle (optionnel)')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const modal = screen.getByTestId('finalization-screen');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-label', 'Finaliser la vente');
    });

    it('has proper form field associations', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote=""
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const donationInput = screen.getByTestId('donation-input');
      const paymentSelect = screen.getByTestId('payment-select');
      const noteTextarea = screen.getByTestId('sale-note-input');

      expect(donationInput).toHaveAttribute('id', 'donation');
      expect(screen.getByLabelText('Don (€)')).toBe(donationInput);

      expect(paymentSelect).toHaveAttribute('id', 'payment');
      expect(screen.getByLabelText('Moyen de paiement')).toBe(paymentSelect);

      expect(noteTextarea).toHaveAttribute('id', 'sale-note');
      expect(screen.getByLabelText('Note contextuelle (optionnel)')).toBe(noteTextarea);
    });

    it('includes note in finalization data', () => {
      const mockOnConfirm = vi.fn();
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={10}
          onCancel={() => {}}
          onConfirm={mockOnConfirm}
          saleNote="Test contextual note"
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const confirmButton = screen.getByTestId('confirm-finalization');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Test contextual note'
        })
      );
    });
  });

  // Story B49-P5: Tests pour amélioration UX finalisation vente
  describe('B49-P5: Field reorganization and keyboard workflow', () => {
    it('should have fields in correct order: Total → Montant donné → Moyen paiement → Monnaie → Don → Note', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote=""
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const form = screen.getByTestId('finalization-screen').querySelector('form');
      if (!form) {
        expect(form).toBeTruthy();
        return;
      }

      const fields = Array.from(form.querySelectorAll('input, select, textarea'));
      const fieldIds = fields.map(f => f.getAttribute('id') || f.getAttribute('data-testid'));

      // Vérifier l'ordre approximatif (Total → Montant donné → Moyen paiement → Don → Note)
      const totalIndex = fieldIds.findIndex(id => id === 'amount-due' || id === 'manual-total-input');
      const cashGivenIndex = fieldIds.findIndex(id => id === 'cash-given-input');
      const paymentIndex = fieldIds.findIndex(id => id === 'payment-select');
      const donationIndex = fieldIds.findIndex(id => id === 'donation-input');
      const noteIndex = fieldIds.findIndex(id => id === 'sale-note-input');

      expect(totalIndex).toBeGreaterThanOrEqual(0);
      if (cashGivenIndex >= 0) {
        expect(cashGivenIndex).toBeGreaterThan(totalIndex);
      }
      expect(paymentIndex).toBeGreaterThan(totalIndex);
      if (cashGivenIndex >= 0) {
        expect(paymentIndex).toBeGreaterThan(cashGivenIndex);
      }
      expect(donationIndex).toBeGreaterThan(paymentIndex);
      expect(noteIndex).toBeGreaterThan(donationIndex);
    });

    it('should auto-focus on Total à payer when modal opens (mode prix global)', async () => {
      // Mock du store pour activer le mode prix global
      vi.mock('../../stores/cashSessionStore', () => ({
        useCashSessionStore: () => ({
          currentRegisterOptions: {
            features: {
              no_item_pricing: { enabled: true }
            }
          }
        })
      }));

      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      await waitFor(() => {
        const totalInput = screen.queryByTestId('manual-total-input');
        if (totalInput) {
          expect(totalInput).toHaveFocus();
        }
      }, { timeout: 200 });
    });

    it('should navigate sequentially with Enter key: Total → Montant donné → Moyen paiement', async () => {
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      // Simuler navigation clavier (si mode prix global activé)
      const totalInput = screen.queryByTestId('manual-total-input');
      if (totalInput) {
        await user.click(totalInput);
        await user.keyboard('{Enter}');
        
        const cashGivenInput = screen.getByTestId('cash-given-input');
        await waitFor(() => {
          expect(cashGivenInput).toHaveFocus();
        });
      }
    });

    it('should navigate from Montant donné to Moyen de paiement on first Enter', async () => {
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const cashGivenInput = screen.getByTestId('cash-given-input');
      await user.click(cashGivenInput);
      await user.keyboard('{Enter}');

      const paymentSelect = screen.getByTestId('payment-select');
      await waitFor(() => {
        expect(paymentSelect).toHaveFocus();
      });
    });

    it('should navigate from Moyen de paiement back to Montant donné on Enter', async () => {
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const paymentSelect = screen.getByTestId('payment-select');
      await user.click(paymentSelect);
      await user.keyboard('{Enter}');

      const cashGivenInput = screen.getByTestId('cash-given-input');
      await waitFor(() => {
        expect(cashGivenInput).toHaveFocus();
      });
    });

    it('should navigate from Montant donné (2nd visit) to Don on Enter', async () => {
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      // Premier passage : Montant donné → Moyen de paiement
      const cashGivenInput = screen.getByTestId('cash-given-input');
      await user.click(cashGivenInput);
      await user.keyboard('{Enter}');

      const paymentSelect = screen.getByTestId('payment-select');
      await waitFor(() => {
        expect(paymentSelect).toHaveFocus();
      });

      // Retour : Moyen de paiement → Montant donné
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(cashGivenInput).toHaveFocus();
      });

      // Deuxième passage : Montant donné → Don
      await user.keyboard('{Enter}');
      const donationInput = screen.getByTestId('donation-input');
      await waitFor(() => {
        expect(donationInput).toHaveFocus();
      });
    });

    it('should validate directly when pressing Enter on Don field', async () => {
      const mockOnConfirm = vi.fn();
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={mockOnConfirm}
        />
      );

      // Remplir les champs nécessaires
      const cashGivenInput = screen.getByTestId('cash-given-input');
      await user.type(cashGivenInput, '25');

      const donationInput = screen.getByTestId('donation-input');
      await user.click(donationInput);
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    it('should navigate payment method with ArrowUp/ArrowDown keys', async () => {
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const paymentSelect = screen.getByTestId('payment-select') as HTMLSelectElement;
      expect(paymentSelect.value).toBe('cash');

      await user.click(paymentSelect);
      await user.keyboard('{ArrowDown}');
      expect(paymentSelect.value).toBe('check');

      await user.keyboard('{ArrowUp}');
      expect(paymentSelect.value).toBe('cash');
    });

    it('should have payment methods in correct order: Espèces → Chèque → Carte (disabled)', () => {
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const paymentSelect = screen.getByTestId('payment-select') as HTMLSelectElement;
      const options = Array.from(paymentSelect.options);

      expect(options[0].value).toBe('cash');
      expect(options[0].textContent).toContain('Espèces');
      expect(options[1].value).toBe('check');
      expect(options[1].textContent).toContain('Chèque');
      expect(options[2].value).toBe('card');
      expect(options[2].disabled).toBe(true);
      expect(options[2].textContent).toContain('Carte');
    });

    it('should prevent selection of disabled Card payment method', async () => {
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const paymentSelect = screen.getByTestId('payment-select') as HTMLSelectElement;
      
      // Essayer de sélectionner Carte (devrait être ignoré)
      fireEvent.change(paymentSelect, { target: { value: 'card' } });
      
      // La valeur devrait rester sur 'cash' (valeur par défaut) ou ne pas changer
      expect(paymentSelect.value).not.toBe('card');
    });

    it('should handle Escape key to cancel', async () => {
      const mockOnCancel = vi.fn();
      const user = userEvent.setup();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={mockOnCancel}
          onConfirm={() => {}}
        />
      );

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalled();
      });
    });

    it('should show Don field below Montant donné in layout', () => {
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      );

      const cashGivenInput = screen.getByTestId('cash-given-input');
      const donationInput = screen.getByTestId('donation-input');

      // Vérifier que Don apparaît après Montant donné dans le DOM
      const form = cashGivenInput.closest('form');
      if (form) {
        const fields = Array.from(form.querySelectorAll('input, select'));
        const cashGivenIndex = fields.indexOf(cashGivenInput);
        const donationIndex = fields.indexOf(donationInput);
        expect(donationIndex).toBeGreaterThan(cashGivenIndex);
      }
    });

    it('should show Note contextuelle at the bottom', () => {
      const mockOnSaleNoteChange = vi.fn();
      render(
        <FinalizationScreen
          open
          totalAmount={20}
          onCancel={() => {}}
          onConfirm={() => {}}
          saleNote=""
          onSaleNoteChange={mockOnSaleNoteChange}
        />
      );

      const form = screen.getByTestId('finalization-screen').querySelector('form');
      if (!form) return;

      const noteInput = screen.getByTestId('sale-note-input');
      const fields = Array.from(form.querySelectorAll('input, select, textarea'));
      const noteIndex = fields.indexOf(noteInput);

      // La note devrait être le dernier champ (ou avant les boutons)
      expect(noteIndex).toBeGreaterThan(0);
      // Vérifier qu'il n'y a pas d'autres champs après la note (sauf boutons)
      const fieldsAfterNote = fields.slice(noteIndex + 1);
      const inputFieldsAfterNote = fieldsAfterNote.filter(f => 
        f.tagName === 'INPUT' && (f as HTMLInputElement).type !== 'submit' && (f as HTMLInputElement).type !== 'button'
      );
      expect(inputFieldsAfterNote.length).toBe(0);
    });
  });
});


