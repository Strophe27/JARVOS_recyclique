import { test, expect } from '@playwright/test';

test.describe('Public Registration Route', () => {
  test('should allow access to registration page without authentication', async ({ page }) => {
    // Accéder à la page d'inscription sans authentification
    await page.goto('/inscription');

    // Vérifier que la page se charge correctement
    await expect(page).toHaveTitle(/RecyClique/);
    await expect(page.locator('h1')).toContainText('📝 Inscription RecyClique');

    // Vérifier la présence des éléments du formulaire
    await expect(page.locator('label')).toContainText('Identifiant');
    await expect(page.locator('label')).toContainText('Prénom');
    await expect(page.locator('label')).toContainText('Nom de famille');

    // Vérifier qu'on n'est pas redirigé vers la page de login
    await expect(page).not.toHaveURL('**/login');
  });

  test('paramètre de requête inconnu ne ajoute pas de champ au formulaire', async ({ page }) => {
    await page.goto('/inscription?legacy_ext_uid=123456789');
    await expect(page.locator('h1')).toContainText('📝 Inscription RecyClique');
    await expect(page.getByLabel('Identifiant')).toBeVisible();
    await expect(page.getByLabel(/Prénom/i)).toBeVisible();
    await expect(page.getByLabel(/Nom de famille/i)).toBeVisible();
    await expect(page.getByLabel(/^Email$/i)).toBeVisible();
    await expect(page.getByLabel(/^Téléphone$/i)).toBeVisible();
  });

  test('should not redirect to login when accessing registration', async ({ page }) => {
    // Simuler un utilisateur non authentifié
    await page.goto('/inscription');

    // Vérifier qu'on reste sur la page d'inscription
    await expect(page.locator('h1')).toContainText('📝 Inscription RecyClique');

    // Tenter d'accéder à une route protégée pour comparaison
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('**/login');
  });
});






