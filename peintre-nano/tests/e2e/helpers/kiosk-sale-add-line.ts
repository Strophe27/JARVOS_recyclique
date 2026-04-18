import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

function isKioskCategoryTileTestId(testId: string): boolean {
  if (!testId.startsWith('cashflow-kiosk-category-')) return false;
  const excluded = new Set([
    'cashflow-kiosk-category-grid',
    'cashflow-kiosk-category-back',
    'cashflow-kiosk-category-empty',
    'cashflow-kiosk-category-error',
    'cashflow-kiosk-category-loading',
    'cashflow-kiosk-category-manual-fallback',
  ]);
  return !excluded.has(testId);
}

/** Drill racine → sous-catégories jusqu’à une feuille (étape poids visible). */
async function drillToKioskLeafCategory(): Promise<void> {
  for (let depth = 0; depth < 12; depth++) {
    if (screen.queryByTestId('cashflow-kiosk-readonly-category') != null) {
      return;
    }
    await waitFor(() => {
      const pickable = Array.from(document.querySelectorAll('[data-testid]')).filter((el) => {
        const id = el.getAttribute('data-testid') ?? '';
        return isKioskCategoryTileTestId(id);
      });
      if (pickable.length === 0) throw new Error('Aucun bouton catégorie kiosque');
    });
    const candidates = Array.from(document.querySelectorAll('[data-testid]')).filter((el) => {
      const id = el.getAttribute('data-testid') ?? '';
      return isKioskCategoryTileTestId(id);
    }) as HTMLElement[];
    fireEvent.click(candidates[0]!);
  }
  throw new Error('Profondeur grille catégories excessive (feuille non atteinte)');
}

/**
 * Wizard nominal kiosque (`/cash-register/sale`, `sale_kiosk_category_workspace`) :
 * grille (ou secours si vide) → poids → prix → « Ajouter la ligne ».
 */
export async function addOneLineKioskSale(): Promise<void> {
  await waitFor(() => {
    if (screen.queryByTestId('cashflow-kiosk-category-loading') != null) {
      throw new Error('Chargement catégories en cours');
    }
  });
  const manual = screen.queryByTestId('cashflow-kiosk-category-manual-fallback');
  if (manual) {
    fireEvent.click(manual);
  } else {
    await drillToKioskLeafCategory();
  }
  await waitFor(() => {
    screen.getByTestId('cashflow-kiosk-readonly-category');
  });
  /** `commitKioskWeight` ignore un poids vide — saisir au moins un chiffre sur le pavé kiosque. */
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-kiosk-weight-digit-1')).toBeTruthy();
  });
  fireEvent.click(screen.getByTestId('cashflow-kiosk-weight-digit-1'));
  fireEvent.click(screen.getByRole('button', { name: /Continuer vers le prix/i }));
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-add-line')).toBeTruthy();
  });
  fireEvent.click(screen.getByTestId('cashflow-add-line'));
}

/**
 * Après une ligne kiosque : UUID session → modale finalisation → montant reçu (total dû) → « Valider la vente ».
 * Remplace l’ancien enchaînement FlowRenderer (`cashflow-step-next` ×2 + submit direct).
 */
export async function completeKioskSaleSubmission(sessionId: string): Promise<void> {
  fireEvent.change(screen.getByTestId('cashflow-input-session-id'), {
    target: { value: sessionId },
  });
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-submit-sale').hasAttribute('disabled')).toBe(false);
  });
  fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-finalize-amount-received')).toBeTruthy();
  });
  const dueRaw = screen.getByTestId('cashflow-finalize-amount-due').textContent ?? '';
  const m = dueRaw.match(/(\d+(?:[.,]\d+)?)/);
  const dueStr = m ? m[1].replace(',', '.') : '5';
  fireEvent.change(screen.getByTestId('cashflow-finalize-amount-received'), {
    target: { value: dueStr },
  });
  await waitFor(() => {
    expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(false);
  });
  fireEvent.click(screen.getByTestId('cashflow-submit-sale-confirm'));
}

/**
 * Kiosque unifié : rail « prix » → session → modale finalisation → confirmer.
 */
export async function kioskFillSessionOpenFinalizeAndConfirmSale(sessionId: string): Promise<void> {
  fireEvent.click(screen.getByTestId('cashflow-kiosk-micro-price'));
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-input-session-id')).toBeTruthy();
  });
  await completeKioskSaleSubmission(sessionId);
}
