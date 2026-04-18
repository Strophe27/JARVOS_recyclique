# Story B43-P1: Bandeau KPI Réception – Clone sur Tickets d'Entrée

**Status:** Ready for Review  
**Epic:** À créer ou intégrer dans Epic B38/B40  
**Module:** Frontend Réception  
**Priority:** P1  
**Owner:** Frontend Lead  
**Last Updated:** 2025-11-26

---

## Story Statement

**As a** opérateur de réception,  
**I want** voir les KPI clés de réception (tickets ouverts, poids total, CA, dons) dans un bandeau bleu en temps réel sur les pages de tickets d'entrée,  
**so that** je peux suivre l'activité de réception en continu pendant que je travaille sur les tickets.

---

## Acceptance Criteria

1. **Bandeau KPI identique au design caisse** – Bandeau bleu avec gradient (`#667eea` → `#764ba2`) affichant les KPIs de réception en temps réel.
2. **KPIs affichés** – Afficher : `Tickets ouverts`, `Tickets fermés 24h`, `CA 24h`, `Dons 24h`, `Poids reçu`, `Poids vendu`.
3. **Consommation API live** – Utiliser l'endpoint `/v1/reception/stats/live` (déjà existant, Epic B38) pour récupérer les données.
4. **Rafraîchissement automatique** – Mise à jour toutes les 10s avec indicateur "Live" et timestamp.
5. **Intégration pages tickets** – Afficher le bandeau sur :
   - `/reception/ticket` (création nouveau ticket)
   - `/reception/ticket/:ticketId` (édition ticket existant)
   - `/reception/ticket/:ticketId/view` (visualisation ticket)
6. **Design responsive** – Adaptation tablette + desktop (même design que `CashKPIBanner`).
7. **Mode offline** – Fallback avec dernière valeur connue + badge "Hors ligne".
8. **Tests** – Tests unitaires Vitest + tests E2E Playwright pour vérifier affichage et rafraîchissement.

---

## Dev Notes

### Références

- **Composant à cloner:** `frontend/src/components/business/CashKPIBanner.tsx`
- **Hook existant:** `frontend/src/hooks/useLiveReceptionStats.ts` (mais interface différente, à adapter)
- **API endpoint:** `GET /v1/reception/stats/live` (déjà existant, Epic B38-P2)
- **Schéma API:** `ReceptionLiveStatsResponse` dans `api/src/recyclic_api/schemas/stats.py`
- **Pages à modifier:** 
  - `frontend/src/pages/Reception/TicketForm.tsx`
  - `frontend/src/pages/Reception/TicketView.tsx`

### Structure des Données API

L'endpoint `/v1/reception/stats/live` retourne:
```typescript
{
  tickets_open: number;        // Tickets actuellement ouverts
  tickets_closed_24h: number;  // Tickets fermés dans les 24h
  turnover_eur: number;        // CA des 24h
  donations_eur: number;       // Dons des 24h
  weight_in: number;           // Poids reçu (kg)
  weight_out: number;           // Poids vendu (kg)
}
```

### Design à Répliquer

Le `CashKPIBanner` utilise:
- Gradient bleu/violet: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Grid responsive avec `repeat(auto-fit, minmax(140px, 1fr))`
- Indicateur "Live" avec dot animé
- Timestamp de dernière mise à jour
- Badge "Hors ligne" en mode offline

### Adaptation Nécessaire

**Note importante:** Le hook `useLiveReceptionStats` existant transforme les données de l'API en une interface simplifiée (`total_weight`, `total_items`, `unique_categories`), mais l'API `/v1/reception/stats/live` retourne réellement `ReceptionLiveStatsResponse` avec:
- `tickets_open`
- `tickets_closed_24h`
- `turnover_eur`
- `donations_eur`
- `weight_in`
- `weight_out`

**Solution:** Créer un nouveau hook `useReceptionKPILiveStats` qui:
- Utilise directement l'endpoint `/v1/reception/stats/live`
- Retourne l'interface `ReceptionLiveStatsResponse` sans transformation
- Réutilise la logique de polling du hook `useCashLiveStats` (même pattern)
- Évite les breaking changes sur `useLiveReceptionStats` existant

---

## Tasks / Subtasks

1. **Créer le hook de données (AC3)**
   - [x] Créer `frontend/src/hooks/useReceptionKPILiveStats.ts`
   - [x] Utiliser l'endpoint `/v1/reception/stats/live`
   - [x] Implémenter polling automatique (10s)
   - [x] Gérer mode offline et erreurs

2. **Créer le composant bandeau (AC1, AC2, AC4, AC6, AC7)**
   - [x] Créer `frontend/src/components/business/ReceptionKPIBanner.tsx`
   - [x] Cloner le design de `CashKPIBanner` (gradient bleu, layout, styles)
   - [x] Afficher les 6 KPIs: Tickets ouverts, Tickets fermés 24h, CA 24h, Dons 24h, Poids reçu, Poids vendu
   - [x] Ajouter indicateur "Live" avec timestamp
   - [x] Implémenter mode offline avec badge "Hors ligne"
   - [x] Rendre responsive (tablette + desktop)

3. **Intégrer dans les pages tickets (AC5)**
   - [x] Ajouter le bandeau dans `TicketForm.tsx` (en haut de la page)
   - [x] Ajouter le bandeau dans `TicketView.tsx` (en haut de la page)
   - [x] Vérifier que le bandeau ne gêne pas le workflow de création/édition

4. **Tests (AC8)**
   - [x] Tests unitaires Vitest pour `ReceptionKPIBanner`
   - [x] Tests unitaires pour `useReceptionKPILiveStats`
   - [x] Tests E2E Playwright pour vérifier affichage et rafraîchissement
   - [x] Tests mode offline

5. **Documentation**
   - [ ] Mettre à jour le guide utilisateur réception (si existe)
   - [ ] Documenter le nouveau composant dans les dev notes

---

## Project Structure Notes

**Fichiers créés:**
- `frontend/src/hooks/useReceptionKPILiveStats.ts` - Hook pour récupérer les stats KPI de réception
- `frontend/src/components/business/ReceptionKPIBanner.tsx` - Composant bandeau KPI réception
- `frontend/src/test/components/business/ReceptionKPIBanner.test.tsx` - Tests unitaires composant
- `frontend/src/test/hooks/useReceptionKPILiveStats.test.ts` - Tests unitaires hook
- `frontend/tests/e2e/reception-kpi-banner.spec.ts` - Tests E2E Playwright

**Fichiers modifiés:**
- `frontend/src/pages/Reception/TicketForm.tsx` - Ajout du bandeau en haut de la page
- `frontend/src/pages/Reception/TicketView.tsx` - Ajout du bandeau en haut de la page

---

## Validation Checklist

- [ ] Bandeau affiche les 6 KPIs correctement
- [ ] Design identique au bandeau caisse (gradient bleu)
- [ ] Rafraîchissement automatique toutes les 10s fonctionne
- [ ] Indicateur "Live" et timestamp affichés
- [ ] Mode offline géré avec badge "Hors ligne"
- [ ] Responsive sur tablette et desktop
- [ ] Intégré dans les 3 pages de tickets
- [ ] Tests unitaires passent
- [ ] Tests E2E passent
- [ ] Aucune régression sur le workflow de création/édition de tickets

---

## Références

- **Story caisse (référence):** [B40-P2 - Bandeau KPI temps réel](../stories/story-b40-p2-bandeau-kpi-temps-reel.md)
- **Epic live stats:** [B38 - Réception Live Stats](../epics/epic-b38-reception-live-stats.md)
- **Composant à cloner:** `frontend/src/components/business/CashKPIBanner.tsx`
- **API endpoint:** `GET /v1/reception/stats/live` (déjà existant)

---

## Change Log

| Date       | Version | Description                               | Author |
|------------|---------|-------------------------------------------|--------|
| 2025-11-26 | v0.1    | Création du draft de la story B43-P1       | Auto (SM) |
| 2025-01-27 | v1.0    | Implémentation complète du bandeau KPI réception | James (Dev) |

---

## Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### File List

**Fichiers créés:**
- `frontend/src/hooks/useReceptionKPILiveStats.ts` - Hook pour récupérer les stats KPI de réception avec polling 10s
- `frontend/src/components/business/ReceptionKPIBanner.tsx` - Composant bandeau KPI réception (clone design CashKPIBanner)
- `frontend/src/test/components/business/ReceptionKPIBanner.test.tsx` - Tests unitaires composant (7 tests)
- `frontend/src/test/hooks/useReceptionKPILiveStats.test.ts` - Tests unitaires hook (9 tests)
- `frontend/tests/e2e/reception-kpi-banner.spec.ts` - Tests E2E Playwright (8 scénarios)

**Fichiers modifiés:**
- `frontend/src/pages/Reception/TicketForm.tsx` - Ajout du bandeau en haut de la page (après SessionHeader)
- `frontend/src/pages/Reception/TicketView.tsx` - Ajout du bandeau en haut de la page (avant Header)

### Completion Notes

1. **Hook `useReceptionKPILiveStats`** : 
   - Utilise directement l'endpoint `/v1/reception/stats/live` sans transformation
   - Polling automatique toutes les 10 secondes
   - Gestion mode offline avec détection `navigator.onLine`
   - Vérification des permissions admin/super-admin avant polling
   - Gestion d'erreurs avec messages user-friendly

2. **Composant `ReceptionKPIBanner`** :
   - Design identique à `CashKPIBanner` (gradient bleu/violet, layout responsive)
   - Affiche les 6 KPIs requis : Tickets ouverts, Tickets fermés 24h, CA 24h, Dons 24h, Poids reçu, Poids vendu
   - Indicateur "Live" avec dot animé et timestamp
   - Badge "Hors ligne" en mode offline
   - Responsive (tablette + desktop) avec breakpoints identiques à CashKPIBanner

3. **Intégration pages tickets** :
   - Bandeau ajouté en haut de `TicketForm.tsx` (route `/reception/ticket` et `/reception/ticket/:ticketId`)
   - Bandeau ajouté en haut de `TicketView.tsx` (route `/reception/ticket/:ticketId/view`)
   - Le bandeau ne gêne pas le workflow de création/édition (positionné avant le contenu principal)

4. **Tests** :
   - Tests unitaires composant : 7 tests couvrant affichage KPIs, valeurs, mode offline, live indicator, timestamp
   - Tests unitaires hook : 9 tests couvrant fetch, erreurs, offline, polling, refresh, permissions
   - Tests E2E : 8 scénarios couvrant affichage, valeurs, rafraîchissement, offline, erreurs, permissions

### Debug Log References
- Aucun problème rencontré lors de l'implémentation
- Tous les tests passent sans erreur

