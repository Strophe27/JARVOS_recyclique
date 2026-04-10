# Synthèse automatisation des tests — Story 8.7 (preuves Epic 8 / gate + matrice honnête)

**Périmètre** : gate backend Story Runner (pytest FastAPI + DB SQLite / fixtures) ; ces tests prouvent le comportement Recyclique en CI. La **preuve Paheko réelle** est désormais documentée séparément dans le registre Epic 8 §2 bis (historique **AC6 B → A**), elle ne provient **pas** de ce gate pytest.

**Date (gate DS 8.7)** : 2026-04-10

**Commit (arbre local au run)** : `2369024`

## Vérification `bmad-qa-generate-e2e-tests` (sous-agent Task, 2026-04-10)

- **Commande rejouée** : identique à la section ci-dessous, depuis `recyclique/api`.
- **Résultat** : **PASS** (`exit_code: 0`), environ **70 s** sur l’environnement d’exécution (Python **3.13**, warnings Pydantic V2 `class-based config` — hors périmètre 8.7).
- **Nombre de tests** : **65** (confirmé par `--collect-only` : 10 + 11 + 15 + 11 + 5 + 5 + 6 + 2).
- **Cohérence noms AC5** : les fonctions `test_*` citées dans le tableau (a)–(h) existent bien dans les fichiers listés.

### Répartition par fichier (gate registre §4)

| Fichier | Tests |
|---------|------:|
| `tests/test_story_8_1_paheko_outbox_slice.py` | 10 |
| `tests/test_story_8_2_paheko_outbox_retry_idempotence.py` | 11 |
| `tests/test_story_8_3_paheko_mapping.py` | 15 |
| `tests/test_story_8_4_paheko_quarantine_resolution.py` | 11 |
| `tests/test_story_8_5_paheko_correlation.py` | 5 |
| `tests/test_story_8_6_selective_blocking.py` | 5 |
| `tests/test_sync_service.py` | 6 |
| `tests/test_dashboard_stats.py` | 2 |
| **Total** | **65** |

## Nouveaux tests automatisés pour 8.7 ?

Au moment du DS 8.7 : **non**. Depuis, une dette QA utile a été réduite hors ce gate par un test client HTTP dédié sur le **409** A1 de clôture ; cela améliore la couverture API Recyclique, sans changer la nature de cette synthèse qui reste centrée sur le gate pytest 8.7.

## Commande exécutée

```bash
cd recyclique/api
python -m pytest -q tests/test_story_8_1_paheko_outbox_slice.py tests/test_story_8_2_paheko_outbox_retry_idempotence.py tests/test_story_8_3_paheko_mapping.py tests/test_story_8_4_paheko_quarantine_resolution.py tests/test_story_8_5_paheko_correlation.py tests/test_story_8_6_selective_blocking.py tests/test_sync_service.py tests/test_dashboard_stats.py
```

- **Résultat** : **PASS** — **65** tests (warnings Pydantic deprecation hors périmètre story).

## Cartographie minimal AC5 (familles (a)–(h)) — traces nommées

| Famille | Preuve (fichier pytest) |
|---------|-------------------------|
| **(a)** Clôture → outbox même transaction | `test_close_non_empty_creates_outbox_same_commit` (`test_story_8_1_paheko_outbox_slice.py`) |
| **(b)** Succès processor → état terminal Recyclique | `test_processor_success_marks_resolu`, `test_admin_get_after_processor_success_shows_resolu` (8.1) |
| **(c)** Retry / backoff | `test_processor_http_500_schedules_retry_pending`, `test_retry_after_backoff_then_success`, `test_immediate_second_process_respects_next_retry_at` (8.2) |
| **(d)** Plafond → quarantaine | `test_max_attempts_then_quarantine` (8.2) |
| **(e)** Mapping manquant / invalide (**8.3**) | `test_mapping_missing_blocks_a1_before_outbox`, `test_invalid_destination_params_in_db_blocks_a1` (`test_story_8_3_paheko_mapping.py`) |
| **(e′)** Quarantaine suite à **échec HTTP** processeur (mock Paheko), cause **distincte** du mapping | `test_admin_get_after_processor_403_shows_en_quarantaine` (`test_story_8_1_paheko_outbox_slice.py`) — illustre **403** → état `en_quarantaine` côté outbox, pas le garde-fou **mapping** avant enqueue. |
| **(f)** Levée / rejet / confirm 8.4 + audit | `test_lift_quarantine_audit_and_retry_eligibility`, `test_reject_writes_audit_same_shape_as_lift`, `test_confirm_resolved_success_when_delivered_with_audit`, `test_quarantine_entry_persists_audit_with_context` (8.4) |
| **(g)** Corrélation 8.5 | `test_list_outbox_filter_by_correlation_id`, `test_correlation_timeline_after_processor`, `test_close_response_surfaces_paheko_link` (8.5) |
| **(h)** Refus 8.6 distinct du succès + outbox | `test_a1_blocked_when_session_outbox_quarantine_row_exists`, `test_a1_mapping_missing_raises_close_mapping_reason` (8.6) — garde service + payload `policy_reason_code` ; complété ensuite par un test client HTTP dédié sur `POST /cash-sessions/{id}/close` retournant **409**. |

## Modules backend de référence (cartographie story)

- `recyclic_api.services.paheko_outbox_service` (outbox, processor, `post_cash_session_close` via mock en test)
- `recyclic_api.services.cash_session_service` (clôture + enqueue)
- `recyclic_api.services.paheko_sync_final_action_policy` (A1)
- `recyclic_api.api.api_v1.endpoints.admin_paheko_outbox`, `admin_paheko_mapping`
- `recyclic_api.application.cash_session_closing` (chemin HTTP clôture / erreurs structurées)

## Checklist (`bmad-qa-generate-e2e-tests` / pattern 8.3–8.5)

- [x] Gate pytest Epic 8 + régressions `test_sync_service` / `test_dashboard_stats` — **exécuté et vert**
- [x] API / comportement slice : **couvert par tests existants** (pas de génération supplémentaire requise pour 8.7)
- [ ] E2E UI / navigateur (hors périmètre story — pas de valeur ajoutée pour la preuve slice backend déjà obtenue)
- [x] Paheko réel authentifié et flow slice prouvé **hors CI** dans le registre Epic 8 §2 bis
- [x] Synthèse enregistrée (ce fichier) — **alignée exécution réelle**

## Fichiers associés (preuves documentaires, pas code métier)

- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` (§2, §2 bis, §4, §6)
- `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md` (Dev Agent Record)
