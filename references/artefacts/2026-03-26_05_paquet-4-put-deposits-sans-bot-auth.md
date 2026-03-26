# Paquet 4 — retrait `X-Bot-Token` / `bot_auth` sur `PUT /v1/deposits/{id}`

Date : 2026-03-26  
Repo : `JARVOS_recyclique` / périmètre `recyclique-1.4.4/api`

## Décision produit

Telegram / bot hors périmètre : plus d’auth dédiée bot sur la finalisation de dépôt.

## Contrat retenu

**Alignement sur les autres routes du router `deposits`** : `PUT /{id}` n’exige plus d’en-tête `X-Bot-Token` ; seule la session DB (`get_db`) est injectée, comme `GET` / `POST` sur `/deposits`. La sécurité repose sur le même périmètre réseau / déploiement que le reste de ces routes (pas de JWT ajouté sur ce lot).

## Fichiers

- Modifié : `api/src/recyclic_api/api/api_v1/endpoints/deposits.py`
- Supprimé : `api/src/recyclic_api/core/bot_auth.py`
- Supprimé : `api/tests/test_bot_auth_simple.py`
- Modifié : `api/tests/test_deposit_validation_workflow.py` (sans bot + test OpenAPI sans `x-bot-token`)
- Régénéré / copiés : `api/openapi.json` → `openapi.json` (racine 1.4.4), `frontend/openapi.json`, `frontend/api/openapi.json`
- Doc dette : `docs/pending-tech-debt/story-2.1-commande-depot-enregistrement-vocal.md` (lignes bot_auth / tests)

## Validations exécutées

```text
pytest tests/test_deposit_validation_workflow.py tests/test_deposit_classification_integration.py tests/test_telegram_link_arch03.py -q
```

Résultat : **13 passed** (warnings Pydantic existants).

`legacy_import` / OpenRouter : **aucun fichier modifié** dans ce lot.

## Réserve

- `TELEGRAM_BOT_TOKEN` peut rester en config pour d’autres usages résiduels (notifications, etc.) ; plus utilisé pour `PUT /deposits/{id}`.
- Champs modèle `telegram_*` et docs archi mentionnant Telegram : hors périmètre paquet 4.
- Renforcer l’auth (JWT / rôle) sur `PUT /deposits/{id}` reste un chantier produit séparé si le déploiement n’est pas déjà isolé.

## Git

Pas de commit (demande explicite).
