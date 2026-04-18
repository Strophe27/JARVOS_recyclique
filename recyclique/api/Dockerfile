FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Runtime = requirements.txt ; couche optionnelle = requirements-dev.txt (désactivable pour une image allégée).
# INSTALL_DEV=1 installe uniquement requirements-dev.txt (stack pytest, voir fichier). Ce n'est pas l'équivalent
# exact de pip install -e ".[dev]" : [project.optional-dependencies].dev dans pyproject.toml ajoute aussi
# black, isort, flake8 (réservés au dev local / CI, pas montés dans l'image par défaut).
# Par défaut INSTALL_DEV=1 (comportement proche de l'ancien Dockerfile pour docker-compose).
ARG INSTALL_DEV=1
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DEV" = "1" ]; then pip install --no-cache-dir -r requirements-dev.txt; fi

# Copy source code
COPY src/ ./src/
COPY generate_openapi.py .

# La version sera passée via build args

# Copy tests
COPY tests/ ./tests/

# Copy the admin creation script and make it executable
COPY create_admin.sh .
RUN chmod +x create_admin.sh

# Copy Alembic configuration and migrations
COPY alembic.ini .
COPY migrations/ ./migrations/

# Configuration pytest : pyproject.toml ([tool.pytest.ini_options])
COPY pyproject.toml .

# Build arguments for version information
ARG APP_VERSION=1.4.4
ARG COMMIT_SHA=unknown
ARG BRANCH=unknown
ARG COMMIT_DATE=unknown
ARG BUILD_DATE=unknown

# Set environment variables from build args
ENV APP_VERSION=$APP_VERSION
ENV COMMIT_SHA=$COMMIT_SHA
ENV BRANCH=$BRANCH
ENV COMMIT_DATE=$COMMIT_DATE
ENV BUILD_DATE=$BUILD_DATE

# Add src to Python path
ENV PYTHONPATH=/app/src

# Create non-root user
RUN useradd -m -u 1000 recyclic && chown -R recyclic:recyclic /app
USER recyclic

EXPOSE 8000

# Runtime par défaut sans --reload (adapté prod / run hors compose). docker-compose.yml du service api
# surcharge avec command: ... --reload pour le dev local (volumes src montés).
CMD ["uvicorn", "recyclic_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
