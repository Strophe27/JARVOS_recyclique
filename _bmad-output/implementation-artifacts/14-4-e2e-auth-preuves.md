# 14-4 - Preuves campagne E2E auth cross-plateforme

Date: 2026-03-01  
Story: `14-4-e2e-auth-cross-plateforme-et-non-regression-fail-closed`  
Campagne finale isolee: `14-4-final-20260301`

## 1) Preuves de preconfiguration technique appliquee

- Correction `config.local.php` Paheko (namespace + constantes OIDC + garde-fous cookie local):
  - source: `paheko-config/config.local.php`
  - verification locale login form: `_bmad-output/implementation-artifacts/14-4-paheko-login-local-check.log`
- Provisioning IdP Keycloak user de test:
  - user: `oidc-test`
  - email: `oidc.test@local.dev`
  - password: `***` (non temporaire)
  - enabled/email verified: `true`
- Provisioning client Keycloak Paheko:
  - client: `paheko-web-dev`
  - secret aligne: `***`

## 2) Scenarios nominaux

### 2.1 `nominal_recyclique_oidc` (PASS)

- Evidence: `_bmad-output/implementation-artifacts/14-4-e2e-auth-nominal-recyclique.log`
- Extraits:
  - `callback_status 302`
  - `callback_location /admin`
  - `callback_has_bff_cookie True`
  - `session_status 200`
  - `session_body {"authenticated": true, ... "email": "oidc.test@local.dev"}`

### 2.2 `nominal_paheko_oidc` (PASS, criteres durcis)

- Evidence: `_bmad-output/implementation-artifacts/14-4-e2e-auth-nominal-paheko.log`
- Extraits:
  - callback OAuth recu cote Paheko (`code`, `state`) puis redirection `/admin/`.
  - `step4_set_cookie pko=...` et `cookies [...] 'pko'`.
  - verification post-redirect sur page protegee:
    - `step5 200 http://localhost:8080/admin/`
    - `step5_url_is_login False`
    - `step5_login_form_present False`
    - `step5_has_pko_cookie True`
    - `step5_protected_page_ok True`
  - `result_nominal_like_success True`

## 3) Continuite de session cross-plateforme

### `continuite_session_cross_plateforme_meme_user` (PASS, criteres durcis)

- Evidence: `_bmad-output/implementation-artifacts/14-4-e2e-auth-continuite-session.log`
- Extraits:
  - RecyClique nominal OK:
    - `recyclique_callback_status 302`
    - `recyclique_bff_cookie_present True`
    - `recyclique_session_status 200`
    - `recyclique_user_email oidc.test@local.dev`
  - Paheko derriere meme session IdP:
    - `paheko_step2_status 302` et `paheko_reauth_form_present False` (pas de re-auth IdP)
    - `paheko_step3_status 302`
    - `paheko_step3_set_cookie pko=...`
    - verification finale page protegee:
      - `paheko_step4_status 200`
      - `paheko_step4_url http://localhost:8080/admin/`
      - `paheko_step4_url_is_login False`
      - `paheko_step4_login_form_present False`
      - `paheko_step4_has_pko_cookie True`
      - `paheko_step4_protected_page_ok True`
    - `continuity_result pass`

## 4) Scenarios fail-closed deny

- Evidence: `_bmad-output/implementation-artifacts/14-4-e2e-auth-fail-closed-pytest.log`
- Execution:
  - `test_sso_callback_returns_503_when_idp_dependency_unavailable` -> PASS
  - `test_sso_callback_rejects_claims_mismatch[invalid_iss]` -> PASS
  - `test_sso_callback_rejects_claims_mismatch[invalid_aud]` -> PASS

## 5) Coherence request_id / audit (campagne finale isolee)

- Evidence: `_bmad-output/implementation-artifacts/14-4-e2e-auth-audit-extract.log`
- `campaign_id: 14-4-final-20260301`
- `campaign_request_ids` dedies aux scenarios PASS:
  - `req-14-4-final-20260301-nominal-recyclique`
  - `req-14-4-final-20260301-continuite-session`
- Verification de non-ambiguite:
  - `all_audit_events_for_campaign_request_ids` -> `(0 rows)`
  - `fail_closed_events_for_campaign_request_ids_must_be_empty` -> `(0 rows)`
- Conclusion: aucune trace `FAIL_CLOSED_TRIGGERED` n'est associee aux scenarios nominaux/continuite de la campagne finale.

## 6) Correctif applique cote Paheko (local)

- Patch local direct sur `Session::loginOIDC()`:
  - fichier patche: `paheko-config/Session.php`
  - deploiement runtime: copie dans `/var/www/paheko/include/lib/Paheko/Users/Session.php`
- Perimetre du patch:
  - fallback email sur `profile->email` si `email` top-level absent;
  - fallback local optionnel via `PAHEKO_OIDC_FALLBACK_EMAIL` (dev/local).
- Hors perimetre (verifie):
  - aucun assouplissement des regles fail-closed (`invalid_iss`, `invalid_aud`, `idp_unavailable`) cote RecyClique.
- Reproductibilite:
  1. `docker compose up -d --force-recreate paheko`
  2. copier `paheko-config/Session.php` et `paheko-config/config.local.php` dans le conteneur
  3. rejouer `check_paheko_oidc_nominal.py` puis `check_cross_platform_session_continuity.py`
- Traces de verification claims Keycloak:
  - `_bmad-output/implementation-artifacts/14-4-keycloak-userinfo-paheko-debug.log`
  - email present dans `id_token` + `userinfo`.

## 7) Verdict

- Campagne 14-4: **PASS** (scenarios nominaux + continuite + deny fail-closed valides).
