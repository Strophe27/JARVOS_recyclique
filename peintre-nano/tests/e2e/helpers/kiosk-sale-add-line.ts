import { fireEvent, screen, waitFor } from '@testing-library/react';

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
  fireEvent.click(screen.getByRole('button', { name: /Continuer vers le prix/i }));
  fireEvent.click(screen.getByTestId('cashflow-add-line'));
}
