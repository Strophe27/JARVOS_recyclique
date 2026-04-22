# Clôture P0 pytest / AdminService (story **26-1**, 2026-04-22)

- **Pytest :** Option A — tout dans `recyclique/api/pyproject.toml` (`markers`, `filterwarnings`, `addopts`) ; suppression de `recyclique/api/pytest.ini` ; `Dockerfile.tests` aligné sur `COPY pyproject.toml`.
- **`AdminService` :** suppression de `recyclique/api/src/recyclic_api/services/admin_service.py` (aucun consommateur sous `recyclique/api/`) ; retrait du schéma mort `AdminUserList` dans `schemas/admin.py`.

Preuve runtime : depuis `recyclique/api`, `python -m pytest tests/test_infrastructure.py` exit 0 ; session pytest doit afficher **`configfile: pyproject.toml`** (plus `pytest.ini`).

**Post-DS (2026-04-22) :** code review + correctifs (README, `Dockerfile.tests` sans flags CLI dupliqués, test-summary 25-12) ; **QA2** : 1ʳᵉ passe issues actionnables traitées, 2ᵉ passe **RAS** sur le périmètre. Story **26-1** : statut **`done`**.
