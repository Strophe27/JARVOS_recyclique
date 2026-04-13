# Story 14.3 : Retrouver les vues admin de supervision simple observables dans Peintre_nano

Status: review

**Story key :** `14-3-retrouver-les-vues-admin-de-supervision-simple-observables-dans-peintre-nano`  
**Epic :** 14

## Découpage BMAD (2026-04-12, clarifié 2026-04-13)

- **Cette story (14.3)** reste centrée sur la **parité du tableau de bord admin** (KPIs / alertes / utilisateurs en ligne / navigation d’intention) alignée sur `DashboardHomePage.jsx` — voir sections ci-dessous.
- **`audit-log`** : **Story 14.4** (`14-4-…`).
- **`groups`** : **Story 14.5** (`14-5-…`).
- **`users`** : **Epic 21** uniquement — hors 14.x.
- **Supervision réception / rapports caisse** détaillée hors hub unique : **Epics 18–19** (ne pas les réattribuer rétroactivement au seul 14.3).

## Cible legacy (référence)

- `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx` : titre **Tableau de Bord d'Administration**, bandeau **HeaderAlerts** / **HeaderCA** / **HeaderUser**, **Statistiques quotidiennes** (agrégats jour), grille **Navigation principale** vers modules admin.

## État Peintre (réconciliation code 2026-04-13)

- Le widget **`admin.legacy.dashboard.home`** — **`AdminLegacyDashboardHomeWidget`** (`peintre-nano/src/widgets/admin/AdminLegacyDashboardHomeWidget.tsx`) charge des **données réelles** pour le périmètre « supervision simple » du dashboard : statistiques **jour** (CA, dons, poids réception / vente via `fetchCashSessionStatsSummary` + `fetchReceptionStatsSummary`), **CA mois**, **notifications** (session caisse ouverte, tickets réception ouverts), **utilisateurs connectés** (`/v1/admin/users/statuses` + liste utilisateurs admin), grille de navigation vers modules (dont chemins `/admin/audit-log`, etc.).
- Le hub CREOS `/admin` expose titre d’intention, **périmètre site** via `ContextEnvelope`, et ce widget en slot **`admin.dashboard.legacy`** (voir `peintre-nano/docs/03-contrats-creos-et-donnees.md`).
- **Reste ouvert avant `done` :** preuve de **parité fine** vs legacy (MCP / matrice **15.4**, ligne **`ui-pilote-14-03-admin-supervision-simple`**), jeux de données représentatifs, et **revue / CR** explicite — d’où le statut **`review`** plutôt que fermeture anticipée.

## Matrice

- Ligne **`ui-pilote-14-03-admin-supervision-simple`** : à **mettre à jour** avec ce qui est prouvé (widget + endpoints utilisés) vs écarts nommés — ne plus laisser comme simple « Backlog » si le pilote reflète l’implémentation actuelle.

## Prochaine incrémentation suggérée

1. Mettre à jour la matrice / preuves pour le bloc dashboard (alignement champs, cas vides, erreurs).
2. Trancher les écarts résiduels vs `DashboardHomePage.jsx` (libellés, ordre, seuils d’alertes) comme dette nommée ou correctifs ciblés.
3. Passage **`review` → `done`** après validation humaine (CR) si les AC Epic 14.3 sont tenues.

## Dev Agent Record (reconciliation BMAD)

### Completion Notes List

- **2026-04-13** : Alignement statut **`sprint-status.yaml`** et présent fichier sur l’état **réel** du dépôt ; correction de la note obsolète « aucun widget ne reproduit les KPIs ».

### File List (indicatif, périmètre dashboard)

- `peintre-nano/src/widgets/admin/AdminLegacyDashboardHomeWidget.tsx`
- `peintre-nano/src/api/admin-legacy-dashboard-client.ts`
- `peintre-nano/src/api/dashboard-legacy-stats-client.ts`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/api/reception-client.ts`
- `contracts/creos/manifests/page-transverse-admin-reports-hub.json` (slot dashboard legacy)
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (présence `admin-legacy-dashboard-home` sur `/admin`)
