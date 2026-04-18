# Load Tests - Session Refresh

Ce dossier contient les scripts de load tests pour le mécanisme de session glissante (Story B42-P5).

## Prérequis

### Installation de k6

k6 est un outil de load testing moderne et performant. Voici comment l'installer :

#### Sur Linux/WSL (Ubuntu/Debian)

```bash
# Ajouter la clé GPG
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

# Ajouter le repository
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list

# Mettre à jour et installer
sudo apt-get update
sudo apt-get install k6
```

#### Sur macOS

```bash
brew install k6
```

#### Sur Windows

```bash
# Via Chocolatey
choco install k6

# Ou télécharger depuis https://k6.io/docs/getting-started/installation/
```

#### Via Docker (Recommandé)

```bash
# Exécuter k6 dans un conteneur Docker
docker run --rm -i grafana/k6 run - <scripts/load/session-refresh-load.js
```

### Vérification de l'Installation

```bash
k6 version
```

Doit afficher quelque chose comme :
```
k6 v0.47.0 (go1.21.3, linux/amd64)
```

## Scripts Disponibles

### `session-refresh-load.js`

Test de charge pour le système de refresh token.

**Scénario:**
- Simule 100 sessions en parallèle
- Chaque session fait 10 refresh cycles (représentant ~50 minutes)
- Vérifie la performance (latence < 200ms)
- Vérifie l'absence d'erreurs sous charge

**Exécution:**

```bash
# Depuis la racine du projet
k6 run scripts/load/session-refresh-load.js
```

**Configuration:**

Les variables d'environnement suivantes peuvent être utilisées :

- `API_BASE_URL`: URL de l'API (défaut: `http://localhost:8000`)
- `TEST_USERNAME`: Nom d'utilisateur de test (défaut: `admin@test.com`)
- `TEST_PASSWORD`: Mot de passe de test (défaut: `admin123`)

**Exemple:**

```bash
export API_BASE_URL="http://localhost:8000"
export TEST_USERNAME="admin@test.com"
export TEST_PASSWORD="admin123"
k6 run scripts/load/session-refresh-load.js
```

**Résultats Attendus:**

- ✅ 95% des requêtes < 200ms
- ✅ < 1% d'erreurs
- ✅ > 99% de succès pour les refresh

## Options de k6

### Exécution avec Options Personnalisées

```bash
# Augmenter le nombre d'utilisateurs
k6 run --vus 200 --duration 10m scripts/load/session-refresh-load.js

# Exécuter avec un seuil de latence plus strict
k6 run --thresholds http_req_duration='p(95)<100' scripts/load/session-refresh-load.js
```

### Options Utiles

- `--vus N`: Nombre d'utilisateurs virtuels (défaut: défini dans le script)
- `--duration D`: Durée du test (ex: `5m`, `1h`)
- `--iterations N`: Nombre total d'itérations
- `--thresholds`: Seuils personnalisés
- `--out json=results.json`: Exporter les résultats en JSON

## Documentation

Pour plus de détails, voir:
- **Story B42-P5**: `docs/stories/story-b42-p5-hardening-tests.md`
- **RFC Sliding Session**: `docs/architecture/sliding-session-rfc.md`
- **Documentation k6**: https://k6.io/docs/
















