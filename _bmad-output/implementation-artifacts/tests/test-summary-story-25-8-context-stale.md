# Tests — Story 25.8 (CONTEXT_STALE caisse / symétrie ventes)

## Objectif

Couverture minimale des refus **409** avec `code` **`CONTEXT_STALE`** sur une mutation caisse (`PUT /v1/cash-sessions/{session_id}/step`) lorsque les en-têtes `X-Recyclique-Context-Site-Id` ou `X-Recyclique-Context-Cash-Session-Id` ne correspondent pas à l’enveloppe serveur.

## Commandes exécutées (machine locale, Windows PowerShell)

Répertoire : `recyclique\api`.

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"
python -m pytest tests/test_context_stale_story25_8.py -v --tb=short
```

Contrôle non-régression sur la suite « step » existante :

```powershell
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"
python -m pytest tests/test_context_stale_story25_8.py tests/test_cash_session_step_update_arch03.py -q --tb=line
```

## Fichiers

- `recyclique/api/tests/test_context_stale_story25_8.py`

## Résultat

Les deux commandes ci-dessus se sont terminées avec succès (exit code 0) lors de la dernière exécution.
