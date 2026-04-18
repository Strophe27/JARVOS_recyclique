#!/usr/bin/env python3
"""
Script de diagnostic pour la session bloquée du 4 octobre 2025.

Usage:
    python scripts/diagnose-blocked-session.py
"""

import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Ajouter le répertoire api au path
sys.path.insert(0, str(Path(__file__).parent.parent / "api" / "src"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem

# Configuration de la base de données (à adapter selon votre environnement)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://recyclic:recyclic@localhost:5432/recyclic")

def diagnose_blocked_session():
    """Diagnostique la session bloquée du 4 octobre 2025."""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Date cible : 4 octobre 2025
        target_date = datetime(2025, 10, 4, 0, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(2025, 10, 5, 0, 0, 0, tzinfo=timezone.utc)
        
        print("=" * 80)
        print("DIAGNOSTIC : Session bloquée du 4 octobre 2025")
        print("=" * 80)
        print()
        
        # Rechercher toutes les sessions ouvertes avec opened_at autour du 4 octobre
        sessions = db.query(CashSession).filter(
            CashSession.opened_at >= target_date,
            CashSession.opened_at < end_date,
            CashSession.status == CashSessionStatus.OPEN
        ).all()
        
        print(f"Sessions ouvertes trouvées pour le 4 octobre 2025 : {len(sessions)}")
        print()
        
        for session in sessions:
            print(f"Session ID: {session.id}")
            print(f"  Opérateur ID: {session.operator_id}")
            print(f"  Register ID: {session.register_id}")
            print(f"  Status: {session.status}")
            print(f"  Opened at: {session.opened_at}")
            print(f"  Closed at: {session.closed_at}")
            print(f"  Initial amount: {session.initial_amount}")
            print(f"  Current amount: {session.current_amount}")
            print(f"  Total sales: {session.total_sales}")
            print(f"  Total items: {session.total_items}")
            
            # Compter les ventes réelles
            sales_count = db.query(Sale).filter(Sale.cash_session_id == session.id).count()
            items_count = db.query(SaleItem).join(Sale).filter(Sale.cash_session_id == session.id).count()
            
            print(f"  Ventes réelles (DB): {sales_count}")
            print(f"  Articles réels (DB): {items_count}")
            
            # Vérifier si la session est vide
            is_empty = (session.total_sales == 0 or session.total_sales is None) and \
                      (session.total_items == 0 or session.total_items is None) and \
                      sales_count == 0
            
            print(f"  Session vide: {is_empty}")
            print()
            
            if is_empty:
                print("  ⚠️  RECOMMANDATION: Cette session peut être supprimée (vide)")
            else:
                print("  ⚠️  RECOMMANDATION: Cette session doit être fermée (contient des transactions)")
            
            print("-" * 80)
            print()
        
        # Rechercher aussi les sessions différées ouvertes en général
        now = datetime.now(timezone.utc)
        all_deferred_open = db.query(CashSession).filter(
            CashSession.status == CashSessionStatus.OPEN,
            CashSession.opened_at < now
        ).all()
        
        print(f"\nSessions différées ouvertes (toutes dates) : {len(all_deferred_open)}")
        if len(all_deferred_open) > 0:
            print("\n⚠️  ATTENTION: Il y a des sessions différées ouvertes qui peuvent bloquer le système")
            for sess in all_deferred_open:
                print(f"  - Session {sess.id}: opened_at={sess.opened_at}, register_id={sess.register_id}")
        
    finally:
        db.close()

if __name__ == "__main__":
    diagnose_blocked_session()
