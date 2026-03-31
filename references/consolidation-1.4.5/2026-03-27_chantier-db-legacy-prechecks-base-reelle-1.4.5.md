# Chantier DB / migrations legacy — préchecks sur base réelle (constat terrain)

**Date :** 2026-03-27  
**Périmètre :** `recyclique-1.4.4/api/` (Alembic opérationnel), lecture seule sur une base PostgreSQL accessible. **Aucune migration exécutée** dans cette session ; **aucun DDL** ni `upgrade` lancé.

**Documents de référence :** `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`, `2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md`, `2026-03-27_chantier-db-legacy-decision-execution-1.4.5.md`, plan `chantier-db-legacy_12fcd71c.plan.md`.

---

## 1. `git status --short` (début de session, racine `JARVOS_recyclique`)

```
 M references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md
 M references/consolidation-1.4.5/index.md
?? .cursor/commands/revisions-et-rapport.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-decision-execution-1.4.5.md
```

**Lecture :** présence de fichiers hors périmètre strict DB (`journal`, commande Cursor). La mission de préchecks **n’embarque pas** de modifications sous `recyclique-1.4.4/**`. Les livrables de cette session se limitent à la documentation sous `references/consolidation-1.4.5/`. **Instantané figé :** n’inclut pas les fichiers créés **après** ce snapshot (ex. cette note elle-même) ; relancer `git status` pour l’état courant.

---

## 2. Environnement visé (preuve opératoire)

| Élément | Valeur |
|--------|--------|
| **Cible** | Stack **Docker Compose** du dépôt `recyclique-1.4.4/` (fichier `docker-compose.yml`), service **`postgres`**, conteneur actif **`recyclique-144-postgres-1`** (nom réel observé sur la machine d’exécution). |
| **Base** | `recyclic` (valeur par défaut `POSTGRES_DB` dans le compose, cohérente avec l’usage local). |
| **Accès SQL** | `docker compose exec -T postgres psql -U recyclic -d recyclic -c '…'` depuis le répertoire `recyclique-1.4.4/`. **Aucun secret n’est recopié dans ce document.** |
| **Nature de l’analyse** | Base **locale Docker** alignée sur le workflow dev du projet — **pas** une assertion sur production ou staging distants. |

---

## 3. Sorties Alembic (preuves)

### 3.1 Tête du graphe dans le dépôt (`alembic heads`)

- **Commande :** `python -m alembic heads` depuis `recyclique-1.4.4/api/` (Python hôte, variables d’environnement factices suffisantes pour importer `Settings` : seul le graphe de fichiers est lu).
- **Sortie :** `e8f9a0b1c2d3 (head)`

### 3.2 `alembic heads` / `alembic current` contre la base (image migrations + graphe à jour)

L’image Docker **`api-migrations`** embarque une **copie figée** des migrations au **build**. Sans rebuild ni montage de volume, **`alembic heads` dans le conteneur** a affiché **`a7b3c9d2014f (head)`** — **incohérent** avec le dépôt courant.

**Contournement utilisé pour ce constat :** montage du dossier des révisions du dépôt sur `/app/migrations` (répertoire de travail = racine `recyclique-1.4.4/`). Sous **bash** : `${PWD}` ou `$(pwd)`. Sous **PowerShell** : `${PWD}` fonctionne avec `docker compose` en général ; en cas d’échec, utiliser un **chemin absolu** vers `…/recyclique-1.4.4/api/migrations`. Sous **CMD** : `%CD%\api\migrations`.

```text
docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic heads
docker compose run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic current
```

**Sorties observées :**

- **`alembic heads` :** `e8f9a0b1c2d3 (head)`
- **`alembic current` :** `a7b3c9d2014f`

### 3.3 Lecture directe de `alembic_version` (recoupement)

```sql
SELECT version_num FROM alembic_version;
```

**Résultat :** une seule ligne, `a7b3c9d2014f` — **aligné** avec `alembic current`.

---

## 4. Chaîne de migrations manquantes (dépôt → jusqu’à head)

Entre la révision **effective en base** et la **tête du dépôt** :

```text
a7b3c9d2014f -> d4e5f6a7b8c1 (DATA-03: FK users.site_id -> sites.id, nettoyage orphelins)
d4e5f6a7b8c1 -> e8f9a0b1c2d3 (M11E-D: renommage colonnes messagerie legacy)
```

**Deux révisions** non appliquées sur cette base.

---

## 5. État réel : enums, colonnes legacy, contraintes sensibles

### 5.1 Enums PostgreSQL

- **`userrole` :** `super-admin`, `admin`, `user` — **cohérent** avec l’intention head (cf. migration `07d1d205a8c6`).
- **`userstatus` :** `pending`, `approved`, `rejected`, `active` — **cohérent** avec le schéma attendu côté modèles / init.

### 5.2 Colonnes « messagerie legacy » (attendu : renommage par `e8f9a0b1c2d3`)

| Table | Colonne en base (constat) | Nom attendu après `e8f9a0b1c2d3` |
|--------|---------------------------|-------------------------------------|
| `users` | `telegram_id` (+ index `ix_users_telegram_id`) | `legacy_external_contact_id` (+ `ix_users_legacy_external_contact_id`) |
| `registration_requests` | `telegram_id` (+ `ix_registration_requests_telegram_id`) | `external_registration_key` (+ index dédié) |
| `deposits` | `telegram_user_id` | `legacy_deposit_channel_user` |

**Constat :** les **anciens noms physiques** sont encore présents — **cohérent** avec l’**absence** de la migration `e8f9a0b1c2d3`.

### 5.3 Contrainte `users.site_id` → `sites.id`

- Requête sur `pg_constraint` pour les FK dont `conrelid = 'public.users'::regclass` : **aucune FK** sur `users` au moment du contrôle.
- **Attendu après `d4e5f6a7b8c1` :** FK `fk_users_site_id_sites` (nom défini dans la migration).

**Constat :** la migration **`d4e5f6a7b8c1` n’est pas appliquée** ; la colonne `site_id` existe mais **sans** la contrainte de référence vers `sites`.

### 5.4 Autres points sensibles (lecture ciblée)

- **`legacy_category_mapping_cache` :** table **présente**.
- **Orphelins `users.site_id` :** `COUNT(*) = 0` pour les lignes dont `site_id` ne référence pas `sites.id` — **favorable** avant application de `d4e5f6a7b8c1` (la migration prévoit un nettoyage si besoin).
- **Colonnes `deposits` :** `ai_classification`, `ai_confidence` **présentes** (héritage déjà identifié en cartographie).

---

## 6. Écart contre Alembic head (synthèse)

| Couche | État |
|--------|------|
| **Fichiers de migration (dépôt)** | Tête **`e8f9a0b1c2d3`**. |
| **Table `alembic_version` (base inspectée)** | **`a7b3c9d2014f`**. |
| **DDL sensible vs head** | Pas de FK `users.site_id` ; colonnes messagerie encore `telegram_*` / `telegram_user_id`. |
| **Enums** | Déjà alignés avec l’intention head sur cette instance. |

**Interprétation :** l’écart est **structuré par l’historique Alembic** (révisions non appliquées), **pas** une dérive ad hoc type script parallèle détectée sur ces points.

---

## 7. Verdict

**En retard** par rapport au **head du dépôt** (`e8f9a0b1c2d3`), avec **deux migrations** à appliquer pour rattraper.

**Non retenu pour cette base :** « aligné » (révision ≠ head), « divergent » au sens d’une branche Alembic concurrente ou d’un schéma manuel incompatible (non démontré ici — le schéma observé correspond à l’état **avant** `d4e5` / `e8f9`).

---

## 8. Recommandation suivante

| Action | Décision |
|--------|----------|
| **Rien à faire** | **Non** — rattrapage migrations nécessaire pour aligner DDL et noms de colonnes sur le code / modèles actuels. |
| **Migration Alembic** | **Oui** — enchaîner `d4e5f6a7b8c1` puis `e8f9a0b1c2d3` via `alembic upgrade head` **après** snapshot / backup de la base concernée et **après** rebuild ou montage cohérent des migrations (voir §9). **Rappel plan :** exiger un **dump ou snapshot exploitable** avant toute action destructive ; cette session n’a fait que de la **lecture** (aucun backup créé ici). |
| **Script de nettoyage de données** | **Non requis** immédiatement sur cette instance pour `d4e5` (orphelins site_id = 0) ; **à réévaluer** sur d’autres environnements avant `upgrade`. |
| **Rollback requis avant suite** | **Non** — pas d’action destructive engagée dans cette session ; avant un `upgrade` réel, prévoir **restauration backup** comme filet (les `downgrade` partiels sur `e8f9` restent une limite connue, cf. cartographie). |

---

## 9. Alertes opératoires (hors périmètre runtime, mais bloquantes pour les migrations)

1. **Image `api-migrations` périmée :** si `docker compose run api-migrations` est utilisé **sans** monter le dossier `api/migrations` à jour **ni** rebuild, Alembic peut croire à tort que **`a7b3c9d2014f` est la tête**. **Recommandation :** `docker compose build api-migrations` après toute évolution du graphe, ou montage explicite des migrations comme ci-dessus.
2. **Environnements non couverts :** ce document ne remplace pas un **`alembic current` + inspection SQL** sur **staging / production** ; mêmes commandes à rejouer avec les accès autorisés.

---

## 10. Synthèse une ligne

**Sur la base Docker `recyclic` inspectée : `alembic_version` = `a7b3c9d2014f` ; head dépôt = `e8f9a0b1c2d3` ; enums déjà bons ; FK `users.site_id` et renommages M11E manquants — verdict **en retard** ; prochaine étape **backup puis `alembic upgrade head`** (outillage migrations à jour), sans mélange avec du nettoyage runtime.**

---

*Session en lecture seule ; cohérente avec `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`.*
