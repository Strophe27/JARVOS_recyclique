#!/usr/bin/env python3
"""
Script de correction pour fermer/supprimer les sessions différées bloquées.

Usage:
    python scripts/fix-blocked-deferred-sessions.py [--dry-run] [--delete-empty]
    
Options:
    --dry-run: Affiche ce qui serait fait sans modifier la base
    --delete-empty: Supprime les sessions vides au lieu de les fermer
"""

import sys
import os
import argparse
from datetime import datetime, timezone
from pathlib import Path

# Ajouter le répertoire api au path
sys.path.insert(0, str(Path(__file__).parent.parent / "api" / "src"))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem

# Configuration de la base de données
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://recyclic:recyclic@localhost:5432/recyclic")

def fix_blocked_sessions(dry_run=False, delete_empty=False):
    """Corrige les sessions différées bloquées."""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        now = datetime.now(timezone.utc)
        
        print("=" * 80)
        print("CORRECTION : Sessions différées bloquées")
        print("=" * 80)
        print(f"Mode: {'DRY-RUN (simulation)' if dry_run else 'EXÉCUTION RÉELLE'}")
        print(f"Supprimer les sessions vides: {delete_empty}")
        print()
        
        # Rechercher toutes les sessions différées ouvertes
        deferred_sessions = db.query(CashSession).filter(
            CashSession.status == CashSessionStatus.OPEN,
            CashSession.opened_at < now
        ).all()
        
        print(f"Sessions différées ouvertes trouvées : {len(deferred_sessions)}")
        print()
        
        if len(deferred_sessions) == 0:
            print("✅ Aucune session différée bloquée trouvée.")
            return
        
        fixed_count = 0
        deleted_count = 0
        error_count = 0
        
        for session in deferred_sessions:
            print(f"Session ID: {session.id}")
            print(f"  Opened at: {session.opened_at}")
            print(f"  Register ID: {session.register_id}")
            print(f"  Operator ID: {session.operator_id}")
            
            # Compter les ventes réelles
            sales_count = db.query(Sale).filter(Sale.cash_session_id == session.id).count()
            items_count = db.query(SaleItem).join(Sale).filter(Sale.cash_session_id == session.id).count()
            
            print(f"  Ventes: {sales_count}, Articles: {items_count}")
            
            # Vérifier si la session est vide
            is_empty = (session.total_sales == 0 or session.total_sales is None) and \
                      (session.total_items == 0 or session.total_items is None) and \
                      sales_count == 0
            
            print(f"  Session vide: {is_empty}")
            
            if is_empty:
                if delete_empty:
                    print(f"  → Action: SUPPRESSION (session vide)")
                    if not dry_run:
                        try:
                            # Supprimer la session (les ventes seront supprimées en cascade)
                            db.delete(session)
                            db.commit()
                            deleted_count += 1
                            print(f"  ✅ Session supprimée avec succès")
                        except Exception as e:
                            db.rollback()
                            error_count += 1
                            print(f"  ❌ Erreur lors de la suppression: {e}")
                    else:
                        print(f"  [DRY-RUN] Serait supprimée")
                        deleted_count += 1
                else:
                    print(f"  → Action: FERMETURE (session vide, montant initial conservé)")
                    if not dry_run:
                        try:
                            # Fermer la session avec le montant initial
                            session.status = CashSessionStatus.CLOSED
                            session.closed_at = datetime.now(timezone.utc)
                            # Calculer le montant théorique (juste le fond initial)
                            theoretical_amount = session.initial_amount or 0.0
                            session.variance = 0.0  # Pas d'écart pour une session vide
                            session.variance_comment = None
                            db.commit()
                            fixed_count += 1
                            print(f"  ✅ Session fermée avec succès")
                        except Exception as e:
                            db.rollback()
                            error_count += 1
                            print(f"  ❌ Erreur lors de la fermeture: {e}")
                    else:
                        print(f"  [DRY-RUN] Serait fermée")
                        fixed_count += 1
            else:
                print(f"  → Action: FERMETURE (session avec transactions)")
                if not dry_run:
                    try:
                        # Calculer le montant théorique
                        total_donations = db.query(func.coalesce(func.sum(Sale.donation), 0)).filter(
                            Sale.cash_session_id == session.id
                        ).scalar() or 0.0
                        total_donations = float(total_donations)
                        
                        theoretical_amount = (session.initial_amount or 0.0) + (session.total_sales or 0.0) + total_donations
                        # Utiliser le montant théorique comme montant physique (pas d'écart)
                        actual_amount = theoretical_amount
                        
                        # Fermer la session
                        session.status = CashSessionStatus.CLOSED
                        session.closed_at = datetime.now(timezone.utc)
                        session.variance = 0.0
                        session.variance_comment = "Fermeture automatique - session différée bloquée"
                        db.commit()
                        fixed_count += 1
                        print(f"  ✅ Session fermée avec succès (montant théorique: {theoretical_amount:.2f}€)")
                    except Exception as e:
                        db.rollback()
                        error_count += 1
                        print(f"  ❌ Erreur lors de la fermeture: {e}")
                else:
                    print(f"  [DRY-RUN] Serait fermée")
                    fixed_count += 1
            
            print("-" * 80)
            print()
        
        print("=" * 80)
        print("RÉSUMÉ")
        print("=" * 80)
        print(f"Sessions fermées: {fixed_count}")
        print(f"Sessions supprimées: {deleted_count}")
        print(f"Erreurs: {error_count}")
        print()
        
        if dry_run:
            print("⚠️  Mode DRY-RUN: Aucune modification n'a été effectuée")
            print("   Relancez sans --dry-run pour appliquer les corrections")
        else:
            print("✅ Corrections appliquées avec succès")
        
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Corrige les sessions différées bloquées")
    parser.add_argument("--dry-run", action="store_true", help="Simule les corrections sans modifier la base")
    parser.add_argument("--delete-empty", action="store_true", help="Supprime les sessions vides au lieu de les fermer")
    args = parser.parse_args()
    
    fix_blocked_sessions(dry_run=args.dry_run, delete_empty=args.delete_empty)
