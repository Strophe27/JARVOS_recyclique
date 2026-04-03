#!/usr/bin/env python3
"""
Script de test pour valider la migration b52_p3_add_sale_date_to_sales
Teste l'upgrade et le downgrade sur une base de données de test
"""

import sys
import os
from pathlib import Path

# Ajouter le chemin src au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent / "src"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from alembic import command
from alembic.config import Config
import tempfile
import shutil

def test_migration():
    """Teste la migration sur une base de données temporaire"""
    
    # Créer une base de données de test temporaire
    test_db_url = "postgresql://recyclic:your_postgres_password@postgres:5432/recyclic_test_migration"
    
    print("=" * 60)
    print("TEST DE MIGRATION B52-P3: sale_date")
    print("=" * 60)
    
    # Configuration Alembic
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", test_db_url)
    
    try:
        # Créer la base de données de test si elle n'existe pas
        admin_url = "postgresql://recyclic:your_postgres_password@postgres:5432/postgres"
        admin_engine = create_engine(admin_url)
        with admin_engine.connect() as conn:
            conn.execute(text("COMMIT"))
            conn.execute(text("CREATE DATABASE recyclic_test_migration"))
        admin_engine.dispose()
        print("✓ Base de données de test créée")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("✓ Base de données de test existe déjà")
        else:
            print(f"⚠ Base de données de test: {e}")
    
    # Créer l'engine pour la base de test
    engine = create_engine(test_db_url)
    
    try:
        # 1. Appliquer toutes les migrations jusqu'à b50_p4_permissions
        print("\n1. Application des migrations jusqu'à b50_p4_permissions...")
        command.upgrade(alembic_cfg, "b50_p4_permissions")
        print("✓ Migrations appliquées jusqu'à b50_p4_permissions")
        
        # 2. Vérifier que la colonne sale_date n'existe pas
        print("\n2. Vérification: colonne sale_date n'existe pas...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales' AND column_name = 'sale_date'
            """))
            if result.fetchone():
                print("✗ ERREUR: La colonne sale_date existe déjà!")
                return False
            else:
                print("✓ Colonne sale_date n'existe pas (attendu)")
        
        # 3. Créer quelques ventes de test
        print("\n3. Création de ventes de test...")
        with engine.connect() as conn:
            # Créer un utilisateur et une session de test si nécessaire
            conn.execute(text("""
                INSERT INTO users (id, username, hashed_password, role, status, is_active)
                VALUES (
                    '00000000-0000-0000-0000-000000000001',
                    'test_user',
                    'hashed',
                    'user',
                    'active',
                    true
                )
                ON CONFLICT (id) DO NOTHING
            """))
            conn.execute(text("""
                INSERT INTO sites (id, name, is_active)
                VALUES ('00000000-0000-0000-0000-000000000001', 'Test Site', true)
                ON CONFLICT (id) DO NOTHING
            """))
            conn.execute(text("""
                INSERT INTO cash_sessions (id, operator_id, site_id, initial_amount, current_amount, status, opened_at)
                VALUES (
                    '00000000-0000-0000-0000-000000000001',
                    '00000000-0000-0000-0000-000000000001',
                    '00000000-0000-0000-0000-000000000001',
                    100.0,
                    100.0,
                    'open',
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING
            """))
            # Créer des ventes de test
            conn.execute(text("""
                INSERT INTO sales (id, cash_session_id, operator_id, total_amount, created_at)
                VALUES 
                    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 10.0, NOW() - INTERVAL '1 day'),
                    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 20.0, NOW() - INTERVAL '2 hours'),
                    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 30.0, NOW())
                ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount
            """))
            conn.commit()
        print("✓ 3 ventes de test créées")
        
        # 4. Appliquer la migration b52_p3
        print("\n4. Application de la migration b52_p3_add_sale_date_to_sales...")
        command.upgrade(alembic_cfg, "b52_p3_sale_date")
        print("✓ Migration b52_p3 appliquée")
        
        # 5. Vérifier que la colonne existe
        print("\n5. Vérification: colonne sale_date existe...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'sales' AND column_name = 'sale_date'
            """))
            row = result.fetchone()
            if row:
                print(f"✓ Colonne sale_date existe: {row[1]}, nullable={row[2]}")
            else:
                print("✗ ERREUR: La colonne sale_date n'existe pas!")
                return False
        
        # 6. Vérifier que toutes les ventes ont sale_date = created_at
        print("\n6. Vérification: sale_date = created_at pour toutes les ventes...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT COUNT(*) as total,
                       COUNT(sale_date) as with_sale_date,
                       COUNT(CASE WHEN sale_date = created_at THEN 1 END) as matching_dates
                FROM sales
            """))
            row = result.fetchone()
            print(f"  Total ventes: {row[0]}")
            print(f"  Avec sale_date: {row[1]}")
            print(f"  sale_date = created_at: {row[2]}")
            if row[0] == row[1] == row[2]:
                print("✓ Toutes les ventes ont sale_date = created_at")
            else:
                print("✗ ERREUR: Certaines ventes n'ont pas sale_date = created_at!")
                return False
        
        # 7. Test du downgrade
        print("\n7. Test du downgrade (annulation de la migration)...")
        command.downgrade(alembic_cfg, "b50_p4_permissions")
        print("✓ Downgrade effectué")
        
        # 8. Vérifier que la colonne n'existe plus
        print("\n8. Vérification: colonne sale_date supprimée...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales' AND column_name = 'sale_date'
            """))
            if result.fetchone():
                print("✗ ERREUR: La colonne sale_date existe encore après downgrade!")
                return False
            else:
                print("✓ Colonne sale_date supprimée (attendu)")
        
        # 9. Réappliquer la migration
        print("\n9. Réapplication de la migration...")
        command.upgrade(alembic_cfg, "b52_p3_sale_date")
        print("✓ Migration réappliquée")
        
        print("\n" + "=" * 60)
        print("✓✓✓ TOUS LES TESTS SONT PASSÉS ✓✓✓")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗✗✗ ERREUR LORS DU TEST ✗✗✗")
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Nettoyer: supprimer la base de test
        try:
            engine.dispose()
            admin_engine = create_engine("postgresql://recyclic:your_postgres_password@postgres:5432/postgres")
            with admin_engine.connect() as conn:
                conn.execute(text("COMMIT"))
                conn.execute(text("DROP DATABASE IF EXISTS recyclic_test_migration"))
            admin_engine.dispose()
            print("\n✓ Base de données de test nettoyée")
        except Exception as e:
            print(f"⚠ Impossible de nettoyer la base de test: {e}")

if __name__ == "__main__":
    success = test_migration()
    sys.exit(0 if success else 1)



