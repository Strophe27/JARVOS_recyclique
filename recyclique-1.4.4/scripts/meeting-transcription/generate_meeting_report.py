#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour générer le compte-rendu final de la réunion.
"""
import json
import sys
from pathlib import Path
from config_loader import load_meeting_config, validate_meeting_id, get_speaker_name


def generate_meeting_report(meeting_id: str):
    """Génère le compte-rendu final"""
    
    # Charger la configuration
    config = load_meeting_config(meeting_id)
    date = config.get("date", "")
    participants = config.get("participants", [])
    speaker_mapping = config.get("speaker_mapping", {})
    agenda = config.get("agenda", [])
    
    meeting_dir = Path("meetings") / meeting_id
    summaries_dir = meeting_dir / "working" / "summaries"
    threads_file = meeting_dir / "working" / "threads.md"
    index_file = meeting_dir / "working" / "index.json"
    validation_file = meeting_dir / "working" / "validation-report.md"
    final_file = meeting_dir / "final" / "compte-rendu.md"
    
    # Vérifier que l'index existe
    if not index_file.exists():
        print(f"❌ Erreur: {index_file} introuvable")
        print("   Exécutez d'abord prepare_segments.py")
        sys.exit(1)
    
    # Lire les fichiers
    with open(index_file, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
    
    # Extraire métadonnées
    total_duration_sec = index_data.get('total_duration_seconds', 0)
    total_duration_min = int(total_duration_sec / 60)
    speakers = index_data.get('all_speakers', [])
    
    # Mapper les speakers avec les noms
    if speaker_mapping:
        participants_list = [get_speaker_name(s, config) for s in speakers if s in speaker_mapping]
        # Ajouter les speakers non mappés
        for s in speakers:
            if s not in speaker_mapping:
                participants_list.append(s)
    else:
        # Si pas de mapping, utiliser les codes speakers
        participants_list = speakers
    
    # Si participants est défini dans config, l'utiliser
    if participants:
        participants_str = ", ".join(participants)
    else:
        participants_str = ", ".join(participants_list) if participants_list else "Non spécifiés"
    
    # Construire l'ordre du jour
    agenda_section = ""
    if agenda:
        agenda_section = "\n".join([f"{i+1}. {item}" for i, item in enumerate(agenda)])
    else:
        agenda_section = "(À extraire depuis les threads/résumés)"
    
    # Générer le compte-rendu
    content = f"""# Compte-rendu - Réunion

**Date :** {date}
**Participants :** {participants_str}
**Durée :** {total_duration_min} minutes
**Meeting ID :** {meeting_id}

---

## Ordre du jour

{agenda_section}

---

## Points discutés

(À extraire depuis les résumés détaillés dans `working/summaries/`)

---

## Décisions prises

(À extraire depuis les résumés détaillés)

---

## Actions (RACI)

(À extraire depuis les résumés détaillés)

---

## Questions ouvertes

(À extraire depuis les résumés détaillés)

---

## Sujets récurrents (Threads)

Pour plus de détails sur les sujets récurrents, consulter `working/threads.md`.

---

## Prochaines étapes

(À définir)

---

*Compte-rendu généré automatiquement à partir des transcriptions de la réunion.*
*Pour plus de détails, consulter les résumés dans `working/summaries/` et les threads dans `working/threads.md`.*
"""
    
    # Sauvegarder
    final_file.parent.mkdir(parents=True, exist_ok=True)
    with open(final_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Compte-rendu final créé: {final_file}")


if __name__ == "__main__":
    meeting_id = validate_meeting_id(sys.argv[1] if len(sys.argv) > 1 else None)
    print(f"📝 Génération du compte-rendu pour: {meeting_id}")
    generate_meeting_report(meeting_id)

