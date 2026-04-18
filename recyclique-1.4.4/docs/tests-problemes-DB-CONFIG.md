# Configuration DB de Test - Solution

**Date:** 2025-11-26  
**Problème:** Les tests échouent sur la connexion DB  
**Cause:** Configuration de la DB de test dans `conftest.py` utilise un mot de passe placeholder

---

## 🔍 Problème Identifié

Dans `api/tests/conftest.py` ligne 151:
```python
SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", f"postgresql://recyclic:your_postgres_password@{db_host}:5432/recyclic_test")
```

**Le problème:**
- Le mot de passe par défaut `your_postgres_password` est un placeholder
- Le vrai mot de passe vient de `${POSTGRES_PASSWORD}` dans `.env`
- La base `recyclic_test` doit exister

---

## ✅ Solution 1: Définir TEST_DATABASE_URL dans Docker (Recommandé)

### Modifier `docker-compose.yml` - Service `api`

**Ajouter dans la section `environment` (après ligne 65):**
```yaml
environment:
  # ... variables existantes ...
  POSTGRES_DB: recyclic
  # AJOUTER CES LIGNES:
  TEST_DATABASE_URL: postgresql://recyclic:${POSTGRES_PASSWORD}@postgres:5432/recyclic_test
  TESTING: "true"
```

**Puis redémarrer:**
```bash
docker-compose restart api
```

---

## ✅ Solution 2: Créer la Base de Test et Utiliser le Bon Mot de Passe

### Étape 1: Créer la base `recyclic_test`

```bash
docker-compose exec postgres psql -U recyclic -c "CREATE DATABASE recyclic_test;"
```

### Étape 2: Modifier `conftest.py` pour utiliser le mot de passe depuis l'environnement

**Fichier:** `api/tests/conftest.py`  
**Ligne 151:** Remplacer:
```python
SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", f"postgresql://recyclic:your_postgres_password@{db_host}:5432/recyclic_test")
```

**Par:**
```python
# Récupérer le mot de passe depuis l'environnement ou utiliser celui de DATABASE_URL
postgres_password = os.getenv("POSTGRES_PASSWORD") or os.getenv("DATABASE_URL", "").split("@")[0].split(":")[-1] if "@" in os.getenv("DATABASE_URL", "") else "your_postgres_password"
if not postgres_password or postgres_password == "your_postgres_password":
    # Essayer d'extraire depuis DATABASE_URL si disponible
    db_url = os.getenv("DATABASE_URL", "")
    if db_url and "@" in db_url:
        postgres_password = db_url.split("@")[0].split(":")[-1]
    else:
        postgres_password = "your_postgres_password"  # Fallback

SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", f"postgresql://recyclic:{postgres_password}@{db_host}:5432/recyclic_test")
```

**OU plus simple, utiliser directement DATABASE_URL et changer juste le nom de la base:**
```python
# Utiliser DATABASE_URL et changer juste le nom de la base
db_url = os.getenv("DATABASE_URL", f"postgresql://recyclic:your_postgres_password@{db_host}:5432/recyclic")
if "recyclic" in db_url:
    SQLALCHEMY_DATABASE_URL = db_url.replace("/recyclic", "/recyclic_test")
else:
    SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", f"postgresql://recyclic:your_postgres_password@{db_host}:5432/recyclic_test")
```

---

## ✅ Solution 3: Utiliser la Même Base (Simple mais Moins Isolé)

**Modifier `conftest.py` ligne 151:**
```python
# Utiliser la même base que l'app (moins isolé mais fonctionne)
db_url = os.getenv("DATABASE_URL", f"postgresql://recyclic:your_postgres_password@{db_host}:5432/recyclic")
SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", db_url)
```

**⚠️ Attention:** Les tests utiliseront la même base que l'app, moins isolé.

---

## 🎯 Solution Recommandée (La Plus Simple)

**Modifier `docker-compose.yml` - Service `api`:**

Ajouter dans `environment`:
```yaml
TEST_DATABASE_URL: postgresql://recyclic:${POSTGRES_PASSWORD}@postgres:5432/recyclic_test
TESTING: "true"
```

**Puis créer la base:**
```bash
docker-compose exec postgres psql -U recyclic -c "CREATE DATABASE IF NOT EXISTS recyclic_test;"
```

**Redémarrer:**
```bash
docker-compose restart api
```

**Vérifier:**
```bash
docker-compose exec api python -c "import os; print(os.getenv('TEST_DATABASE_URL'))"
```

---

## ✅ Validation

**Après correction, exécuter:**
```bash
docker-compose exec api python -m pytest api/tests/test_refresh_token_service.py::TestRefreshTokenService::test_generate_refresh_token -v
```

**Résultat attendu:** Le test doit se connecter à la DB et s'exécuter (même s'il échoue pour d'autres raisons logiques).

---

## 📝 Note pour l'Agent P2

Les autres tests qui fonctionnent utilisent probablement:
1. `TEST_DATABASE_URL` défini dans l'environnement
2. Ou la base `recyclic_test` existe déjà avec le bon mot de passe
3. Ou ils utilisent la même base que l'app (`recyclic`)

**Vérifier comment les tests qui fonctionnent sont exécutés:**
```bash
# Voir les variables d'environnement dans le conteneur
docker-compose exec api env | grep -E "DATABASE|TEST"
```

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

