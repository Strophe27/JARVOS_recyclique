# Nettoyage des Sessions Différées Dupliquées

## Problème

Quand le système crée de nouvelles sessions au lieu de reprendre l'existante, il peut y avoir plusieurs sessions ouvertes pour la même date et le même opérateur.

## Solution Immédiate

### Option 1 : Via l'API Admin (Recommandé)

1. **Identifier l'opérateur et la date** :
   - Opérateur : "Strophe Vingt-sept" (ID dans l'URL ou la base)
   - Date : "2025-10-05"

2. **Appeler l'endpoint de fusion** :
   ```bash
   POST /api/v1/admin/cash-sessions/merge-duplicate-deferred?operator_id=<OPERATOR_ID>&date=2025-10-05
   ```

3. **Résultat** :
   - La première session (la plus ancienne) est conservée
   - Les autres sessions dupliquées sont fermées
   - Les ventes sont préservées (elles restent dans la base)

### Option 2 : Via SQL Direct

```sql
-- Trouver les sessions dupliquées pour le 5 octobre
SELECT 
    id,
    opened_at,
    total_sales,
    total_items,
    status
FROM cash_sessions
WHERE operator_id = '<OPERATOR_ID>'
  AND status = 'OPEN'
  AND opened_at >= '2025-10-05 00:00:00+00'
  AND opened_at < '2025-10-06 00:00:00+00'
ORDER BY opened_at;

-- Fermer les sessions dupliquées (garder la première)
-- Remplacez <SESSION_ID_2> et <SESSION_ID_3> par les IDs des sessions à fermer
UPDATE cash_sessions
SET status = 'CLOSED',
    closed_at = NOW(),
    variance_comment = 'Fermeture automatique - session dupliquée'
WHERE id IN ('<SESSION_ID_2>', '<SESSION_ID_3>');
```

## Correction Appliquée

Le code a été corrigé pour :
1. **Vérifier `existingSessionInfo`** avant de créer une nouvelle session
2. **Reprendre automatiquement** la session existante si elle est détectée
3. **Éviter la création** de nouvelles sessions quand une existe déjà

## Test

Après le nettoyage et la correction :
1. Ouvrir une session différée pour le 5 octobre
2. Sortir sans fermer
3. Revenir sur le 5 octobre
4. **Résultat attendu** : La session existante est reprise (pas de nouvelle session créée)
