# Story 22.8 : Rebaseliner les preuves qualite et valider bout en bout la chaine caisse -> snapshot -> ecriture -> `Paheko`

Status: done

**Story key :** `22-8-rebaseliner-les-preuves-qualite-et-valider-bout-en-bout-la-chaine-caisse-snapshot-ecriture-paheko`  
**Epic :** 22 - Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique  

<!-- VS bmad-create-story validate 2026-04-16 : matrice 4 colonnes + chemins tests + ancres 6.7 / 8.7 / 22-6 / 22-7 + baseline Epic 10 -->

## Story Preparation Gate (obligatoire — meme discipline que `8.7`)

| Dimension | Valeur figee pour 22.8 |
|-----------|-------------------------|
| **Nature** | Story de **preuves et honnetete** sur le **rail comptable canonique** (pas une « demo verte » ni une fermeture narrative d'Epic 22). |
| **Chaîne couverte (minimum)** | **caisse (vente / session)** → **snapshot figé** (`22.6`) → **builder sous-écritures + outbox** (`22.7`) → **résultat de sync observable** (statuts locaux + preuve distante ou constat B, comme en `8.7`). |
| **Quatre colonnes obligatoires** | Tout livrable final **sépare** : **(1) Preuve locale** (pytest, logs, API Recyclique, e2e headless) ; **(2) Preuve réelle `Paheko`** (instance réelle ou équivalent documenté — pas équivalence implicite avec `MockTransport`) ; **(3) Hors périmètre** ; **(4) Dette restante**. **Interdit** : fusionner en un seul « tout vert ». Reprendre la logique du tableau dans `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md` (Story Preparation Gate). |
| **Baseline Epic 10** | Le livrable doit être **réutilisable** par **Epic 10** (`_bmad-output/planning-artifacts/epics.md`, section « Epic 10 : Industrialiser… ») pour les **gates de readiness** : conditions d’exécution, périmètre, dettes nommées. |
| **Anti-faux-vert** | Si la colonne **preuve réelle `Paheko`** est vide ou partielle : **nommer la dette** explicitement ; ne pas présenter les seuls tests mockés comme couverture Paheko. |

## Story

As a release-readiness team,  
I want the historical proofs updated for the canonical accounting rail,  
So that old evidence is not mistaken for coverage of the new model.

## Acceptance Criteria

1. **Preuves historiques relues honnêtement** - Les preuves `Epic 6` et `Epic 8` sont relues en distinguant ce qui reste valide et ce qui ne couvre plus le modele canonique.
2. **DoD et gates rebases** - Les DoD, gates et preuves demandes par le nouveau rail comptable sont rebases explicitement.
3. **Chaine e2e cible nommee** - Le package de validation couvre au minimum la chaine caisse -> snapshot fige -> generation d'ecriture -> resultat de sync visible.
4. **Matrice d'honnetete obligatoire** - La validation finale distingue explicitement : preuve locale, preuve reelle `Paheko`, hors perimetre, dette restante.
5. **Pas de faux vert global** - Les dettes ou impossibilites restantes sont nommees ; elles ne sont pas absorbees dans un recit de completion globale.

## Critères vérifiables (DoD mesurable pour DS / QA)

| # | Critère | Preuve attendue |
|---|---------|-----------------|
| C1 | Relire les historiques Epic 6 / 8 vs rail canonique | Liste nominative dans le livrable : preuve **encore valide** / **insuffisante** / **a remplacer**, avec lien vers fichier ou test |
| C2 | Matrice 4 colonnes pour la chaine canonique | Tableau rempli (meme logique que `8.7`) : locale / Paheko reel / hors perimetre / dette — une ligne minimum par etape : session+vente, snapshot `22.6`, batch builder+outbox `22.7`, visibilite sync |
| C3 | Package e2e minimal **nomme** | Au moins un chemin documente : tests auto **et/ou** procedure manuelle reproductible + capture ou log date |
| C4 | Non-regression automatisée epic 22 courant | Resultat **PASS** note pour les pytest lists dans « Chemins de tests » (ou sous-ensemble **honnete** documente si echec partiel) |
| C5 | Synthèse reutilisable Epic 10 | Paragraphe court : ce que reprendront les gates Epic 10 (CI, readiness) sans reimport implicite des vieilles preuves |

## Chemins de tests et artefacts attendus (repo)

**Backend (pytest, depuis `recyclique/api/`)** — ancres déjà livrées pour la chaine :

- `tests/test_story_22_6_accounting_close_snapshot.py` — snapshot fige cloture
- `tests/test_story_22_7_paheko_close_batch_builder.py` — builder multi-sous-ecritures
- `tests/test_story_22_7_outbox_processor_batch.py` — processor batch / sync locale
- Gate utile non-reg Epic 8 slice : `tests/test_story_8_1_paheko_outbox_slice.py`
- **`test_story_22_2_dual_read_aggregate_compare.py`** — inclus dans le **peloton C4** (Story Runner) à la place d’un double-run systématique d’autres fichiers ; `test_story_22_7_outbox_processor_batch.py` reste une **ancre complémentaire** hors commande C4 (voir resume QA).

**Gate pytest C4 — les 4 fichiers exécutés (commande figée, = resume QA § C4) :**  
`test_story_22_6_accounting_close_snapshot.py`, `test_story_22_7_paheko_close_batch_builder.py`, `test_story_22_2_dual_read_aggregate_compare.py`, `test_story_8_1_paheko_outbox_slice.py`.

**Gate pytest constatée (Story Runner — source de vérité C4 / décompte tests)** : voir section C4 dans `_bmad-output/implementation-artifacts/tests/test-summary-story-22-8-qa-chain.md` (4 fichiers, **40** tests PASS, 2026-04-16).

**Exemple de commande alternative** (peloton partiel + processor batch — **autre** décompte de tests ; utile en complément, pas substitut du gate C4) :

`pytest tests/test_story_22_6_accounting_close_snapshot.py tests/test_story_22_7_paheko_close_batch_builder.py tests/test_story_22_7_outbox_processor_batch.py -q`

**Frontend / e2e (`peintre-nano/`)** — parcours caisse / cloture observable (à combiner selon le scénario minimal retenu) :

- `tests/e2e/cash-register-session-close-13-3.e2e.test.tsx`
- `tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` (flux vente nominal)
- Stories 22.x existantes : ex. `tests/e2e/cashflow-refund-22-5.e2e.test.tsx`

**Résumé QA BMAD** — créer ou mettre à jour un fichier du type :

- `_bmad-output/implementation-artifacts/tests/test-summary-story-22-8-qa-chain.md` (nom exact laisse au DS ; le pattern suit `test-summary-story-22-*-qa-*.md`)

## Tasks / Subtasks

- [x] Relire les preuves historiques `6.x` et `8.x` a la lumiere du nouveau rail. (AC: 1)
- [x] Nommer les anciennes preuves encore valides et celles a remplacer. (AC: 1)
- [x] Definir les nouveaux gates et artefacts de preuve minimaux. (AC: 2, 3, 4)
- [x] Reprendre explicitement la matrice a quatre colonnes de `8.7` pour la chaine canonique. (AC: 4, 5)
- [x] Produire une baseline de validation reutilisable par `Epic 10`. (AC: 2, 3, 4, 5)

## Dev Notes

### Story de preuves, pas de storytelling

Cette story joue un role proche de `8.7` : elle doit laisser un systeme de preuves honnete et reutilisable, pas un simple texte de cloture.

### Sources critiques (chemins repo)

- **8.7** — `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md` : discipline **quatre colonnes**, option (A) Paheko reel vs (B) constat d'impossibilite, anti-`MockTransport` abuse.
- **6.7** — `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` : baseline **cloture locale** terrain (pre-Epic 22 ; ne pas conflater avec snapshot canonique).
- **22.6** — `_bmad-output/implementation-artifacts/22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session.md` : snapshot fige obligatoire en entree du builder.
- **22.7** — `_bmad-output/implementation-artifacts/22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8.md` : batch N sous-ecritures + outbox + visibilite etats partiels.
- **Delta architecture** — `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` : enchainement 1–5 (referentiel → journal paiements → snapshot → builder → outbox).
- **Epic 10 (reutilisation)** — `_bmad-output/planning-artifacts/epics.md` (section Epic 10 + AC Story 22.8 dans Epic 22).

### Guardrails

- Ne pas recycler automatiquement les anciennes captures ou tests comme si elles couvraient deja le snapshot canonique et les sous-ecritures multiples.
- Distinguer validation locale, validation vraie sync `Paheko`, hors scope et dette restante.
- Interdiction de declarer la chaine "verte" si la colonne de preuve reelle `Paheko` est vide ou seulement partielle sans dette explicite.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 22, Story 22.8 ; Epic 10 gates de readiness]
- [Source: `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`]
- [Source: `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md`]
- [Source: `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`]
- [Source: `_bmad-output/implementation-artifacts/22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session.md`]
- [Source: `_bmad-output/implementation-artifacts/22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8.md`]

## Dev Agent Record

### Agent Model Used

GPT-5.4 - create-story manual pass ; VS validate 2026-04-16 (bmad-create-story checklist)  
Task DS 2026-04-16 : worker bmad-dev-story — livrable documentaire + alignement sprint (gate pytest réservée Story Runner).  
Story Runner 2026-04-16 : VS (arbitrage statut review + cohérence sprint) → GATE pytest 40 PASS → QA → CR1 CHANGES_REQUESTED (doc colonne Paheko) → correctifs → GATE → CR2 **APPROVE** ; 22-8 **done** ; epic-22 **done**.

### Debug Log References

### Completion Notes List

- Story **done** : specification VS puis DS ; **preuve** de fin (matrice, gate C4) dans `test-summary-story-22-8-qa-chain.md` + rappels dans ce fichier.
- Livrable attendu : baseline **nommee** (tableau 4 colonnes + pointer tests / registre) **reimportable** par Epic 10 sans recycler les vieilles preuves comme couverture canonique.
- **Constat C4 (gate pytest)** : **PASS** — section C4 du resume QA (2026-04-16 ; 40 tests ; 4 fichiers). Les pytest du peloton C4 alimentent uniquement la colonne **preuve locale** de la matrice ; ils **ne remplissent pas** la colonne **preuve réelle Paheko** (cf. resume QA § honnêteté 8.7 — pas d'équivalence `MockTransport` / instance distante). **DS 2026-04-16** : cree le resume QA ; aucun changement `peintre-nano` ni `contracts/creos`.

### File List

- `_bmad-output/implementation-artifacts/22-8-rebaseliner-les-preuves-qualite-et-valider-bout-en-bout-la-chaine-caisse-snapshot-ecriture-paheko.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (22-8 et epic-22 → **done** post Story Runner)
- `_bmad-output/implementation-artifacts/tests/test-summary-story-22-8-qa-chain.md`

## Change Log

- **2026-04-16** — Story Runner BMAD : VS (arbitrage + correction statut fichier) → GATE pytest 4 fichiers **40 PASS** (~75 s) → QA → CR ×2 **APPROVE** ; story **done** ; sprint **22-8** → **done** ; **epic-22** → **done** ; `vs_loop=1` (1ᵉ VS Task NEEDS_HITL statut gabarit), `cr_loop=1`.
- **2026-04-16** — DS Task : livrable `test-summary-story-22-8-qa-chain.md` ; story en **review** ; sprint `22-8` → **review** ; gate pytest réservée Story Runner (exécution après reprise VS).
