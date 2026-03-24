#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour préparer les segments à partir des transcriptions AssemblyAI.
Découpe en segments de 5 minutes avec overlap de 30 secondes.
"""
import json
import sys
from pathlib import Path
from datetime import timedelta
from config_loader import validate_meeting_id


def prepare_segments(meeting_id: str):
    """Prépare les segments à partir de full-transcript.json"""
    
    meeting_dir = Path("meetings") / meeting_id
    transcript_file = meeting_dir / "transcriptions" / "full-transcript.json"
    segments_dir = meeting_dir / "working" / "segments"
    
    # Vérifier que le fichier existe
    if not transcript_file.exists():
        print(f"❌ Erreur: {transcript_file} introuvable")
        sys.exit(1)
    
    # Lire la transcription complète
    with open(transcript_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    utterances = data.get('utterances', [])
    if not utterances:
        print("❌ Aucune utterance trouvée dans la transcription")
        return None
    
    # Trier par timestamp (déjà fait normalement, mais on s'assure)
    utterances.sort(key=lambda x: x.get('start', 0))
    
    # Paramètres de segmentation
    SEGMENT_DURATION_MS = 5 * 60 * 1000  # 5 minutes en millisecondes
    OVERLAP_MS = 30 * 1000  # 30 secondes en millisecondes
    
    segments = []
    current_segment_start = utterances[0]['start'] if utterances else 0
    segment_num = 1
    segment_utterances = []
    
    for utterance in utterances:
        start = utterance.get('start', 0)
        end = utterance.get('end', start)
        
        # Si l'utterance dépasse la fin du segment actuel, créer un nouveau segment
        if start >= current_segment_start + SEGMENT_DURATION_MS:
            if segment_utterances:
                # Sauvegarder le segment actuel
                segment_end = max(u.get('end', u.get('start', 0)) for u in segment_utterances)
                segments.append({
                    'num': segment_num,
                    'start': current_segment_start,
                    'end': segment_end,
                    'utterances': segment_utterances.copy()
                })
                segment_num += 1
            
            # Nouveau segment avec overlap
            current_segment_start = max(0, current_segment_start + SEGMENT_DURATION_MS - OVERLAP_MS)
            segment_utterances = []
        
        # Ajouter l'utterance au segment actuel
        segment_utterances.append(utterance)
    
    # Ajouter le dernier segment
    if segment_utterances:
        segment_end = max(u.get('end', u.get('start', 0)) for u in segment_utterances)
        segments.append({
            'num': segment_num,
            'start': current_segment_start,
            'end': segment_end,
            'utterances': segment_utterances
        })
    
    # Créer les fichiers segments
    segments_dir.mkdir(parents=True, exist_ok=True)
    
    for segment in segments:
        segment_file = segments_dir / f"segment-{segment['num']:03d}.md"
        
        # Collecter les speakers uniques
        speakers = list(set(u.get('speaker', '?') for u in segment['utterances']))
        speakers.sort()
        
        # Construire le texte du segment
        text_lines = []
        for u in segment['utterances']:
            speaker = u.get('speaker', '?')
            text = u.get('text', '').strip()
            if text:
                text_lines.append(f"**{speaker}:** {text}")
        
        segment_text = "\n\n".join(text_lines)
        
        # Calculer la durée
        duration_ms = segment['end'] - segment['start']
        duration_sec = duration_ms / 1000
        duration_str = f"{int(duration_sec // 60)}m {int(duration_sec % 60)}s"
        
        # Formater les timestamps
        start_sec = segment['start'] / 1000
        end_sec = segment['end'] / 1000
        start_str = f"{int(start_sec // 60)}:{int(start_sec % 60):02d}"
        end_str = f"{int(end_sec // 60)}:{int(end_sec % 60):02d}"
        
        # Écrire le fichier segment
        content = f"""# Segment {segment['num']:03d}

**Timestamp :** {start_str} - {end_str} ({duration_str})
**Speakers :** {', '.join(speakers)}
**Durée :** {duration_str}
**Nombre d'utterances :** {len(segment['utterances'])}

## Texte

{segment_text}
"""
        with open(segment_file, 'w', encoding='utf-8') as f:
            f.write(content)
    
    print(f"✅ {len(segments)} segments créés dans {segments_dir}")
    return segments


def compute_metrics(meeting_id: str, segments):
    """Calcule les métriques et crée l'index JSON"""
    
    meeting_dir = Path("meetings") / meeting_id
    segments_dir = meeting_dir / "working" / "segments"
    index_file = meeting_dir / "working" / "index.json"
    
    index_data = {
        "meeting_id": meeting_id,
        "total_segments": len(segments),
        "segments": []
    }
    
    total_duration_ms = 0
    total_tokens = 0
    all_speakers = set()
    
    for segment in segments:
        # Calculer les métriques
        duration_ms = segment['end'] - segment['start']
        total_duration_ms += duration_ms
        
        # Estimer les tokens (approximation: ~4 chars/token)
        segment_text = " ".join(u.get('text', '') for u in segment['utterances'])
        size_chars = len(segment_text)
        tokens = size_chars // 4
        
        total_tokens += tokens
        
        # Collecter les speakers
        speakers = list(set(u.get('speaker', '?') for u in segment['utterances']))
        speakers.sort()
        all_speakers.update(speakers)
        
        # Déterminer les overlaps
        overlap_prev = None
        overlap_next = None
        
        if segment['num'] > 1:
            prev_segment = next((s for s in segments if s['num'] == segment['num'] - 1), None)
            if prev_segment and prev_segment['end'] > segment['start']:
                overlap_prev = f"segment-{prev_segment['num']:03d}"
        
        if segment['num'] < len(segments):
            next_segment = next((s for s in segments if s['num'] == segment['num'] + 1), None)
            if next_segment and segment['end'] > next_segment['start']:
                overlap_next = f"segment-{next_segment['num']:03d}"
        
        segment_data = {
            "id": f"segment-{segment['num']:03d}",
            "file": f"working/segments/segment-{segment['num']:03d}.md",
            "start": segment['start'],
            "end": segment['end'],
            "duration": duration_ms,
            "tokens": tokens,
            "size_chars": size_chars,
            "speakers": speakers,
            "overlap_prev": overlap_prev,
            "overlap_next": overlap_next,
            "num_utterances": len(segment['utterances'])
        }
        
        index_data["segments"].append(segment_data)
    
    # Ajouter les métriques globales
    index_data["total_duration_seconds"] = total_duration_ms / 1000
    index_data["total_tokens"] = total_tokens
    index_data["all_speakers"] = sorted(list(all_speakers))
    
    # Sauvegarder l'index
    index_file.parent.mkdir(parents=True, exist_ok=True)
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Index créé: {index_file}")
    print(f"   - {len(segments)} segments")
    print(f"   - Durée totale: {int(total_duration_ms / 60000)} minutes")
    print(f"   - Tokens estimés: {total_tokens}")
    print(f"   - Speakers: {', '.join(sorted(all_speakers))}")


if __name__ == "__main__":
    meeting_id = validate_meeting_id(sys.argv[1] if len(sys.argv) > 1 else None)
    
    print(f"🚀 Préparation des segments pour: {meeting_id}")
    segments = prepare_segments(meeting_id)
    
    if segments:
        print(f"\n📊 Calcul des métriques...")
        compute_metrics(meeting_id, segments)
        print(f"\n✅ Préparation terminée!")

