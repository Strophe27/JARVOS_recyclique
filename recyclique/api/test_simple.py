#!/usr/bin/env python3
"""Test simple de la CLI create-super-admin"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from recyclic_api.cli import create_super_admin


def test_create_super_admin():
    """Test de création d'un super admin"""
    print("🧪 Test de création d'un super admin...")

    try:
        uname = "john_doe_sa"
        create_super_admin(uname, "SecureP@ss1!")
        print("✅ Super admin créé avec succès !")

        from recyclic_api.core.database import get_db
        from recyclic_api.models.user import User

        db = next(get_db())
        user = db.query(User).filter(User.username == uname).first()

        if user:
            print(f"✅ Utilisateur trouvé: {user.first_name} {user.last_name}")
            print(f"   Role: {user.role}")
            print(f"   Status: {user.status}")
            print(f"   Actif: {user.is_active}")
        else:
            print("❌ Utilisateur non trouvé")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_create_super_admin()
