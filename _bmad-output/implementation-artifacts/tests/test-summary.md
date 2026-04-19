# Synthèse tests automatisés (bmad-qa-generate-e2e-tests)

---

## Story 25.2 — ADR PIN kiosque (documentaire, 2026-04-19)

- **Synthèse QA :** [`test-summary-story-25-2-doc-qa.md`](test-summary-story-25-2-doc-qa.md) — **PASS** ; pas de tests API/E2E (NA) ; conformité statique ADR ↔ `epics.md` §25.2.
- **ADR :** `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`

---

## Tests générés / étendus

### E2E (Vitest + Testing Library)

- [x] `peintre-nano/tests/e2e/cashflow-refund-24-4-prior-year-expert.e2e.test.tsx` — Story 24.4 : hub carte expert N-1, visibilité proactive GET `prior_closed`, permission `accounting.prior_year_refund`, happy path POST `expert_prior_year_refund`.

### Tests unitaires (déjà livrés DS)

- `peintre-nano/tests/unit/cashflow-refund-24-4-prior-year-ux.test.tsx` — wizard isolé (non relancé dans cette passe si inchangé).

## Commande de validation

```bash
cd peintre-nano
node ./node_modules/vitest/vitest.mjs run tests/e2e/cashflow-refund-24-4-prior-year-expert.e2e.test.tsx
```

## Couverture visée (AC story)

- Visibilité parcours expert N-1 avant validation finale (hub + encart wizard).
- Permission : blocage bouton sans droit ; libellé `accounting.prior_year_refund` sur la carte hub.
- Happy path : confirmation case + POST avec flag expert.

## Prochaines étapes

- Intégrer le fichier dans la CI avec les autres e2e caisse si besoin.

---

## Story 24.10 P3 (session BMAD QA e2e, 2026-04-19)

### E2E (Vitest + Testing Library)

- [x] `peintre-nano/tests/e2e/cashflow-special-ops-hub-24-10-p3.e2e.test.tsx` — hub : copy P3 (`operations_specials_p3`, `approval_evidence_ref`, mention journal d'audit / opérations sensibles) ; navigation vers `/caisse/remboursement-exceptionnel` + wizard ; garde permission sans `refund.exceptional`.

### API (pytest, couverture règles P3 / seuil / preuve)

- [x] `recyclique/api/tests/test_story_24_10_operations_specials_p3.py` — manque preuve 422, happy path avec preuve, rejet seuil 150€ + `ERREUR_SAISIE`, P2 sans flag, validation unitaire service.

### Hors périmètre e2e (justification)

- **`GET /v1/admin/audit-log?cash_sensitive_operations=true`** : le widget `AdminAuditLogWidget` n’expose pas le filtre `cash_sensitive_operations` dans l’UI (requête sans ce paramètre) — la preuve filtre sensible reste côté API / tests backend si ajoutés.
- **Champs corps P3 (`approval_evidence_ref`) sur le wizard** : le formulaire `CashflowExceptionalRefundWizard` n’envoie pas encore ce champ ; les règles métier P3 sont couvertes par les tests pytest sur `POST .../exceptional-refunds`.

### Commande de validation

```bash
cd peintre-nano
node ./node_modules/vitest/vitest.mjs run tests/e2e/cashflow-special-ops-hub-24-10-p3.e2e.test.tsx
```

```bash
cd recyclique/api
python -m pytest tests/test_story_24_10_operations_specials_p3.py -q
```
