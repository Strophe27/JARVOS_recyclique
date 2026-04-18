#!/usr/bin/env python3
"""
Script pour vérifier si les données de réception sont présentes dans un dump PostgreSQL.
"""
import sys
import subprocess
import os

def check_dump_for_reception(dump_path):
    """Vérifie si les tables de réception sont présentes dans le dump."""
    if not os.path.exists(dump_path):
        print(f"❌ Fichier introuvable: {dump_path}")
        return False
    
    print(f"📦 Analyse du dump: {dump_path}\n")
    
    # Lister le contenu du dump
    try:
        result = subprocess.run(
            ["pg_restore", "--list", dump_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"❌ Erreur lors de la lecture du dump: {result.stderr}")
            return False
        
        output = result.stdout
        
        # Vérifier les tables de réception
        tables_to_check = [
            "poste_reception",
            "ticket_depot", 
            "ligne_depot"
        ]
        
        found_tables = {}
        for table in tables_to_check:
            # Chercher la définition de la table
            if f"TABLE {table}" in output or f"TABLE public {table}" in output:
                found_tables[table] = "TABLE"
            # Chercher les données de la table
            if f"TABLE DATA {table}" in output or f"TABLE DATA public {table}" in output:
                found_tables[table] = "TABLE + DATA"
        
        print("📊 Résultats:\n")
        all_found = True
        for table in tables_to_check:
            status = found_tables.get(table, "❌ NON TROUVÉ")
            if status == "❌ NON TROUVÉ":
                all_found = False
                print(f"  {table}: {status}")
            else:
                print(f"  {table}: ✅ {status}")
        
        # Compter le nombre total d'entrées dans le dump
        total_lines = len([l for l in output.split('\n') if l.strip() and not l.startswith(';')])
        print(f"\n📈 Total d'entrées dans le dump: {total_lines}")
        
        return all_found
        
    except subprocess.TimeoutExpired:
        print("❌ Timeout lors de la lecture du dump")
        return False
    except FileNotFoundError:
        print("❌ pg_restore non trouvé. Assurez-vous que postgresql-client est installé.")
        return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check-dump-reception.py <chemin_vers_dump.dump>")
        sys.exit(1)
    
    dump_path = sys.argv[1]
    success = check_dump_for_reception(dump_path)
    sys.exit(0 if success else 1)








