/**
 * Load Test: Session Refresh (B42-P5)
 * 
 * Simule 100 sessions en parallèle rafraîchissant toutes les 5 min.
 * Vérifie performance (latence < 200ms pour refresh) et absence d'erreurs sous charge.
 * 
 * Usage:
 *   k6 run scripts/load/session-refresh-load.js
 * 
 * Prérequis:
 *   - Installer k6: https://k6.io/docs/getting-started/installation/
 *   - API doit être démarrée (http://localhost:8000)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8000';
const TEST_USERNAME = __ENV.TEST_USERNAME || 'admin@test.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'admin123';

// Métriques personnalisées
const refreshErrorRate = new Rate('refresh_errors');
const refreshSuccessRate = new Rate('refresh_success');

// Options de test
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp-up: 50 utilisateurs
    { duration: '5m', target: 100 },  // Load: 100 utilisateurs
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'],  // 95% des requêtes < 200ms
    'refresh_errors': ['rate<0.01'],      // < 1% d'erreurs
    'refresh_success': ['rate>0.99'],     // > 99% de succès
  },
};

// Fonction pour login et obtenir tokens
function login() {
  const loginRes = http.post(
    `${API_BASE_URL}/v1/auth/login`,
    JSON.stringify({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has access_token': (r) => {
      const body = JSON.parse(r.body);
      return body.access_token !== undefined;
    },
    'login has refresh_token': (r) => {
      const body = JSON.parse(r.body);
      return body.refresh_token !== undefined;
    },
  });

  if (!success) {
    return null;
  }

  const body = JSON.parse(loginRes.body);
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  };
}

// Fonction pour refresh token
function refreshToken(refreshToken) {
  const refreshRes = http.post(
    `${API_BASE_URL}/v1/auth/refresh`,
    JSON.stringify({
      refresh_token: refreshToken,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(refreshRes, {
    'refresh status is 200': (r) => r.status === 200,
    'refresh has access_token': (r) => {
      const body = JSON.parse(r.body);
      return body.access_token !== undefined;
    },
    'refresh has refresh_token': (r) => {
      const body = JSON.parse(r.body);
      return body.refresh_token !== undefined;
    },
    'refresh latency < 200ms': (r) => r.timings.duration < 200,
  });

  refreshSuccessRate.add(success);
  refreshErrorRate.add(!success);

  if (!success) {
    return null;
  }

  const body = JSON.parse(refreshRes.body);
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  };
}

// Scénario principal: Simuler une session avec refresh toutes les 5 min
export default function () {
  // Login initial
  const tokens = login();
  if (!tokens) {
    return;
  }

  let currentRefreshToken = tokens.refresh_token;
  let refreshCount = 0;

  // Simuler 10 refresh cycles (représentant ~50 minutes)
  // En production, cela représenterait 10h avec refresh toutes les 5 min
  for (let i = 0; i < 10; i++) {
    // Attendre 5 minutes (simulé par sleep court pour test)
    // En production réel, on attendrait 5 minutes
    sleep(1); // 1 seconde pour test (représente 5 min en production)

    // Refresh token
    const newTokens = refreshToken(currentRefreshToken);
    if (!newTokens) {
      // Si refresh échoue, essayer de se reconnecter
      const newLogin = login();
      if (newLogin) {
        currentRefreshToken = newLogin.refresh_token;
        refreshCount++;
      }
      continue;
    }

    currentRefreshToken = newTokens.refresh_token;
    refreshCount++;
  }

  // Vérifier qu'on a fait plusieurs refreshes
  check(refreshCount, {
    'at least 5 refreshes completed': (count) => count >= 5,
  });
}

// Fonction de setup (optionnel)
export function setup() {
  // Vérifier que l'API est accessible
  const healthRes = http.get(`${API_BASE_URL}/health`);
  check(healthRes, {
    'API is accessible': (r) => r.status === 200,
  });

  return {
    api_url: API_BASE_URL,
  };
}

// Fonction de teardown (optionnel)
export function teardown(data) {
  // Nettoyage si nécessaire
  console.log(`Load test completed for ${data.api_url}`);
}

