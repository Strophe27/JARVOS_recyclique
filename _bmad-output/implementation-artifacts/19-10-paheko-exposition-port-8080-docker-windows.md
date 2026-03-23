# Story 19.10: Paheko — exposition du port 8080 sous Docker Windows

Status: done

## Story

As a administrateur technique,
I want accéder à Paheko sur http://localhost:8080 depuis la machine hôte Windows,
so that les tests d'intégration RecyClique → Paheko soient possibles.

## Acceptance Criteria

1. **Given** l'environnement Docker Desktop Windows avec les services lancés via `docker compose up`
   **When** Strophe ouvre http://localhost:8080 dans un navigateur
   **Then** l'interface Paheko s'affiche correctement

2. **Or** si le port 8080 n'est pas viable sous Windows (conflit, restriction réseau Docker Desktop), une procédure alternative documentée (proxy, port différent) permet d'y accéder sans modifier l'architecture applicative

3. La solution fonctionne avec `docker compose up` (prod) et `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` (dev) de manière identique

## Critère de validation terrain

« Strophe ouvre http://localhost:8080 et accède à l'interface Paheko. »

## Tasks / Subtasks

- [x] Task 1 — Diagnostic runtime Paheko sous Docker Desktop Windows (AC: #1)
  - [x] Vérifier que le conteneur paheko démarre (`docker compose ps`, `docker compose logs paheko`)
  - [x] Vérifier que le port 80 est bien servi à l'intérieur du conteneur (`docker compose exec paheko curl -s http://localhost:80`)
  - [x] Vérifier que le mapping `8080:80` est effectif côté hôte (`netstat -an | findstr 8080` ou `docker port`)
  - [x] Identifier si un conflit de port ou un firewall Windows bloque l'accès

- [x] Task 2 — Correction ou contournement (AC: #1, #2)
  - [x] Si le conteneur ne démarre pas : corriger la config (image, volumes, env)
  - [x] Si le port est bloqué : changer le port hôte ou ajouter un healthcheck
  - [x] Si problème réseau Docker Desktop spécifique : documenter le workaround

- [x] Task 3 — Vérification dev mode (AC: #3)
  - [x] Confirmer que `docker-compose.dev.yml` ne désactive pas paheko (actuellement, il ne touche que `recyclic`)

- [x] Task 4 — Documentation si procédure alternative (AC: #2)
  - [x] N/A : le port 8080 standard fonctionne, pas de procédure alternative nécessaire

## Dev Notes

### Analyse de la configuration actuelle (docker-compose.yml)

Le service `paheko` est défini comme suit :

```yaml
paheko:
  image: paheko/paheko@sha256:fa2b4a6188802447cc3c43f51d3bac55a73cb203e17e05ed68c8a2d4d29a15ec
  restart: unless-stopped
  env_file:
    - .env
  ports:
    - "8080:80"
  volumes:
    - paheko_data:/var/www/paheko/data
  networks:
    - jarvos_net
```

**Observations clés :**

- Le mapping `"8080:80"` est **déjà présent** dans le fichier commité. Le problème n'est pas un oubli de mapping.
- Le service paheko n'a **aucun healthcheck** défini (contrairement à `recyclic`, `postgres`, `redis`). Impossible de savoir si le conteneur est sain sans inspecter les logs.
- L'image est pinée par digest SHA256 (bonne pratique), mais cela rend les mises à jour manuelles.
- `docker-compose.dev.yml` ne surcharge que le service `recyclic` — paheko n'est pas affecté en mode dev.

**Hypothèses à investiguer (par ordre de probabilité) :**

1. Le conteneur paheko ne démarre pas correctement (crash silencieux, pas de healthcheck pour alerter)
2. Le processus web interne à l'image Paheko n'écoute pas sur le port 80 (mauvaise config interne)
3. Docker Desktop Windows ne bind pas le port 8080 à l'hôte (problème WSL2 / Hyper-V networking)
4. Conflit de port 8080 avec un autre service sur la machine hôte

**Correction probable :**
Ajouter un healthcheck au service paheko pour détecter les crashes, et vérifier/corriger la cause racine du non-accès.

### Project Structure Notes

- Fichier principal : `docker-compose.yml` (racine)
- Fichier dev overlay : `docker-compose.dev.yml` (racine)
- Documentation déploiement : `doc/deployment.md`
- URLs de référence dev : http://localhost:8080 (paheko), http://localhost:9010 (api), http://localhost:4173 (frontend)

### References

- [Source: docker-compose.yml#paheko service, lignes 33-43]
- [Source: docker-compose.dev.yml — ne touche pas paheko]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 19.10, lignes 2830-2849]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus (bmad-dev subagent)

### Debug Log References

- `docker compose ps -a` : conteneur paheko Up (healthy) mais PORTS = `80/tcp` (non publié)
- `docker inspect --format PortBindings` : config `8080:80` présente mais non appliquée au runtime
- `docker port jarvos_recyclique-paheko-1` : vide (confirmant non-publication)
- `Invoke-WebRequest http://localhost:8080/` : "Impossible de se connecter au serveur distant" (avant fix)
- Après `docker compose up -d --force-recreate paheko` : PORTS = `0.0.0.0:8080->80/tcp`, réponse HTTP 302

### Completion Notes List

**Cause racine identifiée :** Le conteneur paheko avait été créé avant que le mapping de port `8080:80` ne soit effectif (ou avec une version antérieure de docker-compose.yml). Docker Compose ne recrée pas automatiquement un conteneur existant si la configuration du service n'a pas changé depuis sa dernière création. Le port mapping était dans le fichier YAML mais jamais appliqué au conteneur en cours d'exécution.

**Corrections appliquées :**

1. **Healthcheck explicite ajouté** au service paheko dans `docker-compose.yml` :
   - `curl --silent --fail http://127.0.0.1/admin/ || exit 1`
   - interval: 30s, timeout: 10s, retries: 3, start_period: 20s
   - L'image avait un healthcheck intégré mais sans paramètres configurables. L'ajout explicite dans compose donne un meilleur contrôle et une meilleure visibilité.
   - Ce changement de config force aussi Docker Compose à recréer le conteneur au prochain `docker compose up`, appliquant ainsi le port mapping.

2. **Conteneur recréé** via `docker compose up -d --force-recreate paheko` pour appliquer le mapping de port.

**Vérifications post-fix :**
- `docker compose ps paheko` : `0.0.0.0:8080->80/tcp, [::]:8080->80/tcp` (port publié)
- `docker port jarvos_recyclique-paheko-1` : `80/tcp -> 0.0.0.0:8080` + `80/tcp -> [::]:8080`
- `Invoke-WebRequest http://localhost:8080/` : HTTP 302 (redirection Paheko normale)
- Mode dev (`docker-compose.yml` + `docker-compose.dev.yml`) : paheko conserve le healthcheck et le port mapping

**Procédure de diagnostic future :**
Si Paheko redevient inaccessible sur localhost:8080, vérifier dans cet ordre :
1. `docker compose ps paheko` — le conteneur tourne-t-il ? La colonne PORTS montre-t-elle `0.0.0.0:8080->80/tcp` ?
2. Si PORTS = `80/tcp` seulement : `docker compose up -d --force-recreate paheko`
3. Si le conteneur n'est pas healthy : `docker compose logs paheko --tail 20`
4. Si un autre processus occupe le port 8080 : `netstat -an | findstr 8080`

### File List

- `docker-compose.yml` — ajout healthcheck explicite au service paheko (6 lignes)

## Senior Developer Review (AI)

**Reviewer:** bmad-qa (claude-4.6-opus) — 2026-03-16
**Result:** APPROVED

### Review Notes

1. **Healthcheck** : correctement configure — `CMD-SHELL` + `curl --silent --fail` + timings raisonnables (30s/10s/3/20s). Le endpoint `/admin/` interne est accessible et un HTTP 302 est sain.
2. **Port mapping** : `8080:80` present et fonctionnel. La cause racine (conteneur non recree) est resolue par l'ajout du healthcheck qui force la recreation.
3. **Isolation** : aucun impact sur les services recyclic, postgres, redis. Le diff inclut aussi un changement de port recyclic (`8000→9010`) qui est anterieur et independant.
4. **Compatibilite Windows** : `curl` s'execute dans le conteneur Linux, pas de souci Docker Desktop.
5. **ACs** : tous satisfaits — localhost:8080 accessible (HTTP 302), pas de procedure alternative necessaire, mode dev identique.
6. **Nit corrige** : Task 4 checkbox alignee avec le contenu (N/A).

### Change Log

| Date | Agent | Action |
|------|-------|--------|
| 2026-03-16 | bmad-qa | Code review approved — story → done |
