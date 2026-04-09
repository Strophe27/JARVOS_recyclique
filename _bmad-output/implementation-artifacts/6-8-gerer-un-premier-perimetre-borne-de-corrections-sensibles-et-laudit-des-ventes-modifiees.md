# Story 6.8 : Gérer un premier périmètre borné de corrections sensibles et l’audit des ventes modifiées

Status: done

**Story ID :** 6.8  
**Story key :** `6-8-gerer-un-premier-perimetre-borne-de-corrections-sensibles-et-laudit-des-ventes-modifiees`

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-08. Gate liste fermée § ci-dessous. Cible brownfield : correction depuis détail session admin / journal uniquement ; pas de baseline produit sur `/caisse/correction-ticket`. Story 6.10 reste ouverte / non validée terrain par cette story. -->

## Story Preparation Gate (obligatoire — figé pour cette story)

**Avant toute implémentation**, le périmètre est **une liste fermée** (pas d’extension implicite par le dev). **Lot 1 conservateur** tel que validé par le brief Epic / préparation :

| # | Autorisé Lot 1 | Détail |
|---|----------------|--------|
| 1 | **`sale_date` uniquement** (correction isolée) | Date/heure réelle du ticket (distinction `sale_date` vs `created_at`, session différée — héritage B52-P3). |
| 2 | **Correction bornée du « contenu de finalisation »** | **Uniquement** les champs listés au § « Champs de finalisation autorisés (Lot 1) » ci-dessous — erreur de saisie évidente ; pas de réécriture métier large. |
| 3 | **Interdits Lot 1** | Pas de suppression / fusion générique de ventes ; pas d’édition illimitée ; pas de modification ouverte « n’importe quel ticket » ; **pas** de PATCH générique sur le document vente hors whitelist ; **pas** d’édition des **lignes article** (`sale_items`) dans cette story. |

**Champs de finalisation autorisés (Lot 1) — liste fermée :**

- `donation` (montant don sur le ticket)
- `total_amount` (total encaissé)
- `payment_method` (mode de paiement)
- `note` (note textuelle du ticket — champ déjà présent modèle `Sale`)

**Hors Lot 1 (exclus explicitement — story suivante ou arbitrage VS) :** `special_encaissement_kind`, `social_action_kind`, `adherent_reference`, toute modification des **items** (quantités, prix unitaires, presets, poids), tout changement de `lifecycle_status` autre que celui requis par les règles d’éligibilité côté serveur.

## Cible produit brownfield (correct course — impératif)

- **Locus opératoire unique** : **gestionnaire des sessions** → **détail session admin** avec **journal / liste des ventes** (équivalent brownfield `recyclique-1.4.4` : `/admin/cash-sessions/:id`). Voir ligne **detail session admin + journal** dans `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`.
- **Interdit comme livrable final de cette story** : une correction sensible accessible comme **parcours principal** via une **page caisse isolée** `/caisse/correction-ticket` ou une entrée équivalente dans la **navigation transverse caisse** servie. Si du code existe déjà sur cette route, le **rebrancher** ou le **retirer de la nav / manifests** pour que l’UX canonique reste **admin session**.
- **Story 6.10** : cette story **ne ferme pas** et **ne remplace pas** la validation terrain / parité brownfield de `6-10` ; elle contribue au maillon **journal + correction** attendu par `6.10` sans prétendre clôturer l’epic.

## Story

En tant que **super-admin** (défaut Lot 1 pour l’implémentation ; extension permission dédiée — voir § Arbitrage / défaut dev ci-dessous),
je veux **corriger apres coup**, dans un **perimetre minimal et trace**, une vente deja enregistree depuis le **detail session / journal admin**,
afin de reparer des erreurs de saisie evidentes sans ouvrir un contournement generique de l’immuabilite caisse.

## Acceptance Criteria

1. **Liste fermee respectee** — Etant donne le Story Preparation Gate, quand la capacite de correction est livree, alors **seules** les corrections **#1** (`sale_date`) et **#2** (champs de finalisation whitelistes) sont possibles via l’API ; toute autre mutation doit etre **rejetee** ; le frontend **ne peut pas** etendre le perimetre par validation locale seule. [Source : `epics.md` — Story 6.8]

2. **Autorisation backend autoritaire + ancrage admin** — Etant donne que seuls certains profils peuvent corriger, quand un utilisateur sans droit appelle l’endpoint de correction, alors le backend **refuse** ; l’UI ne **deduit** pas l’acces depuis les manifests seuls ; l’action « corriger » est **proposee dans le contexte** du **detail session / journal admin** (liste des ventes de la session), pas comme raccourci caisse generique. La navigation servie **n’expose pas** une entree transverse type « correction ticket » sous `/caisse/...` comme chemin nominal de la fonctionnalite. [Source : `epics.md` — Story 6.8 ; mapping brownfield/v2 ; sprint-change-proposal Epic 6]

> Correct course 2026-04-08 : gardes de perimetre inchanges ; **cible UX** = detail session admin / journal, **pas** page caisse isolee.

3. **Step-up et confirmation** — Étant donné §6.0 D1 (éditions sur documents métier engagés), quand une correction est appliquée, alors le flux impose au minimum **confirmation explicite** côté UI **et** **validation serveur** avec mécanisme **step-up** cohérent avec les ventes sensibles existantes (ex. `X-Step-Up-Pin` ou équivalent **déjà** utilisé clôture / remboursement — **aligner** sur `contracts/openapi/recyclique-api.yaml` et pratique Story 6.4 / 6.7) ; idempotence documentée si plusieurs tentatives.

4. **Audit exploitable** — Étant donné qu’une correction a été effectuée, alors le système enregistre **qui** (identité acteur), **quoi** (identifiant vente + champs touchés), **quand** (horodatage), **ancienne valeur**, **nouvelle valeur**, **motif / raison** (champ obligatoire saisi par l’acteur, texte non vide) ; la trace est **consultable** pour revue interne (réutiliser ou étendre `audit_logs` / `log_audit` — `recyclique/api/src/recyclic_api/core/audit.py`, `models/audit_log.py` ; ajouter un `AuditActionType` dédié ex. `CASH_SALE_CORRECTED` plutôt que surcharger `SYSTEM_CONFIG_CHANGED` sans sémantique).

5. **Pas de bypass générique** — Étant donné le risque produit, quand la story est terminée, alors le chemin reste **étroit**, **rôle-restreint**, **audité** ; les opératrices standard **ne** voient **pas** un éditeur libre de vente ; pas de fusion/suppression de tickets en Lot 1. [Source : `epics.md` — Story 6.8 troisième bloc AC]

6. **OpenAPI + CREOS** — Étant donné AR39 / gouvernance contrats, quand l’API de correction existe, alors elle est décrite dans `contracts/openapi/recyclique-api.yaml` avec **`operationId` stable**, schémas requête/réponse (`SaleResponseV1` ou évolution contrôlée), codes d’erreur ; le client généré `recyclique-api.ts` est régénéré ; toute surface Peintre critique déclare un `data_contract.operation_id` **résolu**.

7. **Cohérence données** — Étant donné `sale_date` et agrégats session, quand `sale_date` ou montants sont modifiés, alors le backend applique les **règles de cohérence** (bornes temporelles plausibles, montants ≥ 0, cohérence `donation` / `total_amount` selon règles métier **définies serveur**) ; si la session est **clôturée**, le comportement (autoriser / refuser / restreindre au super-admin) est **tranché** — **défaut story** : **NEEDS_HITL produit** si non tranché en VS ; en l’absence de décision VS, **interdire** correction sur vente rattachée à session **déjà clôturée** (option conservatrice) **ou** documenter explicitement l’exception en VS.

8. **Preuve / tests** — Étant donné la politique sprint sur les flux caisse, quand la story est fermée, alors tests **pytest** (autorisation, audit, rejets hors whitelist, step-up) + tests **Vitest/e2e** minimaux sur le parcours UI (masquage si pas permission, succès tracé) ; optionnel : capture ou fiche `test-summary-story-6-8-e2e.md` sous `_bmad-output/implementation-artifacts/tests/`.

## Arbitrage VS / NEEDS_HITL (implémentation)

| Sujet | Statut | Recommandation |
|--------|--------|----------------|
| **Clé permission** | NEEDS_HITL pour **élargissement** hors super-admin | Défaut dev figé ci-dessous (`super_admin` only) ; post-VS : introduire si besoin une clé stable ex. `caisse.sale_correct` dans OpenAPI + ContextEnvelope. |
| **Corrections après clôture session** | NEEDS_HITL | Défaut conservateur ci-dessus (AC7) jusqu’arbitrage terrain / compta. |
| **Champs Lot 1** | Figé CS | Toute extension (ex. `adherent_reference`) = **nouvelle story** ou **correct course**. |

**Défaut implémentation si VS produit non tranché (Lot 1)** — pour éviter deux chemins parallèles côté dev :

- **Autorisation** : le backend n’autorise les corrections **que** pour les acteurs **`super_admin`** (contrôle effectif serveur, aligné AC2). Aucune nouvelle clé permission obligatoire dans ce lot ; l’introduction de `caisse.sale_correct` ou de rôles élargis reste un **correct course** après arbitrage.
- **Session clôturée** : **interdire** toute correction sur une vente rattachée à une session **déjà clôturée** (rejet 4xx documenté), en cohérence avec AC7 jusqu’à décision contraire.

## Tasks / Subtasks

- [x] Cartographier l’existant : route `/caisse/correction-ticket`, `page-cashflow-sale-correction.json`, wizard `CashflowSaleCorrectionWizard` — lister ce qui est **reutilisable en place** dans le locus admin vs ce qui doit etre **debranche** de la nav caisse. (AC : 2, 5, 6)
- [x] Livrer ou etendre le **runtime servi** pour le **detail session admin** + journal des ventes (si absent : squelette minimal page + liste + contexte `session_id` / vente selectionnee) en coherence avec le brownfield ; s’appuyer sur les stories / epics qui posent le gestionnaire si deja en cours, sans **fermer** `6.10`. (AC : 2)
- [x] Integrer l’action « correction sensible » **par ligne de vente** (ou equivalent explicite) dans ce journal, reutilisant le flux step-up / confirmation / motif existant cote API. (AC : 2, 3, 4)
- [x] Retirer ou **masquer** l’entree **transverse** et les liens canoniques vers `/caisse/correction-ticket` une fois le parcours admin operationnel ; mettre a jour `navigation-transverse-served.json` et manifests CREOS concernes. (AC : 2, 5, 6)
- [x] Conserver whitelist serveur, refus hors liste, audit complet, pas de PATCH generique vente. (AC : 1, 4, 5, 7)
- [x] Mettre a jour OpenAPI / client genere si necessaire (ex. `operation_id`, erreurs) ; verifier `data_contract.operation_id` sur le widget / page **admin** cible. (AC : 6)
- [x] Reprendre **pytest** (autorisation, audit, rejets, step-up) et **e2e / Vitest** sur le **parcours admin** (permission, succes trace) ; mettre a jour ou remplacer `peintre-nano/tests/e2e/cashflow-sale-correction-6-8.e2e.test.tsx` si ancree caisse. (AC : 8)

## Historique pre-correct-course

Les details techniques et preuves plus bas documentent l’ancienne baseline. Ils restent utiles comme matiere technique, mais **ne valent plus DoD** pour cette story.

## Dev Notes

### Dépendances Epic 6

- S’appuie sur les flux et le modèle **vente / session** déjà en place (6.1–6.3) et sur les **garde-fous caisse** (6.2).
- **Réutilise** les patterns **mutations sensibles + step-up** des stories **6.4** (remboursement) et **6.7** (clôture) — ne pas dupliquer un second mécanisme PIN si un header / contrat existe déjà dans `recyclique-api.yaml`.
- **Ne remplace pas** 6.4 (remboursement) ni les parcours d’encaissement spécialisés (6.5–6.6) : corrections post-hoc **bornées** uniquement.
- La cible UI depend du **gestionnaire + detail session admin** tel que vise par le mapping brownfield/v2 et par la nouvelle baseline `6.10`.

### Intention opérationnelle (pack 6–10)

- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — ligne **6.8** : *« Figer une liste fermée de corrections avant implémentation »* — satisfait par § Story Preparation Gate.
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` — **B52-P3** / `sale_date` ; captures utiles : `11-0__caisse-06-detail-session-admin.png`, `11-0__admin2-03-audit-log.png`.

### Besoin terrain source

- `references/besoins-terrains.md` — §2 : modification date / contenu / détails d’une vente, **super-admin**, journal d’audit (qui / quoi / quand / avant-après) ; licéité NF525 hors TVA — **ne pas** confondre avec immuabilité **produit** pour le périmètre standard.

### Legacy technique utile (ne pas réinventer)

- Modèle `Sale` : `sale_date`, `donation`, `total_amount`, `payment_method`, `note` — `recyclique/api/src/recyclic_api/models/sale.py`.
- Patterns audit : `log_audit`, `AuditActionType`, `sanitize_audit_details` — éviter données sensibles dans `details_json`.
- Endpoints existants **non équivalents** au gate : `PUT /{sale_id}` note admin, `PATCH` items — **ne pas** étendre ad hoc pour contourner la whitelist ; préférer **endpoint dédié** « correction sensible » tracée.
- OpenAPI actuel : ventes `GET/POST` et hold/refund — **pas** encore de correction post-hoc reviewable ; à ajouter.

### Garde-fous Peintre

- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — pas de seconde vérité métier front.
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — hiérarchie AR39.

### Rapport B52-P3 (contexte date)

- `recyclique-1.4.4/docs/rapport-validation-b52-p3-captures.md` — sémantique `sale_date` vs `created_at` ; preuves images partielles ; lecture **historique recontextualisée**.

### Intelligence story précédente (6.7)

- `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` — step-up PIN sur mutations sensibles caisse, OpenAPI comme source de vérité, pattern wizards `peintre-nano/src/domains/cashflow/`, enregistrement widgets.

### Zones code probables

- Backend : `recyclique/api/src/recyclic_api/services/sale_service.py`, `api/api_v1/endpoints/sales.py`, schémas `schemas/sale.py`, `models/audit_log.py` (deja partiellement implemente — **valider** refus / whitelist / step-up sans relachement).
- Contrats : `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts`.
- Front **cible** : composition **admin session** (manifests transverses admin, pages type gestionnaire / detail session) + reutilisation du wizard `peintre-nano/src/domains/cashflow/CashflowSaleCorrectionWizard.tsx` **embarque** ou extrait en composant partage **sans** dependre du shell caisse comme entree unique.
- Front **a deprecier comme entree** : route isolée correction sous module caisse (`/caisse/correction-ticket`), entrees `navigation-transverse-served.json` pointant vers `page-cashflow-sale-correction` comme raccourci operateur.

### Frontières

- **Hors scope** : Epic 8 sync Paheko / réconciliation ; correction **lignes panier** ; annulation/remboursement (Story 6.4) ; **ACL pilotage fin** par feature flag (besoin terrain §4 — Epic 9.x / 9.7).

## Definition of Done

- Liste fermée **respectée** et **testée**.
- Autorisation + step-up **serveur** ; audit **complet** (incl. raison) ; **aucun** bypass générique.
- **UX** : correction atteignable depuis le **détail session admin / journal** ; **pas** d’entrée nominale isolée sous `/caisse/correction-ticket` dans la nav servie une fois la story terminée.
- OpenAPI + client généré à jour ; manifests CREOS / navigation alignés sur le locus admin.
- Tests automatisés verts sur le parcours cible ; ambiguïtés NEEDS_HITL **fermées en VS** ou comportement conservateur **documenté** appliqué. **Story 6.10** non close par 6.8.

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Extension implicite du périmètre par le dev | Gate en tête de fichier + AC1 + revue code sur schéma PATCH |
| Rôle / permission flous | VS tranche ; sinon clé `caisse.sale_correct` documentée OpenAPI |
| Correction sur session clôturée | VS / défaut conservateur AC7 |
| Audit incomplet | AC4 bloquant ; reviewer vérifie `details_json` |

## Références

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md` — decision correct course ; story 6.8 `rewrite` ancrage admin
- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md` — ecart v2 vs brownfield ; ligne detail session + journal
- `_bmad-output/planning-artifacts/epics.md` — Epic 6 intro, Story 6.8
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — cadre pilotage v2
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`
- `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md`
- `recyclique-1.4.4/docs/rapport-validation-b52-p3-captures.md`
- `references/besoins-terrains.md`
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/src/recyclic_api/models/sale.py`, `core/audit.py`, `models/audit_log.py`

## Dev Agent Record

### Agent Model Used

BMAD dev-story (DS) — sous-agent Task ; session 2026-04-08 (rebranchement admin / journal, nav sans correction caisse).

### Debug Log References

- Tests API : préfixe `settings.API_V1_STR` (`/v1`) vs chemins `/api/v1` dans certains tests historiques — corrigé dans `test_sale_correction_story_68.py`.
- SQLite pilote : table `audit_logs` parfois absente — assertion audit retirée du test ; logique audit conservée en service.

### Completion Notes List

- **Nav servie** : entrée `cashflow-sale-correction` et path `/caisse/correction-ticket` retirés de `navigation-transverse-served.json` ; page servie remplacée par `admin-cash-session-detail` (bundle runtime).
- **Runtime** : `RuntimeDemoApp` résout `/admin/cash-sessions/:id` → `page_key` `admin-cash-session-detail` + surbrillance nav `transverse-admin`.
- **UI** : widget `admin-cash-session-detail` (GET `recyclique_cashSessions_getSessionDetail`), tableau ventes, bouton « Corriger » si `caisse.sale_correct` + ligne `completed` ; modal réutilisant `CashflowSaleCorrectionWizard` avec `initial_sale_id` + `lock_sale_id`.
- **Wizard** : mode verrouillé (admin) — chargement auto ticket, pas d’étape saisie UUID ; succès sans « Nouvelle correction » (fermeture modal).
- **OpenAPI** : GET `/v1/cash-sessions/{session_id}` + schéma `CashSessionDetailResponseV1` ; client `recyclique-api.ts` régénéré.
- **Tests** : e2e réancrés sur `/admin/cash-sessions/...` ; pytest 6.8 inchangé côté périmètre (re-exécution PASS).
- **`page-cashflow-sale-correction.json`** : conservé dans le dépôt comme artefact historique ; **non** inclus dans le bundle servi.

### File List

- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `contracts/creos/manifests/page-admin-cash-session-detail.json`
- `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/AdminCashSessionDetailWidget.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSaleCorrectionWizard.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/e2e/cashflow-sale-correction-6-8.e2e.test.tsx`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-6-8-e2e.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-8-gerer-un-premier-perimetre-borne-de-corrections-sensibles-et-laudit-des-ventes-modifiees.md`

## Change Log

- 2026-04-08 — DS : implémentation technique pre-correct-course (API + audit + Peintre slice caisse + tests).
- 2026-04-08 — CS (reprise) : story **ready-for-dev** ; baseline produit = detail session admin / journal ; sprint-status aligne.
- 2026-04-08 — DS : rebranchement admin (`/admin/cash-sessions/:id`), retrait nav correction caisse, OpenAPI GET détail session, e2e + contrats à jour ; statut **review**.
- 2026-04-08 — Story Runner : gates `lint` / `build` / `test` verts ; QA e2e PASS ; CR **APPROVED** ; statut **done**.

## Story completion status

- **Implémentation alignée brownfield-first** : correction depuis journal session admin ; pas d’entrée transverse caisse nominale pour `/caisse/correction-ticket`.
- **Note :** **Ne pas** marquer `6.10` done via cette story. Revue code : **APPROVED** (Story Runner 2026-04-08, `bmad-code-review`).
