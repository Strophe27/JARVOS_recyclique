# Story 6.9 : Rendre la caisse défensive face aux erreurs, fallbacks et sync différée

Status: done

**Story ID :** 6.9  
**Story key :** `6-9-rendre-la-caisse-defensive-face-aux-erreurs-fallbacks-et-sync-differee`

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-04-08. -->

## Story

En tant qu'**opératrice de caisse** (vocabulaire PRD / terrain : **bénévolat** — voir contrat sync §5.1),
je veux que la caisse v2 reste **compréhensible** quand une requête échoue, qu'un contrat est incomplet ou que la **sync comptable** est **en retard**,
afin de **poursuivre le travail quotidien** sans me tromper sur ce qui est **déjà enregistré dans Recyclique**, ce qui est **en attente de traitement aval**, et ce qui est **réellement bloquant**.

## Acceptance Criteria

1. **Enregistrement local vs suivi différé vs blocage réel** — Étant donné le défaut contractuel **FR23** / **§5.1** du contrat minimal sync (acceptation locale, sync reportable), quand une opération est **acceptée côté Recyclique** mais **pas encore reflétée côté Paheko** (ou équivalent comptable), alors l'UI **distingue clairement** : (a) **enregistrement local réussi** / périmètre Recyclique, (b) **suivi / dette de sync** non alarmiste, (c) **blocage ou quarantaine** lorsque le backend l'indique ; **pas** de message équivalent à « tout est OK comptablement » si ce n'est pas vrai. [Sources : `epics.md` — Story 6.9 premier bloc AC ; `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — §2.1, §5.1, §5.3]

2. **Erreurs / contrats / contexte dégradé** — Étant donné flux non nominal (manifest invalide, **ContextEnvelope** `degraded` / `forbidden`, erreur HTTP, données manquantes), quand la caisse rencontre ces situations, alors les parcours caisse (**6.1–6.8**) exposent des états **explicites** (fallback, erreur, restriction) **alignés** sur les règles runtime partagées (PRD §10.1, UX-DR8, UX-DR10) ; l'opératrice peut **qualifier** si le problème est **local UI**, **contexte / permissions**, ou **aval / sync** selon les **signaux contractuels** disponibles (`code`, `detail`, `retryable`, `state`, `correlation_id` — **AR21**). [Sources : `epics.md` — Story 6.9 deuxième bloc ; inventaire NFR7/AR21 dans `epics.md`]

3. **Supportabilité : traçabilité, interprétabilité, pas de succès silencieux** — Étant donné un flux caisse **critique** et la nécessité de **supportabilité** terrain, quand des **états dégradés** ou **incertains** surviennent (réponse partielle, timeout interprétable, contradiction message UI / payload, etc.), alors **(a)** le parcours reste **traçable** et **opérationnellement interprétable** (signaux **AR21** dont `correlation_id` si présent, états explicites, pas d'écran ambigu sans piste d'action ou de gravité) ; **(b)** **aucun** libellé de **succès complet** n'est affiché tant que le backend n'a pas confirmé l'état attendu ; en cas de doute, **erreur explicite** + **retry** ou **rechargement contexte** selon `retryable` / conventions client API. [Source : `epics.md` — Story 6.9 troisième bloc AC (Given/Then/And)]

4. **`data_contract.critical` + DATA_STALE / échec données critiques** — Étant donné au moins un widget caisse avec **`critical: true`** (ticket courant / encaissement — cadre Epic 6), quand les données passent en **DATA_STALE** (vocabulaire CREOS / `WidgetDataState` — `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`) **ou** que l'endpoint critique **échoue** avant toute revalidation, alors les **actions sensibles** (paiement, validation finale de ticket, clôture si le même garde-fou produit s'applique) sont **bloquées** avec **feedback explicite**, en cohérence avec le **PRD §10.1** et les états `WidgetDataState` ; le comportement respecte la **matrice fallback (sécurité > fluidité)** ; le backend **continue** de **revalider** les mutations sensibles (aligné stories **6.1** / **6.2**). [Source : `epics.md` — Story 6.9 quatrième bloc AC (Given/When/Then/And)]

5. **Couverture transversale des wizards caisse** — Étant donné les écrans déjà livrés (`CashflowNominalWizard`, hold, remboursement, encaissements spéciaux, social, clôture, correction sensible), quand cette story est fermée, alors les **mêmes principes** de défense (messages, distinction local/différé/bloqué, stale critique) sont **appliqués de façon cohérente** là où des mutations ou validations finales existent — **sans** dupliquer une logique métier : **affichage et garde-fous UI** alignés sur **réponses et codes serveur**.

6. **Vocabulaire sync FR24 (affichage)** — Étant donné les états **`a_reessayer`**, **`en_quarantaine`**, **`resolu`**, **`rejete`** (**FR24**, contrat minimal §2.3), quand le backend expose ces notions (directement ou via `state` d'erreur / DTO dédié futur), alors l'UI caisse peut les **rendre lisibles** avec **libellés** cohérents ; **interdiction** de **réimplémenter** outbox, workers, retry ou résolution manuelle (**hors scope Epic 8**). Si l'API ne expose pas encore de champ exploitable, **NEEDS_HITL** : rester sur **messages génériques honnêtes** (« sync en attente côté serveur ») plutôt que **simuler** un état FR24.

7. **OpenAPI / CREOS** — Étant donné **AR39**, toute **nouvelle** surface HTTP ou champ de réponse **normative** pour l'état de sync **vu par la caisse** doit vivre dans `contracts/openapi/recyclique-api.yaml` avec **`operationId` stable** ; les manifests CREOS concernés restent **alignés** (`data_contract.operation_id`). Pas de second chemin « secret » non documenté.

8. **Preuve / tests** — Étant donné la politique des flux caisse, quand la story est fermée, alors **tests Vitest** (unit / e2e) couvrant : scénarios **erreur API** (`retryable` / non), **blocage stale** sur les parcours critiques, **absence de faux succès** ; extension des tests existants (ex. `peintre-nano/tests/unit/cashflow-stale-blocks-payment.test.tsx`) plutôt que redondance ; optionnel : `test-summary-story-6-9-e2e.md` sous `_bmad-output/implementation-artifacts/tests/`.

> **Revalidation brownfield-first (2026-04-08)** : story **keep** (`references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`, sprint-change-proposal Epic 6). L’intention **6.9** (local / différé / bloqué, AR21, `DATA_STALE` sur données critiques, pas de succès comptable factice, FR24 en affichage seulement) **reste inchangée** ; elle couvre le **continuum** rebaseliné par **6.1** (dashboard + workspace vente), les **variantes réel / virtuel / différé** à l’entrée, et les mutations livrées sur les autres slices, **y compris** après repositionnement **6.7** / **6.8** (clôture rattachée au poste ; correction depuis journal admin). Garde-fous **identiques** sur toute **nouvelle** surface caisse issue des stories `rewrite` restantes : mêmes principes, pas de second chemin contractuel.

## Garde-fous développeur (non négociables)

| Règle | Détail |
|--------|--------|
| **Backend autoritaire** | Contexte, permissions, validation des ventes, statuts sync : **Recyclique** ; Peintre = **rendu + garde-fous UI** qui reflètent la vérité serveur. |
| **Pas de logique métier inventée front** | Pas de règles « maison » sur quarantaine, éligibilité comptable, ou mapping Paheko ; utiliser **contrats** et **réponses HTTP**. |
| **Epic 8 hors scope** | Pas d'implémentation **outbox**, **workers de sync**, **UI quarantaine complète**, **correlation multi-systèmes** opérationnelle : réserver à Epic 8 ; ici seulement **consommation** des signaux **déjà** exposés ou **extension OpenAPI minimale** si story l'exige (AC7). |
| **Distinction local / différé / bloqué** | Alignée sur **UX-DR9**, **§5.1–5.3** du contrat sync, **FR19** : message adapté au **niveau de gravité** réel. |
| **Zustand / brouillons** | L'état **éphémère** de caisse (`cashflow-draft-store` etc.) **ne** remplace **pas** la confirmation serveur ; après mutation, l'UI suit le **résultat API**. |
| **Hiérarchie de vérité** | **OpenAPI** > **ContextEnvelope** > manifests **CREOS** > préférences locales (**AR39**). |

## Tasks / Subtasks

- [x] **Cartographie** — Lister chaque wizard caisse et ses points de **mutation finale** / **validation** ; identifier les réponses d'erreur **réelles** du client API aujourd'hui. (AC : 2, 5)
- [x] **Modèle d'affichage erreur** — Factoriser ou réutiliser un **patron** d'affichage (`correlation_id` pour support, `retryable`, message humain vs détail technique non exposé) compatible **AR21**. (AC : 2, 3)
- [x] **Sync différée (signal)** — Si le backend expose déjà un champ de statut sync / dette : l'**intégrer** aux écrans caisse pertinents (ex. bandeau contextuel, libellé post-vente) ; sinon : **documenter NEEDS_HITL** + message neutre honnête. (AC : 1, 6)
- [x] **DATA_STALE / critique** — Vérifier la **cohérence** entre wizards (pas seulement nominal) pour le blocage des **actions sensibles** ; aligner les tests. (AC : 4, 5, 8)
- [x] **OpenAPI + codegen** — Si nouveaux champs ou endpoints : mettre à jour `recyclique-api.yaml` + `contracts/openapi/generated/recyclique-api.ts`. (AC : 7) — *aucun nouveau champ normatif requis : `RecycliqueApiError` + `ExploitationLiveSnapshot.sync_operational_summary` / `SyncStateCore` déjà dans le contrat.*
- [x] **Non-régression** — Exécuter `lint` / `test` / `build` sur `peintre-nano` et, si touché, API Recyclique. (AC : 8)

## Dev Notes

### Intention opérationnelle (pack 6–10)

- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — ligne **6.9** : lire `epics.md` (Story 6.9), `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`, `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` ; frontière : **« Distinguer enregistrement local, différé, bloqué ; pas de faux succès »**.
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` — captures d'appui : `11-0__caisse-05-fermeture-session-sans-transaction.png`, `11-0__admin2-04-logs-transactionnels.png` (**mémoire terrain / support**, pas source de vérité contrat).

### Dépendances Epic 6

- S'appuie sur **6.1–6.8** : tous les parcours caisse livrés ; cette story les **harmonise** sur la **défensive** sans changer le **périmètre fonctionnel** des stories précédentes.
- **Baseline brownfield-first** : **6.1** définit l’**entrée** et le **workspace de vente continu** ; **6.7** / **6.8** précisent le **locus** (clôture dans le continuum, correction **admin** journal). **6.9** ne rouvre pas ces choix produit : elle garantit **cohérence défensive** (erreurs, stale, messages sync) sur chaque point de **mutation / validation finale**, en ligne avec la checklist `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md` (notamment §3–§5, §7–§8).
- **Prérequis conceptuels** : Story **6.7** (clôture locale avec relais sync) et **6.8** (corrections sensibles) ont déjà posé des patterns **step-up** / **honnêteté d'état** — **réutiliser** les mêmes conventions d'erreur et de **non-tromperie**.

### Zones code probables

- `peintre-nano/src/domains/cashflow/*.tsx` — wizards (nominal, refund, close, special, social, sale correction, held path dans nominal).
- `peintre-nano/src/api/cash-session-client.ts`, `peintre-nano/src/api/sales-client.ts` — gestion d'erreurs et mapping **AR21**.
- `peintre-nano/src/domains/cashflow/cashflow-draft-store.ts` — transitions d'état UI **après** réponse serveur.
- `peintre-nano/src/types/context-envelope.ts` — champs **accounting_sync** ou futurs signaux (si exposés par OpenAPI).
- `contracts/openapi/recyclique-api.yaml` — seule source pour nouveaux champs **publics**.
- Tests : `peintre-nano/tests/unit/cashflow-*.test.tsx`, `peintre-nano/tests/e2e/cashflow-*.e2e.test.tsx`.

### Exigences architecture / UX (extraits)

- **UX-DR8** — Erreurs, fallbacks, dégradations **distincts** (local, contrat, contexte, sync différée, quarantaine…).
- **UX-DR9** — Sync différée : **visible** sans **alarmer** inutilement ; distinguer **retry ulterieur** vs **blocage réel**.
- **FR18 / FR19** — Fallback ou blocage selon **criticité** ; journalisation côté backend (NFR7) — l'UI affiche **correlation_id** quand présent pour le **support**.

### Intelligence story précédente (6.8)

- `_bmad-output/implementation-artifacts/6-8-gerer-un-premier-perimetre-borne-de-corrections-sensibles-et-laudit-des-ventes-modifiees.md` — OpenAPI comme vérité, step-up PIN, **pas d'extension implicite** du périmètre ; même rigueur pour **6.9** : pas d'élargissement « défensif » qui **invente** des statuts sync.

### Frontières explicites

- **In scope** : **Présentation** et **garde-fous UI** ; **consommation** des erreurs et statuts **déjà** ou **nouvellement** contrats dans OpenAPI.
- **Hors scope** : **Epic 8** (implémentation sync Paheko, quarantaine opérationnelle complète, résolution manuelle tracee en UI admin dédiée), **Epic 7** (réception).

## Exigences techniques (résumé)

- Client API **centralisé** ; pas de `fetch` dispersé vers des URLs non typées (**instruction contrats** §2).
- Enveloppes d'erreur JSON : au minimum champs **AR21** lorsque exposés par le backend.
- Widgets avec `data_contract` : respect **`operation_id`** et stratégie **`refresh`** ; états **`WidgetDataState`** pour hooks futurs ou actuels.

## Conformité architecture

- **ADR P1** (CSS Modules, Mantine en couche adaptateur) — pas d'introduction de nouvelle stack UI.
- **Epic 6 note agents** — `Peintre_nano` = runtime / rendu ; pas d'autorité métier locale sur sync ou compta.

## Structure fichiers / emplacements

- Conserver les wizards sous `peintre-nano/src/domains/cashflow/`.
- Manifests CREOS sous `contracts/creos/manifests/` si nouveaux libellés ou bindings **uniquement** déclaratifs.

## Exigences de test

- Tests **Vitest** : erreurs API simulées (mock client ou MSW si présent) → **pas** de succès affiché si `ok: false`.
- Extension **e2e** : au moins un scénario **sync différée** **ou** **erreur retryable** par chemin critique **si** environnement de test le permet ; sinon tests unitaires + **documentation** de la limite dans la fiche test optionnelle.
- Réutiliser `data-testid` existants (`cashflow-submit-error`, `cashflow-trigger-stale`, etc.) pour stabilité.

## Definition of Done

- Tous les **AC** satisfaits ou **NEEDS_HITL** documenté dans le fichier story / section Dev Agent Record avec comportement **conservateur** appliqué.
- Aucune **régression** sur les stories 6.1–6.8 (tests verts).
- Pas d'implémentation **Epic 8** déguisée.

## Références

- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md` — story **6.9** **keep** ; finalisation / stale avec **6.1** et **6.9**
- `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md` — parité brownfield (vente, clôture, variantes, frontière Epic 8)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md` — mise à jour dev notes **6.9** pour baseline recomposée
- `_bmad-output/planning-artifacts/epics.md` — Epic 6 (intro), Story 6.9
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`
- `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `contracts/openapi/recyclique-api.yaml`

## Dev Agent Record

### Agent Model Used

Composer (subagent DS / bmad-dev-story), 2026-04-08.

### Debug Log References

_(néant)_

### Completion Notes List

- **AR21** : parsing central `parseRecycliqueApiErrorBody` + enrichissement des erreurs `sales-client` / `cash-session-client` (`code`, `retryable`, `state`, `correlation_id`, réseau).
- **UI** : `CashflowClientErrorAlert` + erreurs draft (`CashflowSubmitSurfaceError`) ; bandeau sync via `GET recyclique_exploitation_getLiveSnapshot` et `sync_operational_summary.worst_state` (FR24 affichage seulement, cache TTL ~25s).
- **DATA_STALE** : garde-fou sur clôture, remboursement, spécial, social, correction (boutons désactivés + alerte) en plus du nominal existant.
- **NEEDS_HITL** : *non requis* pour FR24 agrégé — le live-snapshot OpenAPI expose déjà `SyncStateCore` ; pas de statut sync par vente dans la réponse `SaleResponse` consommée ici (non simulé).
- Tests : `recyclique-api-error.test.ts`, `cashflow-api-error-no-false-success-6-9.test.tsx` ; e2e held ajusté pour `submitError` structuré.

### File List

- `peintre-nano/src/api/recyclique-api-error.ts` (nouveau)
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/api/cash-session-client.ts`
- `peintre-nano/src/domains/cashflow/CashflowClientErrorAlert.tsx` (nouveau)
- `peintre-nano/src/domains/cashflow/cashflow-submit-error.ts` (nouveau)
- `peintre-nano/src/domains/cashflow/cashflow-operational-sync-notice.tsx` (nouveau)
- `peintre-nano/src/domains/cashflow/cashflow-draft-store.ts`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowCloseWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialEncaissementWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSocialDonWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSaleCorrectionWizard.tsx`
- `peintre-nano/tests/unit/recyclique-api-error.test.ts` (nouveau)
- `peintre-nano/tests/unit/cashflow-api-error-no-false-success-6-9.test.tsx` (nouveau)
- `peintre-nano/tests/e2e/cashflow-held-6-3.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-08 — Implémentation Story 6.9 (défensive caisse, AR21, sync agrégée live-snapshot, DATA_STALE transverse, tests).

---

## Story completion status

**review** — Implémentation DS 2026-04-08 ; `npm run test`, `lint`, `build` OK sur `peintre-nano`.

**Note de synthèse create-story :** la story **matérialise** la couche **défensive transverse** de la caisse v2 : **honnêteté d'état**, **taxonomie d'erreurs**, **traçabilité / interprétabilité** terrain (AR21), **FR24** en **affichage seulement** si contrat HTTP disponible, **critical/stale** cohérent sur tous les wizards (PRD §10.1, sécurité > fluidité), **sans** anticipation d'Epic 8.
