# Note de decision — DB, schema et migrations legacy (base active 1.4.4)

**Date :** 2026-03-27  
**Perimetre :** `recyclique-1.4.4/api/`  
**Objectif :** cadrer la suite du chantier DB/migrations sans melanger cette phase avec des refactors runtime.

---

## Decision resumee

1. **Alembic est la source de verite du schema** pour `recyclique-1.4.4`.
2. **La tete logique du graphe est `e8f9a0b1c2d3`** et doit servir de reference pour toute base active ou de test PostgreSQL.
3. **`create_schema.py` doit etre traite comme un script partiel et secondaire**, pas comme un chemin nominal de creation du schema.
4. **Le chemin Alembic operationnel est celui de `recyclique-1.4.4/api/`**, pas le second dossier `recyclique-1.4.4/migrations/` present a la racine.
5. **Les colonnes et artefacts legacy encore presents restent toleres tant qu'ils servent les imports/migrations**, mais doivent etre inventories explicitement avant tout renommage physique ou suppression.
6. **Le prochain chantier DB doit etre un chantier dedie**, avec prechecks, ordre d'execution, et rollback documente. Il ne doit pas etre melange a la stabilisation applicative courante.

---

## Constat actuel

### 1. Source de verite

- `api/migrations/env.py` charge `Base.metadata` depuis les modeles SQLAlchemy et pilote Alembic normalement.
- Le dossier `api/migrations/versions/` contient un historique versionne reel; il ne faut plus raisonner comme si les migrations etaient absentes.
- Le graphe contient une branche fusionnee (`ea87fd9f3cdb`) puis une tete finale `e8f9a0b1c2d3`.
- Un second dossier `recyclique-1.4.4/migrations/` existe a la racine, mais il ne doit pas etre confondu avec le chemin Alembic operationnel de `api/`.

### 2. Revisions a forte valeur schema/legacy

- `335d7c71186e` : schema initial.
- `07d1d205a8c6` : nettoyage de l'enum `userrole` et suppression du role `manager`.
- `b47_p5_add_legacy_category_mapping_cache.py` : support import/categories legacy.
- `d4e5f6a7b8c1` : integrite `users.site_id` + nettoyage des orphelins.
- `e8f9a0b1c2d3` : renommage des colonnes legacy de messagerie.

### 3. Divergence critique a retenir

`api/create_schema.py` ne represente pas le schema complet ni fidele:

- il ne couvre qu'un sous-ensemble de tables;
- ses enums ne sont pas alignes avec les modeles et migrations actuels;
- il peut donc creer un schema local divergent de celui obtenu par `alembic upgrade head`.

Exemples de derive deja visibles:

- `userrole` y contient encore des valeurs historiques qui ne correspondent plus au modele courant;
- `userstatus` y est plus pauvre que le modele Python reel.

---

## Artefacts legacy encore visibles

Les noms exacts doivent etre gardes sous controle car ils impactent imports, compatibilite, et migrations:

- `User.legacy_external_contact_id`
- `RegistrationRequest.external_registration_key`
- `Deposit.legacy_deposit_channel_user`
- `legacy_category_mapping_cache`
- scripts et services autour de l'import legacy (`api/src/recyclic_api/services/legacy_import_service.py`, `scripts/clean_legacy_import.py`)

Ces artefacts ne doivent pas etre supprimes a l'aveugle tant que la strategie de migration n'a pas tranche:

- ce qui reste requis pour import/rapprochement;
- ce qui peut etre neutralise applicativement;
- ce qui pourra etre renomme ou supprime physiquement plus tard.

---

## Decision de mise en oeuvre

### Ce qui est adopte maintenant

- **Base de reference schema:** Alembic `head`.
- **Chemin nominal d'initialisation:** depuis `recyclique-1.4.4/api/`, via `alembic -c alembic.ini upgrade head`.
- **Chemin non nominal:** `create_schema.py`, reserve a de l'analyse locale ou a un usage historique explicite.

### Ce qui est explicitement reporte

- suppression physique de colonnes legacy;
- refonte de `create_schema.py`;
- fusion ou reecriture du graphe Alembic;
- decision definitive sur retention/suppression des tables et caches legacy;
- changements destructifs en base.

---

## Prechecks obligatoires pour le futur chantier DB

Avant toute intervention structurelle:

1. verifier `alembic current` et `alembic heads`;
2. confirmer que la base cible est bien sur `e8f9a0b1c2d3` ou documenter l'ecart;
3. lister les colonnes legacy encore presentes en base reelle;
4. verifier les enums reels (`userrole`, `userstatus`, autres enums metier) contre les modeles Python;
5. confirmer l'etat de `users.site_id` et l'absence d'orphelins;
6. identifier les environnements ou `create_schema.py` est encore utilise.

---

## Plan recommande pour le chantier DB dedie

### Etape 1 — Cartographie reelle

- comparer base reelle, modeles SQLAlchemy, et tete Alembic;
- relever toutes les derives de colonnes, enums, contraintes et tables.

### Etape 2 — Classification des heritages legacy

- **a conserver temporairement**
- **a deprecier applicativement**
- **a migrer physiquement**
- **a supprimer apres rollout**

### Etape 3 — Strategie d'execution

- migrations Alembic supplementaires si necessaire;
- scripts de pre-migration ou nettoyage de donnees;
- ordre de rollout par environnement;
- validation post-migration.

### Etape 4 — Rollback

- documenter un rollback realiste, en tenant compte du fait que `e8f9a0b1c2d3` n'offre pas de downgrade complet sur les renommages legacy;
- privilegier snapshot / sauvegarde base avant operation irreversible.

---

## Risques majeurs

- **double source de verite** entre Alembic et `create_schema.py`;
- **enums divergents** entre script historique et schema reel;
- **bases anciennes ou restaurees partiellement** qui n'ont pas tout le graphe;
- **renommages legacy irreversibles en downgrade**;
- **suppression prematuree** d'artefacts encore utiles a l'import ou a la migration Paheko.

---

## Recommandation finale

Le chantier DB suivant ne doit pas commencer par coder une migration. Il doit commencer par une **verification de l'etat reel de la base cible contre Alembic head**, puis produire une liste tranchee:

- colonnes legacy a garder;
- colonnes legacy a migrer;
- scripts secondaires a deprecier;
- ordre de rollout;
- procedure de rollback.

Tant que cette verification n'est pas faite, **aucun refactor schema destructif ne doit etre engage**.
