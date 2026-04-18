# Story 24.4 : Parcours expert remboursement exercice antérieur clos (N-1)

Status: done

**Story key :** `24-4-parcours-expert-remboursement-exercice-anterieur-clos-n-1`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-4-parcours-expert-remboursement-exercice-anterieur-clos-n-1.md`

> Note create-story : analyse exhaustive `epics.md` §24.4, PRD opérations spéciales §10.3, chaîne canonique N-1 (Story 22.5), paquet audit P0 § matrice N-1, code existant `CashflowRefundWizard` + erreur stable `[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]`.

## Contexte produit

Le **backend** distingue déjà les remboursements « exercice antérieur clos » : résolution d’autorité fiscale (`AccountingPeriodAuthorityService`), branche `prior_closed`, permission **`accounting.prior_year_refund`**, corps `expert_prior_year_refund: true` sur `POST /v1/sales/reversals`, codes HTTP documentés (OpenAPI). En revanche, l’**intention PRD** (§10.3) exige un **parcours expert explicite** : visibilité terrain, blocages non silencieux, champs de justification / niveau de preuve, **audit** exploitable en supervision — sans que l’opérateur découvre le besoin d’expert **uniquement** après une erreur API.

Cette story **complète** le remboursement standard (24.3) : même route `/caisse/remboursement` mais **gouvernance et UX** du sous-flux N-1 clos alignés PRD.

## Story (BDD)

As a **responsible cash manager**,  
I want **prior-year closed refunds routed through explicit authority**,  
So that **fiscal-period mistakes are not silent**.

## Acceptance criteria (source epics.md §24.4 + cadrage PRD)

Les quatre points ci-dessous déclinent les **Given / When / Then / And** de `_bmad-output/planning-artifacts/epics.md` (Story 24.4) : visibilité UX terrain, règles de blocage alignées PRD, audit supervision, libellé permission `accounting.prior_year_refund`.

1. **Visibilité du parcours expert** — *Given* le backend expose déjà la distinction expert N-1 (`accounting.prior_year_refund`, `expert_prior_year_refund`, erreur `[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]` — cf. OpenAPI / `sale_service.py`) ; *When* un utilisateur ouvre le parcours remboursement depuis le hub opérations spéciales ou directement ; *Then* le **chemin expert N-1** est **identifiable** (libellés, encart d’information ou entrée catalogue) **avant** la tentative finale, pas seulement après échec — **sans** fusionner sémantiquement avec le remboursement « standard » du même écran.
2. **Règles de blocage alignées PRD** — *Given* PRD §10.3 (blocage par défaut, autorisation uniquement via voie experte, écriture séparée côté chaîne) ; *When* un cas `prior_closed` est détecté côté serveur ou signalé au client ; *Then* les **messages d’erreur / états UI** reflètent l’intention (pas de succès ambigu, pas de contournement par repli silencieux) et le **double contrôle** expert (`expert_prior_year_refund` + permission) reste **cohérent** avec les tests 22.5 / contrats existants.
3. **Audit et supervision** — *Given* la traçabilité attendue pour N-3 recommandé (PRD) ; *When* un remboursement N-1 expert est enregistré ; *Then* les **enregistrements existants** (reversal, journal `PaymentTransaction`, logs audit backend si déjà branchés) restent **suffisants** pour la supervision, ou des **compléments minimalistes** sont ajoutés (ex. champ justification N-1 côté API + affichage succès / export audit) **sans** doublon de chaîne Paheko (ADR D1).
4. **Permission — libellé et alignement** — *Given* la permission canonique **`accounting.prior_year_refund`** (`recyclique/api`, ex. `sale_service.py`, migration `s22_5_refund_canonical_accounting_period_authority` / seeds tests) ; *When* l’UI ou l’admin affiche le nom du droit ; *Then* le libellé utilisateur (hub, wizard, écran groupes/permissions si applicable) **correspond** à l’implémentation **ou** toute évolution de chaîne permission est faite **de concert** backend + OpenAPI + Peintre (pas de décalage documenté).

## Définition of Done (mesurable)

- [x] Cartographie écart PRD §10.3 vs implémenté (champs « justification N-1 », validateur, preuve N3) documentée dans les Dev Notes finales ; tout gap assumé nommé (HITL produit) ou comblé par livrable minimal.
- [x] Aucune régression sur **24.3** (moyen effectif, hint Paheko clôture), **22.5** (autorité fiscale), idempotence reversal.
- [x] Tests : au moins un scénario **permission manquante** + un **happy path** expert (`expert_prior_year_refund` + permission) au niveau **pytest** et/ou **vitest/e2e** selon périmètre UI réel.
- [x] OpenAPI + client TypeScript **alignés** si nouveaux champs ou libellés d’erreur exposés.

## Tasks / Subtasks

- [x] Cartographier l’existant : `CashflowRefundWizard.tsx` (panneau `cashflow-refund-prior-year-panel`, gate sur erreur API), `sales-client.ts` (`expert_prior_year_refund`), `sale_service.py` / schémas `SaleReversalCreate` / réponses 409, tests `test_story_22_5*.py`.
- [x] Mettre à jour le **hub** `CashflowSpecialOpsHub` (et/ou manifest page remboursement) pour **annoncer** le sous-parcours N-1 expert (même URL `/caisse/remboursement` acceptable si le **texte** le distingue clairement).
- [x] Trancher et implémenter : **visibilité proactive** (indicateurs depuis réponse `GET sale` / autorité si exposée) vs **réaction à `[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]`** — documenter la décision ; éviter les succès trompeurs.
- [x] Aligner **blocages et messages** avec PRD §10.3 ; vérifier cohérence codes erreur OpenAPI (`PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH`, 403 permission).
- [x] **Audit** : vérifier ce qui est déjà persisté sur le reversal ; ajouter justification / métadonnées **si** PRD l’exige et le backend ne les porte pas encore (migration légère + schéma + UI minimale).
- [x] Harmoniser **libellés permission** (`accounting.prior_year_refund`) dans l’UI admin/groups si une chaîne diverge.
- [x] Étendre les tests existants (`cashflow-refund-gate-6-4`, e2e remboursement, pytest 22.5) pour couvrir les AC ci-dessus.

## Dev Notes — Garde-fous techniques

### Périmètre story 24.4

- **Inclus :** UX et règles métier **terrain** pour le remboursement **exercice antérieur clos** ; alignement libellés permission ; compléments audit **si nécessaire** ; messages de blocage explicites.
- **Hors périmètre :** remboursement **sans ticket** (story **24.5**) ; nouveau rail Paheko ; refonte complète du wizard 6.4.

### Ancres code (réutiliser, ne pas réinventer)

| Sujet | Chemins |
|------|---------|
| Wizard remboursement + gate N-1 | `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx` (`priorYearExpertGateOpen`, `expertPriorYearRefundConfirmed`, `PRIOR_YEAR_REFUND_REQUIRES_EXPERT`) |
| Hub opérations spéciales | `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx` |
| Client API | `peintre-nano/src/api/sales-client.ts` (`expert_prior_year_refund`) |
| Service reversal + autorité | `recyclique/api/src/recyclic_api/services/sale_service.py` (`create_sale_reversal`, garde N-1) |
| Autorité période | `AccountingPeriodAuthorityService` (résolution branche refund) |
| Schémas | `recyclique/api/src/recyclic_api/schemas/sale.py` — champs `expert_prior_year_refund`, `fiscal_branch` |
| OpenAPI | `contracts/openapi/recyclique-api.yaml` — descriptions `expert_prior_year_refund`, erreurs 409 |
| Tests référence | `recyclique/api/tests/test_story_22_5_refund_canonical_authority.py` (ou équivalent), `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx` |

### Risques / arbitrages

- **Ne pas** simuler l’autorité N-1 uniquement côté front : la vérité reste serveur (Story 22.5).
- **Chaîne Paheko** : rappeler sur l’écran succès que l’écriture suit le snapshot de clôture (cohérence 24.3 / ADR D7).
- **Justification N-1** : si le PRD exige un champ libre non présent en base, une **petite migration** + validation serveur peut être nécessaire — coordonner avec contrat OpenAPI.

### Intelligence story 24.3 (continuité)

- **24.3** a enrichi `SaleReversalResponse` et l’écran succès (moyen effectif, branche fiscale, hint Paheko). La **24.4** doit **réutiliser** ces surfaces pour afficher clairement une ligne « remboursement N-1 expert » lorsque `fiscal_branch === 'prior_closed'` / métadonnées alignées.
- Garde-fou explicite 24.3 : ne pas casser les tests **pytest 24.3** ni les e2e remboursement.

### Intelligence git (récents)

- Travaux récents Epic 24 : 24-3 (remboursement standard + sync), 24-2 (hub), 24-1 (audit P0) — patterns **peintre-nano** + **contracts/openapi** + pytest ciblé.

### Références tech / versions

- Pas de montée de version framework imposée par cette story ; suivre les versions du monorepo existantes (`package.json` peintre-nano, dépendances API).

### Cartographie PRD §10.3 vs livré (Dev Notes finales — Story 24.4)

| Attendu PRD (extrait §10.3 / story) | Implémenté |
|-------------------------------------|------------|
| Visibilité parcours expert avant tentative finale | **Oui** : `GET /v1/sales/{id}` enrichi avec `fiscal_branch` / années (même résolution que reversal) ; encart `cashflow-refund-prior-closed-banner` + hub carte dédiée ; panneau expert dès chargement si `prior_closed`. |
| Double contrôle `expert_prior_year_refund` + permission | **Inchangé** côté API (22.5) ; UI envoie le flag seulement après case cochée ; bouton désactivé si permission ou confirmation manquante. |
| Champ libre « justification N-1 » dédié | **Non ajouté** : le motif détaillé existant (`reason_code` + `detail` pour `AUTRE`) + audit `log_audit` / journal `PaymentTransaction.is_prior_year_special_case` jugés suffisants — **HITL produit** si un champ d’audit supplémentaire hors `detail` est exigé. |
| Preuve « niveau N3 » explicite | **Hors scope** livré : pas de nouveau stockage ; traçabilité via enregistrements existants + libellé succès expert N-1. |

**Décision technique** : visibilité **proactive** (champs autorité sur `SaleResponse`) **et** garde **réactive** (`priorYearExpertGateOpen` après 409 si un client ancien ne recevrait pas les champs GET).

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.4, goal Epic 24).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§10.3 remboursement exercice antérieur clos).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D1 pas de second rail).
- Chaîne canonique — `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (sous-écriture N-1).
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (ligne N-1 partiel / implémenté).
- Story 22.5 — `_bmad-output/implementation-artifacts/22-5-etendre-le-remboursement-au-modele-comptable-cible-et-verrouiller-lautorite-exercice-anterieur-clos.md`.
- Story 24.3 — `_bmad-output/implementation-artifacts/24-3-remboursement-standard-visibilite-terrain-et-chaine-paheko-et-statut-sync.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC epics §24.4 est couvert par une tâche ou une section Dev Notes. |
| Q2 | Le parcours expert N-1 est **nommé** et **distinguable** du remboursement standard sur le terrain (hub ou wizard). |
| Q3 | Alignement **`accounting.prior_year_refund`** : chaîne unique permission UI ↔ backend ↔ OpenAPI. |
| Q4 | Audit / justification : soit déjà suffisant, soit complément **minimal** documenté + tests. |

## Alignement sprint

- **development_status** : la clé `24-4-parcours-expert-remboursement-exercice-anterieur-clos-n-1` est **`review`** (post-DS) ; un **CS idempotent** ne doit **pas** la repasser en `ready-for-dev` ni en `backlog` — seul le **premier** passage CS (historique YAML) a fait backlog → `ready-for-dev`.
- **epic-24** : **`in-progress`** (inchangé si déjà).

## Dev Agent Record

### Agent Model Used

Task — bmad-dev-story (DS), 2026-04-18

### Debug Log References

N/A.

### Completion Notes List

- `SaleResponse` + `GET /v1/sales/{id}` : prévisualisation autorité remboursement (`fiscal_branch`, `sale_fiscal_year`, `current_open_fiscal_year`) via `build_sale_response` (aligné `resolve_refund_branch`).
- Wizard : parcours expert **visible au chargement** si `prior_closed` ; même panneau + 409 legacy ; validation locale + bouton désactivé sans permission `accounting.prior_year_refund` / case ; ligne succès « expert N-1 » ; récap fiscal dans l’étape 2.
- Hub : carte « Remboursement exercice antérieur clos (expert N-1) » + CTA même URL, texte distinct du standard.
- OpenAPI (`contracts/openapi`) + `sales-client` + `recyclique-api.ts` généré : champs optionnels alignés.
- Tests : pytest `test_get_sale_includes_refund_fiscal_preview_prior_closed` ; vitest `cashflow-refund-24-4-prior-year-ux.test.tsx` (permission manquante / permission + case / régression 6.4).
- UI admin groupes : pas d’écran séparé identifié avec libellé divergent ; clé canonique réaffichée dans hub/wizard.

### File List

- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique/api/tests/test_story_22_5_refund_canonical_authority.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialOpsHub.tsx`
- `peintre-nano/tests/unit/cashflow-refund-24-4-prior-year-ux.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/24-4-parcours-expert-remboursement-exercice-anterieur-clos-n-1.md`

### Change Log

- 2026-04-18 — Story 24.4 créée (CS create-story).
- 2026-04-18 — Implémentation DS (parcours expert N-1, GET fiscal preview, hub, tests).
- 2026-04-19 — CS create-story (idempotent) : alignement `epics.md` §24.4 ; section « Alignement sprint » corrigée (pas de régression statut `review` → `ready-for-dev` / `backlog`).
