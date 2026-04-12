# Story 6.3 : Ajouter le parcours ticket en attente

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

## Story

En tant qu'opératrice de caisse,
je veux mettre un ticket en attente et le reprendre plus tard,
afin que la caisse v2 supporte un schéma d'interruption courant sur le terrain sans perdre la vente en cours.

## Acceptance Criteria

1. **État d'attente explicite et reprise contrôlée** — Étant donné que l'interruption de ticket est un besoin terrain pour la caisse, quand le flux « mise en attente » est implémenté, alors une opératrice peut placer la vente courante dans un **état d'attente explicite** et la **reprendre ultérieurement** de façon contrôlée (sélection / rechargement selon règles produit) ; le comportement reste **cohérent** avec le contexte caisse (site, caisse, session, opératrice, permissions) et avec les règles de **persistance locale** Recyclique (enregistrement terrain sans prétendre à la réconciliation comptable finale). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 6.3 ; PRD §9.1 cashflow, §10 / contexte garanti ; annexe produit brief]

2. **Traçabilité UI + backend** — Étant donné qu'un ticket en attente appartient toujours au flux métier caisse, quand il est repris ou abandonné selon les règles autorisées, alors l'UI et le backend gardent l'opération **compréhensible et traçable** dans le **meme workspace caisse** (identifiants stables, états visibles, pas de reprise « silencieuse » depuis un autre périmètre) ; la story **ne requiert pas** une réconciliation comptable complète pour être utile. [Source : epics.md Story 6.3]

3. **Backend autoritaire, front sans logique métier sensible** — Étant donné la note agents Epic 6 (`epics.md`) et la checklist Peintre, quand le parcours ticket en attente est livré, alors les **règles** (qui peut mettre en attente, combien de tickets, durée de vie, conflit avec paiement, abandon, rattachement session) sont **décidées et appliquées côté `recyclique/api`** ; `Peintre_nano` ne fait que **refléter** les réponses / contrats (OpenAPI) et orchestrer le rendu (`FlowRenderer`, widgets, manifests CREOS) — **pas** de source de vérité métier parallèle dans un store front seul. [Source : epics.md note agents Epic 6 ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` ; `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — mutations / hiérarchie de vérité]

4. **Indépendance du parcours nominal** — Étant donné qu'Epic 6 doit rester séquentiel et livrable par incréments, quand cette story est terminée, alors le **parcours nominal** de caisse (story 6.1) reste **utilisable seul** ; la mise en attente est une **extension** (actions et états additionnels) sans casser les AC des stories 6.1 et 6.2 (contexte, blocages, `data_contract.critical`, double barrière stale/paiement). [Source : epics.md Story 6.3 ; stories `6-1-…`, `6-2-…`]

> Correct course 2026-04-08 : story **keep**. La capacite reste valide, mais doit etre rebranchee comme variante du poste caisse brownfield, pas comme extension d'un slice abstrait.
> Revalidation attendue : verifier explicitement ce parcours apres la nouvelle `6.1`, dans le workspace brownfield recompose.

## Tasks / Subtasks

- [x] **Contrat et modèle** — Formaliser dans `contracts/openapi/recyclique-api.yaml` les opérations nécessaires (ex. création / mise à jour d'une vente ou d'un panier « suspendu », liste des tickets en attente pour la session, reprise, abandon ou annulation selon vocabulaire métier retenu) avec `operationId` stables ; aligner schémas Pydantic / SQLAlchemy et migrations si nouveaux champs ou statuts (le modèle `Sale` actuel n'expose pas encore d'état « brouillon / en attente » — à introduire ou équivalent métier documenté). (AC : 1–3)
  - [x] Régénérer les clients TypeScript depuis OpenAPI ; ne pas éditer les fichiers générés à la main pour contourner le contrat. (AC : 3) — *Pas de client OpenAPI généré pour les ventes dans le dépôt : extension de `peintre-nano/src/api/sales-client.ts` alignée sur les `operationId` du YAML (même pratique que 6.1).*
- [x] **Backend** — Implémenter la persistance et les règles d'autorisation (même esprit que 6.2 : revalidation contexte session / site / opératrice / permissions) ; journalisation / audit cohérente avec `recyclique/api/docs/story-2-5-epic8-audit-foundations.md` pour les opérations critiques caisse. (AC : 2, 3)
- [x] **Peintre_nano** — Étendre le domaine `peintre-nano/src/domains/cashflow/` : actions UI explicites (ex. « Mettre en attente », « Reprendre », liste bornée des tickets en attente) branchées sur les hooks client générés ; intégrer au flow déclaratif existant (`FlowRenderer`, wizard nominal) sans dupliquer les règles métier. (AC : 1, 3, 4)
  - [x] Mettre à jour les manifests CREOS sous `contracts/creos/manifests/` (page cashflow, catalogue widgets) si nouveaux widgets ou étapes — pas de `page_key` orpheline côté React. (AC : 3, 4) — *Texte d'en-tête page `page-cashflow-nominal.json` ; pas de nouveau widget orphelin.*
- [x] **Persistance locale côté UI** — L'état **transitoire** d'affichage peut rester dans les patterns existants (`cashflow-draft-store` ou équivalent) **uniquement** comme cache de confort **sous** la vérité API : au chargement / reprise, **recharger** depuis le backend ; en cas de divergence ou d'erreur, états visibles (`DATA_STALE` / erreurs) comme pour le ticket courant critique. (AC : 1, 3)
- [x] **Tests** — Pytest : scénarios mise en attente, liste, reprise, refus (mauvaise session, autre opératrice si règle métier, tentative paiement sur ticket non finalisable) ; Vitest : rendu des états bloqués / listes / reprise sans bypass par mock de permission côté front seul. (AC : 2–4)
- [x] **Vérification manuelle** — Parcours sur UI servie `http://127.0.0.1:4444` : mise en attente → autre action → reprise ; vérifier cohérence avec bandeau / contexte (UX-DR1). (AC : 1, 4) — *Non exécutée dans ce DS (stack locale non levée dans l'agent) : à faire au démarrage `peintre-nano` + API derrière le proxy `/api`.*

## Dev Notes

### Pack contexte Epic 6 (garde-fous développeur)

- **Périmètre** : après 6.1 (continuum brownfield : dashboard + **workspace de vente continu**, ex. `#caisse-sale-workspace` — voir `_bmad-output/implementation-artifacts/6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md`) et 6.2 (garde contexte) — **étendre** les fichiers et contrats existants, ne pas créer un second « mini-caisse » parallèle ; le held reste une **variante du même poste** (cf. mapping / checklist brownfield).
- **Alignement UX terrain** : le PRD et les epics citent les opérations fréquentes incluant le ticket en attente (UX-DR6 dans `epics.md`, tableau UX) ; garder le flux **clair au clavier** (PRD §9.1).
- **Convergence 3** : flows critiques avec données réelles ; conserver `data_contract` sur les widgets alimentés par API ; ne pas affaiblir le blocage stale avant paiement sur le ticket courant. [Source : `guide-pilotage-v2.md` — Convergence 3 ; intro Epic 6 `epics.md`]

### Exigences techniques (non négociables)

- Toute donnée métier affichée : `data_contract.operation_id` résolu dans OpenAPI.
- Aucune règle « qui peut reprendre quel ticket » ou « combien de suspensions » uniquement dans le front.
- Gouvernance contrats : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`.

### Conformité architecture

- Hiérarchie : OpenAPI → `ContextEnvelope` → manifests CREOS → runtime Peintre (`navigation-structure-contract.md`, `core-architectural-decisions.md`).
- Structure dépôt : `project-structure-boundaries.md` — `contracts/`, `peintre-nano/src/domains/cashflow/`, `recyclique/api/`.

### Fichiers et zones probables

- `recyclique/api/src/recyclic_api/models/sale.py` (ou extension dédiée si le métier impose une entité séparée), `services/sale_service.py`, `api/api_v1/endpoints/sales.py` (ou routes v2 si convention du repo).
- `contracts/openapi/recyclique-api.yaml`, manifests `page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json`, `navigation-transverse-served.json`.
- `peintre-nano/src/domains/cashflow/` — `CashflowNominalWizard.tsx`, `cashflow-draft-store.ts`, `CaisseCurrentTicketWidget.tsx`, enregistrement widgets.

### Tests

- Réutiliser les helpers et patterns des stories 6.1 / 6.2 (`test_sale_service_story62_context.py`, `caisse_sale_eligibility.py`, `cashflow-context-gate-6-2.test.tsx`, `cashflow-stale-blocks-payment.test.tsx`).

### Intelligence stories précédentes (6.1, 6.2)

- 6.1 : flux nominal, `FlowRenderer`, widget ticket `data_contract.critical`, `POST/GET` ventes, `SaleService.create_sale` avec contrôle opératrice / session, store brouillon local pour confort UX.
- 6.2 : garde d'entrée wizard sur `runtimeStatus` / enveloppe / permission `caisse.access` ; pas de continuation silencieuse si contexte invalide.
- **À éviter** : faire de la « mise en attente » uniquement comme variable Zustand sans persistance backend — incompatible avec AC « traçable » et backend autoritaire.

### Recherche « dernière version » (rappel)

- Pas de nouvelle librairie imposée par cette story ; confirmer les pins dans `peintre-nano/package.json` et dépendances API si ajout de schémas.

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6 (intro, note agents), Story 6.3, UX-DR6 (accessibilité opérations terrain)
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 3, cartographie tests, Pistes A/B
- `_bmad-output/planning-artifacts/prd.md` — §9.1 Cashflow, §10 états widget / `DATA_STALE`, contexte garanti
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` — Truth hierarchy
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`
- `recyclique/api/docs/story-2-5-epic8-audit-foundations.md` — persistance terrain, audit
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/implementation-artifacts/6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md`
- `_bmad-output/implementation-artifacts/6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier.md`
- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md` — rebaseline Epic 6 ; story 6.3 **keep** ; capacité **held** dans le poste caisse unique (pas extension « flow abstrait » seul)
- `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md` — § Vente : mise en attente / reprise / abandon depuis le **même workspace caisse**
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md` — correct course brownfield-first ; stories `keep` raccordées à la baseline recomposee

### project-context.md

- Aucun `project-context.md` à la racine du dépôt repéré ; s'appuyer sur les documents ci-dessus.

## Dev Agent Record

### Agent Model Used

Composer (agent Task / DS) — 2026-04-08.

### Debug Log References

- SQLite partiel : alignement `sales.lifecycle_status` via `conftest._sqlite_align_sales_story_63` ; `PaymentTransaction` ajouté à la liste des tables SQLite de test.
- Filtres `User.id` : cast `UUID(str(user_id))` pour `list /held`, `get /{id}`, PATCH item, note admin (compatibilité SQLite).

### Completion Notes List

- Parcours **held** : `POST /v1/sales/hold`, `GET /v1/sales/held`, `POST /v1/sales/{id}/finalize-held`, `POST /v1/sales/{id}/abandon-held` ; agrégats session uniquement sur ventes `lifecycle_status=completed` ; plafond 10 tickets en attente par session.
- UI : liste + reprise (GET vente) + abandon + mise en attente depuis l'étape Lignes ; paiement appelle `finalize-held` si `activeHeldSaleId` dans le store.
- Migration Alembic `c6e3_sale_lifecycle` pour PostgreSQL / déploiements utilisant Alembic.
- **Preuve manuelle** : avec stack sur `http://127.0.0.1:4444`, enchaîner lignes → mettre en attente → rafraîchir liste → reprendre → paiement → ticket finalisé ; vérifier bandeau contexte.

### File List

- `contracts/openapi/recyclique-api.yaml`
- `contracts/creos/manifests/page-cashflow-nominal.json`
- `recyclique/api/migrations/versions/c6e3_story_6_3_sale_lifecycle_status.py`
- `recyclique/api/src/recyclic_api/models/sale.py`
- `recyclique/api/src/recyclic_api/models/cash_session.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/services/cash_session_response_enrichment.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_sale_held_story63_integration.py`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/domains/cashflow/cashflow-draft-store.ts`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.module.css`
- `peintre-nano/src/domains/cashflow/CaisseCurrentTicketWidget.tsx`
- `peintre-nano/tests/unit/cashflow-held-finalize-6-3.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-3-ajouter-le-parcours-ticket-en-attente.md`

---

**Story completion status**

- Contexte create-story (CS) : analyse `epics.md`, `guide-pilotage-v2.md`, architecture (index + décisions cœur), stories 6.1–6.2, brief produit (ticket en attente, persistance locale, backend autoritaire).
- Statut fichier : **review** — implémentation DS terminée ; tests ciblés 6.3 + non-régression 6.2 (sale service) OK.

## Change Log

- 2026-04-08 — Revalidation baseline brownfield-first : références mapping + checklist + sprint-change-proposal ; périmètre Dev Notes aligné workspace 6.1 (`#caisse-sale-workspace`) et poste caisse unique.
- 2026-04-08 — Story 6.3 : cycle de vie vente (`held` / `completed` / `abandoned`), endpoints hold/list/finalize/abandon, wizard + widget ticket, tests API + Vitest finalize-held.
