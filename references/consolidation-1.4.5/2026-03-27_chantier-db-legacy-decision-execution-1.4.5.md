# Chantier DB / migrations legacy — décision d'exécution (préchecks base cible)

**Date :** 2026-03-27  
**Périmètre :** `recyclique-1.4.4/api/` (Alembic opérationnel), préchecks contre une base PostgreSQL réelle.  
**Type de session :** **préchecks opératoires + décision d'exécution** ; aucune migration Alembic ni script DDL n'a été ajouté ou modifié dans le dépôt applicatif.

**Documents de référence :** `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`, `2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md`, plan Cursor `chantier-db-legacy_12fcd71c.plan.md` (ex. `C:\Users\Strophe\.cursor\plans\chantier-db-legacy_12fcd71c.plan.md` sur la machine auteure).

**Chronologie :** la session de **cartographie** avait démarré sur un worktree propre ; à l'ouverture de la session **décision d'exécution**, seuls l'index et la note de cartographie étaient en cours de consolidation sous `references/consolidation-1.4.5/`.

---

## 1. État du worktree au lancement

Commande : `git status --short` (machine d'exécution, racine `JARVOS_recyclique`).

> **Lecture temporelle :** instantané au **début** de la session décision (2026-03-27). Ne pas prendre ce bloc pour l'état actuel du dépôt sans relancer la commande.

```
 M references/consolidation-1.4.5/index.md
?? references/consolidation-1.4.5/2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md
```

**Lecture :** uniquement des fichiers sous `references/consolidation-1.4.5/` (documentation / consolidation). Aucun fichier `recyclique-1.4.4/**` modifié dans cet état : le chantier DB **n'embarque pas** de changements applicatifs hors périmètre. Les entrées ci-dessus sont cohérentes avec la clôture documentaire du chantier (index + note de cartographie).

---

## 2. Préchecks exécutés (résultats factuels)

### 2.1 Chemin Alembic réellement utilisé

- Répertoire des révisions : `recyclique-1.4.4/api/migrations/`
- Fichier de configuration : `recyclique-1.4.4/api/alembic.ini` (`script_location = migrations`)
- Résolution d'URL : `recyclique-1.4.4/api/migrations/env.py` (priorités `TEST_DATABASE_URL` en contexte test explicite, puis `POSTGRES_*`, puis `DATABASE_URL`, puis `sqlalchemy.url` dans l'INI, puis `settings.DATABASE_URL`)

### 2.2 `alembic heads`

- **Commande :** depuis `recyclique-1.4.4/api/`, avec variables d'environnement minimales permettant l'import de `Settings` (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`).
- **Sortie observée :** `e8f9a0b1c2d3 (head)`
- **Conclusion :** la tête logique du dépôt reste **`e8f9a0b1c2d3`**, alignée avec la note de décision et la cartographie.

### 2.3 `alembic current` sur la base cible

**Objectif :** lire `alembic_version` sur **la** base PostgreSQL visée par l'exploitation (ou un restore identique).

**Tentatives et blocages :**

1. **Sans `DATABASE_URL` dans l'environnement** (et sans `.env` présent dans le dépôt versionné sous `api/`) : au chargement de `env.py`, l'import `from recyclic_api.core.config import settings` échoue avec une **`ValidationError` Pydantic** : champ obligatoire `DATABASE_URL` manquant. **Conséquence :** impossible d'exécuter `alembic current` sans fournir au minimum les secrets attendus par `Settings` (dont `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`).

2. **Avec `DATABASE_URL=postgresql://recyclic:postgres@127.0.0.1:5432/recyclic`** (valeur illustrative alignée sur `alembic.ini`) : un serveur PostgreSQL répond sur `127.0.0.1:5432`, mais la connexion échoue avec **`FATAL: password authentication failed for user "recyclic"`**. **Conséquence :** dans cet environnement, **aucune révision courante n'a pu être lue** ; on ne sait pas si la base locale est une instance Recyclique, une autre instance, ou un simple refus d'auth.

**Décision sur ce point :** conformément aux contraintes du plan, **l'exécution s'arrête ici pour la vérification « état réel vs head »** : sans `alembic current` fiable et sans session SQL authentifiée, **on ne tranche pas** l'alignement `alembic_version` ↔ `e8f9a0b1c2d3`.

**Complément (2026-03-27, même chantier) :** une passe **lecture seule** a ensuite été menée sur la base **Docker Compose** locale (accès via `docker compose exec` / image migrations avec montage du dossier `api/migrations`). **Constats et preuves :** `2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md` (`alembic current` = `a7b3c9d2014f`, verdict **en retard** vs head). Les tentatives (1) et (2) ci-dessus restent la réalité d'un **hôte** sans `.env` ou avec URL/mot de passe incorrects ; elles ne décrivent pas l'accès **via la stack Compose** déjà authentifiée côté conteneur Postgres.

### 2.4 Inspection SQL (enums, colonnes legacy, intégrité)

- **Dans la session « décision d'exécution » initiale :** **non réalisée** (même blocage que §2.3 sur accès hôte).
- **Complément :** pour la **base Docker locale**, inspection SQL réalisée dans **`2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md`**.

### 2.5 Nature de l'analyse réalisée dans cette session

| Couche | Statut |
|--------|--------|
| Graphe Alembic dans le dépôt | Vérifié (`heads` = `e8f9a0b1c2d3`) |
| Table `alembic_version` sur base cible | **Non lu** (connexion / secrets) |
| DDL et données réelles (enums, colonnes legacy) | **Non inspectés** |

### 2.6 Dump / snapshot exploitable (précheck plan)

- **Statut en session :** non tranché. Le répertoire projet `references/dumps/` est prévu pour des sauvegardes sensibles (**gitignore**) ; aucun inventaire détaillé ni ouverture de fichiers n'a été fait ici.
- **Attendu :** l'exploitant confirme qu'un **backup PostgreSQL de la base cible** (ou restore reproductible) existe **avant** toute opération destructive, indépendamment du contenu local de `references/dumps/`.

---

## 3. État réel de la base cible (synthèse)

| Question | Réponse |
|----------|---------|
| Révision Alembic effectivement appliquée sur la base cible ? | **Inconnue** dans cette session |
| Schéma physique (tables, enums, contraintes) aligné sur le head ? | **Non démontré** |
| Présence d'une dérive manuelle ou d'un chemin parallèle (`create_schema.py`, `create_tables.py`, `create_all` tests) sur une instance donnée ? | **À contrôler instance par instance** après connexion réussie |

---

## 4. Écart avec Alembic head

- **Tant que `alembic current` n'est pas obtenu sur la base concernée,** l'écart « réel vs attendu » reste **indéterminé au niveau physique**.
- **Référence d'intention** inchangée : le schéma attendu pour une base à jour est celui décrit par la chaîne de migrations jusqu'à **`e8f9a0b1c2d3`** (détail fonctionnel : voir §3 de la note de cartographie).

---

## 5. Écarts avec `create_schema.py` et scripts parallèles (rappel)

Aucun nouvel écart code détecté dans cette session. **Source détaillée :** `2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md` (§5 à §7).

Complément **tests / CI** :

- Les tests backend utilisent `Base.metadata.create_all()` dans `api/tests/conftest.py` (`create_tables_if_not_exist`), **pas** Alembic, sur l'URL de test. Une base de test peut donc refléter les modèles sans reproduire strictement l'historique `alembic_version` : **ne pas assimiler** cette base au schéma « prod » ou « staging » sans vérification explicite.

Usages repérés dans le dépôt pour `create_schema.py` : **référence dans** `recyclique-1.4.4/test_cli.py` (flux WSL / historique).

**CI :** le workflow `recyclique-1.4.4/.github/workflows/alembic-check.yml` exécute `alembic heads`, `alembic upgrade head`, `alembic current` sur une base PostgreSQL de test (`recyclic_test`) — **pas** `create_schema.py`. Les compose `docker-compose*.yml` lancent `alembic upgrade head` au démarrage du service API. Les runbooks externes restent une inconnue.

**Handoff multi-documents :** la matière « schéma attendu, matrice legacy, séquence » est surtout dans la **cartographie** ; ce document porte la **décision d'exécution** et les blocages préchecks. Lire les deux + l'index pour un handoff complet.

---

## 6. Héritages legacy encore présents (rappel)

Inventaire et matrice de trajectoire : **inchangés** par rapport à la cartographie — voir `2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md` §7 et §8 (colonnes `legacy_*`, `external_registration_key`, cache catégories, services d'import, enums sensibles, renommages M11E sans downgrade fiable).

---

## 7. Décision d'exécution DB (que faire ensuite)

| Action | Décision |
|--------|----------|
| Coder une nouvelle migration Alembic maintenant | **Non** — l'état réel de la base cible n'est pas établi |
| Lancer un `upgrade head` sur prod/staging sans `current` + backup | **Non** |
| Script de nettoyage de données destructif | **Non** sans snapshot et sans cartographie réelle des colonnes/enums |

**Suite recommandée (ordre) :**

1. **Obtenir** les identifiants de la base cible (fichier `.env` local non versionné, secrets d'environnement, ou restore depuis `references/dumps/` si politique projet le permet).
2. Exécuter depuis `recyclique-1.4.4/api/` : **`alembic current`** et enregistrer la sortie dans une prochaine note ou dans le journal d'assainissement.
3. Si `current` ≠ `e8f9a0b1c2d3` : **documenter l'écart** (révision manquante, branche, base partiellement migrée) **avant** toute migration corrective.
4. **Requêtes d'inspection** (ou `\d` / `information_schema`) : enums `userrole`, `userstatus` ; colonnes sur `users`, `registration_requests`, `deposits` ; table `legacy_category_mapping_cache` ; intégrité `users.site_id`.
5. **Snapshot / dump** obligatoire avant toute opération destructive.
6. **Après** alignement constaté : appliquer la matrice de décision (cartographie §8) avec validation humaine pour les suppressions ou renommages physiques.

**Rollback :** inchangé — privilégier **restauration backup** ; les révisions avec `downgrade` vide ou partiel (ex. `e8f9a0b1c2d3`) ne constituent pas un filet de sécurité opposable pour les renommages déjà appliqués.

---

## 8. Inconnues bloquantes restantes

1. Valeur réelle de `alembic_version` sur **chaque** environnement (dev Docker, staging, production, restore dump).
2. Cohérence DDL/enums avec le head sur ces mêmes bases.
3. Usage effectif hors dépôt de `create_schema.py`, `create_tables.py` ou du dossier `migrations/` racine dans les procédures d'exploitation internes.

---

## 9. Synthèse une ligne

**Cette note documente le blocage initial sur accès hôte et la décision d'arrêt sans `current` fiable. Les constats sur base Docker locale (`alembic current`, DDL, enums) sont dans `2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md`. Aucune migration ni changement runtime dans `recyclique-1.4.4/` n'a été faite dans la session décision.**

---

*Document complémentaire à `2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md` ; cohérent avec `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`.*
