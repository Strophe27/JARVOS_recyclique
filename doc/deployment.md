# Déploiement Docker — JARVOS RecyClique

Ce document décrit le déploiement de la stack RecyClique via Docker Compose (projet `jarvos_recyclique`) et la vérification de l’instance.

## Prérequis

- **Docker** : Docker Desktop (Windows/macOS) ou moteur Docker + Docker Compose v2.
- **Audit Docker local (recommandé)** : avant le premier démarrage, effectuer une lecture du `docker-compose.yml` et du `Dockerfile` pour vérifier les images de base, les volumes et les ports. Aucun secret ne doit être en dur dans les fichiers ou les images.
- **Stratégie d’isolation** : les services (recyclic, paheko, postgres, redis) sont sur un réseau bridge dédié `jarvos_net` ; les données persistantes sont dans des volumes nommés (`postgres_data`, `redis_data`, `paheko_data`). Ne pas exposer les ports des bases en dehors du réseau si ce n’est pas nécessaire.

## Démarrer l’instance

À la **racine du dépôt** :

```bash
# Optionnel : copier .env.example vers .env pour surcharger les variables
# cp .env.example .env

docker compose up --build
```

Pour lancer en arrière-plan :

```bash
docker compose up --build -d
```

## Vérification de la stack

### 1. État des services

Vérifier que les services sont en état **running** (et **healthy** pour recyclic, postgres, redis) :

```bash
docker compose ps -a
```

Services attendus : **recyclic**, **paheko**, **postgres**, **redis**. En cas d’échec au démarrage (ex. port déjà utilisé), le service concerné restera en état `Created` ou `Exited` ; consulter les logs avec `docker compose logs <service>`.

### 2. Health check RecyClique

- **URL :** http://localhost:8000/health  
- **Méthode :** GET  

**Réponse attendue (exemple)** : un JSON avec au minimum les champs `status`, `database` (optionnel si BDD non configurée), `redis` :

```json
{"status": "ok", "database": "ok", "redis": "ok"}
```

ou si la base RecyClique n’est pas encore configurée :

```json
{"status": "ok", "database": "unconfigured", "redis": "ok"}
```

Un statut cohérent signifie : application up, connexion Redis opérationnelle, et éventuellement état de la base (ok / unconfigured / error).

### 3. Accès front et Paheko

| Service    | URL                     | Description                          |
|-----------|--------------------------|--------------------------------------|
| RecyClique (SPA + API) | http://localhost:8000   | Frontend et API                      |
| Health check           | http://localhost:8000/health | Santé de l’application et dépendances |
| Paheko                 | http://localhost:8080   | Compta / vie associative (si exposé)  |

Si **Docker n’est pas exécutable** dans l’environnement (ex. agent en sandbox), la vérification est **manuelle** : exécuter `docker compose up --build` sur une machine disposant de Docker, puis vérifier les URLs ci-dessus et le health check.

## Dépannage

- **Port 8080 déjà alloué** : le conteneur Paheko ne pourra pas démarrer. Libérer le port 8080 ou modifier le mapping dans `docker-compose.yml` (ex. `"8081:80"` pour Paheko) puis relancer `docker compose up -d`.
- **Port 8000 déjà utilisé** : idem pour RecyClique ; changer le mapping des ports ou arrêter le processus qui utilise le port.
- **Health check en échec** : vérifier les logs du service `recyclic` (`docker compose logs recyclic`) et que PostgreSQL et Redis sont bien healthy (`docker compose ps`).

## Provisionnement IdP OIDC (dev/preprod/prod)

Cette section formalise le socle operational IAM pour provisionner un IdP commun, declarer les clients OIDC et garder une procedure rejouable pour la reprise du gate `14-0`.

### Portee 14.1 (directive utilisateur)

- **Valide maintenant (dev/local)**:
  - IdP operationnel en dev/local.
  - HTTPS de dev en place (certificat auto-signe acceptable).
  - Clients OIDC dev (`recyclique-bff-dev`, `paheko-web-dev`) declares.
  - Methode de gestion/rotation des secrets documentee (provisoire acceptable) sans fuite de secret.
- **Valide plus tard (preprod/prod)**:
  - preuves d'execution en environnement reel, replay gate 14-0 nominal + fail-closed, et validation du coffre de secrets preprod/prod.

### Preflight standardise (avant provisionnement)

1. **DNS/TLS**:
   - `idp-<env>.example.org` resolvable.
   - certificat TLS valide sur la cible (`dev`, `preprod`, `prod`).
2. **Variables runtime**:
   - verifier les cles OIDC dans `.env` (ou secret manager) sans exposer les valeurs.
   - imposer `AUTH_SESSION_COOKIE_SECURE=true` sur toute cible HTTPS reelle.
3. **Horloge systeme**:
   - ecart NTP raisonnable (< 60 s) entre IdP, API RecyClique et navigateur de test.
4. **Reseau sortant**:
   - RecyClique doit atteindre l'issuer OIDC et les endpoints metadata/token/jwks.
5. **Secrets**:
   - dev/local: secret hors code via `.env` local non versionne (provisoire acceptable).
   - preprod/prod: `OIDC_CLIENT_SECRET` et credentials admin IdP fournis uniquement par coffre de secrets.

### Verification metadata OIDC (preuve minimale)

Pour chaque environnement (`dev`, `preprod`, `prod`) :

```bash
curl -fsS "https://idp-<env>.example.org/realms/<realm>/.well-known/openid-configuration"
```

Verifier explicitement les champs requis:
- `issuer`
- `authorization_endpoint`
- `token_endpoint`
- `jwks_uri`
- `end_session_endpoint`

Conserver une copie sanitisee de la sortie dans les artefacts de sprint (sans secret).

### Clients OIDC a declarer

- **RecyClique BFF**:
  - Flow: Authorization Code + PKCE
  - Redirect URI: `https://recyclique-<env>.example.org/v1/auth/sso/callback`
  - Post logout redirect URI: `https://recyclique-<env>.example.org/`
  - Scopes minimaux: `openid profile email`
- **Paheko**:
  - Scope 14.2 (methode HITL, dev/local): activation par fichier `/var/www/paheko/config.local.php` avec runtime env `PAHEKO_OIDC_CLIENT_URL`, `PAHEKO_OIDC_CLIENT_ID`, `PAHEKO_OIDC_CLIENT_SECRET`, `PAHEKO_OIDC_CLIENT_MATCH_EMAIL`.
  - `config.local.php` est fail-closed pour URL/client_id: aucune valeur par defaut non vide n'est injectee.
  - Callback exact a declarer cote IdP et utilise par Paheko: `http://localhost:8080/admin/login.php?oidc` (pas de route `/callback`).
  - Provisionnement local standard possible: Keycloak sur `http://localhost:8081`, realm `recyclique-dev`, client `paheko-web-dev`.
  - Mitigation A (14.2): autoriser le scope effectivement demande par Paheko (incluant `service_account`) en activant `serviceAccountsEnabled=true` sur le client.
  - Preprod/prod (valide plus tard): decliner la meme logique avec callback exact de l'environnement cible.
  - Scope minimal identique, avec claims IAM requis selon matrice Epic 12 (`sub`, `role`, `tenant`, `exp`, `aud`, `iss`).

### Strategie de mapping utilisateur Paheko (story 14.2)

- Regle retenue (methode HITL): mapping principal par `email` (`OIDC_CLIENT_MATCH_EMAIL=true`), sans fallback implicite.
- Interdictions:
  - pas de creation implicite de compte sur premier login OIDC;
  - pas de fallback silencieux hors regles explicitement documentees.
- Cas ambigus obligatoirement fail-closed:
  - `email` absent/inconnu;
  - collision `email`;
  - claims critiques invalides.
- Tracabilite minimum:
  - chaque refus contient `request_id` et un code raison non sensible (`missing_email`, `email_collision`, `account_not_found`, `invalid_claims`);
  - aucune fuite de secret/token dans les logs.

### Mini-guide operations 14.2 (dev/local)

Checks preflight:
1. verifier metadata IdP (`issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `end_session_endpoint`);
2. verifier client `paheko-web-dev` + callback exact `http://localhost:8080/admin/login.php?oidc`;
3. verifier secret client OIDC injecte hors depot;
4. verifier synchro horloge (eviter faux rejets `exp`).

Checks post-config:
1. executer un nominal OIDC Paheko (utilisateur autorise);
2. executer au moins 2 rejets critiques sur le flux OIDC Paheko (claims invalides/incomplets, mapping ambigu);
3. verifier les logs de refus (presence `request_id`, absence de secrets);
4. archiver des preuves sanitisees dans les artefacts 14.2.

Erreurs techniques observables a remonter si le nominal echoue:
- `invalid_scope` (scope compose cote Paheko refuse par IdP);
- `invalid_redirect_uri` (callback mismatch);
- metadata/discovery indisponibles (`.well-known`);
- `jwks` indisponible ou signature invalide.

Statut reprise 14.2:
- `invalid_scope` a ete leve en dev/local apres mitigation A (capture `/authorize` + scope exact, puis ajustement client Keycloak).

Note de scope:
- La validation 14.2 peut progresser en `dev/local`.
- La generalisation preprod/prod reste conditionnee par la reprise de `14-0` (gate nominal + fail-closed) sur environnement reel HTTPS.

### Rotation secrets (minimum)

- Frequence minimale:
  - `OIDC_CLIENT_SECRET`: tous les 90 jours ou apres incident.
  - credentials admin IdP techniques: tous les 90 jours ou apres mouvement d'equipe.
- Procedure:
  1. creer nouvelle valeur dans le coffre.
  2. injecter sur cible (`dev` -> `preprod` -> `prod`).
  3. verifier login nominal + fail-closed.
  4. revoquer l'ancienne valeur.
  5. tracer date, porteur, preuve sanitisee.

### Reprise obligatoire gate 14-0 (apres provisioning HTTPS reel)

Des qu'un environnement OIDC HTTPS reel est disponible (au minimum `preprod` ou equivalent), rejouer:
1. `/v1/auth/sso/start` -> callback -> `/v1/auth/session` (nominal complet)
2. echec `400` state invalide
3. echec `503` dependance IdP indisponible

Puis mettre a jour:
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-preuves.md`
- `_bmad-output/implementation-artifacts/14-0-oidc-gate-runbook.md`

### Preuves attendues plus tard en preprod/prod

- Export sanitise metadata OIDC pour `preprod` et `prod`.
- Verification sanitisee des `issuer`/redirect URIs/scopes des clients preprod/prod.
- Trace sanitisee d'une rotation de secret sur cible preprod.
- Replay gate `14-0` complet (nominal + fail-closed) avec resultats exploitables.

## Verification runtime OIDC RecyClique (Story 14.3)

Objectif: verifier la configuration OIDC effectivement chargee dans le process du conteneur actif (et pas seulement dans `.env`).

### Variables critiques a verifier

- `OIDC_ENABLED`
- `OIDC_ISSUER`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET` (presence uniquement, jamais la valeur)
- `OIDC_REDIRECT_URI`
- `OIDC_HTTP_TIMEOUT_SECONDS`
- `OIDC_FAIL_CLOSED_STRICT`

### Commandes minimales de preuve runtime

```bash
docker compose exec recyclic python -c "from api.services.health_checks import check_oidc_runtime; import json; print(json.dumps(check_oidc_runtime(), ensure_ascii=True))"
curl -fsS "http://localhost:8000/health" | jq '.auth_runtime'
curl -fsS "http://localhost:8000/v1/admin/health/auth"
```

### Restart vs recreate (Docker)

- `docker compose restart recyclic`:
  - redemarre le processus mais conserve la configuration environnement du conteneur existant.
  - un changement dans `.env` n'est pas reapplique au conteneur.
- `docker compose up -d --force-recreate recyclic`:
  - recree le conteneur et recharge les variables depuis `.env`/`env_file`.
  - requis pour appliquer une modification de variables OIDC runtime.

Preuve attendue:
1. changer temporairement une variable OIDC non sensible (ex. `OIDC_ISSUER`),
2. executer `restart` puis relire `check_oidc_runtime` (valeur inchangée),
3. executer `--force-recreate` puis relire `check_oidc_runtime` (nouvelle valeur prise en compte),
4. restaurer la valeur initiale et recreer le conteneur.

## Arrêter l’instance

```bash
docker compose down
```

Pour supprimer aussi les volumes (données) :

```bash
docker compose down -v
```
