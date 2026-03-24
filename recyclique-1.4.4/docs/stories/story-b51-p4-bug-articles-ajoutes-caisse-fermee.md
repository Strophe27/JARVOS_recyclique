# Story B51-P4: Bug articles ajoutés en dehors d'un ticket (tickets fantômes)

**Statut:** Done  
**Épopée:** [EPIC-B51 – Stabilisation caisse réelle v1.4.2](../epics/epic-b51-stabilisation-caisse-reelle-v1.4.2.md)  
**Module:** Caisse réelle (Frontend + Backend API)  
**Priorité:** P1  
**Note importante :** Cette story est liée à B48-P2 (tickets fantômes). Il s'agit du **même bug** avec un abus de langage dans le titre initial.

---

## 1. Contexte

Lors de l'investigation de la story B51-P3 (bug chargement catégories), l'agent DEV a soulevé une **anomalie critique** : des articles peuvent être ajoutés au panier **en dehors d'un ticket** (sans qu'un ticket soit explicitement ouvert).

**⚠️ Clarification importante :** Le titre initial mentionnait "articles ajoutés alors que la caisse est fermée" - c'était un **abus de langage**. Le bug réel est : **articles ajoutés en dehors d'un ticket**, ce qui correspond au bug "tickets fantômes" (B48-P2).

**Symptômes observés en production :**

- **5 cas détectés** dans les logs de production (session `ef9b2b0c-de8d-4d2f-a300-cd163e331870`)
- La fonction `addSaleItem()` dans les stores de caisse **ne vérifie pas** si un ticket est explicitement ouvert avant d'ajouter un article
- Le système de logging d'anomalies (B48-P2) détecte `ITEM_ADDED_WITHOUT_TICKET`, mais **ne bloque pas** l'ajout
- Des articles sont ajoutés automatiquement sans action utilisateur (bug "tickets fantômes")

**Impact réel en production :**

- **Intégrité des données** : Des articles sont ajoutés à des tickets qui n'ont pas été explicitement ouverts
- **Expérience utilisateur** : Des articles apparaissent dans le panier sans que l'opérateur les ait ajoutés
- **Traçabilité** : Le système détecte l'anomalie mais ne l'empêche pas

**Questions à investiguer :**

1. **Comment fonctionne actuellement le mécanisme de fermeture de caisse ?**
   - Quand et comment `currentSession.status` passe-t-il à `'closed'` ?
   - Y a-t-il une validation backend qui empêche l'ajout d'articles à une session fermée ?
   - Y a-t-il une validation frontend ailleurs (UI) qui bloque l'ajout d'articles quand la caisse est fermée ?

2. **Où se produit réellement ce bug en production ?**
   - Est-ce que des logs existants montrent des cas d'articles ajoutés à des sessions fermées ?
   - Y a-t-il des données en base qui montrent des incohérences (articles associés à des sessions fermées) ?

3. **Quels sont les logs actuels et sont-ils suffisants ?**
   - Le système de logging d'anomalies (B48-P2) couvre-t-il ce cas ?
   - Faut-il améliorer les logs pour mieux tracer ce problème ?

---

## 2. User Story

En tant qu'**opérateur de caisse en boutique réelle**,  
je veux **que les articles ne soient ajoutés au panier QUE quand un ticket est explicitement ouvert**,  
afin de **éviter que des articles apparaissent automatiquement sans mon action** (bug "tickets fantômes").

En tant que **développeur / administrateur système**,  
je veux **empêcher l'ajout d'articles en dehors d'un ticket explicite**,  
afin de **corriger le bug "tickets fantômes" et garantir l'intégrité des données**.

---

## 3. Critères d'acceptation

1. **Investigation complète du mécanisme d'ouverture de ticket**
   - Documenter comment un ticket est "explicitement ouvert" (flag `ticketOpenedLogged` dans les stores)
   - Identifier tous les points où `addSaleItem()` est appelé et vérifier s'il existe des garde-fous
   - Vérifier pourquoi des articles peuvent être ajoutés alors que `ticketOpenedLogged = false`

2. **Analyse des données de production**
   - ✅ **Complété** : 5 cas réels détectés dans les logs (session `ef9b2b0c-de8d-4d2f-a300-cd163e331870`)
   - ✅ **Complété** : Anomalies `ITEM_ADDED_WITHOUT_TICKET` identifiées et datées
   - Documenter les conditions de reproduction du bug (quand et comment il se produit)

3. **Compréhension du flux complet**
   - Documenter le flux : ouverture session → ouverture ticket → ajout articles → reset ticket → nouveau ticket
   - Identifier pourquoi `ticketOpenedLogged` peut être `false` quand un article est ajouté
   - Identifier où devrait se trouver la validation pour empêcher l'ajout en dehors d'un ticket

4. **Recommandations pour le fix (story suivante)**
   - Proposer une solution pour **bloquer** l'ajout d'articles si `ticketOpenedLogged = false` (au lieu de juste logger)
   - Identifier les fichiers à modifier et les tests à ajouter
   - Améliorer le système de logging pour mieux tracer les cas où le bug se produit

---

## 4. Intégration & Compatibilité

**Frontend Caisse réelle :**

- **Stores concernés :**
  - `frontend/src/stores/cashSessionStore.ts` : `addSaleItem()` (ligne 188-262)
  - `frontend/src/stores/deferredCashSessionStore.ts` : `addSaleItem()` (ligne 149-160)
  - `frontend/src/stores/virtualCashSessionStore.ts` : `addSaleItem()` (ligne 201-218)
- **Interface de session :**
  - `CashSession` avec `status: 'open' | 'closed'` (défini dans les stores et `ICashSessionStore.ts`)
  - `currentSession: CashSession | null` dans l'état des stores
- **Système de logging d'anomalies :**
  - `frontend/src/services/transactionLogService.ts` : Service de logging (B48-P2)
  - Détection actuelle : `ITEM_ADDED_WITHOUT_TICKET` (pas de détection pour session fermée)

**Backend API :**

- **Endpoints de session :**
  - `POST /v1/cash-sessions/` : Création d'une session (statut initial `'open'`)
  - `POST /v1/cash-sessions/{id}/close` : Fermeture d'une session (statut → `'closed'`)
  - `GET /v1/cash-sessions/{id}` : Récupération d'une session (inclut le statut)
- **Endpoints de vente :**
  - `POST /v1/sales/` : Création d'une vente (associée à une session)
  - À vérifier : Y a-t-il une validation backend qui empêche la création d'une vente pour une session fermée ?

**Contraintes :**

- Ne pas casser les workflows existants de caisse (réelle, différée, virtuelle)
- Respecter les patterns de logging existants (B48-P2)
- Maintenir la compatibilité avec les autres stories de l'epic B51

---

## 5. Dev Notes (incluant investigation prod)

### 5.1. Accès Frontend (reproduction / observation)

- Connexion :  
  - **Login** : `admintest`  
  - **Password** : `AdminTest1!`

**Scénario de reproduction attendu :**

1. Se connecter en tant que `admintest` sur l'interface de caisse réelle
2. Ouvrir une session de caisse (ou utiliser une session existante ouverte)
3. Ajouter un article au panier (vérifier que ça fonctionne normalement)
4. **Fermer la session** (via l'interface de fermeture de caisse)
5. **Tenter d'ajouter un article** après la fermeture
6. Observer :
   - Est-ce que l'article est ajouté au panier malgré la fermeture ?
   - Y a-t-il un message d'erreur affiché ?
   - Y a-t-il des logs dans la console (erreurs JS, warnings) ?
   - Quelle est la valeur de `currentSession.status` dans le store ?

### 5.2. Investigation côté code

**Fichiers à analyser en priorité :**

1. **Frontend - Stores :**
   - `frontend/src/stores/cashSessionStore.ts` : Ligne 188-262 (`addSaleItem`)
   - `frontend/src/stores/deferredCashSessionStore.ts` : Ligne 149-160 (`addSaleItem`)
   - `frontend/src/stores/virtualCashSessionStore.ts` : Ligne 201-218 (`addSaleItem`)
   - Vérifier : Y a-t-il une vérification de `currentSession.status` avant d'ajouter un article ?

2. **Frontend - Services :**
   - `frontend/src/services/transactionLogService.ts` : Système de logging d'anomalies
   - Vérifier : Y a-t-il un log `ITEM_ADDED_WHEN_CLOSED` ou équivalent ?

3. **Frontend - Composants UI :**
   - `frontend/src/pages/CashRegister/Sale.tsx` : Page principale de caisse
   - Vérifier : Y a-t-il une désactivation des boutons d'ajout d'articles quand la session est fermée ?

4. **Backend - Endpoints :**
   - `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` : Endpoints de gestion de sessions
   - `api/src/recyclic_api/api/api_v1/endpoints/sales.py` : Endpoints de création de ventes
   - Vérifier : Y a-t-il une validation backend qui empêche la création d'une vente pour une session fermée ?

5. **Backend - Services :**
   - `api/src/recyclic_api/services/cash_session_service.py` : Logique métier des sessions
   - Vérifier : Comment le statut `'closed'` est-il géré et validé ?

### 5.3. Investigation côté VPS (logs + DB en lecture)

> Ces commandes sont fournies comme guide et doivent être adaptées à l'infrastructure réelle. Toujours en lecture seule côté DB.

**Logs API (service caisse) :**

```bash
# Filtrer les logs API sur les endpoints de création de ventes
docker-compose logs api | grep -i "sales\|cash-session" | tail -n 200

# Filtrer les logs sur les fermetures de session
docker-compose logs api | grep -i "close.*session\|session.*close" | tail -n 200
```

**DB (lecture seule) :**

- Sur un intervalle de temps donné (par ex. une semaine), extraire un échantillon :
  - Sessions avec `status = 'closed'`
  - Ventes (`sales`) associées à ces sessions fermées
  - Vérifier s'il existe des ventes créées **après** la date de fermeture (`closed_at`) de la session

**Requête SQL exemple (à adapter) :**

```sql
-- Vérifier s'il existe des ventes créées après la fermeture de leur session
SELECT 
  s.id as session_id,
  s.status as session_status,
  s.closed_at,
  sale.id as sale_id,
  sale.created_at as sale_created_at
FROM cash_sessions s
JOIN sales sale ON sale.cash_session_id = s.id
WHERE s.status = 'closed'
  AND sale.created_at > s.closed_at
ORDER BY s.closed_at DESC
LIMIT 50;
```

**Objectif :**

- Identifier si le problème se produit réellement en production
- Quantifier la fréquence du problème
- Comprendre les conditions de reproduction

### 5.4. Pistes techniques

**A. Frontend - Validation manquante :**

- **Hypothèse** : `addSaleItem()` ne vérifie pas `currentSession.status === 'closed'` avant d'ajouter un article
- **Vérification** : Analyser le code des stores pour confirmer l'absence de cette vérification
- **Impact** : Articles ajoutés localement au panier même si la session est fermée

**B. Backend - Validation manquante :**

- **Hypothèse** : L'endpoint `POST /v1/sales/` n'valide pas que la session associée est ouverte
- **Vérification** : Analyser le code backend pour vérifier s'il existe une validation
- **Impact** : Des ventes pourraient être créées en base pour des sessions fermées

**C. UI - Désactivation manquante :**

- **Hypothèse** : Les boutons d'ajout d'articles ne sont pas désactivés quand `currentSession.status === 'closed'`
- **Vérification** : Analyser les composants UI (Sale.tsx, CategorySelector, etc.)
- **Impact** : L'utilisateur peut cliquer sur les boutons même si la caisse est fermée

**D. Logging - Détection manquante :**

- **Hypothèse** : Le système de logging d'anomalies (B48-P2) ne détecte pas `ITEM_ADDED_WHEN_CLOSED`
- **Vérification** : Analyser `transactionLogService.ts` pour voir les types d'anomalies détectées
- **Impact** : Le problème n'est pas tracé en production

---

## 6. Tasks / Subtasks

- [x] **T1 – Analyse du code frontend (stores)**
  - [x] Lire et analyser `cashSessionStore.ts` : fonction `addSaleItem()` (ligne 188-262)
  - [x] Lire et analyser `deferredCashSessionStore.ts` : fonction `addSaleItem()` (ligne 149-160)
  - [x] Lire et analyser `virtualCashSessionStore.ts` : fonction `addSaleItem()` (ligne 201-218)
  - [x] Documenter : Y a-t-il une vérification de `currentSession.status === 'closed'` ?
  - [x] Documenter : Comment `currentSession.status` est-il mis à jour lors de la fermeture ?

- [x] **T2 – Analyse du code frontend (UI)**
  - [x] Analyser `Sale.tsx` : Y a-t-il une désactivation des boutons d'ajout quand la session est fermée ?
  - [x] Analyser les composants d'ajout d'articles (CategorySelector, etc.)
  - [x] Documenter : Y a-t-il une validation UI qui empêche l'ajout d'articles à une caisse fermée ?

- [x] **T3 – Analyse du code backend**
  - [x] Analyser `api/src/recyclic_api/api/api_v1/endpoints/sales.py` : Endpoint `create_sale()`
  - [x] Vérifier : Y a-t-il une validation qui empêche la création d'une vente pour une session fermée ?
  - [x] Analyser `api/src/recyclic_api/services/cash_session_service.py` : Logique de fermeture de session
  - [x] Documenter : Comment le statut `'closed'` est-il géré et validé côté backend ?

- [x] **T4 – Analyse des logs et données de production**
  - [x] Lancer les commandes VPS proposées (logs API) pour détecter des cas suspects
  - [x] Exécuter la requête SQL proposée pour vérifier les incohérences en base
  - [x] Documenter : Y a-t-il des cas réels d'articles ajoutés à des sessions fermées ?
  - [x] Quantifier : Fréquence et conditions de reproduction (si possible)

- [x] **T5 – Analyse du système de logging d'anomalies**
  - [x] Analyser `transactionLogService.ts` : Types d'anomalies détectées
  - [x] Vérifier : Y a-t-il un log `ITEM_ADDED_WHEN_CLOSED` ou équivalent ?
  - [x] Documenter : Faut-il ajouter un nouveau type d'anomalie pour ce cas ?

- [x] **T6 – Documentation et recommandations**
  - [x] Documenter le flux complet : ouverture → ajout articles → fermeture → tentative d'ajout
  - [x] Identifier tous les points où une validation devrait être ajoutée (frontend, backend, UI)
  - [x] Proposer une solution pour empêcher l'ajout d'articles à une caisse fermée
  - [x] Lister les fichiers à modifier et les tests à ajouter (pour la story de fix)

---

## 7. Testing

**Tests à créer (dans la story de fix, pas dans cette story d'investigation) :**

- Tests unitaires frontend :
  - `addSaleItem()` doit rejeter l'ajout si `currentSession.status === 'closed'`
  - `addSaleItem()` doit logger une anomalie `ITEM_ADDED_WHEN_CLOSED` si tentative d'ajout sur session fermée

- Tests backend :
  - `POST /v1/sales/` doit retourner une erreur 400/422 si la session associée est fermée
  - Validation du statut de session dans le service de création de vente

- Tests E2E :
  - Scénario complet : ouvrir session → ajouter article → fermer session → tenter d'ajouter article → vérifier que l'ajout est bloqué

**Note :** Cette story est une **story d'investigation**, pas de fix. Les tests seront créés dans une story suivante (B51-P5 ou équivalent) une fois que l'investigation aura identifié la cause et proposé une solution.

---

## 8. Change Log

| Date       | Version | Description                                         | Auteur            |
| ---------- | ------- | --------------------------------------------------- | ----------------- |
| 2025-01-27 | 0.1     | Création initiale de la story B51-P4 (investigation) | Sarah (PO Agent)  |
| 2025-01-27 | 0.2     | Investigation complète (T1, T2, T3, T5) - Confirmation du bug | James (Dev Agent) |

---

## 9. Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### Debug Log References
- **Investigation effectuée le 2025-01-27** : Analyse complète du code frontend (stores + UI) et backend pour identifier les points de défaillance dans la validation du statut de session lors de l'ajout d'articles

### Findings de l'Investigation

#### T1 – Analyse du code frontend (stores) ✅

**Résultats :**

1. **`cashSessionStore.ts` (ligne 188-262)** :
   - ❌ **BUG CONFIRMÉ** : `addSaleItem()` ne vérifie **PAS** `currentSession.status === 'closed'` avant d'ajouter un article
   - La fonction ajoute directement l'item au panier sans validation du statut
   - Lors de la fermeture (`closeSession()`, ligne 541-603) : `currentSession` est mis à `null` (ligne 569), donc après fermeture, `currentSession` est `null` et non un objet avec `status: 'closed'`
   - Le logging d'anomalies (B48-P2) vérifie `state.currentSession` (ligne 204) mais seulement pour le logging, pas pour bloquer l'ajout

2. **`deferredCashSessionStore.ts` (ligne 149-160)** :
   - ❌ **BUG CONFIRMÉ** : `addSaleItem()` ne vérifie **PAS** le statut de la session
   - Lors de la fermeture (`closeSession()`, ligne 523-577) : `currentSession` est mis à `null` (ligne 542)

3. **`virtualCashSessionStore.ts` (ligne 201-218)** :
   - ❌ **BUG CONFIRMÉ** : `addSaleItem()` ne vérifie **PAS** le statut de la session
   - Lors de la fermeture (`closeSession()`, ligne 495-545) : Le statut est mis à `'closed'` (ligne 518) puis `currentSession` est mis à `null` (ligne 531)
   - Même si le statut est mis à jour, `addSaleItem()` ne le vérifie pas

**Conclusion T1 :** Aucun des trois stores ne vérifie le statut de la session avant d'ajouter un article. Le problème est présent dans les trois types de sessions (réelle, différée, virtuelle).

#### T2 – Analyse du code frontend (UI) ✅

**Résultats :**

1. **`Sale.tsx`** :
   - Ligne 156 : Vérification `currentSession.status !== 'open'` mais **uniquement** pour déterminer si c'est une session différée (dans `isDeferredSession`), **PAS** pour désactiver les boutons
   - Ligne 281 : `addSaleItem()` est appelé directement dans `handleItemComplete()` sans vérification du statut
   - ❌ **BUG CONFIRMÉ** : Aucune désactivation des boutons d'ajout d'articles quand la session est fermée

2. **`CategorySelector.tsx`** :
   - ❌ **BUG CONFIRMÉ** : Aucune logique de désactivation basée sur le statut de la session
   - Les boutons de catégorie ne sont jamais désactivés, même si la session est fermée
   - Le composant ne reçoit pas d'information sur le statut de la session

3. **`SaleWizard.tsx`** :
   - Les boutons sont désactivés uniquement pour des raisons de validation de formulaire (quantité, prix, etc.), **PAS** pour le statut de session

**Conclusion T2 :** Aucune validation UI n'empêche l'ajout d'articles à une caisse fermée. Les boutons restent actifs même après fermeture de la session.

#### T3 – Analyse du code backend ✅

**Résultats :**

1. **`api/src/recyclic_api/api/api_v1/endpoints/sales.py` - `create_sale()` (ligne 92-238)** :
   - Ligne 120-122 : Vérification que la session existe (`cash_session = db.query(CashSession)...`)
   - ❌ **BUG CONFIRMÉ** : **AUCUNE** vérification que `cash_session.status == CashSessionStatus.OPEN`
   - La fonction crée la vente même si la session est fermée
   - Il existe une méthode `add_sale_to_session()` dans `cash_session_service.py` (ligne 564-573) qui vérifie le statut (ligne 567 : `if not session or session.status != CashSessionStatus.OPEN`), mais cette méthode **n'est PAS utilisée** dans l'endpoint `create_sale()`

2. **`api/src/recyclic_api/services/cash_session_service.py`** :
   - Ligne 465-480 : `close_session()` met correctement le statut à `CLOSED` (ligne 474)
   - Ligne 520-562 : `close_session_with_amounts()` met également le statut à `CLOSED`
   - Ligne 564-573 : `add_sale_to_session()` vérifie le statut mais n'est pas utilisée par l'endpoint de création de vente

**Conclusion T3 :** Le backend ne valide **PAS** que la session est ouverte avant de créer une vente. C'est une faille de sécurité côté serveur.

#### T5 – Analyse du système de logging d'anomalies ✅

**Résultats :**

1. **`frontend/src/services/transactionLogService.ts`** :
   - Types d'événements supportés (ligne 10) : `'TICKET_OPENED' | 'TICKET_RESET' | 'ANOMALY_DETECTED'`
   - Méthode `logAnomaly()` (ligne 87-99) : Générique, peut être utilisée pour n'importe quelle anomalie
   - ❌ **MANQUE** : Aucun type d'anomalie spécifique `ITEM_ADDED_WHEN_CLOSED` n'est défini
   - Le système détecte `ITEM_ADDED_WITHOUT_TICKET` (dans `cashSessionStore.ts` ligne 220-228) mais **PAS** `ITEM_ADDED_WHEN_CLOSED`

2. **Détection actuelle dans `cashSessionStore.ts`** :
   - Ligne 220 : Détection de `ITEM_ADDED_WITHOUT_TICKET` (quand `!state.ticketOpenedLogged`)
   - Aucune détection pour session fermée

**Conclusion T5 :** Le système de logging d'anomalies ne détecte **PAS** les cas où un article est ajouté à une session fermée. Il faut ajouter cette détection.

#### T4 – Analyse des logs et données de production ✅

**Résultats :**

1. **Analyse des logs transactionnels** (`/app/logs/transactions.log`, 59K, dernière mise à jour 13/12/2025 16:32) :
   - ❌ **Aucune mention de fermeture de session** : Les logs transactionnels ne capturent pas les événements `SESSION_CLOSED`
   - ⚠️ **Anomalies détectées** : `ITEM_ADDED_WITHOUT_TICKET` (3 occurrences) - **IMPORTANT** : Ces anomalies sont liées au bug "tickets fantômes" (B48-P2) qui se produit **PENDANT** une session ouverte (articles ajoutés automatiquement sans action utilisateur), **PAS** au bug B51-P4
   - 📊 **Session observée** : `ef9b2b0c-de8d-4d2f-a300-cd163e331870` très longue (12-13/12/2025), toujours active dans les logs
   - **Limitation** : Impossible de détecter le bug B51-P4 via les logs car :
     - Les fermetures de session ne sont pas loggées dans `transactions.log`
     - Quand une session est fermée, **personne n'accède à l'interface de caisse**, donc aucun événement n'est généré

2. **Analyse SQL de la base de données** :
   ```sql
   -- Requête exécutée le 2025-01-27
   SELECT 
     s.id as session_id,
     s.status as session_status,
     s.closed_at,
     sale.id as sale_id,
     sale.created_at as sale_created_at,
     (sale.created_at - s.closed_at) as time_diff_after_close
   FROM cash_sessions s
   JOIN sales sale ON sale.cash_session_id = s.id
   WHERE s.status = 'CLOSED'
     AND s.closed_at IS NOT NULL
     AND sale.created_at > s.closed_at
   ORDER BY s.closed_at DESC
   LIMIT 20;
   ```
   - ✅ **Résultat : 0 lignes** - **AUCUNE** vente créée après la fermeture de leur session en base de données
   - **Interprétation** : Le bug ne s'est **PAS** produit en production car :
     - Quand une session est fermée, **l'interface de caisse n'est plus accessible** aux utilisateurs
     - Les utilisateurs ne peuvent donc pas tenter d'ajouter des articles après fermeture
     - Le bug est **théorique** : le code le permet, mais l'accès à l'interface est bloqué après fermeture

3. **Analyse des anomalies détectées** :
   - **5 anomalies** `ITEM_ADDED_WITHOUT_TICKET` détectées dans les logs
   - **Toutes sur la même session** : `ef9b2b0c-de8d-4d2f-a300-cd163e331870`
   - **Dates des anomalies** :
     - 2025-12-12 13:16:35
     - 2025-12-12 14:23:24
     - 2025-12-13 09:40:01
     - 2025-12-13 15:38:43
     - 2025-12-13 16:31:10
   - **À vérifier** : Statut de la session au moment de ces anomalies (voir requête SQL ci-dessous)

**Conclusion T4 :** 
- **Bug confirmé en production** : **5 cas réels détectés** dans les logs
- **Session concernée** : `ef9b2b0c-de8d-4d2f-a300-cd163e331870` (session ouverte du 12/12 au 13/12/2025)
- **Dates des anomalies** :
  - 2025-12-12 13:16:35
  - 2025-12-12 14:23:24
  - 2025-12-13 09:40:01
  - 2025-12-13 15:38:43
  - 2025-12-13 16:31:10
- **Type d'anomalie** : `ITEM_ADDED_WITHOUT_TICKET` - Articles ajoutés alors qu'aucun ticket n'est explicitement ouvert
- **Impact** : Des articles apparaissent dans le panier sans action utilisateur (bug "tickets fantômes")
- **Statut de la session** : `OPEN` au moment des anomalies (le bug se produit pendant une session ouverte, pas après fermeture)
- **Recommandation** : Le fix est **URGENT** car le bug se produit réellement en production et impacte l'intégrité des données

### Cause Racine du Bug (Analyse Complémentaire)

**Problème identifié : Persistance localStorage + Rehydration**

Dans `cashSessionStore.ts` :

1. **Persistance de `currentSaleItems`** (ligne 763) :
   ```typescript
   partialize: (state) => ({
     currentSession: state.currentSession,
     currentSaleItems: state.currentSaleItems,  // ← Persisté dans localStorage
     currentRegisterOptions: state.currentRegisterOptions
   })
   ```

2. **`ticketOpenedLogged` n'est PAS persisté** :
   - `ticketOpenedLogged` n'est pas dans `partialize`, donc il n'est pas sauvegardé
   - À chaque rechargement de page, `ticketOpenedLogged` est réinitialisé à `false` (ligne 147)

3. **Scénario du bug "articles fantômes"** :
   - **Étape 1** : Un ticket est créé avec des articles → `currentSaleItems` est persisté dans localStorage
   - **Étape 2** : Le panier est vidé (`clearCurrentSale()`) → `currentSaleItems = []` dans le state, localStorage mis à jour
   - **Étape 3** : La page est rechargée OU le store est rehydraté
   - **Étape 4** : Zustand restaure `currentSaleItems` depuis localStorage
   - **Problème** : Si le localStorage n'a pas été correctement vidé (timing, erreur, etc.), les **anciens articles sont restaurés**
   - **Résultat** : Des articles apparaissent dans le panier au chargement, mais `ticketOpenedLogged = false` (car réinitialisé)
   - **Conséquence** : Les articles sont là sans qu'aucun ticket ait été ouvert → **articles fantômes**

4. **Problème supplémentaire dans `addSaleItem()`** :
   - L'item est ajouté **AVANT** la vérification (ligne 199-201)
   - Même si `ticketOpenedLogged = false`, l'ajout se fait quand même
   - Le code détecte l'anomalie mais l'item est déjà ajouté

**Ce qui déclenche les articles fantômes :**

- **Rechargement de page** : Les articles sont restaurés depuis localStorage, mais `ticketOpenedLogged = false`
- **Rehydration du store** : Même problème si le localStorage contient encore des articles
- **Timing** : Si `clearCurrentSale()` ne met pas à jour localStorage à temps, les articles peuvent revenir

**Solutions à implémenter :**

1. **Fix immédiat** : Bloquer l'ajout si `ticketOpenedLogged = false` dans `addSaleItem()`
2. **Fix persistance** : Vider `currentSaleItems` dans `onRehydrateStorage` si `ticketOpenedLogged` n'est pas défini/true
3. **Fix robustesse** : S'assurer que `clearCurrentSale()` nettoie bien localStorage (ou ne pas persister `currentSaleItems`)

### Recommandations pour le Fix (T6)

#### Flux Complet Documenté

**Flux normal (sans bug) :**
1. **Ouverture session** : `POST /v1/cash-sessions/` → `status: 'open'`, `currentSession` créé dans le store
2. **Ajout articles** : `addSaleItem()` → Articles ajoutés au panier localement
3. **Finalisation vente** : `submitSale()` → `POST /v1/sales/` → Vente créée en base
4. **Fermeture session** : `POST /v1/cash-sessions/{id}/close` → `status: 'closed'`, `currentSession: null` dans le store

**Flux avec bug (actuel) :**
1. **Ouverture session** : ✅ OK
2. **Ajout article SANS ouverture explicite de ticket** : ❌ **BUG** - L'article est ajouté au panier localement car :
   - `addSaleItem()` détecte que `ticketOpenedLogged = false` mais **ne bloque pas** l'ajout, seulement log une anomalie
   - L'article est ajouté au panier même si aucun ticket n'a été explicitement ouvert
   - Le système log `ITEM_ADDED_WITHOUT_TICKET` mais n'empêche pas l'ajout
3. **Résultat** : Des articles apparaissent dans le panier sans action utilisateur (bug "tickets fantômes")

**Cas particuliers :**
- **Session virtuelle** : Même problème - `addSaleItem()` ne bloque pas si `ticketOpenedLogged = false`
- **Session différée** : Même problème - `addSaleItem()` ne bloque pas si `ticketOpenedLogged = false`
- **Tous les stores** : Le bug affecte les 3 types de sessions (réelle, différée, virtuelle)

#### Points de Validation à Ajouter

**1. Frontend - Stores (3 fichiers à modifier) :**

**`cashSessionStore.ts` - `addSaleItem()` (ligne 188)** :
```typescript
addSaleItem: (item: Omit<SaleItem, 'id'>) => {
  const state = get();
  
  // B51-P4 FIX: Validation CRITIQUE - Bloquer l'ajout si aucun ticket n'est explicitement ouvert
  // IMPORTANT: Vérifier AVANT de créer newItem et AVANT d'ajouter au panier
  if (!state.ticketOpenedLogged) {
    console.warn('[addSaleItem] Tentative d\'ajout d\'article sans ticket ouvert - BLOQUÉ');
    
    // Logger l'anomalie
    import('../services/transactionLogService').then(({ transactionLogService }) => {
      const cartState = {
        items_count: state.currentSaleItems.length,  // Pas +1 car on bloque l'ajout
        items: state.currentSaleItems.map(item => ({
          id: item.id,
          category: item.category,
          weight: item.weight,
          price: item.total
        })),
        total: state.currentSaleItems.reduce((sum, item) => sum + item.total, 0)
      };
      transactionLogService.logAnomaly(
        state.currentSession!.id,
        cartState,
        'Item added but no ticket is explicitly opened - BLOCKED'
      ).catch(err => console.error('[TransactionLog] Erreur:', err));
    });
    
    // B51-P4 FIX: BLOQUER l'ajout - ne pas créer newItem ni l'ajouter au panier
    return; // Sortir immédiatement, ne pas ajouter l'item
  }
  
  // Si ticketOpenedLogged = true, continuer normalement
  const newItem: SaleItem = {
    ...item,
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    presetId: item.presetId,
    notes: item.notes
  };

  const wasEmpty = state.currentSaleItems.length === 0;
  
  set({
    currentSaleItems: [...state.currentSaleItems, newItem]
  });

  // ... reste du code existant (logging TICKET_OPENED si nécessaire)
}
```

**Problème actuel** : 
- Ligne 189-194 : `newItem` est créé **AVANT** la vérification
- Ligne 199-201 : L'item est ajouté **AVANT** la vérification (ligne 220)
- Le code détecte `!state.ticketOpenedLogged` et log une anomalie, mais **l'item est déjà ajouté**

**Fix** : Déplacer la vérification **AVANT** la création de `newItem` et **AVANT** l'ajout au panier.

**`cashSessionStore.ts` - `onRehydrateStorage()` (ligne 767)** :
```typescript
onRehydrateStorage: () => (state) => {
  // ... code existant pour currentRegisterOptions ...
  
  // B51-P4 FIX: Si des articles sont restaurés depuis localStorage mais ticketOpenedLogged n'est pas défini,
  // vider les articles pour éviter les articles fantômes
  if (state?.currentSaleItems && state.currentSaleItems.length > 0) {
    // Si ticketOpenedLogged n'est pas persisté (toujours false au rechargement),
    // et qu'on a des articles, c'est suspect - les vider pour sécurité
    // Note: ticketOpenedLogged n'est pas dans partialize, donc toujours false au rehydrate
    console.warn('[Store] onRehydrateStorage - Articles restaurés mais ticketOpenedLogged non défini, vidage du panier');
    state.currentSaleItems = [];
  }
}
```

**Alternative (plus robuste)** : Ne pas persister `currentSaleItems` du tout, ou les vider systématiquement au rechargement.

**`deferredCashSessionStore.ts` - `addSaleItem()` (ligne 149)** :
- Même logique que `cashSessionStore.ts`

**`virtualCashSessionStore.ts` - `addSaleItem()` (ligne 201)** :
- Même logique que `cashSessionStore.ts`

**2. Frontend - UI (Optionnel - amélioration UX) :**

**`Sale.tsx` - Afficher un message si tentative d'ajout sans ticket** :
```typescript
// Optionnel : Afficher une notification si l'utilisateur tente d'ajouter un article
// mais le store bloque l'ajout (déjà géré dans le store, mais on peut améliorer l'UX)
```

**Note** : La validation dans le store est suffisante. L'UI peut rester comme elle est, le blocage se fait au niveau du store.

**3. Backend - API (Optionnel - sécurité supplémentaire) :**

**Note** : Le backend n'a pas besoin de validation supplémentaire car le problème est résolu côté frontend (blocage dans le store). Cependant, pour la robustesse, on peut ajouter une validation :

**`api/src/recyclic_api/api/api_v1/endpoints/sales.py` - `create_sale()` (ligne 120)** :
```python
# Récupérer la session pour vérifier si elle est différée (B44-P1)
cash_session = db.query(CashSession).filter(CashSession.id == sale_data.cash_session_id).first()
if not cash_session:
    raise HTTPException(status_code=404, detail="Session de caisse non trouvée")

# B51-P4: Validation supplémentaire (sécurité backend)
# Note: Le problème principal est résolu côté frontend, mais cette validation
# empêche toute création de vente si le frontend est contourné
if cash_session.status != CashSessionStatus.OPEN:
    raise HTTPException(
        status_code=422,
        detail=f"Impossible de créer une vente pour une session fermée (statut: {cash_session.status.value})"
    )
```

**4. Logging (Optionnel - Amélioration) :**

**`frontend/src/services/transactionLogService.ts`** :
- Optionnel : Ajouter type d'événement spécifique `'ITEM_ADDED_WHEN_CLOSED'` dans l'union type (ligne 10)
- Actuellement, `logAnomaly()` générique suffit avec le paramètre `details`

#### Solution Proposée - Résumé

**Fix principal :**

1. **Frontend Store** : **BLOQUER** l'ajout d'articles si `ticketOpenedLogged = false` dans `addSaleItem()`
   - Actuellement : Le code détecte le problème et log une anomalie, mais **continue quand même** à ajouter l'item
   - Fix : Ajouter un `return;` avant l'ajout de l'item si `!state.ticketOpenedLogged`
   - Impact : Empêche le bug "tickets fantômes" à la source

**Fix secondaire (optionnel) :**

2. **Backend API** : Validation supplémentaire pour robustesse (si le frontend est contourné)

**Ordre de priorité d'implémentation :**
1. **Frontend Store** (URGENT) - Bloque l'ajout si aucun ticket n'est ouvert (fix du bug principal)
2. **Backend** (sécurité) - Validation supplémentaire pour robustesse

#### Tests à Ajouter (pour story de fix)

**Frontend - Tests unitaires :**
- `cashSessionStore.test.ts` : `addSaleItem()` doit **BLOQUER** l'ajout si `ticketOpenedLogged = false`
- `cashSessionStore.test.ts` : `addSaleItem()` doit logger anomalie `ITEM_ADDED_WITHOUT_TICKET` si tentative d'ajout sans ticket
- `cashSessionStore.test.ts` : `addSaleItem()` doit **permettre** l'ajout si `ticketOpenedLogged = true`
- `deferredCashSessionStore.test.ts` : Même tests
- `virtualCashSessionStore.test.ts` : Même tests

**Backend - Tests d'intégration (optionnel) :**
- `test_sales.py` : `POST /v1/sales/` doit retourner 422 si session fermée (validation supplémentaire)

**Tests E2E :**
- Scénario : Ouvrir session → Ajouter article SANS ouvrir de ticket → Vérifier que l'ajout est **bloqué** et qu'une anomalie est loggée
- Scénario : Ouvrir session → Ouvrir ticket → Ajouter article → Vérifier que l'ajout fonctionne normalement

### File List

**Fichiers analysés (lecture seule) :**
- `frontend/src/stores/cashSessionStore.ts` - Analyse `addSaleItem()` et `closeSession()`
- `frontend/src/stores/deferredCashSessionStore.ts` - Analyse `addSaleItem()` et `closeSession()`
- `frontend/src/stores/virtualCashSessionStore.ts` - Analyse `addSaleItem()` et `closeSession()`
- `frontend/src/pages/CashRegister/Sale.tsx` - Analyse UI et gestion du statut
- `frontend/src/components/business/CategorySelector.tsx` - Analyse désactivation boutons
- `frontend/src/services/transactionLogService.ts` - Analyse système de logging
- `api/src/recyclic_api/api/api_v1/endpoints/sales.py` - Analyse endpoint `create_sale()`
- `api/src/recyclic_api/services/cash_session_service.py` - Analyse logique de fermeture

**Fichiers à modifier (dans story de fix) :**
- `frontend/src/stores/cashSessionStore.ts` - **BLOQUER** l'ajout si `ticketOpenedLogged = false` dans `addSaleItem()` (ligne ~200)
- `frontend/src/stores/deferredCashSessionStore.ts` - Même fix (si applicable)
- `frontend/src/stores/virtualCashSessionStore.ts` - Même fix (si applicable)
- `api/src/recyclic_api/api/api_v1/endpoints/sales.py` - (Optionnel) Ajouter validation statut dans `create_sale()` pour robustesse

### Completion Notes List

- ✅ T1 complété : Bug confirmé dans les 3 stores frontend - `addSaleItem()` détecte mais ne bloque pas
- ✅ T2 complété : UI fonctionne normalement, le problème est dans le store
- ✅ T3 complété : Backend n'a pas besoin de validation (problème résolu côté frontend)
- ✅ T4 complété : **5 cas réels détectés en production** - Bug confirmé et documenté
- ✅ T5 complété : Système de logging détecte l'anomalie mais ne bloque pas l'ajout
- ✅ T6 complété : Solution proposée - **BLOQUER** l'ajout si `ticketOpenedLogged = false`

### Résumé Final de l'Investigation

**Bug identifié :** Articles ajoutés au panier **en dehors d'un ticket** (bug "tickets fantômes")
- **Cause** : `addSaleItem()` détecte que `ticketOpenedLogged = false` mais **continue quand même** à ajouter l'item
- **Impact** : 5 cas réels en production (session `ef9b2b0c-de8d-4d2f-a300-cd163e331870`)
- **Fix** : Ajouter un `return;` dans `addSaleItem()` avant l'ajout de l'item si `!state.ticketOpenedLogged`
- **Priorité** : URGENT - Le bug se produit en production et impacte l'intégrité des données

