# Validation locale Docker — `recyclique-1.4.4` (parcours d'installation)

**Date :** 2026-03-27  
**Périmètre :** **100 % machine locale** ; aucune référence à staging ou production distants.  
**Type de session :** inventaire des stacks Docker Desktop, recoupement avec les notes DB déjà rédigées, diagnostic de fragilités, **sans** déploiement ni modification du `docker-compose.yml` (décision utilisateur requise pour tout changement d'infra).

**Entrées lues :** `references/index.md`, `references/consolidation-1.4.5/index.md`, les sept notes du 2026-03-27 listées dans la mission (décision DB, cartographie, décision exécution, préchecks base réelle, exécution contrôlée).

---

## 1. `git status --short` (instantané au passage de cette note)

```
 M references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md
 M references/consolidation-1.4.5/index.md
?? .cursor/commands/revisions-et-rapport.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-decision-execution-1.4.5.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-execution-controlee-1.4.5.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md
```

**Lecture :** rien sous `recyclique-1.4.4/**` dans cet instantané ; le chantier de cette note reste documentation + index. Relancer la commande avant une session qui toucherait au code applicatif.

---

## 2. Inventaire Docker Desktop (hôte Windows, session 2026-03-27)

### 2.1 Projets `docker compose ls`

| Nom Compose | Fichier(s) de config | État listé |
|-------------|----------------------|------------|
| **`recyclic`** | `…/Recyclic/docker-compose.yml` (chemin historique hors `JARVOS_recyclique`) | exited |
| **`recyclic-local`** | `JARVOS_recyclique/recyclique-1.4.4/docker-compose.yml` | exited |
| **`recyclique-144`** | **même** `recyclique-1.4.4/docker-compose.yml` | partiellement actif (services en cours sur l'hôte) |

**Point clé :** **`recyclic-local` et `recyclique-144` ne sont pas deux codebases différentes** : c'est le **même** `docker-compose.yml`, avec un **nom de projet Compose différent** (`-p` ou variable d'environnement). Conséquences :

- **Volumes PostgreSQL distincts** (`postgres_data` est préfixé par le nom du projet) : les données de « Recyclique local » et de « RECYCLIQUE-144 » **ne sont pas** la même base.
- **Ports hôte identiques dans le fichier** (`5432`, `6379`, `8000`, `4444`) : **une seule** de ces stacks peut tenir ces ports en même temps sans conflit.

### 2.2 Conteneurs observés (`docker ps -a`, extrait utile)

| Préfixe / correspondance utilisateur | Conteneurs notables | État au moment du contrôle |
|--------------------------------------|---------------------|----------------------------|
| **Recyclic** (historique) | `recyclic-postgres-1`, `recyclic-api-1`, `recyclic-frontend-1`, `recyclic-redis-1`, `recyclic-api-migrations-1` | arrêtés (dernière activité ancienne) |
| **Recyclique local** | `recyclic-local-postgres-1`, `…-redis-1`, `…-api-1`, `…-frontend-1`, `…-api-migrations-1` | **tous arrêtés** |
| **RECYCLIQUE-144** | `recyclique-144-postgres-1`, `recyclique-144-redis-1`, `recyclique-144-api-migrations-1` | Postgres et Redis **Up** ; migrations en `Exited (0)` |

**Alignement avec tes noms :** « Recyclic » ≈ projet **`recyclic`** (dossier `Recyclic/`). « Recyclique local » ≈ **`recyclic-local`**. « RECYCLIQUE-144 » ≈ **`recyclique-144`** (stack de test actuelle sur cet hôte).

---

## 3. Vérification lecture seule — base de la stack **recyclique-144**

Commande exécutée depuis `recyclique-1.4.4/` :

```text
docker compose -p recyclique-144 exec -T postgres psql -U recyclic -d recyclic -c "SELECT version_num FROM alembic_version;"
```

**Résultat :** `e8f9a0b1c2d3` — **aligné** avec la tête Alembic du dépôt et avec le rapport **`2026-03-27_chantier-db-legacy-execution-controlee-1.4.5.md`**.

**Limite :** aucune relecture de l'état des bases des projets **`recyclic`** ou **`recyclic-local`** dans cette session (conteneurs arrêtés ou non interrogés).

---

## 4. Sous-brique DB / migrations (résumé opératoire)

- **Source de vérité schéma :** Alembic sous `recyclique-1.4.4/api/migrations/`, tête **`e8f9a0b1c2d3`** (voir note de décision et cartographie).
- **Chemin nominal migrations :** depuis le repo, `docker compose` avec service **`api-migrations`** qui exécute `alembic upgrade head` (voir `docker-compose.yml`).
- **Fragilité documentée :** l'image **`api-migrations`** peut embarquer un graphe de migrations **périmé** ; sans **rebuild** ou **montage** de `./api/migrations`, `alembic heads` dans le conteneur peut annoncer une fausse tête (cf. préchecks base réelle et exécution contrôlée).
- **`create_schema.py` :** hors chemin nominal pour reproduire le schéma complet (ne pas l'utiliser comme substitut à Alembic pour un « from scratch » fidèle).

---

## 5. Fiabilité de l'installation locale Docker (verdict)

| Question | Réponse |
|----------|---------|
| Le dépôt `recyclique-1.4.4` définit-il un parcours Compose cohérent (postgres, redis, api, migrations, frontend dev) ? | **Oui** sur le papier (`docker-compose.yml` lu). |
| La stack **recyclique-144** actuellement active a-t-elle une BDD alignée sur le head Alembic ? | **Oui** (`alembic_version` = `e8f9a0b1c2d3`). |
| Un `docker compose up` from scratch a-t-il été rejoué entièrement dans cette session ? | **Non** — volontairement, en accord avec la consigne de ne pas « déployer » avant choix sur les stacks. |
| Risques résiduels sur l'installation locale ? | **Oui** : secrets `.env` obligatoires, conflits de ports entre projets, image migrations à jour, écarts config documentés dans l'audit config/ops (README, dépendances, etc.). |

**Synthèse une ligne :** sur l'hôte inspecté, la stack **recyclique-144** est **cohérente côté migrations** avec le code ; la **fiabilité globale « from scratch »** reste à **valider par un run complet** (build + up + healthchecks) quand tu auras tranché quelle stack garder et laquelle arrêter/supprimer.

---

## 6. Blocages et fragilités (liste courte)

1. **Plusieurs projets Compose pour un seul fichier** : confusion possible sur **quelle base** est servie sur `localhost:5432` (actuellement celle de **recyclique-144** si c'est elle qui est up).
2. **Ports fixes** `5432` / `6379` : impossible de faire tourner **recyclic-local** et **recyclique-144** en parallèle sans surcharger les ports dans un `.env` ou un override.
3. **Image `api-migrations`** potentiellement désynchronisée du dossier `api/migrations` du disque — exiger **rebuild** après changement de révisions ou **montage** explicite (déjà utilisé dans l'exécution contrôlée).
4. **Variables d'environnement** : `POSTGRES_PASSWORD`, `SECRET_KEY`, etc. requis ; sans `.env` local, l'hôte ne peut pas toujours exécuter `alembic current` hors conteneur (cf. note décision exécution).
5. **Ancienne stack `recyclic` (dossier Recyclic/)** : vie séparée du mono-repo `JARVOS_recyclique` ; risque de double vérité si on la confond avec `recyclique-1.4.4`.

---

## 7. Choix à trancher avec toi (garder / arrêter / supprimer)

Aucune action destructive n'a été lancée depuis cet agent. Proposition de cadre décisionnel :

| Option | Intérêt | Inconvénient / condition |
|--------|---------|---------------------------|
| **Garder uniquement `recyclique-144`** comme référence locale 1.4.4 | C'est celle qui tourne aujourd'hui et dont la BDD est au head | Arrêter l'autre projet (`recyclic-local`) pour libérer les ports si besoin de la relancer |
| **Consolider sur un seul nom de projet** (ex. toujours `-p recyclique-144` ou toujours `recyclic-local`) | Moins de ambiguïté sur les volumes | Il faudra **abandonner** ou **exporter puis recréer** le volume de l'autre projet si tu veux une seule base |
| **Archiver la stack historique `recyclic` (dossier Recyclic)** | Réduit la confusion « ancien vs 1.4.4 » | Perte d'accès direct à l'ancien environnement sauf si tu gardes les volumes / un export |
| **Supprimer conteneurs + volumes d'un projet** | Repartir vraiment from scratch sur ce projet | **Perte de données** de la base correspondante — dump obligatoire avant si quelque chose compte |

**Recommandation prudente :** avant `docker compose down -v` sur quoi que ce soit, **`pg_dump`** (ou copie du dossier `backups/` du projet) pour le volume que tu veux conserver ou comparer.

---

## 8. Protocole local proposé (build → up → migrations → smoke)

À exécuter **depuis** `recyclique-1.4.4/`, après avoir choisi le **nom de projet** (`-p recyclique-144` ou autre) et un **`.env`** valide.

1. **Build** (après pull ou changement de Dockerfile / deps)  
   `docker compose -p <projet> build`

2. **Up**  
   `docker compose -p <projet> up -d postgres redis`  
   puis services applicatifs selon besoin :  
   `docker compose -p <projet> up -d api`  
   (frontend : `up -d frontend` si besoin du port 4444)

3. **Migrations**  
   - Soit laisser le service **`api-migrations`** passer au `up` (selon ton flux habituel).  
   - Soit, pour éviter le piège de l'image périmée, enchaîner comme dans l'exécution contrôlée :  
     `docker compose -p <projet> run --rm --no-deps -v "${PWD}/api/migrations:/app/migrations:ro" api-migrations alembic upgrade head`  
     (sous PowerShell, remplacer par le chemin absolu vers `api/migrations` si `${PWD}` pose problème.)

4. **Smoke**  
   - `curl -sf http://localhost:8000/health` (ou le port défini par `API_PORT`)  
   - Optionnel : ouverture frontend `http://localhost:4444` si le service est up.

5. **Critères de succès**  
   - Postgres / Redis **healthy**  
   - `alembic_version` = **`e8f9a0b1c2d3`** sur la base `recyclic` du projet choisi  
   - **`/health`** API OK  
   - Pas d'erreur bloquante dans les logs `api` au démarrage

---

## 9. Cartographie « qui relève de quoi »

| Couche | Rôle dans le parcours local |
|--------|-----------------------------|
| **Config locale** | Fichier `.env` à la racine de `recyclique-1.4.4/` (non versionné) : mots de passe, `SECRET_KEY`, optionnellement ports |
| **Docker / Compose** | Orchestration, volumes, healthchecks, enchaînement `api-migrations` |
| **Migrations DB** | Alembic `api/migrations` → état cible `e8f9a0b1c2d3` |
| **Bootstrap applicatif** | Variables `FIRST_SUPER_ADMIN_*` pour premier admin en Docker (commentaire dans le compose) |
| **Tests de smoke** | `/health` API ; tests pytest / E2E hors scope de cette note sauf besoin explicite |

---

## 10. Suite possible (hors exécution automatique)

- Rejouer un **cycle complet** build + up + migrations + smoke sur le **seul** projet que tu retiens, et noter les échecs éventuels (logs, captures).
- Si tu valides une **évolution du `docker-compose.yml`** (ex. montage permanent de `api/migrations` sur `api-migrations`), la traiter comme **changement d'infra** : petite PR / commit dédié après ton go.
- Mettre à jour le **journal d'assainissement** si tu clôtures un lot « Docker local ».

---

*Session : inventaire + lecture `alembic_version` sur **recyclique-144** uniquement ; pas de `compose up` nouveau ni de modification des fichiers Compose ; cohérent avec les notes DB du 2026-03-27.*
