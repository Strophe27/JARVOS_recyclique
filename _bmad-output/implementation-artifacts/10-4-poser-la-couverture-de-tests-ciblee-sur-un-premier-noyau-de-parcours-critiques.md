# Story 10.4 : Poser la couverture de tests ciblée sur un premier noyau de parcours critiques

Status: ready-for-dev

**Story ID :** 10.4  
**Story key :** `10-4-poser-la-couverture-de-tests-ciblee-sur-un-premier-noyau-de-parcours-critiques`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. -->

## Story

En tant qu'**équipe livraison orientée qualité**,  
je veux une **couverture automatisée ciblée** sur un **premier noyau explicite de parcours critiques**,  
afin que les **régressions sur la colonne vertébrale produit** soient détectées tôt **sans** tenter d'automatiser tout le backlog.

## Story Preparation Gate (énumération obligatoire — figée au CS)

Les **quatre cibles minimales** du lot (source `epics.md` Story 10.4) et leur ancrage **versionné** dans le dépôt :

| # | Cible (`epics.md`) | Profondeur attendue (10.4) | Ancres tests existantes (ne pas réinventer) |
|---|-------------------|----------------------------|---------------------------------------------|
| **1** | **Parcours chaîne module** (runtime modulaire / shell servi) | **Contrat** CREOS bundle servi + **e2e** jsdom montage `App` sur route démo ; **API** : enveloppe de contexte consommée par la nav (bornes contrat, pas métier caisse) | Peintre : `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`, `peintre-nano/tests/e2e/runtime-demo-compose.e2e.test.tsx` ; API : `recyclique/api/tests/test_context_envelope.py` (sous-ensemble **documenté** — ex. tests sur libellés nav `nav.transverse.*` / fraîcheur enveloppe) |
| **2** | **Parcours nominal caisse** (vente bornée) | **e2e** jsdom parcours caisse 6.1 + **intégration API** création vente nominale | Peintre : `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` ; API : `recyclique/api/tests/test_sales_integration.py` — `TestSalesIntegration::test_create_sale_success` |
| **3** | **Parcours nominal réception** (ticket borné) | **e2e** jsdom 7.1 + **intégration API** happy path poste → ticket → clôture | Peintre : `peintre-nano/tests/e2e/reception-nominal-7-1.e2e.test.tsx` ; API : `recyclique/api/tests/test_reception_endpoints.py::test_reception_happy_path` |
| **4** | **Parcours sync-sensitive** (clôture / outbox / Paheko) | **Intégration API** slice 8.1 (mock HTTP Paheko) — **pas** d'exigence navigateur réel | API : `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py` (module entier ou liste de tests **nommée** dans le manifeste — **ne pas** dupliquer la logique métier 8.x dans un nouveau fichier monolithique) |

**Hors périmètre des libellés « caisse / réception » en 10.4 :** les smokes **rendu React** CREOS (`peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx`) — couche **10.3** (NFR28 / AR18 UI), **pas** les parcours métier pytest/e2e listés ci-dessus.

## Décisions Ombre / pilotage (2026-09-21)

- **Séquence L0** : **10.1** (`review` — ne pas promouvoir `done` depuis 10.4) → **10.2** / **10.3** **`done`** (OpenAPI + CREOS/smoke rendu) → **10.4** (cette story) avant module métier **D** (**D2/D7**).
- **Prérequis** : baseline **`.github/workflows/ci-minimal.yml`** + **`doc/ci-minimal.md`** (§10.1–10.3) ; gates CREOS **10.3** restent dans `npm run test` / contract — **10.4** n'ajoute **pas** une seconde validation schéma CREOS globale.
- **Bandeau-live / dette Vitest 10.1** : le noyau **10.4** doit pouvoir être **vert** via **`npm run test:critical-core`** (à créer) **même si** `npm run test` intégral reste partiellement rouge — **AC5** impose un gate **bloquant** sur le peloton, pas sur toute la suite legacy.
- **C2b / `v2.0.0`** : hors scope.
- **D10** : Epic **12** gelé — pas de tests « parité legacy » dans le peloton.
- **Couverture % / pytest-cov** : hors scope (audit 1.4.4 — pas de gate pourcentage cérémoniel).

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.4** (traduction exécutable ci-dessous).

1. **Inventaire explicite et borné** — Étant donné plusieurs couches critiques (API, contrats, intégration, e2e jsdom), quand la baseline de tests du noyau est définie, alors le dépôt contient un **manifeste machine-readable** (`doc/critical-core-peloton.yaml` à la racine `doc/`) listant **exactement** les quatre cibles du Story Preparation Gate (fichiers + sélecteurs pytest `file::test` ou modules Vitest) ; une **doc humaine** (`doc/critical-core-peloton.md`) reprend le tableau gate, la **profondeur** par cible, les **commandes locales** et les **frontières** avec 10.3 ; **interdit** : inventer de nouveaux parcours métier complets — **réutiliser** les ancres listées ou **étendre** un test existant par **assertion minimale** documentée dans le Dev Agent Record.

2. **Garde-fou anti-dérive du manifeste** — Étant donné que les chemins de tests évoluent, quand le manifeste ou les fichiers ancrés sont modifiés sans mise à jour coordonnée, alors un test **infra ou API** (`recyclique/api/tests/test_story_10_4_critical_core_peloton_guard.py` **ou** `tests/infra/test_story_10_4_critical_core_peloton_guard.py` — **un seul** emplacement canonique, choix documenté) **échoue** si : (a) un chemin listé est absent ; (b) un sélecteur pytest ne résout plus ; (c) le manifeste ne contient **pas exactement quatre** entrées `targets` avec les clés `module_chain`, `caisse_nominal`, `reception_nominal`, `sync_sensitive`.

3. **Commandes peloton reproductibles** — Étant donné un contexte solo dev, quand un mainteneur exécute les gates 10.4 en local, alors : **API** — une commande unique documentée (ex. `cd recyclique/api && python -m pytest @doc/critical-core-peloton.yaml` **non** — préférer script `recyclique/api/scripts/run_critical_core_peloton.sh` **ou** `python -m pytest` avec liste générée depuis le YAML) exécute **uniquement** le peloton backend ; **Peintre** — `npm run test:critical-core` (script npm + éventuellement `peintre-nano/scripts/run-critical-core-vitest.mjs`) exécute **uniquement** les fichiers e2e/contract du peloton **sans** lancer toute la suite `tests/e2e/` ; les deux commandes sont **vertes** sur la branche de livraison après DS.

4. **Marqueur / sélection pytest (maintenabilité)** — Étant donné le peloton API, quand c'est **maintenable sans duplication**, alors les tests ancrés du peloton portent le marqueur **`critical_core`** (déclaré dans `recyclique/api/pyproject.toml` `[tool.pytest.ini_options].markers`) **ou** le script peloton invoque explicitement les chemins du manifeste — **interdit** de dupliquer le corps des tests ; le marqueur sert au plus à **filtrer** (`pytest -m critical_core`) si aligné avec le manifeste.

5. **Industrialisation CI sur 10.1–10.3** — Étant donné le même workflow `ci-minimal.yml` **sans** `paths:`, quand **10.4** est livrée, alors : le job **`api-minimal`** exécute le **peloton backend** en étape **bloquante** (avant ou après le peloton complet — **préférence** : étape nommée `pytest critical core peloton` **avant** `pytest tests/ -m "not performance"` pour fail-fast) ; le job **`peintre-nano-minimal`** exécute **`npm run test:critical-core`** en étape **bloquante** ; la section **`doc/ci-minimal.md` §10.4** documente la parité ; **optionnel** : `tests/infra/test_story_10_4_ci_minimal_critical_core_smoke.py` verrouille la présence des steps dans le YAML (pattern 10.1–10.3). **Arbitrage dette 10.1** : si `npm run test` intégral reste rouge (bandeau-live), le job peut conserver `npm run test` en **non-bloquant** (`continue-on-error: true`) **uniquement** si `doc/ci-minimal.md` le dit **explicitement** et que **`test:critical-core`** reste **bloquant** — **jamais** l'inverse.

6. **Hors scope explicite** — Étant donné les frontières Epic 10, quand cette story est revue, alors **ne pas** livrer : objectif **% couverture** global ; ré-exécuter / dupliquer les gates **CREOS structure + smoke rendu 10.3** comme « couverture métier » ; **Puppeteer** / navigateur réel nouveaux ; extension baseline à **`recyclique-1.4.4/`** ; correction globale dette **bandeau-live** (reste **10.1** / stories dédiées) ; parcours **Epic 12** gelé (**D10**) ; tests **performance** (`-m performance`) dans le peloton ; **Spectral** OpenAPI.

## Matrice de traçabilité (C12)

| AC | Tâches | Fichiers / artefacts | Gate Story Runner |
|----|--------|----------------------|-------------------|
| **1** Inventaire | Manifeste YAML ; Doc peloton | `doc/critical-core-peloton.yaml`, `doc/critical-core-peloton.md` | Fichiers présents ; tableau 4 cibles |
| **2** Garde-fou | Test guard manifeste | `test_story_10_4_critical_core_peloton_guard.py` ou `tests/infra/...` | pytest guard **vert** |
| **3** Commandes | Scripts npm + shell/API | `peintre-nano/package.json` (`test:critical-core`) ; `recyclique/api/scripts/run_critical_core_peloton.sh` (ou équivalent) | Commandes doc § Gates **vertes** |
| **4** Marqueur pytest | `pyproject.toml` markers + apply sur ancrages | `recyclique/api/pyproject.toml` ; tests ancrés (optionnel) | `pytest -m critical_core` cohérent manifeste |
| **5** CI + doc | `ci-minimal.yml` ; `doc/ci-minimal.md` §10.4 ; smoke infra optionnel | `.github/workflows/ci-minimal.yml` ; `doc/ci-minimal.md` | Parité local = CI sur peloton |
| **6** Hors scope | Revue périmètre | Dev Notes § Hors scope | Pas de % cov / CREOS duplicate / legacy 1.4.4 |

## Tasks / Subtasks

- [ ] **Manifeste `doc/critical-core-peloton.yaml`** — Structure minimale : `version`, `story: "10.4"`, `targets` (4 clés ci-dessus), chaque entrée avec `peintre` (liste fichiers vitest) et/ou `api` (liste `path::test` ou modules) ; reprendre **exactement** les ancres du Story Preparation Gate (ajustement autorisé **uniquement** si renommage fichier — mettre à jour guard + doc). (AC : 1, 2)

- [ ] **Doc `doc/critical-core-peloton.md`** — Tableau gate ; liens vers stories **5.1 / 3.7**, **6.1**, **7.1**, **8.1** ; commandes locales ; note frontière **10.3** vs **10.4** ; référence `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` ligne **10.4** ; mention audit `references/consolidation-1.4.5/2026-03-23_audit-backend-tests-1.4.4.md` (utile, pas bruit). (AC : 1, 6)

- [ ] **Guard manifeste** — Implémenter le test guard (AC2) : parse YAML ; `Path.exists` ; optionnel : `pytest --collect-only` sur sélecteurs. (AC : 2)

- [ ] **`npm run test:critical-core`** — Ajouter script dans `peintre-nano/package.json` invoquant vitest sur la liste Peintre du manifeste (contract 5.1 + e2e runtime-demo, cashflow-nominal-6-1, reception-nominal-7-1) ; **exclure** `tests/smoke/creos-critical-render-paths-10-3.test.tsx` (déjà gate 10.3 via `npm run test`). (AC : 3, 5)

- [ ] **Script peloton API** — `recyclique/api/scripts/run_critical_core_peloton.sh` (ou python runner) lisant le YAML depuis `../../doc/critical-core-peloton.yaml` ; exit non-zéro si échec. (AC : 3)

- [ ] **Marqueur `critical_core`** — Déclarer dans `pyproject.toml` ; appliquer `@pytest.mark.critical_core` sur les **fonctions** ancrées listées dans le manifeste **si** cela n'oblige pas à toucher des dizaines de tests — sinon documenter « manifest-only » en Dev Agent Record (AC4). (AC : 4)

- [ ] **CI `ci-minimal.yml`** — Étapes bloquantes peloton API + `npm run test:critical-core` ; arbitrage `npm run test` intégral vs dette 10.1 documenté dans `doc/ci-minimal.md`. (AC : 5)

- [ ] **DS — `doc/ci-minimal.md` §10.4** — Section dédiée (obligatoire au DS / DoD AC5). (AC : 5)

- [ ] **Smoke infra optionnel** — `tests/infra/test_story_10_4_ci_minimal_critical_core_smoke.py` : assert workflow référence peloton + doc §10.4. (AC : 5)

- [ ] **Sprint / story** — Après DS : Dev Agent Record, File List, `sprint-status.yaml` → **review** via Story Runner. (process BMAD)

## Dev Notes

### Frontières avec 10.1, 10.2, 10.3 et 10.5

| Sujet | **10.1 (`review`)** | **10.2 (`done`)** | **10.3 (`done`)** | **10.4 (cette story)** | **10.5** |
|--------|---------------------|---------------------|---------------------|-------------------------|----------|
| CI `ci-minimal.yml` | 3 jobs baseline | Chaîne OpenAPI | CREOS + smoke rendu dans `npm run test` | **Peloton 4 parcours** exécutable **explicitement** (fail-fast) | Observabilité logs / health |
| OpenAPI | Contrats job | Drift FastAPI ↔ YAML | Consomme YAML pour CREOS crosswalk | **Ne pas** re-tester toute la chaîne 10.2 | — |
| CREOS / rendu | — | — | Gate globale + smoke jsdom | **Hors scope** smokes 10.3 pour AC métier | — |
| Peintre `npm run test` | Tout Vitest (dette bandeau) | — | Contract + smoke 10.3 | **`test:critical-core`** = colonne vertébrale **métier** e2e/contract listée | — |
| API pytest | Peloton complet `-m "not performance"` | Test drift 10.2 | — | **Sous-ensemble nommé** 4 risques | — |

### Pourquoi ces ancres (intelligence stories précédentes)

- **10.3** a figé la frontière : smokes CREOS ≠ parcours métier **10.4** — ne pas fusionner les critères de revue.
- **Chaîne module** : registre cohérence shell Epic 5 (`references/artefacts/2026-04-08_01_transverse-shell-coherence-gaps-epic5.md`) — bundle `navigation-transverse-served.json` + `runtime-demo-manifest.ts`.
- **Caisse / réception** : e2e déjà riches (mocks HTTP) — le peloton **référence** les fichiers, n'en recrée pas des copies.
- **Sync-sensitive** : **8.1** est le slice documenté bout-en-bout outbox (mock Paheko) — préférer à 8.4/9.10 pour **durée** et **clarté** du signal sync.

### Audit backend (lecture seule)

`references/consolidation-1.4.5/2026-03-23_audit-backend-tests-1.4.4.md` rappelle : pas de gate % ; attention isolation DB — le peloton **ne remplace pas** le pytest complet CI mais **complète** la lisibilité du risque. Ne pas introduire `pytest-cov` seuil dans **10.4**.

### Fichiers cibles probables

| Fichier | Action attendue |
|---------|-----------------|
| `doc/critical-core-peloton.yaml` | Créer — manifeste |
| `doc/critical-core-peloton.md` | Créer — doc humaine |
| `doc/ci-minimal.md` | §10.4 |
| `peintre-nano/package.json` | Script `test:critical-core` |
| `peintre-nano/scripts/run-critical-core-vitest.mjs` | Optionnel — runner |
| `recyclique/api/scripts/run_critical_core_peloton.sh` | Créer — runner API |
| `recyclique/api/tests/test_story_10_4_critical_core_peloton_guard.py` | Créer — guard |
| `recyclique/api/pyproject.toml` | Marqueur `critical_core` |
| `.github/workflows/ci-minimal.yml` | Steps peloton |
| `tests/infra/test_story_10_4_ci_minimal_critical_core_smoke.py` | Optionnel |

**Hors scope :** couverture %, Spectral, Puppeteer, `recyclique-1.4.4/**`, fix bandeau-live global, Epic 12, duplication gates 10.3.

### Modes de défaillance ciblés (FMEA)

| ID | Mode | Effet | Mitigation (10.4) |
|----|------|-------|-------------------|
| FM1 | Peloton non documenté | Régressions spine non visibles | AC1 manifeste + doc |
| FM2 | Renommage test sans update YAML | Faux vert / peloton vide | AC2 guard |
| FM3 | Confondre smoke 10.3 et e2e métier | Double travail ou trous | Story Preparation Gate + Dev Notes |
| FM4 | CI rouge uniquement sur bandeau-live | Merge bloqué sans signal spine | AC5 `test:critical-core` bloquant |
| FM5 | Scope creep pytest-cov / tout e2e | Bruit, non maintenable solo | AC6 |
| FM6 | Nouveau workflow `paths:` | Contournement baseline 10.1 | AC5 même workflow |
| FM7 | Dupliquer tests 8.1 en nouveau module | Dette | AC1 réutiliser `test_story_8_1_*` |

### Definition of Done (Story 10.4)

- [ ] Les **6 AC** sont couverts : manifeste, guard, commandes locales, CI peloton bloquante, `doc/ci-minimal.md` §10.4.
- [ ] Les **quatre cibles** du Story Preparation Gate sont **nommées** dans le YAML et la doc.
- [ ] `npm run test:critical-core` et le script API peloton **verts** localement (Postgres/Redis pour API).
- [ ] **Ne pas** forcer **10.1** à `done` ; **ne pas** rouvrir **10.2** / **10.3**.
- [ ] Story Runner : `sprint-status.yaml` → **review** après DS.

### Gates Story Runner (référence DS)

```bash
# 1) Guard + peloton API
cd recyclique/api
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recyclic_test
export REDIS_URL=redis://localhost:6379
python -m pytest tests/test_story_10_4_critical_core_peloton_guard.py -q
bash scripts/run_critical_core_peloton.sh   # après implémentation

# 2) Peloton Peintre
cd ../../peintre-nano && npm ci
npm run test:critical-core

# 3) Parité CI (racine dépôt)
# Voir doc/ci-minimal.md §10.4

# 4) Smoke infra optionnel
cd .. && python -m pytest tests/infra/test_story_10_4_ci_minimal_critical_core_smoke.py -q
```

### Project context

- `_bmad-output/project-context.md` — chemins canoniques API + Peintre ; marqueurs pytest dans `pyproject.toml`.
- Tableau opérationnel : `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (**10.4**).
- Checklist PR Peintre : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` (ne pas élargir le métier dans les tests peloton).

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 10, Story 10.4, Story Preparation Gate]
- [Source: `_bmad-output/implementation-artifacts/10-3-valider-les-manifests-creos-et-les-parcours-de-rendu-critiques.md` — Frontière 10.3 ↔ 10.4]
- [Source: `_bmad-output/implementation-artifacts/10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats.md` — Dette bandeau-live]
- [Source: `doc/ci-minimal.md` — Baseline à étendre §10.4]
- [Source: `references/artefacts/2026-04-08_01_transverse-shell-coherence-gaps-epic5.md` — Chaîne module / shell]
- [Source: `references/consolidation-1.4.5/2026-03-23_audit-backend-tests-1.4.4.md` — Utile vs bruit]
- [Source: `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — Story 10.4]

## Dev Agent Record

### Agent Model Used

_(vide — à remplir au DS)_

### Debug Log References

### Completion Notes List

### File List
