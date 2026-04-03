#!/usr/bin/env python3
"""
Script de diagnostic pour vérifier le système de logging transactionnel.

Usage:
    python scripts/check_transaction_logs.py
"""
import sys
from pathlib import Path
import json
import os

# Ajouter le répertoire src au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from recyclic_api.core.logging import (
    TRANSACTION_LOG_DIR,
    TRANSACTION_LOG_FILE,
    get_transaction_logger,
    log_transaction_event
)


def check_log_directory():
    """Vérifier que le répertoire de logs existe et est accessible."""
    print("=" * 60)
    print("Vérification du répertoire de logs")
    print("=" * 60)
    
    print(f"Répertoire de travail: {os.getcwd()}")
    print(f"Répertoire de logs: {TRANSACTION_LOG_DIR.absolute()}")
    print(f"Fichier de logs: {TRANSACTION_LOG_FILE.absolute()}")
    
    # Vérifier que le répertoire existe
    if TRANSACTION_LOG_DIR.exists():
        print(f"✅ Répertoire existe: {TRANSACTION_LOG_DIR}")
    else:
        print(f"❌ Répertoire n'existe pas: {TRANSACTION_LOG_DIR}")
        print("   Tentative de création...")
        try:
            TRANSACTION_LOG_DIR.mkdir(parents=True, exist_ok=True)
            print(f"✅ Répertoire créé: {TRANSACTION_LOG_DIR}")
        except Exception as e:
            print(f"❌ Erreur lors de la création: {e}")
            return False
    
    # Vérifier les permissions
    if os.access(TRANSACTION_LOG_DIR, os.W_OK):
        print(f"✅ Répertoire accessible en écriture")
    else:
        print(f"❌ Répertoire non accessible en écriture")
        return False
    
    return True


def check_log_file():
    """Vérifier le fichier de logs."""
    print("\n" + "=" * 60)
    print("Vérification du fichier de logs")
    print("=" * 60)
    
    if TRANSACTION_LOG_FILE.exists():
        print(f"✅ Fichier existe: {TRANSACTION_LOG_FILE}")
        size = TRANSACTION_LOG_FILE.stat().st_size
        print(f"   Taille: {size} octets")
        
        # Lire les dernières lignes
        try:
            with open(TRANSACTION_LOG_FILE, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                print(f"   Nombre de lignes: {len(lines)}")
                
                if lines:
                    print("\n   Dernières entrées:")
                    for line in lines[-5:]:  # Afficher les 5 dernières
                        try:
                            entry = json.loads(line.strip())
                            print(f"   - {entry.get('event', 'UNKNOWN')} à {entry.get('timestamp', 'N/A')}")
                        except json.JSONDecodeError:
                            print(f"   - Ligne invalide: {line[:50]}...")
        except Exception as e:
            print(f"❌ Erreur lors de la lecture: {e}")
            return False
    else:
        print(f"⚠️  Fichier n'existe pas encore: {TRANSACTION_LOG_FILE}")
        print("   (C'est normal s'il n'y a pas encore eu de logs)")
    
    return True


def test_logging():
    """Tester le système de logging."""
    print("\n" + "=" * 60)
    print("Test du système de logging")
    print("=" * 60)
    
    try:
        logger = get_transaction_logger()
        print("✅ Logger initialisé")
        
        # Tester un log
        print("\n   Envoi d'un log de test...")
        log_transaction_event("TEST_EVENT", {
            "test": True,
            "message": "Test de diagnostic"
        })
        
        # Attendre un peu pour que le queue listener écrive
        import time
        time.sleep(0.5)
        
        # Vérifier que le log a été écrit
        if TRANSACTION_LOG_FILE.exists():
            with open(TRANSACTION_LOG_FILE, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                if lines:
                    last_line = lines[-1].strip()
                    try:
                        entry = json.loads(last_line)
                        if entry.get('event') == 'TEST_EVENT':
                            print("✅ Log de test écrit avec succès")
                            print(f"   Contenu: {json.dumps(entry, indent=2)}")
                            return True
                        else:
                            print(f"⚠️  Dernier log n'est pas le test: {entry.get('event')}")
                    except json.JSONDecodeError:
                        print(f"❌ Dernière ligne n'est pas du JSON valide")
        else:
            print("⚠️  Fichier de logs n'existe toujours pas après le test")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def main():
    """Fonction principale."""
    print("\n" + "=" * 60)
    print("DIAGNOSTIC DU SYSTÈME DE LOGGING TRANSACTIONNEL")
    print("=" * 60 + "\n")
    
    results = []
    
    # Vérifier le répertoire
    results.append(("Répertoire de logs", check_log_directory()))
    
    # Vérifier le fichier
    results.append(("Fichier de logs", check_log_file()))
    
    # Tester le logging
    results.append(("Test de logging", test_logging()))
    
    # Résumé
    print("\n" + "=" * 60)
    print("RÉSUMÉ")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ OK" if result else "❌ ÉCHEC"
        print(f"{status} - {name}")
    
    all_ok = all(result for _, result in results)
    
    if all_ok:
        print("\n✅ Tous les tests sont passés. Le système de logging fonctionne.")
    else:
        print("\n❌ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
    
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

