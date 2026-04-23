# Synthèse tests automatisés (bmad-qa-generate-e2e-tests)

**Navigation Epic 26 :** sections regroupées en tête de fichier (`Story 26.5` → `26.2`). Recherche IDE : `## Story 26.` Point d’entrée catalogue : entrée **Synthèse tests (QA / bmad-qa)** dans `references/index.md`.

---

## Story 26.5 — P2 outillage : ruff, F1 repository, ADR guide tests, README (2026-04-22)

- **Story Runner (fin) :** CS→VS→DS→GATE→QA→CR **APPROVE** ; story **`done`** ; **`epic-26`** **`done`** ; vs_loop=0 qa_loop=0 cr_loop=0.
- **Résultat QA :** **PASS** ; **qa_loop** : **inchangé** (pas d’itération de correction sur cette passe ; gates déjà verts côté DS).
- **Métriques :** `6 passed` — gate `test_infrastructure.py` ; `ruff check src/recyclic_api` **exit 0** ; `compileall` **exit 0**.
- **Nouveaux tests automatisés :** **aucun requis** — périmètre **outillage + documentation** (pas de feature UI ni de changement de contrat API). Preuves **AC** = artefacts versionnés + gates Story Runner.
- **E2E UI / Playwright :** **NA** (inutile pour cette story ; pas de parcours utilisateur modifié).

### Preuves par AC (traces dans le dépôt)

- **Ruff (ou rejet documenté)** : `recyclique/api/pyproject.toml` — `ruff==0.9.10` dans `[project.optional-dependencies].dev`, `[tool.ruff]` (format type Black, lint E9 minimal) ; `recyclique/api/README.md` — install `[dev]`, commandes `ruff format` / `ruff check`, note F10 Docker.
- **Double norme repository (F1)** : `_bmad-output/planning-artifacts/architecture/index.md` (§ Epic 26, paragraphe repository + ruff) ; lien audit.
- **Guide stabilisation** : `_bmad-output/planning-artifacts/architecture/2026-04-22-adr-tests-stabilization-no-separate-guide-epic-26.md` (ADR « pas de guide séparé ») ; `recyclique/api/tests/README.md` — section stabilisation, lien ADR, plus d’attente d’un `TESTS_STABILIZATION_GUIDE.md` fantôme.
- **F7–F11 / trace** : `epic-26-cloture-f7-f11-trace.md` mentionné dans la story 26.5 (complément F10 / ruff).

### Commande de validation (cwd `recyclique/api`, exit 0)

```text
python -m compileall -q src/recyclic_api
python -m pytest tests/test_infrastructure.py --tb=short -q
python -m ruff check src/recyclic_api
```

---

## Story 26.4 — Schémas : convention PEP 604, vague 1 (`category`, `context_envelope`, `email_log`, 2026-04-22)

- **Résultat QA :** **PASS** ; **qa_loop** : **1** (ajustement assertion Pydantic `CategoryUpdate` après premier run).
- **Métriques :** `9 passed` — gate `test_infrastructure.py` (6) + smoke schémas (3).
- **Nouveaux :** `recyclique/api/tests/test_schemas_pep604_wave1_story_26_4.py` — instanciation Pydantic avec `... | None` explicites (`CategoryCreate` / `CategoryUpdate`, `ContextEnvelopeResponse` / `ExploitationContextIdsOut`, `EmailLogFilters` / `EmailLogResponse`). Complète la couverture métier déjà présente (`test_category_*`, `test_openapi_validation` / `test_context_envelope`, `test_email_logs_endpoint` / `test_email_log_service`) sans dupliquer les parcours HTTP.
- **E2E UI :** **NA** (refactor typage schémas uniquement ; pas de changement produit).
- **Contrôle statique :** aucun `Optional[` résiduel dans les trois fichiers de la vague 1.

### Commande de validation (cwd `recyclique/api`, exit 0)

```text
python -m compileall -q src/recyclic_api
python -m pytest tests/test_infrastructure.py tests/test_schemas_pep604_wave1_story_26_4.py -q --tb=short
```

### Couverture visée (AC story 26.4)

- Même sémantique optionnel/requis sur les modèles touchés après migration **`T | None`**.
- Gates parent Story Runner : **compileall** + **`test_infrastructure`** verts ; smoke schémas verrouille la vague 1 hors régression Pydantic silencieuse.

---

## Story 26.3 — Normaliser async vs ORM sync (pilote categories, API pytest, 2026-04-22)

- **Résultat QA :** **PASS** ; `qa_loop` : **0** (peloton + gate vert sans nouveau test requis).
- **Métriques :** `151 passed` (peloton categories + `test_infrastructure.py`, aligné Dev Agent Record).
- **Nouveaux :** **aucun** — pas de **gap bloquant** : les chemins critiques `CategoryService` / `CategoryManagementService` / routes `def` restent couverts par `test_category_*` (arch03, b48) et `test_categories_endpoint.py` ; l’exception **Option B** `async def` sur **`POST /v1/categories/import/analyze`** (`await file.read()`) est déjà exercée par `test_categories_import.py` et `test_category_import_price_logic.py` (appels `admin_client.post(..., files=...)`).
- **E2E UI :** **NA** (API uniquement).

### Commande de validation (cwd `recyclique/api`, exit 0)

```text
python -m compileall src/recyclic_api -q
python -m pytest tests/api/test_categories_endpoint.py tests/test_category_create_arch03.py tests/test_category_update_arch03.py tests/test_category_soft_delete_arch03.py tests/test_category_soft_delete_b48_p1.py tests/test_category_restore_arch03.py tests/test_category_hard_delete_arch03.py tests/test_category_management_arch03.py tests/test_category_export.py tests/test_category_import_price_logic.py tests/test_categories_import.py tests/test_category_display_name_b48_p5.py tests/test_category_price_removal.py tests/test_integration_category_migration.py tests/test_sales_stats_by_category.py tests/test_infrastructure.py --tb=short -q
```

### Couverture visée (AC story 26.3)

- Même contrat HTTP / corps sur scénarios couverts — **non-régression** après passage routes/services en **`def`** + ORM synchrone.
- Route async documentée (import analyze) : **comportement API inchangé** vérifié par tests import existants.

---

## Story 26.2 — Extraire `admin_users_groups` vers un service (API + service pytest, 2026-04-22)

- **Résultat QA :** **PASS** ; **qa_loop** : **0** (premier run vert après ajout tests service).
- **Métriques :** 34 passed (gate + `test_admin_user_groups_assignment_service` : 5 tests).
- **Nouveaux / renforcé :** `recyclique/api/tests/test_admin_user_groups_assignment_service.py` — appels directs à `update_user_groups_assignment` (happy path, `UserNotFoundForAssignment` ×2, `InvalidGroupIdForAssignment`, `GroupNotFoundForAssignment`). L’existant `test_user_groups.py`, `TestAdminUsersGroupsContract`, `test_admin_users_groups_routes.py` couvre déjà l’API ; les tests service ferment la boucle F4 (régression sur le module extrait).
- **E2E UI :** **NA** (API uniquement).

### Commande de validation (cwd `recyclique/api`, exit 0)

```bash
python -m pytest tests/test_infrastructure.py tests/test_user_groups.py tests/api/test_admin_user_management.py tests/test_admin_users_groups_routes.py tests/test_groups_and_permissions.py::TestAdminUsersGroupsContract tests/test_admin_user_groups_assignment_service.py --tb=short -q
```

### Couverture visée (AC story)

- Délégation endpoint → `admin_user_groups_assignment_service` : comportement transactionnel + exceptions métiers alignés sur les réponses HTTP existantes.
- Non-régression `PUT /v1/admin/users/{id}/groups` (gates listés + contract).

---

## Story 25.15 — Spike faisabilité IndexedDB / cache local sans PWA (documentaire, 2026-04-20)

- **Synthèse QA :** [`test-summary-story-25-15-spike-indexeddb-cache-local-sans-pwa.md`](test-summary-story-25-15-spike-indexeddb-cache-local-sans-pwa.md) — **PASS** ; gate pytest `test_story_25_15_spike_faisabilite_indexeddb_cache_local_sans_pwa.py` (`14 passed`) ; rapport `_bmad-output/implementation-artifacts/2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md`. E2E navigateur / IndexedDB en CI : **SKIP** (spike doc uniquement ; pas d’UI livrée ; contrainte « pas d’IDB navigateur obligatoire en CI »).

---

## Story 25.14 — Step-up / revalidation après contexte sensible (API pytest, 2026-04-20)

- **Synthèse QA :** [`test-summary-story-25-14-step-up-revalidation-contexte-sensible.md`](test-summary-story-25-14-step-up-revalidation-contexte-sensible.md) — **PASS** ; `5 passed` sur `test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py` ; complément **session caisse** stale + PIN ; E2E navigateur **NA** (matrice). **qa_loop** inchangé.
- **Alignement :** matrice `_bmad-output/implementation-artifacts/2026-04-20-matrice-step-up-revalidation-contexte-sensible-25-14.md` ; ADR 25-2 / ordre 25.8 → step-up.

---

## Story 25.13 — Journalisation identité opérateur vs poste / kiosque (API / logs, 2026-04-20)

- **Synthèse QA :** [`test-summary-story-25-13-journalisation-identite-operateur-poste-kiosque.md`](test-summary-story-25-13-journalisation-identite-operateur-poste-kiosque.md) — **PASS** ; pytest `test_sale_path_distinguishes_operator_from_register_in_logs_and_audit` ; E2E navigateur **NA** (logs structurés + audit). **Revalidé** `bmad-qa-generate-e2e-tests` (Task), 2026-04-20.
- **Alignement :** spec 25.4 §2.4 / ADR 25-2 (distinction champs opérateur vs caisse).

---

## Story 25.4 — Spec socle multisite / permissions / projection Paheko (documentaire, 2026-04-20)

- **Synthèse QA :** [`test-summary-story-25-4-doc-qa.md`](test-summary-story-25-4-doc-qa.md) — **PASS** ; pas de tests API/E2E (NA) ; conformité statique spec ↔ `epics.md` §25.4 ; citations §1.1 et index architecture vérifiés.
- **Spec :** `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`

---

## Story 25.2 — ADR PIN kiosque (documentaire, 2026-04-19)

- **Synthèse QA :** [`test-summary-story-25-2-doc-qa.md`](test-summary-story-25-2-doc-qa.md) — **PASS** ; pas de tests API/E2E (NA) ; conformité statique ADR ↔ `epics.md` §25.2.
- **ADR :** `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`

---

## Tests générés / étendus

### E2E (Vitest + Testing Library)

- [x] `peintre-nano/tests/e2e/cashflow-refund-24-4-prior-year-expert.e2e.test.tsx` — Story 24.4 : hub carte expert N-1, visibilité proactive GET `prior_closed`, permission `accounting.prior_year_refund`, happy path POST `expert_prior_year_refund`.

### Tests unitaires (déjà livrés DS)

- `peintre-nano/tests/unit/cashflow-refund-24-4-prior-year-ux.test.tsx` — wizard isolé (non relancé dans cette passe si inchangé).

## Commande de validation

```bash
cd peintre-nano
node ./node_modules/vitest/vitest.mjs run tests/e2e/cashflow-refund-24-4-prior-year-expert.e2e.test.tsx
```

## Couverture visée (AC story)

- Visibilité parcours expert N-1 avant validation finale (hub + encart wizard).
- Permission : blocage bouton sans droit ; libellé `accounting.prior_year_refund` sur la carte hub.
- Happy path : confirmation case + POST avec flag expert.

## Prochaines étapes

- Intégrer le fichier dans la CI avec les autres e2e caisse si besoin.

---

## Story 24.10 P3 (session BMAD QA e2e, 2026-04-19)

### E2E (Vitest + Testing Library)

- [x] `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-10-p3.e2e.test.tsx` — hub : copy P3 (`operations_specials_p3`, `approval_evidence_ref`, mention journal d'audit / opérations sensibles) ; navigation vers `/caisse/remboursement-exceptionnel` + wizard ; garde permission sans `refund.exceptional`.

### API (pytest, couverture règles P3 / seuil / preuve)

- [x] `recyclique/api/tests/test_story_24_10_operations_specials_p3.py` — manque preuve 422, happy path avec preuve, rejet seuil 150€ + `ERREUR_SAISIE`, P2 sans flag, validation unitaire service.

### Hors périmètre e2e (justification)

- **`GET /v1/admin/audit-log?cash_sensitive_operations=true`** : le widget `AdminAuditLogWidget` n’expose pas le filtre `cash_sensitive_operations` dans l’UI (requête sans ce paramètre) — la preuve filtre sensible reste côté API / tests backend si ajoutés.
- **Champs corps P3 (`approval_evidence_ref`) sur le wizard** : le formulaire `CashflowExceptionalRefundWizard` n’envoie pas encore ce champ ; les règles métier P3 sont couvertes par les tests pytest sur `POST .../exceptional-refunds`.

### Commande de validation

```bash
cd peintre-nano
node ./node_modules/vitest/vitest.mjs run tests/e2e/cashflow-special-ops-hub-24-10-p3.e2e.test.tsx
```

```bash
cd recyclique/api
python -m pytest tests/test_story_24_10_operations_specials_p3.py -q
```
