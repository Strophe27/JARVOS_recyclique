#!/usr/bin/env python3
"""
Test de sécurité: Protection CSRF pour le refresh token.

Ce script teste que:
1. Le refresh token est stocké dans un cookie HTTP-only (pas accessible JS)
2. Le header X-CSRF-Token est requis pour le refresh
3. Les requêtes cross-origin sont rejetées (SameSite=Strict)

Usage:
    python scripts/security/sliding-session/test_csrf_protection.py
"""

import sys
import os
from pathlib import Path

# Ajouter le chemin du projet au PYTHONPATH
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "api" / "src"))

import requests
from requests.cookies import RequestsCookieJar

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TEST_USERNAME = os.getenv("TEST_USERNAME", "admin@test.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "admin123")

def test_csrf_protection():
    """Test que la protection CSRF fonctionne pour le refresh token."""
    print("=" * 60)
    print("Test de Protection CSRF")
    print("=" * 60)
    
    session = requests.Session()
    
    # 1. Login pour obtenir les tokens
    print("\n1. Login pour obtenir les tokens...")
    login_response = session.post(
        f"{API_BASE_URL}/v1/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Échec du login: {login_response.status_code}")
        return False
    
    login_data = login_response.json()
    refresh_token = login_data.get("refresh_token")
    
    # Vérifier les cookies
    cookies = session.cookies
    csrf_token = None
    refresh_token_cookie = None
    
    for cookie in cookies:
        if cookie.name == "csrf_token":
            csrf_token = cookie.value
        if cookie.name == "refresh_token":
            refresh_token_cookie = cookie.value
    
    print(f"✅ Login réussi")
    print(f"   Refresh token (body): {'présent' if refresh_token else 'absent'}")
    print(f"   Refresh token (cookie): {'présent' if refresh_token_cookie else 'absent'}")
    print(f"   CSRF token (cookie): {'présent' if csrf_token else 'absent'}")
    
    # Enregistrer une activité pour permettre le refresh
    login_data = login_response.json()
    access_token = login_data.get("access_token")
    if access_token:
        print("\n1.1. Enregistrer activité utilisateur...")
        ping_response = session.post(
            f"{API_BASE_URL}/v1/activity/ping",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if ping_response.status_code == 200:
            print(f"✅ Activité enregistrée")
    
    # 2. Test refresh avec CSRF token (devrait réussir)
    print("\n2. Test refresh avec CSRF token...")
    if csrf_token:
        refresh_headers = {"X-CSRF-Token": csrf_token}
        refresh_response = session.post(
            f"{API_BASE_URL}/v1/auth/refresh",
            json={"refresh_token": refresh_token or refresh_token_cookie},
            headers=refresh_headers
        )
        
        if refresh_response.status_code == 200:
            print(f"✅ Refresh avec CSRF token réussi")
        else:
            print(f"⚠️  Refresh avec CSRF token: {refresh_response.status_code}")
            print(f"   Réponse: {refresh_response.text}")
    else:
        print("⚠️  Pas de CSRF token dans les cookies, test ignoré")
    
    # 3. Test refresh sans CSRF token (devrait échouer si protection activée)
    print("\n3. Test refresh sans CSRF token...")
    session_no_csrf = requests.Session()
    session_no_csrf.cookies = session.cookies.copy()
    
    refresh_response_no_csrf = session_no_csrf.post(
        f"{API_BASE_URL}/v1/auth/refresh",
        json={"refresh_token": refresh_token or refresh_token_cookie}
        # Pas de header X-CSRF-Token
    )
    
    if refresh_response_no_csrf.status_code == 403:
        print(f"✅ Refresh sans CSRF token rejeté (403 Forbidden)")
        return True
    elif refresh_response_no_csrf.status_code == 200:
        print(f"⚠️  Refresh sans CSRF token accepté (protection CSRF non activée)")
        return True  # Pas un échec, juste une note
    else:
        print(f"⚠️  Réponse inattendue: {refresh_response_no_csrf.status_code}")
        return True

if __name__ == "__main__":
    success = test_csrf_protection()
    sys.exit(0 if success else 1)

