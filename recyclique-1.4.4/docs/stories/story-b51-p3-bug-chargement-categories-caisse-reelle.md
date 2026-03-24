# Story B51-P3: Bug chargement catégories – erreurs récurrentes en caisse réelle

**Statut:** Done  
**Épopée:** [EPIC-B51 – Stabilisation caisse réelle v1.4.2](../epics/epic-b51-stabilisation-caisse-reelle-v1.4.2.md)  
**Module:** Caisse réelle (Frontend + Backend catégories)  
**Priorité:** P1  

---

## 1. Contexte

Plusieurs fois dans la journée, les équipes en boutique constatent des **erreurs lors du chargement des catégories** sur la caisse réelle.  

Symptômes typiques (à confirmer précisément avec les retours terrain) :

- Message d’erreur du type « Erreur lors du chargement des catégories » (ou message équivalent affiché sur l’écran de caisse),  
- Écran partiellement vide ou bloqué (boutons de catégories non visibles ou non cliquables),  
- Sensation de “problème réseau” (peut être intermittent, parfois résolu par un refresh / rechargement de la page).  

On ne sait pas encore si :

- le problème est **réseau/infrastructure** (Wi-Fi/4G, timeouts, 5xx),  
- lié à l’API catégories (temps de réponse, 4xx/5xx, pagination, permissions),  
- lié à la **gestion d’erreurs côté front** (absence de retry, erreurs silencieuses, UX pauvre),  
- ou lié à la **session / authentification** (token expiré, permissions manquantes).

Pour le contexte produit global et la priorisation de ce bug, se référer à :  
- `../epics/epic-b51-stabilisation-caisse-reelle-v1.4.2.md`, partie sur les problèmes de chargement de catégories (si présente),  
- et, côté frontend, aux patterns de gestion d’erreurs décrits dans l’architecture UI dans `../architecture/architecture.md` (si applicable).

---

## 2. User Story

En tant qu’**opérateur de caisse**,  
je veux que **les catégories se chargent de manière fiable pendant la journée**,  
afin de **pouvoir continuer à encaisser sans interruption et sans devoir relancer l’application**.  

En cas de vrai problème réseau,  
je veux **voir un message compréhensible** et avoir une action possible (ex. “Réessayer”),  
afin de **savoir quoi faire sans bloquer l’activité**.

---

## 3. Critères d’acceptation

1. **Chargement fiable en conditions normales**  
   - Sur une utilisation “normale” de la caisse réelle, les catégories se chargent sans erreur bloquante.  

2. **Gestion explicite des vrais problèmes réseau / API**  
   - Si le backend renvoie un timeout ou une erreur 5xx, l’UI :
     - affiche un message d’erreur clair,  
     - propose au moins une action (ex. “Réessayer”).  

3. **Gestion des erreurs d’authentification / permissions**  
   - Si la session est expirée ou si les permissions sont insuffisantes, le message ou le comportement doivent être cohérents (rediriger vers login, message adéquat, etc.).  

4. **Pas de crash UI**  
   - Aucune erreur JS non gérée ne doit casser complètement l’interface de caisse lors du chargement des catégories.  

5. **Tests**  
   - Des tests couvrent au minimum :
     - succès de chargement,  
     - erreur réseau simulée,  
     - erreur API simulée (4xx/5xx).  

---

## 4. Intégration & Compatibilité

**Backend API :**

- Endpoints de récupération des catégories (chemins `/v1/categories/...` ou équivalent), par exemple un endpoint principal de type `GET /v1/categories` éventuellement filtré par site / caisse.  
- Gestion des permissions sur ces endpoints (liées aux rôles / sites / caisses).  

**Frontend :**

- Composants de caisse qui déclenchent le chargement des catégories dès l’arrivée sur l’écran principal de caisse réelle, ou lors de certains événements (changement de site, de caisse, navigation entre catégories/racines, etc.).  
- Hooks / stores qui encapsulent l’appel API catégories (store de caisse ou hooks dédiés au chargement des catégories).  
- Gestion d’erreurs et affichage (toasts, bannières, écrans d’erreur) alignés avec les patterns existants de gestion d’erreurs dans le frontend Recyclic.  

**Contraintes :**

- Respecter les patterns existants de gestion d’erreurs dans le projet (pas introduire un 4e style de gestion d’erreurs).  
- Ne pas dégrader les performances sur des connexions déjà limites.  

---

## 5. Dev Notes (incluant investigation prod)

### 5.1. Accès Frontend (reproduction / observation)

- Connexion :  
  - **Login** : `admintest`  
  - **Password** : `AdminTest1!`  

Actions recommandées :

1. Identifier les écrans/flux où les catégories sont chargées (ou rechargées) :  
   - ouverture de caisse,  
   - changement de catégorie racine,  
   - navigation sur l’écran de caisse, etc.  
2. Observer avec DevTools :
   - requêtes XHR/fetch vers les endpoints de catégories,  
   - codes HTTP de réponse,  
   - temps de réponse,  
   - gestion des erreurs (toast, message à l’écran, silence total).  

### 5.2. Investigation côté VPS (logs API / proxy)

> À adapter à l’infra réelle ; ces commandes illustrent la démarche.

**Logs API (service catégories) :**

```bash
# Filtrer les logs API sur les endpoints catégories sur un créneau horaire problématique
docker-compose logs api | grep -i "categor" | tail -n 200
```

Objectif :
- repérer d’éventuels bursts d’erreurs (4xx, 5xx),  
- vérifier si les temps de réponse sont anormaux (timeouts, latence élevée).  

**Logs reverse-proxy (si Nginx/Traefik en frontal) :**

- Vérifier s’il existe des 502/504/timeout sur les routes catégories.  

### 5.3. Pistes techniques

- **Côté réseau / infra** :
  - vérifier s’il y a des pertes de connexion fréquentes ou des timeouts sur la route de la boutique.  

- **Côté API** :
  - vérifier la complexité des requêtes catégories (filtrage, jointures),  
  - vérifier si une pagination ou un filtrage incorrect peuvent faire échouer la requête dans certains cas.  

- **Côté Frontend** :
  - vérifier si les erreurs 4xx/5xx sont bien interceptées,  
  - vérifier s’il existe des retries raisonnables ou une simple erreur silencieuse,  
  - vérifier l’état de la session / du token au moment de l’erreur (token expiré -> 401/403).  

---

## 6. Tasks / Subtasks

- [ ] **T1 – Observation côté front**  
  - [ ] Reproduire / observer les erreurs avec `admintest`  
  - [ ] Capturer les requêtes réseau et réponses (y compris codes HTTP)  

- [ ] **T2 – Analyse des logs API et proxy**  
  - [ ] Lancer les commandes VPS proposées sur les créneaux horaires problématiques  
  - [ ] Identifier les erreurs fréquentes (4xx, 5xx, timeouts) sur les endpoints catégories  

- [ ] **T3 – Analyse de la gestion d’erreurs UI**  
  - [ ] Auditer le code frontend qui charge les catégories (hooks/stores/composants)  
  - [ ] Vérifier comment les erreurs sont gérées et affichées  

- [ ] **T4 – Implémentation du fix**  
  - [ ] Côté backend : améliorer robustesse / latence / clarté des codes d’erreur si nécessaire  
  - [ ] Côté frontend :  
    - afficher un message d’erreur clair,  
    - proposer un bouton “Réessayer” ou similar,  
    - éventuellement ajouter un retry automatique raisonnable.  

- [ ] **T5 – Validation**  
  - [ ] Vérifier en environnement de test, puis en caisse réelle, que :  
    - les catégories se chargent de façon fiable,  
    - en cas de vrai problème réseau/serveur, l’UX est acceptable.  

---

## 7. Testing

**Frontend (recommandé) :**

- Tests unitaires/integration sur le hook/store de chargement des catégories, avec :
  - succès,  
  - erreur 500,  
  - erreur réseau (timeout simulé).  

**Backend :**

- Tests (si nécessaire) sur la performance et la stabilité de l’endpoint catégories (limites raisonnables de temps de réponse).  

---

## 8. Change Log

| Date       | Version | Description                                         | Auteur            |
| ---------- | ------- | --------------------------------------------------- | ----------------- |
| 2025-12-16 | 0.1     | Création initiale de la story B51-P3               | BMad Orchestrator |
| 2025-01-27 | 0.2     | Diagnostic complet du problème                     | James (Dev Agent) |

## 9. Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### Debug Log References
- **Diagnostic effectué le 2025-01-27** : Analyse complète du code frontend et backend pour identifier les points de défaillance potentiels dans le chargement des catégories

### Diagnostic Complet (T3 - Analyse de la gestion d'erreurs UI)

#### 1. Architecture actuelle du chargement des catégories

**Flux de chargement :**
1. `Sale.tsx` (ligne 248-250) : Appelle `fetchCategories()` au montage du composant
2. `categoryStore.ts` (ligne 41-74) : `fetchCategories()` appelle `categoryService.getCategories()`
3. `categoryService.ts` (ligne 52-58) : Appel API `GET /v1/categories/` via `api.get()`
4. `CategorySelector.tsx` (ligne 81-83) : Réutilise `fetchCategories()` dans un `useEffect`

**Endpoints backend utilisés :**
- `GET /api/v1/categories/` (principal, utilisé par la caisse)
- `GET /api/v1/categories/entry-tickets` (pour réception, avec fallback)
- `GET /api/v1/categories/sale-tickets` (pour caisse, toujours toutes les catégories)

#### 2. Problèmes identifiés dans la gestion d'erreurs

**A. Store `categoryStore.ts` - Gestion d'erreurs basique :**

```69:74:frontend/src/stores/categoryStore.ts
        } catch (error: any) {
          set({
            loading: false,
            error: error.response?.data?.detail || 'Erreur lors du chargement des catégories',
          });
        }
```

**Problèmes :**
- ❌ **Pas de retry automatique** : En cas d'erreur réseau temporaire (timeout, 5xx), l'erreur est stockée mais aucun retry n'est tenté
- ❌ **Pas de distinction entre types d'erreurs** : Erreur réseau (timeout), erreur serveur (5xx), erreur auth (401/403) sont toutes traitées de la même manière
- ❌ **Cache non invalidé en cas d'erreur** : Si une erreur survient, le cache reste avec les anciennes données (ou vide), mais aucune stratégie de récupération n'est mise en place
- ❌ **Message d'erreur générique** : Le message "Erreur lors du chargement des catégories" ne donne pas d'indication sur la cause (réseau, serveur, permissions)

**B. Composant `CategorySelector.tsx` - Affichage d'erreur minimal :**

```93:99:frontend/src/components/business/CategorySelector.tsx
  if (error) {
    return (
      <div role="alert" aria-live="assertive">
        Erreur lors du chargement des catégories: {error}
      </div>
    )
  }
```

**Problèmes :**
- ❌ **Pas de bouton "Réessayer"** : L'utilisateur ne peut pas relancer le chargement sans recharger toute la page
- ❌ **Pas de distinction visuelle** : L'erreur est affichée mais sans indication claire de la gravité ou de l'action possible
- ❌ **Pas de gestion du cas "offline"** : Aucune détection spécifique pour les problèmes de connexion réseau

**C. Service `categoryService.ts` - Pas de gestion d'erreurs spécifique :**

```52:58:frontend/src/services/categoryService.ts
  async getCategories(isActive?: boolean, includeArchived?: boolean): Promise<Category[]> {
    const params: any = {};
    if (isActive !== undefined) params.is_active = isActive;
    if (includeArchived !== undefined) params.include_archived = includeArchived;
    const response = await api.get('/v1/categories/', { params });
    return response.data;
  }
```

**Problèmes :**
- ❌ **Pas de timeout configuré** : Utilise le timeout par défaut d'axios (peut être très long)
- ❌ **Pas de retry** : Une seule tentative, pas de retry automatique
- ❌ **Pas de gestion spécifique des erreurs HTTP** : Toutes les erreurs remontent au store sans distinction

**D. Client axios `axiosClient.ts` - Gestion partielle :**

```93:164:frontend/src/api/axiosClient.ts
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // B42-P3: Handle 401 with automatic token refresh (single retry)
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
```

**Points positifs :**
- ✅ **Gestion 401 avec refresh automatique** : Les erreurs d'authentification sont gérées avec un retry automatique après refresh du token
- ✅ **Queue de requêtes** : Les requêtes en attente sont mises en queue pendant le refresh

**Problèmes :**
- ❌ **Pas de gestion spécifique pour 5xx** : Les erreurs serveur (500, 502, 503, 504) ne sont pas distinguées des autres erreurs
- ❌ **Pas de retry pour les timeouts réseau** : Les erreurs de timeout (ECONNABORTED, ETIMEDOUT) ne déclenchent pas de retry
- ❌ **Pas de gestion du mode offline** : Aucune détection spécifique pour les problèmes de connexion

#### 3. Points de défaillance potentiels

**A. Réseau/Infrastructure :**
- Timeouts réseau non gérés (Wi-Fi instable, 4G faible)
- Erreurs 502/504 du reverse-proxy non distinguées
- Pas de détection du mode offline du navigateur

**B. Backend API :**
- Endpoint `/v1/categories/` peut être lent si beaucoup de catégories (pas de pagination visible)
- Pas de timeout explicite côté backend documenté
- Erreurs 5xx non différenciées des autres erreurs côté frontend

**C. Authentification/Session :**
- Token expiré : ✅ Géré (refresh automatique)
- Permissions insuffisantes (403) : ⚠️ Géré mais message générique
- Session expirée pendant le chargement : ⚠️ Peut causer une erreur silencieuse

**D. Cache et état :**
- Cache de 5 minutes peut servir des données obsolètes si erreur survient
- Pas de stratégie de fallback vers cache en cas d'erreur réseau
- État `loading` reste `false` après erreur, mais aucune indication de "retry possible"

#### 4. Scénarios de bugs probables

**Scénario 1 : Timeout réseau intermittent**
1. Utilisateur ouvre la caisse
2. `fetchCategories()` est appelé
3. Requête timeout (réseau instable)
4. Erreur stockée dans le store
5. `CategorySelector` affiche "Erreur lors du chargement des catégories"
6. ❌ **Pas de retry automatique** → Utilisateur doit recharger la page

**Scénario 2 : Erreur 5xx serveur temporaire**
1. Backend retourne 500/502/503 (surcharge temporaire)
2. Erreur stockée dans le store
3. Message générique affiché
4. ❌ **Pas de retry avec backoff** → Utilisateur bloqué

**Scénario 3 : Token expiré pendant le chargement**
1. Token expire entre deux requêtes
2. Refresh automatique fonctionne (✅)
3. Mais si le refresh échoue, l'erreur est générique
4. ⚠️ **Pas de redirection claire vers login** si refresh échoue définitivement

**Scénario 4 : Mode offline**
1. Connexion perdue (Wi-Fi coupé)
2. Requête échoue
3. ❌ **Pas de détection du mode offline** → Message d'erreur générique
4. ❌ **Pas de retry automatique quand connexion revient**

#### 5. Recommandations pour le fix (T4)

**Priorité 1 - UX immédiate :**
1. **Ajouter un bouton "Réessayer"** dans `CategorySelector` quand `error !== null`
2. **Améliorer le message d'erreur** pour distinguer :
   - Erreur réseau (timeout, offline) → "Problème de connexion. Vérifiez votre connexion internet."
   - Erreur serveur (5xx) → "Le serveur est temporairement indisponible. Veuillez réessayer."
   - Erreur permissions (403) → "Vous n'avez pas les permissions nécessaires."
   - Erreur auth (401 après refresh échoué) → Redirection vers login

**Priorité 2 - Robustesse :**
3. **Retry automatique avec backoff exponentiel** dans `categoryStore.fetchCategories()` :
   - 1er retry après 1 seconde
   - 2e retry après 2 secondes
   - 3e retry après 4 secondes
   - Maximum 3 tentatives
4. **Détection du mode offline** : Utiliser `navigator.onLine` et écouter les événements `online`/`offline`
5. **Timeout explicite** : Configurer un timeout de 10 secondes pour les requêtes catégories

**Priorité 3 - Monitoring :**
6. **Logging structuré** : Logger les erreurs avec contexte (type d'erreur, code HTTP, timestamp)
7. **Métriques** : Tracker le taux d'échec et les temps de réponse des requêtes catégories

#### 6. Fichiers à modifier (estimation)

**Frontend :**
- `frontend/src/stores/categoryStore.ts` : Ajouter retry avec backoff, améliorer gestion d'erreurs
- `frontend/src/components/business/CategorySelector.tsx` : Ajouter bouton "Réessayer", améliorer messages d'erreur
- `frontend/src/services/categoryService.ts` : Ajouter timeout explicite, améliorer gestion d'erreurs HTTP
- `frontend/src/api/axiosClient.ts` : (Optionnel) Améliorer gestion des erreurs 5xx et timeouts

**Backend (si nécessaire après analyse logs) :**
- `api/src/recyclic_api/api/api_v1/endpoints/categories.py` : Vérifier performance, ajouter timeout si nécessaire
- `api/src/recyclic_api/services/category_service.py` : Optimiser requêtes si lenteur identifiée

**Tests :**
- `frontend/src/stores/__tests__/categoryStore.test.ts` : Ajouter tests pour retry, gestion d'erreurs
- `frontend/src/components/business/__tests__/CategorySelector.test.tsx` : Ajouter tests pour bouton "Réessayer", messages d'erreur

### Completion Notes List
- ⏳ **Diagnostic terminé** - Analyse complète effectuée, prêt pour implémentation

### File List
- Aucun fichier modifié (diagnostic uniquement)

### Change Log
- **Diagnostic** : Analyse complète de la gestion d'erreurs dans le chargement des catégories
  - Identification de 4 scénarios de bugs probables
  - Recommandations prioritaires pour le fix
  - Liste des fichiers à modifier estimée


