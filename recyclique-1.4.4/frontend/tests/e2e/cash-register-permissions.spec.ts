import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Cash Register Permissions (B50-P4)
 * 
 * Tests:
 * - User with only caisse.virtual.access can access virtual routes only
 * - User with only caisse.deferred.access can access deferred routes only
 * - User with caisse.access can access normal cash register routes
 * - User without permissions cannot access any cash register routes
 * - ProtectedRoute correctly redirects unauthorized users
 */

test.describe('Cash Register Permissions E2E', () => {
  
  /**
   * Helper function to setup login mock with specific permissions
   */
  async function setupUserWithPermissions(page: any, permissions: string[], role: string = 'user') {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 14400; // 4 hours
    const mockToken = btoa(JSON.stringify({ sub: 'user1', exp }));
    
    // Mock login endpoint
    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: `header.${mockToken}.signature`,
          refresh_token: 'refresh-token-123',
          user: {
            id: 'user1',
            username: 'testuser',
            role: role,
            status: 'approved',
            is_active: true
          }
        })
      });
    });

    // Mock permissions endpoint
    await page.route('**/v1/users/me/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          permissions: permissions
        })
      });
    });

    // Mock activity ping
    await page.route('**/v1/activity/ping', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Mock refresh endpoint
    await page.route('**/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'refresh_token=new-refresh-token; HttpOnly; SameSite=Strict',
          'X-CSRF-Token': 'new-csrf-token'
        },
        body: JSON.stringify({
          access_token: `header.${mockToken}.signature`,
          refresh_token: 'new-refresh-token',
          expires_in: 14400
        })
      });
    });
  }

  test('user with only caisse.virtual.access can access virtual routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.virtual.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access virtual cash register route - should succeed
    await page.goto('/cash-register/virtual');
    
    // Should not be redirected (route is accessible)
    // We check that we're not on login page and not showing access denied
    expect(page.url()).toContain('/cash-register/virtual');
    const loginPage = page.locator('input[name="username"]');
    await expect(loginPage).toHaveCount(0); // Not on login page

    // Try to access virtual session open - should succeed
    await page.goto('/cash-register/virtual/session/open');
    expect(page.url()).toContain('/cash-register/virtual/session/open');
  });

  test('user with only caisse.virtual.access cannot access normal cash register routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.virtual.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access normal cash register route - should be blocked
    await page.goto('/caisse');
    
    // Should be redirected (either to login or dashboard)
    // ProtectedRoute should block access
    await page.waitForTimeout(1000); // Wait for redirect
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/caisse');
    
    // Try to access normal session open - should be blocked
    await page.goto('/cash-register/session/open');
    await page.waitForTimeout(1000);
    const currentUrl2 = page.url();
    expect(currentUrl2).not.toContain('/cash-register/session/open');
  });

  test('user with only caisse.virtual.access cannot access deferred routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.virtual.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access deferred cash register route - should be blocked
    await page.goto('/cash-register/deferred');
    
    // Should be redirected (ProtectedRoute should block)
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/cash-register/deferred');
  });

  test('user with only caisse.deferred.access can access deferred routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.deferred.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access deferred cash register route - should succeed
    await page.goto('/cash-register/deferred');
    
    // Should not be redirected (route is accessible)
    expect(page.url()).toContain('/cash-register/deferred');
    const loginPage = page.locator('input[name="username"]');
    await expect(loginPage).toHaveCount(0); // Not on login page

    // Try to access deferred session open - should succeed
    await page.goto('/cash-register/deferred/session/open');
    expect(page.url()).toContain('/cash-register/deferred/session/open');
  });

  test('user with only caisse.deferred.access cannot access normal or virtual routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.deferred.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access normal cash register route - should be blocked
    await page.goto('/caisse');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/caisse');

    // Try to access virtual cash register route - should be blocked
    await page.goto('/cash-register/virtual');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/cash-register/virtual');
  });

  test('user with caisse.access can access normal cash register routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access normal cash register route - should succeed
    await page.goto('/caisse');
    
    // Should not be redirected (route is accessible)
    expect(page.url()).toContain('/caisse');
    const loginPage = page.locator('input[name="username"]');
    await expect(loginPage).toHaveCount(0); // Not on login page

    // Try to access normal session open - should succeed
    await page.goto('/cash-register/session/open');
    expect(page.url()).toContain('/cash-register/session/open');
  });

  test('user with caisse.access cannot access virtual or deferred routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['caisse.access'], 'user');

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access virtual cash register route - should be blocked
    await page.goto('/cash-register/virtual');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/cash-register/virtual');

    // Try to access deferred cash register route - should be blocked
    await page.goto('/cash-register/deferred');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/cash-register/deferred');
  });

  test('user without any cash permissions cannot access any cash register routes', async ({ page }) => {
    await setupUserWithPermissions(page, ['reception.access'], 'user'); // Only reception permission

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Try to access normal cash register route - should be blocked
    await page.goto('/caisse');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/caisse');

    // Try to access virtual cash register route - should be blocked
    await page.goto('/cash-register/virtual');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/cash-register/virtual');

    // Try to access deferred cash register route - should be blocked
    await page.goto('/cash-register/deferred');
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/cash-register/deferred');
  });

  test('admin user has access to all routes regardless of permissions', async ({ page }) => {
    // Admin users should have access to all routes (role-based access)
    await setupUserWithPermissions(page, [], 'admin'); // No specific permissions, but admin role

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Admin should be able to access all routes
    await page.goto('/caisse');
    expect(page.url()).toContain('/caisse');

    await page.goto('/cash-register/virtual');
    expect(page.url()).toContain('/cash-register/virtual');

    await page.goto('/cash-register/deferred');
    expect(page.url()).toContain('/cash-register/deferred');
  });

});

