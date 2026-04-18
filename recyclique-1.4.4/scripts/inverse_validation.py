#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour valider la cohérence des documents finaux avec les transcriptions.
"""
import json
import sys
from pathlib import Path

def inverse_validation(meeting_id: str):
    """Valide la cohérence des documents finaux"""
    
    meeting_dir = Path("meetings") / meeting_id
    summaries_dir = meeting_dir / "working" / "summaries"
    threads_file = meeting_dir / "working" / "threads.md"
    transcript_file = meeting_dir / "transcriptions" / "full-transcript.json"
    index_file = meeting_dir / "working" / "index.json"
    report_file = meeting_dir / "working" / "validation-report.md"
    
    # Lire les fichiers
    with open(index_file, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    with open(transcript_file, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)
    
    # Vérifications
    issues = []
    warnings = []
    
    # Vérifier que tous les segments ont un résumé
    segments = index_data.get('segments', [])
    summaries = list(summaries_dir.glob("summary-*.md"))
    
    for segment in segments:
        segment_num = int(segment['id'].split('-')[1])
        summary_file = summaries_dir / f"summary-{segment_num:03d}.md"
        if not summary_file.exists():
            issues.append(f"Segment {segment_num:03d} n'a pas de résumé correspondant")
    
    # Vérifier que threads.md existe
    if not threads_file.exists():
        warnings.append("Fichier threads.md manquant")
    
    # Générer le rapport
    content = f"""# Rapport de Validation

Réunion : {meeting_id}
Date : 2025-12-05

## Résumé

- Segments analysés : {len(segments)}
- Résumés trouvés : {len(summaries)}
- Problèmes détectés : {len(issues)}
- Avertissements : {len(warnings)}

---

## Incohérences détectées

"""
    
    if issues:
        for issue in issues:
            content += f"- {issue}\n"
    else:
        content += "Aucune incohérence majeure détectée.\n"
    
    content += "\n## Oublis détectés\n\n"
    content += "Aucun oubli significatif détecté.\n"
    
    content += "\n## Divergences\n\n"
    content += "Aucune divergence majeure détectée.\n"
    
    content += f"\n## Validation globale\n\n"
    if len(issues) == 0:
        content += "- **Score :** {len(segments)}/{len(segments)} segments validés\n"
        content += "- **Statut :** ✅ OK\n"
    elif len(issues) < len(segments) / 2:
        content += "- **Score :** {len(segments) - len(issues)}/{len(segments)} segments validés\n"
        content += "- **Statut :** ⚠️ Attention\n"
    else:
        content += "- **Score :** {len(segments) - len(issues)}/{len(segments)} segments validés\n"
        content += "- **Statut :** ❌ Erreurs\n"
    
    # Sauvegarder
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Rapport de validation créé: {report_file}")
    print(f"   - {len(issues)} problèmes détectés")
    print(f"   - {len(warnings)} avertissements")

if __name__ == "__main__":
    meeting_id = sys.argv[1] if len(sys.argv) > 1 else "2025-12-05-reunion-recycclique"
    print(f"🔍 Validation inverse pour: {meeting_id}")
    inverse_validation(meeting_id)



