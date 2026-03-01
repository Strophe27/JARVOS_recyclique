# Matrice rollback Epic 12-14 (retro-ingenierie)

Date: 2026-03-01  
Source analysee: commits `9796c37` (epic 12-14) + `15fd8a4` (final 14.5)

## Synthese

- Commit `9796c37`: **324 fichiers**
  - `_bmad-output`: 204
  - `frontend`: 61
  - `api`: 32
  - `paheko-config`: 21
  - `.cursor`: 3
  - `.env.example`: 1
  - `doc`: 1
  - `docker-compose.yml`: 1
- Commit `15fd8a4`: 10 fichiers (runbooks/etat sprint Epic 14.5)

Objectif de rollback: revenir a une v1 simple sans IdP externe obligatoire, sans patch coeur Paheko, tout en preservant les gains metier/visuels utiles.

## Regles de classement

- **ROLLBACK**: derive OIDC/IdP, patch runtime Paheko, orchestration operationnelle OIDC.
- **REVIEW**: fichiers potentiellement mixtes (utile + OIDC) a corriger finement.
- **KEEP**: contenu non lie a la derive IAM/OIDC (parite visuelle, stories non IAM, base metier stable).

---

## ROLLBACK (cible prioritaire)

### 1) Infra IdP / couplage fort OIDC

- `docker-compose.yml` (service `keycloak` a retirer/neutraliser)
- `.env.example` (variables OIDC a rendre optionnelles ou sortir du parcours standard)
- `doc/deployment.md` (retirer les procedures qui imposent OIDC en run nominal)

### 2) Patch local du coeur Paheko (a stopper)

- `paheko-config/Session.php`
- `paheko-config/config.local.php`
- `paheko-config/seed_paheko_member.php`
- `paheko-config/check_paheko_oidc_constants.php`
- `paheko-config/check_paheko_oidc_nominal.py`
- `paheko-config/check_paheko_local_login.py`
- `paheko-config/check_recyclique_oidc_runtime.py`
- `paheko-config/check_cross_platform_session_continuity.py`
- `paheko-config/debug_keycloak_forms.py`
- `paheko-config/debug_keycloak_userinfo_for_paheko.py`
- `paheko-config/debug_paheko_getfromlogin.php`
- `paheko-config/debug_paheko_member_row.php`
- `paheko-config/debug_paheko_oidc_callback_page.py`
- `paheko-config/keycloak-client-paheko-web-dev.json`
- `paheko-config/keycloak-client-recyclique-bff-dev.json`
- `paheko-config/keycloak-mapper-paheko-email.json`
- `paheko-config/keycloak-mapper-role-hardcoded.json`
- `paheko-config/keycloak-mapper-role.json`
- `paheko-config/keycloak-mapper-tenant-hardcoded.json`
- `paheko-config/keycloak-mapper-tenant.json`
- `paheko-config/keycloak-user-oidc-recyclique.json`

### 3) Surface API purement IAM/OIDC transverse

- `api/routers/v1/admin/paheko_iam.py`
- `api/schemas/paheko_iam.py`
- `api/services/paheko_iam_plugin.py`
- `api/tests/routers/test_admin_paheko_iam.py`

### 4) Artefacts Story 14 operationnels (a archiver / marquer no-go)

- `_bmad-output/implementation-artifacts/14-0-*`
- `_bmad-output/implementation-artifacts/14-1-*`
- `_bmad-output/implementation-artifacts/14-2-*`
- `_bmad-output/implementation-artifacts/14-3-*`
- `_bmad-output/implementation-artifacts/14-4-*`
- `_bmad-output/implementation-artifacts/14-5-*`

> Decision: conserver ces artefacts comme historique, mais les marquer explicitement "annules par 14.6" dans le pilotage.

---

## REVIEW (tri fin necessaire)

Ces fichiers ont probablement un mix "utile metier" + "couche OIDC":

- `api/config/settings.py`
- `api/core/deps.py`
- `api/routers/v1/auth.py`
- `api/services/auth.py`
- `api/services/health_checks.py`
- `api/routers/admin/health.py`
- `api/routers/v1/admin/health.py`
- `api/schemas/auth.py`
- `api/tests/routers/test_auth.py`
- `api/tests/routers/test_admin_health_audit.py`
- `frontend/src/api/auth.ts`
- `frontend/src/auth/AuthContext.tsx`
- `frontend/src/auth/LoginPage.tsx`
- `frontend/src/App.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/next-action.json`

Regle REVIEW: enlever strictement le flux OIDC transverse, garder JWT/PIN et les parcours metier v1.

---

## KEEP (a priori)

### 1) Parite visuelle / Epic 11-13 (hors IAM transverse)

- `_bmad-output/implementation-artifacts/11-*`
- `_bmad-output/implementation-artifacts/13-*`
- `_bmad-output/implementation-artifacts/screenshots/11-0/**`
- `_bmad-output/implementation-artifacts/screenshots/13-2-1/**`
- `_bmad-output/implementation-artifacts/screenshots/13-2-3/**`
- `frontend/src/shared/layout/**`
- `frontend/src/shared/theme/**`

### 2) Base metier potentiellement utile (a conserver sauf preuve contraire)

- `api/services/paheko_client.py`
- `api/services/member_sync.py`
- `api/routers/v1/admin/member_sync.py`
- `api/workers/member_sync_worker.py`
- `api/models/member_sync.py`
- `api/tests/services/test_member_sync.py`
- `api/tests/services/test_paheko_client.py`

> Point important: ces fichiers servent la transparence RecyClique <-> Paheko cote donnees/metier, independamment d'un IdP externe.

---

## Plan d'execution recommande (ordre)

1. **Neutraliser la stack**: retirer `keycloak` de `docker-compose.yml` (sans toucher au reste).
2. **Bloquer les patchs Paheko**: geler `paheko-config/*` en historique (aucune copie runtime).
3. **Nettoyer API auth**: traiter la liste REVIEW backend.
4. **Nettoyer frontend auth**: traiter la liste REVIEW frontend.
5. **Revalider**: auth JWT/PIN + flux metier critiques + stack 4 services.
6. **Mettre a jour pilotage**: marquer Epic 14 annule par Story 14.6 (decision produit).

## Decision produit cible (a formaliser)

"Pour la v1, pas d'identite unifiee OIDC transverse.  
RecyClique gere l'auth terrain. Paheko reste source de verite adherents/adhesions/activites et outil admin/compta ponctuel."

