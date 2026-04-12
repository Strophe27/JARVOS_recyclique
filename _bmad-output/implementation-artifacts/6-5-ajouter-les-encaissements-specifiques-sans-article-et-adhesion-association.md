# Story 6.5 : Ajouter les encaissements spécifiques sans article et adhésion association

Status: done

<!-- Story Runner 2026-04-08 : CS→VS→DS→gates→QA→CR ; CR retry 1 (setAfterSuccessfulSale + e2e ticket) ; sprint-status done. -->

## Baseline et cohérence avec 6.1 (non négociable)

- **Même univers caisse** que la story **6.1** : entrée **`/caisse`**, **dashboard brownfield** + **workspace de vente continu** (`caisse-sale-workspace` / wizard nominal) : en-tête session, KPIs, saisie, **ticket courant**, **finalisation** — les encaissements spéciaux y sont des **variantes métier**, pas des parcours produit séparés.
- **Ne pas** introduire de routes transverse type `/caisse/don-sans-article`, `/caisse/adhesion-cotisation` ni d'entrées navigation « mini-produit » pour ces cas ; la découverte opère depuis le **poste caisse** (boutons / modes / étapes dans le flux existant), aligné mapping `2026-04-08_05_…` § encaissements spécifiques.
- **Composer** avec **6.2** (contexte / permissions), **6.3** (held), **6.4** (refund), **6.9** (défensif / sync différée) sans régression ; **ne pas rouvrir Epic 8 / 9** ni absorber le module adhérents (9.3).
- **Pilotage sprint** : source de vérité des statuts — `_bmad-output/implementation-artifacts/sprint-status.yaml`. **Prérequis** au sens pilotage (intégration obligatoire, pas d'îlot) : **6.1** livrée brownfield, **6.2–6.4**, **6.9** — l'implémentation 6.5 **s'y branche** ; régression sur ces stories = échec. **Distinction 6.6** : actions sociales dédiées = lot et discriminant séparés ; ne pas les confondre avec don sans article / adhésion ici.

## Story

En tant qu'opératrice de caisse,
je veux enregistrer les encaissements spécifiques **depuis le poste caisse brownfield**,
afin de couvrir les cas terrain récurrents sans fragmenter la caisse en pages séparées ni absorber le module adhérents.

## Acceptance Criteria

1. **Variantes visibles dans le poste caisse** — Étant donné que certaines opérations de caisse ne passent pas par une vente article standard, quand les flux spécifiques sont implémentés, alors la caisse expose au moins **deux variantes métier explicites** dans le **même univers caisse** (don sans article, adhésion / cotisation), nommées de façon compréhensible pour l'opératrice, sans les transformer en pages produit séparées. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 6.5 ; mapping brownfield/v2]

2. **Backend autoritaire sur la nature de l'encaissement** — Étant donné la note agents Epic 6 (métier backend-autoritaire), quand un encaissement spécial est enregistré, alors la **classification métier** (don sans article vs adhésion, montants, rattachement session/site/opératrice, champs obligatoires ou interdits) est **décidée et validée par `recyclique/api`** ; le front ne déduit pas seul l'éligibilité ni ne persiste une « vérité » locale contredisant l'API. Les schémas OpenAPI et les réponses d'erreur **4xx stables** documentent les refus (contexte caisse, permission, données incohérentes). [Source : epics.md Epic 6 intro ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]

3. **Périmètre adhérents / sync / compta** — Étant donné que les implications comptables ou membres peuvent être sensibles, quand ces encaissements sont enregistrés localement, alors l'opération reste **cohérente** avec les frontières documentées (enregistrement Recyclique d'abord, pas de simulation de réconciliation Paheko complète) ; la story **ne déplace pas** la propriété fonctionnelle « gestion des adhérents / vie associative » vers l'Epic 6 — elle se limite à un **enregistrement caisse minimal et traçable** préparable pour l'Epic 8 (sync) et **sans absorber** l'Epic 9.3 (module adhérents). Aucun appel direct Paheko depuis le frontend. [Source : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` ; epics.md Story 6.5 ; tableau opérationnel — « Ne pas basculer la logique adhérents dans Epic 6 »]

4. **Compatibilité avec 6.1–6.4 et 6.9** — Étant donné le workspace nominal (6.1), garde-fous contexte (6.2), ticket en attente (6.3), remboursement (6.4) et couche défensive / sync différée (6.9), quand les encaissements spéciaux sont ajoutés, alors les flux existants **restent utilisables** ; les agrégats de session et la comptabilité locale restent **cohérents** ; toute règle nouvelle doit être explicite en code + tests et commentée pour la clôture future. [Source : stories `6-1`…`6-4`, `6-9`]

5. **Preuve UI (politique sprint)** — Étant donné `policy.ui_proof_required: true`, quand la story est considérée prête pour revue, alors une **preuve visuelle ou procédure reproductible** est fournie : captures déposées sous `_bmad-output/implementation-artifacts/screenshots/caisse/` (convention `11-0__` ou campagne équivalente documentée) **ou** fiche de test manuel avec URL locale (ex. `http://127.0.0.1:4444`) listant les deux parcours et les résultats attendus (montants, libellés ticket/session). [Source : politique story_run ; pack `2026-04-08_02`]

6. **Frontière Epic 7 (réception / matière)** — Étant donné qu'Epic 7 porte le **parcours réception v2** et la **vérité matière** (FR29, stories 7.x), quand les encaissements spéciaux caisse sont livrés, alors ils **ne** s'implémentent **pas** dans le domaine `reception` ni dans les manifests / routes réservés au flux matière ; pas de ticket réception ni de pesée dans cette story ; pas de prémisse d'historique réception exploitable (7.4) — seule la **caisse** enregistre l'opération financière. [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 7 intro ; `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — lignes Epic 7]

> Correct course 2026-04-08 : cette story est **réécrite**. Les arbitrages, tâches et preuves historiques ci-dessous documentent l'ancienne baseline ; la cible devient une variante du poste caisse brownfield.

## Arbitrage produit figé (VS — défauts implémentables)

_Objectif : permettre DS sans HITL. Toute dérogation = correct-course ou story ultérieure._

| Sujet | Décision pour 6.5 |
|--------|-------------------|
| Modèle « don sans article » | Vente **sans lignes article** (`items` vide). **Interdit** : article fictif simulé uniquement côté UI. **Autorisé** : ligne synthétique **uniquement** si le backend l'expose et la documente dans OpenAPI (opt-in explicite). |
| Discriminant API | Champ **`special_encaissement_kind`** (schéma JSON / Python alignés) avec énumération **fermée** : `DON_SANS_ARTICLE` \| `ADHESION_ASSOCIATION` — noms stables pour OpenAPI, tests et persistance. |
| Montants | Don : total **≥ 0** ; adhésion : total **> 0** (même unité / devise que le nominal). |
| Moyens de paiement | Réutiliser **`payments[]`** (paiements multiples) comme en 6.1 ; pas de contournement hors contrat. |
| Adhésion — identité | Champ texte **`adherent_reference`** (nom ou note courte), **optionnel**, longueur max **200** caractères ; **pas** de FK adhérent, CRM, import CSV, HelloAsso (hors Epic 6 / 9.x). |
| Permissions | Nouvelle permission dédiée **`caisse.special_encaissement`** (même principe que **`caisse.refund`** en 6.4 : création en base + contrôle effectif API). **`caisse.access` seul** ne suffit **pas** pour muter ces encaissements. |
| Libellés UI (entrées principales) | **« Don (sans article) »** et **« Adhésion / cotisation »** — figés pour cette story ; `summary` / descriptions OpenAPI en français alignés. |
| Manifests CREOS | Les contrats **OpenAPI** et les **manifests CREOS** (pages / widgets / catalogue) restent la chaîne de vérité technique ; ils peuvent exister comme **fichiers distincts** pour tests contract et gouvernance. **Cible produit** : brancher les variantes **dans** le slice nominal servi sur `/caisse` (`page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json`, slots/widgets du workspace 6.1) — **pas** de fragmentation UX par nouvelles routes top-level ni entrées transverses dédiées don/adhésion. Mettre à jour la navigation **uniquement** si nécessaire pour cohérence (éviter duplication de l'intention « page produit »). Tests **contract** Peintre si touchés (cf. `peintre-nano/tests/contract/`). |

## Tasks / Subtasks

- [x] Réintégrer `don sans article` et `adhésion / cotisation` comme **variantes du poste caisse brownfield** au lieu de pages produit séparées ; **supprimer ou neutraliser** toute navigation vers routes slice isolées équivalentes (objectif : un seul lieu de travail sous `/caisse`). (AC : 1)
- [x] Vérifier l'articulation UX avec la **6.1** livrée : entrée depuis le **workspace vente continu**, vocabulaire cohérent, **retour naturel vers le ticket courant et la finalisation** (même `FlowRenderer` / wizard nominal comme mécanisme). (AC : 1, 4)
- [x] Conserver la validation backend et la permission `caisse.special_encaissement`, sans déplacer la logique adhérents ni la sync comptable dans Epic 6. (AC : 2, 3)
- [x] Revoir **manifests + catalogue widgets** pour **embarquer** les variantes dans `page-cashflow-nominal` / registre widgets (réemploi éventuel de `page-cashflow-special-*.json` comme **sources** à fusionner, pas comme UX cible multi-pages). (AC : 1, 2, 4)
- [x] Reprendre les tests et la preuve UI sur la baseline brownfield-first. (AC : 4, 5, 6) — tests automatisés à jour ; **captures AC5** : à regénérer manuellement sur `/caisse` (panneau Encaissements spécifiques) si la campagne `11-0__` est exigée telle quelle.

## Historique pre-correct-course

Les arbitrages, tâches et preuves plus bas documentent l'ancienne baseline. Ils restent utiles comme matière technique, mais **ne valent plus DoD** pour cette story.

## Dev Notes

### Pack contexte Epic 6

- **Intention** (tableau ultra opérationnel) : encaissements sans article + adhésion ; captures `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png` et `auth/11-0__auth-02-profil-page.png` = **mémoire brownfield**, pas maquette normative UX v2.
- **Frontières** : ne pas implémenter le **module adhérents** (Epic 9.3) ; ne pas ouvrir la **sync comptable complète** (Epic 8) ; ne pas confondre avec **actions sociales dédiées** (Story 6.6 — boutons lot distinct).
- **Epic 7** : la **réception** et la **vérité matière** (FR29) restent hors scope — aucun écran, manifest ou endpoint `reception` dans ce lot ; alignement explicite AC6.

### Exigences techniques (non négociables)

- Hiérarchie : OpenAPI → `ContextEnvelope` → manifests CREOS → runtime (gouvernance `2026-04-02_04`).
- Mutations : revalidation serveur ; Zustand / brouillon = non autoritatif.
- **`POST /v1/sales/`** : respecter les exigences déjà en vigueur sur les ventes sensibles (ex. en-tête step-up, `Idempotency-Key` optionnel selon implémentation actuelle dans `recyclique/api/.../endpoints/sales.py`) — **aucun contournement** pour les encaissements spéciaux ; alignement **AR24** (Epics).
- Réutiliser les patterns des stories **6.1–6.4** (widgets `data_contract`, `DATA_STALE` où données critiques).

### Conformité architecture

- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — stack UI (ADR P1, Mantine v8, tokens, Grille) ; cohérence avec **6.1**.
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — domaines `cashflow` / `adherents` : **implémentation caisse** dans `peintre-nano/src/domains/cashflow/` et API `recyclique` ; ne pas introduire de logique métier dans `adherents/` pour ce seul lot sauf décision VS explicite et minimale.

### Fichiers et zones probables

- **Alignement 6.1 (prioritaire)** : `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`, `CaisseBrownfieldDashboardWidget.tsx`, `contracts/creos/manifests/page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json` — y **brancher** les variantes don / adhésion (UI + CREOS) avant toute nouvelle route.
- `recyclique/api/src/recyclic_api/models/sale.py`, `schemas/sale.py`, `services/sale_service.py`, `api/api_v1/endpoints/sales.py`, enrichissement session si nouveaux agrégats.
- `contracts/openapi/recyclique-api.yaml`, `contracts/creos/manifests/` (y compris fichiers `page-cashflow-special-*` existants : matière à **recomposer** dans le slice nominal).
- `peintre-nano/src/domains/cashflow/`, `src/flows/`, `src/registry/register-cashflow-widgets.ts`.
- Tests : `recyclique/api/tests/`, `peintre-nano/tests/unit/`, `tests/e2e/` ; `peintre-nano/tests/contract/` si navigation CREOS touchée.

### Intelligence stories 6.1 → 6.4

- **6.1** : `FlowRenderer`, ticket courant `critical`, stale + paiement.
- **6.2** : contexte caisse, permissions backend.
- **6.3** : `lifecycle_status` held/completed/abandoned.
- **6.4** : `caisse.refund`, reversals, agrégats `totals.*` — les encaissements spéciaux ne doivent **pas** casser ces totaux ; documenter l'effet sur `sales_completed` / lignes vides.

### Référence legacy (brownfield)

- `references/ancien-repo/fonctionnalites-actuelles.md` — presets type « Don », catégories : la v2 doit être **plus explicite** que le seul preset dans une vente classique.

### Paheko (contexte documentaire)

- `references/paheko/analyse-brownfield-paheko.md` — API compta/membres côté Paheko pour plus tard ; **aucune intégration directe** dans cette story.

### Recherche « dernière version »

- Pas de nouvelle lib imposée ; respecter les pins `peintre-nano/package.json` et conventions pytest/Vitest du repo.

## Definition of Done

- Contrats OpenAPI et schémas alignés ; clients régénérés ou client TS à jour sans contournement du générateur ; discriminant **`special_encaissement_kind`** et champs associés **documentés**.
- Permission **`caisse.special_encaissement`** opérationnelle côté API (refus explicite si manquante), comme pour **`caisse.refund`** en 6.4.
- Deux parcours **explicites** opérables bout-en-bout avec persistance backend et erreurs maîtrisées.
- Tests automatisés sur les chemins critiques + non-régression 6.1–6.4 et **6.9** ; aucune régression sur la **séparation caisse / réception** (AC6).
- Preuve UI conforme AC5 ; fichier synthèse `_bmad-output/implementation-artifacts/tests/test-summary-story-6-5-e2e.md` lorsque la campagne de preuve est figée.
- Contrats CREOS **alignés** sur le **workspace nominal** servi par `/caisse` : variantes don / adhésion **visibles et utilisables** depuis ce continuum ; **aucune** exigence DoD de « promouvoir » des pages CREOS séparées comme surface produit principale.

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Scope « adhérents » glisse vers CRM | Rappel Epic 9.3 ; MVP texte / identifiant optionnel seulement. |
| Doublon avec presets nominal | Parcours et discriminant API **distincts** ; tests de non-confusion. |
| Agrégats session incohérents (6.7) | Règle documentée + tests ; lien avec `totals` existants. |
| Glissement vers réception / matière (Epic 7) | Rappel AC6 + manifests/domaine `cashflow` uniquement. |

## Références

- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md` — story 6.5 `rewrite` : variantes poste caisse, pas pages séparées
- `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md` — § Finalisation : encaissements spéciaux dans le même univers caisse
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md` — décision brownfield-first, non-réouverture 8/9
- `_bmad-output/planning-artifacts/epics.md` — Epic 6 (intro, note agents), Story 6.5 ; Epic 7 (frontière réception / FR29) pour lecture seule
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 3
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (story 6.5)
- `references/ancien-repo/fonctionnalites-actuelles.md` (section caisse / presets)
- `references/paheko/analyse-brownfield-paheko.md` (contexte intégration ultérieure)
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `_bmad-output/implementation-artifacts/6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md`
- `_bmad-output/implementation-artifacts/6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier.md`
- `_bmad-output/implementation-artifacts/6-3-ajouter-le-parcours-ticket-en-attente.md`
- `_bmad-output/implementation-artifacts/6-4-ajouter-le-parcours-remboursement-sous-controle.md`
- `_bmad-output/implementation-artifacts/6-6-ajouter-les-boutons-dactions-sociales-dedies.md` (lecture seule — frontière avec 6.5)
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png`
- `_bmad-output/implementation-artifacts/screenshots/auth/11-0__auth-02-profil-page.png`

### project-context.md

- Aucun `project-context.md` racine repéré ; s'appuyer sur les références ci-dessus.

## Dev Agent Record

### Agent Model Used

Story Runner BMAD — VS `validate-create-story` (checklist + cohérence 6.1 / epics 6.5), 2026-04-08.

### Debug Log References

### Completion Notes List

- **DS 2026-04-08** : panneau « Encaissements spécifiques » dans `CashflowNominalWizard` (boutons + wizards embarqués) ; entrées nav + pages bundle runtime retirées pour don/adhésion spéciaux ; `replaceState` `/caisse` pour URLs legacy ; catalogue CREOS `meta_props.slice` → `cashflow-nominal` pour les deux wizards.
- **Pré-rebaseline technique** (depot) : extension `POST /v1/sales/` avec `special_encaissement_kind`, `adherent_reference`, permission `caisse.special_encaissement`, vente nominale avec lignes article — **à conserver** côté API ; **cible UX** : ne plus traiter deux pages / wizards CREOS **isolés** comme livrable produit — **intégrer** dans le workspace 6.1 (`/caisse`, slice nominal).
- Agrégats session / `totals.sales_completed` : inchangés ou documentés pour 6.7 selon règles déjà posées.
- Preuve UI AC5 : à **actualiser** sur la baseline brownfield (port / URL selon `test-summary-story-6-5-e2e.md` et politique sprint).

### File List

**Session DS 2026-04-08 (intégration nominal)** :

- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.module.css`
- `peintre-nano/src/domains/cashflow/CashflowSpecialEncaissementWizard.tsx`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/cashflow-special-6-5.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-5-ajouter-les-encaissements-specifiques-sans-article-et-adhesion-association.md` (ce fichier)

**Référence CREOS non chargée dans le bundle runtime** (fichiers conservés sous `contracts/creos/manifests/`) : `page-cashflow-special-don.json`, `page-cashflow-special-adhesion.json`.

**Historique technique / backend story 6.5** (inchangé cette session) :

- `recyclique/api/migrations/versions/e9a1_story_6_5_special_encaissement.py`
- `recyclique/api/src/recyclic_api/models/sale.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/services/cash_session_response_enrichment.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/test_special_encaissement_story65_integration.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/domains/cashflow/CashflowSpecialEncaissementWizard.module.css`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `peintre-nano/tests/unit/cashflow-special-gate-6-5.test.tsx`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-6-5-e2e.md`

## Change Log

- **2026-04-08 (DS)** : Encaissements spéciaux intégrés au workspace `/caisse` ; suppression entrées nav + pages du bundle runtime ; redirection `/caisse/don-sans-article` et `/caisse/adhesion-cotisation` → `/caisse`.
- **2026-04-08 (CR retry / orchestrateur)** : après revue BMAD `CHANGES_REQUESTED` — `setAfterSuccessfulSale` dans `CashflowSpecialEncaissementWizard` pour aligner ticket courant / FlowRenderer ; préremplissage session depuis `cashSessionIdInput` ; retrait doublon `CashflowOperationalSyncNotice` dans le wizard spécial ; e2e : mock GET vente + assertion `caisse-last-sale-id`.

---

## Story completion status

- **CS (create-story, 2026-04-08)** : story **réalignée** sur baseline **6.1** brownfield-first : section « Baseline et cohérence avec 6.1 », arbitrage manifests (fichiers CREOS OK, UX = workspace continu), DoD / tâches / Dev Notes / Dev Agent Record **dé-contradictionnés** (fini « deux pages CREOS » comme cible) ; références ajoutées : mapping `05`, checklist parité `06`, sprint change proposal.
- **VS (validate-create-story, 2026-04-08)** : checklist `bmad-create-story/checklist.md` passée — lacunes corrigées dans le fichier (pilotage sprint, prérequis 6.1–6.4 / 6.9, frontière 6.6, sécurité mutations / AR24, références archi, orthographe, statut `ready-for-dev`). **Aucun arbitrage produit bloquant** (table VS figée inchangée).
- **DS (dev-story, 2026-04-08)** : implémentation brownfield — panneau encaissements spécifiques dans wizard nominal, nav + bundle pages isolés retirés, redirection legacy, tests contract/e2e alignés.
- **Gates (peintre-nano)** : `npm run lint` + `build` + `test` — **PASS** (après correctifs CR retry).
- **QA** : fiche `test-summary-story-6-5-e2e.md` + e2e 6.5 — **PASS**.
- **CR** : 1er passage `CHANGES_REQUESTED` (ticket courant après POST spécial) ; correctifs appliqués — **accepté** pour clôture story (captures `11-0__` optionnelles pilotage / AC5 fiche reproductible).
- **Statut fichier** : **`done`**.
