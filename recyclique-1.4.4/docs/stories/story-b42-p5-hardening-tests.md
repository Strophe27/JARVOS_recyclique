# Story B42-P5: Hardening & tests de sécurité sliding session

**Status:** Ready  
**Epic:** [EPIC-B42 – Session glissante & anti-déconnexion](../epics/epic-b42-sliding-session.md)  
**Module:** QA / Sécurité / DevOps  
**Priority:** P1  
**Owner:** Security & QA Leads  
**Last Updated:** 2025-11-26

**Dependencies:** ✅ [B42-P1](../stories/story-b42-p1-audit-sliding-session.md) - Complétée. ⏳ [B42-P2](../stories/story-b42-p2-backend-refresh-token.md), [B42-P3](../stories/story-b42-p3-frontend-refresh-integration.md) et [B42-P4](../stories/story-b42-p4-ux-alertes-observabilite.md) - En cours. Peut préparer les scripts de tests en parallèle.

---

## Story Statement

**As a** security/QA engineer,  
**I want** to valider la robustesse du nouveau mécanisme de session glissante par des tests approfondis,  
**so that** aucune régression de sécurité ou de stabilité n’est introduite (replay, CSRF, fuite refresh, load).

---

## Acceptance Criteria

1. **Pen-tests ciblés** – Scripts (ou outils) testant :  
   - replay d’un refresh token (doit être rejeté)  
   - refresh provenant d’une IP différente (selon policy)  
   - tentative CSRF si refresh exposé via cookie  
2. **Tests longue durée** – Scénario automatisé simulant une session de 10h (ping + refresh) pour vérifier absence de fuite mémoire et maintien des droits.  
3. **Tests offline** – Couvrir les cas où l’agent perd le réseau > `token_expiration_minutes` puis revient (doit afficher warning, redemander login proprement).  
4. **Chaos / résilience** – Test enchaînant redémarrage API/Redis pour s’assurer que les refresh tokens et ActivityService gèrent les redémarrages (pas de logout massif).  
5. **Rapport de validation** – Document listant tests exécutés, résultats, recommandations (must-have pour Go/No-Go).

---

## Dev Notes

### Références
- **[RFC Sliding Session](../../architecture/sliding-session-rfc.md)** – Design complet validé (section 7: Analyse sécurité)
- Stories P2–P4 (implémentations).  
- `docs/testing-strategy.md` pour exigences QA.  
- Outillage existant : Playwright, pytest, scripts load (k6?).

### Plan de tests
- **Backend**: pytest + tests manuels Postman pour rejeter refresh rejoué/expiré.  
- **Frontend**: Playwright scenario “simulate clock + offline/online”.  
- **Load**: script k6 ou Locust pour 100 sessions en parallèle rafraîchissant toutes les 5 min.

### Sécurité
- Vérifier stockage refresh (localStorage interdit). Si cookie HTTP-only → tests CSRF (double-submit token, SameSite).  
- Vérifier logs d’audit (chaque refresh + logout).

---

## Tasks / Subtasks
1. **Pen-test scripts (AC1)**  
   - [x] Créer scripts Python dans `scripts/security/sliding-session/`:
     - `test_replay_token.py` - Test replay d'un refresh token après rotation
     - `test_csrf_protection.py` - Test CSRF avec cookie SameSite=Strict
     - `test_ip_validation.py` - Test refresh depuis IP différente (vérifier logs d'audit)
   - [x] **Tests CSRF:** Vérifier que refresh depuis origine différente est rejeté (cookie SameSite=Strict)  
     - Utiliser `SessionStatusBanner` avec `data-testid="session-banner"` pour assertions
     - Vérifier que le header `X-CSRF-Token` est requis
   - [x] **Tests replay:** Vérifier qu'un refresh token réutilisé après rotation est rejeté
     - Scénario: login → refresh (obtenir token2) → réutiliser token1 → doit échouer avec `ValueError: Refresh token révoqué`
     - Vérifier dans les logs: `"Tentative de refresh avec token révoqué"`
   - [x] **Tests IP:** Vérifier que les logs d'audit enregistrent l'IP (pas de rejet automatique, juste audit)
   - [x] Documenter comment les exécuter dans `scripts/security/sliding-session/README.md`.  
2. **Long-run scenario (AC2)**  
   - [x] Créer test Playwright `frontend/tests/e2e/session-long-run.spec.ts`:
     - Utiliser `useFakeTimers` pour accélérer (configurer `token_expiration_minutes=5` en test)
     - Simuler 10h d'activité (équivalent à ~120 refresh avec tokens de 5 min)
     - Vérifier qu'après 10h, l'utilisateur est toujours connecté (si activité continue)
     - Vérifier absence de fuite mémoire (monitorer consommation)
     - Vérifier maintien des droits (tester accès à une page protégée)
   - [x] Alternative: Test réel avec `token_expiration_minutes=5` et attendre 5 min (pas 10h)
3. **Offline / chaos (AC3 & AC4)**  
   - [x] Créer test Playwright `frontend/tests/e2e/session-offline-chaos.spec.ts`:
     - Simuler perte réseau > expiration → vérifier que `SessionStatusBanner` affiche warning
     - Vérifier que le bandeau propose "Se reconnecter" et "Sauvegarder"
     - Simuler retour réseau → vérifier refresh automatique
   - [x] Créer test backend `api/tests/test_refresh_chaos.py`:
     - Redémarrer API pendant session active: `docker-compose restart api`
     - Redémarrer Redis pendant session active: `docker-compose restart redis`
     - Vérifier que les refresh tokens persistent en DB (table `user_sessions`)
     - Vérifier que `ActivityService` se reconnecte à Redis après redémarrage
     - Vérifier qu'aucun logout massif ne se produit
4. **Load tests (optionnel mais recommandé)**  
   - [x] Créer script k6 ou Locust `scripts/load/session-refresh-load.js`:
     - Simuler 100 sessions en parallèle rafraîchissant toutes les 5 min
     - Vérifier performance (latence < 200ms pour refresh)
     - Vérifier absence d'erreurs sous charge
5. **Reporting (AC5)**  
   - [x] Créer template `docs/qa/reports/sliding-session-validation-template.md`
   - [x] Rédiger rapport `docs/qa/reports/sliding-session-validation.md` avec:
     - Résumé exécutif
     - Liste des tests exécutés avec résultats
     - Findings (bloquants, warnings, info)
     - Recommandations
     - Sign-off (Sec Lead, QA Lead, PO)
   - [x] Lister issues / mitigations dans le rapport
6. **Gate QA**  
   - [ ] Soumettre à l'agent QA pour gate PASS
   - [ ] Vérifier que tous les AC sont validés avec preuves

---

## Project Structure Notes
- Scripts pen-test dans `scripts/security/sliding-session/`.  
- Rapports QA dans `docs/qa/reports/`.  
- Tests e2e additionnels sous `frontend/tests/e2e/` (pas `frontend/src/test/e2e/`).  
- Tests backend chaos dans `api/tests/test_refresh_chaos.py`.

## Références Techniques

### Endpoints à Tester
- `POST /v1/auth/refresh` - Endpoint principal de refresh
- `POST /v1/auth/login` - Création de refresh token
- `POST /v1/auth/logout` - Révocation de refresh tokens
- `GET /v1/admin/sessions/metrics` - Métriques de sessions (P4)

### Modèles à Comprendre
- `UserSession` - Table `user_sessions` avec `refresh_token_hash`, `revoked_at`, `expires_at`
- `RefreshTokenService` - Service avec rotation obligatoire
- `ActivityService` - Vérification d'activité via Redis

### Composants Frontend à Tester
- `SessionStatusBanner` - Bandeau d'alerte avec `data-testid="session-banner"`
- `useSessionHeartbeat` - Hook de gestion de session
- `axiosClient` - Interceptor de refresh automatique

### Configuration de Test
- Utiliser `token_expiration_minutes=5` en environnement de test pour accélérer les tests
- Base de données de test: `recyclic_test` (configurée dans `docker-compose.yml`)
- Variables d'environnement test dans `.env.test`

---

## Validation Checklist
- [ ] Tous les AC validés avec preuves (logs, captures).  
- [ ] Rapport partagé avec PO + Sec.  
- [ ] Aucun finding bloquant ouvert.  
- [ ] Gate QA = PASS.

---

## Dev Agent Record

### File List
- `scripts/security/sliding-session/test_replay_token.py` - Script pen-test replay token
- `scripts/security/sliding-session/test_csrf_protection.py` - Script pen-test CSRF
- `scripts/security/sliding-session/test_ip_validation.py` - Script pen-test IP validation
- `scripts/security/sliding-session/README.md` - Documentation des scripts pen-test
- `api/tests/test_refresh_chaos.py` - Tests backend chaos et résilience
- `frontend/tests/e2e/session-long-run.spec.ts` - Tests E2E long-run scenario
- `frontend/tests/e2e/session-offline-chaos.spec.ts` - Tests E2E offline/chaos
- `scripts/load/session-refresh-load.js` - Script load test k6
- `docs/qa/reports/sliding-session-validation-template.md` - Template de rapport
- `docs/qa/reports/sliding-session-validation.md` - Rapport de validation

### Debug Log References
- Tests créés selon le guide de prévention `docs/tests-problemes-p5-prevention.md`
- Utilisation de `from jose import jwt` (pas `import jwt`)
- Utilisation de `generate_refresh_token()` (pas `_generate_refresh_token()`)
- Tests adaptés à l'infrastructure réelle

### Completion Notes
- ✅ Tous les scripts pen-test créés et validés (AC1)
- ✅ Tests long-run créés et montés (AC2)
- ✅ Tests offline/chaos créés et montés (AC3 & AC4)
- ✅ Load tests créés avec documentation k6 (optionnel)
- ✅ Template et rapport de validation créés (AC5)
- ✅ Tests backend exécutés et validés (4/4 passés)
- ✅ Scripts pen-test exécutés et validés (3/3 passés)
- ⏳ Tests frontend E2E nécessitent installation navigateurs Playwright
- ⏳ Gate QA à passer après installation Playwright

### Change Log
| Date       | Version | Description                               | Author |
|------------|---------|-------------------------------------------|--------|
| 2025-11-26 | v0.1    | Draft initial de la story B42-P5           | BMad Master |
| 2025-11-26 | v0.2    | Tests créés - Prêt pour exécution          | James (Dev Agent) |
| 2025-11-27 | v0.3    | Tests validés - Backend et pen-test passent | James (Dev Agent) |

