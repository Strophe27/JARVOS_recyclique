# Story 17-HF-1 — AuthGuard sur routes protégées (AT-001, AT-002)

**Epic:** epic-17 (vague Hotfix Terrain)  
**Source:** 17-HF-plan-hotfix-terrain.md, 17-z-registre-anomalies-terrain.md  
**Statut:** done

## Problème

Les routes `/dashboard`, `/caisse`, `/cash-register/*`, `/reception`, `/reception/tickets/:ticketId`, `/profil` sont accessibles sans authentification dans App.tsx. Un utilisateur déconnecté peut les atteindre en saisissant l'URL.

**Cause racine:** aucune protection AuthGuard sur ces routes (contrairement aux routes `/admin/*` qui ont AdminGuard ou SuperAdminGuard).

## Objectif

Créer un composant `AuthGuard.tsx` qui redirige vers `/login` si `!user`, puis envelopper toutes les routes protégées dans App.tsx.

## État actuel (confirmé)

- App.tsx: routes /dashboard (l.61), /caisse (l.62), /reception (l.150), /profil (l.152) sans guard auth
- AuthContext.tsx expose useAuth() avec { user, isHydrated }
- AdminGuard existe dans `frontend/src/admin/AdminGuard.tsx` (pattern : !user → Navigate to /login, state={{ from: location }})
- AuthGuard.tsx n'existe pas — à créer dans frontend/src/auth/

## Acceptance Criteria

1. Given utilisateur déconnecté, When il navigue vers /dashboard, Then redirection vers /login
2. Given utilisateur déconnecté, When il navigue vers /caisse, Then redirection vers /login
3. Given utilisateur déconnecté, When il navigue vers /reception ou /profil, Then redirection vers /login
4. Given utilisateur connecté, When il navigue vers /dashboard, Then page affichée normalement
5. Given utilisateur connecté, When il navigue vers /caisse, Then page affichée normalement

## Implémentation

### 1. Créer AuthGuard.tsx

- **Fichier:** `frontend/src/auth/AuthGuard.tsx`
- **Comportement:** si `!user`, `<Navigate to="/login" state={{ from: location }} replace />` ; sinon `<>{children}</>`
- **Gestion isHydrated:** pendant `!isHydrated`, retourner null pour éviter flash avant hydration
- **Référence:** s'inspirer de `frontend/src/admin/AdminGuard.tsx` (l.14-16) pour la redirection non-auth

### 2. Modifier App.tsx

Envelopper dans `<AuthGuard>` les routes suivantes :
- /dashboard
- /caisse
- /cash-register/virtual, /cash-register/deferred
- /cash-register/session/open, /cash-register/sale, /cash-register/session/close
- CAISSE_PIN_PATH (CashRegisterPinPage)
- /reception
- /reception/tickets/:ticketId
- /profil

**Ne pas modifier:** /admin/* (déjà AdminGuard/SuperAdminGuard qui incluent la vérif auth), /login, /signup, /forgot-password, /reset-password.

### 3. Tests obligatoires

- **AuthGuard.test.tsx** (frontend/src/auth/AuthGuard.test.tsx) :
  - redirige vers /login si user null
  - affiche children si user présent
  - (optionnel) ne flash pas pendant hydration

- **App.test.tsx** : ajouter couverture pour /dashboard, /caisse et /reception non-auth → redirection /login

## Contraintes

- Scope strict : AuthGuard + protection routes. Pas de modif backend.
- Pas de run massif.

## File List (prévu)

- frontend/src/auth/AuthGuard.tsx (créé)
- frontend/src/auth/AuthGuard.test.tsx (créé)
- frontend/src/App.tsx (modifié)
- frontend/src/App.test.tsx (modifié)

## Preuves

- Tests Vitest AuthGuard : redirige si non-auth, affiche si auth
- Tests App.test.tsx : /dashboard, /caisse et /reception non-auth → /login

## Dev Agent Record

**Implementation Plan:** AuthGuard créé selon AdminGuard ; toutes les routes protégées enveloppées dans AuthGuard ; tests AuthGuard et App complétés.

**Completion Notes:** AuthGuard.tsx avec isHydrated→null, !user→Navigate/login. Routes /dashboard, /caisse, cash-register/*, CAISSE_PIN_PATH, /reception, /reception/tickets/:ticketId, /profil enveloppées. AuthGuard.test.tsx : 3 tests (redirect, affiche, hydration). App.test.tsx : 5 nouveaux tests AuthGuard (/dashboard, /caisse, /reception non-auth + auth). Tous les tests ciblés passent.

## Senior Developer Review (AI)

**Date:** 2026-03-02  
**Résultat:** Approved

### Synthèse

- **AC 1-5** : tous implémentés et couverts par les tests.
- **AuthGuard.tsx** : conforme (isHydrated→null, !user→Navigate, state.from).
- **App.tsx** : toutes les routes prévues enveloppées dans AuthGuard.
- **Tests** : AuthGuard.test.tsx (3 tests) et App.test.tsx (5 tests AuthGuard) passent.

### Points vérifiés

- Git vs File List : AuthGuard.tsx, AuthGuard.test.tsx, App.tsx, App.test.tsx alignés.
- Aucune modification backend (scope respecté).

### Recommandations (non bloquantes)

- Couverture optionnelle pour /profil et /reception/tickets/:id dans App.test (même pattern AuthGuard).

## Change Log

- 2026-03-02 : Implémentation complète AuthGuard + protection routes (story 17-HF-1)
- 2026-03-02 : Code review adversarial — approved
