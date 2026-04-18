# Story 24.1 : Audit repo-aware, matrices PRD–dépôt et plan de tests P0

Status: done

**Story key :** `24-1-audit-repo-aware-matrices-prd-depot-et-plan-de-tests-p0`  
**Epic :** 24 — Opérations spéciales de caisse, tags métier et extension Paheko terrain  
**Implementation artifact :** `_bmad-output/implementation-artifacts/24-1-audit-repo-aware-matrices-prd-depot-et-plan-de-tests-p0.md`

## Contexte produit

Cette story est le **socle P0** de l’Epic 24 : avant tout développement UI/API volumineux, il faut des preuves documentées d’alignement (ou d’écart) entre le PRD opérations spéciales, le dépôt réel (`recyclique/api/`, `peintre-nano/`) et la chaîne comptable déjà livrée (Epics 8, 22–23). Le rapport readiness du 2026-04-18 impose explicitement de **ne pas** enchaîner des stories d’implémentation large avant la livraison de 24.1.

## Story (BDD)

As a **release and accounting governance team**,  
I want **an evidence-backed gap analysis before large UI/API changes**,  
So that **we align special cash operations against what already exists** in `recyclique/api/` and `peintre-nano/`.

## Acceptance criteria

1. **Livrables nommés** — *Given* le prompt ultra opérationnel et le PRD v1.1 ; *When* la story est livrée ; *Then* les artefacts retenus existent sous **`_bmad-output/`** et/ou **`references/`** (chemins explicites dans la section Livrables ci-dessous) et couvrent au minimum : **matrice d’écarts PRD ↔ dépôt**, **matrice permissions / niveaux de preuve / acteurs**, **machine d’états opérationnelle résumée**, **plan de tests P0**.
2. **Classification** — *Given* chaque grand parcours du PRD (annulation, remboursement standard, N-1, sans ticket, décaissement, mouvement interne, échange, tags / 0 €, sync Paheko) ; *When* on lit les livrables ; *Then* chaque parcours est classé **implémenté**, **partiel** ou **manquant**, avec **pointeurs fichier** (chemins relatifs au repo) vers API, modèles, UI Peintre, tests ou « vide » si absent.
3. **Stratégie chaîne Paheko** — *Given* l’ADR D1 et les exigences Epic 8 / 22–23 ; *When* on lit le paquet 24.1 ; *Then* la stratégie **outbox / idempotence / pas de second rail Paheko** est **explicitement documentée** avec renvois à :
   - `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D1),
   - `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`,
   - et rappel contextuel Epics **8** et **22–23** (pas besoin d’un fichier séparé si un livrable unique regroupe matrices + ce paragraphe — cf. epics.md).
4. **Arbitrages ouverts** — *Given* le readiness report (remboursement sans ticket, ventilation post–Epic 23, charge vs permission N1–N3) ; *When* l’audit identifie un blocage ; *Then* il est **nommé** (question + options + recommandation ou « NEEDS_HITL ») plutôt que masqué.
5. **Index références** — *When* de nouveaux fichiers sont ajoutés sous `references/operations-speciales-recyclique/` ; *Then* `references/operations-speciales-recyclique/index.md` est mis à jour pour les référencer.

## Définition of Done

- [x] Tous les livrables listés § Livrables sont présents, datés et rédigés en français (aligné `communication_language` projet).
- [x] Au moins une passe **repo-aware** documentée (méthode : lecture ciblée + `grep`/recherche chemins — pas de supposition sans fichier).
- [x] Aucune affirmation « existe dans le code » sans chemin ou extrait de référence vérifiable.
- [x] Le paquet est relisable par le Story Runner suivant (24.2+) sans relire tout le PRD brut.
- [x] Revue courte : checklist QA Gate § satisfaite.

## Livrables attendus (noms recommandés)

L’implémenteur peut **regrouper** tout dans un seul fichier « paquet 24.1 » ou **scinder** par fichier ; dans les deux cas, lister les chemins finaux dans le Dev Agent Record.

| Livrable | Rôle | Emplacement suggéré |
|----------|------|---------------------|
| Paquet d’audit P0 (ou index qui pointe les sections) | Contient ou agrège matrices + états + plan de tests + paragraphe stratégie Paheko | `references/operations-speciales-recyclique/` **ou** `_bmad-output/planning-artifacts/` — préfixe date cohérent (ex. `2026-04-18_…` ou date du jour de livraison) |
| Matrice PRD ↔ dépôt | Lignes = parcours / capacités PRD ; colonnes = état + pointeurs code | idem |
| Matrice permissions / preuve / initiateur–validateur | Croise permissions réelles (`recyclique/api`), step-up, niveaux N1–N3 PRD | idem |
| Machine d’états opérationnelle (résumée) | Synthèse lisible terrain + lien vers détail PRD si besoin | idem |
| Plan de tests P0 | Cas minimaux par famille P0 (nominal, expert, dégradé Paheko aligné Epic 8) — **cible** pour stories 24.2–24.5 | idem |

## Tasks / Subtasks

- [x] Lire les sources de vérité : PRD `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`, prompt `2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md`, ADR `2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`, `implementation-readiness-report-2026-04-18-operations-speciales.md`.
- [x] Cartographier le backend : endpoints caisse / ventes / remboursements (`recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py` et voisins), services (`SaleService`, builders Paheko, outbox), permissions (`caisse.refund`, `accounting.prior_year_refund`, etc.), migrations récentes compta.
- [x] Cartographier le frontend : routes et manifests Peintre sous `peintre-nano/` (parcours caisse existants, absence de hub « opérations spéciales » si non trouvé — l’indiquer).
- [x] Rédiger les matrices et la machine d’états ; intégrer le paragraphe **stratégie outbox / idempotence** (D1, chaîne canonique, pas de second rail).
- [x] Rédiger le **plan de tests P0** (traçabilité vers pytest / vitest / e2e existants ou à créer plus tard — pas d’obligation d’exécuter tous les tests dans 24.1, mais les nommer).
- [x] Mettre à jour `references/operations-speciales-recyclique/index.md` si nouveaux fichiers.
- [x] Remplir le **Dev Agent Record** (chemins finaux, résumé).

## Dev Notes — Périmètre et garde-fous

### Périmètre story 24.1

- **Inclus :** documentation, matrices, analyse, recommandations d’ordre, risques, pointeurs code.
- **Hors périmètre :** implémentation des parcours 24.2+ (hub, écrans, nouveaux endpoints) — sauf micro-script d’audit local **non commité** si l’équipe le juge utile (éviter d’élargir le scope sans arbitrage).

### Points de vigilance (readiness)

1. **Remboursement sans ticket :** trancher ou documenter l’arbitrage (nouveau modèle vs extension contrôlée des `sale_reversal` / schémas) — cf. readiness § Points de vigilance.
2. **Ventilation Paheko remboursements :** continuité avec chaîne post–Epic 23 (builder unique détaillé — ne pas réintroduire d’agrégat).
3. **Charge vs permission :** table explicite N1–N3 PRD ↔ permissions et step-up existants.

### Fichiers et zones probables (non exhaustif)

| Zone | Chemins indicatifs |
|------|-------------------|
| API remboursements | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py` (`create_sale_reversal`, etc.) |
| Service métier | `recyclique/api/src/recyclic_api/services/sale_service.py` (ou équivalent après refacto) |
| Modèles | `recyclique/api/src/recyclic_api/models/sale_reversal.py`, transactions paiement |
| Builders / Paheko | `paheko_close_batch_builder.py`, outbox, tests `test_story_8_*`, `test_story_23_*`, `test_story_22_*` |
| Permissions tests | `recyclique/api/tests/caisse_sale_eligibility.py` |
| UI | `peintre-nano/` — recherche routes caisse, kiosque, supervision |
| Chaîne canonique doc | `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |

### Références

- Epic 24 — `_bmad-output/planning-artifacts/epics.md` (Story 24.1 + découpage P0–P3).
- PRD — `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`.
- Prompt ultra opérationnel — `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md`.
- ADR — `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`.
- Readiness — `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.
- Index dossier produit — `references/operations-speciales-recyclique/index.md`.

## QA Gate (story — avant review)

| # | Vérification |
|---|----------------|
| Q1 | Chaque AC de la story 24.1 dans `epics.md` est couvert par une section ou un livrable nommé. |
| Q2 | Les chemins cités dans les matrices existent dans le repo au moment de la livraison (ou sont marqués « absent »). |
| Q3 | Le paragraphe stratégie Paheko cite bien ADR D1 + `cash-accounting-paheko-canonical-chain.md` + contexte Epics 8 / 22–23. |
| Q4 | `index.md` du dossier `references/operations-speciales-recyclique/` reflète les nouveaux fichiers (AC5). |

---

## Dev Agent Record

### Agent Model Used

Composer (agent d’implémentation BMAD DS, story 24.1)

### Debug Log References

Aucune exécution de suite de tests (story documentation uniquement) ; preuves = chemins fichiers cités dans le paquet d’audit.

### Completion Notes List

- Livré le paquet P0 `references/operations-speciales-recyclique/2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` : matrices PRD ↔ dépôt, permissions / preuves / acteurs, machine d’états résumée, plan de tests P0, stratégie Paheko (D1 + chaîne canonique + Epics 8 / 22–23), arbitrages NEEDS_HITL (sans ticket, seuils N1–N3).
- Index dossier produit mis à jour pour référencer le paquet.
- Hub « opérations spéciales » PRD : non présent dans `peintre-nano/public/manifests/navigation.json` — noté dans le livrable.

### File List

- `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\references\operations-speciales-recyclique\2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md`
- `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\references\operations-speciales-recyclique\index.md`
- `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\implementation-artifacts\24-1-audit-repo-aware-matrices-prd-depot-et-plan-de-tests-p0.md`

### Change Log

- 2026-04-18 — DS bmad-dev-story : story 24.1 ready-for-dev → review ; livrable paquet audit P0 + index.
