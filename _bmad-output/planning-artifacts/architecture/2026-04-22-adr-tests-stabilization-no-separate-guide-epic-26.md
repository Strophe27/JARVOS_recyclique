# ADR — Pas de fichier monolithique `TESTS_STABILIZATION_GUIDE.md` (Epic 26)

**Statut :** Accepté (documentation)  
**Date :** 2026-04-22  
**Contexte :** Audit brownfield 2026-04-19 — référence à un `api/TESTS_STABILIZATION_GUIDE.md` absent ; dette P2 story **26.5**.

## Décision

Il n’y a **pas** de guide de stabilisation des tests sous la forme d’un **fichier séparé** `recyclique/api/TESTS_STABILIZATION_GUIDE.md` (ni sous un nom équivalent à la racine du paquet API).

La stratégie de tests backend est **canonicalisée** aux emplacements suivants :

- **`recyclique/api/tests/README.md`** — exécution (Compose / manuel), fixtures, marqueur `no_db`, renvois utiles.
- **`recyclique/api/pyproject.toml`** — `[tool.pytest.ini_options]` (source de vérité unique post story 26-1, finding F6).
- **`recyclique/api/tests/conftest.py`** — contrat `_db_autouse`, overrides `get_db`, etc.
- **Audit** `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` §6 — dettes et contexte historique.

Toute nouvelle procédure de stabilisation doit **étendre** ces fichiers (ou un ADR court) plutôt que réintroduire un guide orphelin non référencé.

## Conséquences

- Les contributeurs ne cherchent **pas** un troisième document « fantôme » à la racine `api/`.
- Les agents et revues s’appuient sur **un** chemin README + config pytest + conftest.

## Références

- Story : `_bmad-output/implementation-artifacts/26-5-outillage-et-doc-p2-ruff-repository-guide-tests.md`
- Index architecture : `_bmad-output/planning-artifacts/architecture/index.md` (§ Epic 26)
