# Guide de pilotage — exécution v2

**Rôle** : document **opérationnel** pour Strophe et les agents (BMAD, PM, help). Il complète le PRD, les epics et l'architecture sans les remplacer : **source de vérité produit** = `prd.md` ; **grain fin des stories** = `implementation-artifacts/sprint-status.yaml` et fichiers story.

**Mise à jour** : cocher les cases **aux jalons** (fin d'une Convergence, clôture d'un epic majeur, gate bandeau), pas à chaque story. Si `epics.md` change (nombre ou titres d'epics), revenir aligner la section 3 de ce guide.

---

## 1. Quand charger ce document

- Pilotage **multi-chantiers** (Piste A Peintre / Piste B Recyclique).
- Agent **superviseur** ou reprise après plusieurs branches / fenêtres Cursor.
- Besoin de savoir **où ranger** un livrable (audit, schéma BDD, handoff, rapport de tests).
- Doute sur la **coexistence** de la séquence « idéale » PRD et du **parallèle** autorisé par les epics.

---

## 2. Les deux récits de rythme

| Récit | Source | Intention |
|-------|--------|-----------|
| **Préférence séquentielle** | Décision directrice v2, PRD §12 | Réduire le risque systémique : auditer données / API / Paheko, figer contrats, puis prouver le socle UI et le bandeau avant les gros flows. |
| **Exécution parallèle** | `epics.md` (Overview Piste A / B), `project-structure-boundaries.md` | Piste A peut avancer avec **mocks** ; Piste B produit OpenAPI, `ContextEnvelope`, sync — **Convergence 1** (types + hooks réels), **2** (bandeau live bout en bout), **3** (flows critiques + `data_contract`). |

**Règle d'or** : le parallèle est sain tant que la **Piste B** livre des morceaux de **contrat reviewables** qui **ancrent** la Piste A (pas de mocks qui dérivent sans OpenAPI / enveloppe de contexte).

**Question hebdo** : *Le rail B a-t-il produit cette semaine un artefact contractuel qui contraint ou valide ce que fait le rail A ?*

---

## 3. Jalons — cases à cocher

**Synchronisation avec `sprint-status.yaml` :** le détail **story par story** vit dans `implementation-artifacts/sprint-status.yaml`. Ci-dessous : **jalons** ; les cocher quand le critère est **objectivement** rempli (livrable reviewable ou gate franchi).

### Convergences

- [ ] **Convergence 1** — Types / client depuis OpenAPI + hooks réels (plus seulement mocks pour les slices concernés) ; `ContextEnvelope` aligné serveur / UI.
- [x] **Convergence 2** — **Bandeau live** : chaîne complète backend → contrat → manifest CREOS → registre Peintre → slot → rendu → fallback (gate décision directrice). *Preuve technique acquise : `references/artefacts/2026-04-07_03_preuve-convergence-2-bandeau-live.md` + E2E `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` (story 4.6), puis validation humaine explicite sur l'application reellement servie apres raccordement UI (story 4.6b).*
- [ ] **Convergence 3** — Flows **cashflow** et **réception** avec données réelles, `data_contract` / `DATA_STALE` ou équivalents ou règles PRD §10.

### Epics 1 à 10 (titres de référence — alignés sur `epics.md`)

- [ ] **Epic 1** — Prérequis structurants, modèle multi-contextes, gouvernance OpenAPI/CREOS (jalon FR73 / schémas minimaux selon epics).
- [ ] **Epic 2** — Socle backend brownfield v2 (auth, contexte, permissions, persistance, signaux bandeau).
- [ ] **Epic 3** — Socle Peintre_nano (shell, slots, validation CREOS, mocks permis avant C1).
- [x] **Epic 4** — Preuve chaîne modulaire **bandeau live**.
- [x] **Epic 5** — Shell, dashboard, admin transverses dans Peintre.
- [ ] **Epic 6** — Caisse v2 exploitable.
  Gate de lecture : tant que la caisse v2 ne restitue pas un **workflow brownfield operatoire** comparable au legacy (dashboard poste, ouverture, vente continue, cloture, supervision admin session), Epic 6 reste **in-progress** et `6.10` ne peut pas etre consideree `done`.
  Des stories `6.x` peuvent rester `done` au sens technique (`keep`) sans fermer l'epic tant que ce gate brownfield n'est pas franchi.
- [ ] **Epic 7** — Réception v2 exploitable.
- [ ] **Epic 8** — Articulation comptable réelle Paheko.
- [ ] **Epic 9** — Modules complémentaires (éco-organismes, adhérents, HelloAsso, config admin simple).
- [ ] **Epic 10** — Industrialisation, CI, déployabilité, gates de sortie.

---

## 4. Cartographie documentaire — où ça vit

**Règle** : décrire ici les **emplacements canoniques**. Mettre à jour les **index** des dossiers `references/*` **uniquement** lorsque tu **ajoutes** un nouveau fichier dans ce dossier (convention projet — voir `references/INSTRUCTIONS-PROJET.md`).

| Type de livrable | Emplacement canonique | Index |
|------------------|----------------------|--------|
| Audits / journaux brownfield **1.4.4** | `references/consolidation-1.4.5/` | `references/consolidation-1.4.5/index.md` |
| Schémas / notes BDD (non sensibles) | `references/dumps/` (`schema-*.md`) | Résumé dans `references/index.md` |
| Décisions courtes, handoffs agents | `references/artefacts/` (`YYYY-MM-DD_NN_…`) | `references/artefacts/index.md` **obligatoire à chaque nouvel artefact** |
| Recherche externe | `references/recherche/` | `references/recherche/index.md` à l'ajout |
| Interop Paheko / éco-organismes | `references/migration-paheko/`, `references/paheko/` | Index de chaque dossier |
| PRD, archi, epics, readiness, **ce guide** | `_bmad-output/planning-artifacts/` | `_bmad-output/README.md` ; archi : `planning-artifacts/architecture/index.md` |
| Stories / sprint | `_bmad-output/implementation-artifacts/` | `sprint-status.yaml` |
| **Tests (code)** | Backend API : **`recyclique/api/`** (gates Story Runner, pytest) ; stack Docker locale : **`docker-compose.yml` à la racine du mono-repo** (point d’entrée unique ; build API depuis `recyclique/api/`) ; raccourci compat. `recyclique-1.4.4/docker-compose.yml` (include du compose racine) ; front v2 **`peintre-nano/`** (`frontend`, port `4444`) + front transitoire **legacy** (`frontend-legacy`, port `4445`) contre la même API | — |
| **Rapports / stratégie de tests** (synthèse, pas le code) | Existant 1.4.4 : logique **consolidation** ; **v2 transversal** : fichiers datés dans `references/artefacts/` par défaut | **Dès le premier** rapport / stratégie test v2 : créer l'artefact **et** une entrée dans `references/artefacts/index.md` |

**Repère Epics 6 a 10** : pour toute session BMAD orientée `caisse`, `reception`, `Paheko`, modules complémentaires ou readiness, charger aussi :

- `../../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
- `../../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`

---

## 5. Frictions connues (rappel)

Garder en tête ; le détail produit est dans **PRD** et **epics** :

- Deux récits (séquentiel vs A/B) — ne pas ignorer l'un au profit de l'autre sans **gate** (bandeau).
- **Epic 1** très chargé : découper en livrables reviewables, éviter l'analyse infinie.
- **Gate bandeau** : ne pas élargir aux gros flows si la chaîne modulaire n'est pas prouvée.
- Discipline **OpenAPI unique** + **CREOS** dans `contracts/` — pas de double définition à la main.
- Intégrations **Paheko** / **HelloAsso** : découvertes réelles, **correct course** si l'API impose.
- **FR73** vs vélocité : fermer le **minimum** contractuel avant implémentation **large** des modules, pas la perfection absolue.
- **Agnosticité Peintre** : ne pas confondre **extractibilité future** et **travail v2 immédiat** ; voir la checklist PR / create-story [`../../references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`](../../references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md).

---

## 6. Prompt type — agent superviseur

Copier-coller et adapter l'epic / la branche en cours :

```text
Tu pilotes une session JARVOS Recyclique v2. Charge dans l'ordre :
1) _bmad-output/planning-artifacts/guide-pilotage-v2.md
2) references/ou-on-en-est.md
3) L'epic ou la story en cours (epics.md + sprint-status.yaml si besoin)

Règles :
- Respecter la règle d'or Piste A/B (contrat B qui ancère A).
- Ne pas déclarer un jalon coché sans livrable reviewable.
- Si la session touche `Peintre_nano` sur les Epics 5 à 10, charger aussi `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.
- Si la session touche les Epics 6 a 10, charger aussi `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` et `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.
- En fin de session : mettre à jour references/ou-on-en-est.md (journal daté) ; mettre à jour les cases du guide seulement si un jalon a été franchi.
```

---

## 7. Correct course

Si un audit ou la réalité contredit le plan : arbitrer, documenter, ajuster le backlog — ne pas forcer le plan.

### Gate Epic 6 — Parite workflow brownfield caisse

Avant toute validation terrain Epic 6, verifier explicitement :

- la route `/caisse` sert un **point d'entree operatoire** et pas seulement un slice nominal isole ;
- l'operatrice retrouve un continuum **dashboard -> ouverture -> vente -> finalisation -> cloture** ;
- le couple **gestionnaire admin -> detail session** existe comme prolongement exploitable de la caisse ;
- les variantes reel / virtuel / differe, ainsi que les cas 6.3 / 6.4 / 6.5 / 6.6, restent lisibles comme **variantes du poste caisse** ;
- le registre `references/artefacts/2026-04-08_04_caisse-v2-exploitabilite-terrain-epic6.md` doit etre lu comme **etat technique intermediaire**, pas comme validation terrain finale, tant que ce gate n'est pas franchi.

- Exemple de proposition documentée : [`sprint-change-proposal-2026-04-01.md`](sprint-change-proposal-2026-04-01.md)
- Proposition liée à l'agnosticité future de `Peintre_nano` : [`sprint-change-proposal-2026-04-07-peintre-agnosticite-sans-extraction.md`](./sprint-change-proposal-2026-04-07-peintre-agnosticite-sans-extraction.md)
- Proposition liée au correct course Epic 6 brownfield-first : [`sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md`](./sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md)
- Workflow BMAD : skill **bmad-correct-course** ; alignement procédure habituelle du dépôt.

### Règle caisse Peintre vs legacy (2026-04-12)

- **En bref** : équivalence utilisateur legacy → **traduite dans** Peintre (CREOS, widgets, slots, API) — pas de contournement du modèle contractuel ; texte complet et DoD : [`sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`](./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md).
- **Preuve visuelle / structurelle (gate stories parité caisse)** : outil MCP Cursor **`user-chrome-devtools`** (flux `list_pages` → `select_page` → `navigate_page` → `take_snapshot` ; réseau seulement si requêtes listées) — **obligatoire à chaque PR** qui touche une ligne `ui-pilote-03*` caisse, `ui-pilote-03a`–`03e`, ou une story **Epic 11 / Epic 13** caisse ; exécution **locale ou CI** selon disponibilité MCP. Optionnel : même scénario sur **`main`** en **nightly** si la chaîne CI expose le MCP (sinon gate manuel documenté).

---

## Liens rapides

| Document | Chemin relatif (depuis ce fichier) |
|----------|-----------------------------------|
| PRD | `./prd.md` |
| Epics | `./epics.md` |
| Architecture (index) | `./architecture/index.md` |
| Sprint status | `../implementation-artifacts/sprint-status.yaml` |
| Décision directrice v2 | `../../references/vision-projet/2026-03-31_decision-directrice-v2.md` |
| Index references | `../../references/index.md` |
| Pack lecture Epics 6-10 | `../../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` |
| Tableau ultra operationnel Epics 6-10 | `../../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` |
| Correct course parité caisse (DoD + Peintre / CREOS) | [`./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`](./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md) |
