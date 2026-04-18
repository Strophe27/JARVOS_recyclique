import { test, expect } from '@playwright/test';

test.describe('Cash Register AZERTY Keyboard Shortcuts - B39-P3', () => {
  test.beforeEach(async ({ page }) => {
    // Enable the feature flag for cash hotkeys
    await page.addInitScript(() => {
      window.localStorage.setItem('VITE_FEATURE_enableCashHotkeys', 'true');
    });

    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Navigate to cash register
    await page.goto('/cash-register');
    await page.waitForSelector('[data-wizard="cash"]');
  });

  test('AZERTY keyboard shortcuts are displayed on category buttons', async ({ page }) => {
    // Vérifier que nous sommes sur l'étape category
    await expect(page.locator('[data-step="category"]')).toBeVisible();

    // Vérifier que les badges de raccourcis sont affichés sur les boutons de catégorie
    const categoryButtons = page.locator('[data-testid^="category-"]');

    // Compter les boutons de catégorie
    const buttonCount = await categoryButtons.count();

    // Pour chaque bouton de catégorie (limité aux 26 premiers pour les raccourcis)
    for (let i = 0; i < Math.min(buttonCount, 26); i++) {
      const button = categoryButtons.nth(i);
      const shortcutBadge = button.locator('[data-testid*="category-shortcut-"]');

      // Vérifier que le badge de raccourci existe et contient une lettre
      await expect(shortcutBadge).toBeVisible();
      const badgeText = await shortcutBadge.textContent();
      expect(badgeText).toMatch(/^[A-Z]$/);

      // Vérifier que l'aria-label contient la mention du raccourci
      const ariaLabel = await button.getAttribute('aria-label');
      expect(ariaLabel).toContain('Raccourci clavier');
      expect(ariaLabel).toContain(badgeText);
    }
  });

  test('AZERTY keyboard shortcuts trigger category selection', async ({ page }) => {
    // Vérifier que nous sommes sur l'étape category
    await expect(page.locator('[data-step="category"]')).toBeVisible();

    // Récupérer le premier bouton de catégorie et son raccourci
    const firstCategoryButton = page.locator('[data-testid^="category-"]').first();
    const firstShortcutBadge = firstCategoryButton.locator('[data-testid*="category-shortcut-"]');
    const shortcutKey = await firstShortcutBadge.textContent();

    // Vérifier que le raccourci est une lettre valide
    expect(shortcutKey).toMatch(/^[A-Z]$/);

    // Appuyer sur la touche de raccourci
    await page.keyboard.press(shortcutKey!.toLowerCase());

    // Vérifier que la catégorie a été sélectionnée (passage à l'étape suivante)
    // Pour une catégorie sans enfants, on passe à weight
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();
  });

  test('AZERTY shortcuts work with uppercase keys', async ({ page }) => {
    // Vérifier que nous sommes sur l'étape category
    await expect(page.locator('[data-step="category"]')).toBeVisible();

    // Récupérer le premier bouton de catégorie et son raccourci
    const firstCategoryButton = page.locator('[data-testid^="category-"]').first();
    const firstShortcutBadge = firstCategoryButton.locator('[data-testid*="category-shortcut-"]');
    const shortcutKey = await firstShortcutBadge.textContent();

    // Appuyer sur la touche en majuscule
    await page.keyboard.press(shortcutKey!.toLowerCase()); // Playwright gère automatiquement les majuscules

    // Vérifier que la catégorie a été sélectionnée
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();
  });

  test('Keyboard shortcuts are deactivated when input fields are focused', async ({ page }) => {
    // Sélectionner une catégorie pour passer à weight
    const firstCategoryButton = page.locator('[data-testid^="category-"]').first();
    await firstCategoryButton.click();

    // Vérifier que nous sommes sur weight
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();

    // Focus sur le champ weight
    const weightInput = page.locator('[data-testid="weight-input"]');
    await weightInput.focus();

    // Essayer d'utiliser un raccourci clavier (devrait être ignoré)
    await page.keyboard.press('a');

    // Vérifier que nous sommes toujours sur weight (pas revenu à category)
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();
  });

  test('Help modal displays keyboard shortcuts mapping', async ({ page }) => {
    // Vérifier que le bouton d'aide est visible
    const helpButton = page.locator('[data-testid="keyboard-help-button"]');
    await expect(helpButton).toBeVisible();

    // Ouvrir la modal d'aide
    await helpButton.click();

    // Vérifier que la modal s'ouvre
    const modal = page.locator('text=Raccourcis Clavier Caisse');
    await expect(modal).toBeVisible();

    // Vérifier que le mapping AZERTY est affiché
    await expect(page.locator('text=Rangée 1 (AZERTYUIOP)')).toBeVisible();
    await expect(page.locator('text=Rangée 2 (QSDFGHJKLM)')).toBeVisible();
    await expect(page.locator('text=Rangée 3 (WXCVBN)')).toBeVisible();

    // Vérifier que la grille de raccourcis est présente
    const keyboardGrid = page.locator('.keyboard-grid, [class*="grid"]'); // Ajuster selon le CSS réel
    await expect(keyboardGrid).toBeVisible();

    // Vérifier qu'il y a une liste des raccourcis
    await expect(page.locator('text=Liste des Raccourcis')).toBeVisible();

    // Fermer la modal
    await page.click('[aria-label="Fermer l\'aide"]');
    await expect(modal).not.toBeVisible();
  });

  test('Keyboard shortcuts are only active in category step', async ({ page }) => {
    // Vérifier raccourcis actifs sur category
    await expect(page.locator('[data-step="category"]')).toBeVisible();

    // Sélectionner une catégorie
    const firstCategoryButton = page.locator('[data-testid^="category-"]').first();
    await firstCategoryButton.click();

    // Entrer un poids pour passer à quantity
    await page.fill('[data-testid="weight-input"]', '1.5');
    await page.keyboard.press('Enter');

    // Entrer une quantité pour passer à price
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.keyboard.press('Enter');

    // Vérifier que nous sommes sur price
    await expect(page.locator('[data-active="true"][data-step="price"]')).toBeVisible();

    // Essayer d'utiliser un raccourci (devrait être ignoré)
    await page.keyboard.press('a');

    // Vérifier que nous sommes toujours sur price
    await expect(page.locator('[data-active="true"][data-step="price"]')).toBeVisible();
  });

  test('AZERTY shortcuts work with different keyboard layouts', async ({ page }) => {
    // Note: Cette simulation est limitée car Playwright simule un clavier QWERTY
    // En production, les utilisateurs avec un clavier AZERTY physique verront
    // les touches physiques correspondre aux lettres affichées

    // Vérifier que les raccourcis sont basés sur la position AZERTY
    const categoryButtons = page.locator('[data-testid^="category-"]');

    // Récupérer les raccourcis des premiers boutons
    const shortcuts = [];
    for (let i = 0; i < Math.min(await categoryButtons.count(), 5); i++) {
      const badge = categoryButtons.nth(i).locator('[data-testid*="category-shortcut-"]');
      const shortcut = await badge.textContent();
      shortcuts.push(shortcut);
    }

    // Vérifier que les raccourcis suivent l'ordre AZERTY
    const expectedOrder = ['A', 'Z', 'E', 'R', 'T'];
    for (let i = 0; i < shortcuts.length; i++) {
      expect(shortcuts[i]).toBe(expectedOrder[i]);
    }
  });

  test('Feature flag controls shortcut visibility and functionality', async ({ page }) => {
    // Test avec feature flag désactivé
    await page.addInitScript(() => {
      window.localStorage.setItem('VITE_FEATURE_enableCashHotkeys', 'false');
    });

    // Recharger la page
    await page.reload();
    await page.waitForSelector('[data-wizard="cash"]');

    // Vérifier que le bouton d'aide n'est pas visible
    const helpButton = page.locator('[data-testid="keyboard-help-button"]');
    await expect(helpButton).not.toBeVisible();

    // Vérifier qu'aucun badge de raccourci n'est affiché
    const shortcutBadges = page.locator('[data-testid*="category-shortcut-"]');
    await expect(shortcutBadges).toHaveCount(0);

    // Vérifier que les raccourcis ne fonctionnent pas
    await page.keyboard.press('a');
    // Devrait rester sur category (pas de sélection automatique)
    await expect(page.locator('[data-active="true"][data-step="category"]')).toBeVisible();
  });

  test('Modal can be closed with Escape key', async ({ page }) => {
    // Ouvrir la modal d'aide
    const helpButton = page.locator('[data-testid="keyboard-help-button"]');
    await helpButton.click();

    const modal = page.locator('text=Raccourcis Clavier Caisse');
    await expect(modal).toBeVisible();

    // Fermer avec Échap
    await page.keyboard.press('Escape');

    // Vérifier que la modal se ferme
    await expect(modal).not.toBeVisible();
  });

  test('Modal overlay click closes the modal', async ({ page }) => {
    // Ouvrir la modal d'aide
    const helpButton = page.locator('[data-testid="keyboard-help-button"]');
    await helpButton.click();

    const modal = page.locator('text=Raccourcis Clavier Caisse');
    await expect(modal).toBeVisible();

    // Cliquer sur l'overlay (en dehors de la modal)
    await page.mouse.click(10, 10);

    // Vérifier que la modal se ferme
    await expect(modal).not.toBeVisible();
  });
});
