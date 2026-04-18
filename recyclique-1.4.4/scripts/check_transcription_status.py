#!/usr/bin/env python3
"""Vérifier l'état de la transcription en cours."""

from pathlib import Path
import json
from datetime import datetime

meeting_id = "2025-01-27-test-transcription"
meeting_dir = Path("meetings") / meeting_id

print("=" * 60)
print(f"État de la transcription pour: {meeting_id}")
print("=" * 60)

# Vérifier le dossier audio
audio_dir = meeting_dir / "audio"
if audio_dir.exists():
    audio_files = [f for f in audio_dir.iterdir() 
                   if f.is_file() and f.suffix.lower() in {".mp3", ".wav", ".m4a", ".flac", ".ogg"}]
    print(f"\n📁 Fichiers audio trouvés: {len(audio_files)}")
    for f in audio_files:
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f"   - {f.name} ({size_mb:.2f} MB)")
else:
    print(f"\n❌ Dossier audio introuvable: {audio_dir}")

# Vérifier state.json
state_file = meeting_dir / "state.json"
if state_file.exists():
    print(f"\n📄 State file trouvé: {state_file}")
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
        files = state.get("files", [])
        print(f"   Fichiers dans state: {len(files)}")
        for file_info in files:
            print(f"   - {file_info.get('filename')}: {file_info.get('status', 'unknown')}")
    except Exception as e:
        print(f"   Erreur lecture state: {e}")
else:
    print(f"\n⚠️  State file non trouvé (transcription pas encore démarrée)")

# Vérifier les transcriptions
transcriptions_dir = meeting_dir / "transcriptions"
if transcriptions_dir.exists():
    transcriptions = list(transcriptions_dir.glob("*.json"))
    print(f"\n📝 Transcriptions trouvées: {len(transcriptions)}")
    for t in transcriptions:
        print(f"   - {t.name}")
else:
    print(f"\n⚠️  Dossier transcriptions non trouvé")

# Vérifier les logs
logs_dir = meeting_dir / "logs"
if logs_dir.exists():
    logs = list(logs_dir.glob("*.log"))
    print(f"\n📋 Logs trouvés: {len(logs)}")
    for log in logs:
        size_kb = log.stat().st_size / 1024
        print(f"   - {log.name} ({size_kb:.2f} KB)")
        # Afficher les 10 dernières lignes
        try:
            with open(log, "r", encoding="utf-8") as f:
                lines = f.readlines()
                if lines:
                    print(f"     Dernières lignes:")
                    for line in lines[-5:]:
                        print(f"     {line.rstrip()}")
        except Exception as e:
            print(f"     Erreur lecture log: {e}")
else:
    print(f"\n⚠️  Dossier logs non trouvé")

print("\n" + "=" * 60)



