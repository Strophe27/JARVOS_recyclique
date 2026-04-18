# Brief Story Runner — Epic 2 — Story 2.2b (machine-readable)

## Verification amont (Epic Runner)

- `sprint-status.yaml` : `2-2-…` done ; `2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo` : backlog — **prochaine story Epic 2**.
- `epics.md` : Story 2.2b inseree entre 2.2 et 2.3 ; encadre Correct Course 2026-04-03.
- Fichier story : `_bmad-output/implementation-artifacts/2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md`
- Cible architecture : `project-structure-boundaries.md` — dossier canonique `recyclique/` a la racine mono-repo.

## YAML story_run (spec §6.2) — demarrage CS

```yaml
story_key: "2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo"
epic_id: epic-2
project_root: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique"
resume_at: CS
paths:
  sprint_status: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\sprint-status.yaml"
  story_file: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\implementation-artifacts\\2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md"
  epics_md: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\epics.md"
  guide_pilotage: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\_bmad-output\\planning-artifacts\\guide-pilotage-v2.md"
skill_paths:
  create_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-create-story\\SKILL.md"
  dev_story: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-dev-story\\SKILL.md"
  qa_e2e: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-qa-generate-e2e-tests\\SKILL.md"
  code_review: "D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\.cursor\\skills\\bmad-code-review\\SKILL.md"
mode_create_story: validate
gates:
  - cmd: "Set-Location 'D:\\users\\Strophe\\Documents\\1-IA\\La Clique Qui Recycle\\JARVOS_recyclique\\recyclique\\api'; $env:TESTING='true'; python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py -v --tb=short"
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
notes_gate:
  - "Apres migration DS, le package vivant doit etre sous recyclique/api (meme gate que fin 2.2, liste pytest etendue context envelope)."
  - "Ne pas lancer plusieurs pytest en parallele sur le meme fichier SQLite (pytest_recyclic.db) — risque database is locked."
```

## Annexe — Context pack Epic 2 (story 2.2b)

**Objectif** : une seule racine backend active — deplacer le package API de `recyclique-1.4.4/api/` vers **`recyclique/api/`** (ou structure documentee equivalente sous `recyclique/`), mettre a jour Docker/compose/CI/README, artefact decision 2.1, briefs futurs pointent vers le nouveau chemin.

**Pas** de verite contextuelle dans Peintre_nano. Secrets hors depot.

**References** : `sprint-change-proposal-2026-04-03.md` ; `2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` (a reviser en fin de story) ; `contracts/openapi/recyclique-api.yaml` (chemins generateurs si touches).

**Phrase anti-dilution** : transmettre cette annexe aux workers CS/DS sans la vider.

**Fin** : rapport spec §7.1 ; HALT sur FAIL/NEEDS_HITL ; si PASS, story 2.2b -> done, preparer 2.3.
