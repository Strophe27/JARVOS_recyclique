# Audit backend — donnees, modeles et migrations (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** Alembic, SQLAlchemy, integrite referentielle, tests base, arborescence packages.  
**Base de reference:** `recyclique-1.4.4/api/`

---

## Contexte

Ce rapport couvre la coherence entre modeles declares, metadata Alembic, migrations versionnees et pratiques d'acces aux donnees. L'objectif est de reduire les ecarts entre environnement de developpement, tests et production PostgreSQL.

---

## Findings par severite

### Critique

- **Aucune revision Alembic versionnee:** absence de fichiers sous `migrations/versions/` (ou equivalent), donc pas de ligne de temps reproductible des schemas.
- **`target_metadata` depend de `models/__init__.py`:** des modeles comme `email_event.py` non exportes peuvent rendre des tables **invisibles** pour la generation / autogenerate Alembic — risque de decalage schema / code.

### Eleve

- **Message applicatif "use migrations"** contredit l'absence de scripts de migration versionnes operationnels.
- **Patterns d'acces heterogenes:** melange `Session.query`, `select` / `execute`, SQL brut dans `auth` — maintenance et optimisation (index, transactions) plus difficiles.
- **Limites transactionnelles floues** (aligne avec l'audit architecture): impact direct sur la coherence des donnees.
- **Tests SQLite partiels vs PostgreSQL complet:** `create_all` restreint; `CREATE TYPE` ad hoc dans les tests — risque que les tests passent alors que la prod echoue ou inversement.
- **`User.site_id` sans `ForeignKey`:** integrite referentielle non garantie au niveau base.

### Moyen

- **Presence possible d'un second arbre** `api/api/api_v1` source de confusion sur la source de verite du code applicatif.

### Bas

- Aucun constat supplementaire au-dela de la liste fournie pour ce theme.

---

## Fichiers et zones concernes (indicatif)

- `recyclique-1.4.4/api/migrations/env.py`
- `recyclique-1.4.4/api/migrations/versions/` (vide ou absent selon constat)
- `recyclique-1.4.4/api/alembic.ini`
- `recyclique-1.4.4/api/src/recyclic_api/models/__init__.py`
- `recyclique-1.4.4/api/src/recyclic_api/models/email_event.py` (et autres modeles non exportes)
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/auth.py`
- Tests sous `recyclique-1.4.4/api/tests/` (strategie SQLite / Postgres)
- Tout doublon d'arborescence `api/api/`

---

## Recommandations (ordonnees)

1. **Reconcilier le package `models`:** exporter explicitement tous les modeles refletant des tables reelles dans `__init__.py` (ou mecanisme documente equivalent) pour Alembic.
2. **Initialiser le versioning Alembic avec une baseline** alignee sur le schema PostgreSQL reel (ou schema cible documente).
3. **Integrer les migrations au deploiement:** pipeline qui applique les revisions avant ou pendant le demarrage controle de l'API.
4. **Unifier les transactions:** regles par endpoint / use case, coherentes avec l'audit architecture.
5. **Normaliser l'acces SQLAlchemy:** convention privilegiee (2.0 style `select` / session) et migration progressive hors SQL brut sauf cas justifies.
6. **Renforcer l'integrite:** ajouter `ForeignKey` sur `User.site_id` (et audit des autres relations implicites).
7. **Aligner les tests sur la cible DB:** soit Postgres de test, soit SQLite avec limitations documentees et parite schema explicite; eviter les `CREATE TYPE` ad hoc sans strategie commune.
8. **Nettoyer l'arborescence dupliquee** si confirmee: une seule racine package applicative documentee.

---

## Limites de ce document

La presence exacte du doublon `api/api/api_v1` doit etre verifiee sur le depot; les chemins modeles sont donnes a titre indicatif selon la structure habituelle du projet.
