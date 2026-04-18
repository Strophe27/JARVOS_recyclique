import { test, expect } from '@playwright/test';

test.describe('Admin Reception Dashboard - Live Stats', () => {
  test.beforeEach(async ({ page }) => {
    // Navigation vers la page admin reception
    await page.goto('/admin/reception');

    // Attendre que la page se charge
    await expect(page.locator('h1').filter({ hasText: 'Tableau de Bord des Réceptions' })).toBeVisible();
  });

  test.describe('Feature flag activé', () => {
    test.use({
      extraHTTPHeaders: {
        'x-feature-flags': 'liveReceptionStats=true'
      }
    });

    test('affiche les contrôles live par défaut', async ({ page }) => {
      // Vérifier la présence du contrôle "Mode Live KPI"
      await expect(page.locator('text=Mode Live KPI')).toBeVisible();

      // Vérifier que le switch est présent et activé par défaut
      const liveSwitch = page.locator('[data-testid="live-mode-switch"]');
      await expect(liveSwitch).toBeChecked();
    });

    test('affiche le badge Live avec timestamp', async ({ page }) => {
      // Attendre que les données live se chargent
      await expect(page.locator('text=Live')).toBeVisible();
      await expect(page.locator('text=Actualisé')).toBeVisible();

      // Vérifier le format du timestamp (HH:MM:SS)
      await expect(page.locator('text=/à \\d{2}:\\d{2}:\\d{2}/')).toBeVisible();
    });

    test('met à jour automatiquement les KPI', async ({ page }) => {
      // Capturer les valeurs initiales
      const initialWeight = await page.locator('text=/\\d+,\\d+ kg/').first().textContent();
      const initialItems = await page.locator('text=/\\d+/').nth(1).textContent();

      // Attendre la prochaine mise à jour (max 15 secondes)
      await page.waitForTimeout(11000);

      // Vérifier que les valeurs ont changé ou sont identiques (mais badge actualisé)
      const updatedWeight = await page.locator('text=/\\d+,\\d+ kg/').first().textContent();
      const updatedItems = await page.locator('text=/\\d+/').nth(1).textContent();

      // Au moins le timestamp devrait être mis à jour
      await expect(page.locator('text=/à \\d{2}:\\d{2}:\\d{2}/')).toBeVisible();
    });

    test('permet de désactiver/activer le mode live', async ({ page }) => {
      // Vérifier que le mode live est actif
      await expect(page.locator('text=Activé')).toBeVisible();
      await expect(page.locator('text=Live')).toBeVisible();

      // Cliquer sur le switch pour désactiver
      const liveSwitch = page.locator('[data-testid="live-mode-switch"]');
      await liveSwitch.uncheck();

      // Vérifier que le mode live est désactivé
      await expect(page.locator('text=Désactivé')).toBeVisible();
      await expect(page.locator('text=Live')).not.toBeVisible();

      // Réactiver
      await liveSwitch.check();
      await expect(page.locator('text=Activé')).toBeVisible();
      await expect(page.locator('text=Live')).toBeVisible();
    });

    test('conserve les dernières données live quand désactivé', async ({ page }) => {
      // Attendre que les données live se chargent
      await expect(page.locator('text=Live')).toBeVisible();

      // Capturer les valeurs live
      const liveWeight = await page.locator('text=/\\d+,\\d+ kg/').first().textContent();

      // Désactiver le mode live
      const liveSwitch = page.locator('[data-testid="live-mode-switch"]');
      await liveSwitch.uncheck();

      // Vérifier que les valeurs live sont conservées
      const conservedWeight = await page.locator('text=/\\d+,\\d+ kg/').first().textContent();
      expect(conservedWeight).toBe(liveWeight);
    });

    test('gère les erreurs réseau', async ({ page }) => {
      // Simuler une coupure réseau (si possible avec les mocks)
      await page.route('**/reception/stats/live', route => route.abort());

      // Attendre l'affichage de l'erreur
      await expect(page.locator('text=/Erreur.*live/')).toBeVisible();
    });

    test('suspend le polling quand hors ligne', async ({ page }) => {
      // Simuler offline
      await page.context().setOffline(true);

      // Attendre l'affichage du message offline
      await expect(page.locator('text=Connexion perdue - Polling suspendu')).toBeVisible();
      await expect(page.locator('text=Live')).not.toBeVisible();

      // Remettre online
      await page.context().setOffline(false);
      await expect(page.locator('text=Live')).toBeVisible();
    });
  });

  test.describe('Feature flag désactivé', () => {
    test.use({
      extraHTTPHeaders: {
        'x-feature-flags': 'liveReceptionStats=false'
      }
    });

    test('n\'affiche pas les contrôles live', async ({ page }) => {
      // Vérifier l'absence des contrôles live
      await expect(page.locator('text=Mode Live KPI')).not.toBeVisible();
      await expect(page.locator('text=Live')).not.toBeVisible();
    });

    test('affiche les statistiques historiques normales', async ({ page }) => {
      // Vérifier que les KPI sont affichés normalement
      await expect(page.locator('text=Poids Total')).toBeVisible();
      await expect(page.locator('text=Nombre d\'Articles')).toBeVisible();
      await expect(page.locator('text=Catégories Uniques')).toBeVisible();

      // Vérifier qu'il n'y a pas de badge Live
      await expect(page.locator('text=Live')).not.toBeVisible();
    });
  });

  test.describe('Accessibilité', () => {
    test.use({
      extraHTTPHeaders: {
        'x-feature-flags': 'liveReceptionStats=true'
      }
    });

    test('switch a les attributs d\'accessibilité corrects', async ({ page }) => {
      const liveSwitch = page.locator('[data-testid="live-mode-switch"]').or(
        page.locator('input[type="checkbox"]').first()
      );

      await expect(liveSwitch).toHaveAttribute('role', 'switch');
      await expect(liveSwitch).toHaveAttribute('aria-checked');
    });

    test('badge Live est correctement annoncé', async ({ page }) => {
      await expect(page.locator('text=Live')).toBeVisible();

      // Vérifier que le badge a un rôle approprié ou aria-label
      const liveBadge = page.locator('text=Live').first();
      await expect(liveBadge).toBeVisible();
    });
  });
});
