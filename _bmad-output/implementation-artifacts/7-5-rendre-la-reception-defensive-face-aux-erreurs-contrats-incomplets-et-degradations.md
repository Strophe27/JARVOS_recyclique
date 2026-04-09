# Story 7.5 : Rendre la réception défensive face aux erreurs, contrats incomplets et dégradations

Status: review

**Story ID :** 7.5  
**Story key :** `7-5-rendre-la-reception-defensive-face-aux-erreurs-contrats-incomplets-et-degradations`

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-09. -->

## Story

En tant qu’**opératrice de réception**,

je veux que le flux réception reste **compréhensible** lorsque quelque chose est **manquant**, **invalide** ou **dégradé** (contrat, contexte, données, serveur),

afin de **distinguer clairement** un **intake réellement enregistré**, un **mode dégradé**, une **continuation partielle sûre**, un **fallback visible** et une **opération bloquée (hard stop)** — **sans** que l’interface **prétende** qu’un intake est **sûr** tant que le **backend Recyclique** ne l’a **pas** confirmé.

## Baseline brownfield-first (non négociable)

- **Autorité backend** : la **vérité** sur enregistrement, éligibilité, fermeture ticket, lignes, historique = **`recyclique/api`**. **`Peintre_nano`** = **rendu + garde-fous UI** qui **reflètent** les réponses HTTP et l’enveloppe de contexte — **aucun** succès métier **inventé** côté front.
- **Taxonomie d’états (à rendre explicite en UI et en tests)** — sans mélanger les niveaux :
  - **Fallback visible** : données ou manifeste partiellement indisponibles mais le runtime **signale** la limite (pas de silence).
  - **Mode dégradé** : `ContextEnvelope` / runtime en **degraded** ou équivalent : actions **limitées** avec message **clair** (aligné **7.2**).
  - **Blocage métier / contexte** : permission, site, poste, ticket : **refus serveur** → UI **ne simule pas** la poursuite nominal (aligné **7.2**).
  - **Continuation partielle sûre** : uniquement les actions pour lesquelles le **contrat + réponse API** permettent encore une opération **sans** ambiguïté sur la persistance (ex. consultation lecture seule si autorisée).
  - **Hard stop** : mutation critique impossible (ex. fermeture ticket, ligne, ouverture poste) tant que **données critiques** sont **DATA_STALE**, erreur **non retryable**, ou **corps de réponse absent / contradictoire** — **pas** de message de succès complet.
- **Hiérarchie de vérité** : **OpenAPI** > **ContextEnvelope** > manifests **CREOS** > préférences locales (**AR39**) — checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.
- **Pas de logique métier réception dans le front** : pas de règles « maison » sur poids, catégories, périmètre ticket ; **consommer** erreurs structurées (**AR21** : `code`, `detail`, `retryable`, `state`, `correlation_id` quand exposés).
- **Frontières** : **7.5** complète la **matrice défensive** (erreurs réseau, contrats incomplets, incohérences, stale) sur **tout le slice réception déjà livré** (**7.1–7.4**) — **sans** absorber **7.6** (validation terrain synthétique), **Epic 8** (sync Paheko / quarantaine opérationnelle), **Epic 9** (déclaration).

## Registre terrain Epic 7

- Fichier vivant : `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` — **compléter §5 États défensifs** (et §6 si signaux sync transverses un jour exposés au même titre que la caisse) avec preuves ou limites honnêtes après DS.

## Preuves et environnement

- **Stack servie** : **`http://localhost:4444`** pour preuves UI terrain significatives ; **ne pas** utiliser **`127.0.0.1`** (convention projet).
- Mutations réception : preuves réseau (méthode, chemin, statut HTTP, extrait corps) **en complément** des tests automatisés.

## Pattern de référence (cohérence Epic 6)

- Story **6.9** : `_bmad-output/implementation-artifacts/6-9-rendre-la-caisse-defensive-face-aux-erreurs-fallbacks-et-sync-differee.md` — **transposer** les principes (AR21, pas de faux succès, `DATA_STALE` sur données **critical**, messages opérationnels non jargon) au domaine **réception** ; **réutiliser** `parseRecycliqueApiErrorBody` / `CashflowClientErrorAlert` (ou équivalent factorisé domaine réception) plutôt que dupliquer la grammaire d’erreur.

## État actuel (intelligence 7.1 → 7.4)

- **Client** : `peintre-nano/src/api/reception-client.ts` mappe déjà les échecs HTTP via **`recyclique-api-error`** (champs AR21) — **7.5** doit **harmoniser** l’**affichage** et les **garde-fous** sur **tous** les chemins (wizard nominal, panneau historique, exports) pour **éviter** tout libellé de succès si `ok: false` ou réponse vide sur mutation.
- **Gate contexte** : `reception-entry-gate` / **`useReceptionEntryBlock`** (**7.2**) couvre **forbidden** / **degraded** / permissions — **7.5** **ne régresse pas** ces garde-fous et **aligne** les erreurs **API** post-gate sur la **même lisibilité**.
- **Widgets CREOS** : `widgets-catalog-reception-nominal.json` / `page-reception-nominal.json` — tout widget avec **`data_contract.critical: true`** doit **bloquer** les actions sensibles en **DATA_STALE** (convention `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`), comme en caisse **6.9**.
- **OpenAPI** : les `operation_id` réception sont déjà listés dans le registre §5 du squelette Epic 7 ; toute **nouvelle** surface normative pour états d’erreur ou champs de diagnostic **doit** passer par **`contracts/openapi/recyclique-api.yaml`** + codegen.

## Acceptance Criteria

1. **Pas de succès fantôme sur intake** — Étant donné que la réception ne doit **jamais** prétendre qu’un intake est enregistré si le **contrat / contexte / données / serveur** ne le garantissent pas, quand une **mutation** d’intake (ouverture poste, création ticket, ligne, fermeture ticket, fermeture poste, correction poids admin, token export, etc. dans le périmètre **7.1–7.4**) **échoue**, **timeout**, ou renvoie un **corps ambigu**, alors l’UI affiche un **état d’échec ou d’incertitude explicite** ; **aucun** message équivalent à « enregistré avec succès » / « terminé » **tant que** la réponse **succès attendue** du backend **n’est pas** confirmée. [Source : `epics.md` Story 7.5 premier bloc ; intention produit utilisateur]

2. **Fallback, dégradé, bloqué — distincts** — Étant donné les flux terrain critiques, quand le parcours rencontre **manifeste / contrat incomplet**, **inputs non résolus**, **contexte incomplet**, **erreur HTTP** ou **enveloppe runtime non nominal**, alors l’UI présente des états **explicites** selon la **nature** du problème : **fallback visible** (limite annoncée), **mode dégradé** (poursuite restreinte documentée), **blocage** (action impossible) — **alignés** sur les **règles runtime partagées** (PRD / UX défensives, **7.2**). [Source : epics.md Story 7.5 ; checklist PR Peintre §10]

3. **Partiel sûr vs hard stop** — Étant donné que certains problèmes permettent une **continuation partielle** et d’autres **non**, quand une condition **non nominale** survient, alors l’UI **distingue** ce qui peut encore **proceed safely** (ex. relecture historique si API OK) de ce qui exige un **hard stop** (ex. fermeture ticket si ticket courant **stale** ou erreur **non retryable**) ; le **feedback** reste **pratique** (libellés terrain), pas stack trace opérateur. [Source : epics.md Story 7.5 deuxième bloc]

4. **AR21 et supportabilité** — Étant donné la **supportabilité** terrain, quand une erreur API est renvoyée avec **`correlation_id`** (ou champs AR21), alors l’UI **peut** l’exposer **discrètement** pour le support ; **`retryable`** guide **retry** vs **rechargement contexte** ; en cas de doute prolongé, **préférer** honnêteté **« impossible de confirmer »** à un succès factice. [Source : inventaire NFR7/AR21 dans `epics.md` ; pattern **6.9**]

5. **`data_contract.critical` + DATA_STALE** — Étant donné au moins un widget réception marqué **`critical: true`** (ticket courant / actions de clôture ou équivalent dans le catalogue), quand les données passent en **DATA_STALE** ou que l’endpoint critique **échoue** avant revalidation, alors les **actions sensibles** correspondantes sont **bloquées** avec **feedback explicite** (cohérent **PRD §10.1** / matrice **sécurité > fluidité**). [Source : instruction contrats données ; **6.9** AC4 transposé]

6. **Couverture transversale du slice réception** — Étant donné **`ReceptionNominalWizard`**, **`ReceptionHistoryPanel`** (ou équivalent livré **7.4**), et tout **composant** déclenché par les manifests **réception nominale**, quand **7.5** est fermée, alors les **mêmes principes** défensifs s’appliquent **partout** où il existe **mutation** ou **affirmation de persistance** — **sans** dupliquer la **logique métier** : **garde-fous UI** + **client API** alignés sur **réponses serveur**.

7. **OpenAPI / CREOS** — Étant donné **AR39**, toute **nouvelle** surface HTTP ou champ de réponse **normatif** pour des **états défensifs** visibles réception doit vivre dans **`contracts/openapi/recyclique-api.yaml`** avec **`operationId` stable** ; manifests **alignés** (`data_contract.operation_id`). Pas de chemin « secret » non documenté pour le front officiel.

8. **Preuve / tests** — Étant donné la politique des flux critiques, quand la story est fermée, alors **tests Vitest** (unit / e2e) couvrent : scénarios **erreur API** (`retryable` / non), **blocage stale** sur parcours critique réception, **absence de faux succès** sur au moins une **mutation** et un **flux lecture** ; extension des tests existants (`reception-context-gate-7-2`, `reception-history-7-4`, e2e réception) plutôt que redondance ; optionnel : entrée dans `_bmad-output/implementation-artifacts/tests/test-summary-story-7-5-*.md` si le Story Runner exige une trace.

## Tasks / Subtasks

- [x] **Cartographie** — Lister chaque écran / sous-flux réception et ses points de **mutation** ou d’**affirmation de succès** ; inventorier les réponses d’erreur **réelles** du `reception-client` et les états **stale** possibles. (AC : 1, 6)

- [x] **Modèle d’affichage erreur** — Réutiliser ou factoriser un **patron** d’alerte erreur (aligné **`CashflowClientErrorAlert`** / **`recyclique-api-error`**) pour le domaine réception : message humain, `correlation_id` optionnel, **retry** selon `retryable`. (AC : 2, 4)

- [x] **Matrice états** — Documenter dans le code ou les Dev Notes du PR : quand **fallback** vs **dégradé** vs **bloqué** vs **partiel sûr** vs **hard stop** (table courte testable). (AC : 2, 3)

- [x] **DATA_STALE / critique** — Vérifier **wizard** + **historique** + exports : désactivation / message sur actions sensibles si **stale** ou erreur non résolue ; aligner **`data_contract.critical`** dans CREOS si besoin. (AC : 5, 6)

- [x] **OpenAPI + codegen** — Si nouveaux champs ou codes documentés : mettre à jour `recyclique-api.yaml` + `contracts/openapi/generated/recyclique-api.ts`. (AC : 7) — *Néant : pas de nouvelle surface HTTP normative.*

- [x] **Registre §5** — Mettre à jour `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` §5 (et tests associés dans le tableau). (AC : 8, preuves Epic 7)

- [x] **Non-régression** — `lint` / `test` / `build` sur `peintre-nano` ; pytest ciblés `recyclique/api/tests/test_reception_*.py` si le backend est touché. (AC : 8) — *Backend non modifié ; Vitest réception / historique / 7.5 exécutés en DS.*

## Dev Notes

### Continuité stories voisines

- **7.1–7.4** : fichiers story sous `_bmad-output/implementation-artifacts/7-*` — **ne pas** affaiblir **7.2** (gate) ni **7.4** (historique = lecture API, pas cache vérité).

### Zones code probables

- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`
- `peintre-nano/src/domains/reception/ReceptionHistoryPanel.tsx`
- `peintre-nano/src/domains/reception/reception-entry-gate.ts` (ou hook équivalent)
- `peintre-nano/src/api/reception-client.ts`
- `peintre-nano/src/api/recyclique-api-error.ts` (réutilisation)
- `peintre-nano/src/domains/cashflow/CashflowClientErrorAlert.tsx` (réutilisation ou extraction partagée si pertinent **sans** coupler domaines dans le mauvais sens)
- `contracts/creos/manifests/page-reception-nominal.json`, `widgets-catalog-reception-nominal.json`
- `contracts/openapi/recyclique-api.yaml`
- Tests : `peintre-nano/tests/unit/reception-*.test.tsx`, `peintre-nano/tests/e2e/reception-*.e2e.test.tsx`

### Pack lecture Epics 6–10

- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`

### Exigences UX / PRD (sélectif)

- **UX-DR8 / UX-DR9** (si cités dans epics pour caisse) : **distincts** erreur locale, contrat, contexte ; pas d’alarme inutile mais **pas** de silence sur l’incertitude métier.

## Exigences techniques (résumé)

- Client API **typé** ; pas de `fetch` ad hoc hors conventions du dépôt.
- Enveloppes d’erreur JSON : exploitation des champs **AR21** lorsque présents.
- **`Zustand` / état local** : **ne remplace pas** la confirmation serveur après mutation.

## Conformité architecture

- **ADR P1** (CSS Modules, Mantine) — pas de nouvelle stack UI.
- Epic 7 **note agents** : Peintre ne devient pas auteur du **flux matière** ni du **contexte**.

## Exigences de test

- Mocks d’erreur API sur `reception-client` → **assertion** : pas de libellé succès sur échec.
- **e2e** : au moins un scénario **403** / **erreur réseau** / **stale** si l’environnement de test le permet.

## Definition of Done

- Tous les **AC** satisfaits ou **NEEDS_HITL** documenté avec comportement **conservateur** (pas de succès simulé).
- Aucune **régression** sur **7.1–7.4** (tests verts sur périmètre touché).
- **Registre** Epic 7 §5 mis à jour ou dette **nommée**.

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 7 (intro), Story 7.5
- `_bmad-output/implementation-artifacts/6-9-rendre-la-caisse-defensive-face-aux-erreurs-fallbacks-et-sync-differee.md`
- `_bmad-output/implementation-artifacts/7-2-garantir-le-contexte-reception-et-les-blocages-metier-associes.md`
- `_bmad-output/implementation-artifacts/7-4-journaliser-les-entrees-reception-et-assurer-leur-exploitabilite-historique.md`
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`
- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `contracts/openapi/recyclique-api.yaml`

## Dev Agent Record

### Agent Model Used

fast (sous-agent Task Story Runner BMAD, 2026-04-09)

### Debug Log References

Vitest : `reception-defensive-7-5`, `reception-history-7-4`, `reception-context-gate-7-2`, e2e `reception-nominal-7-1`, `reception-context-gate-7-2`, `reception-lignes-7-3`, `cashflow-api-error-no-false-success-6-9`.

### Completion Notes List

- `RecycliqueClientErrorAlert` factorisé (`peintre-nano/src/api/recyclique-client-error-alert.tsx`) ; `CashflowClientErrorAlert` délègue avec préfixes `cashflow-error-*` inchangés pour les tests caisse.
- Réception : `recycliqueClientFailureFromReceptionHttp` ; wizard + historique utilisent l’alerte partagée et des `data-testid` `reception-*-error-*`.
- **DATA_STALE** : store léger `reception-critical-data-state.ts` ; échec GET détail ticket (non 401/403/409) → STALE ; bannière + blocage mutations + `data-widget-data-state` ; bouton test `reception-trigger-stale`.
- Pas d’avancement à l’étape « fermer poste » après `closeTicket` si le GET détail échoue ensuite.
- Client : jeton export 200 sans `download_url` → erreur explicite (pas de `window.open`).
- Matrice défensive : commentaire structuré `reception-defensive-matrix.ts` ; registre Epic 7 §5 rempli.

### File List

- `peintre-nano/src/api/recyclique-client-error-alert.tsx`
- `peintre-nano/src/api/recyclique-api-error.ts`
- `peintre-nano/src/api/reception-client.ts`
- `peintre-nano/src/domains/cashflow/CashflowClientErrorAlert.tsx`
- `peintre-nano/src/domains/reception/reception-critical-data-state.ts`
- `peintre-nano/src/domains/reception/reception-defensive-matrix.ts`
- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`
- `peintre-nano/src/domains/reception/ReceptionHistoryPanel.tsx`
- `contracts/creos/manifests/widgets-catalog-reception-nominal.json`
- `peintre-nano/tests/unit/reception-defensive-7-5.test.tsx`
- `peintre-nano/tests/unit/reception-history-7-4.test.tsx`
- `peintre-nano/tests/e2e/reception-nominal-7-1.e2e.test.tsx`
- `peintre-nano/tests/e2e/reception-context-gate-7-2.e2e.test.tsx`
- `peintre-nano/tests/e2e/reception-lignes-7-3.e2e.test.tsx`
- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-09 — DS 7.5 : alerte AR21 partagée, DATA_STALE wizard critical, export défensif, tests Vitest + mise à jour e2e testids ; sprint-status → review.
- 2026-04-09 — Story Runner : QA e2e + e2e DATA_STALE via App ; sprint-status → **done**.

## Story completion status

**done** — Story Runner BMAD 2026-04-09 : CS→VS→DS→GATE→QA→CR ; gates `peintre-nano` (lint, test, build) PASS ; `pytest` complet dépôt **KO pré-existant** ; sous-ensemble `tests/test_reception_*.py` ciblé PASS ; CR **APPROVED** ; pas de Plan B (tous les spawns Task ont été utilisés).
