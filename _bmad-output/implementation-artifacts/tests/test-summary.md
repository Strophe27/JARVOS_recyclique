# Synthèse automatisation des tests — Story 10.6c (spike PG 15→17, doc)

## Contexte

La story **10.6c** livre un **runbook** et des **preuves documentaires** de spike (hors changement de tags `postgres:*` et hors workflows — réservé **10.6d**). Il n’y a **pas** de parcours UI à couvrir en E2E navigateur pour cette story.

## Stratégie QA

| Volet | Approche |
|--------|-----------|
| **Cohérence doc / liens** | Revue manuelle des AC + garde-fous automatisés légers (`tests/infra/test_story_10_6c_pg17_doc_smoke.py`) : présence runbook, liens relatifs vers ADR et recherche, fichiers cibles existants, README et index architecture pointent vers le runbook, mentions 10.6d / 10.6e et hors périmètre legacy. |
| **Compose (non-régression)** | Déjà couvert par **10.6b** : `tests/infra/test_docker_compose_entrypoint.py` (`docker compose config --quiet`, services attendus). **Aucune** modification des tags Postgres dans le cadre QA 10.6c. |
| **Gates applicatifs PG 17** | Hors scope strict 10.6c → **10.6e** (pytest API / Alembic exhaustif). |
| **E2E UI** | **Non requis** pour 10.6c (aucun changement de parcours produit). |

## Tests générés / étendus

### Tests « infra / doc » (Python, pytest)

- [x] `tests/infra/test_story_10_6c_pg17_doc_smoke.py` — Cohérence minimale des livrables doc 10.6c (fichiers + ancres Markdown + séparation stories).
- [x] (existant) `tests/infra/test_docker_compose_entrypoint.py` — Résolution Compose racine / legacy.

### Tests API / E2E UI

- [ ] Non ajoutés : hors périmètre story (documentation + runbook).

## Couverture (indicatif)

- **Endpoints API** : inchangé par 10.6c — pas de nouveau test API.
- **UI E2E** : 0 % attendu pour cette story (N/A).

## Prochaines étapes

- Exécuter `python -m pytest tests/infra` en CI si un job couvre déjà la racine du mono-repo ; sinon l’ajouter au pipeline ciblé (hors périmètre de cette tâche QA générée).
- Après merge **10.6d** / **10.6e** : étendre la stratégie avec tests applicatifs sur image PG 17.

## Validation checklist (workflow Quinn)

- Tests générés : doc smoke + pas d’E2E UI imposé — conforme au bornage story.
- Tous les tests `tests/infra` passent localement après ajout.

---

# Synthèse automatisation des tests — Story 13.1 (alias `/cash-register/session/open`)

## Contexte

Story **13.1** : parité UI **adjacente** au kiosque nominal — routage legacy **`/cash-register/session/open`** vers le même `page_key` **`cashflow-nominal`** que le hub `/caisse`, **sans** mode kiosque (nav visible). Les tests unitaires existants ciblent `RuntimeDemoApp` ; cette synthèse documente l’extension **E2E Vitest/jsdom** sur l’arbre **`App` + `RootProviders`** (même convention que `tests/e2e/README.md`).

## Tests générés / étendus

### E2E (Vitest + Testing Library, `peintre-nano/tests/e2e/`)

- [x] `peintre-nano/tests/e2e/cash-register-session-open-13-1.e2e.test.tsx` — Parcours `App` avec `fetch` mocké (`GET /v1/cash-sessions/current` → pas de session) :
  - URL legacy avec `register_id` : brownfield + wizard nominal + `flow-renderer-cashflow-nominal`, nav présente, **absence** de `cash-register-sale-kiosk`, heading **Caisse — poste opératoire**.
  - Slash final sur `/cash-register/session/open/`.
  - **Non-régression 11.3** : `/cash-register/sale` conserve le kiosque (marqueur présent, nav masquée).

### Tests API

- [ ] Non ajoutés (inchangé : pas d’endpoint dédié story 13.1).

## Couverture (indicatif)

- **Invariants contractuels / routage** (alignés AC story côté implémentation testable) : alias session/open → `cashflow-nominal` ; distinction nette vs alias kiosque `/cash-register/sale`.
- **AC « preuves DevTools / matrice »** : hors automatisme jsdom — couverture manuelle / artefacts story.

## Exécution locale (2026-04-11)

```bash
cd peintre-nano
npx vitest run tests/e2e/cash-register-session-open-13-1.e2e.test.tsx tests/unit/runtime-demo-cash-register-session-open-13-1.test.tsx tests/unit/runtime-demo-cash-register-sale-kiosk-11-3.test.tsx
```

Résultat : **8 tests passés** (3 e2e + 2 unitaires 13.1 + 3 unitaires 11.3).

## Validation checklist (workflow Quinn) — Story 13.1

- [x] E2E générés (UI jsdom), APIs N/A.
- [x] Locators sémantiques (`role` + `data-testid` alignés existants).
- [x] Happy path + cas slash final + régression critique (kiosque vs adjacent).
- [x] Synthèse mise à jour dans ce fichier.
- [x] Vitest exécuté sur les fichiers concernés : OK.

---

# Synthèse automatisation des tests — Story 13.2 (variantes virtuel / saisie différée)

## Contexte

Story **13.2** : lignes matrice **`ui-pilote-03b`** / **`ui-pilote-03c`** ; alias runtime Peintre pour URLs legacy **`/cash-register/virtual/*`** et **`/cash-register/deferred/*`** (session open sans kiosque, vente en kiosque, normalisation `/cash-register/deferred` → `…/session/open`).

## Tests générés / étendus

### Unitaires (`peintre-nano/tests/unit/`)

- [x] `runtime-demo-cash-register-variants-13-2.test.tsx` — `RuntimeDemoApp` : chemins virtual/deferred session open, kiosque `virtual/sale` et `deferred/sale`, `replaceState` racine différée.

### E2E (Vitest + `App`, `peintre-nano/tests/e2e/`)

- [x] `cash-register-variants-13-2.e2e.test.tsx` — `virtual/session/open`, `deferred/session/open` (intro cahier), `virtual/sale` (kiosque + `flow-renderer-cashflow-nominal`), hub **`/cash-register/virtual`** + clic **Ouvrir** poste réel → **`/cash-register/virtual/session/open`** (parité `basePath` legacy).

## Exécution locale (2026-04-11, DS)

```bash
cd peintre-nano
npx vitest run tests/unit/runtime-demo-cash-register-variants-13-2.test.tsx tests/e2e/cash-register-variants-13-2.e2e.test.tsx
```

Résultat : **10 tests passés** (5 unitaires + 5 e2e) — Story Runner 2026-04-11 : correction hub virtuel + e2e hub (après revue CR).

## Validation checklist — Story 13.2

- [x] Couverture routage + distinction kiosque / adjacent pour les deux branches.
- [x] Synthèse mise à jour dans ce fichier.

---

# Synthèse automatisation des tests — Story 13.3 (clôture / `…/session/close`)

## Contexte

Story **13.3** : parité UI **fermeture de caisse** — alias runtime Peintre pour **`/cash-register/session/close`**, **`/cash-register/virtual/session/close`**, **`/cash-register/deferred/session/close`** (même `page_key` **`cashflow-nominal`** que le hub) ; surface **`CaisseSessionCloseSurface`** branchée sur **`getCurrentOpenCashSession`** / **`postCloseCashSession`** ; redirection **`/caisse`** si aucune session ouverte (aligné legacy `CloseSession.tsx`).

## Tests générés / étendus

### Unitaires (`peintre-nano/tests/unit/`)

- [x] `runtime-demo-cash-register-session-close-13-3.test.tsx` — `RuntimeDemoApp` : sans session → `replaceState`/`popstate` vers **`/caisse`** ; avec session mockée → surface **`cash-register-session-close-surface`** + heading Fermeture.
- [x] (régression) `caisse-brownfield-dashboard-6-7.test.tsx` — CTA **Clôturer la session** → navigation **`/cash-register/session/close`** (remplace l’ancienne cible `/caisse/cloture`).

### E2E (Vitest + `App`, `peintre-nano/tests/e2e/`)

- [x] `cash-register-session-close-13-3.e2e.test.tsx` — sans session sur **`/cash-register/deferred/session/close`** → **`/caisse`** + hub ; avec session sur **`/cash-register/session/close`** → résumé clôture visible.

## Exécution locale (2026-04-12, DS)

```bash
cd peintre-nano
npm run lint && npm run test && npm run build
```

Résultat : **380 tests** Vitest + build Vite **OK** (Story 13.3 intégrée au lot complet).

## Exécution locale (2026-04-12, Story Runner — après correctif titres `CaisseSessionCloseSurface`)

Meme commandes `npm run lint` ; `npm run test` ; `npm run build` dans `peintre-nano` : **380** tests **OK**, build **OK**.

## Validation checklist — Story 13.3

- [x] Routage alias + non-régression continuum 6.7 (CTA dashboard).
- [x] Synthèse mise à jour dans ce fichier.

---

# Synthèse automatisation des tests — Story 13.4 (hub `/caisse`, RCN-01)

## Contexte

Story **13.4** : parité observable **hub caisse** — checklist RCN-01, ligne matrice **`ui-pilote-03e-rcn-01-hub-caisse`**, doc **`peintre-nano/docs/03-contrats-creos-et-donnees.md`** § RCN-01 ; **LoadingOverlay** zone cartes lors du chargement des postes (`GET /v1/cash-registers/status`).

## Tests générés / étendus

### Unitaires (`peintre-nano/tests/unit/`)

- [x] `runtime-demo-cash-register-hub-rcn-01-13-4.test.tsx` — `RuntimeDemoApp` sur **`/caisse`** : hub compact, titres + cartes poste + variantes, pas de **`flow-renderer-cashflow-nominal`** ; **chargement** postes (`aria-busy` pendant **`GET /v1/cash-registers/status`** différé) ; **liste vide** API (`caisse-hub-empty-register-list`).

### E2E (Vitest + `App`, `peintre-nano/tests/e2e/`)

- [x] `cash-register-hub-rcn-01-13-4.e2e.test.tsx` — mêmes invariants sur **`App`** avec fetch mocké (`cash-sessions/current`, `cash-registers/status`) ; scénarios **chargement** + **liste vide** alignés sur les états observables hub (Story 13.4 / doc § RCN-01).

## Exécution locale (2026-04-12, DS)

`npx vitest run` dans **`peintre-nano`** : **382** tests **OK** (lot complet incluant 13.4).

## Exécution locale (2026-04-12, QA — bmad-qa-generate-e2e-tests)

`npm run test` dans **`peintre-nano`** : **386** tests **OK** (ajouts chargement + liste vide sur hub RCN-01).

## Validation checklist — Story 13.4

- [x] Preuves DevTools legacy + Peintre documentées dans la story (sans secrets).
- [x] Synthèse mise à jour dans ce fichier.
- [x] Cas automatisables jsdom : hub + états **chargement** et **liste vide** (`aria-busy`, `caisse-hub-empty-register-list`) — hors AC réseau MCP / matrice (manuel).
