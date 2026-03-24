/**
 * Tests E2E pour les filtres avancés (B45-P2)
 * Valide le workflow complet des filtres avancés côté frontend
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:4444';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4433';

const TEST_ADMIN = {
  id: 'admin-test-123',
  username: 'admin_test',
  role: 'admin'
};

test.describe('Filtres Avancés - Sessions de Caisse (B45-P2)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock de l'authentification admin
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_admin_token');
      window.localStorage.setItem('user_data', JSON.stringify(TEST_ADMIN));
    });

    // Mock de la réponse API pour les sessions
    await page.route(`${API_BASE_URL}/v1/cash-sessions/**`, async route => {
      const url = new URL(route.request().url());
      const params = url.searchParams;
      
      // Simuler des sessions filtrées selon les paramètres
      const sessions = [];
      
      // Vérifier les filtres avancés
      const amountMin = params.get('amount_min');
      const amountMax = params.get('amount_max');
      const hasVariance = params.get('variance_has_variance');
      const paymentMethods = params.getAll('payment_methods[]');
      
      // Créer des sessions de test selon les filtres
      if (!amountMin || parseFloat(amountMin) <= 100) {
        sessions.push({
          id: 'session-1',
          operator_id: 'op-1',
          site_id: 'site-1',
          initial_amount: 50.0,
          current_amount: 150.0,
          status: 'closed',
          opened_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T13:00:00Z',
          total_sales: 100.0,
          total_items: 5,
          variance: hasVariance === 'true' ? 5.0 : 0.0,
          number_of_sales: 5,
          total_donations: 10.0
        });
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: sessions,
          total: sessions.length,
          skip: 0,
          limit: 20
        })
      });
    });

    // Mock KPIs
    await page.route(`${API_BASE_URL}/v1/cash-sessions/stats/summary*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_sessions: 1,
          open_sessions: 0,
          closed_sessions: 1,
          total_sales: 100.0,
          total_items: 5,
          number_of_sales: 5,
          total_donations: 10.0,
          total_weight_sold: 0
        })
      });
    });
  });

  test('Peut ouvrir et utiliser les filtres avancés', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/cash-sessions`);
    
    // Attendre que la page se charge
    await page.waitForSelector('h1:has-text("Gestionnaire de Sessions de Caisse")');
    
    // Vérifier que l'accordéon des filtres avancés existe
    const accordion = page.locator('text=Filtres Avancés').first();
    await expect(accordion).toBeVisible();
    
    // Ouvrir l'accordéon
    await accordion.click();
    
    // Vérifier que les champs de filtres avancés sont visibles
    await expect(page.locator('label:has-text("Montant minimum")')).toBeVisible();
    await expect(page.locator('label:has-text("Montant maximum")')).toBeVisible();
    await expect(page.locator('label:has-text("Avec variance")')).toBeVisible();
    await expect(page.locator('label:has-text("Méthodes de paiement")')).toBeVisible();
  });

  test('Peut appliquer des filtres avancés et voir les résultats', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/cash-sessions`);
    
    await page.waitForSelector('h1:has-text("Gestionnaire de Sessions de Caisse")');
    
    // Ouvrir l'accordéon
    await page.locator('text=Filtres Avancés').first().click();
    
    // Remplir les filtres
    await page.fill('input[placeholder="0.00"]:near(label:has-text("Montant minimum"))', '50');
    await page.fill('input[placeholder="0.00"]:near(label:has-text("Montant maximum"))', '200');
    
    // Activer le toggle "Avec variance"
    const varianceToggle = page.locator('label:has-text("Avec variance")').locator('..').locator('input[type="checkbox"]');
    await varianceToggle.check();
    
    // Appliquer les filtres
    await page.click('button:has-text("Appliquer les filtres")');
    
    // Vérifier que l'URL contient les filtres
    await page.waitForTimeout(500); // Attendre la synchronisation URL
    const url = page.url();
    expect(url).toContain('amount_min=50');
    expect(url).toContain('amount_max=200');
    expect(url).toContain('variance_has_variance=true');
  });

  test('Les filtres sont synchronisés avec l\'URL', async ({ page }) => {
    // Charger la page avec des filtres dans l'URL
    await page.goto(`${FRONTEND_URL}/admin/cash-sessions?amount_min=100&amount_max=500&variance_has_variance=true`);
    
    await page.waitForSelector('h1:has-text("Gestionnaire de Sessions de Caisse")');
    
    // Ouvrir l'accordéon
    await page.locator('text=Filtres Avancés').first().click();
    
    // Vérifier que les valeurs sont pré-remplies depuis l'URL
    const amountMinInput = page.locator('input[placeholder="0.00"]:near(label:has-text("Montant minimum"))');
    await expect(amountMinInput).toHaveValue('100');
    
    const amountMaxInput = page.locator('input[placeholder="0.00"]:near(label:has-text("Montant maximum"))');
    await expect(amountMaxInput).toHaveValue('500');
    
    const varianceToggle = page.locator('label:has-text("Avec variance")').locator('..').locator('input[type="checkbox"]');
    await expect(varianceToggle).toBeChecked();
  });
});

test.describe('Filtres Avancés - Tickets de Réception (B45-P2)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock de l'authentification admin
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_admin_token');
      window.localStorage.setItem('user_data', JSON.stringify(TEST_ADMIN));
    });

    // Mock de la réponse API pour les tickets
    await page.route(`${API_BASE_URL}/v1/reception/tickets*`, async route => {
      const url = new URL(route.request().url());
      const params = url.searchParams;
      
      const tickets = [];
      
      // Vérifier les filtres avancés
      const poidsMin = params.get('poids_min');
      const poidsMax = params.get('poids_max');
      const categories = params.getAll('categories[]');
      const destinations = params.getAll('destinations[]');
      const lignesMin = params.get('lignes_min');
      
      // Créer des tickets de test selon les filtres
      if (!poidsMin || parseFloat(poidsMin) <= 30) {
        tickets.push({
          id: 'ticket-1',
          poste_id: 'poste-1',
          benevole_username: 'benevole-1',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          status: 'closed',
          total_lignes: 3,
          total_poids: 30.0
        });
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets,
          total: tickets.length,
          page: 1,
          per_page: 20,
          total_pages: 1
        })
      });
    });

    // Mock des catégories
    await page.route(`${API_BASE_URL}/v1/reception/categories*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-1', name: 'EEE-1' },
          { id: 'cat-2', name: 'EEE-2' },
          { id: 'cat-3', name: 'EEE-3' }
        ])
      });
    });
  });

  test('Peut ouvrir et utiliser les filtres avancés pour les tickets', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/reception-tickets`);
    
    // Attendre que la page se charge
    await page.waitForSelector('h1:has-text("Gestionnaire de Tickets de Réception")');
    
    // Vérifier que l'accordéon des filtres avancés existe
    const accordion = page.locator('text=Filtres Avancés').first();
    await expect(accordion).toBeVisible();
    
    // Ouvrir l'accordéon
    await accordion.click();
    
    // Vérifier que les champs de filtres avancés sont visibles
    await expect(page.locator('label:has-text("Poids minimum")')).toBeVisible();
    await expect(page.locator('label:has-text("Poids maximum")')).toBeVisible();
    await expect(page.locator('label:has-text("Catégories")')).toBeVisible();
    await expect(page.locator('label:has-text("Destinations")')).toBeVisible();
    await expect(page.locator('label:has-text("Nombre minimum de lignes")')).toBeVisible();
  });

  test('Peut appliquer des filtres avancés et voir les résultats', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/reception-tickets`);
    
    await page.waitForSelector('h1:has-text("Gestionnaire de Tickets de Réception")');
    
    // Ouvrir l'accordéon
    await page.locator('text=Filtres Avancés').first().click();
    
    // Remplir les filtres
    await page.fill('input[placeholder="0.00"]:near(label:has-text("Poids minimum"))', '20');
    await page.fill('input[placeholder="0.00"]:near(label:has-text("Poids maximum"))', '50');
    
    // Appliquer les filtres
    await page.click('button:has-text("Appliquer les filtres")');
    
    // Vérifier que l'URL contient les filtres
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('poids_min=20');
    expect(url).toContain('poids_max=50');
  });
});

