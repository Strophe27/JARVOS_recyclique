# RecyClique — image unique (frontend build + API FastAPI)
# Multi-stage : Node 20 LTS pour le build frontend, Python 3.12 pour le runtime.
# Usage : build depuis la racine du repo (contexte = .).

# ------------------------------------------------------------------------------
# Stage 1 : build frontend (Node 20 LTS)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copie des fichiers de dépendances frontend
COPY frontend/package.json frontend/package-lock.json* ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY frontend/ ./

RUN npm run build

# Sortie : /build/dist (contenu de frontend/dist)

# ------------------------------------------------------------------------------
# Stage 2 : runtime Python (FastAPI + statics)
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

# Utilisateur non-root (bonnes pratiques) ; curl pour le healthcheck ; postgresql-client pour export/import BDD (pg_dump, pg_restore, psql)
RUN apt-get update && apt-get install -y --no-install-recommends curl postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 app && useradd --uid 1000 --gid app --shell /bin/bash --create-home app

WORKDIR /app

# Dépendances Python
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Code API
COPY api/ ./api/

# Build frontend (depuis le stage 1)
COPY --from=frontend-builder /build/dist ./frontend/dist

# Répertoire frontend/dist + /backups (sauvegardes pré-import admin BDD) lisibles par app
RUN chown -R app:app /app \
    && mkdir -p /backups && chown app:app /backups

USER app

EXPOSE 8000

# Variables d'environnement à fournir au runtime : DATABASE_URL, REDIS_URL, etc. (voir .env.example)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
