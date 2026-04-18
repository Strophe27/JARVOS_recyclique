"""
Point d'entrée historique à la racine de ``src/``.
La CLI supportée est ``recyclic_api.cli`` (create-super-admin, exports, etc.).
"""
from recyclic_api.cli import create_super_admin, main

__all__ = ["create_super_admin", "main"]

if __name__ == "__main__":
    main()
