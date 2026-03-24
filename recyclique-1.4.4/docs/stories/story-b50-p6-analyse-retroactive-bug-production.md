# Analyse Rétroactive - Bug Prix Global en Production (B50-P6)

**Date:** 2025-01-27  
**Contexte:** Bug observé en production où le mode prix global se désactive subitement alors que l'option reste activée dans les settings.

---

## 🔍 Scénario Observé en Production

**Symptôme:**
- Mode prix global activé dans les settings du poste de caisse ✅
- Caisse fonctionne normalement avec mode prix global ✅
- **Subitement**, la caisse passe en mode ancien (workflow standard) ❌
- L'option reste cochée dans les settings (pas de changement côté serveur) ✅
- Solution temporaire : Sortir et réouvrir la caisse

**Timing:** "Au bout d'un moment" - pas de moment précis identifié

---

## 🎯 Cause Racine Technique Identifiée

**Code problématique (AVANT correction):**

```typescript
// Dans fetchCurrentSession() - ligne 611 (ancien code)
if (serverSession && serverSession.status === 'open') {
  get().setCurrentSession(serverSession);  // ❌ Écrase currentRegisterOptions si serverSession n'a pas register_options
  // ...
}

// Dans setCurrentSession() - ligne 162 (ancien code)
setCurrentSession: (session) => set({ 
  currentSession: session,
  currentRegisterOptions: (session as any)?.register_options || null  // ❌ Met à null si absent
})
```

**Problème:** Si l'API ne retourne pas `register_options` dans la réponse, `currentRegisterOptions` est mis à `null`, même si des options étaient déjà persistées.

---

## 🧩 Hypothèses de Scénarios Réels en Production

### Hypothèse #1 : Rafraîchissement de Page (F5 ou Ctrl+R)

**Scénario:**
1. Caissier ouvre une session avec mode prix global activé
2. `currentRegisterOptions` est chargé et persisté dans Zustand (localStorage)
3. **Événement déclencheur:** Caissier appuie sur F5 (rafraîchissement) OU navigateur rafraîchit automatiquement
4. `fetchCurrentSession()` est appelé au rechargement
5. L'API retourne la session **SANS** `register_options` (pourquoi ? voir hypothèses API)
6. `setCurrentSession(serverSession)` met `currentRegisterOptions` à `null`
7. **Résultat:** Mode prix global désactivé, retour au workflow standard

**Probabilité:** ⭐⭐⭐⭐⭐ (Très élevée)

**Pourquoi l'API ne retournerait pas `register_options`?**
- Cache API côté serveur
- Endpoint `/v1/cash-sessions/{id}` qui ne charge pas toujours les relations
- Problème de sérialisation Pydantic qui omet les champs optionnels
- Version différente de l'API entre l'ouverture et le rafraîchissement

---

### Hypothèse #2 : Retour en Ligne (Reconnexion Internet)

**Scénario:**
1. Caissier travaille avec mode prix global activé
2. **Événement déclencheur:** Perte de connexion internet (WiFi instable, coupure réseau)
3. Application détecte `offline` → certains appels API échouent
4. **Événement déclencheur:** Retour en ligne
5. Hook `useCashLiveStats` ou autre détecte `online` → déclenche `refreshSession()`
6. `refreshSession()` appelle `fetchCurrentSession()`
7. L'API retourne la session **SANS** `register_options` (cache, timing, etc.)
8. `setCurrentSession()` met `currentRegisterOptions` à `null`
9. **Résultat:** Mode prix global désactivé

**Probabilité:** ⭐⭐⭐⭐ (Élevée)

**Code concerné:**
```typescript
// frontend/src/hooks/useCashLiveStats.ts
window.addEventListener('online', handleOnline);
// → Peut déclencher un refresh qui appelle fetchCurrentSession()
```

---

### Hypothèse #3 : Changement d'Onglet / Retour sur l'Onglet

**Scénario:**
1. Caissier a la caisse ouverte dans un onglet avec mode prix global
2. **Événement déclencheur:** Caissier change d'onglet (ouvre autre chose) OU met l'ordinateur en veille
3. Navigateur déclenche `visibilitychange` (onglet caché)
4. **Événement déclencheur:** Caissier revient sur l'onglet (après quelques minutes)
5. Navigateur déclenche `visibilitychange` (onglet visible)
6. `useSessionHeartbeat` ou autre hook détecte le retour → peut déclencher `fetchCurrentSession()`
7. L'API retourne la session **SANS** `register_options`
8. **Résultat:** Mode prix global désactivé

**Probabilité:** ⭐⭐⭐ (Moyenne)

**Code concerné:**
```typescript
// frontend/src/hooks/useSessionHeartbeat.ts
document.addEventListener('visibilitychange', handleVisibilityChange);
// → Peut déclencher un refresh de session
```

---

### Hypothèse #4 : Appel Automatique de `refreshSession()`

**Scénario:**
1. Caissier travaille normalement avec mode prix global
2. **Événement déclencheur:** Page `CloseSession` se charge (même en arrière-plan)
3. `CloseSession.tsx` ligne 259 : `useEffect` appelle automatiquement `refreshSession()`
4. `refreshSession()` → `fetchCurrentSession()`
5. L'API retourne la session **SANS** `register_options`
6. **Résultat:** Mode prix global désactivé

**Probabilité:** ⭐⭐⭐⭐ (Élevée)

**Code concerné:**
```typescript
// frontend/src/pages/CashRegister/CloseSession.tsx
useEffect(() => {
  const loadSessionData = async () => {
    await refreshSession();  // ⚠️ Appelé automatiquement au montage
  };
  loadSessionData();
}, [refreshSession]);
```

**Note:** Si le caissier navigue vers la page de fermeture (même sans intention de fermer), cela déclenche un refresh.

---

### Hypothèse #5 : Problème de Cache Navigateur / Service Worker

**Scénario:**
1. Caissier ouvre session avec mode prix global
2. **Événement déclencheur:** Service Worker ou cache navigateur invalide le localStorage
3. Zustand persist essaie de réhydrater depuis localStorage
4. `onRehydrateStorage` ne restaure pas correctement `currentRegisterOptions` (bug corrigé)
5. `fetchCurrentSession()` est appelé pour récupérer la session
6. L'API retourne la session **SANS** `register_options`
7. **Résultat:** Mode prix global désactivé

**Probabilité:** ⭐⭐ (Faible mais possible)

---

### Hypothèse #6 : Timeout / Expiration de Session Côté Serveur

**Scénario:**
1. Caissier ouvre session avec mode prix global
2. **Événement déclencheur:** Session "expire" côté serveur (timeout, problème DB, etc.)
3. `fetchCurrentSession()` est appelé (automatique ou manuel)
4. L'API retourne une session "fraîche" recréée **SANS** `register_options` (car pas chargés depuis le register)
5. **Résultat:** Mode prix global désactivé

**Probabilité:** ⭐⭐⭐ (Moyenne)

---

### Hypothèse #7 : Problème de Sérialisation API (Pydantic)

**Scénario:**
1. Caissier ouvre session avec mode prix global
2. Backend charge `register_options` depuis `cash_registers.workflow_options`
3. **Événement déclencheur:** Problème de sérialisation Pydantic
   - Champ `register_options` omis si `None` ou `null`
   - Relation SQLAlchemy non chargée (lazy loading)
   - Cache ORM qui retourne objet incomplet
4. `fetchCurrentSession()` reçoit session **SANS** `register_options`
5. **Résultat:** Mode prix global désactivé

**Probabilité:** ⭐⭐⭐⭐ (Élevée - problème backend possible)

**Code backend concerné (à vérifier):**
```python
# api/recyclic_api/api/api_v1/endpoints/cash_sessions.py
@router.get("/{session_id}")
async def get_session(session_id: str, ...):
    session = await cash_session_repo.get(session_id)
    # ⚠️ register_options peut ne pas être chargé si relation non eager
    return session  # → Sérialisation peut omettre register_options
```

---

## 🔬 Pourquoi l'API Ne Retournerait Pas `register_options`?

### Raisons Techniques Possibles:

1. **Lazy Loading SQLAlchemy:**
   - Relation `register_options` chargée en lazy
   - Si session accédée sans eager loading, `register_options` = `None`

2. **Cache API:**
   - Endpoint mis en cache sans `register_options`
   - Cache retourne version incomplète

3. **Sérialisation Pydantic:**
   - `register_options` marqué comme `Optional` ou `exclude_unset=True`
   - Si `None`, champ omis de la réponse JSON

4. **Problème de Timing:**
   - `register_options` chargés asynchronement
   - Réponse API envoyée avant chargement complet

5. **Version API Différente:**
   - Déploiement partiel (rolling update)
   - Ancienne version API ne retourne pas `register_options`

---

## 📊 Scénario le Plus Probable en Production

**Combinaison Hypothèse #1 + #7:**

1. **Déclencheur:** Rafraîchissement de page (F5, Ctrl+R, ou automatique)
2. **Cause technique:** API retourne session sans `register_options` (lazy loading ou sérialisation)
3. **Conséquence:** `fetchCurrentSession()` → `setCurrentSession()` → `currentRegisterOptions = null`
4. **Résultat visible:** Mode prix global désactivé, retour au workflow standard

**Pourquoi difficile à reproduire:**
- Nécessite timing précis (rafraîchissement + API sans `register_options`)
- Dépend de l'état du cache/DB côté serveur
- Peut être intermittent selon la charge serveur

---

## ✅ Correction Appliquée

**Solution:** Conserver `currentRegisterOptions` même si l'API ne les retourne pas.

**Code corrigé:**
```typescript
// setCurrentSession - conserve les options existantes
currentRegisterOptions: registerOptions || get().currentRegisterOptions

// fetchCurrentSession - enrichit la session avec options du store
const optionsToUse = (serverSession as any)?.register_options 
  || (session as any)?.register_options 
  || get().currentRegisterOptions;

// onRehydrateStorage - restaure depuis session lors de réhydratation
if (!state.currentRegisterOptions && sessionOptions) {
  state.setCurrentRegisterOptions(sessionOptions);
}
```

**Résultat:** Le mode prix global persiste même si l'API ne retourne pas `register_options`.

---

## 🧪 Tests de Validation Recommandés

1. **Test manuel rafraîchissement:**
   - Ouvrir session avec mode prix global
   - Appuyer F5
   - Vérifier que mode reste actif

2. **Test déconnexion/reconnexion:**
   - Ouvrir session avec mode prix global
   - Couper WiFi
   - Attendre 30 secondes
   - Réactiver WiFi
   - Vérifier que mode reste actif

3. **Test changement onglet:**
   - Ouvrir session avec mode prix global
   - Changer d'onglet
   - Attendre 5 minutes
   - Revenir sur l'onglet
   - Vérifier que mode reste actif

4. **Test backend:**
   - Vérifier que `/v1/cash-sessions/{id}` retourne toujours `register_options`
   - Vérifier eager loading de la relation
   - Vérifier sérialisation Pydantic

---

## 📝 Notes pour Investigation Backend

**À vérifier côté API:**
- Endpoint `GET /v1/cash-sessions/{session_id}` charge-t-il toujours `register_options`?
- Relation SQLAlchemy est-elle en `eager` ou `lazy`?
- Sérialisation Pydantic inclut-elle `register_options` même si `None`?
- Y a-t-il un cache qui pourrait retourner une version incomplète?

**Fichiers backend à examiner:**
- `api/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `api/recyclic_api/models/cash_session.py`
- `api/recyclic_api/schemas/cash_session.py`

---

## 🎯 Conclusion

Le bug était **intermittent** car il nécessitait la combinaison de:
1. Un événement déclenchant `fetchCurrentSession()` (rafraîchissement, reconnexion, etc.)
2. L'API retournant une session sans `register_options` (problème backend ou timing)

La correction frontend garantit que les options sont **toujours conservées** même si l'API ne les retourne pas, ce qui résout le problème côté client. Une investigation backend reste recommandée pour comprendre pourquoi `register_options` n'est pas toujours présent dans la réponse API.

