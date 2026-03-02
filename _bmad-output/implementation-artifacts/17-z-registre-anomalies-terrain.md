# Registre anomalies terrain - post Epic 17

Date de demarrage: 2026-03-02  
Statut: ouvert

Objectif: capturer rapidement les anomalies observees en navigation reelle, puis les transformer en stories de correction priorisees.

## Legende

- `criticite`: bloquant | important | confort
- `statut`: nouveau | confirme | en analyse | planifie | corrige

## Anomalies capturees

| ID | Contexte | Observation | Attendu | Criticite | Statut | Notes |
|---|---|---|---|---|---|---|
| AT-001 | Utilisateur deconnecte | Acces possible a `/dashboard` en saisissant l'URL | Redirection vers `/login` si non connecte | bloquant | corrige | HF-1 AuthGuard — 2026-03-02 |
| AT-002 | Utilisateur deconnecte | Acces possible a `/caisse` en saisissant l'URL (selection poste visible) | Redirection vers `/login` ou ecran d'acces refuse | bloquant | corrige | HF-1 AuthGuard — 2026-03-02 |
| AT-003 | Login utilisateur | Apres connexion, redirection automatique vers selection du poste de caisse | Redirection vers dashboard principal post-login | important | corrige | HF-3 — 2026-03-02 |
| AT-004 | Session connectee (caisse/admin) | Actualiser la page deconnecte l'utilisateur | Session conservee apres refresh tant que valide | bloquant | corrige | HF-2 cookie-session-login-legacy — 2026-03-02 |
| AT-005 | Role super_admin | Les cartes/zone super-admin ne sont pas visibles en etant connecte | Affichage des cartes super-admin pour un compte super_admin valide | important | corrige | HF-4 bootstrap-super-admin — 2026-03-02 |

## Diagnostic technique associe (sans correction appliquee)

| ID | Cause racine identifiee | Fix minimal recommande | Fichiers cibles |
|---|---|---|---|
| AT-001 | Route `/dashboard` non protegee par un guard auth dans le routeur | Ajouter un `AuthGuard` et proteger les routes non publiques | `frontend/src/App.tsx`, `frontend/src/auth/AuthGuard.tsx` |
| AT-002 | Route `/caisse` non protegee par un guard auth dans le routeur | Ajouter un `AuthGuard` et proteger les routes non publiques | `frontend/src/App.tsx`, `frontend/src/auth/AuthGuard.tsx` |
| AT-003 | Fallback post-login code en dur vers `/caisse` | Changer le fallback vers `/dashboard` | `frontend/src/auth/LoginPage.tsx` |
| AT-004 | Login legacy ne pose pas de cookie de session persistant; session perdue au refresh/nouvel onglet | Poser `recyclique_session` au login backend (comme flux SSO) | `api/routers/v1/auth.py` |
| AT-005 | Aucun mecanisme de bootstrap pour creer un `super_admin` initial | Ajouter un script/commande de creation super_admin + doc | `api/schemas/admin_user.py`, script bootstrap a creer, documentation |

## Procedure de mise a jour (simple)

1. Ajouter une ligne par anomalie constatee.
2. Confirmer la repro en 2-3 etapes.
3. Assigner une criticite.
4. Lier ensuite a une story de correction.
