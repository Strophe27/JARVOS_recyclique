# Plan Hotfix Terrain — post Epic 17

Date: 2026-03-02
Statut: pret a executer
Source: `_bmad-output/implementation-artifacts/17-z-registre-anomalies-terrain.md`
Scope: ferme — uniquement les 5 anomalies AT-001 a AT-005, aucun nouveau scope.

---

## Diagnostic technique confirme

| AT | Cause racine | Gravite |
|----|-------------|---------|
| AT-001 | `/dashboard` sans AuthGuard dans App.tsx (ligne 61) | bloquant |
| AT-002 | `/caisse`, `/reception`, `/profil` sans AuthGuard dans App.tsx (lignes 62-68, 150-152) | bloquant |
| AT-004 | `POST /v1/auth/login` retourne un JWT en JSON mais ne pose PAS de cookie `recyclique_session` — le cookie n'est pose que dans le flux OIDC callback (ligne 316). Au refresh, `GET /v1/auth/session` ne trouve pas de cookie → session perdue. | bloquant |
| AT-003 | `LoginPage.tsx` ligne 19 : fallback post-login code en dur vers `/caisse` au lieu de `/dashboard` | important |
| AT-005 | Aucun mecanisme pour creer le premier `super_admin` — le role existe mais personne ne peut l'attribuer sans acces BDD direct | important |

---

## Stories ordonnees (execution sequentielle)

### HF-1: AuthGuard sur toutes les routes protegees (AT-001 + AT-002)

**Mapping:** AT-001, AT-002
**Fichiers cibles:** `frontend/src/App.tsx`, creation `frontend/src/auth/AuthGuard.tsx` + `AuthGuard.test.tsx`
**Scope:** Envelopper `/dashboard`, `/caisse`, `/cash-register/*`, `/reception`, `/reception/tickets/:id`, `/profil` dans un `<AuthGuard>` qui redirige vers `/login` si `!user`.

**AC:**
1. Given un utilisateur deconnecte, When il navigue vers `/dashboard`, Then il est redirige vers `/login`.
2. Given un utilisateur deconnecte, When il navigue vers `/caisse`, Then il est redirige vers `/login`.
3. Given un utilisateur connecte, When il navigue vers `/dashboard`, Then la page s'affiche normalement.
4. Given un utilisateur connecte, When il navigue vers `/caisse`, Then la page s'affiche normalement.

**Preuves obligatoires:**
- Tests Vitest AuthGuard (redirige si non-auth, affiche si auth)
- Tests App.test.tsx mis a jour pour couvrir `/dashboard` et `/caisse` non-auth

---

### HF-2: Cookie session sur login legacy (AT-004)

**Mapping:** AT-004
**Fichiers cibles:** `api/routers/v1/auth.py` (endpoint `POST /v1/auth/login`), `api/tests/routers/test_auth.py`
**Scope:** Apres authentification legacy reussie, poser le cookie `recyclique_session` (httponly, samesite) en plus du JWT retourne dans le body — comme le fait deja le flux OIDC callback (ligne 316). Cote front, `AuthContext.refreshSession()` fonctionne deja avec `GET /v1/auth/session` → le refresh retrouvera le cookie.

**AC:**
1. Given un login legacy reussi, When la reponse est recue, Then un cookie `recyclique_session` httponly est present dans `Set-Cookie`.
2. Given un utilisateur connecte via legacy, When il fait F5 (refresh), Then `GET /v1/auth/session` retourne `authenticated: true` grace au cookie.
3. Given un nouvel onglet ouvert sur la meme origine, When `GET /v1/auth/session` est appele, Then la session est partagee via le cookie.

**Preuves obligatoires:**
- Test pytest : `POST /v1/auth/login` → verifier `Set-Cookie` dans la reponse
- Test pytest : apres login, `GET /v1/auth/session` avec cookie → `authenticated: true`

---

### HF-3: Redirection post-login vers /dashboard (AT-003)

**Mapping:** AT-003
**Fichiers cibles:** `frontend/src/auth/LoginPage.tsx`, `frontend/src/auth/LoginPage.test.tsx`
**Scope:** Changer le fallback de redirection de `/caisse` a `/dashboard` (ligne 19).

**AC:**
1. Given un login reussi sans `from` dans location.state, When la connexion aboutit, Then redirection vers `/dashboard` (et non `/caisse`).
2. Given un login reussi avec `from: /admin/users`, When la connexion aboutit, Then redirection vers `/admin/users` (comportement existant preserve).

**Preuves obligatoires:**
- Test Vitest LoginPage : redirection par defaut vers `/dashboard`
- Test Vitest LoginPage : redirection vers `from` si present

---

### HF-4: Strategie bootstrap super_admin (AT-005)

**Mapping:** AT-005
**Fichiers cibles:** creation script `api/scripts/bootstrap_superadmin.py`, `api/tests/` (test unitaire du script), documentation
**Scope:** Script CLI qui cree ou promeut un utilisateur en `super_admin`. Executable en local ou dans le conteneur Docker. Pas d'endpoint API public (securite). Documentation dans README ou doc/.

**AC:**
1. Given aucun super_admin existant, When le script est execute avec un username, Then l'utilisateur est cree (ou promu) avec le role `super_admin`.
2. Given un super_admin deja existant, When le script est re-execute, Then il affiche un message informatif sans erreur.
3. Given un super_admin bootstrape, When il se connecte au front, Then les cartes/zones super-admin sont visibles dans `/admin`.

**Preuves obligatoires:**
- Sortie du script (stdout) archivee
- Test pytest du script (creation + idempotence)
- Verification front super-admin (capture ou test)

---

## Critere de cloture terrain (re-smoke test)

Toutes les conditions suivantes doivent etre verifiees APRES deploiement des 4 stories :

| # | Scenario | Resultat attendu | Verifie par |
|---|----------|-------------------|-------------|
| 1 | Deconnecte → naviguer vers `/dashboard` | Redirection `/login` | HF-1 (AT-001) |
| 2 | Deconnecte → naviguer vers `/caisse` | Redirection `/login` | HF-1 (AT-002) |
| 3 | Connecte → F5 sur n'importe quelle page | Session conservee | HF-2 (AT-004) |
| 4 | Connecte → ouvrir meme URL dans nouvel onglet | Session partagee | HF-2 (AT-004) |
| 5 | Login reussi (sans from) | Redirection `/dashboard` | HF-3 (AT-003) |
| 6 | Super_admin bootstrape → login → `/admin` | Cartes super-admin visibles | HF-4 (AT-005) |

**Gate finale:** Les 6 scenarios verts = vague Hotfix terrain close.

---

## Mapping recapitulatif

| Story | AT couverts | Criticite | Effort estime |
|-------|-------------|-----------|---------------|
| HF-1 | AT-001, AT-002 | bloquant | petit (AuthGuard + App.tsx) |
| HF-2 | AT-004 | bloquant | moyen (backend cookie + tests) |
| HF-3 | AT-003 | important | trivial (1 ligne + test) |
| HF-4 | AT-005 | important | moyen (script + doc + test) |
