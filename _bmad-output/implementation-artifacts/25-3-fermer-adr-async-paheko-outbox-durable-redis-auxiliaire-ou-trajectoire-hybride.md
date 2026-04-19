# Story 25.3: Fermer l'ADR async `Paheko` (outbox durable, Redis auxiliaire ou trajectoire hybride)

Status: done

## Definition of Done (Epic 25 — documentaire)

- ADR livrée, indexée, avec **`status: proposed`** (YAML frontmatter) et **Statut : Proposé** lisible dans le corps du document.
- **ADR proposée — acceptation humaine requise pour implémentation code** : aucune story ne doit encoder de changement de transport / file / sémantique de livraison `Paheko` tant que l’ADR n’est pas approuvée (cf. AC et section « Stories bloquées » de l’ADR).
- `sprint-status.yaml` : entrée story **25-3** en **`done`** avec commentaire `last_updated` à jour.

## Story

As an integration architect,
I want an approved ADR on the retained asynchronous accounting path,
so that future stories do not encode both "file Redis" and "outbox PostgreSQL" as competing truths.

## Acceptance Criteria

**Given** the PRD canon keeps the durable outbox as the nominal path and the PRD vision names a Redis queue as target wording  
**When** this story is completed  
**Then** the ADR decides the retained canonical mechanism, the allowed role of `Redis`, the migration or wording strategy, and the consequences for observability, idempotence, retries, and operations  
**And** it cites at minimum `_bmad-output/planning-artifacts/prd.md`, `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`  
**And** no future story that changes async `Paheko` transport, queueing, or accounting delivery semantics is marked ready-for-dev before this ADR is closed  
**And** the ADR explicitly reconciles the retained decision with the active canonical chain for outbox durable, idempotence, correlation, quarantine, and lot de session, and states what remains unchanged until the ADR is approved, with explicit traceability back to `AR11`, `AR12`, and the architecture or chain documents already referenced by `prd.md`

## Tasks / Subtasks

- [x] Produire l’ADR « async Paheko » et l’enregistrer dans `/_bmad-output/planning-artifacts/architecture/` (AC: 1–4)
  - [x] Créer le fichier ADR (nom proposé) `2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`
  - [x] Structurer l’ADR avec au minimum : **Contexte**, **Problème**, **Options** (au moins 3 : outbox durable seule / Redis auxiliaire / trajectoire hybride), **Décision**, **Conséquences**, **Plan de migration / wording**, **Impact stories & gating**
  - [x] Dans « Décision », expliciter :
    - [x] le **mécanisme canonique retenu** (source durable, atomicité, reprise)
    - [x] le **rôle permis de `Redis`** (si présent) et ce qui est explicitement interdit (ex. Redis comme source de vérité durable)
    - [x] la stratégie de **migration** (technique) et/ou de **w wording** (PRD vision vs PRD canon) pour éliminer la double vérité
    - [x] les conséquences d’exploitation : observabilité, alerting, retries, runbook minimal, coûts/risques
  - [x] Citer explicitement (au minimum) les sources obligatoires listées dans l’AC, plus les sources d’architecture ci-dessous (AC: 2, 4)

- [x] Réconcilier l’ADR avec la chaîne canonique outbox et les exigences additionnelles AR11/AR12 (AC: 4)
  - [x] Reprendre la « chaîne canonique » existante (référentiel moyens de paiement → journal transactions → snapshot session → builder → outbox) et déclarer explicitement ce qui ne change pas (jusqu’à décision ADR)  
  - [x] Assurer la traçabilité explicite vers :
    - [x] **AR11** : outbox durable PostgreSQL + sync at-least-once + handlers idempotents (source : `_bmad-output/planning-artifacts/epics.md`, section *Additional Requirements*)
    - [x] **AR12** : `Redis` auxiliaire, jamais source de vérité durable (source : `_bmad-output/planning-artifacts/epics.md`, section *Additional Requirements*)
  - [x] Référencer les documents « chaîne / décisions » déjà normatifs dans le dépôt (voir « Références »)

- [x] Mettre à jour l’index architecture et tracer le livrable ADR (AC: 3–4)
  - [x] Ajouter le lien vers le nouvel ADR dans `_bmad-output/planning-artifacts/architecture/index.md` sous la section pertinente (Infrastructure / données)
  - [x] Ajouter dans l’ADR une section « Stories bloquées tant que non approuvé » : toute story touchant transport/queueing/semantique de livraison Paheko

## Dev Notes

- L’objectif est **documentaire** : fermer une décision structurante (Epic 25), pas d’implémenter un changement de transport.
- Le dépôt contient déjà une implémentation outbox relationnelle (preuve brownfield) :
  - `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py` (enqueue avant `commit`, idempotency key)
  - Modèle `PahekoOutboxItem` (table outbox durable) et états associés (retry/quarantaine) décrits dans le PRD canon.
- Le PRD canon traite la tension « outbox durable (canon) » vs « file Redis (vision) » comme **non canonique tant qu’ADR** (voir `_bmad-output/planning-artifacts/prd.md` §5.1).
- Guardrail à respecter dans l’ADR : **PostgreSQL = source de vérité durable**, `Redis` **auxiliaire** uniquement, sauf décision explicitement argumentée et compatible avec AR11/AR12 et la chaîne canonique.

### Project Structure Notes

- ADR à ranger dans `_bmad-output/planning-artifacts/architecture/` et à indexer dans `_bmad-output/planning-artifacts/architecture/index.md`.
- Ne pas créer une seconde source de vérité : l’ADR doit s’aligner avec la hiérarchie documentaire du dépôt (décision directrice → PRD canon → architecture/ADR → epics/stories).

### References

- `_bmad-output/planning-artifacts/prd.md` (notamment §5.1 « outbox vs file Redis » et tableau de gouvernance importée)  
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` (NFR « Asynchronisme Paheko via Redis » + note d’alignement brownfield)  
- `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` (preuves brownfield outbox, analyse options)  
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` (gel exécution hors Epic 25 + priorité ADR)  
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (chaîne canonique + outbox, idempotence, correlation, quarantaine, lot de session)  
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` (PostgreSQL source de vérité, Redis auxiliaire, outbox durable)  
- `_bmad-output/planning-artifacts/epics.md` (AR11/AR12 + story 25.3 AC)

## Trace Epic 25 — ADR

- **ADR** : `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` — **`status: proposed`** / **Statut : Proposé** (à approuver). **ADR proposée — acceptation humaine requise pour implémentation code.**
- **Date** : 2026-04-20
- **Décision (1 ligne)** : outbox **PostgreSQL transactionnelle durable** comme mécanisme canonique (at-least-once + idempotence) ; `Redis` **auxiliaire uniquement** (dispatch/buffering), jamais autorité durable ; trajectoire hybride optionnelle (sans double vérité).
- **Traçabilité** : **AR11** (outbox durable PostgreSQL + at-least-once + handlers idempotents) ; **AR12** (`Redis` auxiliaire, jamais source de vérité durable) — sources : `_bmad-output/planning-artifacts/epics.md` (*Additional Requirements*).
- **Réconciliation chaîne canonique** : `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (référentiel → journal → snapshot session → builder → outbox ; corrélation, quarantaine, lot de session).

## Dev Agent Record

### Agent Model Used

GPT-5.2

### Debug Log References

### Completion Notes List

- ✅ ADR 25.3 présent et indexé (**`status: proposed`**). Story **done** (politique Epic 25 documentaire) : **ADR proposée — acceptation humaine requise pour implémentation code** ; le passage en **approuvé** reste le prérequis gating pour encoder la décision dans le code.

### File List

- `_bmad-output/implementation-artifacts/25-3-fermer-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`
