# Story 8.7 : Valider la réconciliation réelle avec Paheko

Status: done

**Story ID :** 8.7  
**Story key :** `8-7-valider-la-reconciliation-reelle-avec-paheko`  
**Epic :** 8 — Fiabiliser l'articulation comptable réelle avec Paheko

<!-- Ultimate context engine analysis completed — BMAD bmad-create-story (create / CS) 2026-04-10. Story = système de preuves ; pas de clôture narrative ; distinction locale / sync réelle Paheko / hors périmètre / dette. -->

## Story Preparation Gate (obligatoire — exécution DS / validation)

| Dimension | Valeur figée pour 8.7 |
|-----------|------------------------|
| **Nature de la story** | **Système de preuves** et **cadre d'honnêteté** sur l'exploitabilité de l'articulation comptable ; **pas** une story qui « déclare la réconciliation magique » ni qui ferme narrativement Epic 8 sans preuves exploitables. |
| **Slice opérationnel de référence** | Identique aux stories **8.1–8.6** : **clôture de session de caisse** → outbox `cash_session_close` → tentative HTTP vers Paheko (`PAHEKO_API_BASE_URL` + `PAHEKO_ACCOUNTING_CASH_SESSION_CLOSE_PATH`, désormais par défaut `POST /api/accounting/transaction`). Toute généralisation à d'autres `operation_type` hors slice = **hors DoD 8.7** sauf décision explicite au registre Epic 8. |
| **Quatre colonnes obligatoires (registre §2)** | Toute livraison 8.7 **met à jour** le tableau du registre `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` en séparant explicitement : **(1) Validé localement (preuve)** — pytest, logs, API Recyclique ; **(2) Validé en vraie sync-réconciliation Paheko** — preuve contre instance Paheko **réelle** ou environnement documenté équivalent (pas seulement `MockTransport`) ; **(3) Hors périmètre** — ex. UI Peintre, autres epics ; **(4) Dette restante** — gaps API Paheko, matrice 1.6, mocks, indisponibilité terrain. **Interdit** : fusionner ces colonnes en un seul « vert global ». |
| **Backend autoritaire** | Toute validation « réelle » passe par le chemin **Recyclique backend → Paheko** ; pas d'appel Paheko depuis Peintre ; alignement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`. |
| **Prérequis livrés (code)** | **8.1** outbox + transaction clôture ; **8.2** retries, idempotence, statuts ; **8.3** mappings clôture ; **8.4** quarantaine + audit transitions ; **8.5** corrélation + timeline ; **8.6** politique A1 / 409. |
| **Non-objectifs explicites** | Ne **pas** promettre réconciliation **globale** de tous les flux métier ; ne **pas** inventer des capacités Paheko non étayées (`references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` §9, Story **1.6**) ; ne **pas** faire d'Epic 9 dans 8.7. |
| **Distinction MockTransport vs Paheko réel** | Les tests existants (**8.1–8.6**) prouvent le **comportement Recyclique** avec **mocks HTTP** ; **8.7** exige en plus une **ligne de preuve documentée** pour ce qui est (ou n'est **pas**) validé contre **Paheko réel** — y compris la phrase honnête « non exécuté faute d'instance » si c'est le cas, **sans** présenter les mocks comme équivalents à la réconciliation distante. |

## Story

En tant qu'**équipe livraison et intégrité finance**,

je veux une **passe de validation** sur le comportement **réel** de synchronisation et de **réconciliation** (au sens contrat : alignement intentionnel, états FR24, pas double comptage) entre **Recyclique** et **Paheko**,

afin de disposer d'une **base comptable crédible** avant déploiement élargi, **sans** confondre vérité terrain et vérité comptable ni **cacher** les limites d'intégration sous un récit « tout est OK ».

## Contraintes produit et architecture (non négociables)

- **Brownfield-first** : réutiliser l'existant `recyclique/api`, outbox, processor, endpoints admin, OpenAPI — **pas** de refonte du slice pour « simplifier la démo ».
- **Autorité** : Recyclique = source de vérité **terrain** et orchestration sync ; Paheko = référence **comptable** cible ; les constats 8.7 **ne fusionnent** pas les deux en une seule SoT.
- **Contrat minimal** : `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — cycle de vie §2, outbox §3, corrélation §4, réconciliation / blocage sélectif §5, audit §6.
- **AR39** : toute nouvelle exposition HTTP (si indispensable pour des preuves automatisées) reste dans `contracts/openapi/recyclique-api.yaml` ; pas de second contrat parallèle.

## Acceptance Criteria

1. **Passe de validation documentée (nominal + dégradations)** — Étant donné qu'Epic 8 vise une articulation **réelle**, quand la passe 8.7 est exécutée, alors elle **vérifie** (preuves exploitables : procédure + résultats) que les comportements **nominal sync**, **retry**, **quarantaine**, **échec de mapping**, et **blocage sélectif (A1)** sont **cohérents** avec le contrat minimal et les stories **8.2–8.6**, **sans** affirmer au-delà des preuves fournies. [Sources : `epics.md` 8.7 AC1 ; registre Epic 8 §2]

2. **Matrice honnête local / Paheko réel / hors scope / dette** — Étant donné les risques de sur-interprétation des tests mockés, quand le livrable 8.7 est consolidé, alors le registre Epic 8 (tableau §2) distingue **clairement** : ce qui est validé **uniquement** en CI (SQLite / `MockTransport`), ce qui est validé **contre Paheko réel** (captures, logs, API distante, version Paheko notée), ce qui est **hors périmètre**, et la **dette** (gaps matrice 1.6, endpoint Paheko, credentials, etc.). [Sources : Story Preparation Gate (tableau quatre colonnes) ; `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` §2 ; `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` §9]

3. **Préservation du split terrain / compta** — Étant donné que le produit distingue vérité flux matière et vérité comptable, quand les constats 8.7 sont rédigés, alors ils **préservent** explicitement cette séparation (pas de phrase du type « Recyclique et Paheko sont toujours alignés » sans périmètre et preuve). [Sources : `epics.md` 8.7 AC2]

4. **Baseline crédible pour epics suivants** — Étant donné que les epics ultérieurs s'appuieront sur ce socle, quand 8.7 est terminée, alors le projet dispose d'un **résumé** : ce qui est **exploitable en production** sous quelles **conditions** (env, mapping, politique A1), et ce qui reste **conditionnel** aux gaps Paheko — formulé comme **hypothèses** ou **dette**, pas comme promesse. [Sources : `epics.md` 8.7 AC3]

5. **Couverture de preuve minimal par scénario (slice clôture)** — Étant donné le slice **cash_session_close**, quand les preuves sont rassemblées, alors **au moins une trace nommée** existe pour chaque famille suivante (peut combiner pytest + procédure manuelle + logs) : **(a)** clôture → outbox même transaction ; **(b)** succès processor → état terminal cohérent côté Recyclique ; **(c)** retry / backoff ; **(d)** plafond → quarantaine ; **(e)** mapping manquant / invalide → état explicite **avant** ou **sans** write Paheko dangereux ; **(f)** levée / rejet / confirm **8.4** avec audit **qui / quoi / quand** ; **(g)** corrélation **8.5** (filtre + timeline) ; **(h)** refus **8.6** (409) distinct du 200 + outbox. [Sources : stories **8.1–8.6** ; registre §2–§4]

6. **Scénario Paheko réel (ou constat d'impossibilité)** — Étant donné l'objectif de « réconciliation **réelle** », quand la story est close, alors **l'une** des deux options est documentée dans le registre (§2 ou annexe datée) : **(A)** procédure reproductible + preuve d'au moins **un** cycle clôture → tentative → observation côté Paheko (ou réponse d'erreur **exploitable** prouvant l'appel réel) ; **(B)** **constat** : impossible dans la fenêtre (pas d'instance, pas de credentials, version Paheko indisponible) avec **impact** sur la colonne « Validé Paheko réel » (**vide** ou **non validé**) et entrée **dette** précise — **sans** marquer la story « done » comme équivalent à **(A)** si seule **(B)** s'applique (ajuster le statut story / epic selon gouvernance sprint ; 8.7 reste « système de preuves »). [Sources : Story Preparation Gate (option (A)/(B)) ; `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` §2.4, §9]

7. **Non-régression automatisée** — Étant donné le gate Story Runner existant, quand 8.7 est livrée, alors la commande pytest ciblée Epic 8 (registre §4) **reste** exécutable et son résultat est **noté** (PASS / FAIL / sous-ensemble) dans le registre ou un `test-summary-story-8-7-*.md` sous `_bmad-output/implementation-artifacts/tests/` si le dépôt utilise ce pattern. [Sources : registre §4]

8. **OpenAPI / operationId** — Étant donné **8.1–8.6**, quand 8.7 touche le contrat, alors **aucun** `operationId` figé n'est renommé sans migration documentée ; tout ajout = bump semver draft YAML + `npm run generate` depuis `contracts/openapi` si le pipeline s'applique. [Sources : stories **8.5–8.6**]

## Tasks / Subtasks

- [x] **Cartographier les preuves existantes** (AC : 1, 5, 7)  
  - [x] Lister les fichiers pytest `test_story_8_*` et les assertions qui couvrent chaque famille (a)–(h).  
  - [x] Pointer les modules backend concernés (`paheko_outbox_service`, processor, `admin_paheko_outbox`, `admin_paheko_mapping`, `paheko_sync_final_action_policy`, clôture).  

- [x] **Exécuter / consigner le gate pytest Epic 8** (AC : 7)  
  - [x] Lancer la commande registre §4 (ou équivalent actualisé) ; capturer sortie + date + commit.  
  - [x] Si échec partiel brownfield : documenter le sous-ensemble **exact** « vert » **sans** prétendre suite complète. *(N/A — gate complet PASS.)*  

- [x] **Mettre à jour le registre — quatre colonnes** (AC : 2, 4, 6)  
  - [x] Pour chaque ligne pertinente du tableau §2 : remplir **Validé (preuve)** / **Non validé** / **Hors périmètre** / **Dette**.  
  - [x] Ajouter une sous-ligne ou note **MockTransport vs HTTP réel** pour le handler Paheko.  
  - [x] Si scénario réel : version Paheko, URL, compte technique, **pas** de secrets dans le dépôt (référence env locale uniquement). *(Exécuté post-epic : auth Basic réelle + flow Recyclique complet sur endpoint officiel.)*  

- [x] **Rédiger la procédure Paheko réel ou le constat B** (AC : 6)  
  - [x] Checklist pas à pas : préparer mapping **8.3**, session de caisse, clôture, observer outbox + effet Paheko. *(Exécutée post-epic : écriture distante observée `id=131`.)*  
  - [x] Documenter l’historique **B → A** pour conserver la vérité BMAD : état DS initial honnête, puis mise à jour registre §2 bis avec preuve réelle.  

- [x] **Synthèse « baseline crédible »** (AC : 3, 4)  
  - [x] 1–2 pages max dans le story file (section Dev Agent Record ou artefact lié) : conditions d'exploitation, limites, dette.  

- [x] **Revue contrat minimal** (AC : 1)  
  - [x] Vérifier alignement vocabulaire FR24 / §5.3 avec les constats (pas de contradiction).  

- [x] **Mise à jour index artefacts** (si paragraphe significatif ajouté au registre)  
  - [x] `references/artefacts/index.md` si la convention du projet l'exige pour la traçabilité.  

## Dev Notes

### Notes structure projet

- Backend : `recyclique/api/src/recyclic_api/`  
- Contrats : `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts`  
- Registre Epic 8 : `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`  

### Fichiers et zones probables (lecture / validation — pas nécessairement modification)

| Zone | Fichiers (indicatif) |
|------|----------------------|
| Processor / HTTP Paheko | Services outbox, client httpx, `MockTransport` en test |
| Clôture | `application/cash_session_closing.py`, `services/cash_session_service.py` |
| Politique A1 | `services/paheko_sync_final_action_policy.py` |
| Admin outbox / audit | `api/api_v1/endpoints/admin_paheko_outbox.py` |
| Mappings | `api/api_v1/endpoints/admin_paheko_mapping.py` |
| Tests | `recyclique/api/tests/test_story_8_1_*.py` … `test_story_8_6_*.py` |

### operationId figés (non-régression)

Ne pas renommer sans migration : `recyclique_cashSessions_closeSession`, `recyclique_pahekoOutbox_*`, `recyclique_pahekoMapping_*`, `recyclique_exploitation_getLiveSnapshot`, etc. (inventaire complet : registre Epic 8 §3).

### Conformité architecture (extraits)

Référence canonique des exigences **AR\*** : `_bmad-output/planning-artifacts/epics.md` (section « Architecture Requirements » en tête de fichier, ex. AR8, AR11, AR17, AR21, AR39).

- **AR8** — Paheko via backend uniquement.  
- **AR11** — Outbox durable ; preuves d'atomicité déjà en **8.1**.  
- **AR17** — Corrélation sur toute investigation 8.7.  
- **AR21** — Erreurs structurées (dont 409 **8.6**).  
- **AR39** — OpenAPI reviewable.  

### Exigences de test

- **Minimum** : gate pytest registre §4 (8.1–8.6 + `test_sync_service` / `test_dashboard_stats` si inclus dans le gate en vigueur).  
- **Distinction** : succès pytest **ne remplace pas** la colonne « Paheko réel » ; désormais, cette colonne est complétée par une preuve réelle documentée dans le registre §2 bis.  

**Commande gate (copie — alignée registre Epic 8 §4)** — depuis `recyclique/api` :

```bash
python -m pytest -q tests/test_story_8_1_paheko_outbox_slice.py tests/test_story_8_2_paheko_outbox_retry_idempotence.py tests/test_story_8_3_paheko_mapping.py tests/test_story_8_4_paheko_quarantine_resolution.py tests/test_story_8_5_paheko_correlation.py tests/test_story_8_6_selective_blocking.py tests/test_sync_service.py tests/test_dashboard_stats.py
```

## Definition of Done (honnête)

- AC **1 à 8** satisfaits **au sens preuve** : pas de claims non étayés.  
- Registre Epic 8 : tableau §2 **mis à jour** avec les quatre colonnes et note Mock vs réel.  
- Si l’état DS initial était en **(B)**, la story conserve cet historique, mais le registre final doit refléter la preuve réelle obtenue ensuite si elle existe ; **interdit** de laisser cohabiter deux vérités contradictoires.  
- Aucune régression **operationId** ; OpenAPI cohérent si modifié.  
- **`sprint-status.yaml`** : à l’étape **create-story (CS)** uniquement, le fichier **n’est pas** modifié (réservé au Story Runner / **DS** une fois la story prête). Après **DS** / fin de cycle Story Runner, la transition de statut (ex. **review**) est **attendue** et documentée dans le Dev Agent Record.  

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 8 note agents, Story **8.7** ; stories **8.1–8.6** ; exigences **AR8 / AR11 / AR17 / AR21 / AR39**.  
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` — registre, commandes pytest, §2–§4.  
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` — §2–§6, §9 gaps.  
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — Epic 8, pas de métier sync dans Peintre.  
- Stories implémentation Epic 8 (continuité) :  
  - `_bmad-output/implementation-artifacts/8-1-implementer-un-premier-slice-syncable-de-bout-en-bout-recyclique-paheko.md`  
  - `_bmad-output/implementation-artifacts/8-2-gerer-lidempotence-les-retries-et-les-statuts-explicites-de-sync.md`  
  - `_bmad-output/implementation-artifacts/8-3-gerer-les-correspondances-site-caisse-emplacements-paheko.md`  
  - `_bmad-output/implementation-artifacts/8-4-encadrer-la-quarantaine-et-la-resolution-manuelle-des-ecarts-persistants.md`  
  - `_bmad-output/implementation-artifacts/8-5-mettre-en-place-le-suivi-et-la-correlation-inter-systemes-des-operations.md`  
  - `_bmad-output/implementation-artifacts/8-6-gerer-le-blocage-selectif-des-actions-critiques-finales.md`  
- `references/paheko/liste-endpoints-api-paheko.md` / matrice **1.6** — pour cadrer les gaps sans inventer l'API Paheko.  

## Intelligence story précédente (8.6)

- La politique **(A1)** et les codes **409** / `policy_reason_code` sont le **dernier garde-fou** avant clôture ; la validation 8.7 doit inclure un cas **nommé** où le refus est **distinct** du succès clôture + outbox.  
- Les tests **8.6** ont validé que l'activité sur **autres** sessions peut rester permise : ne pas utiliser 8.7 pour réintroduire un « gel global ».  

## Recherche technique (rappel — pas de version inventée)

- La vérification terrain a confirmé l’endpoint officiel `POST /api/accounting/transaction` pour le slice courant ; les dettes résiduelles portent désormais sur la reconnaissance distante des headers et sur une modélisation comptable plus riche des écarts, pas sur le path nominal du slice.  

## Dev Agent Record

### Agent Model Used

Sous-agent Task (bmad-dev-story / Story Runner BMAD), modèle Cursor orchestration parent.

### Debug Log References

Aucun incident bloquant ; gate pytest unique run ~60 s (Python 3.13, warnings Pydantic deprecation connus).

### Completion Notes List

- **AC6** : état DS initial en **Option B** honnête, puis fermeture post-epic en **Option A minimale** : `PAHEKO_API_USER` / `PAHEKO_API_PASSWORD` fournis hors dépôt, auth Basic réelle validée, slice Recyclique réaligné sur `POST /api/accounting/transaction`, écriture distante observée `id=131`, état Recyclique `delivered` / `resolu`.
- **AC1 / contrat minimal** : les constats restent alignés FR24 (`a_reessayer` / `en_quarantaine` / `resolu` / `rejete`) et §5.3 (blocages finaux critiques, Paheko = référence comptable cible) — **sans** affirmer alignement terrain/compta au-delà des preuves ; split SoT explicité dans le registre §2.
- **AC7** : gate registre §4 **PASS**, 65 tests, date 2026-04-10, commit `2369024` — détail `_bmad-output/implementation-artifacts/tests/test-summary-story-8-7-e2e.md`.
- **Baseline exploitation (AC3, AC4)** — **exploitable en prod sous conditions** : PostgreSQL + migrations Epic 8 ; variables `PAHEKO_*` ; mappings clôture **8.3** renseignés ; politique **A1** active ; monitoring outbox / quarantaine via API admin documentées. **Dette résiduelle** : reconnaissance distante des headers `X-Correlation-ID` / `Idempotency-Key`, test client HTTP dédié 409 (désormais couvert), et éventuelle modélisation comptable plus riche des écarts.
- **Sprint** : `8-7-valider-la-reconciliation-reelle-avec-paheko` → **done** ; **epic-8** → **done** avec historique explicite **B à la clôture DS, A après consolidation terrain/documentaire**.

### File List

- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` (§2 tableau quatre colonnes, §2 bis AC6 A post-epic, §4 gate 8.7, §6 chronologie)
- `references/artefacts/index.md` (entrée registre Epic 8 enrichie)
- `_bmad-output/implementation-artifacts/tests/test-summary-story-8-7-e2e.md` (nouveau)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (8-7 → done ; epic-8 → done)
- `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md` (ce fichier — statut, tâches, Dev Agent Record)

## Change Log

- **2026-04-10** — DS 8.7 : consolidation preuves documentaires, registre §2/§2 bis, gate pytest PASS, synthèse tests 8.7, index artefacts ; état initial **AC6 option B** explicite.
- **2026-04-10 (post-epic)** — réalignement du slice sur `POST /api/accounting/transaction`, preuve terrain Recyclique → Paheko obtenue, artefacts mis à jour vers **Option A minimale**.
- **2026-04-10** — Story Runner : CS→VS (retry doc) → DS → gates → QA → CR (CR1 doc → retry gates → CR2 **APPROVED**) ; story **done** + sprint ; correctifs **DoD** sprint-status + tableau AC5 **(e)** / **(e′)**.

---

**Note CS :** analyse contexte exhaustive — story optimisée pour agent dev / validation ; limites **MockTransport** vs **Paheko réel** explicitées pour éviter toute « complétion mensongère ».
