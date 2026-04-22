# Clôture P0 pytest / AdminService (story **26-1**, 2026-04-22)

**Alignement audit (références §7 / §9) :** cette clôture répond aux entrées **P0** du backlog §9 de l’audit brownfield — **F6** (double configuration pytest / risque de fusion contradictoire, §7) et **F3** (`AdminService` non consommé, §7). Source : `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` (§7 findings, §9 tableau P0).

**Story BMAD :** `_bmad-output/implementation-artifacts/26-1-p0-pytest-maitre-et-sort-admin-service.md`

- **Pytest :** Option A — tout dans `recyclique/api/pyproject.toml` (`markers`, `filterwarnings`, `addopts`) ; suppression de `recyclique/api/pytest.ini` ; `Dockerfile.tests` aligné sur `COPY pyproject.toml`.
- **`AdminService` :** suppression de `recyclique/api/src/recyclic_api/services/admin_service.py` (aucun consommateur sous `recyclique/api/`) ; retrait du schéma mort `AdminUserList` dans `schemas/admin.py`.

Preuve runtime : depuis `recyclique/api`, `python -m pytest tests/test_infrastructure.py` exit 0 ; session pytest doit afficher **`configfile: pyproject.toml`** (plus `pytest.ini`).

**Post-DS (2026-04-22) :** code review + correctifs (README, `Dockerfile.tests` sans flags CLI dupliqués, test-summary 25-12) ; **QA2** : 1ʳᵉ passe issues actionnables traitées, 2ᵉ passe **RAS** sur le périmètre. Story **26-1** : statut **`done`**.

**Risque de coordination (post-suppression `AdminService`) :** toute réintroduction d’une couche admin async doit suivre un **nouveau** design (module + revue / ADR courte), pas une restauration Git du fichier supprimé ; le détail et la traçabilité sont dans `_bmad-output/planning-artifacts/epics.md` (Epic 26, « Risques / arbitrages post-26-1 ») et cette note.
