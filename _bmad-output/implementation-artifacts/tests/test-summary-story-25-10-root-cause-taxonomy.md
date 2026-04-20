# Tests — Story 25.10 (supervision — taxonomie causes racines mapping / builder / outbox_http)

## Objectif

Vérifier la dérivation **déterministe** `derive_root_cause_for_outbox_item` (schéma `paheko_outbox.py`) et la cohérence des champs `root_cause_domain` / `root_cause_code` / `root_cause_message` avec la spec **25.4 §4** et l’Epic **8** (pas d’heuristique sur `last_error`).

## Points de traçabilité (ambiguïtés levées)

| Sujet | Clarification |
|--------|----------------|
| **`context_json` (transitions append-only)** | Instantané d’audit au moment de la transition ; **pas** la source de vérité pour `root_cause_*`. La taxonomie combine `payload` (dont `preparation_trace_v1`), `mapping_resolution_error`, `last_remote_http_status` et l’extrait **`recent_sync_transitions`** (voir docstring `derive_root_cause_for_outbox_item` et description OpenAPI du champ). |
| **AC supervision (story 25.10)** | « Au moins un chemin opérateur » = API admin outbox (`GET /items`, `GET /items/{id}`, corrélation, sync-transitions). Les champs `root_cause_*` sur la liste et le détail satisfont l’AC ; pas besoin d’UI dédiée dans le périmètre de la story. |
| **Règles 1–3 vs règle 4 (transitions)** | Règles 1–3 : on teste si un **nom** apparaît **quelque part** dans l’extrait (≤ 10 lignes, ordre récent d’abord). Règle 4 (résiduel) : le **code** est le nom de la **dernière** transition seulement (premier élément de la liste passée au helper). |

## Périmètre

| Couche | Rôle | Fichiers |
|--------|------|----------|
| **Pytest** | Unité helper / schéma | `recyclique/api/tests/test_story_25_10_paheko_outbox_root_cause_taxonomy.py` |
| **Références** (non dupliquées ici) | Chaîne mapping / quarantaine **25.9** / **8.4** | `test_story_25_9_paheko_mapping_before_outbox_success.py`, `test_story_8_4_paheko_quarantine_resolution.py` |

## Liste des tests (fichier dédié 25.10)

- `test_root_cause_mapping_has_priority_over_http_status` — `mapping_resolution_error` prime sur HTTP.
- `test_root_cause_mapping_from_preparation_trace_with_message` — trace `preparation_trace_v1` domaine mapping + message.
- `test_root_cause_builder_from_preparation_trace` — échec builder avec code / message.
- `test_root_cause_outbox_http_from_http_status` — `http_<status>` pour transport.
- `test_root_cause_outbox_http_from_max_attempts_transition_only` — transition `auto_quarantine_max_attempts_exceeded` sans statut HTTP.
- `test_root_cause_outbox_http_from_http_non_retryable_transition_only` — transition `auto_quarantine_http_non_retryable` sans statut HTTP.
- `test_root_cause_rule4_residual_uses_only_latest_transition_name` — règle 4 : code = dernière transition même si d’autres noms sont dans l’extrait.
- `test_root_cause_rule4_residual_from_unsupported_op_alone` — résiduel type `auto_quarantine_unsupported_operation_type`.
- `test_root_cause_mapping_detected_when_transition_present_but_not_latest` — règle 1 : `auto_quarantine_mapping_resolution` détecté dans l’ensemble (pas seulement la dernière ligne).

## Commandes (machine locale, Windows PowerShell)

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"

python -m pytest tests/test_story_25_10_paheko_outbox_root_cause_taxonomy.py -v --tb=short
```

## Liens story / traçabilité

- Story : `_bmad-output/implementation-artifacts/25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox.md`
- Implémentation : `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`, `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
