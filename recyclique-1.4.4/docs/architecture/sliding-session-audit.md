# Audit Technique - Session Glissante (B42-P1)

**Date:** 2025-11-26  
**Auteur:** James (Dev Agent)  
**Story:** B42-P1 - Audit & design de la session glissante

---

## 1. Diagramme de Cartographie Complète

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[App.jsx<br/>Ping Loop 5min]
        B[authStore.ts<br/>Zustand Store]
        C[axiosClient.ts<br/>Interceptor]
        D[localStorage<br/>Token Persistence]
    end

    subgraph "Backend API (FastAPI)"
        E[POST /v1/auth/login<br/>create_access_token]
        F[POST /v1/activity/ping<br/>ActivityService]
        G[get_current_user<br/>Dependency]
        H[verify_token<br/>JWT Validation]
    end

    subgraph "Core Security"
        I[security.py<br/>create_access_token]
        J[security.py<br/>get_token_expiration_minutes]
        K[security.py<br/>verify_token]
    end

    subgraph "Activity Service"
        L[ActivityService<br/>record_user_activity]
        M[Redis<br/>last_activity:user_id]
    end

    subgraph "Data Storage"
        N[(PostgreSQL<br/>Setting table)]
        O[(Redis<br/>User Cache)]
    end

    A -->|POST /v1/activity/ping| F
    B -->|Read Token| C
    C -->|Bearer Token| G
    D -->|Persist Token| B
    E -->|Generate Token| I
    F -->|Record Activity| L
    G -->|Verify JWT| H
    H -->|Decode Token| K
    I -->|Read Config| J
    J -->|Query| N
    L -->|Store| M
    G -->|Cache User| O
    E -->|Store Token| D
```

---

## 2. Cartographie des Composants

### Tableau: Composant / Rôle / Limites

| Composant | Localisation | Rôle | Limites & Contraintes |
|-----------|--------------|------|----------------------|
| **JWT Token Creation** | `api/src/recyclic_api/core/security.py`<br/>`create_access_token()` | Crée un token JWT avec expiration dynamique | - Durée d'expiration lue depuis DB (`get_token_expiration_minutes()`)<br/>- Valeur par défaut: 480 min (8h) si non configurée<br/>- Plage valide: 1-10080 min (1 min à 7 jours)<br/>- Algorithme: HS256<br/>- Payload contient: `sub` (user_id), `exp` |
| **Token Expiration Config** | `api/src/recyclic_api/core/security.py`<br/>`get_token_expiration_minutes()` | Récupère la durée d'expiration depuis la table `Setting` | - Clé DB: `token_expiration_minutes`<br/>- Valeur actuelle (selon story): 240 min (4h)<br/>- Cache: Aucun (lecture DB à chaque création de token)<br/>- Validation: 1 ≤ value ≤ 10080 |
| **Token Verification** | `api/src/recyclic_api/core/security.py`<br/>`verify_token()` | Vérifie et décode un token JWT | - Lève `HTTPException 401` si token invalide/expiré<br/>- Pas de vérification de révocation<br/>- Pas de blacklist de tokens |
| **User Authentication** | `api/src/recyclic_api/core/auth.py`<br/>`get_current_user()` | Dépendance FastAPI pour authentifier l'utilisateur | - Utilise `verify_token()` pour valider le JWT<br/>- Cache Redis (TTL: 300s) pour les requêtes GET/HEAD/OPTIONS<br/>- Vérifie `is_active` en DB si cache miss<br/>- Retourne `User` ou `CachedUser` |
| **Activity Service** | `api/src/recyclic_api/services/activity_service.py`<br/>`ActivityService` | Gère l'activité utilisateur en temps réel | - Stockage Redis: `last_activity:{user_id}`<br/>- Seuil d'inactivité: `activity_threshold_minutes` (défaut: 15 min)<br/>- TTL Redis: `threshold_minutes * 60 * 2` (double du seuil)<br/>- Cache en mémoire (classe) pour le seuil (TTL: 60s) |
| **Activity Ping Endpoint** | `api/src/recyclic_api/api/api_v1/endpoints/activity.py`<br/>`POST /v1/activity/ping` | Endpoint appelé périodiquement par le frontend | - Authentification requise (`get_current_user`)<br/>- Enregistre métadonnées (IP, user-agent, endpoint)<br/>- Fréquence frontend: toutes les 5 min (300s)<br/>- Arrêt si onglet caché (`document.hidden`) |
| **Frontend Auth Store** | `frontend/src/stores/authStore.ts`<br/>`useAuthStore` | Store Zustand pour l'état d'authentification | - Stockage token: `localStorage` (persistence) + mémoire (cache)<br/>- Pas de refresh token actuellement<br/>- Logout: supprime token + redirige `/login`<br/>- `initializeAuth()`: lit token au démarrage |
| **Axios Interceptor** | `frontend/src/api/axiosClient.ts` | Intercepte les requêtes/réponses HTTP | - Ajoute `Authorization: Bearer {token}` à chaque requête<br/>- Token lu depuis cache mémoire (Zustand)<br/>- Sur 401: supprime token + redirige `/login`<br/>- Ne déconnecte PAS sur 403 (permissions) |
| **App Ping Loop** | `frontend/src/App.jsx`<br/>`useEffect` (ligne 97-147) | Boucle de ping périodique | - Intervalle: 5 min (300000ms)<br/>- Condition: `isAuthenticated && !document.hidden`<br/>- Arrêt automatique si onglet caché<br/>- Démarrage au montage si authentifié |

---

## 3. Flux Actuel de Session

### 2.1 Connexion Initiale

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant DB as PostgreSQL
    participant R as Redis

    U->>F: Login (username/password)
    F->>A: POST /v1/auth/login
    A->>DB: Vérifier credentials
    A->>A: create_access_token()<br/>(expiration: 240 min)
    A->>F: {access_token, user}
    F->>F: localStorage.setItem('token')
    F->>F: authStore.setToken() (cache mémoire)
    F->>F: Démarre ping loop (5 min)
```

### 2.2 Utilisation Normale (Session Active)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API
    participant R as Redis

    loop Toutes les 5 minutes
        F->>A: POST /v1/activity/ping<br/>(Bearer token)
        A->>A: verify_token() (valide JWT)
        A->>A: get_current_user()
        A->>R: record_user_activity()<br/>TTL: 30 min (15*2)
        A->>F: 200 OK
    end
```

### 2.3 Expiration de Token

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API
    participant R as Redis

    F->>A: Requête API (token expiré)
    A->>A: verify_token() → JWTError
    A->>F: 401 Unauthorized
    F->>F: localStorage.removeItem('token')
    F->>F: authStore.setToken(null)
    F->>F: window.location.href = '/login'
```

---

## 4. Points de Couplage Identifiés

### 3.1 Couplage Token ↔ ActivityService

- **Problème:** Le token JWT et l'ActivityService sont indépendants
  - Le token expire après 240 min (fixe, basé sur `token_expiration_minutes`)
  - ActivityService track l'activité avec seuil de 15 min (configurable)
  - Aucune synchronisation entre les deux

- **Impact:** Un utilisateur actif peut être déconnecté après 4h même s'il ping toutes les 5 min

### 3.2 Stockage Token Frontend

- **Localisation:** `localStorage` (persistence) + mémoire Zustand (cache)
- **Risques:**
  - XSS: token accessible via JavaScript malveillant
  - Pas de protection CSRF si token dans localStorage
  - Pas de refresh token (nécessite re-login à expiration)

### 3.3 Absence de Révocation

- **Problème:** Un token JWT valide reste valide jusqu'à expiration
  - Pas de blacklist
  - Pas de vérification de révocation en DB
  - Logout ne révoque pas le token (juste suppression côté client)

---

## 5. Contraintes Techniques

### 4.1 Backend

- **JWT stateless:** Pas de session serveur, token auto-contenu
- **Redis disponible:** Utilisé pour ActivityService et cache utilisateur
- **PostgreSQL:** Table `Setting` pour configuration dynamique
- **Pas de table `user_sessions`:** Pas de tracking de sessions actives

### 4.2 Frontend

- **PWA Offline-First:** Doit fonctionner hors ligne (IndexedDB)
- **Pas de Service Worker pour auth:** Pas de refresh automatique en arrière-plan
- **localStorage:** Utilisé pour persistance (risque XSS)

---

## 6. Configuration Actuelle

| Paramètre | Valeur Actuelle | Source | Modifiable |
|-----------|----------------|--------|------------|
| `token_expiration_minutes` | 240 min (4h) | DB (`Setting` table) | Oui (super-admin) |
| `activity_threshold_minutes` | 15 min | DB (`Setting` table) | Oui (admin) |
| Ping interval frontend | 5 min (300s) | Code (`App.jsx`) | Non (hardcodé) |
| User cache TTL | 300s (5 min) | Code (`auth.py`) | Non (hardcodé) |

---

## 7. Tests Existants

- **`api/tests/test_session_settings.py`:** Tests des endpoints GET/PUT `/api/v1/admin/settings/session`
  - Validation des valeurs (1-10080 min)
  - Vérification des rôles (super-admin requis)
  - Valeur par défaut (480 min)

- **Tests E2E Auth:** À vérifier dans `frontend/src/test/e2e/` (Playwright)

---

## 8. Gaps Identifiés

1. **Pas de refresh token:** Nécessite re-login à expiration
2. **Pas de sliding expiration:** Token expire même si utilisateur actif
3. **Pas de synchronisation:** Token expiration ≠ ActivityService threshold
4. **Pas de révocation:** Token reste valide même après logout
5. **Risque XSS:** Token dans localStorage accessible via JavaScript
6. **Pas de gestion offline:** Token expire même si utilisateur revient après déconnexion réseau

---

## 9. Prochaines Étapes

Voir le document RFC: `docs/architecture/sliding-session-rfc.md` (à créer dans la tâche suivante)

