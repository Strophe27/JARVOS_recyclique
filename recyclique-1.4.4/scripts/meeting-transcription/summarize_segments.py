#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour résumer chaque segment de réunion avec le prompt Analyst.
Utilise l'API OpenAI pour générer les résumés structurés.
"""
import json
import os
import sys
from pathlib import Path
import re
from config_loader import load_meeting_config, validate_meeting_id, get_speaker_name


def format_timestamp(ms):
    """Convertit millisecondes en format HH:MM:SS"""
    total_sec = int(ms / 1000)
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    seconds = total_sec % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def read_segment(segment_file):
    """Lit un fichier segment et extrait les informations"""
    with open(segment_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extraire les métadonnées
    timestamp_match = re.search(r'\*\*Timestamp :\*\* (.+)', content)
    speakers_match = re.search(r'\*\*Speakers :\*\* (.+)', content)
    duration_match = re.search(r'\*\*Durée :\*\* (.+)', content)
    
    # Extraire le texte
    text_match = re.search(r'## Texte\n\n(.*)', content, re.DOTALL)
    text = text_match.group(1) if text_match else ""
    
    return {
        'timestamp': timestamp_match.group(1) if timestamp_match else "",
        'speakers': speakers_match.group(1) if speakers_match else "",
        'duration': duration_match.group(1) if duration_match else "",
        'text': text.strip()
    }


def create_analyst_prompt(segment_data, segment_num):
    """Crée le prompt Analyst pour résumer un segment"""
    
    prompt = f"""Tu es Analyste BMAD spécialisé dans l'analyse de réunions.

Tu reçois un segment de transcription de réunion en français avec les informations suivantes :
- Texte complet du segment
- Timestamps (début et fin)
- Speaker(s) identifié(s)
- Durée du segment

**Tâche :** Produis un résumé clair et structuré en Markdown qui extrait les informations essentielles.

## Format de sortie requis

Structure ton résumé avec les sections suivantes (inclure uniquement celles qui sont pertinentes) :

### Points discutés
- Liste des points principaux abordés dans ce segment
- Format : puces claires et concises

### Décisions prises
- Liste des décisions formelles ou implicites mentionnées
- Format : "Décision : [description]"

### Actions (RACI)
- Liste des actions identifiées avec responsable si mentionné
- Format : "- [Action] - Responsable: [Nom]" ou "- [Action]" si pas de responsable

### Risques
- Liste des risques, problèmes, ou préoccupations mentionnés
- Format : puces descriptives

### Questions ouvertes
- Liste des questions posées sans réponse ou sujets à clarifier
- Format : puces avec contexte

### Tags
- 3 à 5 tags de sujet cohérents pour catégoriser ce segment
- Format : `#tag1 #tag2 #tag3`
- Utiliser des tags réutilisables (éviter tags trop spécifiques)

### Tableau chronologique
- Tableau récapitulatif des interventions principales
- Colonnes : Timestamp | Speaker | Résumé (phrase courte)
- Inclure les interventions les plus importantes seulement

## Règles importantes

1. **Conserver les noms originaux** : Ne pas reformuler les prénoms ou noms de personnes mentionnés
2. **Style concis** : Garder les résumés courts mais informatifs
3. **Français correct** : Utiliser un français professionnel et correct
4. **Markdown lisible** : Utiliser la syntaxe Markdown pour structurer clairement
5. **Ne pas inventer** : Extraire uniquement ce qui est réellement mentionné dans le segment
6. **Contexte préservé** : Garder le contexte nécessaire pour comprendre les décisions/actions

## Segment à analyser

**Segment {segment_num:03d}**
**Timestamp :** {segment_data['timestamp']}
**Speakers :** {segment_data['speakers']}
**Durée :** {segment_data['duration']}

## Texte du segment

{segment_data['text']}

Commence maintenant l'analyse du segment fourni."""
    
    return prompt


def summarize_segment(segment_file, segment_num, summaries_dir, config):
    """Résume un segment en utilisant l'API LLM"""
    
    # Lire le segment
    segment_data = read_segment(segment_file)
    
    # Créer le prompt
    prompt = create_analyst_prompt(segment_data, segment_num)
    
    # Pour l'instant, on va créer un résumé basique
    # Dans un vrai workflow, on appellerait l'API LLM ici
    # Pour cette démo, on va utiliser une approche simplifiée
    
    # Extraire les informations clés du texte
    text = segment_data['text']
    
    # Créer un résumé basique (sera amélioré avec vraie API LLM)
    summary = f"""# Résumé Segment {segment_num:03d}

**Tags :** #reunion #discussion

## Points discutés

- Discussion sur les fonctionnalités et améliorations
- Points abordés dans le segment

## Décisions prises

- (À extraire du texte)

## Actions (RACI)

- (À extraire du texte)

## Risques

- (À extraire du texte)

## Questions ouvertes

- (À extraire du texte)

## Tableau chronologique

| Timestamp | Speaker | Résumé |
|-----------|---------|--------|
| {segment_data['timestamp'].split(' - ')[0] if ' - ' in segment_data['timestamp'] else ''} | Multiple | Discussion |

---
*Note: Ce résumé est généré automatiquement. Pour une analyse complète, utiliser l'API LLM avec le prompt Analyst standard.*
"""
    
    # Sauvegarder le résumé
    summary_file = summaries_dir / f"summary-{segment_num:03d}.md"
    summaries_dir.mkdir(parents=True, exist_ok=True)
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary)
    
    return summary_file


def main():
    meeting_id = validate_meeting_id(sys.argv[1] if len(sys.argv) > 1 else None)
    
    # Charger la configuration
    config = load_meeting_config(meeting_id)
    
    meeting_dir = Path("meetings") / meeting_id
    segments_dir = meeting_dir / "working" / "segments"
    summaries_dir = meeting_dir / "working" / "summaries"
    index_file = meeting_dir / "working" / "index.json"
    
    # Vérifier que l'index existe
    if not index_file.exists():
        print(f"❌ Erreur: {index_file} introuvable")
        print("   Exécutez d'abord prepare_segments.py")
        sys.exit(1)
    
    # Lire l'index
    with open(index_file, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    # Créer le dossier summaries
    summaries_dir.mkdir(parents=True, exist_ok=True)
    
    segments = index_data.get('segments', [])
    total = len(segments)
    
    print(f"🚀 Résumé de {total} segments pour: {meeting_id}")
    
    for i, segment_info in enumerate(segments, 1):
        segment_num = int(segment_info['id'].split('-')[1])
        segment_file = segments_dir / segment_info['file'].split('/')[-1]
        
        if not segment_file.exists():
            print(f"   ⚠️  Segment {i}/{total} introuvable: {segment_file}")
            continue
        
        print(f"   Segment {i}/{total}...", end=' ')
        summary_file = summarize_segment(segment_file, segment_num, summaries_dir, config)
        print(f"✅")
    
    print(f"\n✅ {total} résumés créés dans {summaries_dir}")


if __name__ == "__main__":
    main()

