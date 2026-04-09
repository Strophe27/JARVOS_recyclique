# Story 6.4 : Ajouter le parcours remboursement sous contrôle

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

## Story

En tant qu’utilisatrice responsable de caisse,
je veux un parcours de remboursement explicite et encadré dans la caisse v2,
afin de traiter les retours légitimes sans bricolage ad hoc ni ambiguïté avec une vente nominale.

## Acceptance Criteria

1. **Parcours dedie et visible dans la caisse** — Etant donne que le remboursement est une demande terrain sensible, quand le flux remboursement est introduit, alors il est expose comme **chemin metier dedie** (entree UI claire, libelles et etapes distincts du parcours nominal) **dans le workflow caisse** et non comme raccourci cache ou page produit isolee ; l’action resultante reste **coherente** avec les permissions, la tracabilite et les attentes documentees en aval (sync / reconciliation = Epic 8). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 6.4]

2. **Contrôles d’autorisation et sensibilité** — Étant donné qu’un remboursement est **plus sensible** qu’une vente nominale, quand une opératrice tente un remboursement, alors le flux applique une **permission effective dédiée** `caisse.refund` (contrôlée côté API comme `caisse.access` en 6.2 — pas d’inférence front), la **revalidation de contexte** (session ouverte, site, opératrice) et des **garde-fous métier visibles** : confirmation utilisateur **en deux temps** (sélection vente source → écran de confirmation récapitulative avant mutation), montants et rattachement au ticket source ; **pas d’exigence nouveau flux PIN / step-up** dans ce lot sauf réutilisation **sans nouveau design** d’un mécanisme Epic 2 déjà branché sur les endpoints caisse (si absent : MVP = permission + confirmation UI uniquement). L’UI indique clairement un **reversal**, pas une vente normale. [Source : epics.md Story 6.4 ; `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` ; checklist Peintre point 6]

3. **Backend autoritaire, intégrité historique** — Étant donné la note agents Epic 6 et la checklist Peintre, quand un remboursement est enregistré, alors la **décision d’éligibilité** (vente source, périmètre site/session, délai, montant, anti-double remboursement) est **portée et appliquée par `recyclique/api`** ; le ticket / vente source **completed** reste **non réécrit** : le remboursement se matérialise comme **nouvelle opération** (ex. document d’avoir ou vente de type reversal) **liée** à l’identifiant source, avec horodatage, auteur et motif obligatoire minimal — aligné sur la pratique décrite en recherche terrain (document séparé, traçabilité). [Source : checklist `2026-04-07_03` ; recherche Perplexity `2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md` — niveau 1 POS ; **non normatif** pour les comptes Paheko]

4. **Périmètre local vs comptabilité finale** — Étant donné qu’**Epic 8** porte l’articulation comptable et la sync Paheko complètes, quand cette story est livrée, alors le remboursement reste **opérable localement** dans Recyclique selon le **contrat minimal sync** (enregistrement terrain d’abord, états FR24 pour plus tard, pas de simulation de réconciliation finale) ; les **écritures / comptes / mapping Paheko** (ex. 709 vs 707, clôture J vs J+N) ne sont **pas** implémentés ici — seulement les **données et identifiants** nécessaires pour qu’Epic 8 puisse pousser ou classer l’opération sans re-saisie manuelle contradictoire. [Source : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` §2.1, §2.4, §7 ; epics.md Story 6.4]

5. **Compatibilité avec 6.1–6.3** — Étant donné le wizard nominal, les garde-fous contexte (6.2) et le cycle de vie `held` / `completed` / `abandoned` (6.3), quand le remboursement est ajouté, alors le parcours nominal et les tickets en attente **restent utilisables** ; un remboursement ne **court-circuite** pas les validations de contexte ; **seule** une vente en état **`completed`** peut servir de source — toute vente **`held`** (ou non finalisée) est **refusée** côté API avec erreur **4xx stable** (message exploitable UI). **Règle d’agrégation session (défaut 6.4)** : l’enrichissement session (ex. `cash_session_response_enrichment` ou équivalent) expose explicitement **trois agrégats testés** — `totals.sales_completed` (inchangé : ventes nominal complétées uniquement), `totals.refunds` (somme algébrique des reversals de la session, négative ou poste dédié selon modèle SQL), `totals.net` = `sales_completed + refunds` ; commentaire dans le code rappelant le lien clôture 6.7 / NFR21. [Source : stories `6-1`…`6-3` ; pack B52-P3 + capture `11-0__caisse-06-detail-session-admin.png` — journal / session]

> Correct course 2026-04-08 : story **keep**. La capacite metier reste valide ; les AC sont a lire comme rattachees au parcours caisse reel et a l’historique / detail session, pas comme justification d’une page autonome.
> Revalidation attendue : verifier explicitement ce parcours apres la nouvelle `6.1` et en lien avec le detail session / journal admin.
> Continuum avec stories voisines rebaselinées : **6.7** (totaux session / clôture locale et agrégats `refunds` / `net` dans le même radar brownfield) ; **6.8** (journal / détail session admin — traçabilité des ventes ; le locus « correction sensible » reste distinct du remboursement 6.4) ; **6.9** (couche défensive et honnêteté d’état sur le wizard remboursement comme sur les autres wizards caisse). Checklist parité : § **4. Finalisation** dans `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md` (remboursement distingué du nominal).

## Arbitrage produit figé (VS — défauts implémentables)

_Objectif : permettre DS sans HITL. Toute dérogation = correct-course ou story ultérieure._

| Sujet | Décision pour 6.4 |
|--------|-------------------|
| Total vs partiel | **Remboursement total uniquement** : le montant du reversal = le total remboursable de la vente source (pas de sélection de lignes ni montant partiel). Les remboursements partiels = **hors scope** (extension schéma / story dédiée). |
| Périmètre temporel / session | **Même session de caisse ouverte** que la vente source, **même site**, opératrice authentifiée avec contexte valide (6.2). Remboursement d’une vente d’une **session fermée** ou **d’un autre jour** = **refus explicite** (4xx + code stable), pas de contournement admin dans ce lot. |
| Vente source | Obligatoirement `lifecycle_status` / équivalent métier **`completed`**. Lien **`source_sale_id`** (FK) immutable sur l’enregistrement reversal. |
| Anti double remboursement | **Au plus un** reversal « actif » par `source_sale_id` (contrainte ou logique service + tests) ; idempotency sur requête répétée **recommandée** (clé client ou hash intention). |
| Motif | **Code** parmi une énumération API fermée : `ERREUR_SAISIE`, `RETOUR_ARTICLE`, `ANNULATION_CLIENT`, `AUTRE`. Si `AUTRE` → champ **`detail`** texte **obligatoire** (longueur max raisonnable ex. 500 car.) ; sinon `detail` optionnel. |
| Libellés UI / OpenAPI | Libellé principal flux et entrées menu : **« Remboursement »** ; `summary` / descriptions OpenAPI en français alignés ; mention « avoir / reversal » acceptable en description ou aide contextuelle, pas besoin de valider d’autres libellés terrain dans ce lot. |
| Permission | Clé stable **`caisse.refund`** à créer en base (ou équivalent déjà nommé dans le même namespace `caisse.*`) et à documenter dans les manifests / groupe pilote ; **ne pas** s’appuyer sur `caisse.access` seul pour autoriser la mutation reversal. |

## Tasks / Subtasks

- [x] **Alignement arbitrage** — Implémenter strictement le tableau **Arbitrage produit figé** ; consigner en en-tête de module service (ou commentaire structurant) toute hypothèse résiduelle — pas de nouveau HITL pour démarrer le codage. (AC : 1–5)
- [x] **Contrat OpenAPI** — Ajouter dans `contracts/openapi/recyclique-api.yaml` les opérations stables (`operationId` explicites) : au minimum **création** d’un remboursement / reversal, **lecture** pour affichage ticket / historique si nécessaire ; schémas requête/réponse alignés sur le modèle SQLAlchemy ; descriptions mentionnant Story 6.4 et les garde-fous (session, site, permission, opérateur). Régénérer `contracts/openapi/generated/recyclique-api.ts` si la chaîne codegen est utilisée ; sinon étendre `peintre-nano/src/api/sales-client.ts` comme pour 6.1–6.3. (AC : 2–4)
- [x] **Modèle et persistance** — Étendre `recyclique/api` : tables/champs ou type de vente / table `sale_reversals` (choix d’implémentation laissé au dev **sous contrainte** : immutabilité de la vente source, FK stable, montants signés ou positifs + type explicite). Migration Alembic + enum/statuts si besoin. (AC : 3, 4)
- [x] **Service et endpoints** — `sale_service.py`, `sales.py` : implémenter la mutation avec **même esprit** que `create_sale` / `finalize-held` (revalidation contexte, permissions, opérateur, session ouverte) ; erreurs **4xx** stables (`RecycliqueApiError`) ; idempotence ou détection de doublon si même intention répétée (préparer Epic 8 / AR24 sans tout implémenter). Journalisation / audit : réutiliser les patterns `story-2-5-epic8-audit-foundations.md` pour l’acte sensible « remboursement ». (AC : 2, 3)
- [x] **Permissions** — Introduire la permission **`caisse.refund`** (seed / migration données ou procédure admin documentée) dans le calcul effectif ; vérifier `user_has_effective_permission` / patterns 6.2 ; ne pas l’inférer côté Peintre. (AC : 2)
- [x] **Peintre_nano** — Étendre `peintre-nano/src/domains/cashflow/` : entrée de menu / étape de flow **« Remboursement »** dans le manifest CREOS (nouvel onglet ou flow dédié selon cohérence UX) ; **aucune** règle d’éligibilité métier dans le store seul ; affichage des erreurs backend et états bloquants comme 6.2 ; accessibilité clavier (NFR11). Mettre à jour `contracts/creos/manifests/page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json`, `navigation-transverse-served.json` si nouvelles étapes/widgets. (AC : 1, 2, 5)
- [x] **Tests** — Pytest : scénarios heureux + refus (absence `caisse.refund`, mauvaise session, vente non `completed` / `held`, double remboursement, tentative partielle ou montant ≠ total source, mauvais site) ; **vérifier les trois agrégats** session (`sales_completed`, `refunds`, `net`) après au moins un reversal ; Vitest : rendu du parcours, confirmation en deux temps, messages, absence de bypass par mock de permission front seul. (AC : 2–5)
- [x] **Vérification manuelle** — Sur stack locale `http://127.0.0.1:4444` : enchaîner vente nominale → remboursement lié → vérifier affichage session / historique cohérent avec la règle d’agrégation retenue. (AC : 1, 5)

## Dev Notes

### Pack contexte Epic 6 (garde-fous développeur)

- **Intention opérationnelle** (tableau ultra opérationnel) : remboursement sous contrôle ; captures legacy `11-0__caisse-06-detail-session-admin.png` = **mémoire brownfield** (détail session / journal), **pas** maquette Peintre ni spec comptable.
- **Frontière** : remboursement ≠ vente nominale ; **ne pas** déplacer la compta finale ni Paheko dans Epic 6 ; **ne pas** exposer une intégration Paheko depuis le front (checklist point 7).
- **Convergence 3** : conserver `data_contract.critical` sur le ticket courant où pertinent ; le flux remboursement peut introduire un widget ou étape avec `data_contract` pointant vers les **nouveaux** `operationId`.

### Exigences techniques (non négociables)

- Hiérarchie : OpenAPI → ContextEnvelope → manifests CREOS → runtime (checklist points 2–5, 11).
- Mutations sensibles : **revalidation serveur** ; pas de « succès » basé sur seul état Zustand (checklist points 6, 8).
- Pas d’édition manuelle des fichiers générés OpenAPI pour contourner le contrat (checklist point 9).

### Conformité architecture

- `core-architectural-decisions.md`, `project-structure-boundaries.md`, `navigation-structure-contract.md`.
- Contrat sync documentaire : enregistrement local d’abord, visibilité future du décalage sync — `2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`.

### Fichiers et zones probables

- `recyclique/api/src/recyclic_api/models/sale.py`, éventuellement nouveau module modèle ; `sale_service.py`, `api/api_v1/endpoints/sales.py`, `schemas/sale.py`, `cash_session_service.py` / `cash_session_response_enrichment.py` si agrégats impactés.
- `contracts/openapi/recyclique-api.yaml`, manifests sous `contracts/creos/manifests/`.
- `peintre-nano/src/domains/cashflow/*`, `src/flows/FlowRenderer.tsx`, `src/registry/register-cashflow-widgets.ts`, `src/api/sales-client.ts`.
- Tests : `recyclique/api/tests/test_sale_service*.py`, nouveaux fichiers dédiés story 6.4 ; `peintre-nano/tests/e2e/` ou `unit/` alignés sur 6.1–6.3.

### Contexte recherche (non juridique, non comptable)

- Le fichier Perplexity rappelle : document d’avoir séparé, ticket source intact, expert-comptable pour comptes exacts et cas limites inter-exercices — **à respecter comme séparation des responsabilités** produit vs Epic 8.

### Intelligence stories 6.1 → 6.3

- **6.1** : `POST/GET /v1/sales`, widget ticket critique, double barrière stale + refus paiement backend.
- **6.2** : garde contexte wizard, `caisse.access`, opérateur/session/site ; erreurs explicites.
- **6.3** : `lifecycle_status` (`held` / `completed` / `abandoned`), endpoints `hold`, `held`, `finalize-held`, `abandon-held`, plafond tickets en attente ; les compteurs « ventes complétées » restent sur `completed` uniquement — les **reversals** alimentent `totals.refunds` / `totals.net` (AC5, tableau arbitrage).
- **Ne pas régresser** : les endpoints 6.3 et le wizard nominal doivent rester verts après changements.

### État du dépôt (indice implémentation)

- Aucun endpoint « refund / reversal » dans `recyclique-api.yaml` au moment de la CS : **greenfield** côté contrat v1 sales pour cette story.

### Recherche « dernière version »

- Pas de nouvelle lib imposée ; confirmer pins `peintre-nano/package.json` et stack API avant ajout de dépendances.

## Definition of Done

- OpenAPI et schémas alignés ; clients régénérés ou `sales-client.ts` à jour **sans** hack sur générateur.
- Remboursement **persisté** côté API avec traçabilité minimale (qui, quoi, quand, lien source, code motif + `detail` si `AUTRE`) ; vente source **inchangée**.
- Permission **`caisse.refund`** opérationnelle côté API et reflétée dans l’enveloppe / UX (refus explicite si manquante).
- UI Peintre : parcours **explicite** « Remboursement » ; confirmation **deux temps** ; pas d’éligibilité métier uniquement front.
- Agrégats session : **`sales_completed`**, **`refunds`**, **`net`** documentés en code et couverts par tests.
- Tests automatisés API + front sur les chemins critiques et régressions 6.1–6.3.
- Manifests CREOS et navigation **promus** sous `contracts/creos/manifests/` si le slice est officiel.

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Scope comptable / Paheko glisse dans 6.4 | Rappel epic boundary + données structurées seulement ; pas d’appel Paheko. |
| Réécriture silencieuse du ticket source | Revue obligatoire : modèle « nouveau document lié » ; tests d’immutabilité. |
| Permissions trop faibles ou trop larges | Permission dédiée + revue alignée 1.3 / Epic 2 step-up. |
| Agrégats session incohérents (6.7 plus tard) | Règle explicite + tests ; commentaire pour clôture locale. |
| Partial refund complexifie le lot | Hors scope 6.4 par arbitrage VS (total uniquement). |

## Références

- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md` — ligne remboursement ; story **6.4** **keep** (reconnexion au parcours caisse / historique / détail session)
- `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md` — §4 finalisation (distinction remboursement vs vente nominale)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md` — classification **keep**, handoff §4.5 fichiers `6-4`
- `_bmad-output/planning-artifacts/epics.md` — Epic 6 (intro, note agents), Story 6.4
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 3
- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (story 6.4)
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `references/recherche/2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md` (contexte produit / traçabilité)
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-06-detail-session-admin.png`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- `_bmad-output/implementation-artifacts/6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md`
- `_bmad-output/implementation-artifacts/6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier.md`
- `_bmad-output/implementation-artifacts/6-3-ajouter-le-parcours-ticket-en-attente.md`
- `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` — agrégats session / clôture dans le continuum brownfield (lien `refunds` / `net`)
- `_bmad-output/implementation-artifacts/6-8-gerer-un-premier-perimetre-borne-de-corrections-sensibles-et-laudit-des-ventes-modifiees.md` — journal / détail session admin (locus correction ≠ remboursement 6.4)
- `_bmad-output/implementation-artifacts/6-9-rendre-la-caisse-defensive-face-aux-erreurs-fallbacks-et-sync-differee.md` — défensif transversal sur les wizards caisse
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/docs/story-2-5-epic8-audit-foundations.md`

### project-context.md

- Aucun `project-context.md` racine repéré ; s’appuyer sur les références ci-dessus.

## Dev Agent Record

### Agent Model Used

Composer (sous-agent DS Story 6.4)

### Debug Log References

- Pytest SQLite : `operator_id` JWT string → UUID explicite dans `create_sale` (compat SQLAlchemy 2 / colonne UUID).

### Completion Notes List

- Table `sale_reversals` + permission `caisse.refund` (migration `d7f1_story_6_4_reversals`) ; POST/GET `/v1/sales/reversals` ; agrégats `totals` sur enrichissement session.
- UI `/caisse/remboursement` + widget `cashflow-refund-wizard` ; enveloppe démo inclut `caisse.refund`.
- Vérification manuelle sur `http://127.0.0.1:4444` : recommandée pour DoD opérateur ; couverture auto via intégration API + Vitest.

### File List

- `recyclique/api/src/recyclic_api/models/sale_reversal.py`
- `recyclique/api/migrations/versions/d7f1_story_6_4_sale_reversals_and_refund_perm.py`
- `recyclique/api/src/recyclic_api/models/__init__.py`
- `recyclique/api/src/recyclic_api/models/audit_log.py`
- `recyclique/api/src/recyclic_api/schemas/sale.py`
- `recyclique/api/src/recyclic_api/schemas/cash_session.py`
- `recyclique/api/src/recyclic_api/services/cash_session_response_enrichment.py`
- `recyclique/api/src/recyclic_api/services/sale_service.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/caisse_sale_eligibility.py`
- `recyclique/api/tests/test_sale_reversal_story64_integration.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/creos/manifests/page-cashflow-refund.json`
- `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowRefundWizard.module.css`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/unit/cashflow-refund-gate-6-4.test.tsx`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/unit/widget-registry.test.ts`

## Change Log

- 2026-04-08 — Revalidation brownfield-first Epic 6 : entrées **Références** (mapping `2026-04-08_05`, checklist parité `2026-04-08_06`, sprint-change-proposal) ; bloc correct course complété par liens **6.7 / 6.8 / 6.9** et §4 checklist finalisation.
- 2026-04-08 — DS Story 6.4 : API reversals, permission `caisse.refund`, agrégats session `totals`, UI Remboursement, tests.

---

## Évolutions futures (hors scope 6.4 — pas bloquant DS)

- Remboursement **partiel** (lignes, montant libre).
- Remboursement **cross-session** ou après clôture (règles compta / responsabilité).
- Step-up **PIN** systématique ou **par seuil de montant** si le produit l’exige après retour terrain.
- Affinage libellés (« Avoir », « Retour ») et **i18n** si activée plus tard.

---

**Story completion status**

- **CS (create-story)** : contexte consolidé depuis epics Story 6.4, pack lecture 6–10, tableau opérationnel, contrat sync Paheko, recherche remboursements association, checklist Peintre, captures, intelligence 6.1–6.3.
- **VS (validate-create-story)** : arbitrage produit figé (tableau), permission `caisse.refund` nommée, confirmation deux temps, règle tripartite d’agrégats session, périmètre total + même session ouverte.
- **Ultimate context engine analysis completed** — guide dev prêt pour implémentation ; statut fichier : **ready-for-dev**.
