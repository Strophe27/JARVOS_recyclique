---
adr_id: ADR-INFRA-PG17
status: accepted
date: 2026-04-11
deciders: Strophe (produit / pilotage), alignement architecture BMAD
consulted: Technical Research 2026-04-11
---

# ADR — Version cible PostgreSQL 17 et stratégie de migration (Recyclique)

## Contexte

- Le **backend vivant** du produit est **`recyclique/api/`** (FastAPI, SQLAlchemy 2.x, Alembic, schéma métier + outbox sync).
- **PostgreSQL** en reste la source de vérité transactionnelle pour cette API.
- **Périmètre exclu (décision produit / maintenance)** : le dossier **`recyclique-1.4.4/`** est traité comme **legacy** — **aucune** action de migration PostgreSQL, **aucun** alignement de compose ou de stack n’est attendu dans ce chantier pour ce périmètre. Les éventuels fichiers `docker-compose*` ou bases y restant relèvent d’une trajectoire séparée ou de l’abandon.
- Les surfaces **dans le périmètre** de ce chantier qui portent la **cible PostgreSQL 17** pour la stack canonique sont : **`docker-compose.yml` à la racine** du mono-repo (stack locale canonique, `api` → `build.context: ./recyclique/api`) et la **CI** (`.github/workflows/alembic-check.yml`, `.github/workflows/deploy.yaml`) — alignées sur **`postgres:17`** (story **10.6d** ; tag patch figé en prod si la politique release l’exige).
- Une **Technical Research** documente la faisabilité et les options (`_bmad-output/planning-artifacts/research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md`).
- Les epics **fonctionnels** (ex. Epic 8 sync Paheko, Epic 11 parité UI) restent **orthogonaux** : cette décision est **infrastructure / données**, pas un changement de périmètre métier des epics.

## Décision

1. **Version cible** : porter l’environnement officiellement supporté vers **PostgreSQL 17** (image Docker **`postgres:17`** avec **tag patch figé** en production après validation, pas le tag flottant `17` seul en prod si la politique release l’exige).
2. **Stratégie de migration des données** : pour la stack canonique Docker, la voie **par défaut** documentée est **`pg_dump` / `pg_restore`** vers un nouveau volume/cluster **17** ; le runbook associé en détaille backup, vérifications et rollback. Alternatives à conserver selon contrainte d’exploitation :
    - **`pg_dump` / `pg_restore`** (voie par défaut) — privilégié quand la simplicité opérationnelle prime ;
    - **`pg_upgrade`** — à envisager quand le ratio temps d’arrêt / espace disque l’impose, après `pg_upgrade --check` et inventaire des extensions ;
    - **Réplication logique** — option avancée (réduction de downtime), hors périmètre par défaut sauf RTO/RPO imposés.
3. **Alignement des surfaces (périmètre du chantier)** : toute montée de version **majeure** impose de mettre à jour **en cohérence** :
   - **Compose** : uniquement **`docker-compose.yml` à la racine** (service `postgres` + stack `api` → `recyclique/api`) ; tout **autre** fichier compose utilisé pour des **environnements officiellement supportés** hors legacy (ex. futur compose racine staging/prod si introduit) suivra la même règle au moment où il sera porté dans le périmètre — **pas** `recyclique-1.4.4/`.
   - **CI** : services `postgres` des workflows (au minimum `alembic-check`, `deploy` — revérifier tout nouveau job qui ajouterait Postgres).
   - **Exploitation** : procédures de backup/restore et runbook opérateur pour les environnements **non legacy** couverts par ce chantier.
4. **Stack applicative** : pas de changement d’architecture logicielle imposé par cette ADR : **SQLAlchemy** et **Alembic** sous **`recyclique/api/`** restent les outils de schéma ; les migrations existantes s’exécutent sur la cible **17** après migration des **données** et tests (inventaire `pg_extension`, jeux de tests API, `alembic upgrade head` sur base de test **17**).

## Alternatives considérées

| Option | Pour | Contre |
|--------|------|--------|
| Rester en **15** | Zéro effort migration | Dette : fin de support, écart avec objectif projet |
| Saut direct **18** (ou « dernière LTS ») | Maximiser longévité | Recherche et risque plus grands ; **17** suffit comme palier documenté |
| **17** (retenu) | Compromis support / maturité / documentation ; aligné recherche | Fenêtre de maintenance et validation obligatoires |

## Conséquences

### Positives

- Cible unique documentée pour **dev local (compose racine), CI et runbooks** des environnements **non legacy** ; réduction des écarts « ça marche en local ».
- Base pour stories dédiées (Epic **10** doc/stack, ou stories techniques transverses) sans **Correct Course** tant que les epics produit ne sont pas réécrits.

### Négatives / contraintes

- **Migration majeure** : pas de simple `docker pull` sur le volume existant ; besoin de procédure, sauvegarde, plan de rollback.
- **Extensions PostgreSQL** : compatibilité à valider par environnement (`SELECT * FROM pg_extension`).
- **Charge de validation** : relecture des release notes **16** et **17**, tests de non-régression applicative.

## Conformité avec `core-architectural-decisions.md`

- La décision « PostgreSQL comme base métier centrale » est **inchangée**.
- L’ancienne formulation (montée **18.x** comme décision d’infrastructure séparée, sans palier intermédiaire figé) est **remplacée pour le palier courant** par cette ADR (**17** d’abord). Une montée ultérieure vers **18+** fera l’objet d’**une décision d’architecture distincte** (nouvel ADR ou addendum) après stabilisation en **17**.

## Références

- Recherche technique BMAD : `planning-artifacts/research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md` (relatif à `_bmad-output/`, racine du mono-repo)
- Runbook spike / migration données : `planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md`
- PostgreSQL : [pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html), [release notes 17.0](https://www.postgresql.org/docs/release/17.0/), [release notes 16.0](https://www.postgresql.org/docs/release/16.0/)

## Suivi BMAD

- **Create Epics and Stories** / **Create Story** : découper la mise en œuvre (image + CI + runbook + validation) sans les mélanger aux livrables **Epic 11** sauf dépendance explicite (tests sur la même CI).
- **Check Implementation Readiness** : à relancer si la trajectoire infra modifie des contraintes déjà passées en revue.
