# Story 6.2 : Garantir le contexte caisse et les blocages de sécurité métier

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

## Story

En tant qu’opératrice de caisse,
je veux que le flux caisse refuse un contexte d’exploitation ambigu ou invalide,
afin de ne pas effectuer des ventes sur le mauvais site, la mauvaise caisse, la mauvaise session ou hors du périmètre de permissions.

## Acceptance Criteria

1. **Verification du contexte a l’entree / reprise** — Etant donne que la caisse est un flux terrain critique, quand une utilisatrice entre ou reprend le dashboard, l’ouverture ou le workspace caisse, alors le flux verifie le site actif, la caisse, la session, le poste et les permissions requis pour l’operation ; un contexte manquant ou ambigu produit un etat **restreint ou bloque explicite** au lieu d’une supposition silencieuse. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 6.2]

2. **Autorisation backend, pas déduction front** — Étant donné que l’UI ne peut montrer que ce que l’autorité backend autorise, quand une utilisatrice n’a pas une permission requise ou un périmètre valide, alors le flux caisse **bloque ou restreint** l’action sensible via la **sémantique d’autorisation portée par le backend** ; le retour utilisateur reste compréhensible pour les opératrices. [Source : epics.md Story 6.2 ; PRD §11.2 ; `core-architectural-decisions.md` — affichage ≠ autorisation]

3. **Sécurité > fluidité, dégradation traçable** — Étant donné que la sécurité prime sur la fluidité en cas de conflit, quand l’intégrité du contexte ne peut pas être garantie, alors le flux caisse **ne poursuit pas** comme si les conditions étaient valides ; tout chemin de dégradation reste **explicite et traçable** (messages, codes d’erreur ou états UI alignés sur les réponses / contrats backend). [Source : epics.md Story 6.2 ; PRD §4.3, §10 ; UX-DR1, UX-DR8]

4. **Aucune deduction permissive cote frontend** — Etant donne le pack Epic 6 (Convergence 3), quand le parcours caisse est servi, alors le frontend **ne deduit pas** site / caisse / session / permissions « au feeling » a partir d’etat local, de caches ou d’heuristiques UI ; il **consomme** `ContextEnvelope` et reponses API ; les widgets / flows critiques conservent `data_contract`, `critical` et `DATA_STALE` avec **fallbacks visibles** ; la preuve UI sur stack locale : `http://127.0.0.1:4444` lorsque le parcours est visible. [Source : checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` ; epics.md note agents Epic 6]

> Correct course 2026-04-08 : story **keep**. Les acquis restent valides, avec extension attendue du garde-fou a l’entree dashboard et a l’ouverture de session brownfield.

## Tasks / Subtasks

- [x] Cartographier les points d’entrée caisse (route `/caisse`, reprise session, navigation) et les **sources canoniques** de vérité contextuelle déjà exposées (OpenAPI : `ContextEnvelope`, endpoints session caisse / opérateur, etc.). (AC : 1, 4)
  - [x] Lister les `operationId` à appeler ou à étendre pour « prêt à caisser » vs « bloqué » ; mettre à jour `contracts/openapi/recyclique-api.yaml` (via pipeline codegen, pas édition manuelle des générateurs). (AC : 2, 4)
- [x] Backend `recyclique/api` : garantir que toute opération sensible du flux caisse (au minimum cohérent avec story 6.1 : création vente / paiement, lecture session) **revalide** site, caisse, session, opératrice et permissions ; réponses d’erreur **stables** et exploitables par l’UI (pas de 200 ambigu). (AC : 2, 3)
  - [x] Couvrir les cas : session absente / fermée / autre opératrice, caisse non ouverte, site incohérent avec le jeton, permission manquante. (AC : 1, 3)
- [x] `Peintre_nano` — domaine `cashflow` : **garde d’entrée** (avant interaction vente) qui reflète uniquement l’état **autoritatif** (enveloppe + API) : état bloqué / restreint avec libellés terrain, pas de continuation silencieuse du wizard nominal. (AC : 1, 3, 4)
  - [x] Aligner manifests CREOS (`page-cashflow-nominal`, navigation) si de nouveaux états ou widgets de statut contexte sont nécessaires ; promouvoir sous `contracts/creos/manifests/` si le slice est référence. (AC : 4)
- [x] Tests : pytest sur refus backend contextualisés ; tests front (Vitest) sur affichage bloqué / restreint sans bypass par état local ; documenter ou étendre les preuves existantes story 6.1 (stale + mutation). (AC : 1–4)
- [x] Vérification manuelle sur UI servie `http://127.0.0.1:4444` : scénarios bloqués visibles (session invalide, permission manquante). (AC : 3, 4) — *Consignes prêtes ; exécution terrain / session opératrice hors agent DS (brief parent).*

## Dev Notes

### Pack contexte Epic 6 (garde-fous développeur)

- **Périmètre** : complète la story **6.1** (parcours nominal) en **verrouillant le contexte** ; ne pas dupliquer la logique métier côté UI.
- **Backend** : `recyclique/api` = autorité pour **contexte, permissions, blocages** ; le front = rendu, flux déclaratifs, **reflet** des décisions serveur.
- **Hiérarchie de vérité** : `OpenAPI` → `ContextEnvelope` → manifests CREOS → `UserRuntimePrefs` (non métier).
- **Checklist obligatoire avant PR** : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` (points 1–12, en particulier 5 : pas de recalcul permissions « au feeling » ; 6 : mutations revalidées ; 10 : fallbacks / `DATA_STALE` visibles).
- **Gouvernance contrats** : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`.

### Exigences techniques (non négociables)

- **Interdit** : déduire qu’une vente est permise uniquement parce que l’écran s’affiche ou qu’un brouillon local existe.
- **Requis** : erreurs et états bloquants **alignés** sur contrats backend (codes, messages) ; traçabilité côté API / logs / audit selon patterns existants (Epic 2).
- Types / clients : une seule chaîne OpenAPI ; `data_contract.operation_id` résolu pour tout widget alimenté par des données métier.

### Conformité architecture

- Décisions sécurité : `core-architectural-decisions.md` — § Authentication & Security, § API (revalidation mutations, `ContextEnvelope` canonique OpenAPI).
- PRD : §4.3 zéro fuite, §10 états widget / `DATA_STALE`, §9.1 cashflow (cohérence avec fluidité **sous** contrainte sécurité).
- UX : UX-DR1 (contexte visible), UX-DR8 (taxonomie erreurs / blocages).

### Fichiers et zones probables

- `peintre-nano/src/domains/cashflow/` — garde contexte, intégration enveloppe, messages bloquants.
- `peintre-nano/src/types/context-envelope.ts`, adaptateurs auth / session existants (story 6.1).
- `contracts/openapi/recyclique-api.yaml`, manifests `contracts/creos/manifests/page-cashflow-nominal.json`, `navigation-transverse-served.json`, catalogue widgets cashflow.
- `recyclique/api/src/recyclic_api/api/` (endpoints caisse, ventes, contexte), services et tests (`test_sales_mutation_auth_contract.py`, tests session caisse, extensions).

### Tests

- Réutiliser les patterns story 6.1 : `cashflow-stale-blocks-payment`, `test_sale_service_story61_operator_revalidation.py` ; ajouter cas **contexte invalide avant toute saisie vente**.
- Préférer des assertions sur **réponses HTTP** et **états UI** explicites, pas sur des mocks de permission inventés côté front seul.

### Intelligence story précédente (6.1)

- Slice nominal déjà branché : `FlowRenderer`, wizard cashflow, widget ticket `data_contract.critical`, `sales-client`, `SaleService.create_sale` avec contrôle opératrice / session.
- Fichiers de référence : voir section « File List » dans `6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md` — **étendre** plutôt que recréer des chemins parallèles.
- Limite connue 6.1 : smoke clavier non rejoué systématiquement ; pour 6.2, prioriser **preuve des blocages contextuels** servis sur `4444`.

### Intelligence git récente (aperçu dépôt)

- Travaux récents dominants : clôture Epics 4–5, alignement Docker / `peintre-nano` ; contrats et shell transverse stabilisés — la story 6.2 s’appuie sur cette base sans refondre le socle.

### Recherche « dernière version » (rappel)

- Pins réels : `peintre-nano/package.json`, `recyclique/api` requirements ; l’architecture cite Mantine 8.x, SQLAlchemy 2.x — confirmer avant d’ajouter des dépendances.

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.2
- `_bmad-output/planning-artifacts/prd.md` — §4.3, §10, §11.2, cashflow / contexte
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 3, cartographie tests
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/creos/schemas/widget-declaration.schema.json`, `widget-data-states.schema.json`
- `_bmad-output/implementation-artifacts/6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md`

### project-context.md

- Aucun `project-context.md` à la racine du dépôt ; s’appuyer sur les documents ci-dessus et sur les stories d’implémentation Epics 3–6 dans `_bmad-output/implementation-artifacts/`.

## Dev Agent Record

### Agent Model Used

Composer (sous-agent DS Story Runner), 2026-04-08.

### Debug Log References

### Completion Notes List

- Backend : `SaleService.create_sale` revalide opérateur (sauf admin/super-admin), site utilisateur ↔ session, permission `caisse.access` pour les USER ; `get_sale_readable_by_user` + route GET `/sales/{id}` avec Bearer, contrôle permission/site/opérateur (admins élargis).
- OpenAPI : descriptions POST/GET ventes et réponses 401/403 GET ; regénération `contracts/openapi/generated/recyclique-api.ts`.
- Front : `CashflowNominalWizard` bloque sur `runtimeStatus` forbidden/degraded, `siteId` absent, absence de `caisse.access` dans l’enveloppe ; tests Vitest dédiés.
- Tests API : helper `tests/caisse_sale_eligibility.py` + ajustements intégration ventes ; mocks `test_sale_service_story62_context.py`.

### File List

- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/test_sale_service_story62_context.py`
- `recyclique/api/tests/test_sales_integration.py`
- `recyclique/api/tests/test_sale_service.py`
- `recyclique/api/tests/test_sale_persistence.py`
- `recyclique/api/tests/test_b49_p2_no_item_pricing.py`
- `recyclique/api/tests/test_b52_p3_sale_date.py`
- `recyclique/api/tests/test_cash_session_deferred.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/creos/manifests/page-cashflow-nominal.json`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/tests/unit/cashflow-context-gate-6-2.test.tsx`
- `peintre-nano/src/domains/cashflow/README.md`

### Change Log

- 2026-04-08 — Implémentation Story 6.2 (contexte caisse, blocages, contrats, tests).

---

**Story completion status**

- Statut fichier : **review** (gates npm / QA e2e / code-review hors périmètre brief parent DS).
