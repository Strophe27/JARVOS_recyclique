# Nettoyage localStorage - Session Différée Bloquée

## Solution Immédiate

Si le nettoyage automatique ne fonctionne pas encore (code pas encore déployé), nettoyer manuellement :

### Dans la Console du Navigateur (F12)

```javascript
localStorage.removeItem('deferredCashSession');
location.reload();
```

## Vérification

Pour vérifier si le localStorage contient encore la session bloquée :

```javascript
// Dans la console
const session = localStorage.getItem('deferredCashSession');
if (session) {
  const parsed = JSON.parse(session);
  console.log('Session trouvée:', {
    id: parsed.id,
    opened_at: parsed.opened_at,
    status: parsed.status
  });
} else {
  console.log('Aucune session dans le localStorage');
}
```

## Après Déploiement des Corrections

Une fois les corrections déployées, le nettoyage sera automatique :
1. Le frontend vérifie l'état réel de la session côté backend
2. Si la session est fermée, le localStorage est nettoyé automatiquement
3. Plus besoin d'intervention manuelle
