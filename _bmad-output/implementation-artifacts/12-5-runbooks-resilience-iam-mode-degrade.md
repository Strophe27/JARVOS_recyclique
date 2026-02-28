# Runbooks Story 12.5 — Resilience IAM et mode degrade

Date: 2026-02-28
Scope: incidents IdP, incidents Paheko, desynchronisation IAM, verification post-retablissement.

## 1) Runbook — Panne IdP

### Symptomes
- `GET /v1/auth/sso/callback` retourne `503` avec message explicite non verbeux.
- Health admin montre `dependencies.idp.status=degraded`.
- Audit contient `FAIL_CLOSED_TRIGGERED` avec `dependency=idp`, `decision=degraded`.

### Diagnostic
- Verifier le endpoint admin health: `GET /v1/admin/health`.
- Verifier les champs `dependencies.idp.last_reason`, `last_incident_at`, `last_request_id`.
- Verifier la disponibilite IdP (issuer, token endpoint, JWKS) depuis l'infrastructure.

### Mitigation immediate
- Appliquer fail-closed (deja applique automatiquement): aucun bypass manuel.
- Communiquer indisponibilite SSO aux operateurs (pas de contournement local).
- Ouvrir incident d'exploitation avec `request_id` de reference.

### Reprise
- Retablir la disponibilite IdP.
- Lancer un parcours SSO nominal.
- Confirmer transition `degraded -> ok` sur `dependencies.idp.status`.

### Verification
- `GET /v1/admin/health` retourne `iam_mode=ok`.
- Audit et logs structures montrent des decisions `allow` apres reprise.
- Aucun secret/token present dans les logs d'incident.

## 2) Runbook — Panne Paheko

### Symptomes
- Routes sensibles Paheko (ex: `/v1/admin/paheko-*`) retournent `503`.
- Health admin montre `dependencies.paheko.status=degraded`.
- Audit contient `FAIL_CLOSED_TRIGGERED` avec `dependency=paheko`, `decision=degraded`.

### Diagnostic
- Verifier `GET /v1/admin/health` puis `dependencies.paheko.last_reason`.
- Verifier le statut de sync membres (`/v1/admin/paheko/members/sync/status`).
- Verifier connectivite reseau et disponibilite API Paheko.

### Politique mode degrade (autorise / bloque)
- Autorise: parcours non critiques non Paheko (lecture locale, admin hors Paheko, session existante valide).
- Bloque: operations sensibles Paheko et administration d'acces Paheko.
- Regle: deny-by-default sur surface Paheko sensible tant que statut degrade.

### Reprise
- Retablir API Paheko et/ou connectivite.
- Relancer une sync membres manuelle.
- Confirmer retour `dependencies.paheko.status=ok`.

### Verification
- Acces Paheko sensible redevient operationnel selon RBAC.
- Audit trace les transitions et decisions avec `request_id`.
- Aucun token/secret dans logs ou evenements.

## 3) Runbook — Desynchronisation IAM

### Symptomes
- Incoherences role/tenant detectees dans les evenements IAM.
- Refus `403` sur routes sensibles (decision IAM explicite deny).
- Augmentation des refus fail-closed sans indisponibilite technique.

### Diagnostic
- Inspecter audit pour `ROLE_INCONSISTENCY_DETECTED`, `TENANT_INCONSISTENCY_DETECTED`, `FAIL_CLOSED_TRIGGERED`.
- Correlier par `request_id` et horodatage ISO 8601.
- Verifier contrat IAM attendu (claims `role`, `tenant`, statut membre).

### Mitigation
- Suspendre les actions sensibles des utilisateurs incoherents.
- Corriger la source IAM (IdP ou sync membres) avant reouverture.
- Ne jamais forcer un bypass local.

### Retour a coherence
- Corriger role/tenant dans la source autoritative.
- Relancer la synchronisation membres.
- Verifier refus/allow conformes a la matrice IAM 12.1.

### Cloture incident
- Archiver `request_id` pivot, cause racine, action corrective.
- Confirmer absence d'evenements d'incoherence residuels.

## 4) Verification post-retablissement (checklist)

- [ ] Health admin: `status=ok` et `iam_mode=ok`.
- [ ] `dependencies.idp.status=ok` et `dependencies.paheko.status=ok`.
- [ ] Les routes sensibles repondent avec contrat attendu (`401`/`403`/`503`) selon contexte.
- [ ] Aucun secret/token dans logs structures ou details audit.
- [ ] Alertes retombees sous seuil.

## 5) Alerting minimal exploitable (seuils)

- Seuil critique IdP: `3` echecs consecutifs => alerte `idp_degraded`.
- Seuil critique Paheko: `3` echecs consecutifs => alerte `paheko_degraded`.
- Les seuils sont exposes via `dependencies.<dep>.alert_triggered` et `alert_threshold`.
