# Paquet 3 — suppression routes / contrat API bot et liaison compte (hors `PUT /deposits/{id}`)

**Date** : 2026-03-26  
**Statut** : lot fermé (pas de commit demandé).

## Objectif

Retirer du backend et du contrat OpenAPI les endpoints historiques bot / liaison compte messager devenus inutiles (y compris les stubs **410**), sans modifier `PUT /v1/deposits/{deposit_id}` ni `X-Bot-Token`, ni `legacy_import` / OpenRouter.

## Réalisé

- Suppression des routes : `POST /users/link-*` (liaison), `POST /deposits/from-bot`, `POST /deposits/{id}/classify`.
- Schémas retirés : requête de liaison compte, création dépôt depuis bot.
- Constante retirée dans `bot_auth.py` : détail « dépôt bot désactivé » (constante historique).
- Tests supprimés : suite lien endpoint, classification fixe, integration depot bot ; allègement des tests lien arch03 et classification depot ; docstrings ajustées (`test_bot_auth_simple`, `test_deposit_validation_workflow`).
- OpenAPI : régénération `api/openapi.json` depuis l’app ; retrait des mêmes chemins / schéma dans `openapi.json` racine, `frontend/openapi.json`, `frontend/api/openapi.json` ; `npm run codegen` (client TS généré).
- Docs : `docs/guides/liste-endpoints-api.md` (section historique bot supprimée), `docs/architecture-current/fonctionnalites-actuelles.md` (ligne liaison messager), `api/pytest.ini` (commentaire).

## Validations exécutées

- `pytest` ciblé : `test_bot_auth_simple.py`, `test_deposit_validation_workflow.py`, `test_deposit_classification_integration.py`, test integration lien arch03 — OK.
- `rg` sur `api/` : plus de références code aux routes retirées (hors commentaire explicatif dans `test_deposit_classification_integration.py`).

## Réservé paquet 4

- Remplacement ou évolution de l’auth `X-Bot-Token` sur `PUT /v1/deposits/{deposit_id}` et nettoyage associé (`get_bot_token_dependency`, tests `test_bot_auth_simple`, workflow finalisation).
