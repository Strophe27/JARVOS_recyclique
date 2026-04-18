# Runbook — Spike migration PostgreSQL 15 → 17 (stack canonique, hors legacy)

**Périmètre :** migration **serveur** des données de la stack **canonique** du mono-repo (`docker-compose.yml` à la racine, backend `recyclique/api/`).  
**Hors périmètre explicite :** tout le dossier **`recyclique-1.4.4/`** — **aucune** procédure de migration PostgreSQL 15 → 17, **aucun** engagement de support ni d’alignement d’image n’y est prévu dans ce chantier (aligné [ADR-INFRA-PG17](../architecture/adr-postgresql-17-migration.md)).

**Décisions d’alignement d’image Docker / CI :** le changement de `image: postgres:*` dans le compose racine et dans `.github/workflows/*` relève de la story **10.6d** ; la validation applicative exhaustive Alembic + pytest sur PG 17 relève de la story **10.6e**. Ce document **précède** ces étapes et les justifie.

**Références BMAD :**

- [ADR — PostgreSQL 17 et stratégie de migration](../architecture/adr-postgresql-17-migration.md)
- [Recherche technique — migration 15 → 17](../research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md)

**Alignement images (story 10.6d, dev/CI) :** le compose racine et les jobs Postgres de `.github/workflows/alembic-check.yml` et `.github/workflows/deploy.yaml` ciblent **`postgres:17`** (tag flottant acceptable ici ; en production, un tag patch figé peut être préféré selon l’ADR). **La migration des données** d’une instance ou d’un volume encore en 15 reste couverte par les sections ci-dessous — ce n’est pas un simple changement d’image sur place.

**Documentation PostgreSQL :** [pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html), [release notes 16.0](https://www.postgresql.org/docs/release/16.0/), [release notes 17.0](https://www.postgresql.org/docs/release/17.0/).

---

## 1. Inventaire préalable

À exécuter sur l’instance **source (15)** avant toute fenêtre de migration.

| Étape | Commande / action | Objectif |
|--------|-------------------|----------|
| Extensions | `SELECT extname, extversion FROM pg_extension ORDER BY 1;` | Détecter les extensions non portées ou à recompiler en 17 (voir risques). |
| Volumétrie | `SELECT pg_database_size(current_database());` et `SELECT pg_size_pretty(sum(pg_total_relation_size(oid))) ...) FROM pg_class WHERE relkind = 'r';` (adapter) | Dimensionner temps de dump/restore et espace disque. |
| Paramètres | `SHOW all;` ou lecture de `postgresql.conf` / overrides | Repérer les réglages custom à reporter sur le cluster 17. |
| Versions clients outils | `pg_dump --version` (image 15) vs cible 17 | Cohérence des formats (`-Fc` recommandé pour le spike et la prod). |

**Checklist opérateur :**

- [ ] Liste des extensions validée contre la doc 17.
- [ ] Fenêtre d’interruption acceptée (dump/restore = arrêt quasi complet des écritures sur la source pendant le dump cohérent).
- [ ] Espace disque : au minimum **2× taille base** (dump + données 17) en marge prudente.

---

## 2. Backup et test de restauration

**Stratégie recommandée (canonique) :** `pg_dump` **format custom** (`-Fc`) vers un fichier **hors** le volume Docker de données (ex. hôte, S3, partage réseau chiffré). Le format custom permet `pg_restore` parallèle (`-j`) et restauration partielle.

**Exemple (compose racine, service `postgres`) — à adapter (mots de passe, noms) :**

```bash
# Arrêt des écritures applicatives recommandé avant dump cohérent (voir §4).
docker compose stop api

docker compose exec -T postgres pg_dump -U recyclic -Fc -f /backups/recyclic_pre_pg17_$(date +%Y%m%d_%H%M).dump "${POSTGRES_DB:-recyclic}"
```

Le compose racine monte `./recyclique-1.4.4/backups` sur `/backups` : utiliser un chemin **hors** dépôt en prod si la politique de secrets l’exige ; en spike, un répertoire hôte dédié suffit.

**Test de restauration :** sur une instance **PostgreSQL 15 vierge** (conteneur ou VM), créer une base vide et :

```bash
pg_restore --no-owner --no-acl -d recyclic /chemin/vers/dump.dump
```

Valider connexion, `SELECT count(*) FROM ...` sur tables critiques, et un smoke `alembic current` (voir §6).

---

## 3. Option A — `pg_dump` / `pg_restore` (chemin privilégié par défaut)

**Pourquoi en premier :** simplicité, peu de prérequis binaires côte à côte, adapté aux volumes Docker (nouveau volume PG 17).

**Ordre opérationnel suggéré :**

1. **Inventaire** (§1) + **backup** (§2).
2. `docker compose stop api` (et tout service écrivant en base).
3. `pg_dump` depuis le conteneur `postgres` **15** (ou binaire 15 compatible avec le cluster).
4. **Préparer un nouveau volume** pour PostgreSQL **17** (ne pas réutiliser le volume `postgres_data` des données 15 tel quel — voir §8).
5. Basculer l’image / service vers **17** (story **10.6d**) avec le **nouveau** volume monté sur `/var/lib/postgresql/data`.
6. Démarrer Postgres **17** seul, `pg_restore` vers la base cible, puis `docker compose run --rm api-migrations` (Alembic) puis `docker compose up` (§6).

**Exemple de restore sur cluster 17 vierge :**

```bash
docker compose exec -T postgres pg_restore -U recyclic -d "${POSTGRES_DB:-recyclic}" --no-owner --no-acl /backups/recyclic_pre_pg17_YYYYMMDD.dump
```

**Décision vs option B :** conserver **pg_upgrade** comme option si le ratio **temps d’arrêt / espace** ou les contraintes réseau favorisent une mise à jour **in-place** des fichiers de données — uniquement après `pg_upgrade --check` OK et inventaire extensions (§4).

---

## 4. Option B — `pg_upgrade` (dont `--check`)

**Prérequis :** binaires **15** et **17** disponibles sur **la même machine** que les répertoires de données, deux répertoires `PGDATA` (ancien cluster initialisé en 15, nouveau vide initialisé avec `initdb` en 17), **même locale** / encodage, extensions compatibles. Voir la [documentation officielle pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html).

**Étape de validation sans modifier les données :**

```bash
# Exemple de forme ; chemins réels à adapter (anciens/nouveaux PGDATA).
pg_upgrade \
  --old-bindir=/usr/lib/postgresql/15/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-datadir=/var/lib/postgresql/15/data \
  --new-datadir=/var/lib/postgresql/17/data \
  --check
```

Un `--check` **réussi** indique que la procédure d’upgrade **devrait** passer ; en cas d’échec, corriger les points signalés (extensions, OID, espace disque, locale) avant fenêtre prod.

**Espace disque :** `pg_upgrade` peut nécessiter une copie temporaire importante des relations ; prévoir marge conforme à la doc et au rapport de volumétrie (§1).

**Extensions :** toute extension non fournie en binaire pour la version cible bloque ou impose rebuild — croiser avec l’inventaire `pg_extension`.

---

## 5. Vérifications post-migration

| Vérification | Commande / action |
|--------------|-------------------|
| Extensions présentes | `SELECT extname, extversion FROM pg_extension ORDER BY 1;` sur **17** |
| Statistiques | `ANALYZE;` (ou `VACUUM ANALYZE` sur schémas critiques) |
| Migrations schéma | `docker compose run --rm api-migrations` (Alembic `upgrade head`) |
| Smoke applicatif | Healthcheck API, parcours minimal métier |
| Tests automatisés | **Bornage 10.6c :** smoke ciblé acceptable ici ; **suite complète** pytest / non-régression sur PG 17 → story **10.6e** |

**Ordre logique :** données migrées vers **17** **puis** `alembic upgrade head` sur la base cible (ne pas inverser).

---

## 6. Rollback

| Stratégie | Description |
|-----------|-------------|
| **Restaurer le backup sur une instance 15** | Remonter un volume/cluster **15** + `pg_restore` (ou replay du dernier backup cohérent) ; repointer `DATABASE_URL` vers cette instance tant que la base **17** n’est pas validée. |
| **Repointage applicatif** | Si l’ancienne instance **15** est encore intacte (non détruite), basculer temporairement l’API vers elle (variables d’environnement / secrets). |

**Condition :** intégrité du **dernier backup testé** (§2) avant bascule prod.

---

## 7. Risques résiduels (synthèse)

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Extension indisponible ou incompat en 17 | Blocage restore ou `pg_upgrade` | Inventaire §1 ; plan B dump filtré / retrait extension ; build depuis sources si supporté |
| Régressions SQL / planner (notes **16** et **17**) | Requêtes plus lentes ou résultats différents | Relecture release notes ; tests charge sur requêtes critiques (**10.6e**) |
| Sous-estimation du temps d’arrêt | Dépassement fenêtre | Mesure du dump/restore sur copie ; parallélisation `-j` ; planification |
| Volume Docker réutilisé à tort | Cluster qui ne démarre pas ou corruption | **§8** — toujours nouveau volume ou procédure `pg_upgrade` documentée |

---

## 8. Volumes Docker et `docker-compose.yml` (racine)

- Un **volume nommé** contenant des fichiers de données initialisés sous **PostgreSQL 15** **n’est pas** réutilisable en changeant seulement `image: postgres:17` : le moteur refusera de démarrer ou risquera corruption.
- **Chemins sûrs :** créer un **nouveau** volume (ex. `postgres_data_v17`) et y restaurer ; ou utiliser `pg_upgrade` avec chemins `PGDATA` distincts puis basculer le point de montage.
- **Coexistence locale :** le compose racine monte des chemins sous `recyclique-1.4.4/` (**backups**, **logs**) pour commodité dev — cela **ne** place **pas** le legacy dans le périmètre **migration PG 15→17** ; ne pas interpréter ces montages comme une obligation de migrer la stack legacy.

---

## 9. Preuve du spike (exécution réelle)

**Environnement :** machine de développement Windows, Docker Engine, date d’exécution **2026-04-11**.  
**Données :** jeu **minimal** (base `recyclic`, table utilisateur `spike_proof`, extension par défaut `plpgsql` uniquement) — **non** représentatif d’une base Recyclique complète (extensions métier, volumétrie réelle : à inventorier en prod, §1).

### 9.1 Validation `docker compose` (contexte mono-repo)

```text
$env:POSTGRES_PASSWORD="devconfigonly"; docker compose config --quiet
# exit code 0 — compose racine valide (aucune modification d’image dans cette story).
```

### 9.2 Chaîne `pg_dump` (15) → `pg_restore` (17)

**Conteneurs éphémères :** `postgres:15` puis `postgres:17`, dump custom `-Fc`.

**Extraits de sortie :**

```text
-- Inventaire extensions sur PG 15 (jeu minimal)
 extname | extversion
---------+------------
 plpgsql | 1.0

-- Après pg_restore sur PG 17
 id |    note
----+-------------
  1 | spike 10.6c

                                                      version
--------------------------------------------------------------------------------------------------------------------
 PostgreSQL 17.9 (Debian 17.9-1.pgdg13+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit
```

**Limites de la preuve :** pas d’extensions tierces (PostGIS, `pg_trgm`, etc.), pas de schéma complet `recyclique/api` sur cette copie minimaliste. La preuve démontre la **faisabilité technique** du transfert **15 → 17** via dump/restore pour un jeu contrôlé.

**Complément applicatif (story 10.6e) :** l’exécution **`alembic upgrade head`** contre une base **PostgreSQL 17** fraîche est couverte par un smoke pytest au mono-repo : `tests/infra/test_story_10_6e_pg17_backend_smoke.py` (prérequis : Docker CLI + `pip install -r recyclique/api/requirements.txt` depuis la racine du dépôt). Cela valide le **chemin de migration Alembic** sur le moteur 17, distinctement de la preuve dump/restore du §9.2.

### 9.3 Disponibilité de `pg_upgrade` (binaires officiels images Docker)

**Preuve partielle :** pas d’exécution complète de `pg_upgrade --check` avec deux `PGDATA` réels dans cette session (prérequis machine / double data dir) ; disponibilité des binaires :

```text
pg_upgrade (PostgreSQL) 15.14 (Debian 15.14-1.pgdg13+1)
pg_upgrade (PostgreSQL) 17.9 (Debian 17.9-1.pgdg13+1)
```

**Suite recommandée :** exécuter `pg_upgrade --check` sur une **copie** des répertoires de données réels dans un environnement isolé reproduisant la prod, conformément au §4.

---

## 10. Synthèse décisionnelle (dump/restore vs `pg_upgrade`)

| Critère | `pg_dump` / `pg_restore` | `pg_upgrade` |
|---------|-------------------------|--------------|
| Complexité opérationnelle | Faible à moyenne | Moyenne à élevée |
| Temps d’arrêt typique | Lié à durée dump + restore | Souvent plus court qu’un full restore massif |
| Docker / nouveau volume | Très naturel | Exige montage soigné des deux `PGDATA` et binaires |
| Validation | Jeu minimal OK (§9.2) | À valider par `--check` sur copie représentative |

**Décision par défaut documentée :** privilégier **dump/restore** pour la stack canonique Docker tant que la volumétrie et la fenêtre l’acceptent ; garder **`pg_upgrade`** comme option si les contraintes d’arrêt ou d’espace l’imposent, après `--check` réussi.

---

_Fin du runbook spike 10.6c._
