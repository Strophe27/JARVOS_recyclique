# Story 1.5 : Définir le contrat minimal de synchronisation et réconciliation avec Paheko

**Clé fichier (obligatoire) :** `1-5-definir-le-contrat-minimal-de-synchronisation-et-reconciliation-avec-paheko`  
**Epic :** epic-1 — **Piste B** (prérequis Recyclique / Paheko ; pas Epic 3 UI seule)  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant qu’**équipe produit et intégration**,  
je veux un **contrat minimal mais explicite** de synchronisation et de réconciliation entre **Recyclique** et **Paheko**,  
afin que les **parcours terrain d’abord** (enregistrement local, report de sync) restent **sûrs** avant l’intégration comptable complète (Epic 8).

## Acceptance Criteria

**Étant donné** que les opérations terrain sont enregistrées dans **Recyclique** en premier et synchronisées vers **Paheko** ensuite si besoin  
**Quand** le contrat de sync est formalisé  
**Alors** il définit le **cycle de vie minimal** d’une opération synchronisée : enregistrement local, **retry**, **quarantaine**, **résolution**, **rejet**, et **état comptable final** (côté Recyclique et côté Paheko au niveau sémantique documentaire, sans exiger l’implémentation ici)  
**Et** il précise le rôle d’une **outbox durable**, de l’**idempotence** et des **identifiants de corrélation** (alignement **AR11**, **AR17**, **AR24** — voir epics / architecture).

**Étant donné** que certaines **actions critiques finales** pourront être bloquées sur des garanties comptables  
**Quand** les règles de réconciliation sont documentées  
**Alors** la story **distingue** : acceptation locale **non bloquante**, **blocage sélectif** des actions finales critiques, et **parcours de résolution manuelle** (quarantaine / levée)  
**Et** elle définit la **piste d’audit minimale** pour les **levées de quarantaine** et les **corrections manuelles** (qui, quoi, quand — sans implémenter le journal ici si hors périmètre Epic 1).

**Étant donné** que les **Epics 6 et 7** ne doivent **pas** attendre l’**Epic 8** pour inventer la sémantique sync de base  
**Quand** cette story est approuvée  
**Alors** les stories ultérieures peuvent s’appuyer sur un **contrat documentaire stable** (états, vocabulaire, invariants)  
**Et** elles peuvent implémenter **clôture locale exploitable** et **sync différée** **sans redéfinir** les **états comptables métier** (cohérence avec **FR23–FR25**, **FR39** et inventaire epics).

### Validation humaine (HITL) — critères de relecture

Un pair valide que la doc couvre : **cycle de vie sync** (local → retry → quarantaine → résolution / rejet → état final) ; **outbox durable**, **idempotence**, **corrélation** ; distinction **acceptation locale** vs **blocage actions finales** ; **audit levée quarantaine** ; **stabilité** pour Epics 6–7–8 **sans redéfinir les états**.

## Tasks / Subtasks

- [x] Rédiger le **document pivot reviewable** (contrat minimal sync / réconciliation) avec **table de traçabilité AC → sections**.
- [x] Section **cycle de vie** : enregistrement local ; tentatives / backoff ; passage états explicites alignés **FR24** (`a_reessayer`, `en_quarantaine`, `resolu`, `rejete`) — préciser sémantique opérationnelle **sans** dupliquer tout le périmètre Epic 8.
- [x] Section **outbox + livraison at-least-once** : rôle **PostgreSQL** (AR11) ; handlers **idempotents** ; lien avec **Idempotency-Key** / clés métier où pertinent (AR24).
- [x] Section **corrélation inter-systèmes** : `X-Correlation-ID` / `correlation_id` dans les flux et erreurs (AR17, AR21 — enveloppe d’erreur JSON cohérente avec la gouvernance **1.4** et évolutions futures de `recyclique-api.yaml`).
- [x] Section **réconciliation** : **FR23** (terrain d’abord, sync reportable) ; **FR25** (quarantaine obligatoire : échec persistant, incohérence comptable, absence de correspondance requise) ; règles de **blocage sélectif** des actions finales vs travail local.
- [x] Section **FR39 (minimal)** : au minimum **sessions de caisse et clôture**, **écritures comptables** (niveau concept), **politique de réconciliation**, **granularité du push**, **idempotence / retry**, **rejets**, **reprise après incident**, **statut final** Recyclique / Paheko — en version **minimal contract** pour Epic 1 (détail d’implémentation reporté Epic 8).
- [x] Section **cohérence contractuelle** : rappeler **AR39** — le contrat sync est **métier intégration** ; il doit rester **aligné** avec **`contracts/openapi/recyclique-api.yaml`** et la **gouvernance 1.4** (pas de seconde source de vérité HTTP hors OpenAPI reviewable).
- [x] Croiser **`references/paheko/`** (API, brownfield) et **`references/migration-paeco/`** pour **ne pas** inventer des capacités Paheko non étayées ; signaler **hypothèses** et **gaps** renvoyés à la **Story 1.6** (matrice / gaps API).
- [x] Créer l’**artefact daté** sous `references/artefacts/` (`YYYY-MM-DD_NN_…`) et mettre à jour **`references/artefacts/index.md`**.
- [x] Vérifier **aucune donnée sensible** dans les livrables.

## Dev Notes

### Pack contexte (Story Runner — Epic 1)

- **Piste B** : Epic 1 prérequis Recyclique / Paheko — pas Epic 3 UI seule.
- **Hiérarchie** : **OpenAPI** > **ContextEnvelope** > … (**AR39**). Le contrat sync est **métier intégration** ; cohérent avec **`contracts/openapi/recyclique-api.yaml`** et gouvernance **1.4** une fois publiée.
- **Références** : `epics.md` Story 1.5 ; **FR39**, **FR23–FR25** ; `references/paheko/`, `references/migration-paeco/` ; artefacts **1.4** / `contracts/README.md` pour alignement erreurs (`code`, `detail`, `retryable`, `state`, `correlation_id`, **AR21**).
- **Suite** : après livraison — **1.6** `1-6-produire-la-matrice-dintegration-paheko-et-les-gaps-api-reels`.

### Périmètre et anti-confusion

- **Livrable principal** : **documentation normative reviewable** (contrat minimal) ; **pas** l’implémentation outbox / workers (Epic 2, Epic 8).
- **Story 1.4** a fermé la gouvernance OpenAPI / CREOS ; **1.5** ajoute la couche **sémantique sync** compatible avec les futurs endpoints et schémas d’erreur.

### Livrable canonique

- **Fichier principal** : `references/artefacts/YYYY-MM-DD_NN_contrat-minimal-sync-reconciliation-paheko.md`  
  - `NN` = prochain numéro disponible pour la date de livraison (01, 02, …), convention projet (`references/INSTRUCTIONS-PROJET.md`).
- **Contenu minimal** : table **AC → sections** (trois blocs Given/When/Then ci-dessus + sous-section **Validation humaine (HITL)**) ; sections listées dans **Tasks / Subtasks** ; **hypothèses / gaps Paheko** explicitement marqués et renvoyés à **Story 1.6** quand l’API réelle n’est pas étayée.
- **Index** : nouvelle entrée obligatoire dans `references/artefacts/index.md` après création du fichier.

### Intelligence story précédente (1.4)

- Pivot gouvernance : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — **ne pas** contredire AR39 / writer OpenAPI.
- Toute exposition HTTP future des états sync doit **descendre** du fichier reviewable `recyclique-api.yaml` (évolution **sans** casser les `operationId` publiés).

### Guardrails architecture

- [Source: `epics.md` — **FR23**, **FR24**, **FR25**, **FR39** ; **AR8**, **AR11**, **AR17**, **AR21**, **AR24** ; séquencing Epics 6/7 vs 8]
- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Pistes A/B, Convergence 1, emplacement artefacts]
- [Source: `contracts/README.md` — lien gouvernance 1.4]
- [Source: `references/paheko/index.md` — index intégration Paheko]

### Tests

- **Pas de tests automatisés obligatoires** pour la partie purement documentaire sauf **décision produit** d’ajouter des checks légers (ex. liens, présence de sections) — à trancher ; sinon reporter à Epic 10 si un lint doc est introduit.

### Project Structure Notes

- Ranger le **pivot** dans `references/artefacts/` avec nom daté ; mettre à jour `references/artefacts/index.md`.
- Éviter de dupliquer la **matrice opération → API** : renvoyer explicitement à **Story 1.6** pour le détail API réel / gaps.

## References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.5 (contrat minimal sync / réconciliation ; ~l.588–609)]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Pistes A/B, Convergence 1, emplacement artefacts]
- [Source : `contracts/openapi/recyclique-api.yaml` — surface HTTP reviewable ; évolutions d’états / erreurs sync **sans** seconde source hors OpenAPI]
- [Source : `contracts/README.md` — gouvernance 1.4, lien CREOS / OpenAPI]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — AR39, enveloppe d’erreur, `correlation_id` / alignement AR21]
- [Source : `references/paheko/index.md` — brownfield, capacités API documentées]
- [Source : `references/migration-paeco/` — index et audits brownfield si besoin de cadrage réaliste]

## Dev Agent Record

### Agent Model Used

Composer (agent Task BMAD / Cursor) — exécution skill `bmad-dev-story`, story documentaire sans tests auto obligatoires (Dev Notes).

### Debug Log References

_(aucun)_

### Completion Notes List

- Artefact pivot `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` : table AC → sections, cycle de vie FR24, outbox/idempotence AR11/AR24, corrélation AR17/AR21 + AR39, réconciliation FR23/FR25 et blocage sélectif, audit minimal, FR39 minimal, § Paheko/hypothèses/gaps → 1.6, HITL §10, pas de données sensibles.
- `references/artefacts/index.md` : entrée 2026-04-02_05.
- `sprint-status.yaml` : clé `1-5-definir-le-contrat-minimal-de-synchronisation-et-reconciliation-avec-paheko` → `done` après CR PASS (Story Runner).

### File List

- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` (nouveau)
- `references/artefacts/index.md` (modifié)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié)
- `_bmad-output/implementation-artifacts/1-5-definir-le-contrat-minimal-de-synchronisation-et-reconciliation-avec-paheko.md` (modifié)
- `peintre-nano/tests/contract/contrat-sync-paheko-1-5-artefact.test.ts` (nouveau — QA story doc)
- `_bmad-output/implementation-artifacts/tests/1-5-contrat-sync-paheko-doc-qa-summary.md` (nouveau)
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (modifié)
- `peintre-nano/tests/contract/README.md` (modifié)

## Change Log

| Date | Auteur | Résumé |
|------|--------|--------|
| 2026-04-02 | Dev Agent (BMAD DS) | Livraison contrat minimal sync/réconciliation (artefact 05), index artefacts, sprint `review`, story `review`. |
| 2026-04-02 | Story Runner (post-CR) | QA Vitest artefact, synthèse QA ; sprint + story `done` ; File List alignée CR. |

