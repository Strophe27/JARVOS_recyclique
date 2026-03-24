import { test, expect } from '@playwright/test';

test.describe('Cash Register Tab Order - B39-P2', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Navigate to cash register
    await page.goto('/cash-register');
    await page.waitForSelector('[data-wizard="cash"]');
  });

  test('Tab order follows Reception sequence: category → weight → quantity → price', async ({ page }) => {
    // Vérifier que nous sommes sur l'étape category
    await expect(page.locator('[data-step="category"]')).toBeVisible();
    await expect(page.locator('[data-active="true"][data-step="category"]')).toBeVisible();

    // Simuler sélection d'une catégorie
    const categoryButton = page.locator('[data-testid^="category-"]').first();
    await categoryButton.click();

    // Vérifier passage à l'étape weight
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();

    // Appuyer sur Tab devrait aller à quantity (mais weight n'est pas encore rempli)
    await page.keyboard.press('Tab');
    // Devrait rester sur weight car quantity nécessite un poids
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();

    // Entrer un poids et valider
    await page.fill('[data-testid="weight-input"]', '1.5');
    await page.keyboard.press('Enter');

    // Vérifier passage à quantity
    await expect(page.locator('[data-active="true"][data-step="quantity"]')).toBeVisible();

    // Appuyer sur Tab devrait aller à price
    await page.keyboard.press('Tab');
    // Devrait rester sur quantity car price nécessite une quantité
    await expect(page.locator('[data-active="true"][data-step="quantity"]')).toBeVisible();

    // Entrer une quantité et valider
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.keyboard.press('Enter');

    // Vérifier passage à price
    await expect(page.locator('[data-active="true"][data-step="price"]')).toBeVisible();
  });

  test('Shift+Tab enables reverse navigation through completed steps', async ({ page }) => {
    // Simuler un workflow complet jusqu'à price
    const categoryButton = page.locator('[data-testid^="category-"]').first();
    await categoryButton.click();

    await page.fill('[data-testid="weight-input"]', '1.5');
    await page.keyboard.press('Enter');

    await page.fill('[data-testid="quantity-input"]', '2');
    await page.keyboard.press('Enter');

    // Nous sommes maintenant sur price
    await expect(page.locator('[data-active="true"][data-step="price"]')).toBeVisible();

    // Shift+Tab devrait revenir à quantity
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-active="true"][data-step="quantity"]')).toBeVisible();

    // Shift+Tab devrait revenir à weight
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();

    // Shift+Tab devrait revenir à category
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-active="true"][data-step="category"]')).toBeVisible();

    // Shift+Tab depuis category ne devrait rien faire (début de séquence)
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-active="true"][data-step="category"]')).toBeVisible();
  });

  test('Tab navigation respects prerequisites and prevents invalid transitions', async ({ page }) => {
    // Depuis category, Tab sans sélection de catégorie ne devrait rien faire
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-active="true"][data-step="category"]')).toBeVisible();

    // Sélectionner une catégorie
    const categoryButton = page.locator('[data-testid^="category-"]').first();
    await categoryButton.click();

    // Maintenant Tab devrait aller à weight
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();

    // Depuis weight sans valeur, Tab ne devrait pas avancer
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-active="true"][data-step="weight"]')).toBeVisible();

    // Entrer poids et valider
    await page.fill('[data-testid="weight-input"]', '1.5');
    await page.keyboard.press('Enter');

    // Maintenant Tab devrait aller à quantity
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-active="true"][data-step="quantity"]')).toBeVisible();

    // Depuis quantity sans valeur, Tab ne devrait pas avancer
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-active="true"][data-step="quantity"]')).toBeVisible();
  });

  test('Breadcrumb buttons show correct visual states (active/completed/inactive)', async ({ page }) => {
    // Vérifier état initial : category active, autres inactive
    await expect(page.locator('button[data-active="true"]:has-text("Catégorie")')).toBeVisible();
    await expect(page.locator('button[data-completed="false"]:has-text("Poids")')).toBeVisible();
    await expect(page.locator('button[data-completed="false"]:has-text("Quantité")')).toBeVisible();
    await expect(page.locator('button[data-completed="false"]:has-text("Prix")')).toBeVisible();

    // Après sélection catégorie : category completed, weight active
    const categoryButton = page.locator('[data-testid^="category-"]').first();
    await categoryButton.click();

    await expect(page.locator('button[data-completed="true"]:has-text("Catégorie")')).toBeVisible();
    await expect(page.locator('button[data-active="true"]:has-text("Poids")')).toBeVisible();

    // Après saisie poids : weight completed, quantity active
    await page.fill('[data-testid="weight-input"]', '1.5');
    await page.keyboard.press('Enter');

    await expect(page.locator('button[data-completed="true"]:has-text("Poids")')).toBeVisible();
    await expect(page.locator('button[data-active="true"]:has-text("Quantité")')).toBeVisible();

    // Après saisie quantité : quantity completed, price active
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.keyboard.press('Enter');

    await expect(page.locator('button[data-completed="true"]:has-text("Quantité")')).toBeVisible();
    await expect(page.locator('button[data-active="true"]:has-text("Prix")')).toBeVisible();
  });

  test('Focus management follows tab order sequence', async ({ page }) => {
    // Sélectionner catégorie pour activer weight
    const categoryButton = page.locator('[data-testid^="category-"]').first();
    await categoryButton.click();

    // Vérifier que le focus va sur l'input weight après Tab
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="weight-input"]')).toBeFocused();

    // Après validation weight, focus devrait aller sur quantity
    await page.fill('[data-testid="weight-input"]', '1.5');
    await page.keyboard.press('Enter');

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="quantity-input"]')).toBeFocused();
  });
});
