# Architecture Decision Document

## Pilotage exécution v2 (document transversal)

- **[guide-pilotage-v2.md](../guide-pilotage-v2.md)** — Document maître d’exécution : réconciliation séquence PRD / décision directrice et **Pistes A/B** ; jalons Convergence 1–3 et Epics 1–10 (cases à cocher aux grands jalons) ; **où ranger** audits, schémas BDD, handoffs, rapports de tests ; frictions ; prompt type agent superviseur ; **correct course**. Abstract canonique : [references/index.md](../../../references/index.md) (État et suivi).

## Infrastructure / données (décisions récentes)

- **[cash-accounting-paheko-canonical-chain.md](./cash-accounting-paheko-canonical-chain.md)** — Delta architecture du correct course `2026-04-15` pour la chaine **caisse -> compta -> `Paheko`** : referentiel des moyens de paiement, journal detaille des transactions de paiement, snapshot comptable fige de session, builder d'ecritures `Paheko`, **1 batch outbox idempotent par session** avec **N sous-ecritures deterministes**, separation calcul local / transport / integration, et autorite explicite pour les remboursements sur exercice anterieur clos.
- **[2026-04-18-adr-operations-speciales-caisse-paheko-v1.md](./2026-04-18-adr-operations-speciales-caisse-paheko-v1.md)** — **ADR** : opérations spéciales de caisse (annulation, remboursements types, échange, décaissement, mouvement interne), tags métier, distinction matière/finance/mixte, remboursement sans ticket expert, une seule chaîne Paheko ; **Epic 24**. Prérequis Epics 22–23.
- **[adr-postgresql-17-migration.md](./adr-postgresql-17-migration.md)** — **ADR** : cible **PostgreSQL 17**, stratégies de migration (`pg_dump`/`pg_restore` vs `pg_upgrade`), alignement **compose racine + CI** uniquement ; **`recyclique-1.4.4/` exclu** (legacy). Backend canonique **`recyclique/api/`**. Recherche technique : [technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md](../research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md). Indépendant des epics métier (8, 11, etc.) — chantier plateforme.
- **[operations/runbook-spike-postgresql-15-vers-17.md](../operations/runbook-spike-postgresql-15-vers-17.md)** — **Runbook spike** Epic 10.6c : backup, dump/restore, `pg_upgrade --check`, vérifs, rollback, risques, volumes ; preuve d’exécution ; aligné ADR + recherche. Les changements d’image `postgres:*` et workflows relèvent de **10.6d** ; tests applicatifs PG 17 de **10.6e**.

## Sécurité / identité kiosque (Epic 25)

- **[2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md](./2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md)** — **ADR** : séparation **PIN opérateur** (canon serveur, §11.2, `POST /pin`) et **PIN kiosque** / **secret de poste** (PWA vision) ; modèle **hybride borné** (local offline + souveraineté serveur en ligne) ; lockout **métier** (seuils vision 3/5) vs **rate limit** route ; **step-up** et **revalidation** ; **Epic 25** story **25.2**.

## Hypothèses post-V2 (hors backlog, non sprint)

- **[post-v2-hypothesis-marketplace-modules.md](./post-v2-hypothesis-marketplace-modules.md)** — Marketplace / modules complémentaires (distribution, activation) **séparé** du cœur métier Recyclique ; alignement avec contrats v2 ; pas d’epic tant que non promu. Visible depuis [references/index.md](../../../references/index.md).
- **[post-v2-hypothesis-peintre-autonome-applications-contributrices.md](./post-v2-hypothesis-peintre-autonome-applications-contributrices.md)** — Trajectoire où `Peintre` devient un moteur autonome et `Recyclique` une application contributrice ; recommandation explicite : ne pas forcer cette séparation complète dès la v2, mais préserver les frontières qui la rendent possible.

## Table of Contents

- [Architecture Decision Document](#table-of-contents)
  - [ADR — PostgreSQL 17 (migration)](./adr-postgresql-17-migration.md)
  - [ADR — PIN kiosque vs PIN opérateur / secret de poste (Epic 25)](./2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md)
  - [ADR — Opérations spéciales caisse / Paheko (Epic 24)](./2026-04-18-adr-operations-speciales-caisse-paheko-v1.md)
  - [Delta architecture — chaine comptable canonique caisse -> `Paheko`](./cash-accounting-paheko-canonical-chain.md)
  - [Project Context Analysis](./project-context-analysis.md)
    - [Requirements Overview](./project-context-analysis.md#requirements-overview)
    - [Technical Constraints & Dependencies](./project-context-analysis.md#technical-constraints-dependencies)
    - [Cross-Cutting Concerns Identified](./project-context-analysis.md#cross-cutting-concerns-identified)
  - [Starter Template Evaluation](./starter-template-evaluation.md)
    - [Primary Technology Domain](./starter-template-evaluation.md#primary-technology-domain)
    - [Starter Options Considered](./starter-template-evaluation.md#starter-options-considered)
    - [Comparative Analysis Matrix](./starter-template-evaluation.md#comparative-analysis-matrix)
    - [Selected Starter: Brownfield baseline + targeted frontend scaffold for ](./starter-template-evaluation.md#selected-starter-brownfield-baseline-targeted-frontend-scaffold-for)
    - [Decision Refinement](./starter-template-evaluation.md#decision-refinement)
    - [Transition Runtime and Coexistence](./starter-template-evaluation.md#transition-runtime-and-coexistence)
    - [Note](./starter-template-evaluation.md#note)
    - [Handoff to Step 4](./starter-template-evaluation.md#handoff-to-step-4)
  - [Core Architectural Decisions](./core-architectural-decisions.md)
    - [Decision Priority Analysis](./core-architectural-decisions.md#decision-priority-analysis)
    - [Data Architecture](./core-architectural-decisions.md#data-architecture)
    - [Authentication & Security](./core-architectural-decisions.md#authentication-security)
    - [API & Communication Patterns](./core-architectural-decisions.md#api-communication-patterns)
    - [Frontend Architecture](./core-architectural-decisions.md#frontend-architecture)
    - [Infrastructure & Deployment](./core-architectural-decisions.md#infrastructure-deployment)
    - [Decision Impact Analysis](./core-architectural-decisions.md#decision-impact-analysis)
    - [Handoff to Step 5](./core-architectural-decisions.md#handoff-to-step-5)
  - [Implementation Patterns & Consistency Rules](./implementation-patterns-consistency-rules.md)
    - [Pattern Categories Defined](./implementation-patterns-consistency-rules.md#pattern-categories-defined)
    - [Naming Patterns](./implementation-patterns-consistency-rules.md#naming-patterns)
    - [Structure Patterns](./implementation-patterns-consistency-rules.md#structure-patterns)
    - [Format Patterns](./implementation-patterns-consistency-rules.md#format-patterns)
    - [Communication Patterns](./implementation-patterns-consistency-rules.md#communication-patterns)
    - [Process Patterns](./implementation-patterns-consistency-rules.md#process-patterns)
    - [Enforcement Guidelines](./implementation-patterns-consistency-rules.md#enforcement-guidelines)
    - [Pattern Examples](./implementation-patterns-consistency-rules.md#pattern-examples)
    - [Jalons de durcissement (a declencher manuellement)](./implementation-patterns-consistency-rules.md#jalons-de-durcissement-a-declencher-manuellement)
    - [Step 6 Status](./implementation-patterns-consistency-rules.md#step-6-status)
  - [Project Structure & Boundaries](./project-structure-boundaries.md)
    - [Structural Decision Update](./project-structure-boundaries.md#structural-decision-update)
    - [Complete Project Directory Structure](./project-structure-boundaries.md#complete-project-directory-structure)
    - [Architectural Boundaries](./project-structure-boundaries.md#architectural-boundaries)
    - [Requirements to Structure Mapping](./project-structure-boundaries.md#requirements-to-structure-mapping)
    - [Integration Points](./project-structure-boundaries.md#integration-points)
    - [File Organization Patterns](./project-structure-boundaries.md#file-organization-patterns)
    - [Development Workflow Integration](./project-structure-boundaries.md#development-workflow-integration)
    - [Handoff to Epics and Stories](./project-structure-boundaries.md#handoff-to-epics-and-stories)
  - [Navigation & Structure Contract](./navigation-structure-contract.md)
    - [Purpose](./navigation-structure-contract.md#purpose)
    - [JARVOS / CREOS Principles](./navigation-structure-contract.md#jarvos-creos-principles)
    - [Truth Hierarchy](./navigation-structure-contract.md#truth-hierarchy)
    - [Minimal Artifacts](./navigation-structure-contract.md#minimal-artifacts)
    - [Minimal Field Set](./navigation-structure-contract.md#minimal-field-set)
    - [Runtime Interpretation Rules](./navigation-structure-contract.md#runtime-interpretation-rules)
    - [Validation Rules](./navigation-structure-contract.md#validation-rules)
    - [Bandeau Live Minimal Slice](./navigation-structure-contract.md#bandeau-live-minimal-slice)
    - [Implementation Notes](./navigation-structure-contract.md#implementation-notes)
  - [Architecture Validation Results](./architecture-validation-results.md)
    - [Coherence Validation](./architecture-validation-results.md#coherence-validation)
    - [Requirements Coverage Validation](./architecture-validation-results.md#requirements-coverage-validation)
    - [Implementation Readiness Validation](./architecture-validation-results.md#implementation-readiness-validation)
    - [Gap Analysis Results](./architecture-validation-results.md#gap-analysis-results)
    - [Validation Issues Addressed](./architecture-validation-results.md#validation-issues-addressed)
    - [Architecture Completeness Checklist](./architecture-validation-results.md#architecture-completeness-checklist)
    - [Architecture Readiness Assessment](./architecture-validation-results.md#architecture-readiness-assessment)
    - [Implementation Handoff](./architecture-validation-results.md#implementation-handoff)
  - [Architecture Workflow Completion](./architecture-workflow-completion.md)
