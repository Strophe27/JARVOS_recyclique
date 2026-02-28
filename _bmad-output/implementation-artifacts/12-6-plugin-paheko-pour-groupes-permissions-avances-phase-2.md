# Story 12.6: Plugin Paheko pour groupes/permissions avances (phase 2)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'equipe produit,
je veux un plugin Paheko exposant les capacites manquantes de groupes/permissions,
afin de finaliser la gouvernance RBAC cross-plateforme sans divergence.

## Acceptance Criteria

1. **Etant donne** les limites de l'API Paheko standard sur les groupes/permissions, **quand** le plugin Paheko IAM phase 2 est installe et configure, **alors** RecyClique dispose d'interfaces stables pour lire et piloter groupes, permissions et affectations utilisateur-groupe selon le contrat IAM Epic 12.
2. **Et** les operations sensibles de gouvernance (grant/revoke, mutation groupe/permission, exceptions) sont appliquees avec garde-fous explicites: validation role/tenant, controle d'exception, comportement fail-closed en cas d'incoherence IAM ou indisponibilite dependance.
3. **Et** le plugin respecte des contrats techniques versionnes et idempotents (codes erreur explicites, reponse JSON stable, operation replay-safe) pour eviter doublons et effets de bord lors des retries.
4. **Et** la coherence des droits RecyClique <-> Paheko est verifiee par des tests de non-regression (backend) couvrant cas nominaux, refus, exceptions, et cas de derive de synchronisation.
5. **Et** toute decision IAM critique est auditee avec `request_id`, acteur, sujet, role, tenant, decision (`allow`/`deny`), motif, horodatage ISO 8601, sans secret/token expose.

## Tasks / Subtasks

- [x] Task 1 - Definir le contrat plugin IAM Paheko (AC: 1, 3)
  - [x] Formaliser les endpoints plugin necessaires (groupes, permissions, assignations, exceptions) avec payloads JSON snake_case et version de contrat.
  - [x] Definir les regles d'idempotence (cle de correlation, replay, retries) et les codes d'erreur attendus.
  - [x] Verifier l'alignement du contrat avec la matrice IAM 12.1 et le decision log 12.1 (pas de logique hors gouvernance validee).
- [x] Task 2 - Implementer le plugin Paheko phase 2 (AC: 1, 2, 3, 5)
  - [x] Ajouter les routes plugin pour operations RBAC avancees manquantes, avec validation stricte des entrees.
  - [x] Appliquer les garde-fous fail-closed (claims/tenant/role/exception) sur toute operation sensible.
  - [x] Journaliser les decisions IAM dans un format compatible audit cross-plateforme.
- [x] Task 3 - Integrer RecyClique au plugin sans duplication de pipeline IAM (AC: 1, 2, 3)
  - [x] Etendre les services d'integration existants (client Paheko, services IAM/auth) au lieu de creer un second mecanisme parallele.
  - [x] Brancher les operations groupes/permissions sur le plugin avec fallback securise (deny/fail-closed) en cas d'indisponibilite.
  - [x] Garantir la compatibilite avec 12.2/12.3/12.4/12.5 (session BFF, sync membres, exceptions, resilience).
- [x] Task 4 - Couvrir la verification de coherence des droits (AC: 4, 5)
  - [x] Ajouter des tests backend de non-regression pour `allow`/`deny`, exceptions explicites et derives role-groupe-tenant.
  - [x] Ajouter des tests de contrat plugin (schemas, codes HTTP, erreurs metier) et de comportement idempotent.
  - [x] Ajouter des tests de trace d'audit (presence de `request_id`, decision, reason, actor, subject, tenant).
- [x] Task 5 - Documenter exploitation et limites phase 2 (AC: 1, 2, 5)
  - [x] Documenter la configuration plugin (env vars/secrets), les prerequis et le mode degrade.
  - [x] Documenter les limites assumees (scope phase 2) et les points reportes apres epic 12.
  - [x] Lister les evenements d'audit obligatoires et la procedure de diagnostic en cas de divergence IAM.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Fermer l'escalade de privilege sur surface Paheko IAM en imposant l'intersection stricte permissions requises + garde-fous Paheko.
- [x] [AI-Review][HIGH] Stabiliser le contrat de revoke d'exception avec identifiant explicite `exception_id`.
- [x] [AI-Review][HIGH] Harmoniser l'enveloppe d'erreur 503 contractuelle (`detail.error.code/message`).
- [x] [AI-Review][MEDIUM] Etendre les tests AC4 pour endpoints d'exceptions (grant/revoke) et derive de synchronisation des droits.
- [x] [AI-Review][MEDIUM] Rendre la section File List coherente avec les fichiers effectivement modifies par la story.

## Dev Notes

- Prerequis de story: 12.1, 12.2, 12.3, 12.4 et 12.5 sont livres et servent de socle contractuel.
- Scope 12.6: combler le gap groupes/permissions avances non couvert par l'API Paheko standard, via plugin dedie.
- Regle de gouvernance: Paheko reste source de verite membres et cycle d'adhesion; RecyClique ne duplique pas la gouvernance metier.
- Regle securite non negociable: deny-by-default benevole vers surface Paheko sensible, exceptions explicites seulement, et fail-closed sur ambiguite.
- Anti-duplication obligatoire: reutiliser les composants IAM existants (BFF/session, client Paheko, policies/deps) sans creer de pipeline auth/RBAC concurrent.
- Contrats techniques: API REST JSON, champs snake_case, erreurs structurees, horodatage ISO 8601, aucune fuite de secret/token.
- Observabilite: toute operation IAM critique doit etre corrigeable via traces audit + request correlation.
- Hors scope explicite: refonte SSO complete, redesign UI, modification des roles de base hors matrice 12.1.

### Previous Story Intelligence (12.4 / 12.5)

- Reutiliser les garde-fous deja livres dans `api/core/deps.py` et `api/services/paheko_access.py` pour eviter une seconde logique de decision IAM.
- Aligner toutes les operations plugin sensibles sur le contrat fail-closed deja stabilise en 12.5 (`401` identite/session invalide, `403` decision IAM deny, `503` dependance critique indisponible).
- Reemployer les mecanismes d'observabilite existants (`request_id`, audit IAM, etat de dependances) au lieu d'introduire un nouveau format de logs.
- Preserver la compatibilite avec les exceptions operationnelles 12.4 (deny-by-default + exception explicite/tracee/expirable), y compris pendant les retries idempotents.
- Le plugin 12.6 etend la surface IAM avancee; il ne remplace ni le flux SSO/BFF (12.2) ni la politique resilience (12.5).

### Project Structure Notes

- Backend RecyClique: privilegier `api/services/`, `api/core/deps.py`, `api/routers/v1/admin/` et integration Paheko existante.
- Points d'extension recommandes cote RecyClique: `api/services/paheko_access.py`, `api/services/member_sync.py`, `api/routers/v1/admin/paheko_compta.py` (et routes admin IAM associees) pour brancher les nouveaux contrats plugin sans casser les flux en place.
- Plugin Paheko: ajouter la surface manquante cote plugin en respectant le contrat versionne expose a RecyClique.
- Tests backend: `pytest` dans `api/tests/` (coherence IAM, idempotence, audit, fail-closed).
- Frontend: pas d'ajout de bibliotheque UI; seulement adaptation minimale si un ecran admin doit consommer un nouveau signal IAM.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-12-identite-cross-plateforme-sso-gouvernance-paheko]
- [Source: _bmad-output/planning-artifacts/epics.md#story-12-6-plugin-paheko-pour-groupes-permissions-avances-phase-2]
- [Source: _bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.md]
- [Source: _bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md]
- [Source: _bmad-output/implementation-artifacts/12-1-iam-decision-log.md]
- [Source: _bmad-output/implementation-artifacts/12-2-integration-idp-bff-pour-login-unifie-recyclique.md]
- [Source: _bmad-output/implementation-artifacts/12-3-synchronisation-membres-depuis-api-paheko-phase-1.md]
- [Source: _bmad-output/implementation-artifacts/12-4-controle-d-acces-paheko-par-role-garde-fous-operationnels.md]
- [Source: _bmad-output/implementation-artifacts/12-5-resilience-iam-et-mode-degrade.md]
- [Source: _bmad-output/implementation-artifacts/12-5-runbooks-resilience-iam-mode-degrade.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#authentication--security]
- [Source: _bmad-output/planning-artifacts/architecture.md#api--communication-patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-readiness-validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#gap-analysis-results]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-handoff]
- [Source: references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md]

## Dev Agent Record

### Agent Model Used

GPT-5.3 Codex (bmad-dev)

### Debug Log References

- Workflow applique: `_bmad/bmm/workflows/4-implementation/dev-story/`

### Completion Notes List

- 2026-02-28 - Story creee via create-story BMAD pour epic 12 phase 2 plugin IAM Paheko.
- 2026-02-28 - Checklist create-story appliquee (AC, taches, guardrails architecture, references prerequises).
- 2026-02-28 - Story preparee pour implementation avec statut `ready-for-dev`.
- 2026-02-28 - Validation create-story reappliquee: ajout de l'intelligence 12.4/12.5 (reuse services IAM existants, contrat fail-closed explicite, points d'integration cibles) et references completees.
- 2026-02-28 - Surface `v1/admin/paheko/iam` ajoutee avec contrat versionne (`2026-02-28`) pour groupes, permissions, assignations utilisateur-groupe et exceptions.
- 2026-02-28 - Service d'integration `PahekoIamPluginService` ajoute avec transport HTTP vers plugin, enveloppe d'erreurs explicites et idempotence via `Idempotency-Key` (fallback `request_id`).
- 2026-02-28 - Garde-fous fail-closed appliques sur operations sensibles: validation tenant scope (role/scope), controle d'exception pour benevole, et retour `503` deterministic en indisponibilite dependance plugin.
- 2026-02-28 - Audit IAM critique enrichi (`PAHEKO_IAM_PLUGIN_DECISION`) avec `request_id`, actor, subject, role, tenant, decision, reason, operation, status et timestamp ISO 8601.
- 2026-02-28 - Tests backend ajoutes pour contrat, refus tenant, idempotence, erreur metier structuree et scenario fail-closed avec verification d'audit.
- 2026-02-28 - Validation locale executee:
  - `python -m pytest api/tests/routers/test_admin_paheko_iam.py`
  - `python -m pytest api/tests/routers/test_admin_paheko_compta.py api/tests/routers/test_admin_member_sync.py`
- 2026-02-28 - Correctifs post-review appliques:
  - surface Paheko IAM verrouillee par double garde-fou (policy Paheko + intersection stricte permissions requises);
  - contrat `/exceptions/revoke` bascule sur `exception_id` explicite pour stabilite replay-safe;
  - erreur `503` harmonisee avec enveloppe JSON contractuelle stable (`detail.error.code/message`);
  - couverture AC4 etendue (exceptions grant/revoke + derive de sync des droits).
- 2026-02-28 - Validation locale post-correctifs:
  - `python -m pytest api/tests/routers/test_admin_paheko_iam.py api/tests/routers/test_admin_paheko_compta.py api/tests/routers/test_admin_member_sync.py`

### File List

- _bmad-output/implementation-artifacts/12-6-plugin-paheko-pour-groupes-permissions-avances-phase-2.md
- api/core/deps.py
- api/routers/v1/admin/paheko_iam.py
- api/schemas/paheko_iam.py
- api/services/paheko_iam_plugin.py
- api/tests/routers/test_admin_paheko_compta.py
- api/tests/routers/test_admin_paheko_iam.py
- api/tests/routers/test_admin_member_sync.py

## Change Log

- 2026-02-28: Passage en implementation `dev-story` et statut `review`.
- 2026-02-28: Contrat plugin IAM phase 2 expose via `/v1/admin/paheko/iam/contract` + routes RBAC avancees.
- 2026-02-28: Integration plugin avec fallback fail-closed (`503`) et audit IAM structure cross-plateforme.
- 2026-02-28: Suite de tests backend ajoutee pour coherence, idempotence, erreurs metier et tracabilite audit.
- 2026-02-28: Code review adversarial BMAD -> `changes-requested`, statut repasse a `in-progress`.
- 2026-02-28: Correctifs `changes-requested` livres (escalade privilege fermee, revoke `exception_id` explicite, enveloppe 503 stable, tests AC4 etendus, File List alignee) et statut repasse a `review`.
- 2026-02-28: Code review adversarial BMAD (2e passe) approuvee, statut passe a `done`.

## Senior Developer Review (AI)

Date: 2026-02-28
Reviewer: Strophe (bmad-qa)
Outcome: changes-requested

### Findings

#### HIGH

1. **Escalade de privilege possible sur operations sensibles IAM**  
   La dependance `_Sensitive = Depends(require_permissions("admin", "super_admin"))` est appliquee sur une surface contenant "paheko". Dans `require_permissions`, ce cas retourne apres la policy Paheko dediee, sans revalider l'intersection avec les permissions demandees. Un benevole avec exception active peut donc atteindre des routes sensibles (grant/revoke groupes/permissions/exceptions), ce qui viole AC2 (validation role + garde-fous explicites).  
   References: `api/core/deps.py`, `api/routers/v1/admin/paheko_iam.py`.

2. **Contrat revoke exception non stable et insuffisamment adresse**  
   La route `/exceptions/revoke` reutilise `PahekoIamExceptionRequest` (avec `user_id`, `scope`, `expires_at`) au lieu d'un identifiant explicite de l'exception a revoquer. Cela rend la revocation ambigue et fragilise l'idempotence/replay-safe demandee par AC3.  
   References: `api/routers/v1/admin/paheko_iam.py`, `api/schemas/paheko_iam.py`.

3. **Erreur 503 non conforme au contrat d'erreurs explicites**  
   Le contrat expose `paheko_iam_dependency_unavailable`, mais en indisponibilite dependance la reponse est une string (`detail="Service temporairement indisponible"`) sans enveloppe code/message stable. AC3 exige des codes explicites et une reponse JSON stable.  
   References: `api/routers/v1/admin/paheko_iam.py`.

#### MEDIUM

4. **Couverture de tests insuffisante sur AC4**  
   Les tests ne couvrent pas les endpoints d'exception (`/exceptions/grant`, `/exceptions/revoke`), ni les scenarios de derive de synchronisation/coherence droits RecyClique <-> Paheko explicitement demandes par AC4.  
   References: `api/tests/routers/test_admin_paheko_iam.py`.

5. **Discrepance Story File List vs etat git reel**  
   L'arbre git contient de nombreuses modifications applicatives IAM/Paheko non refletees dans la File List de la story 12.6, ce qui complique la tracabilite review et l'isolation des changements.  
   References: `git status --porcelain` vs section `### File List`.

### Checklist Review Notes

- Story chargee et reviewable: OK (`Status` initial `review`).
- AC et taches croisees avec implementation: PARTIAL (issues HIGH ouvertes).
- Architecture/standards charges: OK (`architecture.md` + checklist v0.1).
- MCP doc search: non appliquee (pas de serveur doc technique dedie configure pour cette review).

---

Date: 2026-02-28 (2e passe)
Reviewer: Strophe (bmad-qa)
Outcome: approved

### Findings

- Aucun nouvel ecart HIGH/MEDIUM detecte sur la portee story 12.6 apres verification adversariale des AC et des taches marquees `[x]`.

### Verification

- Validation git/story: File List 12.6 coherente avec la portee fonctionnelle et les correctifs annonces.
- Validation tests ciblee executee et passante:
  - `python -m pytest api/tests/routers/test_admin_paheko_iam.py api/tests/routers/test_admin_paheko_compta.py api/tests/routers/test_admin_member_sync.py` -> 25 passed.
