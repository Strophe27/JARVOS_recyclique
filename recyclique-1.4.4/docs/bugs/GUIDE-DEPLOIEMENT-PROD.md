# Guide de Déploiement - Correction Sessions Différées Bloquées

**Date** : 2025-01-27  
**Priorité** : CRITIQUE (Production bloquée)

## Problème

La session différée du 4 octobre 2025 est bloquée en production, empêchant l'ouverture de nouvelles sessions différées.

## Solution Complète

### 1. Corrections Code (Déjà Appliquées)

✅ **Backend** :
- `get_open_session_by_register()` : Filtre les sessions différées
- `get_open_session_by_operator()` : Filtre les sessions différées
- Nouvelles méthodes pour sessions différées

✅ **Frontend** :
- `resumeSession()` : Vérifie l'état réel et nettoie le localStorage
- `fetchCurrentSession()` : Vérifie l'état réel et nettoie le localStorage

### 2. Correction Production - Étape par Étape

#### Étape 1 : Sauvegarder la Base de Données

⚠️ **OBLIGATOIRE** avant toute modification :

```bash
# Depuis le serveur de production
docker-compose exec postgres pg_dump -U recyclic -d recyclic -Fc -f /tmp/recyclic_backup_$(date +%Y%m%d_%H%M%S).dump

# Récupérer le dump
docker cp $(docker-compose ps -q postgres):/tmp/recyclic_backup_*.dump ./
```

#### Étape 2 : Déployer les Corrections Code

```bash
# 1. Mettre à jour le code
git pull origin main  # ou la branche appropriée

# 2. Rebuilder les images
docker-compose build api frontend

# 3. Redémarrer les services
docker-compose restart api frontend
```

#### Étape 3 : Corriger les Sessions Bloquées

**Option A : Script Automatique (Recommandé)**

```bash
# Simulation d'abord
./scripts/fix-production-blocked-sessions.sh --dry-run

# Puis exécution réelle
./scripts/fix-production-blocked-sessions.sh
```

**Option B : Correction Manuelle SQL**

```sql
-- Vérifier les sessions bloquées
SELECT id, opened_at, status, 
       (SELECT COUNT(*) FROM sales WHERE cash_session_id = cash_sessions.id) as sales_count
FROM cash_sessions 
WHERE status = 'OPEN' 
  AND opened_at < NOW();

-- Fermer les sessions avec transactions
UPDATE cash_sessions
SET status = 'CLOSED',
    closed_at = NOW(),
    variance = 0,
    variance_comment = 'Fermeture automatique - session différée bloquée'
WHERE status = 'OPEN' 
  AND opened_at < NOW()
  AND id IN (
    SELECT id FROM cash_sessions cs
    WHERE EXISTS (
      SELECT 1 FROM sales WHERE cash_session_id = cs.id
    )
  );

-- Supprimer les sessions vides
DELETE FROM cash_sessions
WHERE status = 'OPEN' 
  AND opened_at < NOW()
  AND NOT EXISTS (
    SELECT 1 FROM sales WHERE cash_session_id = cash_sessions.id
  );
```

#### Étape 4 : Vérifier la Correction

```sql
-- Doit retourner 0
SELECT COUNT(*) 
FROM cash_sessions 
WHERE status = 'OPEN' 
  AND opened_at < NOW();
```

#### Étape 5 : Nettoyer le localStorage des Utilisateurs

Les utilisateurs doivent nettoyer leur localStorage :

**Option A : Message aux utilisateurs**

Envoyer un message aux utilisateurs pour qu'ils :
1. Ouvrent la console du navigateur (F12)
2. Exécutent : `localStorage.removeItem('deferredCashSession'); location.reload();`

**Option B : Script de nettoyage automatique (Frontend)**

Les corrections frontend nettoieront automatiquement le localStorage lors du prochain chargement.

### 3. Prévention - Vérifications Post-Déploiement

#### Vérifier que les Corrections Fonctionnent

1. **Test Backend** :
   ```bash
   # Vérifier qu'il n'y a plus de sessions bloquées
   docker-compose exec postgres psql -U recyclic -d recyclic -c "
     SELECT COUNT(*) as sessions_bloquees
     FROM cash_sessions 
     WHERE status = 'OPEN' 
       AND opened_at < NOW();
   "
   # Doit retourner 0
   ```

2. **Test Frontend** :
   - Ouvrir une session différée
   - Vérifier qu'il n'y a plus de bouton "Reprendre la session" pour les sessions fermées
   - Ouvrir une nouvelle session différée → doit fonctionner

3. **Test Coexistence** :
   - Ouvrir une caisse normale
   - Ouvrir une saisie différée en même temps
   - Vérifier qu'elles ne se mélangent pas

### 4. Monitoring

Ajouter une vérification dans le monitoring pour détecter les sessions bloquées :

```sql
-- Requête de monitoring (à exécuter périodiquement)
SELECT COUNT(*) as sessions_bloquees
FROM cash_sessions 
WHERE status = 'OPEN' 
  AND opened_at < NOW();
```

Si > 0, alerter l'équipe.

## Rollback

En cas de problème, restaurer la sauvegarde :

```bash
# Restaurer le dump
docker cp ./recyclic_backup_*.dump $(docker-compose ps -q postgres):/tmp/
docker-compose exec postgres pg_restore -U recyclic -d recyclic --clean --if-exists /tmp/recyclic_backup_*.dump
```

## Notes Importantes

- ⚠️ Les corrections code sont **rétroactives** : elles fonctionnent pour toutes les sessions futures
- ⚠️ Le localStorage sera automatiquement nettoyé lors du prochain chargement si la session est fermée
- ⚠️ Plus besoin de script de correction manuel : le frontend gère maintenant automatiquement
- ⚠️ Les sessions différées et normales peuvent maintenant coexister sans se mélanger

## Support

En cas de problème :
1. Vérifier les logs : `docker-compose logs api | tail -50`
2. Vérifier l'état de la base : `docker-compose exec postgres psql -U recyclic -d recyclic -c "SELECT ..."`
3. Consulter la documentation : `docs/bugs/CORRECTION-SESSION-BLOQUEE.md`
