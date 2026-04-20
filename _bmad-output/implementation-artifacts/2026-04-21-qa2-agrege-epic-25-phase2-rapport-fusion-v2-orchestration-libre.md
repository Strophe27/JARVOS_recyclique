# Rapport QA2 agrégé — Epic 25 phase 2 (stories **25.6 → 25.15**)

**Date :** 2026-04-21  
**Mode :** orchestrateur QA2 **non piloté finement** par le chat ; **sans** modèle Codex ; brief minimal + décision locale (planner → **5 passes** : prd, arch, doc, code adversarial, tests validation).

---

## Synopsis

Le pilotage **YAML / epics.md** et le **DAG / récap** sont globalement alignés sur le périmètre décrit par les workers, mais plusieurs **sources de vérité parallèles** (commentaires YAML, fichier story **25.7**, tableau « Push » vs changelog dans le récap, ligne « QA2 non exécuté ») créent encore de la **lecture contradictoire**. Le lot **documentation** présente au moins une **incohérence critique** entre statut sprint (**done**) et bandeau **ready-for-dev** pour la story **25.7**. Côté **code**, la passe adversarial souligne surtout un **écart contrat OpenAPI ↔ comportement réel** sur les routes **sales** (codes et schémas d’erreur, en-têtes), un **audit « silencieux »** si la persistance échoue, et des **angles de rupture** (step-up / Redis fail-open, plafond scheduler outbox). Les **tests** couvrent bien plusieurs stories (9, 10, 12–15, contexte 25.8), avec des **limites assumées** (heuristique Redis en 25.12, SQLite vs PostgreSQL pour 25.13, step-up concentré sur un flux en 25.14, pas de pytest dédié à **25.11** — cohérent avec un livrable surtout doc).

---

## Findings par sévérité

### Critiques

| Synthèse | Détail fusionné | Sources passes |
|----------|-----------------|----------------|
| **Story 25.7 : statut fichier vs sprint** | Le fichier story **25.7** affiche encore **`Status: ready-for-dev`** et cases VS/DoD/tasks largement non cochées, alors que la checklist existe, le QA PASS dédié et **`development_status`** indiquent **`done`** — risque majeur de **mauvaise décision pilotage** (reprise de travail déjà clos). **Reco :** aligner statut, cases et section « Alignement sprint » sur la vérité YAML. | **[LOC]** `_bmad-output/implementation-artifacts/25-7-traduire-la-spec-25-4-sections-2-3-en-checklist-developpement-executable.md` (pass-doc) |
| **OpenAPI vs runtime `sales`** | Les chemins **`/v1/sales/*`** dans OpenAPI déclarent surtout **`200` / `422`**, alors que **`sales.py`** expose **`401`, `403`, `404`, `409`** et corps structurés (step-up, contexte). **Reco :** documenter toutes les réponses réelles et schémas `detail`, en particulier mutations sensibles et corrections. | **[LOC]** `recyclique/api/openapi.json` ↔ `recyclic_api/api/api_v1/endpoints/sales.py` (pass-code adversarial) |
| **`log_audit` : échec persistance sans signal client** | Si la persistance audit échoue, la voie métier peut rester « réussie » côté API sans signal — **trou de preuve** potentiel (conformité / exploitation). **Reco :** file d’attente critique, métrique/alerte, ou politique **fail-open** explicitement documentée avec observabilité. | **[LOC]** `recyclique/api/src/recyclic_api/core/audit.py` (pass-code adversarial) |

### Warnings

- **[LOC] `sprint-status.yaml` (~commentaires Epic 25)** — Commentaires encore décrivant **25-13…25-15** comme « souvent backlog » alors que **`development_status`** est **`done`** → confusion sur grep / lecture rapide.
- **[LOC] `2026-04-21-recap-warnings-et-restes-epic-25-phase2-depuis-25-6.md` §3 vs §7** — Tableau « Push origin » vs changelog **commit poussé** : narrative contradictoire ; à réconcilier (pass-arch).
- **[LOC] même récap — QA2 agrégé « Non exécuté »** — À mettre à jour après ce run pour éviter faux état d’audit (pass-arch).
- **[LOC] `25-14-…step-up….md`** — Mention « statut review » dans une section alors que le header est **`done`** → harmoniser (pass-doc).
- **[LOC] `25-10-supervision-causes-racines….md`** — Libellé **Epic** différent des autres stories 25.x → risque de rattachement narratif ambigu ; unifier ou noter (pass-doc).
- **[LOC] `openapi.json` — `securitySchemes`** — Bearer seul alors que l’API accepte aussi **cookie** → intégrateurs sans cookie dans le contrat (pass-code adversarial).
- **[LOC] `audit.py` — `log_admin_access` / `log_role_change`** — Types d’action peu discriminants succès/échec (pass-code adversarial).
- **[LOC] `sale_service.py` — branche `CASH_SALE_CORRECTED`** — Pas d’usage de **`merge_critical_audit_fields`** comme sur les autres journaux caisse → corrélation poste/caisse (25.13–25.14) potentiellement plus faible (pass-code adversarial).
- **[LOC] `step_up.py`** — Lockout Redis : si Redis indispo, **pas de lockout** (fail-open) — documenter ou durcir selon risque (pass-code adversarial).
- **[LOC] `scheduler_service.py` — `run_paheko_outbox_task`** — Plafond **20** lignes/tick → risque de **latence file** sous charge sans signal dans ce module (pass-code adversarial).
- **[LOC] `schemas/paheko_outbox.py` — `derive_root_cause_for_outbox_item`** — Cas résiduels pouvant mal étiqueter le **root_cause** pour le support (pass-code adversarial).
- **[LOC] Tests — docstrings « Story 2.5 »** dans `test_audit_story_25.py`, `test_request_correlation_story_25.py` — Traçabilité recherche « story 25 » dégradée ; renommer/clarifier (pass-tests).
- **[LOC] `test_story_25_12_ar12_paheko_async_path_no_redis.py`** — Garde **heuristique** sur imports Redis → régression possible si import atypique (pass-tests).
- **[LOC] `test_story_25_13_journalisation….py`** — Branche SQLite **sans** exiger persistance `AuditLog` → pas de garantie bout-en-bout audit sur CI SQLite (pass-tests).
- **[LOC] `test_story_25_14_step_up….py`** — Matrice centrée **`exceptional-refunds`** ; autres mutations step-up non couvertes ici (pass-tests).
- **Couverture 25.11** — Pas de fichier pytest dans le scope : **cohérent** avec livrable surtout doc/OpenAPI ; risque d’attente irréaliste si quelqu’un cherche `test_story_25_11` (pass-tests).

### Info / positifs (synthèse)

- **`epic-25` `in-progress`** alors que **25.6–25.15** sont **`done`** : narration **cohérente** avec la distinction epic vs stories (pass-prd).
- **DAG** : pas de cycle signalé ; **`depends_on`** et ordre **`recommended_linear_order`** cohérents ; **25-14** / **25-15** alignés récap §6.7 (pass-arch).
- **Ordre middleware step-up / contexte** sur corrections : **`_enforce_sales_context_binding` avant PIN** — aligné intention ADR (pass-code adversarial).
- **Paheko outbox** : idempotence / course sur `IntegrityError` et audit transitions décrits positivement (pass-code adversarial).
- **Tests 9, 10, contexte 25.8** : jeux jugés substantiels pour les scénarios ciblés (pass-tests).

---

## Risques transverses

1. **Décision pilotage sur mauvais fichier statut** (surtout **25.7** encore « ready-for-dev »).
2. **Clients et générateurs** guidés par OpenAPI **incomplet** sur erreurs et auth → régressions non vues par contrats.
3. **Preuve d’audit** incomplète si DB audit ou Redis step-up dégradés (silence / fail-open).
4. **Backlog outbox** si charge dépasse le traitement schedulé par tick.
5. **Traçabilité** tests ↔ epic (docstrings 2.5 vs 25, heuristique Redis).

---

## Limites des passes (agrégées)

| Passe | Limite principale |
|--------|-------------------|
| **prd** | Pas de contrôle DAG, code, ni exécution tests (hors scope). |
| **arch** | Pas de relecture de `sprint-status.yaml` / `epics.md` pour valider les « done » du récap ; confiance modérée sur fraîcheur §3 vs §7. |
| **doc** | QA documentaire uniquement ; pas de preuve runtime. |
| **code (adversarial)** | Pas d’exécution API/DB ; OpenAPI volumineux — contrôle détaillé centré sur **`/v1/sales/*`** + `securitySchemes` ; autres modules hors liste non lus. |
| **tests** | Pas d’exécution pytest rapportée ; dépendances CI (SQLite vs PG) et périmètre step-up partiel explicites dans le rapport worker. |

---

## Méta (orchestration)

- **Planner** : 5 passes — **prd**, **arch**, **doc**, **code API** (**adversarial**), **tests** (**validation**).
- **Sortie** : **Markdown uniquement** (`markdown_only: true`), conformément au brief racine.

---

*Artefact figé après run orchestrateur QA2 « orchestration libre » (2026-04-21).*
