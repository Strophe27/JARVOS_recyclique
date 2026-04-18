# Story Bug: Login 500 - anyio.EndOfStream

**Status:** ✅ Resolved  
**Epic:** [EPIC-B42 – Session glissante & anti-déconnexion](../epics/epic-b42-sliding-session.md)  
**Module:** API / Auth  
**Priority:** P0  
**Owner:** Backend Lead  
**Last Updated:** 2025-11-27

**Related Stories:**
- [B42-P2: Backend Refresh Token](../stories/story-b42-p2-backend-refresh-token.md) - Refresh token créé mais réponse non envoyée
- [Bug Cash Session Open 500](../stories/story-bug-cash-session-open-500.md) - Même type d'erreur observé précédemment

---

## Story Statement

**As a** utilisateur,  
**I want** to me connecter via `/v1/auth/login` sans erreur 500,  
**so that** je peux accéder à l'application et utiliser les fonctionnalités.

---

## Problème Identifié

**Symptôme:** L'endpoint `POST /v1/auth/login` retourne 500 Internal Server Error avec l'exception `anyio.EndOfStream` dans les logs.

**Erreur observée:**
```
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/anyio/streams/memory.py", line 118, in receive
    raise EndOfStream
anyio.EndOfStream
```

**Séquence observée dans les logs:**
1. ✅ INSERT dans `user_sessions` réussi (refresh token créé - Story B42-P2)
2. ✅ Commit DB réussi
3. ❌ ROLLBACK automatique (FastAPI en cas d'erreur)
4. ❌ Erreur `anyio.EndOfStream` dans le middleware Starlette
5. ❌ Login retourne 500 Internal Server Error

**Impact:**
- Les utilisateurs ne peuvent pas se connecter
- Le refresh token est créé en DB mais la réponse n'est pas envoyée
- L'application est inutilisable pour l'authentification

---

## Acceptance Criteria

1. **Diagnostic complet** – Identifier la cause racine de l'erreur `anyio.EndOfStream` lors du login
2. **Correction appliquée** – Le login fonctionne sans erreur 500
3. **Refresh token fonctionnel** – Le refresh token créé en DB est utilisable (pas de session orpheline)
4. **Logs améliorés** – Logging détaillé pour faciliter le debug futur
5. **Tests de régression** – Tests ajoutés pour éviter la réapparition du bug

---

## Investigation

### Analyse du Code

**Fichier concerné:** `api/src/recyclic_api/api/api_v1/endpoints/auth.py` (fonction `login`, ligne 35-216)

**Séquence d'exécution:**
1. Vérification des identifiants ✅
2. Création du JWT access token ✅
3. Création du refresh token via `RefreshTokenService.create_session()` ✅
4. INSERT dans `user_sessions` ✅ (visible dans les logs)
5. Commit de la session ✅ (ligne 103 `refresh_token_service.py`)
6. **Retour de `LoginResponse`** ❌ (erreur ici)

### Hypothèses

#### Hypothèse 1: Client Ferme la Connexion Prématurément
**Description:** Le client (navigateur/frontend) ferme la connexion avant que la réponse soit complètement envoyée  
**Fichiers à vérifier:**
- `frontend/src/stores/authStore.ts`
- `frontend/src/api/axiosClient.ts`

#### Hypothèse 2: Problème de Sérialisation Pydantic
**Description:** La sérialisation de `LoginResponse` échoue silencieusement  
**Fichiers à vérifier:**
- `api/src/recyclic_api/schemas/auth.py` (LoginResponse)
- Vérifier que tous les champs sont sérialisables

#### Hypothèse 3: Problème avec Refresh Token None
**Description:** Si `create_session` échoue, `refresh_token = None` (ligne 156) peut causer un problème  
**Fichiers à vérifier:**
- `api/src/recyclic_api/api/api_v1/endpoints/auth.py` (gestion du cas `refresh_token = None`)

#### Hypothèse 4: Problème avec les Middlewares
**Description:** Un middleware intercepte et ferme le stream prématurément  
**Fichiers à vérifier:**
- `api/src/recyclic_api/main.py` (configuration des middlewares)

---

## Tasks / Subtasks

1. **Investigation (AC1)**
   - [x] Analyser les logs détaillés avec timestamps
   - [x] Vérifier le code frontend qui fait le login
   - [x] Vérifier la sérialisation de `LoginResponse`
   - [x] Vérifier les middlewares pour interception du stream
   - [x] Identifier la cause racine : table `user_sessions` manquante

2. **Correction (AC2)**
   - [x] Appliquer la migration Alembic `b42_p2_user_sessions` pour créer la table
   - [x] Rebuild de l'image `api-migrations` pour inclure la nouvelle migration
   - [x] Vérifier que la chaîne de migrations Alembic est intacte
   - [x] Ajouter gestion d'erreur explicite dans `login()`
   - [x] Ajouter logging détaillé pour faciliter le debug
   - [x] Gérer le cas où `refresh_token` est `None`

3. **Nettoyage DB (AC3)**
   - [x] Vérifier s'il y a des sessions orphelines créées lors des échecs
   - [x] Nettoyer les sessions orphelines si nécessaire
   - [x] Ajouter rollback automatique si la réponse échoue
   - [x] Supprimer la table créée manuellement et la recréer via Alembic

4. **Amélioration Logs (AC4)**
   - [x] Ajouter logs avant/après chaque étape critique
   - [x] Logger les erreurs de sérialisation si elles se produisent
   - [x] Logger les erreurs de création de refresh token avec stack trace

5. **Tests (AC5)**
   - [x] Test de régression pour le login
   - [x] Test d'intégration API pour endpoint `/v1/auth/login`
   - [x] Vérifier que la chaîne de migrations Alembic est intacte

---

## Dev Notes

### Références
- **Document d'analyse:** `docs/tests-problemes-API-ENDOFSTREAM.md`
- **Code endpoint:** `api/src/recyclic_api/api/api_v1/endpoints/auth.py` (ligne 35-216)
- **Service refresh token:** `api/src/recyclic_api/services/refresh_token_service.py`
- **Schéma réponse:** `api/src/recyclic_api/schemas/auth.py` (LoginResponse)

### Points d'Attention
- L'erreur se produit **après** le commit DB, donc le refresh token est créé
- L'erreur se produit **avant** l'envoi de la réponse HTTP
- Le problème peut être lié à la Story B42-P2 (création du refresh token)

### Solutions à Tester

**Solution 1: Ajouter Gestion d'Erreur Explicite**
```python
try:
    response = LoginResponse(...)
    return response
except Exception as e:
    logger.error(f"Erreur lors de la sérialisation de LoginResponse: {e}")
    # Rollback de la session créée si nécessaire
    if refresh_token:
        try:
            refresh_service.revoke_session_by_token_hash(...)
        except:
            pass
    raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
```

**Solution 2: Vérifier le Frontend**
- Vérifier que le client ne ferme pas la connexion prématurément
- Vérifier les timeouts côté client

**Solution 3: Ajouter Logging Détaillé**
```python
logger.info("Avant création LoginResponse")
response = LoginResponse(...)
logger.info("Après création LoginResponse, avant return")
return response
```

---

## Project Structure Notes

**Fichiers à modifier:**
- `api/src/recyclic_api/api/api_v1/endpoints/auth.py` - Fonction `login()`
- `api/src/recyclic_api/services/refresh_token_service.py` - Gestion rollback si nécessaire

**Fichiers à vérifier:**
- `frontend/src/stores/authStore.ts` - Code frontend login
- `frontend/src/api/axiosClient.ts` - Configuration axios
- `api/src/recyclic_api/main.py` - Configuration middlewares

---

## File List

**Modifiés:**
- `api/src/recyclic_api/api/api_v1/endpoints/auth.py` - Fonction `login()` 
  - Ajout gestion d'erreur explicite avec try/except
  - Ajout logs détaillés avant/après création de LoginResponse
  - Ajout révocation automatique des sessions orphelines en cas d'erreur
  - Utilisation de `model_validate` avec fallback pour AuthUser
  - Amélioration gestion d'erreur pour refresh token
- `api/src/recyclic_api/schemas/auth.py` - Schéma `AuthUser`
  - Ajout de `model_config = ConfigDict(from_attributes=True)` pour meilleure sérialisation SQLAlchemy
- `api/tests/test_auth_login_username_password.py` - Test de régression ajouté
  - `test_login_response_serialization_success` - Vérifie la sérialisation même avec refresh_token=None

**Migrations appliquées:**
- `api/migrations/versions/b42_p2_add_user_sessions_table.py` - Migration Alembic appliquée
  - Création de la table `user_sessions` avec tous les index
  - Version Alembic : `b42_p2_user_sessions` (head)
  - Chaîne intacte : `ea87fd9f3cdb -> b42_p2_user_sessions`

---

## Validation Checklist

- [x] Le login fonctionne sans erreur 500
- [x] Le refresh token est créé et utilisable
- [x] Aucune session orpheline en DB
- [x] Logs détaillés pour faciliter le debug futur
- [x] Tests de régression passent
- [x] Chaîne de migrations Alembic intacte (version: `b42_p2_user_sessions`)
- [ ] Aucune régression sur les autres endpoints (à tester)

---

## Change Log

| Date       | Version | Description                            | Author |
|------------|---------|----------------------------------------|--------|
| 2025-11-26 | v0.1    | Création de la story de debug          | Auto (Agent Cursor) |
| 2025-11-26 | v0.2    | Ajout gestion d'erreur explicite et logs détaillés | James (Dev Agent) |
| 2025-11-27 | v0.3    | Cause racine identifiée : table user_sessions manquante. Migration Alembic appliquée. | James (Dev Agent) |
| 2025-11-27 | v0.4    | ✅ **RÉSOLU** - Correction bug React SessionStatusBanner (hooks après return conditionnel) + correction TESTING mode | Auto (Agent Cursor) |

---

## Investigation Results

**Cause racine identifiée:** 
L'erreur `anyio.EndOfStream` était une conséquence d'une erreur SQLAlchemy non gérée. La cause réelle était :
- **Table `user_sessions` manquante** : La migration `b42_p2_user_sessions` n'avait pas été appliquée
- L'INSERT dans `user_sessions` échouait avec `relation "user_sessions" does not exist`
- SQLAlchemy effectuait un ROLLBACK automatique
- Lors de l'accès à `user.id` dans le logger d'erreur, SQLAlchemy tentait de recharger l'objet depuis la DB mais la session était en état `PendingRollbackError`
- FastAPI/Starlette ne pouvait plus envoyer la réponse, d'où `anyio.EndOfStream`

**Correction appliquée:**
1. **Migration Alembic appliquée** : Rebuild de l'image `api-migrations` et application de la migration `b42_p2_user_sessions` pour créer la table `user_sessions`
2. **Gestion d'erreur améliorée** : Ajout de gestion d'erreur explicite avec try/except autour de la création de `LoginResponse`
3. **Logs détaillés** : Ajout de logs avant/après chaque étape critique pour faciliter le debug futur
4. **Révocation automatique** : Ajout de révocation automatique des sessions orphelines si la réponse échoue
5. **Sérialisation améliorée** : Utilisation de `model_validate` avec fallback pour une meilleure gestion des types SQLAlchemy
6. **Bug React SessionStatusBanner** : Correction violation des règles des Hooks - `useNavigate()` appelé après `return null` conditionnel (déplacé au début du composant)
7. **Configuration TESTING** : Désactivation de `TESTING: "true"` dans `docker-compose.yml` qui forçait l'utilisation de `recyclic_test` au lieu de `recyclic`

**Fichiers modifiés:**
- `api/src/recyclic_api/api/api_v1/endpoints/auth.py` - Fonction `login()` (gestion d'erreur et logs améliorés)
- `api/src/recyclic_api/schemas/auth.py` - Ajout de `model_config = ConfigDict(from_attributes=True)` à `AuthUser`
- `api/tests/test_auth_login_username_password.py` - Test de régression ajouté
- `api/migrations/versions/b42_p2_add_user_sessions_table.py` - Migration appliquée (table créée)
- `frontend/src/components/ui/SessionStatusBanner.tsx` - Correction violation des règles des Hooks React
- `docker-compose.yml` - Désactivation de `TESTING: "true"` pour éviter l'utilisation de la base de test
- `api/src/recyclic_api/core/config.py` - Ajout warning si TESTING mode activé

**Tests ajoutés:**
- `test_login_response_serialization_success` - Test de régression pour vérifier la sérialisation de LoginResponse

---

## Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### Investigation Notes
- Erreur `anyio.EndOfStream` observée dans les logs Docker
- Se produit lors de `POST /v1/auth/login`
- Refresh token créé en DB mais réponse non envoyée
- Problème similaire observé précédemment (bug cash session)

### Files Modified
- `api/src/recyclic_api/api/api_v1/endpoints/auth.py` - Endpoint login (ajout gestion d'erreur et logs)
- `api/tests/test_auth_login_username_password.py` - Test de régression ajouté

### Files Investigated
- `api/src/recyclic_api/api/api_v1/endpoints/auth.py` - Endpoint login
- `api/src/recyclic_api/schemas/auth.py` - Schéma LoginResponse
- `frontend/src/stores/authStore.ts` - Code frontend (pas de timeout détecté)
- `frontend/src/api/axiosClient.ts` - Configuration axios (pas de timeout détecté)
- `api/src/recyclic_api/main.py` - Configuration middlewares (pas d'interception détectée)

### Implementation Details
1. **Cause racine identifiée:** Table `user_sessions` manquante (migration `b42_p2_user_sessions` non appliquée)
2. **Solution principale:** 
   - Rebuild de l'image `api-migrations` pour inclure la nouvelle migration
   - Application de la migration via `alembic upgrade head`
   - Vérification que la chaîne de migrations Alembic est intacte (version: `b42_p2_user_sessions`)
3. **Améliorations de code:**
   - Gestion d'erreur explicite avec try/except autour de la création de `LoginResponse`
   - Utilisation de `model_validate` avec fallback pour `AuthUser`
   - Ajout de `model_config = ConfigDict(from_attributes=True)` à `AuthUser`
   - Logs détaillés avant/après chaque étape critique
4. **Révocation de sessions orphelines:** Si la réponse échoue, tentative de révocation de la session créée
5. **Test de régression:** Test ajouté pour vérifier la sérialisation même avec `refresh_token = None`

### Debug Log References
- **Erreur SQL réelle (cause racine):** `relation "user_sessions" does not exist`
- **Erreur SQLAlchemy:** `PendingRollbackError: This Session's transaction has been rolled back`
- **Erreur observée (conséquence):** `anyio.EndOfStream` dans middleware Starlette
- **Logs Docker:** `docker-compose logs api --tail 100 | grep -i 'endofstream\|login\|500\|user_sessions'`
- **Nouveaux logs:** Rechercher "Avant création LoginResponse", "AuthUser créé", "LoginResponse créé"
- **Vérification migration:** `docker-compose run --rm api-migrations alembic current` (doit retourner `b42_p2_user_sessions`)

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

