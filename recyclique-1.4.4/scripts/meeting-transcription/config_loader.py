#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Module utilitaire pour charger la configuration d'une réunion depuis config.json.
"""
import json
import sys
from pathlib import Path
from typing import Dict, Optional, List


def extract_date_from_meeting_id(meeting_id: str) -> str:
    """
    Extrait la date du meeting_id (format: YYYY-MM-DD-nom-reunion).
    
    Args:
        meeting_id: ID de la réunion
        
    Returns:
        Date au format YYYY-MM-DD
    """
    parts = meeting_id.split('-')
    if len(parts) >= 3:
        # Prendre les 3 premières parties (YYYY-MM-DD)
        return '-'.join(parts[:3])
    return ""


def load_meeting_config(meeting_id: str) -> Dict:
    """
    Charge la configuration d'une réunion depuis config.json.
    Si le fichier n'existe pas, retourne une config par défaut.
    
    Args:
        meeting_id: ID de la réunion
        
    Returns:
        Dictionnaire de configuration avec:
        - meeting_id
        - date (extraite du meeting_id si absente)
        - participants (liste vide si absente)
        - speaker_mapping (dict vide si absent)
        - agenda (liste vide si absente)
    """
    meeting_dir = Path("meetings") / meeting_id
    config_file = meeting_dir / "config.json"
    
    # Config par défaut
    default_config = {
        "meeting_id": meeting_id,
        "date": extract_date_from_meeting_id(meeting_id),
        "participants": [],
        "speaker_mapping": {},
        "agenda": []
    }
    
    # Si config.json existe, le charger
    if config_file.exists():
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Fusionner avec les valeurs par défaut
            default_config.update(config)
            
            # S'assurer que meeting_id et date sont corrects
            default_config["meeting_id"] = meeting_id
            if not default_config.get("date"):
                default_config["date"] = extract_date_from_meeting_id(meeting_id)
            
            return default_config
        except (json.JSONDecodeError, IOError) as e:
            print(f"⚠️  Erreur lors du chargement de config.json: {e}")
            print(f"   Utilisation de la configuration par défaut")
            return default_config
    
    # Si config.json n'existe pas, retourner la config par défaut
    return default_config


def get_speaker_name(speaker_code: str, config: Dict) -> str:
    """
    Retourne le nom d'un speaker depuis son code.
    
    Args:
        speaker_code: Code du speaker (ex: 'A', 'B')
        config: Configuration de la réunion
        
    Returns:
        Nom du speaker ou le code si non trouvé
    """
    speaker_mapping = config.get("speaker_mapping", {})
    return speaker_mapping.get(speaker_code, speaker_code)


def validate_meeting_id(meeting_id: Optional[str]) -> str:
    """
    Valide et retourne le meeting_id.
    Si None ou vide, affiche une erreur et quitte.
    
    Args:
        meeting_id: ID de la réunion (peut être None)
        
    Returns:
        meeting_id validé
        
    Raises:
        SystemExit: Si meeting_id est None ou vide
    """
    if not meeting_id:
        print("❌ Erreur: meeting_id requis")
        print("   Usage: python script.py <meeting_id>")
        sys.exit(1)
    
    return meeting_id

