# Checklist de Déploiement - Migration B52-P3

## 📋 Résumé

**Migration**: `b52_p3_add_sale_date_to_sales`  
**Fichier**: `api/migrations/versions/b52_p3_add_sale_date_to_sales.py`  
**Action**: Ajout colonne `sale_date TIMESTAMP WITH TIME ZONE NULL` à la table `sales`

## ✅ Validation Technique Complète

### 1. Fichier de Migration

- ✅ **Syntaxe Python**: Validée
- ✅ **Structure**: Correcte (revision, down_revision, upgrade, downgrade)
- ✅ **Type de colonne**: `TIMESTAMP WITH TIME ZONE` (cohérent avec le reste du projet)
- ✅ **Nullable**: `True` (sûr pour données existantes)
- ✅ **Remplissage données**: `UPDATE sales SET sale_date = created_at WHERE sale_date IS NULL`
- ✅ **Downgrade**: Réversible (`DROP COLUMN`)

### 2. Code Backend

- ✅ **Modèle SQLAlchemy**: Champ `sale_date` ajouté
- ✅ **Logique création**: Gère sessions normales et différées
- ✅ **Schémas API**: `sale_date` dans `SaleResponse`
- ✅ **Exports**: Utilise `sale_date` pour filtrer

### 3. Code Frontend

- ✅ **Interface TypeScript**: `sale_date` ajouté
- ✅ **Affichage**: Utilise `sale_date` au lieu de `created_at`
- ✅ **Stats**: Filtre par `sale_date`

### 4. Tests en Dev

- ✅ **Colonne créée**: Vérifiée
- ✅ **275 ventes mises à jour**: `sale_date = created_at`
- ✅ **Aucune vente NULL**: 0 ventes avec `sale_date IS NULL`
- ✅ **API fonctionne**: Plus d'erreur 500
- ✅ **Frontend fonctionne**: Affichage correct

## 🚀 Procédure de Déploiement Staging/Production

### Étape 1: Backup (OBLIGATOIRE)

```bash
# Créer un backup complet
docker-compose exec postgres pg_dump -U recyclic -d recyclic -Fc -f /tmp/backup_pre_b52_p3_$(date +%Y%m%d_%H%M%S).dump

# Vérifier que le backup existe
ls -lh /tmp/backup_pre_b52_p3_*.dump
```

### Étape 2: Vérification Pré-Migration

```bash
# Vérifier version Alembic actuelle
docker-compose run --rm api-migrations alembic current
# Doit afficher: b50_p4_permissions (head)

# Vérifier que la colonne n'existe pas
docker-compose exec postgres psql -U recyclic -d recyclic -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'sale_date';"
# Doit retourner: 0 rows
```

### Étape 3: Application de la Migration

```bash
# Option A: Via Alembic (si détectée)
docker-compose run --rm api-migrations alembic upgrade head

# Option B: Manuelle (si Alembic ne détecte pas)
docker-compose exec postgres psql -U recyclic -d recyclic <<EOF
ALTER TABLE sales ADD COLUMN sale_date TIMESTAMP WITH TIME ZONE;
UPDATE sales SET sale_date = created_at WHERE sale_date IS NULL;
UPDATE alembic_version SET version_num = 'b52_p3_sale_date' WHERE version_num = 'b50_p4_permissions';
EOF
```

### Étape 4: Vérification Post-Migration

```bash
# Vérifier que la colonne existe
docker-compose exec postgres psql -U recyclic -d recyclic -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'sale_date';"
# Doit retourner: sale_date | timestamp with time zone | YES

# Vérifier les données
docker-compose exec postgres psql -U recyclic -d recyclic -c "SELECT COUNT(*) as total, COUNT(sale_date) as with_sale_date, COUNT(CASE WHEN sale_date = created_at THEN 1 END) as matching FROM sales;"
# Doit retourner: total = with_sale_date = matching

# Vérifier qu'il n'y a pas de NULL
docker-compose exec postgres psql -U recyclic -d recyclic -c "SELECT COUNT(*) FROM sales WHERE sale_date IS NULL;"
# Doit retourner: 0 (ou très proche de 0)
```

### Étape 5: Redémarrage API

```bash
# Redémarrer l'API pour charger le nouveau modèle
docker-compose restart api

# Vérifier les logs
docker-compose logs api --tail 20
# Ne doit pas y avoir d'erreur SQL concernant sale_date
```

### Étape 6: Tests Fonctionnels

1. **Créer une vente normale**:
   - Ouvrir une session de caisse
   - Créer une vente
   - Vérifier que `sale_date = created_at` dans la base

2. **Créer une vente différée**:
   - Ouvrir une session différée (date passée)
   - Créer une vente
   - Vérifier que `sale_date = opened_at` et `created_at = NOW()`

3. **Vérifier l'affichage frontend**:
   - Aller sur la page de détail d'une session
   - Vérifier que la date affichée est `sale_date` (pas `created_at`)

4. **Vérifier les exports**:
   - Exporter des statistiques
   - Vérifier que les filtres par date utilisent `sale_date`

## 🔄 Plan de Rollback

Si problème détecté après migration:

```bash
# 1. Arrêter l'API
docker-compose stop api

# 2. Annuler la migration
docker-compose run --rm api-migrations alembic downgrade b50_p4_permissions

# OU manuellement:
docker-compose exec postgres psql -U recyclic -d recyclic <<EOF
ALTER TABLE sales DROP COLUMN IF EXISTS sale_date;
UPDATE alembic_version SET version_num = 'b50_p4_permissions' WHERE version_num = 'b52_p3_sale_date';
EOF

# 3. Restaurer le code (revert commit)
git revert <commit-hash>

# 4. Redémarrer
docker-compose restart api
```

## ⚠️ Points d'Attention

### Performance
- **Impact**: Minimal (ALTER TABLE ADD COLUMN nullable est très rapide)
- **Durée estimée**: < 1 seconde pour 10,000 ventes
- **Verrous**: Pas de verrou exclusif nécessaire

### Données
- **Risque perte**: Aucun (sale_date est une copie de created_at)
- **Rétrocompatibilité**: Oui (colonne nullable)
- **Rollback**: Possible sans perte (sale_date supprimé, created_at intact)

### Code
- **Dépendance**: Le code backend/frontend nécessite `sale_date`
- **Ordre déploiement**: Migration AVANT code (ou code compatible avec colonne absente)

## ✅ Validation Finale

Après déploiement, vérifier:

- [ ] Colonne `sale_date` existe dans la base
- [ ] Toutes les ventes existantes ont `sale_date = created_at`
- [ ] Aucune erreur dans les logs API
- [ ] Frontend affiche correctement les dates
- [ ] Création de vente normale fonctionne
- [ ] Création de vente différée fonctionne
- [ ] Exports utilisent `sale_date`
- [ ] Statistiques se chargent sans erreur 500

## 📝 Notes

- La migration a été **testée en dev** avec succès
- 275 ventes mises à jour sans problème
- API fonctionne correctement après migration
- Migration **sûre** et **réversible**



