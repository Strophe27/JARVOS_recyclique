import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests dans Docker
 * Le serveur frontend est déjà démarré via docker-compose
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4444',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Pas de webServer car le serveur tourne déjà dans Docker
  // webServer: undefined,
});
