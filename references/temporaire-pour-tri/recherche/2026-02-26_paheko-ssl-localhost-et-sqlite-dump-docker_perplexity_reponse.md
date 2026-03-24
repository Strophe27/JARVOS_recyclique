

## 1. Erreur SSL sur localhost:8080 (Paheko Docker)

**Cause principale** : Apache dans l'image `paheko/paheko` est configuré avec une **redirection automatique HTTP → HTTPS** (via `.htaccess` ou `RewriteRule` dans `/var/www/paheko/www/`), mais **aucun certificat SSL valide n'est présent** côté conteneur. Le navigateur lance un handshake TLS, Apache répond avec du HTTP pur → `ERR_SSL_PROTOCOL_ERROR`.[^1]

**Pourquoi RecyClique (8000) marche** : FastAPI n'a pas cette redirection forcée.

**Diagnostic rapide (sans toucher Docker Compose) :**

```bash
# 1. Inspecter les logs Paheko
docker compose logs paheko | grep -i "rewrite\|ssl\|redirect"

# 2. Vérifier si redirection 301/302
curl -I http://localhost:8080 | grep Location

# 3. Test sans navigateur (curl ignore SSL)
curl -k -v http://localhost:8080  # -k ignore erreurs SSL
```

**Solutions bidouilles locales (container monté, sans rebuild) :**

### Option A : patcher le .htaccess (recommandée, 2 min)

```bash
# Accéder au shell du conteneur Paheko
docker compose exec paheko bash

# Éditer le .htaccess principal (Apache le lit)
cd /var/www/paheko/www/
nano .htaccess
# → Commenter ou supprimer la ligne :
# RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Ou forcer HTTP
echo "RewriteEngine Off" >> .htaccess

# Restart Apache dans le conteneur
apachectl graceful
```

Accès immédiat à **http://localhost:8080** sans erreur SSL.

### Option B : désactiver mod_rewrite (si A échoue)

```bash
docker compose exec paheko a2dismod rewrite
docker compose exec paheko apachectl graceful
```


### Option C : proxy via curl/telnet (test immédiat)

```bash
curl -k http://localhost:8080  # Ignore SSL, affiche le HTML Paheko
```

**Prévention navigateur** : Chrome/Firefox force HTTPS sur certains ports — utilise toujours `http://` explicite.

## 2. Démarrer Paheko avec SQLite existant (bidouille locale)

**Chemin Paheko SQLite** : `/var/www/paheko/data/association.sqlite`.[^2]

**Solutions sans Docker Compose (copie manuelle) :**

### Option A : copie directe via volume (1 min)

```bash
# 1. Stopper Paheko
docker compose stop paheko

# 2. Copier ton SQLite dans le volume data (adapte le chemin)
docker cp ./mon-dump-association.sqlite $(docker compose ps -q paheko):/var/www/paheko/data/association.sqlite

# 3. Permissions www-data (Paheko)
docker compose exec paheko chown www-data:www-data /var/www/paheko/data/association.sqlite
docker compose exec paheko chmod 644 /var/www/paheko/data/association.sqlite

# 4. Redémarrer
docker compose up -d paheko
```


### Option B : shell + copie (si volume non bind)

```bash
# Accéder au conteneur
docker compose exec paheko bash

# Copier depuis l'hôte (adapte /host/path)
cp /host/path/mon-dump-association.sqlite /var/www/paheko/data/association.sqlite
chown www-data:www-data /var/www/paheko/data/association.sqlite
chmod 644 /var/www/paheko/data/association.sqlite

# Quitter + restart Apache
apachectl graceful
exit
```

**Vérification** :

```bash
docker compose exec paheko sqlite3 /var/www/paheko/data/association.sqlite "SELECT sqlite_version();"
docker compose exec paheko ls -la /var/www/paheko/data/association.sqlite  # Taille > 0
```

**Notes critiques** :

- Paheko **détecte automatiquement** si `association.sqlite` existe au démarrage — pas d'onboarding.[^2]
- Si le dump est un **.sql** (pas SQLite), il faut d'abord le convertir :

```bash
sqlite3 temp.db < mon-dump.sql
docker cp temp.db $(docker compose ps -q paheko):/var/www/paheko/data/association.sqlite
rm temp.db
```

- **Backup avant** : `docker cp $(docker compose ps -q paheko):/var/www/paheko/data/association.sqlite ./backup-$(date +%F).sqlite`

Ces bidouilles sont **100% locales**, ne touchent ni `docker-compose.yml` ni `Dockerfile`, et persistent tant que le volume data n'est pas supprimé.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://stackoverflow.com/questions/62156276/docker-php-with-apache-on-localhost-err-ssl-protocol-error

[^2]: https://paheko.cloud/api

[^3]: https://github.com/phpmyadmin/docker/issues/279

[^4]: https://forums.docker.com/t/tutorial-welcome-to-docker-frontend-shows-err-ssl-protocol-error/136858

[^5]: https://www.reddit.com/r/apache/comments/k6mh4n/how_to_fix_err_ssl_protocol_error/

[^6]: https://www.reddit.com/r/docker/comments/x7x0je/ultranoob_question_trying_to_open_localhost8080/

[^7]: https://www.reddit.com/r/docker/comments/1h8mc89/is_it_possible_to_use_sqlite_with_named_volume/

[^8]: https://www.reddit.com/r/docker/comments/1535zck/help_needed_tutorial_welcometodocker_frontend/

[^9]: https://github.com/statping/statping/issues/625

[^10]: https://www.reddit.com/r/apache/comments/1d8lf6q/err_ssl_protocol_error/

[^11]: https://github.com/abecodes/docker_sqlite

[^12]: https://www.ionos.fr/digitalguide/hebergement/aspects-techniques/err-ssl-protocol-error/

[^13]: https://www.reddit.com/r/docker/comments/aa4rwk/using_sqlite_database_with_docker_containers/

[^14]: https://stackoverflow.com/questions/77228938/apache-nginx-vhost-err-ssl-protocol-error-only-with-google-chrome

[^15]: https://paheko.cloud/modules-developper

