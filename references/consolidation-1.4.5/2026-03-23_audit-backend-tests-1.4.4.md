# Audit backend — tests et qualite (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** isolation des tests, fixtures, marqueurs pytest, mocks, documentation tests, couverture.  
**Base de reference:** `recyclique-1.4.4/api/tests/`

---

## Contexte

Ce rapport decrit la fiabilite de la boucle de test backend: reproductibilite, isolation des donnees, alignement avec l'infra reelle (Redis, DB) et maintenabilite de la configuration pytest.

---

## Findings par severite

### Critique

- **Isolation DB faible apres commit:** donnees persistantes entre tests — ordre d'execution et flakiness.
- **Deux mondes SQLite partiel vs PostgreSQL complet** (aligne audit data): les tests ne garantissent pas le comportement production.

### Eleve

- **Collision possible du username `inactive_user`** entre deux tests — echecs intermittents selon l'ordre.
- **`conftest.py` injecte de faux modules** `reportlab` / `openpyxl` et mock `log_audit` sous SQLite — masque des erreurs d'integration reelles.
- **Tests infra mockent Redis; marqueurs pytest inutilises;** `addopts` avec exclusion par marqueur sur une suite externe — fragile.
- **README tests renvoie vers un guide absent** — onboarding des contributeurs degrade.

### Moyen

- **Double source des dependances** (pyproject vs requirements) impacte aussi l'execution des tests en CI / local.
- **`pytest-cov` non integre** — pas de gate de couverture dans le flux standard.
- **Imports dupliques, fixtures mal nommees,** warnings ignores pouvant masquer des problemes.

### Bas

- Opportunite d'**ajouter un scenario health plus realiste** (non detaille dans les constats; a preciser lors de l'implementation).

---

## Fichiers et zones concernes (indicatif)

- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_*.py` (dont collisions `inactive_user`)
- `recyclique-1.4.4/api/tests/test_infrastructure.py`
- `recyclique-1.4.4/api/pytest.ini`
- `recyclique-1.4.4/api/tests/README.md`
- `recyclique-1.4.4/api/run_tests.sh`

---

## Recommandations (ordonnees)

1. **Corriger l'isolation DB:** rollback par test, savepoints, ou base / schema par worker; nettoyage systematique apres suites qui commitent.
2. **Unifier l'environnement de test cible:** strategie documentee Postgres vs SQLite et limitations explicites.
3. **Eliminer les collisions de donnees:** usernames uniques par test (uuid / suffixe) ou fixture scope strict.
4. **Realigner `pytest.ini` et les marqueurs:** utiliser des marqueurs explicites (`integration`, `slow`, etc.) au lieu d'exclusions par nom fragile.
5. **Reparer la documentation:** creer le guide reference ou corriger le lien README.
6. **Integrer la couverture:** `pytest-cov` dans CI avec seuil progressif ou rapport au minimum.
7. **Clarifier les fixtures:** nommage, factorisation, reduction des imports dupliques.
8. **Reduire les contournements:** evaluer si les faux modules peuvent etre remplaces par des dependances de test optionnelles ou des marqueurs skip cibles.
9. **Ajouter un scenario health** refletant les dependances reelles (DB, Redis si pertinent), sans dupliquer les incoherences signalees cote routes health.

---

## Limites de ce document

Les numeros de ligne et la liste exhaustive des tests en collision ne sont pas fournis dans les constats; une passe grep / revue est necessaire avant implementation.
