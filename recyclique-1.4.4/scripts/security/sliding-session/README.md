# Scripts de Tests de Sécurité - Sliding Session

Ce dossier contient les scripts de tests de sécurité (pen-tests) pour le mécanisme de session glissante (Story B42-P5).

## Scripts Disponibles

### 1. `test_replay_token.py`
Teste que le replay d'un refresh token après rotation est rejeté.

**Scénario:**
1. Login pour obtenir un refresh token
2. Premier refresh (rotation → nouveau token)
3. Tentative de réutilisation de l'ancien token (doit échouer avec 401)

**Exécution:**
```bash
python scripts/security/sliding-session/test_replay_token.py
```

### 2. `test_csrf_protection.py`
Teste la protection CSRF pour le refresh token.

**Scénario:**
1. Login pour obtenir les tokens et cookies
2. Test refresh avec CSRF token (devrait réussir)
3. Test refresh sans CSRF token (devrait échouer si protection activée)

**Exécution:**
```bash
python scripts/security/sliding-session/test_csrf_protection.py
```

### 3. `test_ip_validation.py`
Teste que les logs d'audit enregistrent l'IP lors du refresh.

**Scénario:**
1. Login pour obtenir les tokens
2. Refresh avec IP normale
3. Refresh avec IP différente (simulée via header)

**Note:** Le backend ne rejette PAS automatiquement les refresh depuis IP différente, mais il LOGUE l'IP pour audit.

**Exécution:**
```bash
python scripts/security/sliding-session/test_ip_validation.py
```

## Configuration

Les scripts utilisent les variables d'environnement suivantes:

- `API_BASE_URL`: URL de l'API (défaut: `http://localhost:8000`)
- `TEST_USERNAME`: Nom d'utilisateur de test (défaut: `admin@test.com`)
- `TEST_PASSWORD`: Mot de passe de test (défaut: `admin123`)

**Exemple:**
```bash
export API_BASE_URL="http://localhost:8000"
export TEST_USERNAME="admin@test.com"
export TEST_PASSWORD="admin123"
python scripts/security/sliding-session/test_replay_token.py
```

## Prérequis

1. L'API doit être démarrée (`docker-compose up api`)
2. Un utilisateur de test doit exister avec les credentials configurés
3. Les dépendances Python doivent être installées (`requests`)

## Résultats Attendus

- **test_replay_token.py**: Le replay doit être rejeté avec 401
- **test_csrf_protection.py**: Le refresh sans CSRF token doit être rejeté (si protection activée)
- **test_ip_validation.py**: Les logs d'audit doivent enregistrer l'IP (vérification manuelle des logs)

## Documentation

Pour plus de détails, voir:
- **Story B42-P5**: `docs/stories/story-b42-p5-hardening-tests.md`
- **RFC Sliding Session**: `docs/architecture/sliding-session-rfc.md`
- **Guide de prévention**: `docs/tests-problemes-p5-prevention.md`
















