# Story 5.8 : Valider la cohérence transverse du shell recomposé

Status: done

<!-- Create-story BMAD (CS) — Epic 5 ; passe de validation / opérabilité / documentation des écarts. Hors périmètre : nouvelle logique métier front, pages hardcodées hors runtime, absorption du backlog domaines (Epics 6–9). -->

## Story

En tant qu’**équipe de livraison produit**,  
je veux une **passe de validation transverse** sur le shell recomposé (navigation, dashboard, surfaces admin, layouts transverses),  
afin de **verrouiller une colonne vertébrale UI partagée stable** avant les epics riches en flows métier (6, 7, 8, 9).

## Acceptance Criteria

1. **Autorité commanditaire et chaîne contrats** — Étant donné que l’**Epic 5** recombine des surfaces partagées, quand la passe est exécutée, alors il est **vérifié** (par inspection des artefacts + parcours servi) que la **navigation**, les **routes transverses** et les **pages** concernées s’alignent sur la hiérarchie **OpenAPI → ContextEnvelope → NavigationManifest → PageManifest → UserRuntimePrefs** : pas de `page_key` ni d’arborescence métier **exclusivement** définie dans le code React ; les manifests **reviewables** sous `contracts/creos/manifests/` (ex. `navigation-transverse-served.json`, `page-transverse-dashboard.json`, `page-transverse-listing-*.json`, `page-transverse-consultation-*.json`, `page-transverse-admin-*.json`) sont la **référence** pour ce qui est déclaré transverse dans cette itération. [Source : `epics.md` — Story 5.8 ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 1–4 ; `project-structure-boundaries.md` — Data Boundaries, Integration Points]

2. **Isolation de contexte et permissions** — Étant donné que les epics suivants s’appuient sur des **points d’entrée transverses**, quand dashboard, listings, consultations et admin du **lot servi** sont exercés, alors les règles d’**isolation de contexte** (pas de fuite cross-site / cross-caisse côté affichage) et de **respect des permissions** telles que consommées depuis le backend / `ContextEnvelope` (pas de permission « déduite » côté UI) sont **confirmées** sur un **jeu de scénarios documentés** (minimum : contexte nominal + au moins un cas de refus ou filtrage attendu si disponible sur la stack de validation). Les écarts constatés sont **nommés** dans le registre d’écarts (AC 6). [Source : `epics.md` — Stories 5.1–5.4 ; checklist — points 5, 8]

3. **Runtime partagé, layouts, états transverses** — Étant donné les stories **5.6** et **5.7**, quand la validation est menée, alors il est confirmé que les pages transverses du périmètre **réutilisent** les **templates / layouts** transverses (`TransverseHubLayout`, `TransverseConsultationLayout`, `TransverseMainLayout`, résolution `resolveTransverseMainLayoutMode`) et les **états** chargement / vide / erreur **sans effondrement** du shell quand c’est prévu non critique ; cohérence avec **`reportRuntimeFallback`**, `WidgetResolveFallback`, règles `data-runtime-*` où applicable. **Aucune** nouvelle pile parallèle « dashboard admin à part » hors `Peintre_nano`. [Source : `_bmad-output/implementation-artifacts/5-6-*.md`, `5-7-*.md` ; `peintre-nano/src/app/PageRenderer.tsx`, `peintre-nano/src/runtime/report-runtime-fallback.ts`]

4. **Widgets et données : pas de contournement OpenAPI** — Étant donné la gouvernance contractuelle, quand les widgets transverses officiels chargés par données sont passés en revue, alors chaque widget concerné **expose** un `data_contract.operation_id` **résolu** dans `contracts/openapi/recyclique-api.yaml` (ou l’écart est **inscrit** au registre avec action attendue côté contrat / backend) ; pas d’appel métier direct à **Paheko**, HelloAsso, e-mail, etc. depuis le front. [Source : checklist — points 3, 7, 9 ; `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]

5. **Libellés et visibilité (story 5.5)** — Étant donné l’intégration des libellés et de la visibilité contextuelle, quand la passe est faite, alors le comportement observé est **cohérent** avec la politique convenue : libellés **présentation** uniquement ; navigation / actions **alignées** sur `ContextEnvelope` et règles UX transverses (masqué vs désactivé + feedback si requis). Écarts = entrées registre. [Source : `epics.md` — Story 5.5]

6. **Registre explicite des gaps et contraintes de suivi** — Étant donné l’exigence epics de ne **pas** masquer la dérive, quand la story est close, alors un **document reviewable** existe sous `references/artefacts/` au format daté `YYYY-MM-DD_NN_transverse-shell-coherence-gaps-epic5.md` (incrémenter `NN` selon convention projet) listant : **(a)** écarts contractuels ou runtime, **(b)** dettes assumées (ex. backend partiel, mocks encore utilisés), **(c)** écrans encore sur **frontend-legacy** qui restent la « colonne » transverse pour une durée connue, **(d)** recommandations pour **Epic 6+** (sans les implémenter ici). **Mettre à jour** `references/artefacts/index.md` pour pointer ce fichier. [Source : `references/INSTRUCTIONS-PROJET.md` ; `guide-pilotage-v2.md` — section 4]

7. **Non-objectif : second epic d’implémentation** — Étant donné le cadrage produit, quand le périmètre est revu, alors cette story **ne** **rajoute** **pas** de gros flows métier (caisse, réception, sync Paheko, modules complémentaires) ni de **pages hardcodées** qui contournent le **runtime** manifest-driven. Les seuls changements code acceptables sont **mineurs** et **strictement nécessaires** pour corriger un **blocage de cohérence** identifié pendant la validation (bug manifeste, régression), avec mention dans le registre d’écarts et en PR. [Source : `epics.md` — Story 5.8, troisième bloc AC ; contexte métier annexe utilisateur]

8. **Opérabilité pour la roadmap** — Étant donné que **6, 7, 8, 9** doivent s’brancher sur un shell stable, quand la validation est terminée, alors il existe une **synthèse courte** (dans le même artefact `references/artefacts/…gaps…` ou section dédiée) explicitant que les **points d’accès transverses** livrés en Epic 5 sont **utilisables** pour enchaîner le plan, et **où** le **frontend legacy** reste nécessaire le temps de la transition. [Source : `epics.md` — Story 5.8 ; `guide-pilotage-v2.md` — Epic 5 case à cocher]

9. **Preuves reproductibles** — Étant donné la stack officielle, quand la story est livrée, alors la validation s’appuie sur des **étapes reproductibles** : commandes / URLs / profils (ex. `docker-compose.yml` racine, app `peintre-nano`, parcours démo documentés dans `README` ou artefact) et, si pertinent, **réexécution** des tests existants (`npm test`, e2e transverses déjà ajoutés en 5.6 / 5.7) **sans** exiger une **nouvelle** suite massive — l’objectif est la **preuve de cohérence**, pas la duplication de la couverture 5.7. [Source : `guide-pilotage-v2.md` — section 4, tests ; story 5.7 — mention que 5.8 ne remplace pas la batterie 5.7]

## Tasks / Subtasks

- [x] **Préparer la grille de validation** (AC: 1–5, 9)
  - [x] Lister les manifests transverses **servis** et leur lien vers la résolution runtime (chargement, navigation, `PageRenderer`).
  - [x] Lister les parcours à exécuter (dashboard, 2 listings, 2 consultations, lot admin, navigation depuis `navigation-transverse-served.json`).

- [x] **Exécuter la passe manuelle + stack locale** (AC: 1–3, 5, 8, 9)
  - [x] Vérifier contexte / permissions / filtrage nav sur les scénarios documentés.
  - [x] Vérifier layouts et états (loading / empty / error) sur au moins une page hub et une consultation.
  - [x] Vérifier absence de routes « fantômes » ou structure métier uniquement front.

- [x] **Revue widgets / `data_contract`** (AC: 4)
  - [x] Matrice widget → `operation_id` → présence OpenAPI ; noter les manques.

- [x] **Rédiger le registre d’écarts + synthèse roadmap** (AC: 6, 8)
  - [x] Fichier daté sous `references/artefacts/` + mise à jour `references/artefacts/index.md`.

- [x] **Corrections minimales seulement si bloquant** (AC: 7)
  - [x] Si correctif code : PR petite, justifiée, référencée dans le registre. *(Aucun correctif code requis : aucun blocage constaté.)*

- [x] **Clôture** (AC: 9)
  - [x] Capturer dans l’artefact les commandes de preuve et résultats des tests rerun pertinents.

## Dev Notes

### Nature de la story

- **Passe qualité / cohérence / opérabilité** : l’essentiel du livrable est **documentaire** (registre d’écarts + preuves reproductibles) et **validation** ; pas une reprise d’implémentation des stories 5.1–5.7.
- Si des **tests automatisés** manquent pour verrouiller une régression **déjà** identifiée, en **ajouter le minimum** ; ne pas transformer 5.8 en epic de tests.

### Garde-fous architecture

- `Peintre_nano` = **runtime** de composition ; `recyclique` + `contracts/` = **autorité** structurelle et données. [Source : `project-structure-boundaries.md` — Architectural Boundaries, Data Boundaries]
- **Piste A / B** : la validation peut s’appuyer sur mocks ou backend partiel tant que les **écarts** sont **explicites** dans le registre (alignement `guide-pilotage-v2.md` — règle d’or contrat / rail B).

### Checklist PR Peintre (Epic 5) — rappel opérationnel

À cocher mentalement **avant** clôture : pas de route métier uniquement dans Peintre ; navigation/pages depuis contrats ; `operation_id` pour widgets data ; pas de mutation sensible sur vérité UI seule ; pas d’intégration externe depuis le front ; pas de Zustand (ou autre) comme source de vérité métier ; types générés non édités à la main ; pas de couplage import vers détails internes `recyclique`. [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]

### Artefacts contractuels transverses (référence rapide)

| Fichier | Rôle indicatif |
|--------|----------------|
| `contracts/creos/manifests/navigation-transverse-served.json` | Navigation transverse servie |
| `contracts/creos/manifests/page-transverse-dashboard.json` | Dashboard |
| `contracts/creos/manifests/page-transverse-listing-dons.json` | Listing dons |
| `contracts/creos/manifests/page-transverse-listing-articles.json` | Listing articles |
| `contracts/creos/manifests/page-transverse-consultation-don.json` | Consultation don |
| `contracts/creos/manifests/page-transverse-consultation-article.json` | Consultation article |
| `contracts/creos/manifests/page-transverse-admin-site-overview.json` | Admin site |
| `contracts/creos/manifests/page-transverse-admin-access-overview.json` | Admin accès |
| `contracts/creos/manifests/page-transverse-admin-placeholder.json` | Admin placeholder |
| `contracts/openapi/recyclique-api.yaml` | `operationId` stables |

### Intelligence story précédente (5.7)

- États transverses : `peintre-nano/src/app/states/transverse/` ; slot `transverse-page-state-slot` ; démo `RuntimeDemoApp` avec `?transverseState=…` pour scénarios UX.
- **5.8** ne doit **pas** recharger toute la batterie de tests **5.7** : s’appuyer sur l’existant et compléter seulement si un **trou** bloque la preuve de cohérence. [Source : `_bmad-output/implementation-artifacts/5-7-gerer-les-etats-vides-chargements-et-erreurs-sur-les-pages-transverses.md`]

### Hors périmètre explicite

- Implémentation **Epic 6** (caisse), **7** (réception), **8** (Paheko), **9** (modules) — seulement **notés** comme suites dans le registre si l’écart est déjà visible.
- Promotion CI / gates globaux type **Epic 10** — hors story sauf constat dans le registre.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.8]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source : `_bmad-output/implementation-artifacts/5-1-recomposer-la-navigation-transverse-commanditaire-dans-peintre-nano.md` à `5-7-*.md`]

## Conformité technique (rappel)

Stack : React 18, Vite, TypeScript, Vitest ; manifests CREOS + validation côté runtime — **aucune** recherche de « dernière version » de framework n’est requise pour cette story ; respecter les versions du dépôt.

## Questions ouvertes (à résoudre en fin de validation)

- Quels **profils utilisateur** / jeux de permissions sont disponibles sur la stack utilisée pour la passe (démo vs backend réel) ?
- Quels écrans **legacy** restent le chemin principal pour une fonction transverse donnée (à lister dans le registre) ?

## Dev Agent Record

### Agent Model Used

Cursor Agent — sous-agent BMAD dev-story (implémentation story 5.8, 2026-04-08).

### Debug Log References

Aucun incident bloquant.

### Completion Notes List

- Grille de validation, scénarios permissions/contexte, matrice widgets/OpenAPI, gaps (a–d), synthèse roadmap et checklist PR Peintre consignés dans `references/artefacts/2026-04-08_01_transverse-shell-coherence-gaps-epic5.md`.
- Inspection code : `runtimeServedManifestLoadResult` aligne bundle servi sur `contracts/creos/manifests/` ; `RuntimeDemoApp` résout `pageKey` depuis la nav filtrée ; gabarits transverses via `resolveTransverseMainLayoutMode` + `TransverseMainLayout`.
- `npm test` dans `peintre-nano` : 208 tests passés (35 fichiers), 2026-04-08.
- Aucune modification applicative : story documentaire / validation ; AC 7 respecté.

### File List

- `references/artefacts/2026-04-08_01_transverse-shell-coherence-gaps-epic5.md` (créé)
- `references/artefacts/index.md` (entrée index)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (5-8 → done)
- `_bmad-output/implementation-artifacts/5-8-valider-la-coherence-transverse-du-shell-recompose.md` (tâches, statut, record)

## Change Log

- **2026-04-08** — Implémentation dev-story : registre d’écarts Epic 5, index artefacts, statut sprint + story → review ; tests Peintre rerun documentés dans l’artefact.
- **2026-04-08** — Story Runner BMAD : gates (npm test, build) + QA + CR PASS ; sprint + story → **done**.

---

**Note de clôture create-story :** analyse contexte moteur BMAD — guide développeur pour implémentation / validation story 5.8 ; clôture **done** après revue (registre `2026-04-08_01_transverse-shell-coherence-gaps-epic5.md`).
