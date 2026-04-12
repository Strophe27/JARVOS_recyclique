#   
  
Parfait ! J'ai maintenant toutes les informations nécessaires. Voici le guide complet détaillé pour votre projet RecyClique avec Paheko.  
  
***  
  
# Guide Complet : Distribution Paheko Préconfigurée pour RecyClique  
  
## 📋 Liste des Extensions/Modules Nécessaires  
  
### Extensions Natives Paheko à Activer  
  
Basé sur vos besoins de ressourcerie, voici les modules essentiels :  
  
| Extension | Usage RecyClique | Mode d'installation |  
|-----------|-----------------|---------------------|  
| **Caisse informatisée** | Point de vente tactile, tickets, moyens de paiement | ✅ Native - à activer via interface |  
| **Gestion de stock** | Suivi entrées/sorties, inventaires, réceptions | ✅ Native - incluse avec Caisse |  
| **Saisie au poids** | Déclarations éco-organismes, traçabilité poids | ✅ Extension - à activer |  
| **Suivi du temps bénévole** | Valorisation heures, comptabilisation | ✅ Extension - à activer |  
| **Gestion du matériel** | Suivi objets individuels, prêts, cessions | ✅ Extension - à activer |  
| **Documents/GED** | Photos objets, certificats, justificatifs | ✅ Native - activée par défaut |  
| **Site web** | Vitrine publique | ✅ Native - à configurer |  
| **Agenda et contacts** | Calendriers vie associative | ✅ Extension - à activer |  
  
### Extensions Personnalisées à Développer  
  
| Module Custom | Fonction | Technologie |  
|---------------|----------|-------------|  
| **Déclarations éco-organismes** | Export formaté pour Eco-mobilier, Valdelia, etc. | Module Brindille + API |  
| **Interface IA RecyClique** | Pont API vers agents conversationnels | API REST Paheko |  
| **Tarification dynamique** | Prix minimum + contribution variable | Module Brindille |  
| **Import/Export RecyClique** | Synchronisation données FastAPI ↔ Paheko | Middleware Python |  
  
***  
  
## 🐳 Solution 1 : Docker Compose Complet (RECOMMANDÉ)  
  
### Architecture Proposée  
  
```  
RecyClique Distribution  
**├──** docker-compose.yml  
**├──** paheko/  
│   **├──** Dockerfile.paheko  
│   **├──** config.local.php (préconfiguration)  
│   **├──** extensions/ (modules à préinstaller)  
│   **└──** scripts/  
│       **├──** init-paheko.sh  
│       **├──** activate-extensions.php  
│       **└──** import-config.sql  
**├──** middleware/  
│   **├──** Dockerfile.middleware  
│   **└──** recyclique_connector/ (votre API Python)  
**└──** data/  
    **├──** paheko_data/  
    **├──** postgres_data/  
    **└──** redis_data/  
```  
  
### Docker Compose Complet  
  
```yaml  
version: '3.8'  
  
services:  
  # Base de données PostgreSQL  
  postgres:  
    image: postgres:15-alpine  
    container_name: recyclique_postgres  
    environment:  
      POSTGRES_USER: paheko  
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}  
      POSTGRES_DB: paheko_db  
    volumes:  
      - ./data/postgres_/var/lib/postgresql/data  
    networks:  
      - recyclique_network  
    healthcheck:  
      test: ["CMD-SHELL", "pg_isready -U paheko"]  
      interval: 10s  
      timeout: 5s  
      retries: 5  
  
  # Cache Redis  
  redis:  
    image: redis:7-alpine  
    container_name: recyclique_redis  
    volumes:  
      - ./data/redis_/data  
    networks:  
      - recyclique_network  
    healthcheck:  
      test: ["CMD", "redis-cli", "ping"]  
      interval: 10s  
      timeout: 3s  
      retries: 5  
  
  # Paheko avec extensions préconfigurées  
  paheko:  
    build:  
      context: ./paheko  
      dockerfile: Dockerfile.paheko  
    container_name: recyclique_paheko  
    depends_on:  
      postgres:  
        condition: service_healthy  
      redis:  
        condition: service_healthy  
    environment:  
      # Configuration Paheko  
      PAHEKO_WWW_URI: "/"  
      PAHEKO_FILE_STORAGE_QUOTA: 5000000  
      # Base de données  
      DB_TYPE: postgresql  
      DB_HOST: postgres  
      DB_PORT: 5432  
      DB_NAME: paheko_db  
      DB_USER: paheko  
      DB_PASSWORD: ${POSTGRES_PASSWORD:-changeme}  
      # Redis  
      REDIS_HOST: redis  
      REDIS_PORT: 6379  
      # Configuration initiale  
      PAHEKO_INIT_MODE: "true"  
      PAHEKO_ACTIVATE_EXTENSIONS: "caisse,stock,poids,benevolat,materiel,agenda"  
    volumes:  
      - ./data/paheko_/var/www/paheko/data  
      - ./paheko/extensions:/var/www/paheko/extensions_custom  
      - ./paheko/config.local.php:/var/www/paheko/config.local.php:ro  
    ports:  
      - "8080:80"  
    networks:  
      - recyclique_network  
    healthcheck:  
      test: ["CMD", "curl", "-f", "http://localhost/api/health"]  
      interval: 30s  
      timeout: 10s  
      retries: 3  
  
  # Middleware RecyClique (votre API)  
  recyclique_api:  
    build:  
      context: ./middleware  
      dockerfile: Dockerfile.middleware  
    container_name: recyclique_api  
    depends_on:  
      paheko:  
        condition: service_healthy  
    environment:  
      PAHEKO_API_URL: "http://paheko/api"  
      PAHEKO_API_USER: ${PAHEKO_API_USER:-admin}  
      PAHEKO_API_PASSWORD: ${PAHEKO_API_PASSWORD:-changeme}  
      FASTAPI_PORT: 8000  
    ports:  
      - "4433:8000"  
    volumes:  
      - ./middleware/recyclique_connector:/app  
    networks:  
      - recyclique_network  
  
  # Frontend RecyClique (optionnel)  
  recyclique_frontend:  
    image: node:20-alpine  
    container_name: recyclique_frontend  
    working_dir: /app  
    command: npm run dev -- --host 0.0.0.0  
    volumes:  
      - ../frontend:/app  
    ports:  
      - "4444:5173"  
    networks:  
      - recyclique_network  
    depends_on:  
      - recyclique_api  
  
networks:  
  recyclique_network:  
    driver: bridge  
  
volumes:  
  postgres_  
  redis_  
  paheko_  
```  
  
### Dockerfile.paheko Personnalisé  
  
```dockerfile  
FROM php:8.2-apache  
  
# Installation dépendances système  
RUN apt-get update && apt-get install -y \  
    libsqlite3-dev \  
    libpq-dev \  
    libzip-dev \  
    libicu-dev \  
    curl \  
    unzip \  
    git \  
    && docker-php-ext-install \  
    pdo \  
    pdo_sqlite \  
    pdo_pgsql \  
    intl \  
    zip \  
    opcache \  
    && rm -rf /var/lib/apt/lists/*  
  
# Configuration PHP optimisée  
RUN echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/paheko.ini \  
    && echo "upload_max_filesize = 50M" >> /usr/local/etc/php/conf.d/paheko.ini \  
    && echo "post_max_size = 50M" >> /usr/local/etc/php/conf.d/paheko.ini  
  
# Téléchargement Paheko  
WORKDIR /tmp  
ARG PAHEKO_VERSION=1.3.17  
RUN curl -L https://fossil.kd2.org/paheko/uv/paheko-${PAHEKO_VERSION}.tar.gz -o paheko.tar.gz \  
    && tar -xzf paheko.tar.gz \  
    && mv paheko-${PAHEKO_VERSION}/* /var/www/paheko/ \  
    && rm -rf paheko.tar.gz paheko-${PAHEKO_VERSION}  
  
# Configuration Apache  
RUN a2enmod rewrite headers \  
    && sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/paheko/www|' /etc/apache2/sites-available/000-default.conf \  
    && echo "<Directory /var/www/paheko/www>\n\  
    AllowOverride All\n\  
    Require all granted\n\  
</Directory>" >> /etc/apache2/sites-available/000-default.conf  
  
# Permissions  
RUN chown -R www-www-data /var/www/paheko \  
    && chmod -R 755 /var/www/paheko  
  
# Copie scripts d'initialisation  
COPY scripts/init-paheko.sh /usr/local/bin/  
COPY scripts/activate-extensions.php /usr/local/bin/  
RUN chmod +x /usr/local/bin/init-paheko.sh  
  
# Point d'entrée personnalisé  
COPY scripts/docker-entrypoint.sh /usr/local/bin/  
RUN chmod +x /usr/local/bin/docker-entrypoint.sh  
  
WORKDIR /var/www/paheko  
  
EXPOSE 80  
  
ENTRYPOINT ["docker-entrypoint.sh"]  
CMD ["apache2-foreground"]  
```  
  
### Script d'initialisation : docker-entrypoint.sh  
  
```bash  
#!/bin/bash  
set -e  
  
# Attendre que PostgreSQL soit prêt  
echo "⏳ Attente PostgreSQL..."  
until pg_isready -h "$DB_HOST" -U "$DB_USER"; do  
  sleep 2  
done  
echo "✅ PostgreSQL prêt"  
  
# Attendre que Redis soit prêt  
echo "⏳ Attente Redis..."  
until redis-cli -h "$REDIS_HOST" ping; do  
  sleep 2  
done  
echo "✅ Redis prêt"  
  
# Initialisation Paheko si première installation  
if [ "$PAHEKO_INIT_MODE" = "true" ] && [ ! -f "/var/www/paheko/data/.initialized" ]; then  
    echo "🚀 Initialisation Paheko..."  
    /usr/local/bin/init-paheko.sh  
      
    # Activation des extensions  
    if [ -n "$PAHEKO_ACTIVATE_EXTENSIONS" ]; then  
        echo "📦 Activation des extensions: $PAHEKO_ACTIVATE_EXTENSIONS"  
        php /usr/local/bin/activate-extensions.php "$PAHEKO_ACTIVATE_EXTENSIONS"  
    fi  
      
    touch /var/www/paheko/data/.initialized  
    echo "✅ Paheko initialisé"  
fi  
  
# Démarrage Apache  
exec "$@"  
```  
  
### Script d'activation extensions : activate-extensions.php  
  
```php  
<?php  
/**  
 * Script CLI d'activation automatique des extensions Paheko  
 * Usage: php activate-extensions.php "extension1,extension2,extension3"  
 */  
  
require_once '/var/www/paheko/include/init.php';  
  
use Paheko\Plugins;  
use Paheko\UserException;  
  
$extensions_to_activate = explode(',', $argv[1] ?? '');  
  
// Mapping noms simples → noms techniques extensions  
$extension_map = [  
    'caisse' => 'caisse',  
    'stock' => 'stock', // Inclus avec caisse  
    'poids' => 'saisie_au_poids',  
    'benevolat' => 'temps_benevolat',  
    'materiel' => 'gestion_materiel',  
    'agenda' => 'agenda',  
];  
  
echo "🔧 Activation des extensions Paheko\n";  
  
foreach ($extensions_to_activate as $ext_short) {  
    $ext_short = trim($ext_short);  
    if (empty($ext_short)) continue;  
      
    $ext_name = $extension_map[$ext_short] ?? $ext_short;  
      
    try {  
        echo "  → Activation de '$ext_name'... ";  
          
        // Vérifier si l'extension existe  
        $plugin = Plugins::get($ext_name);  
          
        if (!$plugin) {  
            echo "❌ Extension introuvable\n";  
            continue;  
        }  
          
        // Activer l'extension  
        if (!$plugin->enabled) {  
            $plugin->enable();  
            echo "✅\n";  
        } else {  
            echo "déjà active ✓\n";  
        }  
          
    } catch (UserException $e) {  
        echo "⚠️  " . $e->getMessage() . "\n";  
    } catch (Exception $e) {  
        echo "❌ Erreur: " . $e->getMessage() . "\n";  
    }  
}  
  
echo "\n✅ Activation terminée\n";  
```  
  
***  
  
## 🔧 Solution 2 : Export/Import de Configuration Préconfigurée  
  
### Méthode : Sauvegarde Template  
  
Paheko permet d'exporter/importer facilement une configuration complète.[1][2][3]  
  
#### Étape 1 : Créer le Template  
  
```bash  
# 1. Installer Paheko manuellement avec toutes les extensions  
# 2. Configurer les catégories, comptes comptables, champs personnalisés  
# 3. Activer toutes les extensions nécessaires  
# 4. Exporter via Configuration > Sauvegardes > Télécharger base de données  
# 5. Exporter les documents via Configuration > Sauvegardes > Archive ZIP documents  
```  
  
#### Étape 2 : Script d'Import Automatique  
  
```bash  
#!/bin/bash  
# import-template.sh  
  
TEMPLATE_DB="./templates/recyclique-template.sqlite"  
TEMPLATE_DOCS="./templates/recyclique-docs.zip"  
PAHEKO_DATA_DIR="/var/www/paheko/data"  
  
echo "📦 Import template RecyClique dans Paheko..."  
  
# Copier la base de données template  
cp "$TEMPLATE_DB" "$PAHEKO_DATA_DIR/association.sqlite"  
  
# Extraire les documents template  
unzip -q "$TEMPLATE_DOCS" -d "$PAHEKO_DATA_DIR/documents/"  
  
# Permissions  
chown -R www-www-data "$PAHEKO_DATA_DIR"  
chmod -R 755 "$PAHEKO_DATA_DIR"  
  
echo "✅ Template importé avec succès"  
```  
  
#### Intégration Docker  
  
```dockerfile  
# Dans Dockerfile.paheko, ajouter :  
COPY templates/recyclique-template.sqlite /var/www/paheko/data/association.sqlite  
COPY templates/recyclique-docs/ /var/www/paheko/data/documents/  
```  
  
***  
  
## 📡 Solution 3 : API Paheko pour Configuration Programmatique  
  
Paheko expose une **API REST complète** permettant d'automatiser la configuration.[4]  
  
### Script Python de Configuration Automatique  
  
```python  
# configure_paheko.py  
import requests  
import json  
from typing import List, Dict  
  
class PahekoConfigurator:  
    def __init__(self, base_url: str, username: str, password: str):  
        self.base_url = base_url.rstrip('/')  
        self.auth = (username, password)  
        self.session = requests.Session()  
        self.session.auth = self.auth  
          
    def activate_extension(self, extension_name: str) -> bool:  
        """Active une extension via l'API"""  
        # Note: L'API Paheko ne supporte pas directement l'activation d'extensions  
        # Il faut passer par l'interface web ou un script PHP interne  
        print(f"⚠️  Activation '{extension_name}' nécessite interface web")  
        return False  
      
    def create_category(self, name: str, account_code: str) -> Dict:  
        """Crée une catégorie de produits pour la caisse"""  
        endpoint = f"{self.base_url}/api/categories"  
        payload = {  
            "name": name,  
            "account_code": account_code  
        }  
        response = self.session.post(endpoint, json=payload)  
        response.raise_for_status()  
        return response.json()  
      
    def import_accounting_chart(self, chart_file: str) -> bool:  
        """Importe un plan comptable"""  
        endpoint = f"{self.base_url}/api/accounting/import"  
        with open(chart_file, 'rb') as f:  
            files = {'file': f}  
            response = self.session.post(endpoint, files=files)  
        response.raise_for_status()  
        return True  
      
    def execute_sql(self, query: str) -> List[Dict]:  
        """Exécute une requête SQL personnalisée"""  
        endpoint = f"{self.base_url}/api/sql"  
        payload = {"query": query}  
        response = self.session.post(endpoint, json=payload)  
        response.raise_for_status()  
        return response.json()  
      
    def configure_recyclique_defaults(self):  
        """Configure les paramètres par défaut RecyClique"""  
        print("🔧 Configuration RecyClique pour Paheko...")  
          
        # Catégories ressourcerie  
        categories = [  
            ("Mobilier", "707"),  
            ("Électroménager", "707"),  
            ("Textile", "707"),  
            ("Livres", "707"),  
            ("Divers", "707"),  
        ]  
          
        for name, account in categories:  
            try:  
                self.create_category(name, account)  
                print(f"✅ Catégorie '{name}' créée")  
            except Exception as e:  
                print(f"⚠️  Catégorie '{name}': {e}")  
          
        # Configuration des champs personnalisés membres  
        custom_fields_sql = """  
        INSERT INTO config (key, value) VALUES   
        ('membres_champs_custom', '{"code_barre": "text", "photo": "file"}');  
        """  
        try:  
            self.execute_sql(custom_fields_sql)  
            print("✅ Champs personnalisés configurés")  
        except Exception as e:  
            print(f"⚠️  Champs personnalisés: {e}")  
  
# Usage  
if __name__ == "__main__":  
    config = PahekoConfigurator(  
        base_url="http://localhost:8080",  
        username="admin",  
        password="votremotdepasse"  
    )  
    config.configure_recyclique_defaults()  
```  
  
***  
  
## 🚀 Solution Recommandée : Hybride  
  
### Stack Complète RecyClique + Paheko  
  
```  
**┌─────────────────────────────────────────┐**  
│   RecyClique Frontend (React/Vite)      │  
│   Interface tactile caisse              │  
**└─────────────────┬───────────────────────┘**  
                  │  
**┌─────────────────**▼**───────────────────────┐**  
│   RecyClique API (FastAPI)              │  
│   Middleware + Agents IA                │  
**└─────────┬───────────────┬───────────────┘**  
          │               │  
**┌─────────**▼**─────┐**   **┌────**▼**──────────────┐**  
│  Paheko API   │   │  PostgreSQL       │  
│  (Backend)    │   │  (Données métier) │  
**└───────────────┘**   **└───────────────────┘**  
```  
  
### Déploiement en 3 Étapes  
  
#### 1. Préparer la Distribution  
  
```bash  
# Cloner le repo RecyClique  
git clone https://github.com/votre-org/recyclique-distribution  
cd recyclique-distribution  
  
# Structure  
mkdir -p {paheko/{scripts,extensions,templates},middleware,data/{paheko_data,postgres_data,redis_data}}  
  
# Télécharger Paheko  
cd paheko/templates  
curl -L https://fossil.kd2.org/paheko/uv/paheko-1.3.17.tar.gz -o paheko.tar.gz  
tar -xzf paheko.tar.gz  
```  
  
#### 2. Créer le Template de Base  
  
```bash  
# Démarrer Paheko temporaire pour configuration  
docker run -d --name paheko_temp -p 8080:80 paheko/paheko:latest  
  
# Configurer manuellement via http://localhost:8080  
# - Activer extensions (caisse, poids, bénévolat, matériel)  
# - Créer catégories comptables  
# - Configurer champs personnalisés  
  
# Exporter la configuration  
docker exec paheko_temp cat /var/www/paheko/data/association.sqlite > templates/recyclique-template.sqlite  
  
# Nettoyer  
docker stop paheko_temp && docker rm paheko_temp  
```  
  
#### 3. Lancer la Distribution Complète  
  
```bash  
# Créer .env  
cat > .env << EOF  
POSTGRES_PASSWORD=votre_mot_de_passe_securise  
PAHEKO_API_USER=api_recyclique  
PAHEKO_API_PASSWORD=api_password_securise  
EOF  
  
# Lancer la stack complète  
docker-compose up -d  
  
# Vérifier les services  
docker-compose ps  
docker-compose logs -f paheko  
```  
  
***  
  
## 📚 Guides d'Installation Détaillés par Module  
  
### Module Caisse + Stock  
  
**Activation** : Configuration > Extensions > Caisse informatisée > Activer[5]  
  
**Configuration** :  
1. Aller dans Caisse > Configuration  
2. Créer les catégories de produits :[6]  
   - Mobilier → Compte 707  
   - Électroménager → Compte 707  
   - Textile → Compte 707  
3. Ajouter les produits dans chaque catégorie  
4. Configurer les moyens de paiement  
5. Ouvrir une session de caisse[7]  
  
**API** :  
- `POST /api/cash_sessions` - Ouvrir session  
- `POST /api/sales` - Créer vente  
- `GET /api/products` - Lister produits  
  
### Module Saisie au Poids  
  
**Activation** : Configuration > Extensions > Saisie au poids > Activer  
  
**Configuration**  :[8][9]  
1. Définir les unités de mesure (kg, g, tonnes)  
2. Configurer les catégories de matériaux  
3. Établir les correspondances avec la caisse  
4. Activer l'import automatique depuis la caisse  
  
**Usage** :  
- Saisie manuelle : Saisie au poids > Nouvelle entrée/sortie  
- Import auto : après clôture de caisse, import dans Saisie au poids  
  
### Module Suivi Temps Bénévole  
  
**Activation** : Configuration > Extensions > Suivi du temps > Activer[10][11]  
  
**Configuration**  :[12][10]  
1. Créer les catégories de tâches :  
   - Administration (25€/h)  
   - Tri et valorisation (15€/h)  
   - Vente et accueil (18€/h)  
   - Réparation technique (30€/h)  
2. Associer les comptes comptables (864/875)  
3. Configurer les droits d'accès  
  
**Valorisation comptable automatique** :  
- Débit 864 (Personnel bénévole)  
- Crédit 875 (Bénévolat)  
  
### Module Gestion du Matériel  
  
**Activation** : Configuration > Extensions > Gestion du matériel > Activer[13]  
  
**Configuration** :  
1. Créer les types de matériel (objet unique, lot)  
2. Définir les états (excellent, bon, moyen, défectueux)  
3. Configurer les champs personnalisés (code-barre, photo, poids)  
4. Paramétrer les prêts/locations/cessions  
  
**Traçabilité objet** :  
- Entrée : scan code-barre + photo + état  
- Stock : suivi mouvement automatique  
- Sortie : vente/don enregistré avec destinataire  
  
***  
  
## 🔄 Maintenance et Mises à Jour  
  
### Mise à Jour Paheko  
  
```bash  
# Sauvegarder avant mise à jour  
docker exec recyclique_paheko php /var/www/paheko/bin/paheko backup create  
  
# Mise à jour de l'image  
docker-compose pull paheko  
docker-compose up -d paheko  
  
# Vérifier la version  
docker exec recyclique_paheko cat /var/www/paheko/VERSION  
```  
  
### Sauvegarde Automatique  
  
```yaml  
# Ajouter au docker-compose.yml  
  backup:  
    image: alpine:latest  
    container_name: recyclique_backup  
    volumes:  
      - ./data/paheko_/data/paheko:ro  
      - ./backups:/backups  
    command: >  
      sh -c "  
      while true; do  
        tar -czf /backups/paheko-$(date +%Y%m%d-%H%M%S).tar.gz /data/paheko  
        find /backups -name 'paheko-*.tar.gz' -mtime +7 -delete  
        sleep 86400  
      done  
      "  
```  
  
***  
  
## ✅ Checklist de Déploiement  
  
- [ ] Docker et Docker Compose installés  
- [ ] Variables d'environnement configurées (.env)  
- [ ] Template Paheko créé avec extensions activées  
- [ ] Docker Compose testé localement  
- [ ] Scripts d'initialisation fonctionnels  
- [ ] API Paheko accessible  
- [ ] Middleware RecyClique connecté  
- [ ] Tests de synchronisation données OK  
- [ ] Sauvegardes automatiques configurées  
- [ ] Documentation utilisateur complétée  
  
***  
  
## 📖 Ressources  
  
- **Documentation Paheko** : https://paheko.cloud/aide  
- **Guide PDF complet** : https://paheko.cloud/static/guide_a4.pdf (500 pages)[14]  
- **API REST** : https://paheko.cloud/api[4]  
- **Forum Entraide** : https://fossil.kd2.org/paheko/  
- **Code Source** : https://github.com/paheko/paheko[15]  
  
***  
  
**Avec cette approche, vous disposez d'une distribution RecyClique complète, reproductible, et maintenable, prête à être déployée sur n'importe quel serveur avec Docker !** 🚀  
  
Sources  
[1] Sauvegarde et export — Aide https://paheko.cloud/sauvegarde  
[2] Restaurer les données d'un compte — Aide https://paheko.cloud/changer-dhebergement-instance-restauration  
[3] Sauvegarde des documents — Aide https://paheko.cloud/documents-sauvegarde  
[4] API — Aide - Paheko - Gestion d'association https://paheko.cloud/api  
[5] Activation et gestion des extensions https://paheko.cloud/gestion-activation-extensions  
[6] Ajouter des produits et catégories — Aide - Caisse https://paheko.cloud/caisse-configuration-produits-categories  
[7] Ouvrir la caisse — Aide - Paheko - Gestion d'association https://paheko.cloud/ouverture-caisse  
[8] Saisir des entrées et sorties dans Saisie au poids https://paheko.cloud/extension-saisie-au-poids-saisir-entrees-sorties  
[9] Importer des données des extensions Caisses et Gestion ... https://paheko.cloud/extension-saisie-au-poids-import-gestion-velos-caisse  
[10] Configurer l'extension Suivi du temps — Aide https://paheko.cloud/extension-temps-benevolat-configuration  
[11] Suivi et valorisation du temps bénévole — Fonctionnalités https://paheko.cloud/fonctionnalites-suivi-du-temps  
[12] Les écritures comptables de la valorisation du temps ... https://paheko.cloud/ecritures-valorisation-benevolat  
[13] Nouvelle version 1.3.17 : gestion du matériel, statut des ... https://paheko.cloud/version-1-3-17-gestion-materiel-statut-email-reservations  
[14] Aide - Paheko - Gestion d'association https://paheko.cloud/aide  
[15] Miroir git officiel du gestionnaire d'association Paheko ... - GitHub https://github.com/paheko/paheko  
[16] Comment installer Docker et configurer ses premiers ... https://senza-formations.com/nos-articles/comment-installer-docker-et-configurer-ses-premiers-conteneurs-pas-a-pas  
[17] Développer avec les modules — Aide https://paheko.cloud/modules-developper  
[18] Paheko (ex Garradin) : installation et mise à jour https://documentation.ouvaton.coop/books/sites-web/page/paheko-ex-garradin-installation-et-mise-a-jour  
[19] Modules — Guide des développeureuses — Aide https://paheko.cloud/modules?_dialog  
[20] Installer et utiliser Docker et Docker-Compose https://www.youtube.com/watch?v=nkg48NLgGxE  
[21] Problème avec Cron et Paheko - Support apps https://forum.yunohost.org/t/probleme-avec-cron-et-paheko/31551  
[22] Nouveautés de la version 1.3.7 https://paheko.cloud/nouveautes-de-la-version-1-3-7  
[23] Migrer ses données entre instances Paheko https://paheko.cloud/migrer-entre-instances-paheko  
[24] Paheko 1.3 : refonte de la gestion des membres, drive ... https://linuxfr.org/news/paheko-1-3-refonte-de-la-gestion-des-membres-drive-integre-recus-fiscaux-etc  
[25] Modules — Guide des développeureuses — Aide https://paheko.cloud/modules  
[26] Configuration de votre Paheko — Aide https://paheko.cloud/configuration-logiciel  
[27] Premiers pas avec Paheko https://paheko.cloud/static/guide_livret.pdf  
[28] Présentation de l'interface de Paheko — Aide https://paheko.cloud/video-interface  
[29] Paheko https://docs.lacontrevoie.fr/technique/services-auxiliaires/paheko/  
[30] Extensions — Aide - Paheko - Gestion d'association https://paheko.cloud/extensions  
[31] Configuration — Aide - Paheko - Gestion d'association https://paheko.cloud/configuration?_dialog  
[32] Configuration — Aide - Paheko - Gestion d'association https://paheko.cloud/configuration  
[33] Installation de paheko — wiki.infini https://wiki.infini.fr/index.php/Installation_de_paheko  
[34] Application NextCloud pour intégrer Paheko https://github.com/kd2org/paheko-nextcloud  
[35] Logiciel libre - Paheko - Gestion d'association https://paheko.cloud/logiciel-libre  
[36] Documentation utilisateur - Paheko - Gestion d'association https://paheko.cloud/static/guide_a4.pdf  
[37] Sommaire — Aide - Paheko - Gestion d'association https://paheko.cloud/sommaire  
[38] Préparer son fichier pour un import de liste des membres https://paheko.cloud/preparer-fichier-import  
[39] La gestion des documents sur Paheko https://www.youtube.com/watch?v=oixvVPHv-TI  
[40] Nouveautés de la version 1.3.13 https://paheko.cloud/nouveautes-version-1-3-13  
