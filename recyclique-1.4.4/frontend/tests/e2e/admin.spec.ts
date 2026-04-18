/**
 * Tests E2E pour l'interface d'administration
 * Valide le workflow complet côté frontend
 */

import { test, expect } from '@playwright/test';

// Configuration de test
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4433';
const FRONTEND_URL = 'http://localhost:4444';

// Données de test
const TEST_ADMIN = {
  id: 'admin-test-123',
  username: 'admin_test',
  role: 'admin'
};

const TEST_USER = {
  id: 'user-test-456',
  username: 'user_test',
  role: 'user'
};

// Utilisateur de test pour la modale d'édition
const TEST_EDIT_USER = {
  id: 'edit-user-123',
  username: 'edit_user',
  first_name: 'Edit',
  last_name: 'User',
  role: 'user',
  status: 'approved',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

test.describe('Interface d\'Administration E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock de l'authentification admin
    await page.addInitScript(() => {
      // Simuler un utilisateur admin connecté
      window.localStorage.setItem('auth_token', 'mock_admin_token');
      window.localStorage.setItem('user_data', JSON.stringify(TEST_ADMIN));
    });
  });

  test('Admin peut accéder à la page de gestion des utilisateurs', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Vérifier que la page se charge
    await expect(page.locator('h1')).toContainText('Gestion des Utilisateurs');
    
    // Vérifier la présence des composants principaux
    await expect(page.locator('[data-testid="user-list-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-selector"]')).toBeVisible();
  });

  test('Admin peut voir la liste des utilisateurs', async ({ page }) => {
    // Mock de la réponse API
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'user-1',
            username: 'user1',
            first_name: 'John',
            last_name: 'Doe',
            role: 'user',
            status: 'approved',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'user-2',
            username: 'user2',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'manager',
            status: 'approved',
            is_active: true,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z'
          }
        ])
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Attendre que les données se chargent
    await page.waitForSelector('[data-testid="user-list-table"]');
    
    // Vérifier que les utilisateurs sont affichés
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount(2);
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
  });

  test('Admin peut modifier le rôle d\'un utilisateur', async ({ page }) => {
    // Mock des réponses API
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'user-1',
            username: 'user1',
            first_name: 'John',
            last_name: 'Doe',
            role: 'user',
            status: 'approved',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ])
      });
    });

    await page.route(`${API_BASE_URL}/v1/admin/users/user-1/role`, async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Rôle mis à jour avec succès',
            data: {
              user_id: 'user-1',
              role: 'manager',
              previous_role: 'user'
            }
          })
        });
      }
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Attendre que les données se chargent
    await page.waitForSelector('[data-testid="user-list-table"]');
    
    // Cliquer sur le bouton de modification de rôle
    await page.locator('[data-testid="role-selector-button"]').first().click();
    
    // Sélectionner le nouveau rôle
    await page.locator('[data-testid="role-option-admin"]').click();
    
    // Confirmer la modification
    await page.locator('[data-testid="confirm-role-change"]').click();
    
    // Vérifier que la notification de succès apparaît
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();
    await expect(page.locator('text=Rôle mis à jour avec succès')).toBeVisible();
  });

  test('Admin peut filtrer les utilisateurs par rôle', async ({ page }) => {
    // Mock de la réponse API avec filtres
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      const url = new URL(route.request().url());
      const role = url.searchParams.get('role');
      
      let users = [];
      if (role === 'user') {
        users = [
          {
            id: 'user-1',
            username: 'user1',
            first_name: 'John',
            last_name: 'Doe',
            role: 'user',
            status: 'approved',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ];
      } else {
        users = [
          {
            id: 'user-1',
            username: 'user1',
            first_name: 'John',
            last_name: 'Doe',
            role: 'user',
            status: 'approved',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'user-2',
            username: 'user2',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'manager',
            status: 'approved',
            is_active: true,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z'
          }
        ];
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(users)
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Attendre que les données se chargent
    await page.waitForSelector('[data-testid="user-list-table"]');
    
    // Appliquer le filtre par rôle "user"
    await page.locator('[data-testid="role-filter"]').selectOption('user');
    
    // Attendre que le filtre soit appliqué
    await page.waitForTimeout(1000);
    
    // Vérifier qu'un seul utilisateur est affiché
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('Gestion des erreurs API', async ({ page }) => {
    // Mock d'une erreur API
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Erreur serveur interne'
        })
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Vérifier que l'erreur est affichée
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Erreur serveur interne')).toBeVisible();
  });

  test('Utilisateur non-admin ne peut pas accéder à l\'administration', async ({ page }) => {
    // Mock d'un utilisateur normal
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_user_token');
      window.localStorage.setItem('user_data', JSON.stringify(TEST_USER));
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Vérifier que l'accès est refusé
    await expect(page.locator('text=Accès refusé')).toBeVisible();
    await expect(page.locator('text=Rôle administrateur requis')).toBeVisible();
  });

  test('Pagination fonctionne correctement', async ({ page }) => {
    // Mock d'une réponse avec pagination
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      const url = new URL(route.request().url());
      const skip = parseInt(url.searchParams.get('skip') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      // Simuler 50 utilisateurs
      const users = Array.from({ length: Math.min(limit, 50 - skip) }, (_, i) => ({
        id: `user-${skip + i + 1}`,
        username: `user${skip + i + 1}`,
        first_name: `User${skip + i + 1}`,
        last_name: 'Test',
        role: 'user',
        status: 'approved',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(users)
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    
    // Attendre que les données se chargent
    await page.waitForSelector('[data-testid="user-list-table"]');
    
    // Vérifier la pagination
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    await expect(page.locator('[data-testid="page-info"]')).toContainText('1-20 sur 50');
  });

  test('Recherche d\'utilisateurs fonctionne', async ({ page }) => {
    // Mock de la réponse API avec recherche
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');

      let users = [
          {
          id: 'user-1',
          username: 'john_doe',
          first_name: 'John',
          last_name: 'Doe',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'user-2',
          username: 'jane_smith',
          first_name: 'Jane',
          last_name: 'Smith',
            role: 'manager',
          status: 'approved',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      if (search) {
        users = users.filter(user =>
          user.username.includes(search) ||
          user.first_name.includes(search) ||
          user.last_name.includes(search)
        );
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(users)
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);

    // Attendre que les données se chargent
    await page.waitForSelector('[data-testid="user-list-table"]');

    // Effectuer une recherche
    await page.locator('[data-testid="search-input"]').fill('john');
    await page.locator('[data-testid="search-button"]').click();

    // Attendre que la recherche soit effectuée
    await page.waitForTimeout(1000);

    // Vérifier que seul John Doe est affiché
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('Modale d\'édition de profil sécurisée - workflow complet', async ({ page }) => {
    // Mock des réponses API
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([TEST_EDIT_USER])
      });
    });

    // Mock pour la mise à jour d'utilisateur
    await page.route(`${API_BASE_URL}/v1/users/${TEST_EDIT_USER.id}`, async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...TEST_EDIT_USER,
            first_name: 'Updated',
            last_name: 'Name',
            updated_at: new Date().toISOString()
          })
        });
      }
    });

    // Mock pour la mise à jour de rôle
    await page.route(`${API_BASE_URL}/v1/admin/users/${TEST_EDIT_USER.id}/role`, async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Rôle mis à jour avec succès'
          })
        });
      }
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);

    // Attendre que les données se chargent
    await page.waitForSelector('[data-testid="user-list-table"]');

    // 🔒 Test de sécurité : Vérifier que le champ prénom n'affiche jamais de mot de passe
    await expect(page.locator('text=Edit')).toBeVisible(); // Le prénom correct
    await expect(page.locator('text=Edit')).not.toContainText('password'); // Pas de mot de passe

    // Cliquer sur le bouton "Modifier le profil" (supposé être dans la liste des utilisateurs)
    await page.locator('text=Modifier le profil').click();

    // Attendre que la modale s'ouvre
    await expect(page.locator('[data-testid="edit-profile-modal"]')).toBeVisible();

    // ✅ Test de pré-remplissage : Vérifier que les champs sont pré-remplis correctement
    await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Edit');
    await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('User');
    await expect(page.locator('[data-testid="role-select"]')).toContainText('Bénévole'); // Étiquette correcte
    await expect(page.locator('[data-testid="status-select"]')).toContainText('Approuvé');

    // ✅ Test des rôles valides : Vérifier que seuls les rôles valides sont disponibles
    await page.locator('[data-testid="role-select"]').click();
    await expect(page.locator('[data-testid="role-option-super-admin"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-option-admin"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-option-user"]')).toBeVisible();

    // ❌ Vérifier que les rôles dépréciés ne sont pas présents
    await expect(page.locator('[data-testid="role-option-manager"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="role-option-cashier"]')).not.toBeVisible();

    // Fermer le dropdown
    await page.locator('body').click();

    // Modifier les valeurs
    await page.locator('[data-testid="first-name-input"]').fill('Updated');
    await page.locator('[data-testid="last-name-input"]').fill('Name');
    await page.locator('[data-testid="role-select"]').selectOption('admin');
    await page.locator('[data-testid="status-select"]').selectOption('pending');

    // Sauvegarder les modifications
    await page.locator('[data-testid="save-profile-button"]').click();

    // Vérifier la notification de succès
    await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();
    await expect(page.locator('text=Profil utilisateur mis à jour avec succès')).toBeVisible();

    // Vérifier que la modale se ferme
    await expect(page.locator('[data-testid="edit-profile-modal"]')).not.toBeVisible();
  });

  test('Modale d\'édition de profil - validation des champs', async ({ page }) => {
    // Mock des réponses API
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([TEST_EDIT_USER])
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    await page.waitForSelector('[data-testid="user-list-table"]');

    // Ouvrir la modale
    await page.locator('text=Modifier le profil').click();
    await expect(page.locator('[data-testid="edit-profile-modal"]')).toBeVisible();

    // ✅ Test de validation : Prénom trop court
    await page.locator('[data-testid="first-name-input"]').fill('A');
    await page.locator('[data-testid="save-profile-button"]').click();

    // Vérifier que l'erreur de validation s'affiche
    await expect(page.locator('[data-testid="first-name-error"]')).toContainText('Le prénom doit contenir au moins 2 caractères');

    // Corriger le prénom
    await page.locator('[data-testid="first-name-input"]').fill('Updated');

    // ✅ Test de validation : Nom trop court
    await page.locator('[data-testid="last-name-input"]').fill('B');
    await page.locator('[data-testid="save-profile-button"]').click();

    // Vérifier que l'erreur de validation s'affiche
    await expect(page.locator('[data-testid="last-name-error"]')).toContainText('Le nom doit contenir au moins 2 caractères');

    // Corriger le nom
    await page.locator('[data-testid="last-name-input"]').fill('Name');

    // La sauvegarde devrait maintenant fonctionner (même si elle échoue côté API)
    await page.locator('[data-testid="save-profile-button"]').click();
  });

  test('Modale d\'édition de profil - annulation fonctionne', async ({ page }) => {
    // Mock des réponses API
    await page.route(`${API_BASE_URL}/v1/admin/users*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([TEST_EDIT_USER])
      });
    });

    await page.goto(`${FRONTEND_URL}/admin/users`);
    await page.waitForSelector('[data-testid="user-list-table"]');

    // Ouvrir la modale
    await page.locator('text=Modifier le profil').click();
    await expect(page.locator('[data-testid="edit-profile-modal"]')).toBeVisible();

    // Modifier des valeurs
    await page.locator('[data-testid="first-name-input"]').fill('Should Not Save');

    // Annuler les modifications
    await page.locator('[data-testid="cancel-profile-button"]').click();

    // Vérifier que la modale se ferme
    await expect(page.locator('[data-testid="edit-profile-modal"]')).not.toBeVisible();

    // Rouvrir la modale pour vérifier que les modifications n'ont pas été sauvegardées
    await page.locator('text=Modifier le profil').click();
    await expect(page.locator('[data-testid="edit-profile-modal"]')).toBeVisible();

    // Vérifier que les valeurs originales sont restaurées
    await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Edit');
  });
});

// Tests de performance
test.describe('Performance Administration', () => {
  
  test('Temps de chargement de la page admin', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${FRONTEND_URL}/admin/users`);
    await page.waitForSelector('[data-testid="user-list-table"]');
    
    const loadTime = Date.now() - startTime;
    
    // Vérifier que la page se charge en moins de 3 secondes
    expect(loadTime).toBeLessThan(3000);
  });
  
  test('Temps de réponse des actions utilisateur', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/users`);
    await page.waitForSelector('[data-testid="user-list-table"]');
    
    // Mesurer le temps de réponse pour la modification de rôle
    const startTime = Date.now();
    
    await page.locator('[data-testid="role-selector-button"]').first().click();
    await page.locator('[data-testid="role-option-admin"]').click();
    await page.locator('[data-testid="confirm-role-change"]').click();
    
    await page.waitForSelector('[data-testid="success-notification"]');
    
    const responseTime = Date.now() - startTime;
    
    // Vérifier que l'action se termine en moins de 2 secondes
    expect(responseTime).toBeLessThan(2000);
  });
});
