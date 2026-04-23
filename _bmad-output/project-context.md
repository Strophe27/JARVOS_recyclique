---
project_name: JARVOS_recyclique
user_name: Strophe
date: '2026-04-23'
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: complete
rule_count: 42
optimized_for_llm: true
---

# Contexte projet pour agents IA

_Ce fichier fixe les règles et motifs que les agents doivent appliquer lors de l’implémentation. Priorité aux détails non évidents — les conventions évidentes sont volontairement absentes._

**Canon applicatif :** le **front-end** de référence est **peintre-nano** (`peintre-nano/`) ; le **back-end** de référence est **Recyclique API** (`recyclique/api/`, paquet Python `recyclic-api`). Les agents implémentent par défaut dans ces deux périmètres uniquement.

---

## Pile technique et versions

| Zone | Choix | Notes |
|------|--------|------|
| Front canon — **peintre-nano** | React 18, TypeScript ~5.7, Vite 6, Vitest 3 | `strict: true`, Mantine 8.x ; proxy dev `/api` → Recyclique API (voir `peintre-nano/vite.config.ts`, env `PEINTRE_DEV_PROXY_TARGET` / Docker `api:8000`) |
| Contrats runtime | Manifestes CREOS JSON sous `contracts/`, inclus TS via `tsconfig.app.json` | Ne pas casser les chemins `fs.allow` du serveur Vite |
| Back canon — **Recyclique API** | `recyclique/api/` — FastAPI 0.104, SQLAlchemy 2.0 sync, Pydantic v2, Python ≥3.11 | Paquet `recyclic-api` ; image Docker alignée sur `requirements.txt` |
| Données | PostgreSQL (cible 17 documentée en ADR), Redis | Tests : base `recyclic_test`, voir `recyclique/api/tests/README.md` |
| Qualité Python | Pytest 7.x, Black / isort / flake8, **Ruff** 0.9.x (`pip install -e ".[dev]"`) | Config unique dans `pyproject.toml` — pas de `pytest.ini` |

**Références épiques récentes :** conventions figées post-**Epic 26** (tests, ORM sync, schémas, lint) ; **Epic 25** (PIN kiosque, async Paheko/outbox, socle multisite) ; **Epic 13** clôturé au **2026-04-23** (parité caisse étendue / kiosque Peintre, story **13.8** **done**) — détail en section « Ne pas rater ».

---

## Règles d’implémentation critiques

### Langage — TypeScript / React (`peintre-nano`)

- Respecter `tsconfig.app.json` : **strict**, `noUnusedLocals`, `noUnusedParameters`, pas de ressort sur les erreurs de typage.
- Modules ES ; pas d’extensions `.ts` dans les imports ; `isolatedModules` impose des exports compatibles transpilation.
- Préférer le style et les patterns déjà présents dans le dossier touché (domaines sous `src/domains/`, runtime sous `src/runtime/`, widgets sous `src/widgets/`).

### Langage — Python (`recyclique/api`)

- **ORM synchrone + FastAPI :** si le corps d’une route ou d’un service n’utilise que `sqlalchemy.orm.Session` et des appels **synchrones**, utiliser **`def`**, pas `async def` ornemental. Réserver `async def` aux chemins avec **`await` réel** (upload, I/O async, etc.) et **le signaler** (commentaire ou doc d’archi). Voir `_bmad-output/planning-artifacts/architecture/2026-04-22-convention-routes-services-sync-orm-api-v1-epic-26.md`.
- **Schémas Pydantic :** dans les fichiers `schemas/*.py` **modifiés par une PR**, préférer **`T | None`** à `Optional[T]` ; ne pas mélanger les deux styles dans un même fichier (convention audit / vague schémas).
- Ne pas confondre la convention **Session sync** ci-dessus avec l’**ADR Paheko / outbox async** (Epic 25) : intégrations Paheko et files d’attente suivent les ADR dédiés, pas cette convention route-handler.

### Framework — UI et runtime Peintre

- Mantine pour les primitives UI ; cohérence avec les modules CSS existants (`*.module.css`) quand le composant en a un.
- Navigation / bandeau / manifests : respecter la hiérarchie de vérité décrite dans `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` (pas de labels ou routes fantômes sans fallback documenté).

### Tests — Backend (`recyclique/api`)

- **Source de vérité unique :** `[tool.pytest.ini_options]` dans `recyclique/api/pyproject.toml` + `recyclique/api/tests/conftest.py` + `recyclique/api/tests/README.md`. Pas de guide de stabilisation séparé (décision Epic 26).
- Marqueurs : `integration_db`, `performance`, `no_db` — usage conforme à `conftest` (tests sans DB utilisent `@pytest.mark.no_db` selon README).
- Lot minimal pytest : script `recyclique/api/run_tests.sh` ; cwd Compose et équivalences manuelles sont dans `recyclique/api/tests/README.md` (depuis la racine du dépôt et le compose utilisé par l’équipe — ne pas s’appuyer sur le dossier legacy `recyclique-1.4.4/`).
- Pour revue PR : vérifier alignement avec la convention **`def` vs `async`** sur les routes/services ORM sync.

### Tests — Frontend (`peintre-nano`)

- Vitest + Testing Library ; commande `npm run test` (wrapper `vitest run`).
- Placer les tests sous `tests/` (unit, contract, e2e selon arborescence existante) ; suivre les conventions de nommage des fichiers déjà présents (`*.test.tsx`, etc.).

### Qualité et style

- **Python :** `ruff format` aligné Black (88 colonnes). `ruff check` minimal (E9) sur la legacy — ne pas élargir brutalement sans chantier ; first-party `recyclic_api` pour isort quand règles I activées localement.
- **TS :** `npm run lint` = `tsc -b` ; le build doit passer avant livraison.
- **Références / docs projet :** conventions de fichiers datés sous `references/` (`references/INSTRUCTIONS-PROJET.md`, index par dossier). Idées Kanban : ne pas éditer l’index à la main — skill dédié.

### Workflow développement

- Commits **Conventional Commits** : `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):` — voir `references/procedure-git-cursor.md`.
- Pas de **push** ou tag sans accord explicite ; en cas de credentials absents, donner les commandes à l’humain plutôt que boucler en erreur.
- Git détaillé / procédure complète : déléguer ou s’aligner sur `references/procedure-git-cursor.md`.

### Ne pas rater (gotchas métier et technique)

- **Epic 26 — API :** double norme « repository » : réception a un dépôt dédié ; ailleurs l’ORM direct dans les services reste acceptable si assumé en PR — pas de migration massive implicite vers repository.
- **Epic 25 — Sécurité / Paheko :** séparer mentalement PIN opérateur vs PIN kiosque / secret de poste (ADR PIN) ; intégration Paheko asynchrone : **outbox PostgreSQL durable**, Redis **auxiliaire** seulement (ADR async Paheko).
- **Docker vs dev Python :** `[project.optional-dependencies].dev` (dont Ruff) peut ne pas être dans l’image selon variables ; pour les outils complets, installation locale `pip install -e ".[dev]"` comme documenté dans `pyproject.toml`.
- **`recyclique-1.4.4/` (legacy) :** hors périmètre pour les agents — ne pas explorer, citer ou dupliquer ses chemins comme vérité ; tout travail canonique **UI** passe par **`peintre-nano/`**, **API** par **Recyclique API** (`recyclique/api/`) et la doc sous `_bmad-output/planning-artifacts/architecture/`.
- **PostgreSQL :** décisions de version et stratégie migration — suivre les ADR sous `_bmad-output/planning-artifacts/architecture/` et le compose à la racine du dépôt si applicable ; ignorer les variations propres au dossier legacy.

---

## Utilisation

**Pour les agents IA**

- Lire ce fichier avant d’implémenter du code dans ce dépôt.
- Appliquer toutes les règles ci-dessus ; en cas de doute, privilégier l’option **plus stricte** ou la **décision documentée** dans `_bmad-output/planning-artifacts/architecture/`.
- Si une nouvelle convention se stabilise (répétée en PR ou ADR), proposer une mise à jour **courte** de ce fichier plutôt que des paraphrases longues.

**Pour les humains**

- Garder ce fichier **court** et orienté agents ; l’actualiser quand la stack ou les ADR changent.
- Réviser périodiquement : retirer ce qui devient universellement évident pour les modèles.

_Dernière mise à jour : 2026-04-23._
