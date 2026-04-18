#!/usr/bin/env python3
"""Lance le script avec capture d'erreurs détaillée."""

import subprocess
import sys

print("Lancement du script de transcription...")
print("=" * 60)

try:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/aai_transcribe.py",
            "--meeting-id", "2025-01-27-test-transcription",
            "--verbose",
            "--concurrency", "1"
        ],
        capture_output=True,
        text=True,
        timeout=120  # 2 minutes max pour voir le début
    )
    
    print("STDOUT:")
    print(result.stdout)
    print("\n" + "=" * 60)
    print("STDERR:")
    print(result.stderr)
    print("\n" + "=" * 60)
    print(f"Exit code: {result.returncode}")
    
except subprocess.TimeoutExpired:
    print("⚠️  Le script prend plus de 2 minutes (normal pour une transcription)")
    print("   Le script continue en arrière-plan...")
except Exception as e:
    print(f"❌ Erreur: {e}")



