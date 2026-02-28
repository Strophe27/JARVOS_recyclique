# 14-4 - Matrice pass/fail campagne E2E auth cross-plateforme

Date: 2026-03-01  
Story: `14-4-e2e-auth-cross-plateforme-et-non-regression-fail-closed`  
Campagne finale isolee: `14-4-final-20260301`

## Matrice scenarios

| Scenario | Statut | Evidence path | Commentaire |
|---|---|---|---|
| `nominal_recyclique_oidc` | PASS | `_bmad-output/implementation-artifacts/14-4-e2e-auth-nominal-recyclique.log` | Callback OIDC `302` vers `/admin`, cookie `recyclique_session` present, `/v1/auth/session` -> `authenticated=true` avec email attendu. |
| `nominal_paheko_oidc` | PASS | `_bmad-output/implementation-artifacts/14-4-e2e-auth-nominal-paheko.log` | Callback OIDC + cookie `pko`, puis controle final page protegee: `step5_url_is_login=False`, `step5_login_form_present=False`, `step5_protected_page_ok=True`. |
| `continuite_session_cross_plateforme_meme_user` | PASS | `_bmad-output/implementation-artifacts/14-4-e2e-auth-continuite-session.log` | Meme user confirme cote RecyClique, pas de re-auth IdP cote Paheko, puis controle post-redirect page protegee (`paheko_step4_protected_page_ok=True`, pas de retour `login.php`). |
| `deny_idp_indisponible` | PASS | `_bmad-output/implementation-artifacts/14-4-e2e-auth-fail-closed-pytest.log` | Test cible passe: refus fail-closed attendu (`503`) verifie. |
| `deny_invalid_iss` | PASS | `_bmad-output/implementation-artifacts/14-4-e2e-auth-fail-closed-pytest.log` | Test cible passe: rejet explicite mismatch `iss` verifie. |
| `deny_invalid_aud` | PASS | `_bmad-output/implementation-artifacts/14-4-e2e-auth-fail-closed-pytest.log` | Test cible passe: rejet explicite mismatch `aud` verifie. |

## Correctif applique

- Hotfix local Paheko sur `Session::loginOIDC()`:
  - fallback email sur `profile->email` quand `email` top-level est vide;
  - fallback local optionnel via env `PAHEKO_OIDC_FALLBACK_EMAIL`.
- Patch reproductible versionne dans `paheko-config/Session.php`, puis deploie dans le conteneur Paheko.
- Verification claims Keycloak conservee en preuve:
  - `_bmad-output/implementation-artifacts/14-4-keycloak-userinfo-paheko-debug.log`

## Verdict campagne

- Verdict global: **OK / pret pour review**.
- Tous les scenarios obligatoires 14-4 sont en PASS.
- Coherence audit/request_id campagne finale: voir `_bmad-output/implementation-artifacts/14-4-e2e-auth-audit-extract.log` (aucune trace fail-closed sur les request IDs nominaux/continuite de la campagne isolee).
