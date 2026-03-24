# Bug Critique : Mélange des Sessions Normales et Différées

> **📚 Document de référence principal** : Voir [`../stories/MEMOIRE-BUGS-SESSIONS-DIFFEREES.md`](../stories/MEMOIRE-BUGS-SESSIONS-DIFFEREES.md)

**Date de découverte** : 2025-01-27  
**Priorité** : CRITIQUE (Production)  
**Statut** : ✅ **Résolu**

> ⚠️ **Note** : Ce document est conservé pour référence historique. Pour la documentation complète et à jour, consultez le document de mémoire principal.

## Description du Problème

### Problème 1 : Mélange des Caisses Normales et Différées

Quand la caisse magasin (session normale) est ouverte et qu'une saisie différée est ouverte en même temps, les deux se mélangent :

1. **Symptôme** : La caisse principale du magasin apparaît ouverte à la date de la saisie différée au lieu de la date actuelle
2. **Cause racine** : Les méthodes `get_open_session_by_register()` et `get_open_session_by_operator()` ne filtrent PAS les sessions différées (sessions avec `opened_at` dans le passé)
3. **Impact** : Les stores frontend récupèrent la mauvaise session, mélangeant les données de la journée actuelle avec celles d'une date passée

### Problème 2 : Session Différée Bloquée

Une session différée au 4 octobre 2025 est bloquée en état "ouvert" :

1. **Symptômes** :
   - Impossible d'ouvrir une nouvelle session différée (reste bloquée sur le 4 octobre)
   - Bouton "Fermer la session" ne fonctionne pas
   - Message d'erreur : "Session de caisse non trouvée" lors de la fermeture
   - Erreur "Erreur inconnue" lors de la reprise de session

2. **Impact** : Blocage complet de la fonctionnalité de saisie différée

## Analyse Technique

### Code Problématique

#### Backend - `cash_session_service.py`

```python
def get_open_session_by_register(self, register_id: str) -> Optional[CashSession]:
    """Récupère la session ouverte pour un poste de caisse donné."""
    rid = UUID(str(register_id)) if not isinstance(register_id, UUID) else register_id
    return (
        self.db.query(CashSession)
        .filter(
            and_(
                CashSession.register_id == rid,
                CashSession.status == CashSessionStatus.OPEN,
            )
        )
        .first()
    )
```

**Problème** : Cette méthode retourne la première session ouverte pour un register, qu'elle soit normale ou différée. Elle ne filtre pas par `opened_at`.

#### Frontend - `cashSessionStore.ts`

```typescript
// Pré-check 1: vérifier s'il y a déjà une session ouverte sur ce poste de caisse
if (data.register_id) {
  const status = await cashSessionService.getRegisterSessionStatus(data.register_id);
  if (status.is_active && status.session_id) {
    const existingByRegister = await cashSessionService.getSession(status.session_id);
    // ... récupère potentiellement une session différée au lieu d'une normale
  }
}
```

**Problème** : Le store normal peut récupérer une session différée si elle est ouverte en même temps.

## Solutions Proposées

### Solution 1 : Filtrer les Sessions Différées dans le Backend

Modifier `get_open_session_by_register()` et `get_open_session_by_operator()` pour exclure les sessions différées :

```python
def get_open_session_by_register(self, register_id: str) -> Optional[CashSession]:
    """Récupère la session ouverte pour un poste de caisse donné.
    
    Exclut les sessions différées (opened_at dans le passé).
    """
    from datetime import datetime, timezone
    
    rid = UUID(str(register_id)) if not isinstance(register_id, UUID) else register_id
    now = datetime.now(timezone.utc)
    
    return (
        self.db.query(CashSession)
        .filter(
            and_(
                CashSession.register_id == rid,
                CashSession.status == CashSessionStatus.OPEN,
                # Exclure les sessions différées : opened_at doit être >= maintenant
                CashSession.opened_at >= now
            )
        )
        .first()
    )
```

**Note** : Pour les sessions différées, créer une méthode séparée `get_deferred_session_by_register()` qui filtre par `opened_at < now()`.

### Solution 2 : Séparer les Stores Frontend

Le store `deferredCashSessionStore` ne devrait JAMAIS utiliser `getRegisterSessionStatus()` qui peut retourner une session normale. Il devrait avoir sa propre logique de vérification.

### Solution 3 : Corriger la Session Bloquée

1. **Diagnostic** : Vérifier dans la base de données l'état de la session du 4 octobre 2025
2. **Correction** : 
   - Si la session est vide, la supprimer
   - Si la session a des transactions, la fermer manuellement ou via un script de correction
3. **Prévention** : Ajouter une validation pour empêcher l'ouverture de sessions différées si une session normale est ouverte sur le même register

## Plan d'Action

1. ✅ Analyser les bugs (en cours)
2. ⏳ Corriger `get_open_session_by_register()` pour exclure les sessions différées
3. ⏳ Corriger `get_open_session_by_operator()` pour exclure les sessions différées
4. ⏳ Créer `get_deferred_session_by_register()` pour les sessions différées
5. ⏳ Corriger le store `cashSessionStore` pour ne pas récupérer de sessions différées
6. ⏳ Diagnostiquer et corriger la session bloquée du 4 octobre 2025
7. ⏳ Tester avec la base de production importée
8. ⏳ Ajouter des tests pour prévenir la régression

## Fichiers à Modifier

### Backend
- `api/src/recyclic_api/services/cash_session_service.py`
  - `get_open_session_by_register()` : Ajouter filtre `opened_at >= now()`
  - `get_open_session_by_operator()` : Ajouter filtre `opened_at >= now()`
  - Créer `get_deferred_session_by_register()` : Filtre `opened_at < now()`
  - Créer `get_deferred_session_by_operator()` : Filtre `opened_at < now()`

### Frontend
- `frontend/src/stores/cashSessionStore.ts`
  - S'assurer que `getRegisterSessionStatus()` ne retourne jamais une session différée
- `frontend/src/stores/deferredCashSessionStore.ts`
  - Utiliser une méthode dédiée pour vérifier les sessions différées

### API Endpoints
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
  - `GET /status/{register_id}` : Utiliser la méthode corrigée
  - `GET /current` : Utiliser la méthode corrigée

## Tests à Ajouter

1. Test : Une session normale et une session différée peuvent coexister sur le même register
2. Test : `get_open_session_by_register()` ne retourne jamais une session différée
3. Test : `get_deferred_session_by_register()` ne retourne jamais une session normale
4. Test : Le store normal ne récupère jamais une session différée
5. Test : Le store différé ne récupère jamais une session normale

## Notes de Déploiement

⚠️ **Attention** : Cette correction peut affecter les sessions différées actuellement ouvertes. Il faudra :
1. Fermer toutes les sessions différées ouvertes avant le déploiement
2. Ou créer un script de migration pour les fermer automatiquement
