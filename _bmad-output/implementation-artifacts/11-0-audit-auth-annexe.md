## Domaine
Auth

## Ecrans verifies

- `Login` (`/login`) - capture nominale.
- `Forgot password` (`/forgot-password`) - capture nominale.
- `Reset password` (`/reset-password?token=test-token`) - capture formulaire avec token de test.
- `Signup` (`/signup`) - capture nominale.
- `Profil` (`/profil`) - capture nominale (session authentifiee).
- `PIN login` (`/pin-login`) - ecran charge mais zone main vide (anomalie).
- `Login erreur` (`/login`) - test identifiants invalides, pas de feedback visible.

## Ecarts constates

id_ecart | domaine | ecran | route | type_ecart(visuel/comportemental/AC) | severite | preuve_capture | impact | effort | hypothese_cause | action_recommandee | story_cible
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
AUTH-001 | Auth | Connexion PIN | /pin-login | comportemental/AC | critique | `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-07-pin-login-blank-anon.png` | Flux PIN inutilisable, ecran attendu non operable | M | Route branchee sans composant rendu (guard ou composant vide) | Restaurer le rendu du formulaire PIN 1.4.4 et ajouter test e2e/RTL de presence champs + CTA | 11.1
AUTH-002 | Auth | Connexion PIN (session active) | /pin-login | comportemental | majeur | `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-06-pin-login-blank-logged.png` | Etat incoherent pour utilisateur connecte (page vide) | S | Cas session active non gere dans la page PIN | Rediriger vers dashboard/profil ou afficher message d'etat explicite | 11.1
AUTH-003 | Auth | Login - erreur identifiants | /login | comportemental | majeur | `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-09-login-invalid-no-feedback.png` | Echec connexion sans message clair, UX degradee | S | Erreur API non mappee sur UI (toast/alert absent) | Afficher message d'erreur utilisateur sur 401/403 et tracer tentative en console sans fuite sensible | 11.1
AUTH-004 | Auth | Login | /login | AC | mineur | `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-01-login-page.png` | Ecran Signup peu decouvrable depuis login (pas de lien direct) | S | Reprise partielle du gabarit 1.4.4 ou lien oublie | Ajouter CTA "Creer un compte" sur login si attendu 1.4.4 | 11.1
AUTH-005 | Auth | Reset password sans token | /reset-password | comportemental | mineur | `_bmad-output/implementation-artifacts/screenshots/11-0/auth/auth-04-reset-password-redirect-login.png` | Redirection silencieuse, diagnostic utilisateur faible | S | Guard token force redirect sans notification | Afficher message "lien invalide/expire" avant redirection (ou page dediee) | 11.1

## Zones non verifiees

- Validation email reelle du lien de reset (token reel non teste).
- Creation effective de compte Signup (non executee pour eviter pollution donnees staging).
- Soumission PIN valide/invalides (impossible car page PIN vide).

## Handoff BMAD - Document Project

- **Scope couvert**: Auth uniquement, routes `/login`, `/forgot-password`, `/reset-password`, `/signup`, `/profil`, `/pin-login`.
- **Ecrans verifies**: 6/6 ecrans cibles Story 11.1 visites; 9 captures ajoutees.
- **Ecrans non verifies**: aucun ecran cible non visite, mais certains comportements non testables (PIN submit, reset token reel).
- **Risques principaux**:
  - Connexion PIN inutilisable (critique).
  - Gestion des erreurs login non explicite.
  - Parcours reset sans token non explicite.
- **Hypotheses et limites**:
  - Comparaison basee sur specs Epic 11 + observation staging, sans side-by-side automatise avec instance 1.4.4.
  - Pas de tests destructifs ni creation de donnees persistantes.

## Handoff BMAD - Correct Course

- **Top 5 ecarts critiques/majeurs prioritaires**
  - AUTH-001 (critique) page PIN vide.
  - AUTH-003 (majeur) login invalide sans feedback.
  - AUTH-002 (majeur) page PIN vide meme connecte.
  - AUTH-005 (mineur) reset sans token redirection silencieuse.
  - AUTH-004 (mineur) discoverabilite signup depuis login.
- **Lotissement propose**
  - Quick wins: AUTH-003, AUTH-004, AUTH-005.
  - Chantiers lourds: AUTH-001 + AUTH-002 (correction structurelle route/composant/guards PIN).
- **Ordre de correction recommande**
  - 1) AUTH-001, 2) AUTH-002, 3) AUTH-003, 4) AUTH-005, 5) AUTH-004.

## Handoff BMAD - Sprint Planning

- **Backlog propose**
  - Rebrancher le composant UI PIN et ses guards de route.
  - Ajouter message d'erreur login sur authentification invalide.
  - Ajouter et tester message explicite reset sans token.
  - Ajouter CTA Signup sur login (si attendu baseline 1.4.4).
  - Ajouter tests UI Auth co-loces (`*.test.tsx`) pour routes critiques.
- **Dependances**
  - API auth stable (401/403/validation token).
  - Rendu routeur auth (guards connecte/deconnecte).
- **Definition of done recommandee**
  - Preuve visuelle avant/apres pour chaque ecran impacte.
  - Validation technique: tests frontend passes + verification manuelle staging.
  - Aucune fuite d'information sensible dans messages d'erreur.
