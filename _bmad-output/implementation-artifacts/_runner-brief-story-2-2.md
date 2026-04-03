# Brief Story Runner — Epic 2 — Story 2.2 (machine-readable)

## Incident session 2026-04-03 (reprise)

- Un run Story Runner precedent a **livre** CS, VS, DS, GATE, QA ; le graphe a **plante** pendant ou apres la revue (runs paralleles / competition tests / retour arriere confus).
- **Ne pas** refaire CS/VS/DS ni relancer un dev complet **sauf** si CR ou gate revele une regression.
- **Reprise** : `resume_at: CR` — terminer **bmad-code-review** (contexte frais), puis **une** passe gate pytest incluant `tests/test_context_envelope.py`, puis mise a jour sprint **review → done** si PASS.

## YAML story_run (spec §6.2) — reprise CR

```yaml
story_key: "2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte"
epic_id: epic-2
project_root: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique"
resume_at: CR
paths:
  sprint_status: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\sprint-status.yaml"
  story_file: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte.md"
  epics_md: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\epics.md"
  guide_pilotage: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\guide-pilotage-v2.md"
skill_paths:
  create_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-create-story\\SKILL.md"
  dev_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-dev-story\\SKILL.md"
  qa_e2e: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-qa-generate-e2e-tests\\SKILL.md"
  code_review: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-code-review\\SKILL.md"
mode_create_story: validate
gates:
  - cmd: "Set-Location 'D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\recyclique-1.4.4\\api'; $env:TESTING='true'; python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py -v --tb=short"
    timeout_sec: 600
gates_skipped_with_hitl: false
max_vs_loop: 3
max_qa_loop: 3
max_cr_loop: 3
vs_loop: 0
qa_loop: 0
cr_loop: 0
policy:
  retry_chain: "DS → gates → QA → CR"
  fresh_context_for_cr: true
  if_cr_task_unavailable: NEEDS_HITL
post_cr_if_pass:
  update_sprint_status_story_to: done
  halt_after_story: true
```

## Annexe — Context pack Epic 2

Piste B / Epic 2 = implementation backend Recyclique (ContextEnvelope minimal, recalcul explicite de contexte, puis stories suivantes). Ne pas deplacer la verite contextuelle dans Peintre_nano (Epic 3).

Dependances Epic 1 (done) : spec multi-contextes `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` ; OpenAPI/CREOS ; `contracts/openapi/recyclique-api.yaml`.

Decision backend Story 2.1 : code et gates dans `recyclique-1.4.4/api/` jusqu'a migration documentee vers dossier canonique `recyclique/` — voir `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`.

References : `guide-pilotage-v2.md`, `project-structure-boundaries.md`, `contracts/README.md`, `contracts/creos/`, code sous `recyclique-1.4.4/api/`, `references/paheko/`, brownfield `references/ancien-repo/` si utile.

Securite : pas de credentials dans les livrables ; ContextEnvelope = autorite serveur ; contexte ambigu = etat restreint/degrade explicite (AC story 2.2).

Primaute : `epics.md` Epic 2 + `sprint-status.yaml`.

Gates : memes tests auth/infra pilotes que 2.1 (alignes run_tests.sh) ; si echec env (Redis/DB) : NEEDS_HITL avec cause.

Phrase anti-dilution : transmettre cette annexe aux workers CS/DS sans la vider.

Fin : rapport spec §7.1 obligatoire. HALT sur FAIL/NEEDS_HITL sans enchainer 2.3.
