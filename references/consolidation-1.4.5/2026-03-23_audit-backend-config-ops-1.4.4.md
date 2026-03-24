# Audit backend — configuration et operations (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** Docker, Compose, variables d'environnement, dependances, documentation d'execution, Alembic en ops.  
**Base de reference:** `recyclique-1.4.4/api/`, racine du depot / README.

---

## Contexte

Ce rapport synthetise les ecarts entre fichiers d'infra (compose, Dockerfile), settings applicatifs et documentation. Les risques portent sur des environnements non reproductibles et des secrets / URLs figes par erreur.

---

## Findings par severite

### Critique

- **Double source de verite pour les dependances:** `pyproject.toml` vs fichiers `requirements*` divergents (exemples cites: `python-multipart`, `slowapi`, etc.) — builds et deploiements imprevisibles.

### Eleve

- **Incoherence `POSTGRES_DB`:** valeurs differentes entre compose, application et migrations — connexion a la mauvaise base ou echec silencieux de migration.
- **Variables `CORS` / `FRONTEND_URL` dans compose non consommees:** CORS code en dur; `FRONTEND_URL` absent de `Settings` — configuration declarative inefficace.
- **Image API production installe `requirements-dev`:** surface d'attaque et taille d'image augmentees; separation dev/prod non respectee.
- **`Dockerfile.migrations` et `alembic.ini`:** risque de confusion avec URL / mot de passe figes (secrets ou environnements non injectes correctement).

### Moyen

- **`docker-compose` reference `scripts/get-version.sh` absent** — echec ou etape manuelle au build / demarrage.
- **README racine:** port API indique `4433` alors que compose expose `8000` par defaut — erreur utilisateur frequente.
- **Runtime local CPython 3.13 vs Docker 3.11** — comportements ou dependances binaires divergents.
- **`run_tests.sh`:** bash / docker-compose v1; friction sous Windows ou Compose V2.
- **`pytest.ini`:** filtre `not telegram` — exclusion fragile si les marqueurs ou noms de tests evoluent.

### Bas

- Aucun constat supplementaire au-dela de la liste fournie pour ce theme.

---

## Fichiers et zones concernes (indicatif)

- `recyclique-1.4.4/docker-compose.yml` (ou variantes)
- `recyclique-1.4.4/api/Dockerfile`
- `recyclique-1.4.4/api/Dockerfile.migrations`
- `recyclique-1.4.4/api/pyproject.toml`
- `recyclique-1.4.4/api/requirements*.txt`
- `recyclique-1.4.4/api/alembic.ini`
- `recyclique-1.4.4/api/src/recyclic_api/core/config.py` ou module `Settings` equivalent
- `recyclique-1.4.4/api/run_tests.sh`
- `recyclique-1.4.4/api/pytest.ini`
- `scripts/get-version.sh` (reference manquante)
- README racine du depot ou du module API

---

## Recommandations (ordonnees)

1. **Unifier le nom de base `POSTGRES_DB`** dans compose, URL SQLAlchemy / Alembic et toute doc.
2. **Piloter CORS et `FRONTEND_URL` via `Settings`:** lire les variables d'environnement documentees; supprimer ou reduire les valeurs en dur sauf fallback explicite pour le dev local.
3. **Corriger l'histoire version / `get-version.sh`:** ajouter le script ou retirer la reference; documenter la source de version (CI / git / fichier).
4. **Aligner README et ports:** port documente = port expose par defaut dans compose, avec note pour les overrides.
5. **Choisir une source canonique des dependances** (typiquement `pyproject.toml` + lock ou export unique vers requirements prod).
6. **Separer images dev et prod:** Dockerfile prod sans `requirements-dev`; image migrations avec secrets uniquement via env / secrets runtime.
7. **Durcir Alembic en ops:** aucune URL / mot de passe en clair dans l'image; `alembic.ini` minimal + env.
8. **Pinner et documenter le runtime:** meme mineur Python local / CI / Docker; documenter Compose V2 et alternative Windows pour les tests.

---

## Limites de ce document

Les chemins exacts des fichiers compose peuvent varier (mono-repo vs sous-dossier); valider sur l'arbre reel avant modification.
