# Story 25.15 : Spike — faisabilité IndexedDB ou cache local minimal sans livraison PWA

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. Ce spike est **documentaire** ; le livrable attendu est un **rapport de faisabilité**, pas une feature produit ni une PWA. -->

**Story key :** `25-15-spike-faisabilite-indexeddb-cache-local-sans-livraison-pwa`  
**Epic :** 25 — phase 2 (impl)  
**Fichier story :** `_bmad-output/implementation-artifacts/25-15-spike-faisabilite-indexeddb-cache-local-sans-livraison-pwa.md`

## Dépendances (DAG et prérequis)

- **25-11** — **done** (obligatoire) : spike contrats enveloppe de contexte **sans PWA** — `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md`, fragment `contracts/openapi/fragments/context-envelope-examples-25-11.yaml`, types Peintre `peintre-nano/src/types/context-envelope.ts`. Ne pas dupliquer la traçabilité contrat : ce spike porte sur **persistance client / cache** et **honest go/no-go** PWA.
- Graphe machine : `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` — vérifier le nœud **25-15** et ses `depends_on` au besoin.

## Story (BDD)

As an architect,  
I want a bounded feasibility spike on IndexedDB or minimal local cache without shipping a PWA product,  
So that future PWA work has an honest go/no-go without pretending the global **NOT READY** verdict disappeared.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.15**.

**Given** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` still marks the large PWA programme as **NOT READY** at product readiness level  
**When** this story is delivered  
**Then** a report cites that report’s PWA sections and `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` and lists hard **stop criteria** (no production persistent client store, no silent bypass of gel or readiness)  
**And** the spike ends with **go / no-go / later** with estimated **cost bands** for a future epic, not a disguised production feature flag  
**And** this spike must not be interpreted alone as lifting the **NOT READY** programme verdict

### Citations obligatoires readiness (ne pas « lever » NOT READY seul)

Le rapport **2026-04-19** reste la **baseline** pour le verdict programme PWA. Le livrable spike doit **citer explicitement** au minimum :

| Document | Sections / ancrages utiles |
|----------|----------------------------|
| `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` | Encadré **Lecture après 2026-04-20** (l. ~19) ; synthèse **Extension PWA offline-first** **NON PRÊTE** ; **Verdict global** **NO-GO** programme massif PWA ; **§4** UX — **Offline-first PWA** non reflétée (pas d’ADR SW/IndexedDB) ; **§6** tableau **Extension PRD vision kiosque PWA / offline-first** → **NOT READY** ; **Actions critiques** / **Prochaines étapes** liées kiosque PWA. |
| `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` | **§1** : extension PWA **toujours NOT READY** pour un programme massif ; **§2** gate **Readiness globale extension PWA / kiosque** **Ouvert** ; distinction levée **process** (`GEL_DOC` / 25.6) vs **NOT READY** PWA. |

**Formulation contractuelle :** une phrase du rapport spike doit affirmer clairement que **seuls** une **correct course**, un **readiness programme** révisé ou une **décision produit/archi explicite** peuvent retirer le **NOT READY** au niveau **programme** — **pas** ce spike isolé.

## Critères d’arrêt (hard stops — obligatoires dans le rapport)

Le rapport de spike doit lister des **arrêts** non négociables, par exemple (adapter la formulation au contenu analysé) :

1. **Aucun** magasin persistant client (IndexedDB, Cache Storage durable pour métier, etc.) **en production** ou derrière un **feature flag** présenté comme « prêt prod » sans epic PWA et sans levée documentaire du **NOT READY** programme.
2. **Aucun** contournement silencieux du **gel** / des **gates** readiness (cf. note **2026-04-20** §2) ni des règles **25-8** (`CONTEXT_STALE`, alignement enveloppe) via un cache local qui **masquerait** un état serveur refusé.
3. **Aucune** livraison **Service Worker** « full PWA » ni engagement **offline-first** produit dans ce spike — **borne** à **prototypage local** ou **branche expérimentale** si exploration technique, avec périmètre daté et jetable.
4. Cohérence avec **25-11** : toute donnée mise en cache localement qui reflète le **contexte d’exploitation** doit rester **alignée** sur le contrat `ContextEnvelope` / fraîcheur documentée ; pas de seconde « source de vérité » contradictoire avec le serveur.

## Sorties attendues du spike (livrables)

1. **Rapport markdown versionné** (emplacement recommandé : `_bmad-output/implementation-artifacts/` avec préfixe date, ex. `2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md`) contenant :
   - **Résumé exécutif** (5–10 lignes) : périmètre, conclusion **go / no-go / later**.
   - **Options techniques** : IndexedDB (Dexie/idb, etc.), `localStorage` / `sessionStorage` (limites), **Cache API** (si pertinent), stratégie **invalidation** / **version de schéma** — **sans** imposer une librairie en prod.
   - **Risques** : sécurité (données sensibles au poste), divergence multi-onglets, quota navigateur, compatibilité kiosque, corrélation avec **ADR 25-2** (offline PIN — **hors impl** ici sauf analyse).
   - **Bandes de coût** (estimation **T-shirt** ou **jours·dev** + incertitude) pour **trois** horizons : *spike UX+archi supplémentaire*, *MVP cache lecture seule*, *socle offline-first partiel* — en rappelant que le **programme** PWA reste **NOT READY** tant que FR/epics vision ne sont pas absorbés.
   - **Décision** : **go** (conditions), **no-go** (bloquants réaffirmés depuis readiness), **later** (dépendances explicites : epics, UX, ADR SW dédié, etc.).

2. **Optionnel** : **PoC jetable** (dossier `peintre-nano` ou sandbox **non mergée** en `main` sans validation produit) — **uniquement** si l’AC « bounded » est respectée et les hard stops rappelés dans le README du PoC.

## Hors scope (explicite)

- **Livraison PWA** en production, **enregistrement SW** grand public, **install prompt**, **sync** métier fiable bout-en-bout.
- **Lever seul** le verdict **NOT READY** du rapport **2026-04-19** ou du gate **extension PWA** dans la note **2026-04-20**.
- **Nouvelle ADR** « Service Worker / sync client » : hors spike sauf **recommandation** de suite dans le rapport (correct course si ADR requise).

## Definition of Done (spike doc)

- [x] Rapport publié in-repo avec **citations verbatim des chemins** readiness ci-dessus et **résumé** des sections PWA concernées du rapport **2026-04-19**.
- [x] **Stop criteria** et **go / no-go / later** + **bandes de coût** présents et **traçables** (table ou liste numérotée).
- [x] Mention explicite : **ce livrable ne lève pas** le **NOT READY** programme sans acte de pilotage / readiness **distinct**.
- [x] Référence **25-11** et contraintes **ContextEnvelope** / **25-8** pour toute discussion cache contexte.
- [x] Si PoC : isolé, documenté comme **expérimental**, sans persistance prod. *(N/A — aucun PoC livré ; spike documentaire uniquement.)*

## Tasks / Subtasks

- [x] Relire **epics.md** §25.15 et **25-11** (AC spike contrats) (AC: alignement)
- [x] Extraire et citer les passages **PWA / NOT READY** du rapport `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` (AC: **Given** / **Then** citations)
- [x] Citer `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` §1 et §2 (gates PWA) (AC: **Then**)
- [x] Rédiger **stop criteria** + **go/no-go/later** + **bandes de coût** (AC: **Then** / **And**)
- [x] (Optionnel) Prototype jetable + README limites (AC: borne technique) *(non réalisé — optionnel, hors périmètre minimal livré)*
- [x] Revue courte : aucune formulation qui **impliquerait** levée **NOT READY** implicite (AC: **And** dernier)

## Dev Notes

### Contexte développeur — garde-fous

- **Nature :** spike **documentaire** ; l’agent d’implémentation ne doit **pas** merger de persistance client durable sans epic et sans arbitrage **NOT READY**.
- **Frontend :** stack **Peintre_nano** / React — toute exploration IndexedDB reste **alignée** sur les patterns existants (`peintre-nano/`) et sur les types **25-11**.
- **Backend :** hors périmètre sauf pour rappeler que la **vérité** contexte reste **serveur** ; cache client = **optimisation** ou **offline futur**, jamais substitution aux réponses **409** `CONTEXT_STALE` (**25-8**).

### Exigences techniques (spike)

- Comparer **IndexedDB** vs alternatives **minimales** pour une future **file d’attente** ou **cache catalogue** (niveau conceptuel).
- Documenter **schéma de données**, **migration**, **purge**, **chiffrement au repos** (ou absence volontaire) au niveau **recommandation**.
- Mentionner **support navigateur** cible kiosque (si connu) ou **inconnu** comme risque.

### Conformité architecture

- Spec socle **25.4** : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` — ne pas contredire invariants contexte / projection.
- **ADR 25-2** / **25-3** : citations possibles pour **limites offline** et **async** ; pas de réouverture ADR dans ce spike.

### Bibliothèques / frameworks (recherche web permise au dev)

- Évaluer **idb** / **Dexie.js** / API native **IndexedDB** ; noter versions stables **au moment du spike** et **surface API** utile (transactions, index).
- Ne **figer** aucune dépendance npm en prod dans ce spike sauf PoC jetable **isolé**.

### Structure fichiers (indicative)

- Rapport spike : `_bmad-output/implementation-artifacts/2026-*-spike-25-15-*.md`
- PoC optionnel : sous `peintre-nano/` ou branche dédiée — **pas** de modification large du bundle prod sans ticket aval.

### Tests (spike)

- **Pas d’obligation** de pytest / CI pour le seul rapport ; si PoC : tests manuels checklist dans le rapport ou tests unitaires **locaux** au dossier PoC.

## Intelligence story précédente (25-11 et continuité 25-14)

- **25-11** a fixé que **sans PWA** : pas de SW, pas d’IndexedDB **prod** dans ce périmètre ; **25-15** **autorise** l’**étude** IndexedDB **à condition** de réaffirmer **NOT READY** programme et **stop criteria**.
- **25-14** rappelle le risque **multi-onglets** ; le rapport **25-15** doit au moins **mentionner** ce risque pour tout état local.

## Référence project-context

- Aucun `project-context.md` racine détecté dans le dépôt à la date de création de cette story ; s’appuyer sur **epics.md** §25, **spec 25.4**, **ADR 25-2**/**25-3**, et artefacts **25-11**.

## Statut de complétion (create-story)

- **Ultimate context engine** : story **25-15** prête pour exécution **dev-story** ou travail humain — livrable attendu = **rapport de faisabilité** + optional PoC, **pas** feature PWA.

## Change Log

- **2026-04-20** — Livraison spike documentaire : rapport `2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md`, gate pytest `recyclique/api/tests/test_story_25_15_spike_faisabilite_indexeddb_cache_local_sans_pwa.py` ; statut story → **review** ; `sprint-status.yaml` clé **25-15** → **review**.

## Dev Agent Record

### Agent Model Used

Composer (agent Task Story Runner BMAD / bmad-dev-story)

### Debug Log References

_(aucun)_

### Completion Notes List

- Rapport spike versionné sous `_bmad-output/implementation-artifacts/` avec citations readiness **2026-04-19** + note **2026-04-20**, critères d’arrêt, go/no-go/later + bandes de coût, non-levée explicite du NOT READY programme.
- PoC optionnel non livré (story bornée doc).

### File List

- `_bmad-output/implementation-artifacts/2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md` — rapport spike (chemin stable documenté dans §8 du rapport)
- `recyclique/api/tests/test_story_25_15_spike_faisabilite_indexeddb_cache_local_sans_pwa.py` — gate pytest ancres / existence
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `25-15-spike-faisabilite-indexeddb-cache-local-sans-livraison-pwa` : **done**
- `_bmad-output/implementation-artifacts/25-15-spike-faisabilite-indexeddb-cache-local-sans-livraison-pwa.md` — story (statut, DoD, tasks, change log, Dev Agent Record)
