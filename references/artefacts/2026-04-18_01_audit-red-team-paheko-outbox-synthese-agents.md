# Audit Red Team et durcissement — outbox Paheko, bandeau live, support super-admin

**Date :** 2026-04-18  
**Dernière mise à jour :** 2026-04-18  
**Type :** artefact de handoff **agent → agent** (BMAD, correct course, stories, spikes)  
**Statut :** constat factuel + risques + suites possibles — **pas** une spec produit approuvée seule.

---

## 0. Pourquoi ce document existe

Suite de sessions (analyse Murphy, Red Team en sous-agents, **validation QA2**). L’objectif est de **figer** ce qui a été vérifié dans le code, ce qui reste **hypothèse / dette**, et **où** agir (produit, ops, tests) pour limiter les surprises en **production**.

**Public cible :** agent chargé d’un `correct course`, d’une `create-story`, d’un epic ou d’un spike — lire **au minimum** les sections 1, 3, 4 et 6.

**Suivi Kanban Idées (version lisible, priorités terrain)** : [`references/idees-kanban/a-faire/2026-04-18_durcissement-sync-paheko-outbox-post-audit.md`](../idees-kanban/a-faire/2026-04-18_durcissement-sync-paheko-outbox-post-audit.md) — même sujet que ce document, rédigé sans jargon ; seeds PAHEKO-SYNC-* et rappel « quoi faire vraiment ».

**Documents liés (déjà dans le dépôt) :**

| Fichier | Rôle |
|---------|------|
| `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` | Vocabulaire et invariants **documentaires** Epic 1.5 (sync / réconciliation) — ne remplace pas le détail code outbox. |
| `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` | Registre exploitabilité **Epic 8** (alignement stories 8.x). |
| `doc/modes-emploi/mode-emploi-parametrage-comptable-superadmin.md` | Mode d’emploi super-admin Paheko support / clôture (vue terrain). |

**Références code (points d’entrée)** — chemins relatifs racine dépôt :

- `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`
- `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py`
- `recyclique/api/src/recyclic_api/models/paheko_outbox.py`
- `peintre-nano/src/domains/cashflow/cashflow-operational-sync-notice.tsx`
- `peintre-nano/src/domains/admin-config/AdminPahekoDiagnosticsSection.tsx`
- `peintre-nano/src/api/admin-paheko-outbox-client.ts`
- `contracts/openapi/recyclique-api.yaml` (admin paheko-outbox)

**Tests backend déjà présents (non exhaustifs du périmètre risque)** :

- `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py` — idempotence, reject, OpenAPI ; inclut assertion `recyclique_pahekoOutbox_deleteItemFailed`.
- `recyclique/api/tests/test_story_8_4_paheko_quarantine_resolution.py` — levée quarantaine, reject, audit, **DELETE** super-admin / 403 admin / 409 pending.
- `recyclique/api/tests/test_story_22_7_outbox_processor_batch.py` — batch processor, `partial_success`, quarantaine sous-écritures.

Les **gaps** listés section 5 restent valides (coexistence `rejete` + `a_reessayer` au snapshot, DELETE + payload partiel documenté, etc.).

---

## 1. Synthèse exécutive (vérités utiles)

1. **Source de vérité caisse locale** : la clôture et les montants restent **Recyclique** ; l’outbox Paheko est une **file sortante** asynchrone, pas une transaction ACID conjointe avec Paheko.
2. **Succès technique outbox** : les réponses HTTP **2xx** et **409** sont traitées comme **livraison / résolution** sur le chemin nominal (`delivered`, `sync_state_core` vers `resolu` selon branches) — **409** est une **hypothèse contractuelle** « doublon / idempotence acceptable », pas une preuve métier fine sans lecture du corps côté Paheko.
3. **Mode batch (clôture ADVANCED multi POST)** : un état JSON (`partial_success`, sous-écritures avec `idempotency_sub_key`) peut exister dans le **payload** persisté ; il **n’est pas** projeté dans `sync_operational_summary` du live snapshot.
4. **Agrégat `worst_state` par site** : utilise `_WORST_SYNC_RANK` ; **`a_reessayer` (rang 3) domine `rejete` (rang 2)**. Conséquence : si **deux lignes** coexistent sur le même site (une en rejet explicite, une en « à réessayer »), le **pire état exposé** peut être **`a_reessayer`** — le bandeau caisse associé est **bleu** (non bloquant), pas orange. **Si** le seul `worst_state` exposé est **`rejete`** ou **`en_quarantaine`**, la notice caisse (`cashflow-operational-sync-notice.tsx`) utilise la **même branche orange** « bloquant » pour les deux — à ne pas confondre avec le cas « masqué » par `a_reessayer`.
5. **Repli si agrégat outbox indisponible** : code `ob_sum if ob_sum is not None else _sync_summary(envelope)` — le repli `_sync_summary` présente un **`worst_state` nominal `resolu`**. Les causes de `None` pour `worst_paheko_outbox_summary_for_site` peuvent inclure **plus** que « aucune ligne outbox » (vide métier) ; **à documenter** en prod pour éviter de lire « tout va bien » alors que l’agrégat a échoué.
6. **DELETE super-admin** (`DELETE .../admin/paheko-outbox/items/{id}`) : autorisé uniquement si **`outbox_status == failed`** ; **pas** de contrôle automatique du **payload** (ex. sous-écritures déjà marquées **delivered** dans un batch partiel avant quarantaine).
7. **Reject** (`POST .../reject`) : interdit si déjà **delivered** / **resolu** — aligné Story 8.2.

---

## 2. Matrice des affirmations auditées (QA2 + Red Team)

À utiliser comme « checklist de vérité » pour une story ou un spike — pas comme AC tant qu’elles ne sont pas arbitrées produit.

| ID | Affirmation | Verdict QA2 | Action typique si on veut corriger |
|----|----------------|-------------|-------------------------------------|
| **A** | Coexistence `rejete` + `a_reessayer` sur un même site : `worst_state` peut être `a_reessayer` → bandeau bleu peut **masquer** un abandon explicite. | **Validé** | Règle d’agrégat ou UI (second indicateur, libellé composite, doc ops). |
| **B** | `partial_success` hors `sync_operational_summary` ; bandeau bleu peut **sous-communiquer** une livraison partielle Paheko. | **Validé** | Étendre agrégat ou bandeau ; ou runbook terrain explicite. |
| **C** | **409** assimilé au succès comme les **2xx** pour la décision livré — pas de branche métier distincte sur le corps. | **Validé** (avec nuance : snippets / parse RID selon chemins) | Contrat Paheko documenté + tests d’intégration réels si besoin. |
| **D** | DELETE sur `failed` sans inspection du payload (IDs distants / batch partiel). | **Validé** | Garde-fou métier optionnel ; procédure ops « ne pas delete si … ». |
| **E** | `None` agrégat → repli **`resolu` nominal**. | **Partiellement validé** | Préciser les **causes** de `None` dans la doc et éventuellement différencier vide vs erreur. |

**Nuances à intégrer dans toute copie future de la synthèse :**

- **(C)** : dire « **assimilé** au chemin succès » plutôt que « strictement identique à 2xx » (snippet, parse `remote_transaction_id`, placeholder `idempotent_duplicate` en batch).
- **(E)** : ne pas réduire à « pas de lignes = résolu » sans mentionner **indisponibilité** possible de l’agrégat.

---

## 3. Scénarios Murphy (liste de travail)

| Scénario | Effet typique | Récupération |
|----------|----------------|--------------|
| Réseau / timeout après POST réussi côté Paheko | Retry + idempotence → souvent **409** ou doublon géré | Vérifier Paheko + logs corrélation |
| Batch : une sous-écriture OK, une autre **400/403** terminal | Quarantaine, `partial_success` possible côté JSON | **Manuel Paheko** + lecture `sub_writes` dans support admin |
| Mapping / snapshot invalide avant HTTP | Quarantaine **sans** POST (Story 8.3) | Corriger config / données ; levée si applicable |
| Payload accepté par Paheko mais **montant faux** | `delivered` dans Recyclique | **OD / correction Paheko** — hors scope retry automatique |
| Double worker sur même item (SQLite vs Postgres) | Comportement divergent ; prod vise Postgres + verrous | Tests intégration charge |
| Admin **DELETE** avec batch partiel déjà livré | Trace Recyclique effacée, Paheko peut contenir des écritures | **Procédure ops** ; éviter DELETE sans analyse payload |

---

## 4. API et UI déjà en place (2026-04-18)

- **`POST .../lift-quarantine`** : `en_quarantaine` → `a_reessayer` + `pending` (Story 8.4). Dans l’UI support Peintre, le bouton « Retirer de la quarantaine » n’apparaît que si **`sync_state_core === en_quarantaine`** (pas pour tout `failed` — ex. `rejete` sans quarantaine).
- **`POST .../reject`** : abandon tracé → `rejete` (soumis aux règles terminal_sync).
- **`DELETE .../items/{id}`** : super-admin, **204** si `failed` uniquement — **OpenAPI** : `recyclique_pahekoOutbox_deleteItemFailed`.
- **Peintre — Paheko support** : `AdminPahekoDiagnosticsSection` — actualisation liste, inspecter, levée quarantaine (condition ci-dessus), **supprimer** pour **toute** ligne affichée en **`outbox_status === failed`** avec modal de confirmation.

---

## 5. Gaps tests (backlog suggestion, non priorisé seul)

La suite **8.2 / 8.4 / 22.7** couvre déjà une partie du périmètre ; les lignes ci-dessous visent les **trous** ou **documentation de comportement** encore ouverts (cf. QA documentaire sur cet artefact, 2026-04-18).

| Priorité suggérée | Sujet |
|-------------------|--------|
| P0 | Test (ou spec) **documentant** `rejete` + `a_reessayer` simultanés → `worst_state` attendu. |
| P0 | Couverture ou doc **partial_success** + bandeau (écart volontaire vs bug). |
| P1 | DELETE sur ligne `failed` dont le payload indique déjà une livraison partielle — au moins **test de non-régression** + checklist ops. |
| P2 | Catalogue HTTP élargi (429, 502/503/504), transport, concurrence processor. |

---

## 6. Seeds BMAD — pistes pour un autre agent

**À ne pas traiter comme ordre** : ce sont des **amorces** pour `create-story`, spike ou `correct course`, à prioriser avec le PO.

| Seed | Idée courte | Type suggéré |
|------|-------------|--------------|
| **PAHEKO-SYNC-AGR-01** | Revoir règle `worst_state` ou l’UX quand **plusieurs** `sync_state_core` coexistent (rejet + à réessayer). | Story produit + technique |
| **PAHEKO-SYNC-SNAP-01** | Exposer ou documenter **`partial_success`** / risque partiel dans le live snapshot ou le bandeau. | Story ou spike |
| **PAHEKO-SYNC-DEL-01** | Garde-fou **DELETE** (avertissement ou blocage si payload batch indique livraisons partielles). | Story |
| **PAHEKO-SYNC-REL-01** | Clarifier causes de **`None`** dans `worst_paheko_outbox_summary_for_site` et comportement du repli `resolu`. | Doc + test |
| **PAHEKO-SYNC-QA-01** | Suite pytest adversariale HTTP / batch (cf. section 5). | Story technique |

**Correct course potentiel :** si le sprint courant assume « bandeau = vérité terrain », les seeds **AGR-01** et **SNAP-01** sont des **écarts explicites** entre intention et implémentation — à traiter comme **changement de scope** ou **dette acceptée documentée**.

---

## 7. Limites de cette analyse

- Pas de preuve **HTTP réelle** vers une instance Paheko de production dans ce document — les sémaphores **409** et corps de réponse restent **contractuels**.
- Les passes QA2 n’ont pas **toutes** les branches SQL de `worst_paheko_outbox_summary_for_site` ligne à ligne ; tout changement critique devrait **relire** cette fonction avant arbitrage.
- Évolution du code après **2026-04-18** : **recouper** les fichiers listés en section 0 avant de figer une story.

---

## 8. Historique des mises à jour

| Date | Changement |
|------|------------|
| 2026-04-18 | Création — consolidation sessions Red Team, QA2, implémentation DELETE support. |
| 2026-04-18 | Passage QA sur l’artefact : verdict **PASS avec réserves** ; ajouts références tests 8.2 / 8.4 / 22.7, précision lift UI vs delete, lien bandeau `rejete` / quarantaine, clarification section 5 + gaps. |
| 2026-04-18 | Entrée Kanban **`a-faire`** + lien depuis §0 — `references/idees-kanban/a-faire/2026-04-18_durcissement-sync-paheko-outbox-post-audit.md` ; scan **TODO/FIXME** Paheko/outbox documenté dans cette fiche. |
