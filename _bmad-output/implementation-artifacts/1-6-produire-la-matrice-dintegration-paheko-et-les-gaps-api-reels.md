# Story 1.6 : Produire la matrice d'intégration Paheko et les gaps API réels

**Clé fichier (obligatoire) :** `1-6-produire-la-matrice-dintegration-paheko-et-les-gaps-api-reels`  
**Epic :** epic-1 — **Piste B** (prérequis Recyclique / Paheko ; intégration backend uniquement — **AR8**)  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant que **décideur·euse technique**,  
je veux une **matrice claire opération par opération** pour les choix d'intégration **Paheko**,  
afin que le projet **préfère les API officielles** et ne justifie **plugin** ou usage **SQL** que lorsque c'est **réellement nécessaire**, conformément à **FR5**, **FR40** et **AR9**.

## Acceptance Criteria

**Étant donné** que le produit suit une stratégie **API-first** pour **Paheko**  
**Quand** la matrice d'intégration est produite  
**Alors** chaque **opération métier majeure** visée par la v2 (Recyclique → Paheko) est classée en exactement une des colonnes : **API officielle** / **plugin minimal** / **SQL analyse-admin uniquement** (hors flux transactionnel nominal) / **hors scope v2**  
**Et** les **hypothèses non étayées** sur le **chemin par défaut** sont exclues : toute ligne « nominal » doit citer une **preuve** (endpoint documenté, doc Paheko, code `repo/` si analyse locale, ou audit migration) ou être marquée **inconnu à valider**

**Étant donné** que la complexité d'intégration peut dériver sans garde-fous  
**Quand** la matrice est relue  
**Alors** elle inclut une **liste concrète** des **gaps API réels** et des **inconnues** encore à valider (version cible, champs obligatoires, idempotence côté Paheko, etc.)  
**Et** **chaque gap ou inconnu** est relié à une **conséquence produit** ou à une **entrée de backlog** (story epic cible ou macro-tâche, ex. Epic 8 sync, Epic 9 adhérents, plugin)

**Étant donné** que l'usage **plugin** n'est autorisé que **par exception**  
**Quand** un besoin d'extension plugin est identifié  
**Alors** la story (via la matrice) impose une **rationale explicite** : pourquoi l'**API officielle** est **insuffisante**  
**Et** elle **interdit** que les **écritures SQL transactionnelles** (y compris via `/api/sql` ou accès direct BDD) deviennent le **chemin nominal** d'implémentation ; le SQL reste **analyse, contrôle, administration** (**FR40**)

### Validation humaine (HITL) — critères de relecture

Un pair valide : **matrice API-first** ; chaque **gap** lié à une **conséquence produit/backlog** ; **rationale** explicite si **plugin** ; **aucune** écriture SQL transactionnelle comme chemin nominal.

## Tasks / Subtasks

- [x] **Inventaire des opérations métier majeures** (AC : #1)  
  - [x] Couvrir au minimum les domaines alignés **Epic 1** / **FR39** / futures **Epics 6–8** : vente et encaissement, remboursement (si v2), session/clôture caisse, push comptable / écritures, correspondances **site / caisse / emplacement Paheko** (**FR41**), réception / flux matière (impact Paheko direct ou non), adhérents/membres si touchés par l'intégration comptable ou sociale minimale  
  - [x] Éviter la liste arbitraire : s'appuyer sur **`epics.md`**, **`references/migration-paeco/`**, et le contrat **1.5** pour le vocabulaire sync (quarantaine, états) sans redéfinir ces états

- [x] **Construire la matrice** (table principale) (AC : #1, #3)  
  - [x] Colonnes suggérées : *Opération* | *Classification* | *Mécanisme Paheko* (endpoint `/api/...`, plugin nommé, SQL lecture-only / admin, N/A hors scope) | *Preuve / source* | *Notes*  
  - [x] Pour **API officielle** : référencer **`references/paheko/liste-endpoints-api-paheko.md`** et **`references/paheko/analyse-brownfield-paheko.md`** ; croiser **`references/dumps/schema-paheko-dev.md`** seulement pour **comprendre** le modèle, **pas** comme substitut au chemin nominal API  
  - [x] Pour **plugin minimal** : nommer le plugin/module (ex. caisse, saisie poids si pertinent) et **justifier** l'insuffisance de l'API (AC #3)

- [x] **Liste des gaps et inconnues** (AC : #2)  
  - [x] Reprendre et **affiner** les points déjà signalés en **§9** de `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` (upload fichiers, idempotence, etc.)  
  - [x] Pour chaque ligne : **Gap / inconnu** | **État** (confirmé / à valider) | **Conséquence produit** | **Backlog** (epic.story ou macro)

- [x] **Garde-fous explicites** (AC : #3)  
  - [x] Paragraphe court : **interdiction** du nominal **SQL écriture** / **`/api/sql`** pour mutations métier ; usages acceptés en **lecture** ou **export** pour admin/analyse uniquement  
  - [x] Lien **FR5**, **FR40**, **AR9**

- [x] **Livrable canonique + index**  
  - [x] Rédiger l'artefact daté `references/artefacts/YYYY-MM-DD_NN_matrice-integration-paheko-gaps-api.md` (NN = prochain index pour la date de livraison)  
  - [x] Table **AC → sections** en tête du document  
  - [x] Mettre à jour **`references/artefacts/index.md`**  
  - [x] **Aucune donnée sensible** (secrets, credentials, PII réels)

- [x] **Cohérence avec les livrables existants**  
  - [x] Ne **pas** contredire **1.4** (gouvernance OpenAPI/CREOS), **1.5** (contrat sync), ni **`contracts/openapi/recyclique-api.yaml`** : la matrice Paheko est **couche intégration backend**, pas une seconde source de vérité HTTP Recyclique

## Dev Notes

### Pack contexte (Story Runner — Epic 1)

- **AR9** : matrice **opération → API / plugin / SQL hors flux / hors scope** + liste des **manques API réels** **avant** arbitrage plugin large.  
- **FR5** : API-first ; plugin minimal si besoin ; **pas** d'écriture SQL transactionnelle comme nominal.  
- **FR40** : hiérarchie **API officielle** → **plugin minimal** → **SQL** réservé **analyse / contrôle / administration**.  
- **AR8** : intégration Paheko **côté backend** Recyclique avec mapping métier explicite.  
- **Suite Epic 1** après PASS : **1.7** `1-7-formaliser-les-signaux-dexploitation-pour-bandeau-live-et-les-premiers-slices`.

### Périmètre et anti-confusion

- **Livrable principal** : **documentation reviewable** (matrice + gaps) ; **pas** l'implémentation des connecteurs (Epic 2, Epic 8).  
- **Ne pas** utiliser **`/api/sql`** ou schéma BDD comme **raccourci** pour remplacer une API métier : si seul le SQL permet une mutation, c'est un **gap** à lister avec conséquence backlog (plugin ou évolution Paheko), **pas** une décision nominale silencieuse.  
- **Distinction** : **SQL analyse-admin** = lectures, exports, investigations, opérations d'administration documentées ; **hors scope v2** = explicite dans la matrice pour éviter le scope creep (**AR38**).

### Intelligence story précédente (1.5)

- Le contrat sync **`2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`** fixe cycle de vie, outbox, quarantaine, corrélation ; la **1.6** matérialise **comment** Paheko peut servir chaque brique **sans inventer** de capacité.  
- La story **1.5** a renvoyé le **tableau opération → endpoint → preuve/gap** à **1.6** : ce tableau est **obligatoire** dans le livrable.  
- Fichiers déjà touchés en 1.5 (contexte) : artefact 05, `peintre-nano/tests/contract/contrat-sync-paheko-1-5-artefact.test.ts` — la 1.6 peut **envisager** un test léger sur le **nouvel** artefact si la politique QA doc est étendue ; sinon reporter à **Epic 10** (aligné Dev Notes 1.5).

### Guardrails architecture et produit

- [Source : `_bmad-output/planning-artifacts/epics.md` — Story 1.6, **FR5**, **FR40**, **AR8**, **AR9**, **FR39**, **FR41**]  
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Pistes A/B, Convergence 1, jalons]  
- [Source : `references/paheko/index.md` — index intégration Paheko]  
- [Source : `references/paheko/liste-endpoints-api-paheko.md` — inventaire routes `/api`]  
- [Source : `references/paheko/analyse-brownfield-paheko.md` — API, plugins, WebDAV]  
- [Source : `references/migration-paeco/` — audits brownfield Recyclique + Paheko]  
- [Source : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — §9 hypothèses/gaps]

### Tests

- **Pas de tests automatisés obligatoires** pour la partie purement documentaire sauf **décision produit** (ex. Vitest lecture artefact comme en 1.5) ; si ajout, documenter dans **File List** et `peintre-nano/tests/contract/README.md`.

### Project Structure Notes

- Artefact pivot sous **`references/artefacts/`** avec nom **`YYYY-MM-DD_NN_...`** ; mise à jour **`references/artefacts/index.md`** obligatoire.  
- Ne pas dupliquer tout le contrat sync : **renvoyer** au fichier **1.5** pour les états **FR24** et le cycle de vie.

## References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.6 (~l.611–632), inventaire FR/AR]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md`]
- [Source : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`]
- [Source : `references/paheko/liste-endpoints-api-paheko.md`]
- [Source : `references/paheko/analyse-brownfield-paheko.md`]
- [Source : `references/migration-paeco/` — index et audits]
- [Source : `contracts/openapi/recyclique-api.yaml` — surface v2 reviewable (pas fusionner avec la matrice comme source unique)]

## Dev Agent Record

### Agent Model Used

Composer (agent Dev BMAD — exécution story 1.6, phase DS).

### Debug Log References

Aucun — livrable documentaire uniquement.

### Completion Notes List

- Artefact canonique `references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md` : matrice opération × (API officielle | plugin minimal | SQL analyse-admin | hors scope v2), preuves croisées avec `liste-endpoints-api-paheko.md`, `analyse-brownfield-paheko.md`, audits `migration-paeco` ; §4 gaps/inconnues → backlog ; §5 garde-fous FR5/FR40/AR9.
- Index `references/artefacts/index.md` mis à jour.
- Garde-fous reproductibles : test Vitest `peintre-nano/tests/contract/matrice-paheko-1-6-artefact.test.ts` ; synthèse QA `_bmad-output/implementation-artifacts/tests/1-6-matrice-paheko-doc-qa-summary.md` (aligné politique doc story 1.5).

### File List

- `_bmad-output/implementation-artifacts/1-6-produire-la-matrice-dintegration-paheko-et-les-gaps-api-reels.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/tests/1-6-matrice-paheko-doc-qa-summary.md`
- `references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md` (nouveau)
- `references/artefacts/index.md`
- `peintre-nano/tests/contract/matrice-paheko-1-6-artefact.test.ts`
- `peintre-nano/tests/contract/README.md` (mention story 1.6)

### Review Findings (code review BMAD, 2026-04-02)

- [x] [Review][Patch] Incohérence Dev Agent Record (« pas de test Vitest ») alors que le livrable inclut `matrice-paheko-1-6-artefact.test.ts` et la synthèse QA 1.6 — corrigé (Completion Notes, File List).
- [x] [Review][Patch] Typo et traçabilité preuve caisse — « le alignement » corrigé en `l'alignement` ; référence `audit-caisse-paheko.md` complétée par le chemin repo dans l’artefact matrice.

## Change Log

| Date | Auteur | Résumé |
|------|--------|--------|
| 2026-04-02 | Create-story (BMAD CS) | Story 1.6 créée — matrice Paheko + gaps API ; prêt pour VS puis DS. |
| 2026-04-02 | Dev-story (BMAD DS) | Livré `2026-04-02_06_matrice-integration-paheko-gaps-api.md` ; index artefacts ; statut sprint → review. |
| 2026-04-02 | Code review (BMAD CR) | Revue adversariale OK ; précision libellé §2 réception / Paheko ; preuves caisse avec chemins complets ; alignement Dev Agent Record ↔ Vitest + QA ; statut → done. |
| 2026-04-02 | Code review (BMAD CR) | Revue adversariale story 1.6 ; correctifs mineurs artefact + story ; statut → done ; sprint synchronisé. |
