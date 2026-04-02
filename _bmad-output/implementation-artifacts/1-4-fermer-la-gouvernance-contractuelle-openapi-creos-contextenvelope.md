# Story 1.4 : Fermer la gouvernance contractuelle OpenAPI / CREOS / ContextEnvelope

**Clé fichier (obligatoire) :** `1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope`  
**Epic :** epic-1 — **Piste B** (contrats et prérequis backend) — **pas** confusion avec Peintre_nano / epic-3  
**Statut :** review

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant qu’**architecte plateforme**,  
je veux que la **gouvernance des contrats** (données backend et composition UI) soit **explicite et reviewable**,  
afin qu’**Epic 2** et **Epic 3** s’appuient sur **une seule hiérarchie de vérité** au lieu d’inventer des modèles parallèles.

## Acceptance Criteria

**Étant donné** que le projet utilise à la fois **OpenAPI** et **CREOS**  
**Quand** les règles de gouvernance sont documentées  
**Alors** la story énonce pour chaque artefact le **propriétaire autoritaire**, l’**emplacement canonique** et la **frontière d’usage** pour : `OpenAPI`, `ContextEnvelope`, `NavigationManifest`, `PageManifest`, et `UserRuntimePrefs`  
**Et** elle formalise la **hiérarchie de vérité** déjà assumée par l’architecture.

**Étant donné** que des agents et développeurs vont **générer**, **valider** et **consommer** ces artefacts  
**Quand** la gouvernance contractuelle est fermée  
**Alors** la story définit les **attentes de versionnement**, les **attentes de détection de dérive (drift)**, et la règle que les **artefacts frontend générés** sont des **copies dérivées**, jamais une **seconde source de vérité**  
**Et** elle précise comment les **enums partagés**, **identifiants** et **clés de permission** **descendent** des contrats backend vers les contrats UI.

**Étant donné** que les manifests widgets peuvent déclarer un **`data_contract`** lié à l’API  
**Quand** la gouvernance est fermée  
**Alors** le projet désigne le fichier reviewable **`contracts/openapi/recyclique-api.yaml`** comme **source reviewable** de la surface API v2 (draft évolutif, writer **Recyclique**) et impose des **`operationId` stables** sur les opérations exposées, référencées par **`data_contract.operation_id`**  
**Et** les schémas CREOS incluent l’**extension documentée** dans **`contracts/creos/schemas/widget-declaration.schema.json`**.

**Étant donné** que **Peintre_nano** ne doit **pas** devenir auteur de la structure métier  
**Quand** les responsabilités du runtime sont précisées  
**Alors** la story confirme que la résolution runtime peut **valider**, **fusionner**, **filtrer**, **rejeter** et **rendre** les contrats  
**Et** elle **interdit** la création runtime de **routes métier**, **permissions** ou **pages** absentes des contrats **commanditaires**.

### Validation humaine (HITL) — critères de relecture

Un pair valide que la doc couvre : **propriétaires** et **emplacements canoniques** ; **frontières** OpenAPI vs CREOS ; **hiérarchie de vérité** ; **versionnement / drift** ; **artefacts générés dérivés** ; **flux enums / clés permission** ; **`recyclique-api.yaml` + `operationId` stables** ; **extension widget-declaration CREOS** ; **runtime Peintre_nano borné** (pas auteur métier).

## Tasks / Subtasks

- [x] Rédiger le **document de gouvernance** (référence normative reviewable) couvrant les quatre blocs Given/When/Then ci-dessus — **table de traçabilité AC → sections** recommandée en tête ou en annexe.
- [x] Section **hiérarchie AR39** : `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` — pour chaque niveau : rôle, propriétaire, emplacement canonique (fichier ou dossier), ce qui est **normatif** vs **dérivé**.
- [x] Section **OpenAPI (AR19)** : writer canonique **Recyclique** ; chemin unique versionné ; règles pour **`contracts/openapi/recyclique-api.yaml`** (draft, évolution sans casser les `operationId` publiés) ; lien avec codegen / `contracts/openapi/generated/` quand le pipeline existe.
- [x] Section **CREOS** : périmètre `contracts/creos/` ; schémas reviewables dont **`widget-declaration.schema.json`** ; lien **`data_contract.operation_id`** ↔ **`operationId`** OpenAPI ; rappel **`data_contract.source`** / tags (alignement à formaliser en CI — voir `contracts/README.md`).
- [x] Section **versionnement et drift** : qu’est-ce qui change en semver / PR ; qui valide ; **CI Epic 10** comme filet (référencer intention sans implémenter toute la CI ici) ; règle **copies générées = dérivées**.
- [x] Section **flux enums / clés permission** : ordre de vérité (OpenAPI / schémas partagés → manifests / runtime) ; cohérence avec la spec **1.3** (permissions calculées backend, UI non vérité sécurité).
- [x] Section **Peintre_nano** : runtime **borné** — validation, merge, filtrage, rejet, rendu **autorisés** ; **interdit** : inventer routes/pages/permissions métier hors contrats commanditaires ; types TS / fixtures = **dérivés** ou **mocks** jusqu’à Convergence 1.
- [x] Mettre à jour **`contracts/README.md`** et/ou **`contracts/creos/schemas/README.md`** si la gouvernance y ajoute des règles manquantes (éviter la duplication : un doc pivot sous `references/artefacts/` daté + liens depuis `contracts/`).
- [x] **Enrichir** `contracts/openapi/recyclique-api.yaml` **seulement** dans la mesure nécessaire pour **illustrer** la gouvernance (ex. squelette d’`operationId` + tags) **sans** prétendre couvrir tout le backend — ou documenter explicitement que le YAML reste vide jusqu’à stories Epic 2 si c’est le choix produit.
- [x] Créer / mettre à jour l’**artefact daté** sous `references/artefacts/` (`YYYY-MM-DD_NN_…`) et **`references/artefacts/index.md`** (convention projet).
- [x] Vérifier **aucune donnée sensible** dans les livrables.

## Dev Notes

### Périmètre et anti-confusion

- **Livrable principal** : documentation de gouvernance **reviewable** + alignement des fichiers **`contracts/`** existants ; **pas** d’implémentation backend complète (Epic 2).
- **Suite logique** après **1.3** (spec multi-contextes / auth) : 1.4 **ferme** le cadre contractuel que 1.3 a préparé sémantiquement (AR39 / AR19 rappelés en 1.3, détaillés ici).
- **Story suivante** : **1.5** — contrat minimal sync / réconciliation Paheko.

### Hiérarchie et emplacements (rappel opérationnel)

| Artefact | Vérité / rôle | Emplacement canonique (état repo) |
|----------|----------------|-----------------------------------|
| OpenAPI | Surface HTTP reviewable, `operationId` stables | `contracts/openapi/recyclique-api.yaml` |
| ContextEnvelope | Instance runtime **backend** (projection autorisée côté UI) | Spécifié dans la doc + futurs schémas OpenAPI / impl. Epic 2 |
| NavigationManifest, PageManifest | Contrats commanditaire composition / navigation | Exemples aujourd’hui `peintre-nano/public/manifests/`, `peintre-nano/src/fixtures/manifests/` ; futur `contracts/creos/manifests/` possible — **à trancher dans la doc** |
| UserRuntimePrefs | Personnalisation locale **non métier** | Comportement runtime Peintre_nano (Story 3.5) — **dernier** dans AR39 |

### Intelligence story précédente (1.3)

- Spec canonique : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — permissions additives, clés stables, step-up, AR39/AR19 en renvoi ; **1.4** doit **aligner** vocabulaire contrats sans contradire cette spec.
- Audit 1.2 : surfaces sûres, ContextEnvelope cible — la gouvernance doit **ancrer** où vit le contrat vs le code brownfield.

### Guardrails architecture

- [Source: `epics.md` — **AR19**, **AR39**]
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Pistes A/B, Convergence 1, liaison `data_contract.operation_id`]
- [Source: `contracts/README.md`, `contracts/creos/schemas/README.md`]
- [Source: `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md` — `data_contract`, sémantique champs]

### Tests

- **Pas de tests automatisés obligatoires** pour la partie purement documentaire.
- **CI contrats (Epic 10)** : lorsque `paths` OpenAPI non vides, chaque `data_contract.operation_id` reviewable doit exister — **documenter** cette règle dans la gouvernance ; implémentation CI hors périmètre strict 1.4 sauf si la story est étendue explicitement.

### Project Structure Notes

- Ne **pas** inverser la hiérarchie : types / manifests dans **peintre-nano** restent **dérivés** ou **exemples** tant que le fichier OpenAPI et les manifests reviewables repo ne sont pas la référence unique pour un périmètre donné.
- Toute évolution de **`widget-declaration.schema.json`** doit rester **cohérente** avec l’instruction contrats données et avec **`additionalProperties`** documentés dans le README CREOS.

## Dev Agent Record

### Agent Model Used

Composer (agent DS Story 1.4).

### Debug Log References

_(aucun)_

### Completion Notes List

- Document pivot `2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` : traçabilité AC, AR39, OpenAPI/CREOS, versionnement/drift, flux permissions aligné spec 1.3, runtime Peintre_nano borné.
- `contracts/README.md` et `contracts/creos/schemas/README.md` : liens vers le pivot sans dupliquer la norme.
- `recyclique-api.yaml` : opération illustrative `recyclique_contractGovernance_ping` + tag `governance` pour ancrer la règle des `operationId` stables.
- **QA (phase BMAD)** : tests Vitest « contrat » sous `peintre-nano/tests/contract/` (OpenAPI + schéma widget) ; synthèse `_bmad-output/implementation-artifacts/tests/1-4-gouvernance-contractuelle-doc-qa-summary.md` ; `npm run test` dans `peintre-nano/` au vert après ajout.

### File List

- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` (créé)
- `references/artefacts/index.md` (modifié)
- `contracts/README.md` (modifié)
- `contracts/creos/schemas/README.md` (modifié)
- `contracts/openapi/recyclique-api.yaml` (modifié)
- `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts` (créé)
- `peintre-nano/tests/contract/README.md` (modifié)
- `peintre-nano/vitest.config.ts` (modifié)
- `peintre-nano/package.json` (modifié — devDependency `yaml`)
- `peintre-nano/package-lock.json` (généré / modifié par `npm install`)
- `_bmad-output/implementation-artifacts/tests/1-4-gouvernance-contractuelle-doc-qa-summary.md` (créé)
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (modifié)
- `_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md` (modifié — story / statut)

### Change Log

- 2026-04-02 — DS : gouvernance contractuelle 1.4 livrée ; statut sprint → review.
- 2026-04-02 — Post-CR : alignement Dev Agent Record (File List / Completion Notes) avec livrables QA et tests contrat.

---

**Note de complétion (phase CS)** : analyse contexte moteur story — guide développeur / rédacteur doc créé ; statut **ready-for-dev**.
