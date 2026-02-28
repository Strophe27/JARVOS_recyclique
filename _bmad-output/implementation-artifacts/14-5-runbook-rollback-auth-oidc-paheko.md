# 14-5 - Runbook rollback gradue auth OIDC + hotfix Paheko

Date: 2026-03-01  
Story: `14-5-runbooks-d-exploitation-onboarding-incident-auth-rollback`  
Principe: rollback progressif, mesurable, avec priorite securite fail-closed

## 1) Decision matrix - rollback immediat vs fix-forward

| Condition | Decision recommandee |
|---|---|
| Incident securite (deny non strict, contournement claims) | Rollback immediat |
| IdP indisponible prolonge > 15 min sans mitigation | Rollback runtime/config |
| Bug localise sans impact securite, correctif < 30 min | Fix-forward encadre |
| Regressions multiples OIDC cross-plateforme | Rollback gradue puis analyse |
| Echec uniquement sur hotfix local Paheko | Rollback patch local prioritaire |

Regle: en cas de doute sur securite, preferer rollback.

## 2) Niveaux de rollback gradues

## Niveau 1 - Rollback config/env

Preconditions:
- derive isolee a config OIDC/env.
- image/release inchangee.

Risques:
- interruption login temporaire.

Actions:
1. Restaurer variables connues stables (issuer, audience, redirect URI, secret reference).
2. Redemarrer service impacte.
3. Rejouer checks nominals + deny.

Validation:
- `/health` et `/v1/admin/health` -> 200
- nominals + continuity PASS
- deny PASS

## Niveau 2 - Rollback runtime (container recreate)

Preconditions:
- config corrigee mais comportement runtime incoherent.

Risques:
- interruption courte des sessions.

Actions:

```bash
docker compose up -d --force-recreate recyclic
docker compose up -d --force-recreate paheko
docker compose ps
```

Validation:
- services `Up`
- checks auth replayes et PASS.

## Niveau 3 - Rollback patch local Paheko (14.4)

Preconditions:
- anomalie liee a `paheko-config/Session.php` ou fallback email.

Risques:
- retour du symptome "email non fourni" si patch retire sans alternative.

Actions:
1. Verifier les references deterministes avant copie:
   - **Reference de version**: campagne `14-4-final-20260301` (artefacts 14.4 de baseline).
   - **Version patch local**: `paheko-config/Session.php`
     - SHA256 attendu: `d0b13e9703584ab74e610139e290c5b4c175f6c2c25e81c84debf3f490933b0a`
   - **Version propre de reference (source 14.4)**: `_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php`
     - SHA256 attendu: `210a7d0246f2ebb55ccba768f0b6f95a032a9a958dc088832568b9c1948bdcd6`
2. Identifier version active de `Session.php` dans conteneur.
3. Choisir:
   - maintenir patch local temporaire (si necessaire a la continite),
   - ou revenir au fichier source propre.
4. Copier fichier choisi dans conteneur Paheko.
5. Recreate conteneur Paheko.

Exemple:

```bash
Get-FileHash "paheko-config/Session.php" -Algorithm SHA256
Get-FileHash "_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php" -Algorithm SHA256
docker compose cp "paheko-config/Session.php" paheko:/var/www/paheko/include/lib/Paheko/Users/Session.php
docker compose up -d --force-recreate paheko
docker compose exec paheko php -l /var/www/paheko/include/lib/Paheko/Users/Session.php
```

Validation:
- nominal Paheko PASS (page protegee, cookie `pko`, pas retour login).
- continuite cross-plateforme PASS.
- deny RecyClique inchanges et PASS.

## Niveau 4 - Rollback release

Preconditions:
- echec des niveaux 1..3 ou regression transversale.

Risques:
- indisponibilite plus longue.

Actions:
1. Revenir a la release precedente stable (compose/image/config lock).
2. Rejouer checks de sante + auth.
3. Ouvrir postmortem obligatoire.

Validation:
- service restaure et stable.
- runbook onboarding revalide partiellement.

## 3) Hotfix local Paheko 14.4 - cadre operationnel explicite

## 3.1 Contexte et perimetre

- Fichier: `paheko-config/Session.php`
- Point de patch: `Session::loginOIDC()`
- But: fallback email (`profile->email` puis `PAHEKO_OIDC_FALLBACK_EMAIL`) pour lever un mismatch callback local.
- Perimetre: local/dev et usage temporaire d'exploitation.

## 3.2 Limites et risques

- Ce patch n'est pas une solution produit long terme.
- Risque de derive si maintenu sans date de sortie.
- Ne doit jamais assouplir les controles fail-closed RecyClique.

## 3.3 Procedure d'application

1. Confirmer besoin via triage incident.
2. Copier patch versionne dans le conteneur.
3. Recreate Paheko.
4. Rejouer nominal Paheko + continuity + deny.

## 3.4 Procedure de retrait

1. Restaurer **uniquement** la reference propre deterministe:
   - source: `_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php`
   - SHA256: `210a7d0246f2ebb55ccba768f0b6f95a032a9a958dc088832568b9c1948bdcd6`
2. Recreate Paheko.
3. Rejouer les memes checks.
4. Documenter verdict (maintien temporaire ou retrait confirme).

Commande de retrait (deterministe):

```bash
Get-FileHash "_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php" -Algorithm SHA256
docker compose cp "_bmad-output/implementation-artifacts/14-4-paheko-session-oidc-source.php" paheko:/var/www/paheko/include/lib/Paheko/Users/Session.php
docker compose up -d --force-recreate paheko
docker compose exec paheko php -l /var/www/paheko/include/lib/Paheko/Users/Session.php
```

## 3.5 Decision "maintien temporaire" vs "retour version propre"

Maintien temporaire autorise seulement si:
- sans patch, service KO,
- action de sortie planifiee (ticket + date + owner),
- validation securite explicite.

Retour version propre obligatoire si:
- cause racine corrigee,
- tests nominals/cross-plateforme passent sans fallback local.

## 4) Criteres de retour a la normale (communs tous niveaux)

- checks health PASS.
- nominal RecyClique PASS.
- nominal Paheko PASS.
- continuity PASS.
- deny fail-closed PASS.
- journal incident/rollback complete et sanitise.
