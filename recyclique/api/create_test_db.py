#!/usr/bin/env python3
"""
Script simple pour créer les tables dans la base de données de test
"""

import os
import sys
from sqlalchemy import create_engine

# Configuration de la base de données de test
database_url = os.getenv("TEST_DATABASE_URL", "postgresql://recyclic:postgres@postgres:5432/recyclic_test")

print(f"🔧 Connexion à la base de données: {database_url}")

# Créer le moteur
engine = create_engine(database_url)

try:
    print("🔧 Création des tables...")

    # Importer tous les modèles pour s'assurer qu'ils sont enregistrés dans Base.metadata
    from recyclic_api.models.user import User
    from recyclic_api.models.site import Site
    from recyclic_api.models.deposit import Deposit
    from recyclic_api.models.sale import Sale
    from recyclic_api.models.sale_item import SaleItem
    from recyclic_api.models.cash_session import CashSession
    from recyclic_api.models.cash_register import CashRegister
    from recyclic_api.models.login_history import LoginHistory
    from recyclic_api.models.sync_log import SyncLog
    from recyclic_api.models.registration_request import RegistrationRequest
    from recyclic_api.models.user_status_history import UserStatusHistory
    # Import correct AdminSetting model (singular module/file)
    from recyclic_api.models.admin_setting import AdminSetting

    # Reception domain models to ensure tables are created in tests
    from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
    from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
    from recyclic_api.models.ligne_depot import LigneDepot

    # Créer toutes les tables
    from recyclic_api.core.database import Base
    Base.metadata.create_all(bind=engine)

    print("✅ Tables créées avec succès dans la base de données de test")
except Exception as e:
    print(f"❌ Erreur lors de la création des tables: {e}")
    sys.exit(1)

# Vérifier les tables créées
try:
    with engine.connect() as conn:
        result = conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
        tables = [row[0] for row in result]
        print(f"📋 Tables créées: {', '.join(tables)}")

        if 'users' in tables:
            print("✅ Table 'users' créée avec succès")
        else:
            print("❌ Table 'users' manquante")
            sys.exit(1)
except Exception as e:
    print(f"❌ Erreur lors de la vérification des tables: {e}")
    sys.exit(1)

print("🎉 Base de données de test prête pour les tests")
print("✅ Toutes les tables ont été créées avec succès")
