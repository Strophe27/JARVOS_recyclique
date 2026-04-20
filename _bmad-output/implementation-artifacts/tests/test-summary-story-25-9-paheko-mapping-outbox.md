# Tests — Story 25.9 (spec 25.4 §4 — mapping obligatoire avant succès outbox)

## Objectif

Vérifier que le processeur outbox **ne** marque **pas** de succès terminal (**delivered**) lorsque la résolution mapping Paheko (story **8.3**) échoue au moment du traitement, et que le chemin nominal (mapping résolu → builder → HTTP) peut atteindre **delivered** avec traçabilité **`preparation_trace_v1`** / domaines d’échec documentés dans le code (`paheko_outbox_processor.py`).

## Périmètre

| Couche | Rôle | Fichiers |
|--------|------|----------|
| **Pytest** | Intégration services : outbox + mapping + batch clôture | `recyclique/api/tests/test_story_25_9_paheko_mapping_before_outbox_success.py` |
| **Références** (non dupliquées ici) | Epic **8** / **22.7** | `test_story_8_3_paheko_mapping.py`, `test_story_22_7_outbox_processor_batch.py`, `test_story_8_1_paheko_outbox_slice.py` |

## Liste des tests (fichier dédié 25.9)

- `test_mapping_must_be_resolved_before_delivered_mapping_removed_after_enqueue` — après clôture avec mapping, suppression des lignes `paheko_cash_session_close_mappings` pour le site : le traitement outbox laisse l’item en **`failed`**, **`sync_state_core` `en_quarantaine`**, trace **`preparation_trace_v1.failure_domain` = `mapping`**, **`mapping_resolution_error` = `mapping_missing`** — **pas** de **`delivered`** (le mock HTTP renvoie **200** si le client est invoqué ; le test n’assert pas l’absence d’appel réseau, seulement l’**absence de succès outbox terminal** alignée **25.4 §4**).
- `test_mapping_resolved_then_close_batch_can_reach_delivered` — mapping présent : traitement → **delivered** et état batch `all_delivered` (alignement chemin nominal **25.9**).

## Commandes (machine locale, Windows PowerShell)

Répertoire de travail : **`recyclique\api`** (le package Python `recyclic_api` et les tests pytest API y sont racinés).

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"

python -m pytest tests/test_story_25_9_paheko_mapping_before_outbox_success.py -v --tb=short
```

Équivalent depuis la racine du dépôt (chemins réels) :

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique"

python -m pytest recyclique/api/tests/test_story_25_9_paheko_mapping_before_outbox_success.py -v --tb=short
```

**Note :** la commande `pytest tests/test_story_25_9_paheko_mapping_before_outbox_success.py` sans préfixe ne s’applique **que** si le répertoire courant est déjà `recyclique\api` ; sinon utiliser le chemin `recyclique/api/tests/...` ci-dessus.

## Liens story / traçabilité

- Story : `_bmad-output/implementation-artifacts/25-9-projection-paheko-mapping-obligatoire-avant-succes-outbox-delta-epic-8.md`
- Implémentation : `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
