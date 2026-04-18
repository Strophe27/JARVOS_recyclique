# Chantier DB / migrations legacy — exécution contrôlée sur base réelle

**Date :** 2026-03-27  
**Périmètre :** `recyclique-1.4.4/api/` et stack Docker locale `recyclique-1.4.4/`.  
**Type de session :** exécution contrôlée avec backup, correction du chemin de migrations, `alembic upgrade head`, vérifications post-migration et rapport final.  
**Verdict final :** **succès** sur la base Docker locale visée.

**Documents d'entrée :** `references/index.md`, `references/consolidation-1.4.5/index.md`, `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`, `2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md`, `2026-03-27_chantier-db-legacy-decision-execution-1.4.5.md`, `2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md`, plan `chantier-db-legacy_12fcd71c.plan.md`.

---

## 1. État de départ et garde-fous

### 1.1 `git status --short` au lancement

```text
 M references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md
 M references/consolidation-1.4.5/index.md
?? .cursor/commands/revisions-et-rapport.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-decision-execution-1.4.5.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md
```

**Lecture :** worktree non propre, mais pas de modifications applicatives sous `recyclique-1.4.4/**` dans cet instantané. La session reste strictement limitée au chantier **DB/migrations legacy** et à sa documentation dans `references/consolidation-1.4.5/`.

### 1.2 Environnement visé

| Élément | Valeur |
|--------|--------|
| **Cible** | Stack Docker Compose locale `recyclique-1.4.4/docker-compose.yml` |
| **Services actifs au moment du run** | `postgres`, `redis` |
| **Base visée** | `recyclic` dans le conteneur `postgres` |
| **Chemin Alembic opérationnel** | `recyclique-1.4.4/api/` |
| **Head dépôt attendu** | `e8f9a0b1c2d3` |
| **Révision lue avant action** | `a7b3c9d2014f` |

---

## 2. Backup / snapshot avant migration

### 2.1 Backup effectué

**Oui.**

| Élément | Valeur |
|--------|--------|
| **Commande** | `docker compose exec -T postgres pg_dump -U recyclic -d recyclic -Fc -f "/backups/legacy_pre_upgrade_20260327_162955.dump"` |
| **Fichier** | `recyclique-1.4.4/backups/legacy_pre_upgrade_20260327_162955.dump` |
| **Taille observée** | `73165` octets |
| **Horodatage observé** | `2026-03-27 16:29:55` |

**Décision associée :** aucune opération de migration n’a été lancée avant ce dump.

---

## 3. Point bloquant `api-migrations` et correction appliquée

### 3.1 Blocage constaté

Sans correction, le service `api-migrations` voit un graphe périmé :

```text
docker compose run --rm --no-deps api-migrations alembic heads
=> a7b3c9d2014f (head)
```

**Interprétation :** l’image `api-migrations` a été buildée avec un état ancien des migrations et ne reflète pas le dépôt courant.

### 3.2 Correction retenue

Au lieu d’utiliser l’image figée telle quelle, la session a monté explicitement le dossier de migrations du dépôt dans le conteneur :

```text
docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic heads
=> e8f9a0b1c2d3 (head)
```

**Décision :** montage correct des migrations du dépôt pour l’exécution contrôlée.  
**Remarque :** un rebuild de `api-migrations` reste recommandé pour éviter de rejouer ce piège au prochain run.

---

## 4. Actions exécutées

### 4.1 Vérifications préalables

1. `docker compose ps`
2. `docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic heads`
3. `docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic current`
4. `docker compose exec -T postgres psql -U recyclic -d recyclic -c "SELECT version_num FROM alembic_version;"`

**Résultat avant migration :**

- `alembic heads` = `e8f9a0b1c2d3`
- `alembic current` = `a7b3c9d2014f`
- `alembic_version` = `a7b3c9d2014f`

### 4.2 Migration exécutée

Commande utilisée :

```text
docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic upgrade head
```

Sortie observée :

```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade a7b3c9d2014f -> d4e5f6a7b8c1, DATA-03: contrainte FK users.site_id -> sites.id
INFO  [alembic.runtime.migration] Running upgrade d4e5f6a7b8c1 -> e8f9a0b1c2d3, M11E-D: renommer colonnes messagerie legacy vers noms physiques neutres.
```

**Lecture :** deux révisions ont été appliquées, conformément au diagnostic terrain précédent.

---

## 5. Vérifications post-migration

### 5.1 `alembic current`

Commande :

```text
docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic current
```

Résultat :

```text
e8f9a0b1c2d3 (head)
```

### 5.2 Table `alembic_version`

Commande :

```sql
SELECT version_num FROM alembic_version;
```

Résultat :

```text
e8f9a0b1c2d3
```

### 5.3 Points sensibles déjà identifiés

#### FK `users.site_id`

Commande :

```sql
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND contype = 'f'
ORDER BY conname;
```

Résultat :

```text
fk_users_site_id_sites
```

#### Colonnes legacy renommées

Contrôle `users` :

```text
legacy_external_contact_id
site_id
```

Contrôle `registration_requests` + `deposits` :

```text
deposits              | legacy_deposit_channel_user
registration_requests | external_registration_key
```

**Lecture :** les anciens noms `telegram_id` / `telegram_user_id` ne sont plus présents dans les sorties de contrôle ciblées ; les noms attendus après `e8f9a0b1c2d3` sont bien en place.

#### Enums sensibles

```text
userrole   | super-admin, admin, user
userstatus | pending, approved, rejected, active
```

**Lecture :** pas de régression détectée sur `userrole` ni `userstatus`.

---

## 6. Résultat final réel

| Point | Résultat |
|------|----------|
| **Backup préalable** | Fait |
| **Chemin de migrations corrigé** | Oui, via montage du dossier `api/migrations` |
| **`alembic upgrade head`** | Réussi |
| **`alembic current` final** | `e8f9a0b1c2d3 (head)` |
| **`alembic_version` final** | `e8f9a0b1c2d3` |
| **FK `users.site_id`** | Présente |
| **Renommages colonnes legacy** | Appliqués |
| **Verdict** | **Succès** |

---

## 7. Limites et périmètre

- Cette exécution concerne **la base Docker locale** du dépôt.
- Cette note **ne vaut pas** validation automatique pour staging ou production.
- Aucun nettoyage runtime, endpoint, service Telegram ou refactor applicatif n’a été engagé dans cette session.
- Aucun changement de code Alembic n’a été introduit ; la session a exécuté le graphe existant.

---

## 8. Prochaines actions recommandées

1. **Rebuilder `api-migrations`** ou ajouter un montage explicite dans le workflow local pour éviter qu’une image obsolète annonce un faux `head`.
2. **Rejouer le même protocole** sur tout autre environnement visé (staging, production, restore), avec backup préalable et vérifications post-run identiques.
3. **Archiver explicitement le nom du dump** dans tout runbook opératoire local si cette base doit être restaurée.

---

## 9. Synthèse une ligne

**La migration contrôlée de la base Docker locale `recyclic` a été exécutée avec backup préalable ; le blocage `api-migrations` a été contourné par montage du dossier `api/migrations`, `alembic upgrade head` a appliqué `d4e5f6a7b8c1` puis `e8f9a0b1c2d3`, et l’état final réel est bien `e8f9a0b1c2d3 (head)` avec FK `users.site_id` et renommages legacy en place.**
