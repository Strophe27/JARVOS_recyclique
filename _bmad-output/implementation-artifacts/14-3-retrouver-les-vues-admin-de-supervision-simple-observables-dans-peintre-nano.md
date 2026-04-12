# Story 14.3 : Retrouver les vues admin de supervision simple observables dans Peintre_nano

Status: backlog

**Story key :** `14-3-retrouver-les-vues-admin-de-supervision-simple-observables-dans-peintre-nano`  
**Epic :** 14

## Cible legacy (référence)

- `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx` : titre **Tableau de Bord d'Administration**, bandeau **HeaderAlerts** / **HeaderCA** / **HeaderUser**, **Statistiques quotidiennes** (agrégats jour), grille **Navigation principale** vers modules admin.

## État Peintre (honête)

- Aucun widget reviewable ne reproduit encore les **données** de supervision (KPIs jour, alertes, utilisateurs en ligne) : cela exige des `operation_id` OpenAPI stables + `data_contract` sur des widgets allowlistés — **hors livraison** de cette session pour éviter toute invention métier UI.
- Le hub CREOS `/admin` porte désormais un **titre d'intention** aligné (Story 14.1) et le **périmètre site** explicite via `ContextEnvelope`.

## Matrice

- Ligne **`ui-pilote-14-03-admin-supervision-simple`** : statut **`Backlog`** jusqu'à conception d'un slice vertical (OpenAPI + CREOS + preuves MCP).

## Prochaine incrémentation suggérée

1. Lister les `operation_id` exacts des GET utilisés par `DashboardHomePage` / headers.
2. Proposer un ou deux widgets `data_contract` plafonnés (lecture seule) + gates.
3. Rejouer parité MCP legacy vs Peintre.
