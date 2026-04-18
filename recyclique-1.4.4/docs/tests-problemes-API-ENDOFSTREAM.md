# Problème API - anyio.EndOfStream lors du Login

**Date:** 2025-11-26  
**Problème:** L'API plante avec `anyio.EndOfStream` lors de `POST /v1/auth/login`  
**Impact:** Le login retourne 500 Internal Server Error

---

## 🔍 Analyse des Logs

### Erreur Observée
```
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/anyio/streams/memory.py", line 98, in receive
    return self.receive_nowait()
           ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/anyio/streams/memory.py", line 93, in receive_nowait
    raise WouldBlock
anyio.WouldBlock

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/starlette/middleware/base.py", line 78, in call_next
    message = await recv_stream.receive()
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/anyio/streams/memory.py", line 118, in receive
    raise EndOfStream
anyio.EndOfStream
```

### Séquence Observée dans les Logs
1. ✅ INSERT dans `user_sessions` réussi (refresh token créé)
2. ❌ ROLLBACK automatique (FastAPI en cas d'erreur)
3. ❌ Erreur `anyio.EndOfStream` dans le middleware Starlette
4. ❌ Login retourne 500 Internal Server Error

---

## 🔍 Analyse du Code

### Endpoint `/v1/auth/login`
**Fichier:** `api/src/recyclic_api/api/api_v1/endpoints/auth.py` (ligne 35-216)

**Séquence d'exécution:**
1. Vérification des identifiants ✅
2. Création du JWT access token ✅
3. Création du refresh token via `RefreshTokenService.create_session()` ✅
4. INSERT dans `user_sessions` ✅ (visible dans les logs)
5. Commit de la session ✅ (ligne 103 `refresh_token_service.py`)
6. **Retour de `LoginResponse`** ❌ (erreur ici)

### Problème Identifié

L'erreur se produit **après** le commit de la session, lors de la sérialisation/envoi de la réponse HTTP.

**Causes possibles:**
1. **Client ferme la connexion prématurément** - Le client (navigateur/frontend) ferme la connexion avant que la réponse soit complètement envoyée
2. **Problème de sérialisation Pydantic** - La sérialisation de `LoginResponse` échoue silencieusement
3. **Problème avec les middlewares** - Un middleware intercepte et ferme le stream
4. **Timeout ou problème réseau** - La connexion est interrompue

---

## 🎯 Hypothèses

### Hypothèse 1: Client Ferme la Connexion
**Symptôme:** Le client (frontend) ferme la connexion avant la fin de la réponse  
**Preuve:** L'erreur se produit dans `recv_stream.receive()` du middleware  
**Solution:** Vérifier le code frontend qui fait le login

### Hypothèse 2: Problème de Sérialisation
**Symptôme:** La sérialisation de `LoginResponse` échoue  
**Preuve:** L'erreur se produit après le commit DB mais avant l'envoi de la réponse  
**Solution:** Vérifier que tous les champs de `LoginResponse` sont sérialisables

### Hypothèse 3: Problème avec Refresh Token None
**Symptôme:** Si `create_session` échoue, `refresh_token = None` (ligne 156)  
**Preuve:** Le schéma accepte `Optional[str]` mais peut-être un problème de sérialisation  
**Solution:** Vérifier le comportement quand `refresh_token` est `None`

---

## 🔧 Solutions à Tester

### Solution 1: Ajouter Gestion d'Erreur Explicite
**Fichier:** `api/src/recyclic_api/api/api_v1/endpoints/auth.py`

**Modifier la fonction `login` pour gérer les erreurs de sérialisation:**
```python
try:
    response = LoginResponse(
        access_token=token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        user=AuthUser(...),
    )
    return response
except Exception as e:
    logger.error(f"Erreur lors de la sérialisation de LoginResponse: {e}")
    # Rollback de la session créée si nécessaire
    if refresh_token:
        try:
            refresh_service.revoke_session_by_token_hash(
                refresh_service._hash_refresh_token(refresh_token)
            )
        except:
            pass
    raise HTTPException(
        status_code=500,
        detail=f"Erreur lors de la génération de la réponse: {str(e)}"
    )
```

### Solution 2: Vérifier le Frontend
**Vérifier:** Le code frontend qui fait le login ne ferme pas la connexion prématurément

**Fichiers à vérifier:**
- `frontend/src/stores/authStore.ts`
- `frontend/src/api/axiosClient.ts`

### Solution 3: Ajouter Logging Détaillé
**Ajouter des logs avant et après chaque étape critique:**
```python
logger.info("Avant création LoginResponse")
response = LoginResponse(...)
logger.info("Après création LoginResponse, avant return")
return response
```

### Solution 4: Vérifier les Middlewares
**Vérifier:** Aucun middleware ne ferme le stream prématurément

**Fichiers à vérifier:**
- `api/src/recyclic_api/main.py` (configuration des middlewares)

---

## 📊 État Actuel

**L'API fonctionne:**
- ✅ Health check: OK
- ✅ Autres endpoints: OK
- ✅ Base de données: Connectée

**L'API plante:**
- ❌ `POST /v1/auth/login` retourne 500 avec `anyio.EndOfStream`
- ❌ Le refresh token est créé en DB mais la réponse n'est pas envoyée

---

## 🎯 Recommandations

1. **Priorité HAUTE:** Ajouter gestion d'erreur explicite dans `login()` avec logging détaillé
2. **Priorité MOYENNE:** Vérifier le code frontend qui fait le login
3. **Priorité BASSE:** Vérifier les middlewares pour voir s'ils interceptent le stream

---

## 📝 Notes Techniques

**anyio.EndOfStream:**
- Exception levée quand un stream asynchrone est fermé prématurément
- Se produit dans le middleware Starlette lors de `recv_stream.receive()`
- Indique que le client a fermé la connexion ou que le stream a été interrompu

**Pattern observé:**
- L'erreur se produit **après** le commit DB
- L'erreur se produit **avant** l'envoi de la réponse HTTP
- Le refresh token est créé mais la réponse n'est pas envoyée

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

