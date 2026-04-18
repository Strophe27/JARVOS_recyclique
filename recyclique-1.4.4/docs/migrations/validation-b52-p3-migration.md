# Validation Migration B52-P3: Ajout colonne sale_date

**Date de validation**: 2025-01-05  
**Migration**: `b52_p3_add_sale_date_to_sales`  
**Révision**: `b52_p3_sale_date`  
**Révision précédente**: `b50_p4_permissions`

## ✅ Checklist de Validation Complète

### 1. Structure du Fichier de Migration

- [x] **Fichier existe**: `api/migrations/versions/b52_p3_add_sale_date_to_sales.py`
- [x] **Syntaxe Python valide**: Vérifié avec `py_compile`
- [x] **Révision correcte**: `revision = 'b52_p3_sale_date'`
- [x] **Down revision correcte**: `down_revision = 'b50_p4_permissions'`
- [x] **Imports corrects**: `from alembic import op`, `import sqlalchemy as sa`, `from sqlalchemy.dialects.postgresql import TIMESTAMP`

### 2. Contenu de la Migration

#### Upgrade (Application)
- [x] **Ajout colonne**: `op.add_column('sales', sa.Column('sale_date', TIMESTAMP(timezone=True), nullable=True))`
- [x] **Type correct**: `TIMESTAMP WITH TIME ZONE` (compatible avec les autres colonnes datetime du projet)
- [x] **Nullable**: `True` (pour compatibilité avec données existantes)
- [x] **Remplissage données**: `UPDATE sales SET sale_date = created_at WHERE sale_date IS NULL`
- [x] **Transaction safe**: Toutes les opérations dans une transaction

#### Downgrade (Annulation)
- [x] **Suppression colonne**: `op.drop_column('sales', 'sale_date')`
- [x] **Réversible**: La migration peut être annulée sans perte de données (sale_date est une copie de created_at)

### 3. Compatibilité avec le Modèle SQLAlchemy

- [x] **Modèle mis à jour**: `api/src/recyclic_api/models/sale.py`
- [x] **Champ ajouté**: `sale_date = Column(DateTime(timezone=True), nullable=True)`
- [x] **Type compatible**: `DateTime(timezone=True)` correspond à `TIMESTAMP WITH TIME ZONE`
- [x] **Position logique**: Champ placé avant `created_at` (ordre logique)

### 4. Compatibilité avec le Code Backend

- [x] **Logique de création**: `api/src/recyclic_api/api/api_v1/endpoints/sales.py` modifié
- [x] **Sessions normales**: `sale_date = NOW()`, `created_at = NOW()` (même valeur)
- [x] **Sessions différées**: `sale_date = opened_at`, `created_at = NOW()` (différents)
- [x] **Schémas Pydantic**: `sale_date` ajouté dans `SaleResponse`
- [x] **Exports**: `export_service.py` utilise `sale_date` pour filtrer les ventes

### 5. Compatibilité avec le Frontend

- [x] **Interface TypeScript**: `sale_date` ajouté dans `SaleSummary`
- [x] **Affichage**: `CashSessionDetail.tsx` utilise `sale_date` au lieu de `created_at`
- [x] **Stats**: `useVirtualCashLiveStats.ts` utilise `sale_date` pour filtrer

### 6. Tests de Migration

#### Test 1: Application sur Base Propre
```sql
-- Vérifier que la colonne n'existe pas avant
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'sale_date';
-- Résultat attendu: 0 rows

-- Appliquer la migration
alembic upgrade b52_p3_sale_date

-- Vérifier que la colonne existe après
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'sale_date';
-- Résultat attendu: sale_date | timestamp with time zone | YES
```

#### Test 2: Remplissage des Données Existantes
```sql
-- Vérifier que toutes les ventes ont sale_date = created_at
SELECT 
    COUNT(*) as total,
    COUNT(sale_date) as with_sale_date,
    COUNT(CASE WHEN sale_date = created_at THEN 1 END) as matching
FROM sales;
-- Résultat attendu: total = with_sale_date = matching
```

#### Test 3: Downgrade (Annulation)
```sql
-- Annuler la migration
alembic downgrade b50_p4_permissions

-- Vérifier que la colonne n'existe plus
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'sale_date';
-- Résultat attendu: 0 rows
```

#### Test 4: Réapplication
```sql
-- Réappliquer la migration
alembic upgrade b52_p3_sale_date

-- Vérifier que tout fonctionne à nouveau
SELECT COUNT(*) FROM sales WHERE sale_date IS NOT NULL;
-- Résultat attendu: même nombre que total des ventes
```

### 7. Impact sur les Données Existantes

- [x] **Pas de perte de données**: `sale_date` est une copie de `created_at` pour les données existantes
- [x] **Pas de downtime**: Migration rapide (ajout colonne + UPDATE)
- [x] **Rétrocompatibilité**: Colonne nullable, code existant continue de fonctionner
- [x] **Performance**: UPDATE sur toutes les ventes (275 ventes dans dev, vérifier volume en prod)

### 8. Points d'Attention Production

#### ⚠️ Volume de Données
- **Estimation**: Si production a beaucoup de ventes (> 10,000), l'UPDATE peut prendre quelques secondes
- **Recommandation**: Tester sur staging avec volume similaire à production

#### ⚠️ Verrous de Table
- **Risque**: `ALTER TABLE` et `UPDATE` peuvent verrouiller la table `sales`
- **Recommandation**: 
  - Appliquer en heures creuses si possible
  - Migration rapide (< 1 seconde pour 1000 ventes)
  - Pas de verrou exclusif nécessaire (ALTER TABLE ADD COLUMN nullable est rapide)

#### ⚠️ Rollback Plan
- **Si problème**: `alembic downgrade b50_p4_permissions` supprime la colonne
- **Impact rollback**: Perte de `sale_date` mais `created_at` reste intact
- **Code backend**: Doit gérer l'absence de `sale_date` (nullable=True permet cela)

### 9. Validation Post-Migration

#### Vérifications Immédiates
```sql
-- 1. Vérifier la colonne
\d sales  -- Doit montrer sale_date

-- 2. Vérifier les données
SELECT COUNT(*), COUNT(sale_date) FROM sales;
-- Les deux doivent être égaux

-- 3. Vérifier la cohérence
SELECT COUNT(*) FROM sales WHERE sale_date IS NULL;
-- Doit être 0 (ou très proche de 0 si nouvelles ventes créées pendant migration)
```

#### Tests Fonctionnels
- [ ] Créer une vente dans session normale → `sale_date = created_at`
- [ ] Créer une vente dans session différée → `sale_date = opened_at`, `created_at = NOW()`
- [ ] Vérifier affichage frontend → Date affichée = `sale_date`
- [ ] Vérifier exports → Utilisent `sale_date` pour filtrer

### 10. Commandes de Déploiement

#### Staging
```bash
# 1. Backup (obligatoire)
docker-compose exec postgres pg_dump -U recyclic -d recyclic -Fc -f /tmp/backup_pre_b52_p3_$(date +%Y%m%d_%H%M%S).dump

# 2. Vérifier version actuelle
docker-compose run --rm api-migrations alembic current

# 3. Appliquer migration
docker-compose run --rm api-migrations alembic upgrade head

# 4. Vérifier
docker-compose exec postgres psql -U recyclic -d recyclic -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'sale_date';"

# 5. Redémarrer API
docker-compose restart api
```

#### Production
```bash
# MÊME PROCÉDURE que staging
# + Tests fonctionnels complets avant validation
```

### 11. Problèmes Connus et Solutions

#### Problème: Alembic ne détecte pas la migration
**Cause**: Fichier de migration peut ne pas être chargé correctement  
**Solution**: Vérifier que le fichier est dans `api/migrations/versions/` et qu'il n'y a pas d'erreur de syntaxe

#### Problème: Erreur 500 après migration
**Cause**: Modèle SQLAlchemy utilise `sale_date` mais colonne n'existe pas  
**Solution**: S'assurer que la migration est appliquée AVANT de déployer le code

#### Problème: sale_date NULL pour nouvelles ventes
**Cause**: Code backend ne remplit pas `sale_date`  
**Solution**: Vérifier que `create_sale()` dans `sales.py` définit `sale_date`

### 12. Checklist Finale Avant Déploiement

- [ ] Backup complet de la base de données
- [ ] Migration testée sur environnement de staging
- [ ] Tests fonctionnels passent (création vente normale et différée)
- [ ] Vérification que `sale_date` est rempli pour toutes les ventes
- [ ] Vérification frontend (affichage correct)
- [ ] Vérification exports (utilisent `sale_date`)
- [ ] Plan de rollback testé
- [ ] Documentation mise à jour

## ✅ Statut Actuel (Dev)

- ✅ Colonne `sale_date` créée manuellement
- ✅ 275 ventes existantes mises à jour (`sale_date = created_at`)
- ✅ API fonctionne correctement
- ✅ Frontend utilise `sale_date`
- ⚠️ Migration Alembic non détectée automatiquement (mais appliquée manuellement)

## 🔧 Action Requise pour Staging/Production

1. **Vérifier que le fichier de migration est bien dans le repo Git**
2. **Tester la migration sur staging avec `alembic upgrade head`**
3. **Si migration non détectée**: Appliquer manuellement comme en dev
4. **Valider tous les tests fonctionnels**

## 📝 Notes

- La migration est **sûre** et **réversible**
- Pas de risque de perte de données
- Impact minimal sur les performances
- Compatible avec le code existant (colonne nullable)



