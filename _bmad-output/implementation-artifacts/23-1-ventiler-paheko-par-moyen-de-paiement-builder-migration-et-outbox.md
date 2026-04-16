# Story 23.1 : Ventiler `Paheko` par moyen de paiement (builder, migration, outbox)

Status: done

<!-- CS bmad-create-story create 2026-04-16 (Task spawn, resume_at CS) : checklist.md PASS ; alignement fichier Status review ↔ sprint ; epics.md Epic 23 Story 23.1 ; pas de régression YAML ; prochaine étape VS validate-create-story -->

**Story key :** `23-1-ventiler-paheko-par-moyen-de-paiement-builder-migration-et-outbox`  
**Epic :** 23 — Alignement produit post-Epic 22 : visibilité `Paheko` par moyen de paiement et gestion expert observable  
**Suite logique :** la story **23-2** couvre uniquement le cockpit Peintre (mutations + step-up) ; livrer **23-1** en premier pour débloquer la valeur trésorerie sans dépendre de l’UI.

## Alignement sprint-status

- Cle sprint : `23-1-ventiler-paheko-par-moyen-de-paiement-builder-migration-et-outbox` → **done** (GATE→QA→CR Story Runner 2026-04-16).
- Epic parent : `epic-23` → **in-progress**.
- Stories paralleles **ready-for-dev** : `23-2-*`, `23-3-*` (cockpit Peintre). **23-1** est la brique backend deja implementee (gate / revue) ; la valeur Paheko ventilee precede l’UI 23-2/23-3.

## Contexte produit

- L’Epic 22 a livré la chaîne canonique (journal, snapshot figé, batch outbox, sous-écritures déterministes) et le paramétrage expert **par API** (moyens + comptes globaux + révision publiée).
- Le **snapshot** contient déjà des totaux par code de moyen (`by_payment_method_signed` dans les totaux de clôture).
- Le **builder Paheko** actuel (story 22.7) **agrège** ces montants en un bloc « ventes + dons » puis conserve les blocs remboursements ; les comptes `debit` / `credit` utilisés pour l’envoi viennent surtout du **mapping de clôture** `paheko_cash_session_close_mappings`, pas des comptes `paheko_debit_account` / `paheko_refund_credit_account` du référentiel par moyen.
- Les bénéficiaires terrain attendent : dans **Paheko**, une ventilation **lisible** par moyen sur les **comptes du référentiel expert** tels que **figés pour la session** (révision), sans relire la config « live » après coup.

## Prérequis (gel)

- Epic 22 **done** ; 22-6 (snapshot), 22-7 (batch + outbox), 22-3 (référentiel + API expert) = fondations **stables**.
- Ne pas casser l’idempotence ni le modèle de succès partiel Epic 8 ; toute extension du nombre ou de la sémantique des sous-écritures doit être **versionnée** ou derrière une **politique explicite** (cutover / déploiement documenté).

## Story

As a trésorier ou intégrateur comptable,  
I want que la clôture de session envoie vers `Paheko` des écritures qui **ventilent les montants par moyen de paiement** en utilisant les **comptes au débit d’encaissement** (et règles de remboursement associées) **déterministes à partir de la session clôturée** (snapshot + révision référencée, voir AC2 et Dev Notes « Source des comptes par moyen »),  
So that la compta dans `Paheko` reflète la caisse **au lieu de** tout regrouper sur le seul couple débit/crédit du mapping de clôture.

## Acceptance Criteria

1. **Décision API Paheko (bloquante pour la suite)** — *Given* le contrat HTTP réel (extensions / doc interne) ; *When* cette story démarre en implémentation ; *Then* le livrable documente **explicitement** (dans cette story ou dans `cash-accounting-paheko-canonical-chain.md`) le choix : **plusieurs POST** (sous-écritures) vs **une transaction multi-lignes** ; *And* ce choix est reflété dans le builder et les tests (pas de phrase « à trancher » laissée ouverte en fin de story).
2. **Ventilation par moyen (ventes / dons)** — *Given* une session clôturée avec un snapshot figé où `totals.by_payment_method_signed`, `totals.donation_surplus_total` et **`accounting_config_revision_id`** (racine) sont renseignés ; *When* le batch Paheko construit la **transaction 1** « ventes + dons » (PRD §9.3) ; *Then* pour **chaque code de moyen** dans `by_payment_method_signed` avec partie **non nulle** (après **§ Arrondi monétaire**), une trace distante existe au **débit** sur le compte d’encaissement du moyen (Règle 1) ; *And* les **crédits** suivent la **Règle 2** alignée PRD §6.1 / §6.3 / §9.3 : **crédit ventes** (compte produit global expert) + **crédit dons** si `donation_surplus_total` > 0 (compte dons global expert) ; *And* **équilibre** transaction 1 : somme débits = somme crédits à **±0,01 €** ; *And* **interdit** : relire la config courante sans `accounting_config_revision_id`.
3. **Remboursements** — *Given* les totaux `refunds_current_fiscal_total` et `refunds_prior_closed_fiscal_total` du snapshot ; *When* le mode ventilation par moyen est actif pour les ventes+dons ; *Then* les remboursements suivent **exactement** la **Règle 3** (Dev Notes) : **deux blocs** comme en 22.7, **sans** ventilation par mode en V1 ; *And* si les deux totaux remboursement sont **zéro**, le comportement et les clés d’idempotence associées aux remboursements restent **alignés** sur 22.7 (pas d’écriture fantôme).
4. **Compatibilité et migration** — *Given* un déploiement en `aggregated_v22_7` (comportement actuel) ; *When* l’admin active `per_payment_method_v1` (ou clé de config retenue) ; *Then* la documentation de déploiement décrit **le défaut** (ex. rester en agrégé jusqu’à bascule), la **procédure de bascule** et la **prévention des doubles écritures** (clés d’idempotence nouvelles ou préfixe de batch versionné) ; *And* les tests pytest couvrent **les deux** configurations OU une matrice documentée « une seule voie supportée en prod » avec l’autre voie réservée aux tests (sans ambiguïté AC « ou »).
5. **Observabilité** — *Given* un opérateur support ; *When* il lit l’état batch / outbox (champs existants ou extension documentée dans OpenAPI) ; *Then* pour chaque partie ventilée par moyen, il existe au minimum : **code moyen**, **montant**, **identifiant de sous-écriture ou ligne**, lien vers **id distant Paheko** quand présent ; *And* la description des champs est référencée dans OpenAPI ou dans un paragraphe « Champs observables » en Dev Notes (plus de formulation purement subjective « JSON opaque »).
6. **Honnêteté / preuves** — *When* la story est revue ; *Then* la matrice ou le `test-summary` référencé (ex. filiation 22-8) inclut une ligne **ventilation par moyen** : preuve locale obligatoire ; colonne Paheko réel = procédure manuelle ou **HITL** nommé si non automatisé.

### Arrondi monétaire (référence AC2)

- Montants en **euros** avec **2 décimales** ; comparaison des sommes ventilées vs `by_payment_method_signed` : tolérance **±0,01 €** sur la session (documenter si une seule reprise globale ou cumul par ligne).

## Définition de Done (complément)

- Aucune régression sur les tests existants du batch 22.7 en mode agrégé (si conservé).
- OpenAPI / admin : champs d’observabilité alignés avec l’implémentation.
- Remboursements : conforme **Règle 3** (inchangé 22.7 en V1), avec tests de non-régression.

## Hors périmètre (cette story)

- Écran ou widget **Peintre** : voir **23-2**.
- Modification des règles métier **caisse** (wizard, encaissements) hors ce qui est nécessaire pour consommer le snapshot existant.
- Comptes **globaux** expert (PATCH hors moyens) : hors périmètre sauf si indispensable pour cohérence documentée.

## Tasks / Subtasks

- [x] Rédiger / mettre à jour le choix **POST vs multi-lignes** (AC1) dans l’artefact d’architecture ou en tête de Dev Notes + lien.
- [x] Implémenter la **Règle 2** (crédit ventes + crédit dons si besoin, débits par moyen, équilibre PRD §9.3) et vérifier sur les cas tests (dont exemple §6.3).
- [x] Implémenter le builder versionné + politique de config `aggregated_v22_7` vs `per_payment_method_v1` (AC2, 4).
- [x] Lier snapshot figé / révision session aux comptes `paheko_*` par code moyen (AC2).
- [x] Trancher et documenter **Remboursements** (AC3) + tests.
- [x] Étendre observabilité payload / OpenAPI (AC5).
- [x] Pytest : multi-moyens, zéros, idempotence, succès partiel si applicable, les deux configs ou matrice unique (AC4, 6).
- [x] Mettre à jour ou créer l’entrée matrice / test-summary (AC6).

## Dev Notes

### Intelligence story precedente (22.7 / 22.8)

- **22.7** a pose le batch multi-sous-ecritures, l’idempotence et le processor ; **23-1** etend le **builder** (ventilation par moyen), pas une reecriture de l’outbox Epic 8.
- **22.8** a fige le **peloton pytest** de non-regression chaine canonique ; pour **AC6** et la non-regression batch, reutiliser au minimum les memes ancres que le resume QA 22-8 :
  - `recyclique/api/tests/test_story_22_6_accounting_close_snapshot.py`
  - `recyclique/api/tests/test_story_22_7_paheko_close_batch_builder.py`
  - `recyclique/api/tests/test_story_22_2_dual_read_aggregate_compare.py`
  - `recyclique/api/tests/test_story_8_1_paheko_outbox_slice.py`
- Ajouter des tests **dedies** `test_story_23_1_*` (ou extension honnete du fichier 22-7 builder) pour la politique `per_payment_method_v1` vs `aggregated_v22_7` ; documenter la ligne dans la matrice / `test-summary` comme en 22-8.

### Fichiers / services (ancrage)

Racine packages : `recyclique/api/src/recyclic_api/`.

- `services/cash_session_journal_snapshot.py`, `schemas/cash_session_close_snapshot.py` (cles : `totals.by_payment_method_signed`, `totals.refunds_*`, racine `accounting_config_revision_id`)
- `services/paheko_close_batch_builder.py`, `services/paheko_transaction_payload_builder.py`
- `services/paheko_mapping_service.py`, `services/paheko_accounting_client.py`, `services/paheko_outbox_processor.py`
- `services/accounting_expert_service.py`, `api/api_v1/endpoints/admin_accounting_expert.py`, `models/payment_method.py`

### Garde-fous

- Pas de double compta : nouvelles clés d’idempotence ou préfixe batch **versionné**.
- Vérité montants = **snapshot figé** uniquement (`totals.*` et métadonnées racine telles que `accounting_config_revision_id`).
- Pas de contournement step-up côté API existante.

### Décision produit (déjà tranchée — pas de choix laissé au dev « au feeling »)

**Qui a tranché ?** Règle par défaut **projet** (Recyclique / pilotage), reproductible sans que le porteur produit soit comptable : si un **expert-comptable** impose autre chose plus tard, ce sera un **changement de paramétrage** (comptes mapping / révision), pas une ambiguïté de code.

**Pourquoi c’était flou avant ?** Parce qu’en compta **double** chaque mouvement a **deux côtés** : quand on ventile **plusieurs débits** (un par mode de paiement), il faut dire **comment le total reste équilibré** avec le(s) **crédit(s)**. Avant Epic 22.7, il y avait **un seul** débit + **un seul** crédit pour le gros bloc ; en ventilant les débits, il faut écrire noir sur blanc ce qu’on fait du crédit.

**Quand c’est décidé ?** **Ici, maintenant**, pour la V1 de cette story.

#### Règle 1 — Comptes **débit** par mode (encaissement)

- Pour chaque mode avec un montant non nul : utiliser le compte d’**encaissement au débit** défini dans le **référentiel expert** pour ce mode, en le résolvant via **`accounting_config_revision_id`** stocké **à la racine** du snapshot (lecture de la **révision publiée** correspondante — **interdit** de prendre la « config courante » sans cet id).

#### Règle 2 — Crédits **ventes** et **dons** (alignement PRD `2026-04-15_prd-recyclique-caisse-compta-paheko.md` §6.1, §6.3, §9.3)

Référence produit : le PRD montre pour la **transaction 1** (ventes + dons) **plusieurs débits** par moyen d’encaissement et **deux lignes de crédit** possibles : **ventes** (ex. `7070`) et **dons** (ex. `7541`) lorsque le surplus don est non nul.

- **Débits** : ventilation par **moyen** sur les comptes **`paheko_debit_account`** du référentiel (Règle 1) ; les montants par moyen doivent être **cohérents** avec le journal / le snapshot (y compris la cohabitation vente + don sur un même moyen, comme l’exemple espèces du PRD §6.3 / §9.3 — le dev s’appuie sur **`payment_transactions`** + agrégats du snapshot pour ne pas mélanger les natures).
- **Crédit ventes** : compte **`default_sales_account`** des **comptes globaux expert** liés à la révision (équivalent PRD **compte de vente** ; défaut documentaire `7070`). Montant = **total ventes** du bloc transaction 1 (hors ligne de don en surplus agrégée `donation_surplus_total`). *Si le mapping de clôture `destination_params.credit` est déjà strictement aligné sur ce même compte en prod, on peut l’utiliser comme source technique, mais la **vérité métier** reste le compte global ventes publié.*
- **Crédit dons** : compte **`default_donation_account`** des comptes globaux expert (équivalent PRD `7541`). Montant = **`totals.donation_surplus_total`**. **Si ce total est 0**, pas de deuxième ligne de crédit dons.
- **Équilibre** : somme des débits transaction 1 = somme des crédits (ventes [+ dons si > 0]) à **±0,01 €**.
- Si l’API Paheko impose un format différent, l’AC1 prime ; sinon **pas d’improvisation** hors cette structure.

#### Règle 3 — Remboursements (V1)

- **Inchangé** par rapport au comportement **22.7** : **deux blocs** distincts (remboursements exercice courant / remboursements exercice antérieur clos), **sans** ventilation par mode de paiement dans la **V1** de cette story. Les comptes utilisés restent ceux déjà prévus par le builder / mapping pour ces blocs.

### Source des comptes par moyen (implémentation)

**Constat code (Epic 22)** : le snapshot figé contient `accounting_config_revision_id` et `totals.by_payment_method_signed`, mais **pas** les comptes expert par moyen **dans** le JSON.

**Mécanisme retenu pour la V1** : résolution des comptes débit par code moyen via la **révision** pointée par `accounting_config_revision_id` (règle 1). *(Extension future optionnelle du snapshot pour tout figer en JSON : hors périmètre V1 saucissonner en story ultérieure si l’audit l’exige.)*

### Références

- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — §4 Entry builder]
- [Source: `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8.md`]
- [Source: `_bmad-output/implementation-artifacts/22-3-livrer-le-parametrage-expert-des-moyens-de-paiement-et-des-comptes-globaux.md`]
- [Source: `_bmad-output/implementation-artifacts/22-8-rebaseliner-les-preuves-qualite-et-valider-bout-en-bout-la-chaine-caisse-snapshot-ecriture-paheko.md` — chemins pytest gate C4]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 23, Story 23.1]

### Project Structure Notes

- Respecter les conventions existantes **FastAPI / SQLAlchemy 2.x** sous `recyclique/api/` ; pas de nouvelle couche parallele au builder Paheko existant.
- Contrats HTTP : mettre a jour `contracts/openapi/recyclique-api.yaml` en coherence avec les champs d’observabilite (AC5).

## Dev Agent Record

### Agent Model Used

(non applicable — create-story / QA révision)

### Debug Log References

### Completion Notes List

- 2026-04-16 — Story Runner BMAD (resume_at **GATE**) : GATE pytest peloton 23.1 + 22.7 → **PASS** ; QA (`bmad-qa-generate-e2e-tests`) : ligne AC5 + test `test_per_method_observability_ac5_minimum_fields` ; gate **19 passed** ; CR **APPROVE** (findings non bloquants documentés) ; `development_status` **23-1** **review → done** ; vs_loop=0 qa_loop=0 cr_loop=0.
- 2026-04-16 — CS bmad-create-story (Task spawn, resume_at CS, mode create) : re-exécution checklist qualité ; `development_status` **23-1** inchangé **review** ; cohérence story ↔ `epics.md` § Epic 23 Story 23.1 ; prochaine étape orchestrateur **VS** (validate-create-story).
- 2026-04-16 — CS bmad-create-story (mode create, reprise) : alignement section « Alignement sprint-status » et notes avec `development_status` **review** ; trace BDD `epics.md` § Epic 23 Story 23.1 ; pas de regression statut YAML.
- 2026-04-16 — CS bmad-create-story (mode create, passe anterieure) : enrichissement checklist + contexte dev ; fichier story pret VS validate.
- 2026-04-16 — Impl DS 23.1 : politique `PAHEKO_CLOSE_SALES_BUILDER_POLICY` (`aggregated_v22_7` défaut / `per_payment_method_v1`) ; transaction 1 en ADVANCED multi-lignes depuis révision `accounting_config_revision_id` ; remboursements inchangés 22.7 ; idempotence `sales_donations_per_pm_v1` ; observabilité `payload.paheko_close_batch_state_v1.sub_writes[].observability` ; OpenAPI + preview admin ADVANCED ; tests `test_story_23_1_paheko_per_method_close_batch.py` ; doc bascule § Brownfield canonical-chain.

### File List

- `recyclique/api/src/recyclic_api/core/config.py`
- `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py`
- `recyclique/api/src/recyclic_api/services/paheko_transaction_payload_builder.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/tests/test_story_22_7_paheko_close_batch_builder.py`
- `recyclique/api/tests/test_story_23_1_paheko_per_method_close_batch.py`
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-23-1-qa-chain.md`

