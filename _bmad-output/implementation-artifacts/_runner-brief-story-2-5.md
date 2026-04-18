# Brief Story Runner — Epic 2 — Story 2.5

## YAML story_run (spec §6.2)

```yaml
story_key: "2-5-stabiliser-la-persistance-terrain-locale-laudit-et-les-journaux-critiques"
epic_id: epic-2
project_root: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique"
resume_at: CS
paths:
  sprint_status: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\sprint-status.yaml"
  story_file: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\2-5-stabiliser-la-persistance-terrain-locale-laudit-et-les-journaux-critiques.md"
  epics_md: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\epics.md"
  guide_pilotage: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\guide-pilotage-v2.md"
skill_paths:
  create_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-create-story\\SKILL.md"
  dev_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-dev-story\\SKILL.md"
  qa_e2e: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-qa-generate-e2e-tests\\SKILL.md"
  code_review: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-code-review\\SKILL.md"
mode_create_story: create
gates:
  - cmd: "Set-Location 'D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\recyclique\\api'; $env:TESTING='true'; python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py tests/test_step_up_cash_session_close.py tests/test_audit_story_25.py tests/test_cash_session_close_arch04.py tests/test_request_correlation_story_25.py -v --tb=short"
    timeout_sec: 900
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
notes:
  - "Persistance locale / audit / logs structures ; masquage donnees sensibles ; correlation_id si applicable."
```

## Annexe — Context pack Epic 2 / Story 2.5

Terrain d'abord ; traces exploitables ; base pour Epic 8 sync. recyclique/api. Pas de credentials en logs.
