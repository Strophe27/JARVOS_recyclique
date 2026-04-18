#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour vérifier la cohérence finale et clôturer le workflow.
"""
import json
import sys
from pathlib import Path
from config_loader import validate_meeting_id


def verify_artifacts(meeting_id: str):
    """Vérifie la cohérence de tous les artefacts"""
    
    meeting_dir = Path("meetings") / meeting_id
    
    checks = {
        'structure': True,
        'metadata': True,
        'paths': True,
        'completeness': True
    }
    
    issues = []
    
    # Vérifier structure
    required_dirs = ['audio', 'transcriptions', 'working/segments', 'working/summaries', 'final']
    for dir_path in required_dirs:
        full_path = meeting_dir / dir_path
        if not full_path.exists():
            issues.append(f"Dossier manquant: {dir_path}")
            checks['structure'] = False
    
    # Vérifier fichiers clés
    required_files = [
        'transcriptions/full-transcript.json',
        'working/index.json',
        'working/threads.md',
        'working/validation-report.md',
        'final/compte-rendu.md'
    ]
    
    for file_path in required_files:
        full_path = meeting_dir / file_path
        if not full_path.exists():
            issues.append(f"Fichier manquant: {file_path}")
            checks['paths'] = False
    
    # Vérifier complétude segments/résumés
    index_file = meeting_dir / "working" / "index.json"
    if index_file.exists():
        with open(index_file, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
        
        segments = index_data.get('segments', [])
        summaries_dir = meeting_dir / "working" / "summaries"
        summaries = list(summaries_dir.glob("summary-*.md")) if summaries_dir.exists() else []
        
        if len(summaries) != len(segments):
            issues.append(f"Nombre de résumés ({len(summaries)}) ne correspond pas au nombre de segments ({len(segments)})")
            checks['completeness'] = False
    
    return checks, issues


def main():
    meeting_id = validate_meeting_id(sys.argv[1] if len(sys.argv) > 1 else None)
    
    meeting_dir = Path("meetings") / meeting_id
    final_file = meeting_dir / "final" / "compte-rendu.md"
    
    print(f"🔍 Vérification finale pour: {meeting_id}\n")
    
    checks, issues = verify_artifacts(meeting_id)
    
    # Afficher résultats
    print("✅ Vérifications effectuées:")
    print(f"   - Structure: {'✅' if checks['structure'] else '❌'}")
    print(f"   - Métadonnées: {'✅' if checks['metadata'] else '❌'}")
    print(f"   - Chemins: {'✅' if checks['paths'] else '❌'}")
    print(f"   - Complétude: {'✅' if checks['completeness'] else '❌'}")
    
    if issues:
        print(f"\n⚠️  Problèmes détectés ({len(issues)}):")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("\n✅ Aucun problème détecté")
    
    # Statut global
    all_ok = all(checks.values()) and len(issues) == 0
    
    print(f"\n{'='*60}")
    if all_ok:
        print(f"✅ Workflow terminé avec succès !")
    else:
        print(f"⚠️  Workflow terminé avec des problèmes")
    print(f"{'='*60}\n")
    print(f"📄 Compte-rendu final : {final_file}")
    print(f"\n📁 Tous les artefacts sont disponibles dans :")
    print(f"   {meeting_dir}")
    print(f"\n   - Transcriptions : {meeting_dir / 'transcriptions'}")
    print(f"   - Segments : {meeting_dir / 'working' / 'segments'}")
    print(f"   - Résumés : {meeting_dir / 'working' / 'summaries'}")
    print(f"   - Threads : {meeting_dir / 'working' / 'threads.md'}")
    print(f"   - Validation : {meeting_dir / 'working' / 'validation-report.md'}")
    print(f"   - Compte-rendu : {final_file}")
    
    if all_ok:
        print(f"\n✅ Statut global : OK - Prêt pour archivage")
    else:
        print(f"\n⚠️  Statut global : Attention - Vérifier les problèmes ci-dessus")


if __name__ == "__main__":
    main()

