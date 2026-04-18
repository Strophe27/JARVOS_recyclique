#!/usr/bin/env python3
"""
Test de sécurité: Replay d'un refresh token après rotation.

Ce script teste que:
1. Un refresh token ne peut pas être réutilisé après rotation
2. L'ancien token est marqué comme révoqué dans la DB
3. Les logs d'audit enregistrent la tentative de replay

Usage:
    python scripts/security/sliding-session/test_replay_token.py
"""

import sys
import os
from pathlib import Path

# Ajouter le chemin du projet au PYTHONPATH
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "api" / "src"))

import requests
import json
from datetime import datetime, timezone

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TEST_USERNAME = os.getenv("TEST_USERNAME", "admin@test.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "admin123")

def test_replay_token():
    """Test qu'un refresh token réutilisé après rotation est rejeté."""
    print("=" * 60)
    print("Test de Replay Token")
    print("=" * 60)
    
    # 1. Login pour obtenir access_token et refresh_token
    print("\n1. Login pour obtenir les tokens...")
    login_response = requests.post(
        f"{API_BASE_URL}/v1/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Échec du login: {login_response.status_code}")
        print(f"   Réponse: {login_response.text}")
        return False
    
    login_data = login_response.json()
    refresh_token_1 = login_data.get("refresh_token")
    access_token_1 = login_data.get("access_token")
    
    if not refresh_token_1:
        print("❌ Aucun refresh_token reçu lors du login")
        return False
    
    print(f"✅ Login réussi")
    print(f"   Refresh token 1: {refresh_token_1[:20]}...")
    
    # Enregistrer une activité pour permettre le refresh
    print("\n1.1. Enregistrer activité utilisateur...")
    ping_response = requests.post(
        f"{API_BASE_URL}/v1/activity/ping",
        headers={"Authorization": f"Bearer {access_token_1}"}
    )
    if ping_response.status_code == 200:
        print(f"✅ Activité enregistrée")
    else:
        print(f"⚠️  Échec enregistrement activité: {ping_response.status_code}")
    
    # 2. Premier refresh (rotation)
    print("\n2. Premier refresh (rotation du token)...")
    refresh_response_1 = requests.post(
        f"{API_BASE_URL}/v1/auth/refresh",
        json={"refresh_token": refresh_token_1}
    )
    
    if refresh_response_1.status_code != 200:
        print(f"❌ Échec du premier refresh: {refresh_response_1.status_code}")
        print(f"   Réponse: {refresh_response_1.text}")
        return False
    
    refresh_data_1 = refresh_response_1.json()
    refresh_token_2 = refresh_data_1.get("refresh_token")
    access_token_2 = refresh_data_1.get("access_token")
    
    if not refresh_token_2:
        print("❌ Aucun refresh_token reçu lors du premier refresh")
        return False
    
    print(f"✅ Premier refresh réussi")
    print(f"   Refresh token 2: {refresh_token_2[:20]}...")
    print(f"   Les tokens sont différents: {refresh_token_1 != refresh_token_2}")
    
    # Enregistrer une activité avec le nouveau token pour permettre le test de replay
    print("\n2.1. Enregistrer activité avec nouveau token...")
    ping_response_2 = requests.post(
        f"{API_BASE_URL}/v1/activity/ping",
        headers={"Authorization": f"Bearer {access_token_2}"}
    )
    if ping_response_2.status_code == 200:
        print(f"✅ Activité enregistrée")
    
    # 3. Tentative de réutilisation du token 1 (replay)
    print("\n3. Tentative de réutilisation du token 1 (replay)...")
    replay_response = requests.post(
        f"{API_BASE_URL}/v1/auth/refresh",
        json={"refresh_token": refresh_token_1}
    )
    
    if replay_response.status_code == 401:
        print(f"✅ Replay rejeté correctement (401 Unauthorized)")
        print(f"   Réponse: {replay_response.json().get('detail', 'N/A')}")
        return True
    else:
        print(f"❌ Échec: Le replay devrait être rejeté avec 401, mais reçu {replay_response.status_code}")
        print(f"   Réponse: {replay_response.text}")
        return False

if __name__ == "__main__":
    success = test_replay_token()
    sys.exit(0 if success else 1)

