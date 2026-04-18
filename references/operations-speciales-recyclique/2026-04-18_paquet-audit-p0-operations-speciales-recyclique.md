# Paquet d’audit P0 — Opérations spéciales caisse (Epic 24.1)

**Date de livraison :** 2026-04-18  
**Story :** `24-1-audit-repo-aware-matrices-prd-depot-et-plan-de-tests-p0`  
**Sources de vérité lues :** PRD v1.1, prompt ultra opérationnel, ADR D1, readiness 2026-04-18, chaîne canonique Paheko.

---

## 1. Méthode d’audit repo-aware

- **Lecture ciblée** des documents listés en § Références croisées.  
- **Recherche dans le dépôt** (`grep` / exploration de chemins) sur : `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`, `sale_service.py`, `models/sale.py`, `sale_reversal.py`, `paheko_close_batch_builder.py`, migrations permissions, `peintre-nano/public/manifests/navigation.json`, domaines `peintre-nano/src/domains/cashflow/`.  
- **Règle :** aucune ligne du présent document n’affirme une existence code sans **chemin relatif au repo** ou mention explicite « absent / non trouvé ».

---

## 2. Stratégie Paheko — outbox, idempotence, pas de second rail

Alignement **ADR D1** (`_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`) :

- Une seule autorité financière : référentiel moyens → **journal `PaymentTransaction`** (dont remboursements) → **snapshot figé de clôture** → **builder Paheko** → **outbox idempotente** ; pas d’export ad hoc hors cette chaîne.

Document de référence chaîne : `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (référentiel, journal, snapshot, builder multi-sous-écritures, outbox N sous-écritures / batch).

**Contexte Epics livrés :**

- **Epic 8** : transport, retries, quarantaine, corrélation — tout nouveau flux financier doit réutiliser les patterns de sync / état (cf. ADR D7 visibilité sync).  
- **Epics 22–23** : snapshot et builder unique, ventilation détaillée par moyen (Story 23.4 — pas de mode agrégé concurrent pour le bloc concerné).

**Conséquence pour Epic 24 :** les parcours « opérations spéciales » doivent **s’brancher** sur les types existants (`Sale`, `SaleReversal`, `PaymentTransaction`, clôture, outbox) plutôt que créer un rail Paheko parallèle.

---

## 3. Matrice PRD ↔ dépôt (parcours / capacités)

Légende : **Implémenté** | **Partiel** | **Manquant**

| Parcours / capacité PRD | État | Pointeurs code / UI / tests |
|-------------------------|------|-----------------------------|
| **Annulation** (vente annulable, permission `caisse.cancel`, fenêtre temporelle) | **Manquant** | Permission `caisse.cancel` : **non trouvée** dans `recyclique/api` (grep migrations / `permission`). Pas d’endpoint dédié « annulation » distinct du remboursement. Contours partiels : abandon ticket en attente `POST …/sales/{sale_id}/abandon-held` (`sales.py`), correction sensible super-admin `PATCH …/sales/{sale_id}/corrections` (`sales.py`, Story 6.8). |
| **Remboursement standard** (lié à vente source, `caisse.refund`) | **Implémenté** | API : `POST /v1/sales/reversals` → `create_sale_reversal` (`sales.py`), logique `SaleService.create_sale_reversal` (`sale_service.py`), modèle `SaleReversal` (`models/sale_reversal.py`), journal `PaymentTransaction` REFUND_PAYMENT. UI : route `/caisse/remboursement`, entrée nav `cashflow-refund` (`peintre-nano/public/manifests/navigation.json`), wizard `CashflowRefundWizard` (registre `register-cashflow-widgets.ts`), client `sales-client.ts`. Tests : `recyclique/api/tests/caisse_sale_eligibility.py`, nombreux `test_story_22_*` / `test_story_6_*`. |
| **Remboursement N-1 (exercice antérieur clos)** | **Partiel / implémenté côté règles** | Branche expert : `AccountingPeriodAuthorityService.resolve_refund_branch`, flags `expert_prior_year_refund` + permission `accounting.prior_year_refund` (`sale_service.py`, migration `s22_5_refund_canonical_accounting_period_authority.py`). Builder / snapshot : `cash_session_close_snapshot`, `paheko_close_batch_builder.py`, tests `test_story_22_7_*`. UI Peintre : champs alignés OpenAPI dans `sales-client.ts` / wizard remboursement. |
| **Remboursement sans ticket** (permission dédiée, step-up, motifs, **jamais** fusionné au nominal) | **Manquant** | Aucun endpoint ni permission type `refund.exceptional` repéré. ADR D4 (`2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`) tranche le principe produit ; **implémentation = story 24.5+**. |
| **Décaissement** (sous-types, `cash.disbursement`) | **Manquant** | Permission PRD `cash.disbursement` : **absente** du code grep. Le builder Paheko mentionne des libellés « décaissement » pour certains codes moyen (`paheko_close_batch_builder.py`, fonction `_paheko_pm_decaissement_label_fr`) — **appui comptable partiel**, pas le parcours métier complet PRD. |
| **Mouvement interne** (`cash.transfer`) | **Manquant** | Permission `cash.transfer` : **non trouvée**. |
| **Échange** (conteneur matière + sous-flux vente/remboursement) | **Manquant** | Pas de route ni modèle « échange » dédié repéré ; à concevoir en s’appuyant sur vente + remboursement (PRD §11). |
| **Tags métier / ticket 0 €** | **Partiel** | Ticket 0 € et variantes : champs `special_encaissement_kind`, `social_action_kind` sur `Sale` / schémas (`schemas/sale.py`, `models/sale.py`), permissions `caisse.special_encaissement`, `caisse.social_encaissement`. **Écart PRD :** tags liste PRD (gratiféria, moins de 18 ans, etc.) = **modèle produit plus riche** que les enums techniques actuels — à mapper en configuration / backlog tags (stories 24.9–24.10). |
| **Sync Paheko / visibilité état** | **Partiel (chaîne clôture)** | Outbox et sync session clôturée : couverts par Epics 8, 22–23 (`paheko_close_batch_builder`, services sync, tests Epic 8). **Écart PRD D7 :** visibilité sync **par opération terrain** (hors seulement batch clôture) pour nouveaux parcours = **à préciser** dans les stories UI 24.2+. |

---

## 4. Matrice permissions / niveau de preuve / acteurs

| Élément PRD | Permission ou mécanisme réel | Preuve / step-up | Commentaire |
|-------------|---------------------------|------------------|-------------|
| N1–N3 (PRD §14) | Pas de table N1–N3 en base ; **Niveau = exigence produit** à mapper sur motifs + audit | Step-up PIN : `X-Step-Up-Pin` pour corrections sensibles, ops accounting expert (`step_up.py`, endpoints admin compta) | Pour opérations spéciales futures : réutiliser **step-up + audit** existants ; distinguer initiateur / validateur (ADR D6) dans payloads / journaux. |
| `caisse.refund` | Présent (migration `d7f1_story_6_4_sale_reversals_and_refund_perm.py`, tests eligibility) | Idem garde-fous session | OK remboursement standard. |
| `accounting.prior_year_refund` | Présent (migration s22_5) | Expert path obligatoire si branche PRIOR_CLOSED | OK Story 22.5. |
| `caisse.cancel` | **Absent** | N1 cible PRD | **NEEDS_HITL** : concevoir permission + règles fenêtre (story dédiée post-24.1). |
| `refund.exceptional` (sans ticket) | **Absent** | N3 + PIN (PRD) | **NEEDS_HITL** : nouveau module permission + API (cf. readiness). |
| `cash.disbursement` | **Absent** | N2–N3 selon sous-type | Story 24.7. |
| `cash.transfer` | **Absent** | N2–N3 | Story 24.8. |
| `caisse.exchange` | **Absent** | N0–N3 selon cas | Story 24.6. |
| `caisse.sale_correct` | Présent (super-admin, step-up) | Très sensible | Parité correction post-hoc ≠ annulation PRD. |

---

## 5. Machine d’états opérationnelle (résumé)

États de vente pertinents (`SaleLifecycleStatus` dans `models/sale.py`) : **`held`** → finalisation → **`completed`** ; **`abandoned`** pour hold annulé ; remboursement via document **`SaleReversal`** lié à une source **`completed`** (unique par vente source).

```text
[Panier held] --finaliser--> [completed] --POST /reversals--> [reversal + REFUND_PAYMENT journal]
          \--abandon-held--> [abandoned]

[completed] --correction 6.8 (super-admin+step-up)--> [completed] (champs corrigés, tracé)
```

**Écarts PRD :** pas d’état « annulé » métier distinct de l’abandon hold ou du remboursement ; pas d’états pour décaissement / mouvement interne / échange.

---

## 6. Plan de tests P0 (cible stories 24.2–24.5)

Objectif : jeux minimaux **nominal**, **expert**, **dégradé Paheko** (Epic 8 : rejet / quarantaine là où applicable).

| ID | Famille | Scénario | Outil / emplacement cible |
|----|---------|----------|---------------------------|
| P0-R1 | Remboursement standard | Vente completed → POST reversal idempotent → journal REFUND_PAYMENT + agrégats session | pytest existants Story 6.4 / 22.x ; étendre si nouveaux champs UI |
| P0-R2 | N-1 clos | Branche PRIOR_CLOSED sans expert → erreur `[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]` ; avec permission + flag → succès | `sale_service.py` + tests 22.5 |
| P0-R3 | Sans ticket | **Futur** : permission exceptionnelle + step-up + audit (pas de test vert avant modèle) | pytest **à créer** story 24.5 |
| P0-S1 | Sync / clôture | Snapshot → builder → outbox ; pas de régression ventilation agrégée (Epic 23.4) | `test_story_22_7_*`, `test_story_23_4*` si présents, gate Paheko |
| P0-U1 | Peintre remboursement | Parcours `/caisse/remboursement` avec enveloppe permissions | vitest / e2e cashflow (étendre lors du hub 24.2) |
| P0-T1 | Tags / 0 € | Vente gratuite + tag social ou spécial ; pas d’écriture financière inattendue | tests 6.5 / 6.6 + snapshot |
| P0-A1 | Annulation (cible) | **Futur** `caisse.cancel` + règles fenêtre | pytest **à créer** quand API définie — **NEEDS_HITL** sur règles |

**Dégradé Paheko :** reprendre les scénarios Epic 8 (quarantaine, reprise manuelle) sur **batch clôture** ; pour D7 terrain par opération, ajouter des cas quand l’UI exposera l’état (backlog 24.2+).

---

## 7. Arbitrages ouverts (readiness + audit)

1. **Remboursement sans ticket**  
   - **Question :** nouveau document métier (`RefundExceptional`) vs extension contrôlée de `sale_reversal` avec garde-fous ?  
   - **Options :** (A) table dédiée + API séparée ; (B) reversal avec `source_sale_id` nullable + contraintes fortes.  
   - **Recommandation :** préférer **API et permission séparées** (alignement ADR D4) ; valider avec produit.  
   - **Statut :** **NEEDS_HITL** jusqu’à décision écrite.

2. **Ventilation Paheko remboursements post–Epic 23**  
   - **Constat :** chaîne actuelle = snapshot + builder unique + sous-écritures déterministes (`cash-accounting-paheko-canonical-chain.md`).  
   - **Recommandation :** toute évolution remboursement passe par le **même builder** ; pas de réintroduction d’agrégat masqué.  
   - **Statut :** piste technique claire ; surveillance régression en CI (tests 22.7 / 23.4).

3. **Charge vs permission N1–N3**  
   - **Question :** formaliser N1–N3 en règles serveur (seuils, codes motifs) ou uniquement guide produit ?  
   - **Recommandation :** commencer par **table de correspondance** permission + step-up (présent doc) puis durcir par story.  
   - **Statut :** **NEEDS_HITL** léger sur seuils métier.

---

## 8. QA Gate story 24.1 (auto-vérification)

| # | Critère | Preuve |
|---|---------|--------|
| Q1 | AC epics couverts | Sections 3–7 + stratégie §2 |
| Q2 | Chemins existants ou « absent » | Matrice §3 |
| Q3 | ADR D1 + chaîne canonique + Epics 8 / 22–23 | §2 |
| Q4 | Index `references/operations-speciales-recyclique/` | Fichier présent + entrée dans `index.md` |

---

## Références croisées

- PRD : `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`  
- Prompt : `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md`  
- ADR : `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`  
- Chaîne canonique : `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`  
- Readiness : `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`  
- Epic 24 : `_bmad-output/planning-artifacts/epics.md`
