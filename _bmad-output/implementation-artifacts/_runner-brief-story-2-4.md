# Brief Story Runner — Epic 2 — Story 2.4

## YAML story_run (spec §6.2)

```yaml
story_key: "2-4-encadrer-les-actions-sensibles-avec-step-up-security-pin-et-idempotence"
epic_id: epic-2
project_root: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique"
resume_at: CS
paths:
  sprint_status: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\sprint-status.yaml"
  story_file: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\2-4-encadrer-les-actions-sensibles-avec-step-up-security-pin-et-idempotence.md"
  epics_md: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\epics.md"
  guide_pilotage: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\guide-pilotage-v2.md"
skill_paths:
  create_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-create-story\\SKILL.md"
  dev_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-dev-story\\SKILL.md"
  qa_e2e: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-qa-generate-e2e-tests\\SKILL.md"
  code_review: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-code-review\\SKILL.md"
mode_create_story: create
gates:
  - cmd: "Set-Location 'D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\recyclique\\api'; $env:TESTING='true'; python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py -v --tb=short"
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
  - "HITL possible : secrets, politique PIN, idempotence — documenter NEEDS_HITL si env bloque."
  - "Etendre le gate pytest si nouveaux tests step-up/idempotence."
```

## Annexe — Context pack Epic 2 / Story 2.4

Step-up serveur ; PIN jamais en clair dans les logs ; Idempotency-Key ou trace requete ; decisions serveur meme si UI filtre. Backend recyclique/api. OpenAPI si nouveaux endpoints. Epic 3 ne fait pas foi sur la securite.
