# Matrice — step-up et revalidation après changement de contexte sensible (Story 25.14)

**Date :** 2026-04-20  
**Références obligatoires :** **ADR 25-2** — `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` ; **spec 25.4 §3.2** — `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` ; **PRD §11.2** — `_bmad-output/planning-artifacts/prd.md` ; **Story 25-8** (ordre stale avant mutation) ; checklist **25.7** — `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md` (`CTX-SWITCH-3-2-*`).

**Périmètre :** régime **en ligne** (backend disponible). **Hors scope explicite :** tolérance PIN kiosque offline, flux device token complets (stories 13.8 / 25.15 / readiness PWA).

---

## Matrice scénarios × preuve (lignes « preuve » — citation ADR 25-2)

| Scénario de changement / mutation | Régime | Preuve requise | Réf. ADR 25-2 (preuve) | Combinaisons interdites / anti-patterns | Ancre checklist 25.7 |
|-----------------------------------|--------|------------------|-------------------------|----------------------------------------|----------------------|
| Bascule **site** ou **session caisse** côté serveur ; client envoie des en-têtes `X-Recyclique-Context-*` **désalignés** | En ligne | Aucune mutation : **409** `CONTEXT_STALE` — rafraîchir l’enveloppe avant réessai | ADR 25-2 (séparation normative PIN opérateur / kiosque / secret poste ; pas d’action sensible sur contexte non réconcilié) | Accepter une mutation sensible alors que le client annonce encore l’ancien site/session | `CTX-SWITCH-3-2-REVALIDATION-DEFAULT-DENY` |
| Après **enveloppe alignée** (en-têtes = vérité serveur), mutation sensible cashflow (ex. remboursement exceptionnel, clôture, correction vente super-admin) | En ligne | **PIN opérateur serveur** via `X-Step-Up-Pin` (PRD §11.2) | ADR 25-2 §1 / §3 — preuve opérateur en ligne ; pas de substitution par PIN kiosque **local** pour une action §11.2 serveur | Utiliser uniquement un jeton « poste » ou un PIN kiosque **à la place** du step-up opérateur serveur pour l’action §11.2 en ligne | `CTX-SWITCH-3-2-OPERATOR-PIN-CANON-PRD-11-2`, `CTX-SWITCH-3-2-KIOSQUE-POSTE-STEPUP-ADR-25-2` |
| Mutation sensible **sans** `X-Step-Up-Pin` (même si contexte aligné) | En ligne | **403** `STEP_UP_PIN_REQUIRED` — refus par défaut jusqu’à preuve | ADR 25-2 — lockout / step-up serveur ; default deny | Continuer la mutation sans preuve au prétexte que le contexte est frais | `CTX-SWITCH-3-2-REVALIDATION-DEFAULT-DENY` |
| Ordre sur route instrumentée | En ligne | D’abord `enforce_optional_client_context_binding*` (**25.8**), puis `verify_step_up_pin_header` | ADR 25-2 (cohérence avec refus explicite avant confiance) | Vérifier le PIN **avant** le contrôle stale → masquerait le **409** attendu | Story **25-8** + module `step_up.py` (doc Story 25.14) |

---

## Corrélation logs 25.13 (opérateur vs ancrage poste)

Sur succès ou refus de step-up, les logs applicatifs `recyclic_api.core.step_up` portent `operator_user_id` et `proof_expected` / `proof=server_operator_pin` pour alignement avec la politique de champs **25.13** (distinct de `cash_register_id` sur les chemins vente déjà instrumentés). Le chemin **remboursement exceptionnel** réutilise le même opérateur JWT que les journaux cashflow adjacents.

---

## Suivi — risque deux onglets / requêtes en vol

| Risque | Propriétaire | Critère de clôture |
|--------|----------------|---------------------|
| Deux onglets : enveloppe rafraîchie dans l’onglet A pendant qu’un onglet B envoie encore d’anciens en-têtes — **409** attendu ; pas de contournement step-up | **Epic 25 / équipe caisse** | Scénarios séquentiels couverts par pytest **25.8** + **25.14** (stale avant PIN ; PIN requis après alignement) ; E2E navigateur optionnel hors gate story |

---

## Routes backend (ordre garde 25.8 → step-up)

Référence code : `recyclic_api.core.step_up`, `enforce_optional_client_context_binding_from_claim`.

- `PATCH /v1/sales/{id}/corrections` (super-admin, step-up obligatoire)
- `POST /v1/cash-sessions/{id}/close`
- `POST /v1/cash-sessions/{id}/exceptional-refunds`
- `POST /v1/cash-sessions/{id}/disbursements` (sous-types N3)
- `POST /v1/cash-sessions/{id}/internal-transfers` (si `internal_transfer_requires_step_up`)
- Exports / DB / comptable expert : step-up selon stories existantes (hors matrice cashflow détaillée ci-dessus)

**Coordination contrat 25.11 :** aucun nouvel en-tête dans cette story ; pas de changement OpenAPI obligatoire.
