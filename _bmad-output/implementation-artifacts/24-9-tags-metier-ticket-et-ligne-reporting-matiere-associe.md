# Story 24.9 : Tags métier ticket et ligne — reporting matière associé

Status: done

**Story key :** `24-9-tags-metier-ticket-et-ligne-reporting-matiere-associe`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Branche de travail attendue :** `epic/24-operations-speciales-orchestration`  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-9-tags-metier-ticket-et-ligne-reporting-matiere-associe.md`

## Contexte produit

Le **PRD opérations spéciales** exige que les gratuités et variantes sociales soient des **tags dans le parcours ticket standard** (ticket et/ou ligne), avec **règles de surcharge** (tag ticket par défaut ; tag ligne qui prime), et des **hooks de reporting** pour statistiques matière / bénéficiaires / période. L’**ADR D5** fige ce choix (pas de modules CREOS parallèles au flux nominal). Le dépôt dispose aujourd’hui de **discriminants techniques épars** au niveau **vente** (`special_encaissement_kind`, `social_action_kind` — Stories 6.5 / 6.6) et de **lignes article** (`SaleItem`) **sans** champ tag métier dédié : l’écart par rapport à la **liste PRD** (gratiféria, campagne sociale, tags paramétrables, etc.) est documenté dans le paquet audit P0.

Pour les **flux financiers** où des tags coexistent avec de l’argent (vente/remboursement, opérations sensibles), les exigences **ADR D6** (initiateur / validateur dans journaux et charges utiles) et **D7** (visibilité d’un état de synchronisation cohérent avec l’outbox / Epic 8) restent **alignées** avec le reste de l’Epic 24 — sans court-circuiter la chaîne canonique Paheko.

## Story (BDD)

As a **analyste d’impact social ou responsable terrain**,  
I want **des tags métier explicites au niveau ticket et ligne, avec règles de surcharge claires et des sorties exploitables pour le reporting matière**,  
So that **les statistiques reflètent la réalité opérationnelle (gratuités, publics, campagnes) sans parcours ad hoc parallèles au ticket standard**.

## Acceptance criteria (source epics.md §24.9 + PRD §12–13, §17.3, §20.2 + ADR D5 / D6 / D7)

1. **Modèle métier tags (ADR D5)** — *Given* l’ADR D5 (tags dans le flux ticket standard, niveau ticket et/ou ligne) ; *When* la fonctionnalité est livrée ; *Then* le comportement documenté pour l’implémentation inclut au minimum : **persistance** des tags (ou équivalent stockage autoritaire côté API), **sémantique de surcharge** ticket → ligne documentée et appliquée serveur (la ligne peut surcharger le ticket), et **énumération / configuration** alignée PRD (liste indicative §8.2 / §12.2, extensibilité « autre tag paramétrable » §12.2) — en réconcilant l’existant `special_encaissement_kind` / `social_action_kind` (migration ou couche de compatibilité **explicitée**, pas de double vérité silencieuse).

2. **Ticket standard enrichi (PRD §20.2)** — *Given* le flux nominal de caisse ; *When* l’opérateur qualifie une sortie gratuite ou sociale ; *Then* l’UI permet d’appliquer des tags **ticket** et/ou **ligne** dans le parcours standard (pas un hub parallèle « gratuité lourde »), avec libellés et permissions cohérents (cf. PRD §16 `caisse.free` optionnelle si séparation explicite des gratuités).

3. **Reporting matière / statistiques (epics + PRD §12.3, §13)** — *Given* la matière est déjà portée par les lignes (catégorie, poids, etc.) ; *When* un rapport ou agrégat « par tag » est produit (minimal : **endpoint agrégé**, export CSV, ou vue supervision déjà existante étendue) ; *Then* il est possible d’**agréger** au moins par combinaison **tag × type de matière / catégorie** (ou tag seul + drill-down ligne) sur une période — la story précise le **chemin de preuve** (requête SQL documentée, test d’intégration, ou rapport Peintre) pour éviter un « reporting » uniquement narratif.

4. **Zéro € et matière (PRD §12.3, ADR D2)** — *Given* un ticket à 0 € taggé ; *When* il est enregistré ; *Then* **aucun flux financier artificiel** n’est créé pour satisfaire la compta (alignement ADR D2 matière seule) ; les écritures Paheko restent soumises à la chaîne existante pour ce qui est financier.

5. **Flux financiers sensibles + D6 / D7** — *Given* une opération **financière** du périmètre (ex. vente/remboursement avec tag, ou flux issu des opérations spéciales déjà câblées) ; *When* elle est exposée terrain ou supervision ; *Then* les patterns **initiateur / validateur** (ADR D6, réutilisation step-up / audit existants) et **visibilité sync Paheko** (ADR D7, patterns Epic 8 / outbox) restent **cohérents** avec les stories 24.3+ — sans promesse d’écriture instantanée hors snapshot / builder si la chaîne canonique ne le permet pas.

6. **Contrats et tests** — *Given* toute extension de schéma (`Sale`, `SaleItem`, DTO API, OpenAPI) ; *When* la story est fermée ; *Then* **OpenAPI** + clients consommateurs sont alignés ; des **tests** (pytest API et/ou vitest Peintre) couvrent au minimum : **surcharge ticket/ligne**, **un cas nominal 0 €**, et **un cas où tag coexiste avec flux financier** (ou rejet explicite si hors scope — alors NEEDS_HITL produit).

## Définition of Done (mesurable)

- [x] Cartographie écrite : état actuel (`special_encaissement_kind`, `social_action_kind`, wizards 6.5 / 6.6) → modèle cible tags PRD.
- [x] Persistance ticket **et** ligne (schéma + migration si nouvelles colonnes / table de liaison) ; règles de surcharge **testées** serveur.
- [x] Au moins un **hook de reporting** livré avec preuve (endpoint, export, ou requête documentée + test).
- [x] Alignement **ADR D5–D7** explicité dans les Dev Notes (pas de second rail Paheko).
- [ ] Gates : pytest / vitest / lint / build selon périmètre réel du diff (Story Runner parent pour peloton complet).

## Tasks / Subtasks

- [x] Cartographier PRD §12–13 et paquet audit P0 (ligne « Tags métier / ticket 0 € ») vs code `schemas/sale.py`, `models/sale.py`, `models/sale_item.py`.
- [x] Trancher modèle de données : extension `Sale` / `SaleItem` vs table `sale_business_tags` (N-N) ; documenter migration et compatibilité enums 6.5 / 6.6.
- [x] Spécifier API : création/lecture ticket avec tags (et lignes) ; validation surcharge ; erreurs 422 claires.
- [x] Peintre : intégrer saisie tags dans **flux nominal** (`CashflowNominalWizard` ou flux ticket standard identifié en repo) — pas seulement wizards sociaux parallèles.
- [x] Reporting minimal : endpoint agrégation ou extension vue admin/stats existante (réutiliser patterns réception/admin si pertinents).
- [x] Vérifier champs audit / step-up pour flux sensibles (alignement D6) et affichage sync (D7) là où l’UI affiche déjà ces opérations.
- [x] Mettre à jour `contracts/openapi/recyclique-api.yaml` + génération / clients ; ajouter tests.

## Dev Notes — Garde-fous techniques

### Périmètre story 24.9 (P2)

- **Inclus :** tags métier ticket/ligne, règles de surcharge, persistance, reporting matière associé minimal, alignement D5–D7 sur le périmètre décrit.
- **Hors périmètre explicite (P3) :** pièces jointes natives, seuils N3 riches, audit avancé transversal — **Story 24.10**.

### Ancres code (point de départ — à affiner en DS)

| Sujet | Chemins probables |
|------|-------------------|
| Modèle vente + enums 6.5 / 6.6 | `recyclique/api/src/recyclic_api/models/sale.py` (`SpecialEncaissementKind`, `SocialActionKind`, colonnes) |
| Schémas création / réponse vente | `recyclique/api/src/recyclic_api/schemas/sale.py` |
| Logique création vente | `recyclique/api/src/recyclic_api/services/sale_service.py` |
| Lignes article | `recyclique/api/src/recyclic_api/models/sale_item.py` |
| Enrichissement session / ventilation | `recyclique/api/src/recyclic_api/services/cash_session_response_enrichment.py` |
| Wizards caisse existants | `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`, `CashflowSocialDonWizard.tsx`, `CashflowSpecialEncaissementWizard.tsx` |
| Hub opérations spéciales (contexte navigation) | `peintre-nano/src/domains/cashflow/` — `CashflowSpecialOpsHub` (selon story 24.2) |
| Chaîne Paheko / canonical | `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |

### Risques / arbitrages

- **Cartographie enums techniques vs tags PRD :** prévoir migration ou table de mapping **versionnée** ; éviter que « social_action_kind » et « tag métier » divergent sans règle de consolidation.
- **Reporting :** si les stats réception matière vivent déjà dans un module (Epic 7), **réutiliser** agrégats et ne pas dupliquer un second entrepôt ; sinon documenter la requête minimale.
- **D7 :** ne pas inventer un statut sync par tag ; la sync reste **par opération financière / batch** selon la chaîne existante.

### Intelligence stories précédentes (24.6–24.8)

- Les flux **échange**, **décaissement**, **mouvement interne** sont stabilisés en P1 ; les tags doivent **composer** avec ces conteneurs métier quand une ligne porte à la fois matière et qualification sociale — la story DS documentera les cas limites (échange taggé, etc.).

### Cartographie DS (24.9) — état → cible

- **Avant :** discriminants `special_encaissement_kind` / `social_action_kind` (Stories 6.5 / 6.6), pas de colonnes tag dédiées sur `sale_items`.
- **Cible :** colonnes `business_tag_kind` / `business_tag_custom` sur `sales` et `sale_items`, enum `BusinessTagKind` + `AUTRE` + texte libre ; clé effectivée pour API et stats : **ligne > ticket > mapping legacy** (`business_tag_resolution.py`).
- **Compatibilité :** si discriminants legacy présents, toute valeur explicite incompatible lève `ValidationError` (pas de double vérité silencieuse). Les ventes historiques sans colonnes restent lisibles via legacy dans `effective_business_tag` et dans la requête SQL d’agrégation.

### Alignement ADR D5 / D6 / D7 (implémentation)

- **D5 :** tags dans le flux ticket standard ; persistance ticket + ligne ; surcharge documentée et testée.
- **D6 / D7 :** aucun second rail Paheko ni sync inventée par tag ; les opérations sensibles continuent d’utiliser step-up / audit existants et la chaîne snapshot/outbox inchangée pour l’écriture comptable.

## Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.9, objectifs Epic, découpage P2).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (§7 principes 11–12, §8.2, §12–13, §16 permissions, §17.3 matière, §20.2 ticket enrichi, §21 backlog P2).
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D5 tags, D6 initiateur/validateur, D7 visibilité sync).
- Paquet audit P0 — `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` (ligne Tags métier / ticket 0 € — partiel).
- Chaîne canonique — `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC epics §24.9 est couvert par une tâche ou une subsection Dev Notes. |
| Q2 | D5 / D6 / D7 cités et traduits en exigences testables (pas seulement rappel ADR). |
| Q3 | Règle de surcharge ticket vs ligne explicite + preuve test. |
| Q4 | Au moins un livrable « reporting matière associé » nommé (endpoint, export, ou requête + test). |

## Alignement sprint

- **development_status** : la clé `24-9-tags-metier-ticket-et-ligne-reporting-matiere-associe` est passée à **`review`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` après **bmad-dev-story (DS)**.
- **epic-24** : **`in-progress`** (inchangé).
- **24-10** : reste **`backlog`** (inchangé).

## Dev Agent Record

### Agent Model Used

Task — bmad-create-story (CS create puis **VS validate**), 2026-04-19 ; Task — **bmad-dev-story (DS)**, 2026-04-19

### Debug Log References

### Completion Notes List

- **VS validate** (2026-04-19) : `checklist.md` + croisement `epics.md` §24.9 + `sprint-status.yaml` — **PASS** ; prêt **bmad-dev-story** (DS).
- **DS Task** (2026-04-19) : colonnes + Alembic `s24_9_*` ; `business_tag_resolution` ; `SaleService` (create, hold, finalize-held) ; `GET /v1/stats/sales/by-business-tag-and-category` (admin + `log_admin_access`) ; OpenAPI ; Peintre `CashflowNominalWizard` + payload helper ; pytest `test_story_24_9_business_tags.py` + vitest unitaire payload. Régénérer `openapi.json` avec `python generate_openapi.py` dans un env où `DATABASE_URL` / `REDIS_URL` / `SECRET_KEY` sont définis (GATE parent sinon).
- **QA** (2026-04-19) : e2e `cashflow-business-tag-24-9.e2e.test.tsx` + parité kiosque `KioskFinalizeSaleDock`.
- **CR** (2026-04-19) : premier passage Task — faux négatif sur fichiers tests ; doc `NON_TAGUE` vs `GET` null dans `stats_service.py` ; **CR2 APPROVE**.

### File List

- `_bmad-output/implementation-artifacts/24-9-tags-metier-ticket-et-ligne-reporting-matiere-associe.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `recyclique/api/migrations/versions/s24_9_story_business_tags_sale_items.py`
- `recyclique/api/src/recyclic_api/models/sale.py`
- `recyclique/api/src/recyclic_api/models/sale_item.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/schemas/stats.py`
- `recyclique/api/src/recyclic_api/services/business_tag_resolution.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/services/stats_service.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/stats.py`
- `recyclique/api/tests/test_story_24_9_business_tags.py`
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/domains/cashflow/cashflow-draft-store.ts`
- `peintre-nano/src/domains/cashflow/cashflow-business-tag-payload.ts`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/domains/cashflow/KioskFinalizeSaleDock.tsx`
- `peintre-nano/tests/unit/cashflow-business-tag-payload.test.ts`
- `peintre-nano/tests/e2e/cashflow-business-tag-24-9.e2e.test.tsx`
