# Synthèse automatisation des tests — Story 10.6c (spike PG 15→17, doc)

## Contexte

La story **10.6c** livre un **runbook** et des **preuves documentaires** de spike (hors changement de tags `postgres:*` et hors workflows — réservé **10.6d**). Il n’y a **pas** de parcours UI à couvrir en E2E navigateur pour cette story.

## Stratégie QA

| Volet | Approche |
|--------|-----------|
| **Cohérence doc / liens** | Revue manuelle des AC + garde-fous automatisés légers (`tests/infra/test_story_10_6c_pg17_doc_smoke.py`) : présence runbook, liens relatifs vers ADR et recherche, fichiers cibles existants, README et index architecture pointent vers le runbook, mentions 10.6d / 10.6e et hors périmètre legacy. |
| **Compose (non-régression)** | Déjà couvert par **10.6b** : `tests/infra/test_docker_compose_entrypoint.py` (`docker compose config --quiet`, services attendus). **Aucune** modification des tags Postgres dans le cadre QA 10.6c. |
| **Gates applicatifs PG 17** | Hors scope strict 10.6c → **10.6e** (pytest API / Alembic exhaustif). |
| **E2E UI** | **Non requis** pour 10.6c (aucun changement de parcours produit). |

## Tests générés / étendus

### Tests « infra / doc » (Python, pytest)

- [x] `tests/infra/test_story_10_6c_pg17_doc_smoke.py` — Cohérence minimale des livrables doc 10.6c (fichiers + ancres Markdown + séparation stories).
- [x] (existant) `tests/infra/test_docker_compose_entrypoint.py` — Résolution Compose racine / legacy.

### Tests API / E2E UI

- [ ] Non ajoutés : hors périmètre story (documentation + runbook).

## Couverture (indicatif)

- **Endpoints API** : inchangé par 10.6c — pas de nouveau test API.
- **UI E2E** : 0 % attendu pour cette story (N/A).

## Prochaines étapes

- Exécuter `python -m pytest tests/infra` en CI si un job couvre déjà la racine du mono-repo ; sinon l’ajouter au pipeline ciblé (hors périmètre de cette tâche QA générée).
- Après merge **10.6d** / **10.6e** : étendre la stratégie avec tests applicatifs sur image PG 17.

## Validation checklist (workflow Quinn)

- Tests générés : doc smoke + pas d’E2E UI imposé — conforme au bornage story.
- Tous les tests `tests/infra` passent localement après ajout.
