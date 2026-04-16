# Story 22.3 : Livrer le parametrage expert des moyens de paiement et des comptes globaux

Status: done

<!-- Story key : `22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux` | Epic : epic-22 | CS bmad-create-story 2026-04-15 : alignement PRD + chaine canonique + sprint ready-for-dev -->

**Story key :** `22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux`  
**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique

## Story

As a super-admin governance team,  
I want expert accounting settings for payment methods and global accounts,  
So that the accounting model is configurable without hiding sensitive decisions inside generic admin screens.

## Acceptance Criteria

1. **Perimetre expert distinct** - Etant donne que la config admin simple et le parametrage comptable sensible ne sont pas le meme sujet, quand la story est livree, alors les parametres experts comptables sont separes de la config admin simple (Epic 9.6 / toggles generiques) et le fichier story ou les notes de livraison listent explicitement ce qui reste cote « admin simple » vs « gouvernance comptable expert ».

2. **Surfaces sensibles explicites** - Les contrats API concernes, les validations serveur, les regles de step-up, les attentes d'audit et les roles requis pour le parametrage des moyens de paiement et des comptes globaux sont nommes, reviewables dans OpenAPI, et alignes sur les principes deja poses pour le super-admin sensible (reutilisation du rail **16.3** : `verify_step_up_pin_header` / operations dans `step_up.py`, audit structuré ou equivalent trace).

3. **Referentiel complet** - Le projet permet de parametrer les moyens de paiement administrables et les comptes globaux lies au modele cible (PRD : au minimum champs type `paheko_debit_account`, `paheko_refund_credit_account` par moyen ; comptes globaux `default_sales_account`, `default_donation_account`, `prior_year_refund_account`, etc.), avec les actions minimales non negociables : creation, modification, activation, desactivation, ordre, contraintes de validite (comptes `Paheko` valides avant activation, desactivation conditionnelle si moyen utilise dans une session ouverte selon PRD).

4. **Versioning comptable obligatoire** - Toute publication d'un parametrage comptable exploitable par la cloture produit un **identifiant ou une revision de configuration** stable, auditee et referencable ulterieurement par le snapshot de session (**22.6**) ; la relecture de la config « courante » mutable au moment de l'export ou de la cloture est interdite comme substitut. La story tranche et documente le comportement si le parametrage change pendant une session ouverte : **une** des options suivantes est retenue et implementee de bout en bout (backend + contrat) — la session continue sur la revision figee a l'ouverture ; ou la cloture force un rechargement / blocage ; ou autre mecanisme explicite nomme. L'absence de decision est interdite.

5. **Pas de derive UI sans autorite** - Aucun portage UI (Peintre) ne masque un trou d'autorite backend, de permission, de step-up ou d'audit : chaque action sensible a un chemin serveur verifiable et teste.

6. **Alignement chaine canonique** - Etant donne que la chaine `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` place le referentiel des moyens de paiement en tete et que la **verite comptable locale** des encaissements est `payment_transactions` (PRD `2026-04-15`), quand cette story est livree, alors le parametrage expert alimente le referentiel et les regles sans reintroduire `sales.payment_method` comme source de verite comptable pour les ecrans ou exports cibles.

## Tasks / Subtasks

- [x] Cartographier et documenter le perimetre exact « expert » vs « config admin simple » (AC: 1) — référence croisée `epics.md` Epic 22.3 et PRD sections 5, 7.1, 10, 11, 13 *(voir § Livraison périmètres ci-dessous + notes Dev Agent Record)*.
- [x] Definir ou etendre les endpoints admin/API pour moyens de paiement et comptes globaux avec validations, permissions, step-up et audit (AC: 2, 3, 5) — reutiliser patterns **16.3** et code existant `step_up` / audit.
- [x] Specifier et implementer le modele de **revision comptable publiee** (creation, historique minimal, reference stable pour **22.6**) et le comportement session ouverte vs revision (AC: 4).
- [x] Mettre a jour `contracts/openapi/recyclique-api.yaml` et tests API associes (AC: 2, 3, 5).
- [x] Si UI Peintre : brancher uniquement sur les chemins autorises ; pas de logique comptable secrete cote client (AC: 5, 6).

### Périmètres livrés (AC1)

| Zone | Rôle | Où c’est porté |
|------|------|----------------|
| **Config admin simple** (Epic 9.6) | modules, réglages non comptables, toggles génériques | hors périmètre 22.3 ; reste sur les surfaces « settings » / modules prévus par Epic 9.x |
| **Gouvernance comptable expert** (22.3) | comptes globaux Paheko, référentiel moyens de paiement administrables, **révision publiée** stable | API `GET/PATCH /v1/admin/accounting-expert/global-accounts`, CRUD moyens, `POST …/revisions/publish`, lecture historique / dernière révision — **super-admin + step-up** sur mutations |

## Dev Notes

### Dependances epic

- **Prealable livre :** `22-1` (schema `payment_methods`, journal `payment_transactions`, invariants). Cette story rend le referentiel **gouvernable** par un expert avec revision publiable.
- **Consommateur :** `22-6` stockera la revision exacte ayant servi a la cloture dans le snapshot fige ; ne pas improviser le format au dernier moment dans 22.6.

### Verite donnees

- **Source de verite comptable locale des paiements :** `payment_transactions` (pas le champ legacy sur la vente pour le calcul cible).
- **Referentiel des moyens :** table / entite `payment_methods` ; chaque ligne de journal reference un moyen lorsque pertinent.

### Rail K avant rail U

Story d'abord d'**autorite** et de gouvernance super-admin. Tout ecran Peintre est secondaire et doit se brancher sur permissions, step-up et audit deja explicites cote API.

### Reutiliser 16.3 (step-up / audit)

- Fichier de reference : `_bmad-output/implementation-artifacts/16-3-encadrer-settings-et-les-surfaces-super-admin-par-step-up-et-audit-explicites.md`
- Cible : memes exigences contractuelles — `operationId` stables, `security`, descriptions, step-up sur mutations a risque, lignes d'audit ou `log_system_action` selon patterns existants.

### Separation produit

- **Epic 9.6** — config admin simple pour modules et reglages non comptables : ne pas y fusionner les comptes `Paheko` ou les mappings sensibles.
- **22.3** — parametrage expert reserve super-admin / expert avec tracabilite forte.

### Invariant revision (lien 22.6)

- Une revision publiee doit etre **identifiable** et **auditable**.
- Le snapshot **22.6** referencera cette revision ; pas de « derniere config lue » comme proxy.

### Guardrails

- Pas de comptes ou secrets « magiques » caches dans le front.
- Pas d'edition des reglages sensibles sans audit ni confirmation forte.
- Respect de la decomposition future outbox (pas d'absorption de la logique transport dans le parametrage).

### Zones code probables

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` (admin comptable / settings expert — a cadrer)
- `recyclique/api/src/recyclic_api/models/payment_method.py`, services associes
- `recyclique/api/src/recyclic_api/schemas/`
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/src/domains/admin-config/` (si surface UI dans le perimetre DS ; sinon expliciter « API only » dans les notes de livraison)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 22, Story 22.3]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` — ss. 5, 6, 7, 10, 11, 13 ; tables `payment_methods`, comptes globaux, regles SuperAdmin]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — referentiel moyens, journal `payment_transactions`, snapshot et revision]
- [Source: `_bmad-output/planning-artifacts/prd.md` — profils super-admin / expert, parametrage comptable sensible]
- [Source: `_bmad-output/implementation-artifacts/22-1-preparer-le-schema-comptable-cible-le-backfill-et-la-compatibilite-brownfield.md` — prerequis schema]
- [Source: `_bmad-output/implementation-artifacts/16-3-encadrer-settings-et-les-surfaces-super-admin-par-step-up-et-audit-explicites.md` — step-up / audit]

### Intelligence story precedente (22.1)

- Le schema et les migrations pour `payment_methods` / `payment_transactions` sont poses ; cette story ajoute la **couche gouvernance** (API, revision, UI eventuelle) sans casser les invariants 22.1.
- Le backfill et la double lecture **22.2** peuvent coexister : le parametrage expert doit rester coherent avec les IDs de moyens et les regles de validite deja definis.

## Dev Agent Record

### Agent Model Used

Story Runner — Tasks DS / QA / CR en **composer-2-fast** (2026-04-15–16) ; gates shell pytest ; Peintre vitest ciblé hub.

### Debug Log References

### Completion Notes List

- **Story Runner 2026-04-16** : chaîne **DS → GATE → QA → CR1** puis **DS (correctifs CR1) → GATE → QA → CR2** ; compteurs **vs_loop=0, qa_loop=0, cr_loop=1** ; **CR2 APPROVE** ; statut sprint **review → done**.
- **CR1 2026-04-16 — worker bmad-dev-story** : OpenAPI **422/429** sur routes accounting-expert ; **min_amount ≤ max_amount** ; **moyens archivés** → **409** sur mutations / `set_active` ; **`publish_revision`** retry **IntegrityError** puis **409** ; **`_revision_snapshot_dict`** JSON invalide → **422** ; tests pytest ajoutés. Gates pytest caisse/outbox inchangés verts.
- Fichier story aligne PRD + architecture canonique + dependances 22.1 / 22.6 ; statut sprint **backlog → ready-for-dev** ; epic-22 **in-progress** (inchangé).
- Point cle implementation : **revision comptable publiee** tracee et consommable par le snapshot 22.6, avec decision session ouverte figee dans les AC.

### DS Story 22.3 (implémentation)

- **Décision session ouverte (AC4 / freeze epic-22)** : à l’ouverture d’une session caisse, la session enregistre `accounting_config_revision_id` = dernière révision publiée au moment de l’ouverture (pas de relecture « config courante » mutable à la clôture).
- **Rail K** : API super-admin + `X-Step-Up-Pin` (`SENSITIVE_OPERATION_ACCOUNTING_EXPERT`) sur toutes les mutations comptables ; audit `log_system_action` (`accounting_global_settings_updated`, `accounting_payment_method_changed`, `accounting_config_published`).
- **Chaîne canonique** : vérité locale encaissements = `payment_transactions` ; paramétrage expert alimente le référentiel `payment_methods` sans utiliser `sales.payment_method` comme source de vérité comptable cible.
- **Tests** : `recyclique/api/tests/test_story_22_3_expert_accounting.py` (pytest OK localement pour ce fichier).
- **DS 2026-04-15 (finalisation contrat + Peintre)** : OpenAPI complété avec les chemins `payment-methods` (liste, création, patch, activation), `revisions` (liste paginée) et `revisions/{revision_id}` ; schémas `AccountingExpertPaymentMethod*`, `AccountingExpertRevisionSummary`. Nettoyage import `accounting_expert_service.py`. Vitest : mock `getAccountingExpertLatestRevision` pour éviter `fetch` bloquant ; `data-testid` sur l’alerte expert du hub.
- **DS Task (re-vérification AC, 2026-04-15)** : `pytest tests/test_story_22_3_expert_accounting.py` vert ; `vitest` `admin-accounting-hub-widget.test.tsx` vert. `test_openapi_validation` : 1 échec sur health `503` (environnement / dépendance hors périmètre 22.3), le reste du fichier passe.

### File List

- `recyclique/api/src/recyclic_api/models/accounting_config.py` (nouveau)
- `recyclique/api/migrations/versions/s22_3_expert_accounting_governance.py` (nouveau)
- `recyclique/api/src/recyclic_api/services/accounting_expert_service.py` (nouveau)
- `recyclique/api/src/recyclic_api/schemas/accounting_expert.py` (nouveau)
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py` (nouveau)
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/__init__.py`
- `recyclique/api/src/recyclic_api/api/api_v1/api.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/models/cash_session.py`
- `recyclique/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session.py`
- `recyclique/api/src/recyclic_api/application/cash_session_opening.py`
- `recyclique/api/src/recyclic_api/core/step_up.py`
- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_story_22_3_expert_accounting.py` (nouveau)
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/src/api/admin-accounting-expert-client.ts` (nouveau)
- `peintre-nano/src/domains/admin-config/AdminAccountingHubWidget.tsx`
- `peintre-nano/tests/unit/admin-accounting-hub-widget.test.tsx`
- `_bmad-output/implementation-artifacts/22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

**CR1 (2026-04-16)**

- `recyclique/api/src/recyclic_api/services/accounting_expert_service.py` (min/max, archivés, retry IntegrityError)
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py` (422 domaine, snapshot JSON, ConflictError publish)
- `recyclique/api/tests/test_story_22_3_expert_accounting.py`
- `contracts/openapi/recyclique-api.yaml`

### Change Log

- 2026-04-16 — Story Runner fin : CR2 **APPROVE** (nit mineur OpenAPI GET `revisions/latest` 401/403 documentaire seul) ; sprint **review → done** ; compteurs vs=0 qa=0 cr=1.
- 2026-04-16 — CR1 correctifs : OpenAPI accounting-expert **422/429** ; `accounting_expert_service` bornes min/max, archivés, `publish_revision` anti-collision séquence ; endpoint snapshot JSON + mapping **422** ; tests 22.3 + gates pytest PASS.
- 2026-04-15 — Story Runner : GATE pytest + QA vitest hub ; première passe CR (avant stabilisation finale).
- 2026-04-15 — DS Task : contrôle AC vs code/contrats ; trace re-run tests 22.3 + hub (story uniquement).
- 2026-04-15 — Story 22.3 DS : implémentation gouvernance comptable expert (API, révision, session figée) ; extension OpenAPI des endpoints moyens de paiement et historique révisions ; correctifs tests Peintre hub.
