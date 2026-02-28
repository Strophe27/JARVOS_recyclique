# Story 12.5: Resilience IAM et mode degrade

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'admin technique,
je veux un comportement defini en cas de panne IdP ou Paheko,
afin d'eviter les pannes en cascade et les contournements dangereux.

## Acceptance Criteria

1. **Etant donne** une indisponibilite IdP (OIDC/JWKS/session) ou une incoherence IAM (`role`/`tenant`/claims), **quand** une route sensible est appelee, **alors** le systeme applique un comportement fail-closed deterministe (refus explicite + pas de bypass).
2. **Et** en cas d'indisponibilite Paheko, les parcours non critiques restent operationnels selon une politique mode degrade documentee, tandis que les operations sensibles Paheko restent bloquees et tracees.
3. **Et** les transitions d'etat (normal -> degrade -> reprise) sont detectees et exposees via des signaux exploitables (health checks, etat IAM/dependances, compteurs d'erreurs) sans fuite de secrets.
4. **Et** des runbooks operationnels de diagnostic et reprise couvrent au minimum: panne IdP, panne Paheko, desynchronisation IAM, et verification post-retablissement.
5. **Et** les evenements d'incident et decisions de securite sont journalises dans l'audit avec `request_id`, dependance en cause, decision appliquee (`allow`/`deny`/`degraded`), raison et horodatage ISO 8601.

## Tasks / Subtasks

- [x] Task 1 - Formaliser la politique mode degrade IAM/Paheko (AC: 1, 2)
  - [x] Transformer les cas fail-closed de la matrice 12.1 en regles executables (claims invalides, role/tenant incoherent, exception IAM indisponible).
  - [x] Definir explicitement ce qui reste autorise en mode degrade et ce qui est bloque (deny-by-default sur surface Paheko sensible).
  - [x] Aligner les regles avec les garde-fous 12.4 pour eviter toute divergence de policy.
- [x] Task 2 - Implementer l'enforcement backend resilient (AC: 1, 2, 5)
  - [x] Etendre les points de controle IAM existants (`deps`/services auth) au lieu de creer un nouveau pipeline parallele.
  - [x] Introduire des verifications de disponibilite dependances (IdP/JWKS/Paheko) appliquees avant action sensible.
  - [x] Garantir des reponses deterministes en mode degrade (codes HTTP, message explicite, audit associe).
  - [x] Normaliser le contrat fail-closed: `401` (session/identite invalide), `403` (role/tenant/claims refuses), `503` (dependance critique indisponible), sans details sensibles.
- [x] Task 3 - Exposer l'observabilite mode degrade (AC: 3, 5)
  - [x] Ajouter des indicateurs techniques (etat IdP, etat Paheko, compteur fail-closed, dernier incident) dans les points de sante/monitoring existants.
  - [x] Propager `request_id` dans les logs structures lies aux refus et transitions de mode.
  - [x] Verifier qu'aucun secret/token n'est present dans les logs et evenements d'incident.
  - [x] Definir au minimum une alerte exploitable par dependance critique (IdP/Paheko) avec seuil de declenchement documente (erreurs consecutives ou indisponibilite continue).
- [x] Task 4 - Produire les runbooks d'exploitation (AC: 4)
  - [x] Rediger le runbook "Panne IdP" (symptomes, diagnostic, mitigation, reprise, verification).
  - [x] Rediger le runbook "Panne Paheko" avec politique de degradation acceptable et limites de securite.
  - [x] Rediger le runbook "Desynchronisation IAM" avec procedure de retour a coherence et checklist de cloture incident.
- [x] Task 5 - Couvrir les tests de resilience et non-regression (AC: 1, 2, 3, 5)
  - [x] Ajouter tests backend des scenarios fail-closed (claims invalides, dependance indisponible, incoherence role/tenant).
  - [x] Ajouter tests de transitions d'etat degrade/reprise et de journalisation d'audit associee.
  - [x] Verifier la non-regression avec 12.2/12.4 (session BFF securisee, deny-by-default benevole Paheko, exceptions explicites).
  - [x] Ajouter tests de contrat HTTP en mode degrade (`401`/`403`/`503`) et tests "no secret leakage" dans logs/erreurs.

## Dev Notes

- Prerequis fonctionnels: stories 12.1 (contrat IAM), 12.2 (BFF OIDC), 12.3 (sync membres) et 12.4 (garde-fous role) livrees et considerees source de verite.
- Scope 12.5: resilience operationnelle et securite en mode degrade. Hors scope: ajout de RBAC avance/plugin Paheko (12.6).
- Regle securite non negociable: toute ambiguite IAM ou indisponibilite de composant critique sur route sensible doit etre traitee en fail-closed.
- Anti-duplication: reutiliser les composants existants (`api/core/deps.py`, `api/services/auth.py`, `api/services/paheko_access.py`, routes admin/health) sans creer de mecanisme auth secondaire.
- Continuite metier: autoriser uniquement les parcours non critiques explicitement documentes; toute operation Paheko sensible reste bloquee tant que l'etat n'est pas nominal.
- Tracabilite: utiliser les evenements d'audit de la matrice 12.1 (`FAIL_CLOSED_TRIGGERED`, `PAHEKO_ACCESS_DENIED`, `OIDC_CLAIMS_VALIDATION_FAILED`, etc.) avec `request_id`.
- Contrat de reponse attendu sur route sensible: `401` si session/identite invalide, `403` si decision IAM explicite de refus, `503` si dependance critique indisponible. Les messages restent explicites mais non verbeux (aucun detail interne).
- Conformite architecture: REST JSON, snake_case cote backend/API, erreurs structurees, logs structures sans secrets.
- Standards de tests: backend sous `pytest`; frontend (si impact UI) sous `Vitest + React Testing Library + jsdom` avec tests co-loces `*.test.tsx`.

### Project Structure Notes

- Backend IAM/Access: privilegier les extensions dans `api/core/deps.py`, `api/services/auth.py`, `api/services/paheko_access.py`, `api/routers/v1/auth.py`, `api/routers/v1/admin/`.
- Observabilite: reutiliser les points de sante et logs existants avant toute nouvelle surface (`/health`, audit `audit_events`).
- Documentation operationnelle: conserver les runbooks dans les artefacts d'implementation Epic 12 pour rester dans le meme flux de decision.
- Frontend (si ajustement): limiter au message d'etat degrade dans les ecrans admin/auth existants; aucune nouvelle librairie UI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-12-identite-cross-plateforme-sso-gouvernance-paheko]
- [Source: _bmad-output/planning-artifacts/epics.md#story-12-5-resilience-iam-et-mode-degrade]
- [Source: _bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md]
- [Source: _bmad-output/implementation-artifacts/12-1-iam-decision-log.md]
- [Source: _bmad-output/implementation-artifacts/12-2-integration-idp-bff-pour-login-unifie-recyclique.md]
- [Source: _bmad-output/implementation-artifacts/12-3-synchronisation-membres-depuis-api-paheko-phase-1.md]
- [Source: _bmad-output/implementation-artifacts/12-4-controle-d-acces-paheko-par-role-garde-fous-operationnels.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#authentication--security]
- [Source: _bmad-output/planning-artifacts/architecture.md#logging]
- [Source: _bmad-output/planning-artifacts/architecture.md#monitoring-technique-et-audit-log-journal-des-actions]
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

- 2026-02-28 - Story creee via create-story BMAD avec contexte IAM cross-plateforme et guardrails resilience.
- 2026-02-28 - Checklist create-story appliquee (AC clarifies + tasks + constraints architecture + references).
- 2026-02-28 - Validation create-story renforcee: contrat fail-closed HTTP (`401`/`403`/`503`), exigences d'alerting minimal et couverture de tests explicitee.
- 2026-02-28 - Service de resilience runtime ajoute (`api/services/resilience.py`) avec etats dependances IdP/Paheko, transitions de mode (`ok`/`degraded`) et compteurs fail-closed.
- 2026-02-28 - Enforcement fail-closed et mode degrade etendu dans `api/core/deps.py` et `api/routers/v1/auth.py` (contrat deterministic `401`/`403`/`503` + audit `request_id`, dependance, decision, raison, timestamp ISO 8601).
- 2026-02-28 - Observabilite enrichie sur `/health` et `/v1/admin/health` (etat IAM/dependances, dernier incident, seuil alerte, compteurs).
- 2026-02-28 - Runbooks operationnels produits dans `_bmad-output/implementation-artifacts/12-5-runbooks-resilience-iam-mode-degrade.md`.
- 2026-02-28 - Tests resilience ajoutes et valides: 
  - `python -m pytest api/tests/routers/test_admin_paheko_compta.py::TestPahekoComptaUrl::test_paheko_sensitive_route_returns_503_when_paheko_degraded`
  - `python -m pytest api/tests/routers/test_admin_health_audit.py::TestAdminHealth::test_admin_health_exposes_dependency_alerts`
  - `python -m pytest api/tests/routers/test_auth.py::test_sso_callback_returns_503_when_idp_dependency_unavailable`
- 2026-02-28 - Corrections post-review `changes-requested` appliquees:
  - route sensible `/v1/admin/paheko/members/sync` alignee sur un `503` deterministe en incident Paheko + audit resilience associe.
  - audit resilience complete sur refus `401` non authentifie dans `get_current_user` avec `request_id`, dependance, decision, raison et status.
  - couverture de tests etendue sur transition `degraded -> ok` (compteur `mode_transition_total`) et sur refus `401` audite.
  - file list story synchronisee avec les fichiers applicatifs modifies.

### File List

- _bmad-output/implementation-artifacts/12-5-resilience-iam-et-mode-degrade.md
- _bmad-output/implementation-artifacts/12-5-runbooks-resilience-iam-mode-degrade.md
- api/config/settings.py
- api/core/deps.py
- api/main.py
- api/models/__init__.py
- api/routers/admin/health.py
- api/routers/v1/admin/health.py
- api/routers/v1/admin/__init__.py
- api/routers/v1/admin/member_sync.py
- api/routers/v1/admin/paheko_compta.py
- api/routers/v1/auth.py
- api/schemas/auth.py
- api/services/auth.py
- api/services/member_sync.py
- api/services/resilience.py
- api/tests/routers/test_admin_health_audit.py
- api/tests/routers/test_admin_member_sync.py
- api/tests/routers/test_admin_paheko_compta.py
- api/tests/routers/test_auth.py

## Senior Developer Review (AI)

Date: 2026-02-28
Reviewer: bmad-qa
Outcome: Changes Requested

### Findings

1. [HIGH] Contrat HTTP fail-closed non respecte sur une route sensible Paheko.
   - Evidence: `api/routers/v1/admin/member_sync.py` retourne toujours HTTP 200 avec `status="error"` quand la dependance Paheko echoue (`MemberSyncService.run_sync` capture `PahekoClientError` et renvoie un resultat d'erreur sans lever `HTTPException`).
   - Impact: premier incident runtime sur `/v1/admin/paheko/members/sync` peut passer en "erreur fonctionnelle" au lieu d'un `503` deterministe, en contradiction avec l'AC1/AC2 et la Task 2.4.

2. [HIGH] Audit fail-closed incomplet pour certains refus IAM sur route sensible.
   - Evidence: dans `api/core/deps.py`, un Bearer invalide (ou absent) finit en `401 Not authenticated` sans ecriture d'audit resiliente (`write_resilience_audit_event`) ni decision explicite `deny/degraded`.
   - Impact: l'AC5 exige la tracabilite des decisions de securite avec `request_id`, dependance, decision et raison; ce chemin de refus n'est pas couvert.

3. [MEDIUM] Couverture de tests insuffisante pour les transitions degrade -> reprise.
   - Evidence: tests presents pour etat degrade (`api/tests/routers/test_admin_health_audit.py`, `api/tests/routers/test_auth.py`, `api/tests/routers/test_admin_paheko_compta.py`) mais pas de test explicite du retour a `ok` ni validation de `mode_transition_total`.
   - Impact: risque de regression sur l'AC3 (transitions normal -> degrade -> reprise exposees et exploitables).

4. [MEDIUM] File List story incomplete par rapport aux changements git applicatifs.
   - Evidence: fichiers modifies mais absents de la File List, notamment `api/routers/v1/admin/paheko_compta.py`, `api/config/settings.py`, `api/main.py`, `api/models/__init__.py`, `api/schemas/auth.py`, `api/routers/v1/admin/__init__.py`.
   - Impact: perte de tracabilite de revue et ecart process BMAD (documentation des changements incomplet).

### AC Validation Snapshot

- AC1: PARTIAL (fail-closed present, mais contrat pas uniforme sur tous les chemins sensibles).
- AC2: PARTIAL (blocage degrade present sur surface Paheko, mais sync peut renvoyer 200 en erreur).
- AC3: PARTIAL (signaux exposes dans health, transitions de reprise non prouvees par tests).
- AC4: IMPLEMENTED (runbooks presents et couvrent les cas minimum requis).
- AC5: PARTIAL (audit enrichi present sur plusieurs chemins, mais lacunes sur certains refus `401`).

## Change Log

- 2026-02-28: Creation de la story 12.5 et passage en `ready-for-dev`.
- 2026-02-28: Validation checklist create-story et corrections de precision (contrat de reponse degrade, alerting, tests).
- 2026-02-28: Implementation resilience IAM/Paheko livree (mode degrade, enforcement fail-closed, observabilite health, audit enrichi, runbooks, tests cibles) et statut passe a `review`.
- 2026-02-28: Code review adversarial BMAD (bmad-qa) termine -> `changes-requested`, statut repasse a `in-progress`.
- 2026-02-28: Corrections `changes-requested` implementees (503 deterministe route sync Paheko, audit 401 non-authentifie, tests transition degrade->ok, file list complete) et statut passe a `review`.
- 2026-02-28: Code review adversarial BMAD 2e passe (bmad-qa) validee -> `approved`, statut passe a `done`.

### Review 2e passe (AI)

Date: 2026-02-28
Reviewer: bmad-qa
Outcome: Approved

### Findings

1. [INFO] Les 4 points `changes-requested` de la passe precedente sont corriges:
   - route sensible `/v1/admin/paheko/members/sync` retourne bien `503` en incident dependance.
   - refus `401` non authentifie audite avec `request_id`, `dependency`, `decision`, `reason`, `status_code`.
   - test de transition `degraded -> ok` et compteur `mode_transition_total` present.
   - File List story alignee avec les principaux fichiers applicatifs de la correction.

### AC Validation Snapshot (2e passe)

- AC1: IMPLEMENTED
- AC2: IMPLEMENTED
- AC3: IMPLEMENTED
- AC4: IMPLEMENTED
- AC5: IMPLEMENTED
