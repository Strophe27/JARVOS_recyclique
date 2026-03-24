"""Test simple pour vérifier que la migration B49-P1 est appliquée."""
import pytest
from sqlalchemy import create_engine, text
import os

def test_migration_applied_to_test_db():
    """Vérifie que les colonnes de la migration B49-P1 existent dans la base de test."""
    test_db_url = os.getenv("TEST_DATABASE_URL", "postgresql://recyclic:your_postgres_password@postgres:5432/recyclic_test")
    engine = create_engine(test_db_url)
    
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cash_registers' 
            AND column_name IN ('workflow_options', 'enable_virtual', 'enable_deferred')
            ORDER BY column_name
        """))
        
        columns = {row[0]: row[1] for row in result}
        
        assert 'workflow_options' in columns, "Colonne workflow_options manquante"
        assert 'enable_virtual' in columns, "Colonne enable_virtual manquante"
        assert 'enable_deferred' in columns, "Colonne enable_deferred manquante"
        
        assert columns['workflow_options'] in ['jsonb', 'USER-DEFINED'], f"Type incorrect pour workflow_options: {columns['workflow_options']}"
        assert columns['enable_virtual'] == 'boolean', f"Type incorrect pour enable_virtual: {columns['enable_virtual']}"
        assert columns['enable_deferred'] == 'boolean', f"Type incorrect pour enable_deferred: {columns['enable_deferred']}"
        
        print("✅ Toutes les colonnes de la migration B49-P1 sont présentes")



