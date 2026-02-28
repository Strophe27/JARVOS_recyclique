# Story 12.4: Controle d'acces Paheko par role (garde-fous operationnels)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'organisation,
je veux restreindre l'acces Paheko aux seuls roles autorises,
afin de reserver Paheko aux usages experts/secours.

## Acceptance Criteria

1. **Etant donne** un utilisateur connecte via SSO/BFF (story 12.2), **quand** son role IAM est evalue pour un acces Paheko, **alors** seuls `super_admin` et `admin` peuvent acceder a la surface Paheko selon la matrice IAM 12.1.
2. **Et** le role `benevole` est refuse par defaut pour tout acces Paheko (deny-by-default), avec ouverture uniquement via exception explicite autorisee et auditee.
3. **Et** les exceptions d'acces Paheko appliquent des garde-fous operationnels minimaux: demandeur, valideur, motif, duree/expiration, revocation, et preuve d'audit.
4. **Et** les garde-fous sont appliques de facon coherente sur les points d'entree frontend **et** backend (route guard UI + endpoint/proxy API), sans contournement possible en appel direct.
5. **Et** toute tentative autorisee/refusee est tracee dans l'audit avec `request_id`, role resolu, decision (`allow`/`deny`), motif de decision, et sans fuite de secrets/tokens.

## Tasks / Subtasks

- [x] Task 1 - Formaliser la policy d'acces Paheko par role (AC: 1, 2, 3)
  - [x] Reprendre la matrice IAM 12.1 comme source unique (roles, exceptions, fail-closed).
  - [x] Verrouiller les regles explicites `allow`/`deny` par role pour la surface Paheko.
  - [x] Documenter les cas non autorises et le comportement attendu (message utilisateur + audit).
- [x] Task 2 - Implementer l'enforcement backend fail-closed (AC: 1, 2, 4, 5)
  - [x] Centraliser le controle d'acces Paheko dans les dependances/policies backend existantes.
  - [x] Bloquer toute requete Paheko non autorisee meme si la route est appelee en direct.
  - [x] Inclure les metadonnees d'audit minimales (`request_id`, role, decision, reason).
- [x] Task 3 - Implementer les garde-fous frontend (AC: 1, 2, 4)
  - [x] Cacher/desactiver les points d'acces Paheko pour les roles non autorises.
  - [x] Afficher un message explicite "acces reserve roles autorises" en cas de refus.
  - [x] Garantir l'alignement avec l'etat de session BFF (story 12.2), sans logique auth parallele.
- [x] Task 4 - Gerer les exceptions operationnelles tracees (AC: 2, 3, 5)
  - [x] Ajouter le support de l'exception explicite `iam-benevole-exception-paheko` (ou equivalent matrice 12.1) avec expiration.
  - [x] Prevoir la revocation explicite et le retour automatique au deny-by-default a expiration.
  - [x] Journaliser octroi, usage, refus et revocation des exceptions.
- [x] Task 5 - Tests et non-regression IAM (AC: 1, 2, 3, 4, 5)
  - [x] Ajouter des tests backend role-based (`super_admin`, `admin`, `benevole`, benevole+exception).
  - [x] Ajouter des tests frontend co-loces sur visibilite/guard des acces Paheko.
  - [x] Ajouter un test de non-contournement (appel direct API avec role non autorise -> refuse).

## Dev Notes

- Prerequis obligatoires: stories 12.1 (contrat IAM), 12.2 (session SSO/BFF), 12.3 (sync membres/attributs IAM) livrees et considerees sources de verite.
- Scope de la story 12.4: enforcement des garde-fous d'acces Paheko par role + exceptions operationnelles. Ne pas deriver vers la gouvernance groupes/permissions avancee reservee a 12.6.
- Regle metier non negociable: Paheko reste reserve aux usages experts/secours; benevole refuse par defaut sauf exception explicite, temporelle et tracee.
- Regle securite: fail-closed sur toute ambiguite IAM (role absent/invalide, contexte incomplet, exception expiree, source IAM indisponible pour decision).
- Anti-duplication: etendre les policies/deps auth-IAM existantes au lieu de creer un second mecanisme d'autorisation Paheko.
- Observabilite obligatoire: tous les refus/autorisations Paheko doivent etre correlables par `request_id` et exploitables en audit.
- Compatibilite avec 12.2: aucune reintroduction de tokens en localStorage/sessionStorage; la decision d'acces s'appuie sur session BFF + attributs IAM resolus.
- Compatibilite avec 12.3: utiliser les attributs sync Paheko (role/tenant/statut) sans ecraser des donnees locales hors contrat.
- Standards de test obligatoires: backend sous `pytest`; frontend sous `Vitest + React Testing Library + jsdom` avec tests co-loces `*.test.tsx` (pas de Jest).
- Contraintes UI: si un ajustement frontend est necessaire pour les garde-fous, reutiliser les composants/styles existants (Mantine) sans introduire de nouvelle lib UI.

### Project Structure Notes

- Backend: privilegier les points d'extension existants (`api/core/deps.py`, `api/services/auth.py`, `api/routers/v1/auth.py`, routes admin/proxy Paheko) pour l'enforcement.
- Frontend: appliquer les garde-fous dans `frontend/src/auth/` et les zones UI qui exposent des liens/actions Paheko; tests co-loces `*.test.tsx`.
- Audit: reutiliser `audit_events` et les conventions de logs structures (pas de secret/token).
- Documentation IAM: tout arbitrage sur exceptions doit rester aligne avec `_bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md` et le decision log 12.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-12-identite-cross-plateforme-sso-gouvernance-paheko]
- [Source: _bmad-output/planning-artifacts/epics.md#story-12-4-controle-d-acces-paheko-par-role-garde-fous-operationnels]
- [Source: _bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.md]
- [Source: _bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md]
- [Source: _bmad-output/implementation-artifacts/12-1-iam-decision-log.md]
- [Source: _bmad-output/implementation-artifacts/12-2-integration-idp-bff-pour-login-unifie-recyclique.md]
- [Source: _bmad-output/implementation-artifacts/12-3-synchronisation-membres-depuis-api-paheko-phase-1.md]
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

- Corrections changes-requested appliquees: endpoints operables exposes pour exception Paheko (`POST /v1/admin/paheko-access/exceptions`, `POST /v1/admin/paheko-access/exceptions/{id}/revoke`) avec garde-fous demandeur/valideur/motif/expiration/revocation et audit.
- Decision frontend alignee sur le backend via signal serveur autoritatif (`GET /v1/admin/paheko-access`) consomme dans `AdminDashboardPage`; suppression de la decision statique divergente basee sur permissions frontend.
- Contournement legacy supprime: retrait de `legacy_exception_fallback` dans `PahekoAccessService.evaluate_access`; acces benevole limite aux seules exceptions explicites en base, expirables et revocables.
- Validation renforcee cote service: motifs obligatoires (`reason`, `revocation_reason`) et normalisation timezone UTC pour expiration.
- Tests mis a jour/etendus:
  - Backend: `python -m pytest api/tests/routers/test_admin_paheko_compta.py` (11 passed).
  - Frontend: `npm run test:run -- src/admin/AdminDashboardPage.test.tsx` (7 passed).

### File List

- _bmad-output/implementation-artifacts/12-4-controle-d-acces-paheko-par-role-garde-fous-operationnels.md
- api/config/settings.py
- api/core/deps.py
- api/main.py
- api/models/__init__.py
- api/models/paheko_access_exception.py
- api/routers/v1/admin/__init__.py
- api/routers/v1/admin/paheko_compta.py
- api/routers/v1/auth.py
- api/schemas/auth.py
- api/services/auth.py
- api/services/paheko_access.py
- api/tests/routers/test_admin_paheko_compta.py
- api/tests/routers/test_auth.py
- frontend/src/admin/AdminDashboardPage.tsx
- frontend/src/admin/AdminDashboardPage.test.tsx
- frontend/src/api/adminPahekoCompta.ts
- frontend/src/api/auth.ts
- frontend/src/api/index.ts
- frontend/src/auth/AuthContext.tsx
- frontend/src/caisse/CaisseContext.tsx
- frontend/src/caisse/CaisseDashboardPage.test.tsx
- frontend/src/caisse/CashRegisterSessionClosePage.test.tsx
- frontend/src/caisse/CashRegisterSessionOpenPage.test.tsx

## Senior Developer Review (AI)

### Reviewer

- Date: 2026-02-28 (2e passe)
- Decision: Approved

### Findings

1. **LOW - Warnings de test frontend (React act)**
   - Evidence: execution `npm run test:run -- src/admin/AdminDashboardPage.test.tsx` passe (7/7) mais affiche des warnings "not wrapped in act(...)".
   - Impact: pas de blocage fonctionnel immediat, mais signal de robustesse test a ameliorer pour eviter du bruit CI.

2. **LOW - Controle role manager d'exception redondant**
   - Evidence: endpoints grant/revoke utilisent deja `_Admin = Depends(require_permissions("admin", "super_admin"))` puis re-verifient `current_user.role in _EXCEPTION_MANAGERS`.
   - Impact: logique defensive acceptable, mais redondance a clarifier/documenter pour lisibilite.

### Coverage & Validation Notes

- Tests executes:
  - `python -m pytest api/tests/routers/test_admin_paheko_compta.py` -> 12 passed
  - `npm run test:run -- src/admin/AdminDashboardPage.test.tsx` -> 7 passed
- Verification AC (2e passe):
  - AC1/AC2: enforcement role-based + deny-by-default benevole avec exception active en base (`PahekoAccessService.evaluate_access`).
  - AC3: endpoints operables pour octroi/revocation + champs demandeur/valideur/motif/expiration + audit.
  - AC4: coherence frontend/backend via `GET /v1/admin/paheko-access` (signal serveur autoritatif) et controle backend sur routes Paheko.
  - AC5: journalisation `request_id`, role, decision, reason sans token/secret dans les details.

### Recommended Follow-ups (AI)

- [ ] Nettoyer les warnings `act(...)` dans `AdminDashboardPage.test.tsx` pour des tests plus deterministes.
- [ ] Eventuellement factoriser/simplifier la double verification role manager sur grant/revoke si jugee inutile.

## Change Log

- 2026-02-28 - QA Review (adversarial): changes requested, statut repasse a `in-progress`, suivi sprint a resynchroniser.
- 2026-02-28 - QA Review (adversarial, 2e passe): approved, story passee `done`, sync sprint-status effectue.
