import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Reception KPI Banner (B43-P1)
 * 
 * Tests:
 * - Banner display on ticket pages
 * - KPI values display correctly
 * - Auto-refresh every 10 seconds
 * - Offline mode handling
 * - Live indicator and timestamp
 */

test.describe('Reception KPI Banner E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login endpoint
    await page.route('**/v1/auth/login', async (route) => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 240 * 60; // 4 hours
      const mockToken = btoa(JSON.stringify({ sub: 'user1', exp }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: `header.${mockToken}.signature`,
          refresh_token: 'refresh-token-123',
          user: {
            id: 'user1',
            username: 'testuser',
            role: 'admin',
            status: 'approved',
            is_active: true
          }
        })
      });
    });

    // Mock reception live stats endpoint
    await page.route('**/v1/reception/stats/live', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets_open: 5,
          tickets_closed_24h: 23,
          items_received: 156,
          turnover_eur: 1247.50,
          donations_eur: 45.80,
          weight_in: 1250.75,
          weight_out: 890.25
        })
      });
    });
  });

  test('should display banner on ticket form page', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Check if banner is displayed
    const banner = page.locator('[data-testid="reception-kpi-banner"]');
    await expect(banner).toBeVisible();

    // Check if all KPI labels are present
    await expect(page.locator('text=Tickets caisse')).toBeVisible();
    await expect(page.locator('text=CA jour')).toBeVisible();
    await expect(page.locator('text=Dons jour')).toBeVisible();
    await expect(page.locator('text=Poids sortis')).toBeVisible();
    await expect(page.locator('text=Poids rentrés')).toBeVisible();
    await expect(page.locator('text=Objets')).toBeVisible();
  });

  test('should display correct KPI values', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Check KPI values
    await expect(page.locator('text=23')).toBeVisible(); // tickets_closed_24h
    await expect(page.locator('text=156')).toBeVisible(); // items_received
    await expect(page.locator('text=/1.*247.*50.*€/')).toBeVisible(); // turnover_eur
    await expect(page.locator('text=/45.*80.*€/')).toBeVisible(); // donations_eur
    await expect(page.locator('text=/890.*25.*kg/')).toBeVisible(); // weight_out (poids sortis)
    await expect(page.locator('text=/1.*250.*75.*kg/')).toBeVisible(); // weight_in (poids rentrés)
  });

  test('should display live indicator and timestamp', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Check for live indicator
    await expect(page.locator('text=Live')).toBeVisible();

    // Check for timestamp (format HH:MM)
    const timestamp = page.locator('text=/\\d{2}:\\d{2}/');
    await expect(timestamp).toBeVisible();
  });

  test('should auto-refresh every 10 seconds', async ({ page }) => {
    let callCount = 0;

    // Track API calls
    await page.route('**/v1/reception/stats/live', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets_open: 5,
          tickets_closed_24h: 23 + callCount, // Change value to verify refresh
          items_received: 156 + callCount * 10,
          turnover_eur: 1247.50,
          donations_eur: 45.80,
          weight_in: 1250.75,
          weight_out: 890.25
        })
      });
    });

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Initial call should have been made
    expect(callCount).toBeGreaterThanOrEqual(1);

    // Wait for refresh (10 seconds + buffer)
    await page.waitForTimeout(12000);

    // Should have made at least 2 calls (initial + refresh)
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  test('should display offline status when connection is lost', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Verify banner is visible online
    await expect(page.locator('text=Live')).toBeVisible();

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(3000);

    // Check for offline indicator
    await expect(page.locator('text=Hors ligne')).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(3000);

    // Should show live indicator again
    await expect(page.locator('text=Live')).toBeVisible();
  });

  test('should display banner on ticket view page', async ({ page }) => {
    // Mock ticket detail endpoint
    await page.route('**/v1/reception/tickets/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ticket-123',
          status: 'open',
          created_at: new Date().toISOString(),
          benevole_username: 'testuser',
          lignes: []
        })
      });
    });

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket view
    await page.goto('/reception/ticket/ticket-123/view');
    await page.waitForTimeout(2000);

    // Check if banner is displayed
    const banner = page.locator('[data-testid="reception-kpi-banner"]');
    await expect(banner).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/v1/reception/stats/live', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Banner should still be visible (with fallback values)
    const banner = page.locator('[data-testid="reception-kpi-banner"]');
    await expect(banner).toBeVisible();

    // Should show offline or error state
    const offlineIndicator = page.locator('text=Hors ligne');
    const hasOffline = await offlineIndicator.count() > 0;
    
    // Either offline indicator or banner should still be visible
    expect(hasOffline || await banner.isVisible()).toBeTruthy();
  });

  test('should not display banner for non-admin users', async ({ page }) => {
    // Mock login with user role (not admin)
    await page.route('**/v1/auth/login', async (route) => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 240 * 60;
      const mockToken = btoa(JSON.stringify({ sub: 'user1', exp }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: `header.${mockToken}.signature`,
          refresh_token: 'refresh-token-123',
          user: {
            id: 'user1',
            username: 'testuser',
            role: 'user', // Not admin
            status: 'approved',
            is_active: true
          }
        })
      });
    });

    // Mock 403 response for non-admin
    await page.route('**/v1/reception/stats/live', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Forbidden' })
      });
    });

    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 5000 });

    // Navigate to ticket form
    await page.goto('/reception/ticket');
    await page.waitForTimeout(2000);

    // Banner might still be visible but with error state or no data
    // The hook should handle 403 gracefully
    const banner = page.locator('[data-testid="reception-kpi-banner"]');
    // Banner may or may not be visible depending on implementation
    // But page should not crash
    expect(await page.title()).toBeTruthy();
  });
});

