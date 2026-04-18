#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour agréger les sujets récurrents (threads) à partir des résumés de segments.
"""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict
from config_loader import load_meeting_config, validate_meeting_id


def extract_tags_from_summary(summary_file):
    """Extrait les tags d'un résumé"""
    with open(summary_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Chercher les tags
    tags_match = re.search(r'\*\*Tags :\*\* (.+)', content)
    if tags_match:
        tags_str = tags_match.group(1)
        tags = re.findall(r'#(\w+)', tags_str)
        return tags
    return []


def extract_sections_from_summary(summary_file):
    """Extrait les sections d'un résumé"""
    with open(summary_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    sections = {}
    
    # Extraire les décisions
    decisions_match = re.search(r'## Décisions prises\n\n(.*?)(?=\n## |$)', content, re.DOTALL)
    if decisions_match:
        sections['decisions'] = decisions_match.group(1).strip()
    
    # Extraire les actions
    actions_match = re.search(r'## Actions \(RACI\)\n\n(.*?)(?=\n## |$)', content, re.DOTALL)
    if actions_match:
        sections['actions'] = actions_match.group(1).strip()
    
    # Extraire les questions
    questions_match = re.search(r'## Questions ouvertes\n\n(.*?)(?=\n## |$)', content, re.DOTALL)
    if questions_match:
        sections['questions'] = questions_match.group(1).strip()
    
    return sections


def build_threads(meeting_id: str):
    """Construit les threads à partir des résumés"""
    
    # Charger la configuration
    config = load_meeting_config(meeting_id)
    date = config.get("date", "")
    participants = config.get("participants", [])
    participants_str = ", ".join(participants) if participants else "Non spécifiés"
    
    meeting_dir = Path("meetings") / meeting_id
    summaries_dir = meeting_dir / "working" / "summaries"
    threads_file = meeting_dir / "working" / "threads.md"
    index_file = meeting_dir / "working" / "index.json"
    
    # Vérifier que l'index existe
    if not index_file.exists():
        print(f"❌ Erreur: {index_file} introuvable")
        print("   Exécutez d'abord prepare_segments.py")
        sys.exit(1)
    
    # Lire l'index pour connaître les segments
    with open(index_file, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    # Collecter les tags par segment
    tag_to_segments = defaultdict(list)
    all_tags = set()
    
    for segment_info in index_data.get('segments', []):
        segment_num = int(segment_info['id'].split('-')[1])
        summary_file = summaries_dir / f"summary-{segment_num:03d}.md"
        
        if summary_file.exists():
            tags = extract_tags_from_summary(summary_file)
            for tag in tags:
                tag_to_segments[tag].append(segment_num)
                all_tags.add(tag)
    
    # Identifier les threads (tags qui apparaissent dans plusieurs segments)
    threads = []
    for tag, segments in tag_to_segments.items():
        if len(segments) > 1:  # Thread = tag qui apparaît dans au moins 2 segments
            threads.append({
                'tag': tag,
                'segments': sorted(segments),
                'count': len(segments)
            })
    
    # Trier par nombre de segments (threads les plus récurrents en premier)
    threads.sort(key=lambda x: x['count'], reverse=True)
    
    # Construire le contenu threads.md
    content = f"""# Sujets Récurrents (Threads)

Réunion : {meeting_id}
Date : {date}
Participants : {participants_str}

## Résumé

{len(threads)} threads identifiés (sujets récurrents sur plusieurs segments).

---

"""
    
    for i, thread in enumerate(threads, 1):
        segments_str = ', '.join(f"{s:03d}" for s in thread['segments'])
        content += f"""## Thread #{thread['tag']}

- **Apparu dans segments :** {segments_str}
- **Nombre d'occurrences :** {thread['count']} segments
- **Évolution :** (À analyser depuis les résumés des segments concernés)
- **Décisions finales :** (À extraire)
- **Actions :** (À extraire)
- **Questions ouvertes :** (À extraire)

---

"""
    
    # Ajouter les tags uniques (apparus une seule fois)
    unique_tags = [tag for tag in all_tags if tag not in [t['tag'] for t in threads]]
    if unique_tags:
        content += f"""## Tags Uniques

Tags qui n'apparaissent que dans un seul segment :

{', '.join(f'#{tag}' for tag in sorted(unique_tags))}

"""
    
    # Sauvegarder
    threads_file.parent.mkdir(parents=True, exist_ok=True)
    with open(threads_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Threads créés: {threads_file}")
    print(f"   - {len(threads)} threads récurrents identifiés")
    print(f"   - {len(unique_tags)} tags uniques")
    
    return threads


if __name__ == "__main__":
    meeting_id = validate_meeting_id(sys.argv[1] if len(sys.argv) > 1 else None)
    print(f"🚀 Construction des threads pour: {meeting_id}")
    build_threads(meeting_id)

