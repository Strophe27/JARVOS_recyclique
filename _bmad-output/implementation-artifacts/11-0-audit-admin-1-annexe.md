## Domaine
Admin1

## Ecrans verifies

- `Tableau de Bord d'Administration` (`/admin`) - capture nominale (`admin1-01-dashboard-admin.png`).
- `Gestion des Utilisateurs - liste` (`/admin/users`) - capture nominale (`admin1-02-users-liste.png`).
- `Gestion des Utilisateurs - detail` (`/admin/users`) - selection d'un profil (`admin1-03-users-detail.png`).
- `Gestion des Utilisateurs - pending` (`/admin/users/pending`) - ecran vide observe (`admin1-04-users-pending-blank.png`).
- `Sites` (`/admin/sites`) - capture nominale (`admin1-05-sites.png`).
- `Postes de caisse` (`/admin/cash-registers`) - capture nominale (`admin1-06-postes-caisse.png`).
- `Session manager` (`/admin/session-manager?skip=0&limit=20`) - capture nominale (`admin1-08-session-manager.png`).
- `Rapports caisse / analyse rapide` (`/admin/quick-analysis`) - capture nominale (`admin1-09-rapports-quick-analysis.png`).
- `Route legacy session` (`/admin/cash-sessions`) - ecran vide observe (`admin1-07-sessions-blank.png`).

## Ecarts constates

id_ecart | domaine | ecran | route | type_ecart(visuel/comportemental/AC) | severite | preuve_capture | impact | effort | hypothese_cause | action_recommandee | story_cible
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
ADM1-001 | Admin1 | Utilisateurs pending | /admin/users/pending | comportemental/AC | critique | `_bmad-output/implementation-artifacts/screenshots/11-0/admin-1/admin1-04-users-pending-blank.png` | Ecran attendu non operable (main vide), blocage du workflow de validation users | M | Route chargee sans composant rendu ou erreur de guard/data-loader silencieuse | Rebrancher composant pending users 1.4.4 + ajouter test UI de rendu minimum (table/liste ou etat vide explicite) | 11.4
ADM1-002 | Admin1 | Gestionnaire sessions (deep link) | /admin/cash-sessions | comportemental | majeur | `_bmad-output/implementation-artifacts/screenshots/11-0/admin-1/admin1-07-sessions-blank.png` | URL deep link non exploitable (main vide) alors que le flux passe par `/admin/session-manager` | S | Route obsolete non redirigee ou mapping route casse | Ajouter redirection explicite `/admin/cash-sessions` -> `/admin/session-manager` ou restaurer rendu de la route | 11.4
ADM1-003 | Admin1 | Rapports caisse - export | /admin/quick-analysis | AC | mineur | `_bmad-output/implementation-artifacts/screenshots/11-0/admin-1/admin1-09-rapports-quick-analysis.png` | CTA export affiche "A venir", parite fonctionnelle potentiellement incomplete | M | Fonction export reportee ou desactivee sur staging | Confirmer baseline 1.4.4 pour ce CTA puis activer ou masquer selon scope story 11.4 | 11.4

## Zones non verifiees

- Execution reelle des exports CSV/Excel (download binaire non valide dans ce run).
- Parcours "Creer un utilisateur" et workflow d'approbation/rejet pending (evite pour limiter la pollution des donnees staging).
- Verification side-by-side automatisee avec une instance 1.4.4 active (comparaison basee sur specs + observation staging).

## Handoff BMAD - Document Project

- **Scope couvert**: Admin1 (story 11.4) uniquement.
- **Ecrans verifies / non verifies**:
  - Verifies: dashboard admin, users (liste/detail), sites, postes caisse, session manager, quick analysis rapports.
  - Non verifies pleinement: export binaire et workflow pending complet (ecran pending actuellement vide).
- **Risques principaux**:
  - Ecran `users/pending` non operable.
  - Deep link `cash-sessions` vide (risque de regression de navigation/backlink).
  - Parite export rapports a confirmer (CTA "A venir").
- **Hypotheses et limites**:
  - Comparaison basee sur PRD, UX spec, Epic 11 et checklist import 1.4.4.
  - Audit effectue sur staging uniquement.
  - Aucune action destructive executee.

## Handoff BMAD - Correct Course

- **Top 5 ecarts critiques**
  - ADM1-001 (critique) `users/pending` ecran vide.
  - ADM1-002 (majeur) `/admin/cash-sessions` non exploitable.
  - ADM1-003 (mineur AC) export quick-analysis "A venir".
- **Lotissement propose (quick wins vs chantiers lourds)**
  - Quick wins: ADM1-002, ADM1-003.
  - Chantiers lourds: ADM1-001 (rendu + data + tests pending users).
- **Ordre de correction recommande**
  - 1) ADM1-001, 2) ADM1-002, 3) ADM1-003.

## Handoff BMAD - Sprint Planning

- **Backlog propose**
  - Restaurer la page pending users (table + etat vide explicite + actions approve/reject si scope).
  - Corriger/redirect la route `/admin/cash-sessions`.
  - Clarifier le statut export quick-analysis (active vs hors scope) et aligner le CTA.
  - Ajouter tests UI co-loces sur routes admin critiques (`users`, `users/pending`, `session-manager`).
- **Dependances**
  - API admin users/pending disponible et stable.
  - Router frontend admin (aliases/redirects legacy).
  - Decision produit sur le scope exact "rapports caisse" de la story 11.4.
- **Definition of done recommandee**
  - Preuves visuelles avant/apres sur les 3 ecarts.
  - Verification manuelle staging des routes corrigees.
  - Aucun ecran cible Admin1 ne rend une page vide.
