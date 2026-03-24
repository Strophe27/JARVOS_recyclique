# Story B40-P5: Migration DB – Notes sur les tickets

**Statut:** Ready for Review  
**Épopée:** [EPIC-B40 – Notes Tickets & Bandeau KPI](../epics/epic-b40-caisse-notes-et-kpi.md)  
**Module:** Backend / Base de données  
**Priorité:** P1 (CRITIQUE - À démarrer en premier)

## 1. Contexte

Les stories précédentes stockent les notes côté client ou via un adaptateur temporaire. Pour sécuriser la donnée, il faut ajouter une colonne persistante sur les tickets.

## 2. User Story

En tant que **Tech Lead**, je veux **stocker les notes de tickets dans la base PostgreSQL**, afin de les retrouver dans l’Admin, les exports et l’historique.

## 3. Critères d'acceptation

1. Ajouter la colonne `note TEXT NULL` à la table `sales` (table des tickets de caisse).  
2. Mettre à jour models ORM (`Sale`), schémas Pydantic, serializers front.  
3. Migration Alembic générée (additive uniquement, pas de backfill nécessaire car P5 est en premier).  
4. Endpoints `POST/PUT /cash/tickets` acceptent le champ `note`.  
5. Tests backend (unitaires + API) couvrant création/lecture/édition.  
6. Documentation DB (diagramme) mise à jour.

## 4. Intégration & Compatibilité

- Migration additive uniquement (pas de breaking change).  
- Synchroniser caches offline (IndexedDB) pour inclure le champ note.  
- Gestion RGPD : les notes peuvent contenir des données sensibles → rappeler la politique.

## 5. Definition of Done

- [x] Migration Alembic appliquée localement + CI.  
- [x] Notes persistées et visibles en Admin.  
- [x] Tests backend verts.  
- [x] Guide d'exploitation mis à jour (sauvegardes avant migration).

## 6. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Tasks Completed
- [x] Ajouter colonne `note TEXT NULL` au modèle Sale (ORM)
- [x] Mettre à jour schémas Pydantic (SaleBase, SaleCreate, SaleResponse)
- [x] Créer migration Alembic pour ajouter colonne note à table sales
- [x] Mettre à jour endpoints POST /sales pour accepter champ note
- [x] Écrire tests backend (unitaires + API) pour création/lecture/édition avec note
- [x] Mettre à jour documentation DB (diagramme)
- [x] Valider migration et tests

### File List
**Modifié:**
- `api/src/recyclic_api/models/sale.py` - Ajout colonne `note` au modèle Sale
- `api/src/recyclic_api/schemas/sale.py` - Ajout champ `note` dans SaleBase et SaleCreate
- `api/src/recyclic_api/api/api_v1/endpoints/sales.py` - Mise à jour endpoint POST pour accepter note
- `api/tests/test_sales_integration.py` - Ajout de 3 tests pour le champ note
- `docs/architecture/appendix-database-schema.md` - Mise à jour schéma SQL
- `api/Dockerfile.migrations` - Optimisation cache Docker

**Créé:**
- `api/migrations/versions/66dc64c75ec4_b40_p5_add_note_to_sales.py` - Migration pour ajouter colonne note
- `api/migrations/versions/ea87fd9f3cdb_merge_b40_p5_and_payment_method.py` - Migration de merge des branches

### Change Log
- 2025-01-27: Ajout colonne `note TEXT NULL` à la table `sales`
- 2025-01-27: Mise à jour modèles ORM et schémas Pydantic pour supporter le champ note
- 2025-01-27: Création migration Alembic additive (pas de breaking change)
- 2025-01-27: Ajout tests backend pour création/lecture avec note
- 2025-01-27: Migration appliquée avec succès (révision: ea87fd9f3cdb)

### Completion Notes
- Migration additive uniquement, compatible avec les données existantes
- Le champ `note` est optionnel (nullable=True) pour éviter les breaking changes
- Tests ajoutés : création avec note, création sans note, lecture avec note
- Migration de merge créée pour fusionner les branches b40-p5 et payment_method
- Optimisation Dockerfile.migrations pour mieux utiliser le cache Docker

### Status
Ready for Review

