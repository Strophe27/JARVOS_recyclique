# Story B45-P8: Rapports Programmés

**Statut:** Draft  
**Épopée:** [EPIC-B45 – Audit Sessions Avancé](../epics/epic-b45-audit-sessions-avance.md)  
**Module:** Backend API + Frontend Admin  
**Priorité:** P8 (Phase 3 - Expert)

## 1. Contexte

Pour automatiser les exports récurrents, il est nécessaire de pouvoir configurer des rapports programmés qui s'envoient automatiquement par email. Cette fonctionnalité permet de recevoir régulièrement les données d'audit sans intervention manuelle.

Cette story fait partie de la Phase 3 (Expert) de l'Epic B45.

## 2. User Story

En tant que **administrateur**, je veux **configurer des rapports programmés qui s'envoient automatiquement par email**, afin de recevoir régulièrement les données d'audit sans intervention manuelle.

## 3. Critères d'acceptation

1. **Interface de configuration** : Modal pour créer/modifier rapports programmés
2. **Fréquence** : Quotidien, Hebdomadaire, Mensuel, Personnalisé (cron)
3. **Destinataires** : Liste emails (multi-sélection)
4. **Format** : CSV ou Excel
5. **Filtres** : Appliquer mêmes filtres que dans interface
6. **Jobs en arrière-plan** : Utiliser `APScheduler` (décision technique)
7. **Envoi par email** : Email avec pièce jointe
8. **Logs des envois** : Historique des envois (succès/échec)
9. **Gestion erreurs** : Retry automatique, notifications en cas d'échec

## 4. Intégration & Compatibilité

- **Système email existant** : Système d'envoi email existe (rapports sessions fermées)
- **Design** : Suivre architecture interface définie dans B45-P0
- **Jobs** : `APScheduler` (décision technique)

## 5. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture
2. **Design UX** : `docs/ux/audit-sessions-advanced-design.md` - Architecture interface (validé dans B45-P0)
3. **Décisions techniques** : `docs/architecture/technical-decisions-b45.md` - `APScheduler` choisi
4. **Frontend** : `docs/architecture/6-architecture-des-composants.md` - Patterns composants React
5. **API** : `docs/architecture/7-design-et-intgration-api.md` - Design API et intégration
6. **Testing** : `docs/testing-strategy.md` - Standards de tests

### Décision Technique (Architect)

**Solution Jobs** : ✅ **`APScheduler`**
- Simple à intégrer dans FastAPI
- Pas de broker externe nécessaire
- Suffisant pour rapports programmés
- Redis déjà disponible si besoin de queue

**Référence** : `docs/architecture/technical-decisions-b45.md` - Section 2

### Composant UI - ScheduledReportsModal (Design UX)

**Référence** : `docs/ux/audit-sessions-advanced-design.md` - Component: ScheduledReportsModal

**Spécifications** :
- **Variants** : Create (création nouveau rapport), Edit (modification rapport existant)
- **Position** : Menu "⚙️ Paramètres" → "Rapports programmés"
- **Formulaire** : Fréquence, destinataires, format, filtres
- **Validation** : Côté client avant soumission

**User Flow détaillé** : Voir `docs/ux/audit-sessions-advanced-design.md` - Flow 7: Rapports Programmés (Phase 3)

### Modèle ScheduledReport

**Backend** : Créer modèle `ScheduledReport`
```python
class ScheduledReport(Base):
    id: UUID
    user_id: UUID (ForeignKey users)
    name: str
    type: str (enum: "cash_session" | "reception_ticket")
    frequency: str (enum: "daily" | "weekly" | "monthly" | "custom")
    cron_expression: str (si custom)
    recipients: List[str] (emails)
    format: str (enum: "csv" | "excel")
    filters_json: JSONB
    enabled: bool
    last_run: DateTime (optionnel)
    next_run: DateTime
    created_at: DateTime
    updated_at: DateTime
```

### Nouveaux Endpoints à Créer

**Backend API** :

1. **`GET /v1/admin/scheduled-reports`**
   - **Response** : Liste rapports programmés de l'utilisateur

2. **`POST /v1/admin/scheduled-reports`**
   - **Body** : Configuration nouveau rapport
   - **Response** : Rapport créé

3. **`PUT /v1/admin/scheduled-reports/{id}`**
   - **Body** : Configuration modifiée
   - **Response** : Rapport mis à jour

4. **`DELETE /v1/admin/scheduled-reports/{id}`**
   - **Response** : Rapport supprimé

5. **`GET /v1/admin/scheduled-reports/{id}/logs`**
   - **Response** : Historique des envois (succès/échec)

### Service Jobs Programmés

**Backend** : Créer service `scheduled_reports_service.py`
- **Méthode** : `schedule_report(report)` → Créer job APScheduler
- **Méthode** : `run_report(report_id)` → Générer et envoyer rapport
- **Méthode** : `retry_failed_report(report_id)` → Réessayer envoi

### Intégration APScheduler

**Backend** : Intégrer APScheduler dans FastAPI
- **Startup** : Charger tous les rapports actifs au démarrage
- **Schedule** : Créer jobs selon fréquence
- **Execution** : Exécuter jobs en arrière-plan

### Fichiers à Créer/Modifier

**Frontend** :
- `frontend/src/pages/Admin/Settings.tsx` : Ajouter section "Rapports programmés"
- `frontend/src/components/ScheduledReportsModal.tsx` : Nouveau composant modal
- `frontend/src/services/scheduledReportsService.ts` : Nouveau service
- `frontend/src/pages/Admin/SessionManager.tsx` : Bouton "Sauvegarder comme rapport programmé" (optionnel)

**Backend** :
- `api/src/recyclic_api/models/scheduled_report.py` : Nouveau modèle
- `api/src/recyclic_api/services/scheduled_reports_service.py` : Nouveau service
- `api/src/recyclic_api/api/api_v1/endpoints/scheduled_reports.py` : Nouveaux endpoints
- `api/src/recyclic_api/core/scheduler.py` : Intégration APScheduler
- `api/src/recyclic_api/main.py` : Initialiser scheduler au démarrage

### Points d'Attention Techniques

1. **Performance** : Jobs en arrière-plan pour ne pas bloquer API
2. **Retry** : Retry automatique en cas d'échec (3 tentatives)
3. **Logs** : Logger tous les envois (succès/échec) pour traçabilité
4. **Notifications** : Notifier utilisateur en cas d'échec répété

## 6. Tasks / Subtasks

- [ ] **Backend - Installation APScheduler** (AC: 6)
  - [ ] Installer `APScheduler` dans `requirements.txt`
  - [ ] Vérifier compatibilité FastAPI

- [ ] **Backend - Modèle ScheduledReport** (AC: 1-9)
  - [ ] Créer modèle `ScheduledReport`
  - [ ] Créer migration
  - [ ] Tests modèle (pytest)

- [ ] **Backend - Service Jobs** (AC: 6, 7, 8, 9)
  - [ ] Créer service `scheduled_reports_service.py`
  - [ ] Implémenter intégration APScheduler
  - [ ] Implémenter génération et envoi rapport
  - [ ] Implémenter retry automatique
  - [ ] Implémenter logs envois
  - [ ] Tests service (pytest)

- [ ] **Backend - Endpoints Rapports Programmés** (AC: 1-9)
  - [ ] Créer endpoints CRUD (`GET`, `POST`, `PUT`, `DELETE`)
  - [ ] Créer endpoint logs (`GET /logs`)
  - [ ] Tests endpoints (pytest)

- [ ] **Frontend - Composant ScheduledReportsModal** (AC: 1, 2, 3, 4, 5)
  - [ ] Créer composant modal
  - [ ] Formulaire : Fréquence, destinataires, format, filtres
  - [ ] Validation côté client
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Interface Configuration** (AC: 1)
  - [ ] Ajouter section "Rapports programmés" dans Settings
  - [ ] Liste rapports existants
  - [ ] Actions : Créer, Modifier, Supprimer, Activer/Désactiver
  - [ ] Tests composant (React Testing Library)

- [ ] **Frontend - Service ScheduledReports** (AC: 1-9)
  - [ ] Créer service `scheduledReportsService.ts`
  - [ ] Méthodes CRUD
  - [ ] Tests service (Jest)

- [ ] **Tests d'intégration** (AC: 1-9)
  - [ ] Test création rapport programmé (pytest)
  - [ ] Test exécution job (pytest)
  - [ ] Test envoi email (pytest)
  - [ ] Test retry (pytest)

- [ ] **Tests E2E** (AC: 1-9)
  - [ ] Test workflow : Créer rapport → Vérifier envoi (Playwright/Cypress)

## 7. Testing

### ⚠️ CRITIQUE - Leçons Apprises sur les Tests

**Références obligatoires avant de créer les tests** :
- **[docs/tests-problemes-p5-prevention.md](../tests-problemes-p5-prevention.md)** - Checklist complète de prévention (OBLIGATOIRE avant de créer les tests)
- **[docs/tests-problemes-brief.md](../tests-problemes-brief.md)** - Résumé des problèmes rencontrés (B42-P2, B42-P3)
- **[docs/tests-problemes-pattern-analyse.md](../tests-problemes-pattern-analyse.md)** - Analyse des patterns d'échecs
- **[docs/tests-problemes-QUICK-FIX.md](../tests-problemes-QUICK-FIX.md)** - Corrections rapides
- **[docs/tests-problemes-guide-agents.md](../tests-problemes-guide-agents.md)** - Guide complet pour agents dev

**Problèmes récurrents à éviter** :
- Tests non montés dans Docker (vérifier `docker-compose.yml`)
- Imports incorrects (`import jwt` au lieu de `from jose import jwt`)
- Node.js WSL incompatible (vérifier version 18+)
- Tests créés mais jamais exécutés (exécuter immédiatement après création)

**Action immédiate** : Vérifier Docker config, Node.js version, et exécuter les tests après création.

### Standards de Tests

- **Tests unitaires** : Jest (frontend) + pytest (backend)
- **Tests d'intégration** : pytest pour endpoints API et jobs
- **Tests E2E** : Playwright ou Cypress pour workflows complets
- **Standards** : Suivre `docs/testing-strategy.md`

### Tests Critiques

1. **Jobs** : Vérifier exécution jobs selon fréquence
2. **Email** : Vérifier envoi email avec pièce jointe
3. **Retry** : Vérifier retry automatique en cas d'échec
4. **Logs** : Vérifier logs tous les envois

## 8. Dépendances

- **B45-P0** : Design UX doit être complété (fait)
- **B45-P1** : Export Global doit exister (prérequis logique)
- **B45-P3** : Format Excel doit exister (optionnel)

## 9. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Création story initiale | Bob (SM) |

## 10. Dev Agent Record

### Agent Model Used
_À remplir par le dev agent_

### Debug Log References
_À remplir par le dev agent_

### Completion Notes List
_À remplir par le dev agent_

### File List
_À remplir par le dev agent_

## 11. QA Results
_À remplir par le QA agent_

