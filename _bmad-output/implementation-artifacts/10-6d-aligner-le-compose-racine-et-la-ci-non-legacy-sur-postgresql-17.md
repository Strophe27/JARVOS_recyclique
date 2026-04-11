# Story 10.6d : Aligner le compose racine et la CI non legacy sur PostgreSQL 17

**Clé fichier (obligatoire) :** `10-6d-aligner-le-compose-racine-et-la-ci-non-legacy-sur-postgresql-17`  
**Epic :** epic-10  
**Statut :** done

## Story

En tant qu'**équipe plateforme livraison**,  
je veux que la **stack locale canonique** et les **services PostgreSQL des workflows CI** ciblent **PostgreSQL 17** de façon cohérente,  
afin que le développement et les contrôles automatisés ne divergent plus sur la version majeure supportée.

## Acceptance Criteria

Alignement avec `epics.md` (Story 10.6d) :

1. **Surfaces ADR** — Étant donné l'ADR qui nomme `docker-compose.yml` racine et les workflows listés, quand l'alignement est fait, le service `postgres` racine et les services `postgres` pertinents dans `.github/workflows/alembic-check.yml` et `.github/workflows/deploy.yaml` ciblent **PostgreSQL 17** (tag `postgres:17` ou **tag patch documenté** si figé volontairement).
2. **Périmètre non legacy** — Aucun changement sous `recyclique-1.4.4/` pour cette migration ; aucune promesse de support ajoutée côté legacy.
3. **Prérequis données** — La doc / commentaires renvoient au **runbook 10.6c** (`runbook-spike-postgresql-15-vers-17.md`) pour la **migration des données** (un bump d'image seul ne suffit pas sur volume existant).
4. **Traçabilité** — Mise à jour de ce fichier story, de `sprint-status.yaml`, et des références BMAD pertinentes (runbook, ADR si nécessaire) sans élargir le scope.

## Tasks / Subtasks

- [x] Remplacer `postgres:15` par **`postgres:17`** (ou tag patch documenté) dans :
  - [x] `docker-compose.yml` racine (service `postgres`) + **commentaire** renvoyant au runbook pour migration données
  - [x] `.github/workflows/alembic-check.yml`
  - [x] `.github/workflows/deploy.yaml` (tous les jobs `services.postgres` concernés)
- [x] Mettre à jour le **runbook** spike : section « surfaces encore en 15 » → état **post-10.6d** + lien procédure données inchangé
- [x] Ajuster l'**ADR** ou un index si le texte affirmait encore « fixent PostgreSQL 15 » pour les surfaces canoniques
- [x] Étendre le **smoke pytest** `tests/infra/test_story_10_6c_pg17_doc_smoke.py` (ou équivalent minimal) pour verrouiller `postgres:17` sur compose + workflows du périmètre
- [x] `sprint-status.yaml` : story **10-6d** → `done` après gates + QA + CR

## Dev Notes

### Contexte

- **Précédent :** 10.6c a livré le runbook et les preuves de spike ; **10.6d** aligne uniquement les **tags d'image** surface (compose racine + CI listée).
- **Hors scope :** `recyclique-1.4.4/` (compose staging/prod legacy, scripts legacy) — **ne pas modifier**.
- **Tag :** `postgres:17` acceptable pour dev/CI (ADR : patch figé possible en prod après validation).

### Fichiers cibles (strict)

| Fichier | Action |
|---------|--------|
| `docker-compose.yml` | `image: postgres:17` + commentaire runbook |
| `.github/workflows/alembic-check.yml` | `image: postgres:17` |
| `.github/workflows/deploy.yaml` | `image: postgres:17` (test-fast, test-complete) |
| `_bmad-output/.../runbook-spike-postgresql-15-vers-17.md` | Actualiser la phrase sur les surfaces |
| `tests/infra/test_story_10_6c_pg17_doc_smoke.py` | Assertions image 17 |

### Gates (brief)

- `docker compose config --quiet`
- `python -m pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q`

## Story completion status

- **CS :** fichier story créé (`ready-for-dev`)
- **VS :** critères d’acceptation et périmètre validés pour l’implémentation
- **DS :** tags `postgres:17` (compose racine, `alembic-check`, `deploy`) ; runbook + ADR actualisés ; smoke pytest étendu
- **Gates :** `docker compose config --quiet` OK ; `pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q` OK (6 tests)
- **QA :** couverture par smoke infra (pas d’e2e navigateur requis pour ce chantier YAML)
- **CR :** revue structurelle — changements bornés, hors `recyclique-1.4.4/`, cohérence ADR/runbook
