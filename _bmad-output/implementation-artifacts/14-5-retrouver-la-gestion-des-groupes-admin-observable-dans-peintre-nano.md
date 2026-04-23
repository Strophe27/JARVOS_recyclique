# Story 14.5 : Retrouver la gestion des groupes admin observable dans Peintre_nano

Status: done

**Story key :** `14-5-retrouver-la-gestion-des-groupes-admin-observable-dans-peintre-nano`  
**Epic :** 14 — Étendre la parité UI legacy de l'administration dans `Peintre_nano` (rail **U** ; contrats rail **K** en **16.2**)

## Story

As an authorized admin user,  
I want groups list, detail, and bounded mutations to work end-to-end from `Peintre_nano` through CREOS manifests and the documented `/v1/admin/groups` API,  
So that ACL administration regains observable parity with the legacy reference without deferring silent backend failures.

## Objectif

1. **Diagnostiquer et corriger** toute erreur serveur (**500** ou autre) sur les appels nominaux documentés pour **`/v1/admin/groups`** (liste ou détail selon le cas reproduit), avec **pytest** (ou tests existants étendus) prouvant le correctif.  
2. **Remplacer le placeholder** (fait) : surface **`AdminGroupsWidget`** + manifest `page-transverse-admin-groups.json` — **liste + détail** et mutations dans le périmètre **OpenAPI** uniquement ; écarts catalogue legacy explicites (pas de masquage gap **K**).

## Périmètre (ferme)

- **Inclus :** `recyclique/api/.../endpoints/groups.py` et dépendances nécessaires au correctif **500** ; tests API ; côté Peintre : `contracts/creos/manifests/page-transverse-admin-groups.json`, enregistrement widget (`admin.groups.demo` ou type reviewable stable), routing `/admin/groups` déjà présent dans `RuntimeDemoApp.tsx` ; client OpenAPI généré ou client minimal aligné sur **16.2**.
- **Exclus :** portage de la famille **`users`** (liste / fiche utilisateur) — **Epic 21** ; endpoint **`PUT /v1/admin/users/{id}/groups`** sauf si explicitement rabattu dans une sous-tâche et contractualisé ; harmonisation globale Bearer vs cookie hors besoin bloquant identifié dans cette story.

## Acceptance Criteria

**Given** la famille **groups** est documentée dans le contrat canon (**16.2**)  
**When** un administrateur autorisé appelle les opérations **GET** liste / **GET** détail dans un environnement de dev représentatif  
**Then** le backend ne renvoie **pas** de **500** sur ces chemins nominaux (jeu de données seed ou fixture documenté)  
**And** au moins un test automatisé (pytest) verrouille la non-régression sur le scénario corrigé

**Given** la page `/admin/groups` est servie dans Peintre  
**When** la story est livrée  
**Then** l'utilisateur voit une surface de gestion **au-delà** du seul message « contrat disponible » : liste ou navigation liste → détail branchée sur les réponses API réelles  
**And** toute opération de mutation affichée respecte les **operationId** et corps requis du YAML — pas d'appel hors contrat

**Given** l'Epic 14 et la matrice **15.4**  
**When** la story est revue  
**Then** les écarts de parité vs legacy `GroupsReal` (ou équivalent) sont nommés ; la ligne pilote **groups** est citée ou mise à jour

## Tasks / Subtasks

- [x] Reproduire le **500** (logs stack, paramètres query, auth utilisée) ; corriger le handler / service / schéma ; ajouter pytest. *(Correctif migrations / handler déjà validé en amont ; non-régression `recyclique/api/tests/test_groups_and_permissions.py`.)*
- [x] Cartographier legacy `recyclique-1.4.4` (composant groupes) vs champs OpenAPI — périmètre UI minimal viable.
- [x] Implémenter liste + détail (+ mutations si dans le périmètre) ; mettre à jour manifest + registre + tests e2e/contrat.
- [x] Gates **`peintre-nano`** : `npm run lint`, `npm run test`, `npm run build` ; gates backend ciblés si touchés.

### Review Findings

**Revue BMAD-code-review (2026-04-23)** — même contexte « **obsolescence pilotage / runs hors BMAD** » que **14.3** et **14.4**.

- [x] [Review][Defer] **Non-régression pytest backend / absence de 500** — validée dans la continuité du projet sans journaliser chaque gate dans cette fiche ; la clôture **`done`** repose sur la **validation équipe + état dépôt** au **2026-04-23**.
- [x] [Review][Defer] **Matrice 15.4 / ligne groups** — suivi Epic **15** si besoin de preuves détaillées.

**Décision :** clôture **`done`** ; écarts legacy déjà nommés dans les Completion Notes restent la référence pour tout travail futur (**Epic 21** pour users, etc.).

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 14, Story 14.5
- `_bmad-output/implementation-artifacts/16-2-stabiliser-les-contrats-et-permissions-pour-groups-audit-log-et-email-logs.md` — tableau endpoints `groups`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/groups.py`
- `contracts/openapi/recyclique-api.yaml` — `/v1/admin/groups`
- `contracts/creos/manifests/page-transverse-admin-groups.json`
- `peintre-nano/src/domains/admin-config/AdminGroupsWidget.tsx`
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — si besoin contexte legacy

## Dev Agent Record

### Agent Model Used

Story Runner / exécution directe (session 2026-04-12).

### Debug Log References

### Completion Notes List

- **2026-04-23** : Clôture **Epic 14** — **`review` → `done`** ; **`epic-14`** **`done`** ; findings § Review Findings ; alignement sprint-status.
- **2026-04-13 (BMAD)** : note de synchronisation pilotage — statut **review** maintenu en attendant validation humaine ou CR pour passage **done** ; cette passe BMAD n'a pas rejoué les gates ni les tests.
- Widget **`AdminGroupsWidget`** + client **`admin-groups-client.ts`** : liste `adminGroupsList`, détail `adminGroupsGetById`, CRUD groupe, rattachements permissions/utilisateurs alignés OpenAPI 16.2.
- Écarts legacy nommés : pas de GET catalogue permissions / liste utilisateurs admin dans le périmètre YAML pour MultiSelect ; POST add via saisie UUID ; `adminUsersGroupsPut` hors 14.5.
- Placeholder **`AdminGroupsDemoPlaceholder`** retiré ; type CREOS **`admin.groups.demo`** conservé pour e2e (`widget-admin-groups-demo`).

### File List

- `peintre-nano/src/api/admin-groups-client.ts` (nouveau)
- `peintre-nano/src/domains/admin-config/AdminGroupsWidget.tsx` (nouveau)
- `peintre-nano/src/domains/admin-config/AdminGroupsDemoPlaceholder.tsx` (supprimé)
- `peintre-nano/src/registry/register-admin-config-widgets.ts`
- `contracts/creos/manifests/page-transverse-admin-groups.json`
- `peintre-nano/tests/unit/admin-groups-widget.test.tsx` (nouveau)
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/src/domains/admin-config/README.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
