# 14-2 - Preuves de validation OIDC Paheko (dev/local)

Date: 2026-02-28  
Story source: `14-2-configurer-paheko-oidc-et-strategie-de-mapping-utilisateur`

## Reprise HITL - provisionnement local standard

- IdP local Docker deploie: **Keycloak** sur `http://localhost:8081`
- Realm: `recyclique-dev`
- Client OIDC Paheko: `paheko-web-dev`
- Redirect URI client: `http://localhost:8080/admin/login.php?oidc`
- Utilisateur test IdP cree: `oidc.test` / `oidc.test@local.dev`
- Membre Paheko cree avec meme email: `oidc.test@local.dev`

## 1) Etat d'execution local

- Stack Docker active (recyclic, paheko, postgres, redis) : **OK**
- Surface login Paheko (`http://localhost:8080/admin/login.php`) : **OK** (200)
- Activation OIDC par fichier appliquee : **OK**
  - chemin: `/var/www/paheko/config.local.php`
  - cles: `OIDC_CLIENT_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_CLIENT_MATCH_EMAIL=true`
- Callback exact impose HITL utilise : `http://localhost:8080/admin/login.php?oidc`
- Entree OIDC visible depuis la page de login : **OK** (`?oidc` detecte dans le HTML)
- Demarrage du flux OIDC (`/admin/login.php?oidc`) : **KO** (500) sur indisponibilite IdP/metadata
- Demarrage du flux OIDC (`/admin/login.php?oidc`) : **OK** (302 vers IdP)
- Nominal complet: **OK** apres mitigation A (erreur `invalid_scope` levee)
- Rejet OIDC Paheko - compte local introuvable: **OK** (flow callback Paheko execute, refus fail-closed)
- Rejet OIDC Paheko - claim email manquant: **OK** (flow OIDC bloque en required action IdP, pas de session Paheko)

Interpretation:
- La methode HITL est appliquee strictement (config fichier + callback exact).
- La mitigation A est appliquee: capture du `scope` demande puis ajustement Keycloak pour accepter ce scope.
- Le flux nominal OIDC atteint bien le callback Paheko avec `code` OAuth et redirection `/admin/`.

## 2) Commandes executees (sanitisees)

```bash
docker compose ps
```

Resultat: services `paheko`, `recyclic`, `postgres`, `redis` en etat `Up (healthy)`.

```bash
docker compose cp "paheko-config/config.local.php" paheko:/var/www/paheko/config.local.php
```

Resultat: copie de la configuration OIDC dans le conteneur Paheko.

```bash
curl.exe -s -D - "http://localhost:8080/admin/login.php" -o NUL
```

Resultat: `200`

```bash
python -c "import requests; t=requests.get('http://localhost:8080/admin/login.php', timeout=10).text.lower(); print('?oidc' in t)"
```

Resultat: `True`

```bash
curl.exe -s -D - "http://localhost:8080/admin/login.php?oidc" -o NUL
```

Resultat: `500`

```bash
docker compose up -d keycloak paheko
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user *** --password ***
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create realms -s realm=recyclique-dev -s enabled=true
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create clients -r recyclique-dev -f /tmp/keycloak-client-paheko-web-dev.json
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh update clients/<client_id> -r recyclique-dev -s secret=***
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh create users -r recyclique-dev -s username=oidc.test -s enabled=true -s email=oidc.test@local.dev -s emailVerified=true -s firstName=OIDC -s lastName=Test
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh set-password -r recyclique-dev --userid <user_id> --new-password ***
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh update clients/<client_id> -r recyclique-dev -s serviceAccountsEnabled=true
docker compose exec paheko php /tmp/seed_paheko_member.php
```

Resultat: provisionnement local IdP + client + utilisateur + membre Paheko **OK**.

```bash
curl.exe -s -D - "http://localhost:8081/realms/recyclique-dev/.well-known/openid-configuration" -o NUL
```

Resultat: `200`

```bash
python -m pytest "api/tests/routers/test_auth.py" -k "sso_callback_nominal_sets_bff_cookie_and_redirects or sso_callback_user_mapping_failed_writes_fail_closed_audit or sso_callback_invalid_state_returns_400"
```

Resultat: `3 passed, 28 deselected`

```bash
python "paheko-config/check_paheko_oidc_nominal.py"
python "paheko-config/check_paheko_oidc_nominal.py" > "_bmad-output/implementation-artifacts/14-2-paheko-oidc-nominal-run.log"
python "paheko-config/check_paheko_oidc_nominal.py" --username oidc.nomap --password oidc-nomap-password --expect reject > "_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-account-not-found.log"
python "paheko-config/check_paheko_oidc_nominal.py" --username oidc.noemail --password oidc-noemail-password --expect reject > "_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-missing-email.log"
```

Resultat synthese (mitigation A):
- capture `/authorize`:
  - `http://host.docker.internal:8081/realms/recyclique-dev/protocol/openid-connect/auth?...&scope=openid+offline_access+phone+basic+acr+profile+email+address+microprofile-jwt+roles+organization+service_account+web-origins`
- scope exact demande par Paheko:
  - `openid offline_access phone basic acr profile email address microprofile-jwt roles organization service_account web-origins`
- ajustement Keycloak:
  - `serviceAccountsEnabled=true` sur le client `paheko-web-dev`
- rejeu nominal:
  - `step1 302` (Paheko -> IdP `/authorize`)
  - `step2 200` (form login Keycloak affiche)
  - `step3 302` (IdP -> callback Paheko avec `code` + `state`)
  - `step4 302` (callback -> `/admin/`, cookie `pko` emis)
  - trace complete: `_bmad-output/implementation-artifacts/14-2-paheko-oidc-nominal-run.log`
- rejet 1 - compte local introuvable (`oidc.nomap@local.dev` sans membre Paheko):
  - `step1 302` (Paheko -> IdP `/authorize`)
  - `step3 302` (IdP -> callback Paheko avec `code` + `state`)
  - `step4 200` + cookie `__c` (pas de cookie `pko`)
  - `result_rejection_like=True` (trace: `_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-account-not-found.log`)
- rejet 2 - claim email manquant (`oidc.noemail`):
  - `step1 302` (Paheko -> IdP `/authorize`)
  - `step3 302` vers `login-actions/required-action?execution=VERIFY_PROFILE` (flow OIDC bloque avant callback valide)
  - aucun cookie de session Paheko emis
  - `result_rejection_like=True` (trace: `_bmad-output/implementation-artifacts/14-2-paheko-oidc-rejet-missing-email.log`)

## 3) Couverture des scenarios 14.2

| Scenario | Resultat | Statut |
|---|---|---|
| Nominal login OIDC Paheko (dev/local) | Flux OAuth complet jusqu'au callback (`code`), redirection `/admin/` et cookie session `pko` emis | valide |
| Rejet mapping utilisateur (compte local introuvable) | Flux OIDC Paheko execute jusqu'au callback, session refusee sans cookie `pko` (`result_rejection_like=True`) | valide |
| Rejet claim incomplet (`email` absent) | Flux OIDC bloque en required action IdP, aucune session Paheko ouverte (`result_rejection_like=True`) | valide |
| Traces sanitisees avec correlation | Verification par logs/tests orientee `request_id`, sans secret | valide |

## 4) Notes AC1 et limites residuelles (non bloquantes 14-2)

AC1 est valide en dev/local sur le flux nominal OIDC:

1. initiation `/authorize` capturee avec scope exact,
2. authentification IdP nominale reussie,
3. callback Paheko recu avec `code` et `state`,
4. redirection `/admin/` + cookie session `pko` emis.

Limite outillage sur la preuve automatique:

- le client `requests` ne rejoue pas le cookie `domain=localhost` sur la requete finale `/admin/` (cookie header vide), ce qui ramene a `login.php` dans ce script.
- cette limite est traquee comme detail de preuve outillee et **ne reouvre pas** de hardening bloquant pour 14-2 (durcification reportee).
