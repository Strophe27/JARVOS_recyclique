# Story 10.6c : Documenter et valider le spike de migration PostgreSQL 15 → 17 (hors legacy)

**Clé fichier (obligatoire) :** `10-6c-documenter-et-valider-le-spike-de-migration-postgresql-15-17-hors-legacy`  
**Epic :** epic-10  
**Statut :** done

<!-- Note : validation optionnelle — exécuter validate-create-story avant dev-story. -->

## Story

En tant qu'**équipe livraison soucieuse des opérations**,  
je veux un **spike de migration documenté et vérifiable** de PostgreSQL **15 → 17** sur la **stack canonique** du mono-repo,  
afin que la montée de version majeure repose sur un **chemin explicite de migration des données** et non sur un simple changement d'image Docker.

## Acceptance Criteria

Alignement avec `epics.md` (Story 10.6c) — formulation de référence :

1. **Périmètre ADR (hors `recyclique-1.4.4/`)** — Étant donné l'ADR qui exclut le legacy de ce chantier, quand le spike est préparé, la procédure et les preuves ne ciblent que la stack canonique (`docker-compose.yml` racine, `recyclique/api/`, CI en **contexte**, runbooks non legacy) **et** la documentation rappelle qu'**aucune** action de migration n'est requise ni planifiée dans `recyclique-1.4.4/`.

2. **Stratégie de données** — Étant donné qu'une montée majeure PostgreSQL impose une migration de données, quand le spike est terminé, le projet documente **au moins un** chemin validé : **`pg_dump` / `pg_restore`** **et/ou** **`pg_upgrade --check`** (avec notes de décision comparant les options), plus **sauvegarde**, **vérifications**, **rollback** et **risques résiduels** sous une forme bornée exploitable par les mainteneurs.

3. **Doc courte et alignée** — Étant donné que cette story est un spike + opérabilité (pas une réécriture infra cachée), quand elle est acceptée, le livrable est **court, actionnable**, aligné sur l'**ADR** et la **recherche technique** BMAD, **sans** élargir le scope à des refactors de déploiement non liés ni à des changements de compose legacy.

4. **Séparation avec 10.6d / 10.6e** — La story **10.6d** aligne les images compose racine + CI ; la story **10.6e** exerce `recyclique/api` et Alembic sur PG 17. **10.6c** livre le **runbook / preuves du spike** qui **précède** et **justifie** ces étapes ; elle ne doit **pas** modifier les tags `postgres:*` ni les workflows CI (hors citation dans la doc).

*(Critères opérationnels détaillés — BDD.)*

### AC opérationnels (BDD)

**AC 1 — Cible canonique uniquement**

**Étant donné** que l'ADR (`ADR-INFRA-PG17`) exclut `recyclique-1.4.4/` du chantier 15 → 17  
**Quand** le spike est documenté  
**Alors** procédure, commandes et preuves portent sur **`docker-compose.yml` à la racine**, backend **`recyclique/api/`**, et **mention explicite** des jobs CI concernés (`.github/workflows/alembic-check.yml`, `.github/workflows/deploy.yaml`) comme **surfaces à aligner plus tard**  
**Et** le document affirme clairement que le legacy **n'est pas** migré dans ce chantier

**AC 2 — Runbook actionnable (backup → migration test → vérifs → rollback)**

**Étant donné** qu'une migration majeure est risquée sans procédure  
**Quand** le runbook est rédigé  
**Alors** il inclut au minimum :  
- **Backup** : stratégie (`pg_dump` format custom ou SQL, portée, stockage hors machine, test de restauration sur instance vierge 15 si pertinent)  
- **Spike données** : scénario **dump/restore** vers un volume/cluster **17** **ou** étapes **`pg_upgrade --check`** (+ prérequis deux clusters / extensions) avec **décision documentée** (pourquoi l'une ou l'autre, ou les deux en secours)  
- **Vérifications** : `SELECT * FROM pg_extension` sur 15 avant ; post-migration `ANALYZE` ; smoke `alembic upgrade head` et **bornage** des tests pytest (référence à 10.6e pour l'exhaustif applicatif)  
- **Rollback** : restaurer le backup sur instance **15** ou repointer l'application vers l'ancienne instance tant que les données 17 ne sont pas validées  
- **Risques résiduels** : extensions non disponibles en 17, régressions SQL (release notes **16** et **17**), sous-estimation du temps d'arrêt

**AC 3 — Contrainte volumes / compose (résiduelle)**

**Étant donné** que le volume Docker des données **n'est pas** réutilisable entre majeures sans migration  
**Quand** le runbook est lu par un opérateur  
**Alors** il explique l'impact sur le volume nommé (ex. recréation, nouveau volume, pas de `docker pull` seul sur l'existant)  
**Et** toute **coexistence** avec des compose ou volumes **legacy** (`recyclique-1.4.4/`) est traitée comme **contrainte résiduelle / hors migration** (mention explicite seulement si nécessaire à la clarté opérationnelle locale)

**AC 4 — Preuve de validation du spike**

**Étant donné** que « valider le spike » exige des preuves reproductibles  
**Quand** la story est marquée **done** (phase DS ultérieure)  
**Alors** le livrable cite **au moins une** exécution réussie documentée (logs courts, captures de commandes, ou checklist cochée avec date et environnement) pour **dump/restore ou `pg_upgrade --check`** sur une copie de données représentative **ou** jeu minimal documenté  
**Et** les limites de la preuve (taille des données, extensions non couvertes) sont nommées

## Tasks / Subtasks

- [x] Rédiger le **runbook court** (nouveau fichier Markdown dédié, emplacement proposé : `_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md` — ajuster si une convention `doc/` prime après arbitrage équipe) — AC : #2, #3, #4  
  - [x] Section **Inventaire préalable** : `pg_extension`, volumétrie grossière, paramètres custom — AC : #2  
  - [x] Section **Backup + test de restauration** — AC : #2  
  - [x] Section **Option A — dump/restore** (ordre des services compose, arrêt API, commandes types `pg_dump` / `pg_restore`, nouveau volume PG 17) — AC : #2, #3  
  - [x] Section **Option B — pg_upgrade** (`--check`, prérequis binaires 15+17, extensions, espace disque ; lien doc officielle) — AC : #2  
  - [x] Section **Vérifications post-migration** (ANALYZE, extensions, smoke Alembic borné, renvoi à 10.6e pour suite) — AC : #2, #4  
  - [x] Section **Rollback** et **risques résiduels** (tableau court) — AC : #2  
- [x] **Exécuter** le spike sur environnement local ou CI éphémère (copie / anonymisation si données sensibles) et **capturer** la preuve minimale (AC4) — AC : #4  
- [x] Croiser avec **`adr-postgresql-17-migration.md`** et **`technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md`** : aucune contradiction ; ajouter liens relatifs depuis le runbook — AC : #3  
- [x] Mettre à jour **un** point d'entrée doc existant (ex. `README.md` racine, `recyclique/api/README.md`, ou `_bmad-output/planning-artifacts/guide-pilotage-v2.md`) avec **un lien** vers le runbook — AC : #3  
- [x] Vérifier explicitement dans le texte : **aucune** tâche de migration ni de promesse de support sous `recyclique-1.4.4/` — AC : #1  
- [x] **Ne pas** modifier `image: postgres:*` dans compose racine ni dans `.github/workflows/*` dans le cadre de **10.6c** (réservé **10.6d**) — AC : #4 (séparation stories)

## Dev Notes

### Contexte produit et technique

- **Backend canonique** : `recyclique/api/` (FastAPI, SQLAlchemy 2.x, Alembic, `psycopg2-binary` ~2.9.9) — compatible **PG 17** pour un usage typique ; l'inventaire **`pg_extension`** sur les vraies bases reste **obligatoire** avant engagement prod.  
- **Surfaces encore en 15 (constat recherche 2026-04-11)** : `docker-compose.yml` racine (`postgres:15`), `.github/workflows/alembic-check.yml`, `.github/workflows/deploy.yaml`. Elles sont **citées** dans 10.6c pour cohérence de narration ; leur **changement de tag** relève de **10.6d**.  
- **Story précédente (10.6b)** : le point d'entrée Docker local canonique est clarifié ; la stack locale tourne depuis la racine — utile pour décrire **où** lancer les conteneurs pendant le spike.

### Garde-fous (anti-erreurs dev)

- **Ne pas** traiter `recyclique-1.4.4/` comme périmètre de migration 15 → 17 : ni compose, ni données, ni procédure opérateur.  
- **Ne pas** confondre migration **serveur PostgreSQL** et migrations **Alembic** : ordre recommandé dans le runbook — données migrées vers 17 **puis** `alembic upgrade head` sur la base cible (aligné recherche).  
- **Ne pas** livrer uniquement une synthèse narrative : le runbook doit contenir des **commandes** ou une **checklist** exécutable.  
- Tags image : en prod, viser un **tag patch figé** (`postgres:17.x`) une fois la politique release tranchée (ADR).

### Conformité architecture / décisions

- [Source : `_bmad-output/planning-artifacts/architecture/adr-postgresql-17-migration.md` — périmètre, décision cible 17, stratégies dump/restore vs `pg_upgrade`, alignement compose racine + CI + exploitation]  
- [Source : `_bmad-output/planning-artifacts/research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md` — faisabilité, risques, feuille de route, références URL pg_upgrade / release notes 16 & 17]

### Hors périmètre (explicite)

| Hors scope | Raison |
|------------|--------|
| Tout le dossier **`recyclique-1.4.4/`** pour la migration elle-même | ADR + epic : legacy exclu |
| **Alignement** des images `postgres:17` dans compose racine et CI | Story **10.6d** |
| **Preuve exhaustive** Alembic + pytest API sur PG 17 | Story **10.6e** (10.6c peut renvoyer) |
| Montée **Psycopg 3** ou refonte perf hors PG | Recherche : chantier séparé |
| **Réplication logique** / zéro-downtime avancé | ADR : hors défaut sauc RTO/RPO imposés |

### Chemins et artefacts utiles

- `docker-compose.yml` (racine) — service `postgres`, volume données  
- `recyclique/api/` — `pyproject.toml`, Alembic, tests  
- `.github/workflows/alembic-check.yml`, `.github/workflows/deploy.yaml` — contexte CI  
- `_bmad-output/planning-artifacts/architecture/adr-postgresql-17-migration.md`  
- `_bmad-output/planning-artifacts/research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md`  
- `_bmad-output/implementation-artifacts/10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo.md` — continuité point d'entrée Docker

### Tests et validation (bornage story 10.6c)

- **In scope** : preuve reproductible du **spike données** (dump/restore ou `pg_upgrade --check`) + runbook.  
- **Hors scope strict 10.6c** : gates pytest complets sur PG 17 → **10.6e**.  
- Smoke minimal acceptable pour 10.6c : conteneur `postgres:17` + restauration + `alembic current` ou `upgrade head` sur jeu réduit **si** déjà disponible sans déraper vers la charge de 10.6e (documenter le choix).

### Intelligence story précédente (10.6b)

- Point d'entrée **docker compose** documenté à la **racine** ; `recyclique-1.4.4/docker-compose.yml` = compatibilité / include — le runbook spike doit partir de cette réalité pour les instructions locales.

### Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 10, Story 10.6c  
- `_bmad-output/planning-artifacts/architecture/adr-postgresql-17-migration.md`  
- `_bmad-output/planning-artifacts/research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md`  
- PostgreSQL : [pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html), [release notes 17.0](https://www.postgresql.org/docs/release/17.0/), [release notes 16.0](https://www.postgresql.org/docs/release/16.0/)

## Dev Agent Record

### Agent Model Used

Cursor agent (bmad-dev-story / Task) — 2026-04-11.

### Debug Log References

- `docker compose config --quiet` (racine, `POSTGRES_PASSWORD` factice) — exit 0.
- Conteneurs éphémères `postgres:15` / `postgres:17` : `pg_dump -Fc`, `pg_restore`, `pg_upgrade --version` (sorties capturées dans le runbook §9).

### Completion Notes List

- Runbook actionnable créé sous `_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md` avec toutes les sections demandées, liens relatifs vers l’ADR et la recherche BMAD, exclusion explicite du périmètre `recyclique-1.4.4/` pour la migration PG, rappel 10.6d / 10.6e.
- Preuve minimale : dump/restore 15 → 17 sur jeu minimal + `docker compose config` ; `pg_upgrade --check` documenté (exécution complète sur double `PGDATA` reportée en environnement isolé).
- Point d’entrée : lien ajouté dans `README.md` racine (section « Voir aussi »).
- Index architecture BMAD enrichi d’une entrée vers le runbook.
- Aucune modification de `image: postgres:*` ni de `.github/workflows/*`.
- Story 10.6c : statut **done** ; `sprint-status.yaml` : `10-6c-...` → **done** (Story Runner : gates, QA pytest `tests/infra`, CR APPROVED).

### File List

- `_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md` (créé)
- `_bmad-output/planning-artifacts/architecture/index.md` (entrée runbook operations)
- `README.md` (lien vers runbook)
- `tests/infra/test_story_10_6c_pg17_doc_smoke.py` (smoke QA doc)
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (synthèse QA)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (10-6c → done, commentaire d’historique)
- `_bmad-output/implementation-artifacts/10-6c-documenter-et-valider-le-spike-de-migration-postgresql-15-17-hors-legacy.md` (cases cochées, statut, Dev Agent Record)

### Change Log

- **2026-04-11 (DS)** : livraison runbook spike PG 15→17 + preuve Docker ; liens README et index architecture ; sprint-status `10-6c` → `review` ; aucun changement compose/workflows postgres.
- **2026-04-11 (Story Runner)** : QA pytest infra + CR ; `10-6c` → `done` dans sprint-status ; statut story **done**.

---

**Note fin de create-story (CS) :** contexte BMAD généré le **2026-04-11** — analyse exhaustive des epics (10.6c), ADR, recherche technique et sprint-status ; prêt pour **dev-story** (DS) sans passage VS/DS dans cette tâche CS.
