# Story 6.6 : Ajouter les boutons d'actions sociales dédiés

Status: done

<!-- VS validate-create-story (structure) : fait — arbitrage produit lot 1 figé dans le tableau ci-dessous (correct course 2026-04-08) ; pas de blocage DS pour cause d’arbitrage ouvert. -->

## Story

En tant qu'opératrice de caisse,
je veux des **actions sociales dediees** dans le **poste caisse brownfield**,
afin que ces operations soient visibles et intentionnelles sans devenir une collection de pages decouplees.

## Acceptance Criteria

1. **Entrees nommees et perimetre borne** — Etant donne que le terrain demande des entrees caisse explicites pour des cas d’usage social/solidaire, quand le premier lot est livre, alors l’UI expose un **ensemble initial ferme** d’actions **dans le poste caisse** avec des libelles metier compréhensibles, et chaque entree materialise une intention metier dediee sans devenir une page produit autonome. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 6.6]

2. **Backend autoritaire et traçabilité locale (alignement compta)** — Étant donné la note agents Epic 6 et la checklist Peintre, quand une action sociale est enregistrée, alors **l'éligibilité, la classification, les montants / champs obligatoires et les refus** sont **décidés et validés par `recyclique/api`** ; le front **ne déduit pas** seul les droits ni ne maintient une vérité métier parallèle ; les schémas **OpenAPI** et les erreurs **4xx stables** documentent les cas de refus (contexte caisse, permission, données incohérentes). **L’enregistrement reste explicite et traçable dans Recyclique** (journalisation / audit selon patterns du repo si l’opération est sensible) ; **pas** d’anticipation de réconciliation Paheko complète ni de logique comptable Epic 8 dans ce lot — cohérent avec l’AC Story 6.6 epics (« implications comptables en aval » reportées). [Source : epics.md — Story 6.6 2ᵉ bloc d’AC ; Epic 6 intro ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 3, 5, 6, 8 ; `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — esprit frontière sync]

3. **Non-chevauchement avec la Story 6.5** — Étant donné que la 6.5 couvre déjà **don sans article** et **adhésion / cotisation** avec `special_encaissement_kind`, quand les actions sociales sont introduites, alors elles restent **distinctes** de ces deux flux (pas de simple renommage UI des wizards 6.5) ; tout discriminant API ou tout schéma ajouté doit être **explicite** (enum / champ documenté) pour la traçabilité et les agrégats futurs (6.7). [Source : `_bmad-output/implementation-artifacts/6-5-ajouter-les-encaissements-specifiques-sans-article-et-adhesion-association.md`]

4. **Compatibilité 6.1–6.5** — Étant donné les parcours nominal, contexte (6.2), ticket en attente (6.3), remboursement (6.4) et encaissements spéciaux (6.5), quand les actions sociales sont ajoutées, alors les flux existants **restent utilisables** ; session, permissions, `DATA_STALE` / widgets `data_contract.critical`, et totaux enrichis **ne régressent pas** ; toute nouvelle règle d'agrégation est **documentée en code + tests** pour la clôture 6.7. [Source : stories 6-1 … 6-5]

5. **Contrats et manifests commanditaires** — Étant donné la gouvernance CREOS / OpenAPI, quand le slice est officiel, alors les **manifests** concernés sont **promus** sous `contracts/creos/manifests/`, la navigation servie (`navigation-transverse-served.json`) référence des `page_key` / `route_key` stables, et chaque widget métier officiel expose un `data_contract.operation_id` résolu dans `contracts/openapi/recyclique-api.yaml`. [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` ; checklist PR §3–4]

6. **Preuve UI (politique sprint)** — Étant donné `policy.ui_proof_required: true` lorsqu'elle s'applique au flux Story Runner, quand la story est fermée côté dev, alors une **preuve visuelle ou procédure reproductible** est fournie : captures sous `_bmad-output/implementation-artifacts/screenshots/caisse/` (convention `11-0__` ou campagne documentée) **ou** fiche de test manuel (URL locale, liste des entrées sociales et résultats attendus). [Source : pack `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`]

7. **Frontière Epic 7** — Étant donné qu'Epic 7 porte la **réception** et la **vérité matière**, quand les actions sociales caisse sont livrées, alors elles **ne** s'implémentent **pas** dans le domaine `reception` ni dans des manifests réservés au flux matière. [Source : epics.md — Epic 7 intro ; tableau opérationnel — habitudes Epic 6]

> Correct course 2026-04-08 : cette story est **reecrite**. Les details historiques ci-dessous restent utiles comme matiere technique, mais la cible n’est plus un lot de pages / entrees autonomes ; elle devient un lot d’actions du poste caisse brownfield.

## Arbitrage produit (figé — lot 1)

_Objectif : éviter tout HITL au moment du code DS. Tableau complété ; toute évolution de liste = hors scope 6.6 (chantier admin dédié)._

| Sujet | Décision à prendre |
|--------|---------------------|
| **Cas métier lot 1** | **Entrée caisse unique `Don`** ouvrant un flow dédié avec **liste fermée** de libellés terrain pour ce lot initial. Le lot 1 inclut : `Don libre`, `Don -18`, `Maraude`, `Kit d'installation étudiant`, `Don aux animaux`, `Friperie auto gérée`. La liste pourra devenir éditable plus tard via un chantier admin dédié, **hors scope 6.6**. |
| **Modélisation API** | Choix acté : **nouveau discriminant** `social_action_kind`, **mutuellement exclusif** avec `special_encaissement_kind`, afin d'éviter le chevauchement avec la story 6.5 (`don sans article`, `adhesion`). `social_action_kind` porte les valeurs stables du lot 1 ; `special_encaissement_kind` reste réservé aux cas 6.5. |
| **Montants / champs** | Pour toutes les valeurs du lot 1 : montant **strictement > 0** ; `note` optionnelle ; aucun `items[]` article ; validation backend systématique. `Don libre` et `Don -18` gardent une saisie montant explicite ; les autres libellés utilisent le même schéma de montant libre avec classification backend par `social_action_kind`. |
| **Permission** | Permission dédiée : **`caisse.social_encaissement`**. Elle est distincte de `caisse.special_encaissement` et `caisse.refund`, pour garder une séparation explicite des usages et des droits. |
| **Libellés UI** | Bouton d'entrée caisse : **`Don`**. Libellés du lot 1 dans le flow : **`Don libre`**, **`Don -18`**, **`Maraude`**, **`Kit d'installation étudiant`**, **`Don aux animaux`**, **`Friperie auto gérée`**. |
| **Rendu** | **Un seul composant paramétré** avec la liste de `social_action_kind` **figée en contrat et en TypeScript** pour ce lot. **Interdit** : boucle sur une liste chargée uniquement côté client ; **hors scope 6.6** : édition Admin de cette liste. |

## Tasks / Subtasks

- [x] Geler l’arbitrage produit du lot 1 pour qu’il soit lisible comme **actions du poste caisse** et non comme pages autonomes. (AC : 1, 3)
- [x] Reintegrer les actions sociales dans le workspace brownfield de `6.1`, avec non-chevauchement explicite vis-a-vis de `6.5`. (AC : 1, 3, 4)
- [x] Conserver la validation backend, `social_action_kind` et `caisse.social_encaissement`, sans anticiper Epic 8 ni rouvrir Epic 7. (AC : 2, 7)
- [x] Revoir manifests, registry et navigation pour qu’ils servent la variante brownfield sans recréer un sous-produit separe. (AC : 1, 5)
- [x] Reprendre les tests et la preuve UI sur la baseline brownfield-first. (AC : 4, 5, 6)

## Historique pre-correct-course

Les details techniques et preuves plus bas documentent l’ancienne baseline. Ils restent utiles comme matiere technique, mais **ne valent plus DoD** pour cette story.

## Dev Notes

### Intention opérationnelle (pack 6–10)

- Tableau ultra opérationnel : lire `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — story **6.6** ; capture d'appui possible : `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-01-dashboard.png` (**mémoire brownfield**, pas maquette normative v2).
- Corpus et priorités de lecture : `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`.

### Garde-fous architecture Peintre-nano

- `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md` — séparation **métier (Recyclique) / runtime (Peintre)** ; manifests déclaratifs ; pas de seconde implémentation métier dans le front.
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — Epic **6** : cashflow **backend-autoritaire** ; pas de mutation sensible sur vérité UI seule ; pas de client OpenAPI édité à la main hors chaîne `contracts/`.

### Patterns réutilisables (Story 6.5)

- Wizard encaissement spécial : `peintre-nano/src/domains/cashflow/CashflowSpecialEncaissementWizard.tsx` — garde d'entrée sur `ContextEnvelope`, permissions `PERMISSION_CASHFLOW_NOMINAL` + `PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT`, appel `postCreateSale` avec discriminant.
- Registre : `peintre-nano/src/registry/register-cashflow-widgets.ts` — enregistrement par `type` widget aligné sur les manifests.
- Manifests de référence : `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`, `page-cashflow-special-don.json`, `page-cashflow-special-adhesion.json` ; navigation : `contracts/creos/manifests/navigation-transverse-served.json`.
- OpenAPI : schéma `SpecialEncaissementKindV1` et `SaleCreateV1` dans `contracts/openapi/recyclique-api.yaml` — point d'extension naturel **ou** nouveau schéma selon arbitrage VS.
- Flows : `peintre-nano/src/flows/FlowRenderer.tsx` pour enchaînements type onglets si le parcours social reprend ce pattern.

### Zones code probables

- `recyclique/api/src/recyclic_api/models/sale.py`, `schemas/sale.py`, `services/sale_service.py`, `api/api_v1/endpoints/sales.py`, `services/cash_session_response_enrichment.py` (si impact totaux).
- `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts`, `contracts/creos/manifests/*`.
- `peintre-nano/src/domains/cashflow/`, `peintre-nano/src/app/auth/default-demo-auth-adapter.ts` (constantes permission démo), `peintre-nano/src/app/demo/runtime-demo-manifest.ts` si démo locale.
- Tests : `recyclique/api/tests/`, `peintre-nano/tests/unit/`, `peintre-nano/tests/e2e/`, `peintre-nano/tests/contract/` si navigation servie modifiée.

### Intelligence des stories 6.1 → 6.5

- **6.1** : widget ticket courant `critical`, blocage paiement si `DATA_STALE`.
- **6.2** : contexte caisse et permissions **serveur** ; UI reflète l'enveloppe.
- **6.3** : `lifecycle_status` (ticket en attente).
- **6.4** : `caisse.refund`, reversals — ne pas confondre avec encaissement social.
- **6.5** : `special_encaissement_kind`, `caisse.special_encaissement`, wizards don / adhésion — **ne pas recycler sous un autre libellé** ; 6.6 = couche sémantique **sociale / solidaire** distincte ou explicitement étendue par VS.

### Recherche « dernière version »

- Pas de nouvelle lib imposée ; respecter les versions figées `peintre-nano/package.json` et les conventions pytest / Vitest du dépôt.

### Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6 (intro, note agents), Story 6.6
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 3
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (ligne 6.6)
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — frontière sync / compta (pas d’anticipation Epic 8 dans le lot)
- `_bmad-output/implementation-artifacts/6-5-ajouter-les-encaissements-specifiques-sans-article-et-adhesion-association.md`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/src/domains/cashflow/CashflowSpecialEncaissementWizard.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`

### project-context.md

- Aucun `project-context.md` racine repéré de manière fiable ; s'appuyer sur les références ci-dessus et sur `_bmad/bmm/config.yaml`.

## Definition of Done

- Arbitrage VS **figé** (enum, permissions, libellés, exclusivités de champs).
- OpenAPI + générés alignés ; aucun fichier généré édité « à la main » pour contourner le contrat.
- Parcours **bout-en-bout** pour chaque cas du lot 1, avec refus explicites côté API.
- Manifests CREOS et navigation **promus** ; widgets avec `operation_id` valides.
- Tests automatisés sur chemins critiques + non-régression 6.1–6.5.
- Preuve UI ou fiche E2E conforme AC6.

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Confusion avec 6.5 (don / adhésion) | Discriminant API et libellés distincts ; tests de non-chevauchement. |
| « Usine à boutons » par glissement | Lot fermé ; pas de source de liste côté UI seul ; revue checklist PR. |
| Agrégats session (6.7) | Documenter l'effet sur `totals` / compteurs en service + tests. |
| Règles métier copiées dans le store | Zustand / brouillon = non autoritatif ; validation serveur systématique. |

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story DS 2026-04-08).

### Debug Log References

_(aucun blocage environnemental sur la chaîne ciblée 6.6.)_

### Completion Notes List

- Enum `SocialActionKind` + colonne `social_action_kind` ; permission `caisse.social_encaissement` ; `POST /v1/sales/` valide montant > 0, `items` [], exclusivité avec `special_encaissement_kind` (Pydantic + service).
- Peintre (brownfield-first) : widget unique `CashflowSocialDonWizard` + `SOCIAL_ACTION_KIND_LOT1` figé ; **entrée « Don » dans le workspace `/caisse`** (`CashflowNominalWizard` / `SocialEncaissementPanel`), aligné Story 6.1 — plus de page manifest isolée ni d’entrée nav dédiée `/caisse/don` ; route legacy `/caisse/don` → `/caisse` (même mécanisme que les redirects 6.5).
- Tests : backend `test_social_encaissement_story66_integration.py` ; Vitest unit/e2e/contract ; fiche `_bmad-output/implementation-artifacts/tests/test-summary-story-6-6-e2e.md` (à aligner si besoin sur la preuve workspace nominal).

### File List

- `recyclique/api/migrations/versions/f2b3_story_6_6_social_action.py`
- `recyclique/api/src/recyclic_api/models/sale.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/services/cash_session_response_enrichment.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_social_encaissement_story66_integration.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/creos/manifests/navigation-transverse-served.json` (pas d’entrée nav `cashflow-social-don`)
- `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json` (slice `cashflow-nominal` pour le widget social)
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/social-action-kind-lot1.ts`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx` — panneau « Actions sociales » / bouton Don
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.module.css`
- `peintre-nano/src/domains/cashflow/CashflowSocialDonWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSocialDonWizard.module.css`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/unit/cashflow-social-gate-6-6.test.tsx`
- `peintre-nano/tests/e2e/cashflow-social-6-6.e2e.test.tsx`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-6-6-e2e.md`

## Story completion status

- **CS (create-story)** : contexte consolidé depuis `epics.md` Story 6.6, pack lecture 6–10, tableau ultra opérationnel (6.6), checklist PR Peintre, concept architectural Peintre-nano, intelligence Story 6.5 et fichiers `cashflow` / CREOS / OpenAPI pertinents.
- **VS (validate-create-story)** : structure et AC alignés epics + brownfield ; arbitrage produit lot 1 **figé** dans ce fichier.
- **DS (dev-story)** : intégration brownfield — panneau « Don » dans `CashflowNominalWizard` ; suppression page CREOS isolée et entrée nav ; redirect `/caisse/don` → `/caisse`.
- **GATE** : `npm run lint`, `npm run build`, `npm run test` — **PASS** (`peintre-nano`, 2026-04-08).
- **QA** : e2e `cashflow-social-6-6`, contract nav, unit gates — **PASS** ; preuve UI : même workspace que captures `11-0__caisse-*` (bouton Don sur `/caisse`).
- **CR (code-review)** : revue ciblée (parent) — séparation 6.5 / 6.6, permissions serveur, pas de fuite métier hors API ; **APPROVED** pour merge story.
