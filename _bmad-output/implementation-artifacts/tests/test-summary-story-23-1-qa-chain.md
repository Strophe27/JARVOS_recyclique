# Test summary — Story 23.1 (ventilation Paheko par moyen)

| Zone | Preuve locale pytest | Paheko réel |
|------|----------------------|-------------|
| **Ventilation par moyen (ADVANCED + révision)** | `recyclique/api/tests/test_story_23_1_paheko_per_method_close_batch.py` | **HITL** — validation manuelle sur instance Paheko ou procédure terrain documentée (même constat que 22.8 D1 pour les mocks HTTP). |
| **Observabilité batch / lignes (AC5)** | Même fichier : `test_per_method_observability_ac5_minimum_fields` (+ non-régression merge `test_merge_preserves_observability_on_redelivery_template`) | **HITL** pour l’id transaction réel côté Paheko ; les champs batch / `remote_transaction_id` sont couverts en pytest. |
| **Non-régression agrégé 22.7** | `test_story_22_7_paheko_close_batch_builder.py`, `test_story_22_7_outbox_processor_batch.py` | Idem gate existant. |

## Commande gate (extension 22.8)

```bash
cd recyclique/api
python -m pytest tests/test_story_23_1_paheko_per_method_close_batch.py tests/test_story_22_7_paheko_close_batch_builder.py tests/test_story_22_7_outbox_processor_batch.py -q
```
