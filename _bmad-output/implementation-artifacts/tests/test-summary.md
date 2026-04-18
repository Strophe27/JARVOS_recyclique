# Synthèse automatisation des tests — Story 24.1 (audit PRD–dépôt, plan P0)

## Contexte

Story **24.1** : audit **documentation uniquement** — matrices PRD–dépôt et plan de tests P0 dans `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md`. **Aucune** nouvelle surface UI/API livrée par cette story.

## Stratégie QA (skill `bmad-qa-generate-e2e-tests`)

| Volet | Approche |
|--------|-----------|
| **Tests API** | **NA** — pas d’endpoint nouveau dans le périmètre 24.1. |
| **E2E UI** | **NA** — pas de parcours produit nouveau à automatiser ; le plan P0 est **cible** pour **24.2+**. |
| **Synthèse dédiée** | `tests/24-1-audit-repo-aware-doc-qa-summary.md` (checklist skill + justification « aucun e2e nouveau requis pour 24.1 »). |

## Tests générés

- Aucun fichier de test ajouté ou modifié pour 24.1 (bornage documentaire).

## Commande de reproduction

- **Aucune** — pas de test automatisé nouveau pour cette story (politique : pas de suite complète ; pas de commande ciblée sans fichier de test).

## Validation checklist workflow

- Story documentaire : génération API/E2E **non requise** ; synthèse créée — **conforme**.

---

# Synthèse automatisation des tests — Story 10.6c (spike PG 15→17, doc)

## Contexte

La story **10.6c** livre un **runbook** et des **preuves documentaires** de spike (hors changement de tags `postgres:*` et hors workflows — réservé **10.6d**). Il n'y a **pas** de parcours UI à couvrir en E2E navigateur pour cette story.

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

- Exécuter `python -m pytest tests/infra` en CI si un job couvre déjà la racine du mono-repo ; sinon l'ajouter au pipeline ciblé (hors périmètre de cette tâche QA générée).
- Après merge **10.6d** / **10.6e** : étendre la stratégie avec tests applicatifs sur image PG 17.

## Validation checklist (workflow Quinn)

- Tests générés : doc smoke + pas d'E2E UI imposé — conforme au bornage story.
- Tous les tests `tests/infra` passent localement après ajout.

---

# Synthèse automatisation des tests — Story 13.1 (alias `/cash-register/session/open`)

## Contexte

Story **13.1** : parité UI **adjacente** au kiosque nominal — routage legacy **`/cash-register/session/open`** vers le même `page_key` **`cashflow-nominal`** que le hub `/caisse`, **sans** mode kiosque (nav visible). Les tests unitaires existants ciblent `RuntimeDemoApp` ; cette synthèse documente l'extension **E2E Vitest/jsdom** sur l'arbre **`App` + `RootProviders`** (même convention que `tests/e2e/README.md`).

## Tests générés / étendus

### E2E (Vitest + Testing Library, `peintre-nano/tests/e2e/`)

- [x] `peintre-nano/tests/e2e/cash-register-session-open-13-1.e2e.test.tsx` — Parcours `App` avec `fetch` mocké (`GET /v1/cash-sessions/current` → pas de session) :
  - URL legacy avec `register_id` : brownfield + wizard nominal + `flow-renderer-cashflow-nominal`, nav présente, **absence** de `cash-register-sale-kiosk`, heading **Caisse — poste opératoire**.
  - Slash final sur `/cash-register/session/open/`.
  - **Non-régression 11.3** : `/cash-register/sale` conserve le kiosque (marqueur présent, nav masquée).

### Tests API

- [ ] Non ajoutés (inchangé : pas d'endpoint dédié story 13.1).

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
- [x] (régression) `caisse-brownfield-dashboard-6-7.test.tsx` — CTA **Clôturer la session** → navigation **`/cash-register/session/close`** (remplace l'ancienne cible `/caisse/cloture`).

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

---

# Synthèse automatisation des tests — Story 17.1 (`/admin/pending`, admin transverse)

## Contexte

Story **17.1** : entrée nav transverse **Utilisateurs en attente**, route **`/admin/pending`**, shell admin (hub, famille `admin`), page manifest **`transverse-admin-pending`** avec widgets placeholder (gap OpenAPI **`GET /v1/admin/users/pending`** — pas de binding live inventé).

## Tests existants couvrant 17.1 (revue grep `pending` / `transverse-admin-pending` / `/admin/pending`)

### E2E (Vitest + Testing Library, `peintre-nano/tests/e2e/`)

- [x] `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` — Lot **Story 5.4** : libellé nav **Utilisateurs en attente** ; **parcours** clic → `/admin/pending` + `data-transverse-family="admin"` + titre H1 + `widget-admin-pending-users-demo` + texte gap OpenAPI ; **URL profonde** `/admin/pending` → `aria-current` + placeholder.

### Contrat / manifest servi (`peintre-nano/tests/contract/`)

- [x] `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — Résolution nav/page `transverse-admin-pending`, `path` `/admin/pending`, slots widget attendus, garde **`transverse.admin.view`**.

### Unitaires complémentaires

- [x] `peintre-nano/tests/unit/transverse-templates-5-6.test.tsx` — Mode layout hub pour `transverse-admin-pending`.
- [x] `peintre-nano/tests/unit/prune-navigation-for-live-toolbar.test.ts` — Sélection toolbar live pour entrée pending.

## Couverture AC (indicatif)

- Route + `page_key` + nav label : **oui** (e2e + contract).
- Shell admin (hub / famille) : **oui** (e2e `transverse-page-shell`, `data-transverse-family`).
- Placeholder honnête (mention endpoint absent) : **oui** (e2e + widget `data-testid`).
- Pas de tests inventant un fetch live pending : **respecté** (placeholder statique uniquement).

## Exécution locale (2026-04-12, QA — bmad-qa-generate-e2e-tests, sous-agent Task)

```powershell
Set-Location peintre-nano
npm run test
```

Résultat Vitest : **89** fichiers, **403** tests, **tous passés**, durée ~**118 s** (Vitest 3.2.4).

## Validation checklist (workflow Quinn) — Story 17.1

- [x] E2E UI : parcours + deep link + libellés (patterns alignés `navigation-transverse-5-1.e2e.test.tsx`).
- [x] Contract tests : manifest / permissions alignés story.
- [x] Suite complète `npm run test` : OK — **aucun** fichier de test modifié dans cette passe (couverture déjà suffisante).

## Lacunes éventuelles

- **E2E navigateur Playwright** : non requis par le périmètre actuel (stack = Vitest/jsdom comme le reste de `tests/e2e/`).
- **Binding API réel** (`GET /v1/admin/users/pending`) : explicitement hors scope jusqu'à fermeture gap OpenAPI (Epic 16) — pas de test API à ajouter ici.

---

# Synthèse automatisation des tests — Story 13.7 (blueprint portage kiosque, doc-only)

## Contexte

Story **13.7** : blueprint et matrice **documentaires** (legacy kiosque → cibles CREOS / 13.8). **Aucune** implémentation kiosque dans ce lot (**13.8**). Acceptation : **relecture PO** ; pas de suite pytest/vitest **obligatoire** pour 13.7.

## Stratégie QA (bmad-qa-generate-e2e-tests)

| Volet | Approche |
|--------|-----------|
| **Nouveaux tests** | **Aucun** — pas de delta code ; les E2E/unitaires existants (caisse, hub RCN, kiosque 13.6, etc.) restent la preuve de non-régression sur `peintre-nano`. |
| **Contrat markdown / smoke doc** | **Non ajouté** — volontairement minimal ; le livrable est la **qualité documentaire** (PO), pas des assertions structurelles sur le markdown du blueprint. |

## Gates locaux (`peintre-nano/`, 2026-04-12)

- **1er passage QA :** `npm run lint` (`tsc -b`) **OK** ; `npm run test` **OK** — 90 fichiers, 411 tests (Vitest 3.2.4).
- **2e passage QA** (après correctifs doc + **alignement statuts AC** dans les livrables 13.7) : mêmes commandes — **lint OK**, **test OK** (90 fichiers, 411 tests, tous passés).

## Détail

Voir [`13-7-blueprint-kiosque-doc-qa-summary.md`](./13-7-blueprint-kiosque-doc-qa-summary.md) (section *2e passage*).

## Validation checklist (workflow Quinn) — Story 13.7

- Synthèse créée ; pas de génération API/E2E supplémentaire — conforme au bornage story et au blueprint.
- **2e passe** : doc et AC recadrés ; gates `peintre-nano` inchangés et toujours verts.

---

# Synthèse automatisation des tests — Story 18.2 (session-manager + cash-sessions détail)

## Contexte

Story **18.2** : surfaces **`/admin/session-manager`** et **`/admin/cash-sessions/:id`** alignées CREOS, gap **K** explicite, exports sensibles classe **B** exclus visuellement. Tests principalement dans le lot transverse **5.1** (contrat + E2E jsdom).

## Fichiers

- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (renfort QA 2026-04-12 : assertion textuelle des deux gaps liste + KPIs dans le parcours session-manager)

## Détail et mapping AC

Voir [`test-summary-story-18-2-qa.md`](./test-summary-story-18-2-qa.md).

## Validation checklist (workflow Quinn) — Story 18.2

- `vitest run` sur les deux fichiers ci-dessus : **70** tests **OK** (2026-04-12, phase QA).

---

# Synthèse automatisation des tests — Story 19.1 (réception-stats + supervision nominative)

## Contexte

Story **19.1** : stats réception et blocs de supervision sous **`/admin/reception-stats`**, entrée nav **`transverse-admin-reception-stats`**, widget **`admin.reception.stats.supervision`**, gap **K** nominatif explicite ; lien hub **`admin-hub-link-reception-stats`** (18.1).

## Fichiers

- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tests/unit/admin-reception-stats-supervision-widget.test.tsx`

## Détail

Voir [`test-summary-story-19-1-qa.md`](./test-summary-story-19-1-qa.md).

## Validation checklist (workflow Quinn) — Story 19.1

- `npm test` ciblant les **3** fichiers ci-dessus : **79** tests **OK** (2026-04-12, phase QA Task — cas erreur **403** unitaire ajouté).

### Revalidation (2026-04-12, sous-agent Task `resume_at: QA`)

```powershell
Set-Location "D:/users/Strophe/Documents/1-IA/La Clique Qui Recycle/JARVOS_recyclique/peintre-nano"
npm test -- tests/contract/navigation-transverse-served-5-1.test.ts tests/e2e/navigation-transverse-5-1.e2e.test.tsx tests/unit/admin-reception-stats-supervision-widget.test.tsx
```

Résultat : **3** fichiers, **79** tests, **tous passés** (exit code **0**), durée ~**18 s** — extension **`admin-reception-stats-supervision-widget.test.tsx`** : alerte défensive **403** sur `GET /v1/stats/reception/summary` (checklist Quinn, cas d’erreur critique).

### Revalidation antérieure (2026-04-12, worker `resume_at: DS`)

Résultat historique : **78** tests sans le cas **403** unitaire.

---

# Synthèse automatisation des tests — Story 19.2 (reception-sessions + reception-tickets/:id)

## Contexte

Story **19.2** : liste tickets admin **`/admin/reception-sessions`**, détail **`/admin/reception-tickets/:id`**, mocks `fetch` alignés `recyclique_reception_listTickets` / `recyclique_reception_getTicketDetail` ; pas de tests API backend dans ce volet (UI jsdom uniquement).

## Fichiers touchés (phase QA `bmad-qa-generate-e2e-tests`)

- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` — ajout parcours **drill-down** liste → clic **Détail** → URL canonique + widget détail + ancrage `getTicketDetail` (complète les cas nav / URL profonde / hub déjà livrés par le DS).

## Couverture (indicatif)

- **E2E** : nav, URL profonde sessions, URL profonde ticket, hub → sessions, **drill-down** ligne → détail (nouveau).
- **Contrat** : inchangé par cette passe QA (`navigation-transverse-served-5-1.test.ts` déjà étendu en DS).
- **Gaps acceptables** : erreurs API liste/détail (4xx/5xx) hors parcours happy path ; mutations / export classe **B** (hors scope story, exclusion UI non rejouée ici).

## Validation checklist (workflow Quinn) — Story 19.2

- `npm test` dans **`peintre-nano`** : suite complète **OK** (exit code **0**, 2026-04-12, phase QA Task) après ajout du test drill-down.

---

# Synthèse automatisation des tests — Story 19.3 (pilotage réception, exports B hors critère)

## Contexte

Story **19.3** : parité observable **stats réception** + **sessions tickets** + **détail ticket** ; pas de nav **`/admin/reception-reports`** ; dettes export **B** et gap manifestes **visibles** ; pas d'`operation_id` inventés hors OpenAPI. Preuve navigateur MCP : **NEEDS_HITL** déjà consigné dans la story et `references/artefacts/2026-04-12_08_preuve-parite-pilotage-reception-19-3-needs-hitl.md`.

## Fichiers de tests validés (phase QA `bmad-qa-generate-e2e-tests`, sous-agent Task)

- [x] `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — `describe('Story 19.3 — pilotage réception (bundle CREOS)')` : absence nav `/admin/reception-reports`, texte **contract-gap** `recyclique_admin_reports_receptionTicketsExportBulk` + **Epic 16**.
- [x] `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` — `Story 19.3 — hub → stats → hub → sessions` : chaîne hub → stats (gap **K** nominatif) → hub → sessions (export **B** nommé, `admin-reception-tickets-scope-note`), absence `nav-entry-transverse-admin-reception-reports`.

## Exécution locale (2026-04-12, QA — ciblé, sans gate npm complet)

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\peintre-nano"
npm test -- tests/contract/navigation-transverse-served-5-1.test.ts tests/e2e/navigation-transverse-5-1.e2e.test.tsx
```

Résultat Vitest : **2** fichiers, **88** tests, **tous passés** (exit code **0**), durée ~**16 s**.

## Couverture (indicatif)

- **Contrat CREOS** : pas d'entrée nav réception-reports ; gap liste sessions cite l'export bulk documenté.
- **E2E jsdom** : parcours observable hub ↔ stats ↔ sessions + marqueurs dette **B** / scope note ; pas d'activation d'exports **B** comme critère de succès implicite.

## Validation checklist (workflow Quinn) — Story 19.3

- [x] E2E + contrat : chemins et assertions alignés AC **19.3** (rail **U**).
- [x] Tests exécutés avec succès sur le périmètre ciblé.
- [x] Synthèse ajoutée dans ce fichier.
- **MCP `user-chrome-devtools`** : hors exécution automatisée — voir **NEEDS_HITL** story / artefact **08** (AC3).
