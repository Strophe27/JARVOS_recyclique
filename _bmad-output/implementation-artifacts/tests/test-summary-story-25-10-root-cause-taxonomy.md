# Tests — Story 25.10 (supervision — taxonomie causes racines mapping / builder / outbox_http)

## Objectif

Vérifier la dérivation **déterministe** `derive_root_cause_for_outbox_item` (schéma `paheko_outbox.py`) et la cohérence des champs `root_cause_domain` / `root_cause_code` / `root_cause_message` avec la spec **25.4 §4** et l’Epic **8** (pas d’heuristique sur `last_error`).

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
- `test_root_cause_mapping_detected_when_transition_present_but_not_latest` — présence de `auto_quarantine_mapping_resolution` dans l’audit récent (pas seulement la dernière ligne).

## Commandes (machine locale, Windows PowerShell)

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"

python -m pytest tests/test_story_25_10_paheko_outbox_root_cause_taxonomy.py -v --tb=short
```

## Liens story / traçabilité

- Story : `_bmad-output/implementation-artifacts/25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox.md`
- Implémentation : `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`, `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
