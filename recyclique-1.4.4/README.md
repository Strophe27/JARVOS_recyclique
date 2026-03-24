# ♻️ Recyclic
**Outil de gestion pour ressourceries - POC en développement**  
**Version livrable :** 1.4.4 (arborescence `recyclique-1.4.4/`).  
⚠️ **Attention : Non Fonctionnel !**

## 🌱 Notre Mission
Digitaliser les processus des ressourceries pour réduire le temps administratif de 70% et assurer la conformité réglementaire Ecologic.

## ✨ Comment ça marche (Version Test)
1. **Bot Telegram** : Enregistrement vocal des dépôts avec classification IA automatique
2. **Interface caisse** : Vente simplifiée avec catégories EEE obligatoires  
3. **Exports automatisés** : Synchronisation vers Ecologic et partenaires

## Runtime Python (API)

L’image Docker de l’API utilise **Python 3.11**. En développement local sans Docker, préférez **3.11.x** pour rester aligné avec le conteneur ; voir `api/README.md` et `requires-python` dans `api/pyproject.toml`.

## 🚀 Démarrage (Dev)

À lancer depuis le dossier `recyclique-1.4.4/` (là où se trouve `docker-compose.yml`).

1. Créer un fichier `.env` à la racine de ce dossier avec au minimum :
   - `POSTGRES_PASSWORD`
   - `SECRET_KEY`  
   Optionnel : `POSTGRES_DB` (défaut **`recyclic`**, doit rester aligné entre Postgres, `DATABASE_URL` et Alembic), `APP_VERSION` (défaut **1.4.4** ; sous Git Bash / Linux, alignement sur le frontend : `export APP_VERSION="$(./scripts/get-version.sh)"` avant un build — le script nécessite Node.js), `API_PORT` (défaut **8000** sur l’hôte).

2. Construire et démarrer les services :

```bash
docker compose up --build
```

3. Appliquer les migrations Alembic (premier démarrage ou après mise à jour des révisions) :

```bash
docker compose run --rm api-migrations
```

### Création du premier Super Administrateur

Une fois les services démarrés, pour créer le premier utilisateur avec les droits d'administration, exécutez la commande suivante depuis votre terminal, en remplaçant `votre_nom_utilisateur` et `votre_mot_de_passe` :

```bash
docker compose exec api sh /app/create_admin.sh votre_nom_utilisateur votre_mot_de_passe_securise
```

## Services (compose par défaut)
- **API** : http://localhost:8000 — préfixe HTTP des routes versionnées : `/v1/...` par défaut (`API_V1_STR` dans compose ; ex. santé : `/health` à la racine de l’app, endpoints métier sous ce préfixe).
- **Documentation OpenAPI** : http://localhost:8000/docs
- **Frontend (Vite, hot-reload)** : http://localhost:4444 (port hôte mappé sur le port 5173 du conteneur)
- **PostgreSQL** : `localhost:5432` (utilisateur `recyclic`, base par défaut `recyclic` si `POSTGRES_DB` non défini)
- **Redis** : `localhost:6379`
- **Bot** : non démarré dans ce fichier `docker-compose.yml` (service commenté)

## 🏗️ Architecture
- **Stack** : React + FastAPI + PostgreSQL + Docker
- **IA** : LangChain + Gemini pour classification EEE
- **Déploiement** : Docker Compose sur VPS
- **Pattern** : PWA offline-first + Microservices légers

## 📚 Documentation
- **[Architecture complète](docs/architecture/)** - Vue d'ensemble technique
- **[PRD détaillé](docs/prd/)** - Spécifications produit et épics
- **[Stories de développement](docs/stories/)** - User stories et implémentation

## 🛠️ Développement
Ce projet est développé avec la **BMad Method** - une approche agile AI-driven qui combine des agents spécialisés pour chaque rôle (PM, Architect, Developer, QA) avec des workflows structurés.

**Méthodologie :**
- Documentation-first avec PRD et architecture détaillés
- Développement par épics et stories séquentielles
- Tests pyramidaux (Unit/Integration/E2E)
- Standards de code stricts (TypeScript/Python)

### Sessions et Authentification

**Politique de Session :**
- **Persistance** : Sessions stockées dans le `localStorage` du navigateur
- **Durée de validité** : Tokens JWT valides pendant **30 minutes**
- **Renouvellement** : Les utilisateurs doivent se reconnecter après expiration
- **Déconnexion** : Suppression automatique du token lors du logout

**Rôles et Permissions :**
- **Caisse** : Accessible aux rôles `cashier`, `admin`, `super-admin`
- **Administration** : Accessible aux rôles `admin`, `super-admin` uniquement
- **Autres sections** : Accessibles à tous les utilisateurs authentifiés

### Secrets Email (Brevo)

1. Copier `env.example` vers `api/.env` et renseigner:
   - `BREVO_API_KEY` (dev: placeholder possible)
   - `BREVO_WEBHOOK_SECRET` (laisser vide en dev → signature ignorée)
   - `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`

2. En production (après déploiement de l'API):
   - Créer un webhook Brevo vers `/v1/email/webhook` (ou la valeur de `API_V1_STR` si vous la surchargez)
   - Récupérer la "Signing key" (secret) et la mettre dans `BREVO_WEBHOOK_SECRET`
   - Activer les événements (delivered, bounce, spam…)

3. Vérification rapide (dev):
```bash
export PYTHONPATH=src
./venv/bin/python - << 'PY'
from fastapi.testclient import TestClient
from recyclic_api.main import app
client = TestClient(app)
print(client.get('/v1/email/health').json()['status'])
PY
```

## Équipe
La Clique Qui Recycle - Solution open source pour le secteur du réemploi

## 📄 Licence
MIT - Voir le fichier `LICENSE` pour plus de détails.
