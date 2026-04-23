# Guide de pilotage — exécution v2

**Rôle** : document **opérationnel** pour Strophe et les agents (BMAD, PM, help). Il complète le PRD, les epics et l’architecture sans les remplacer.

**Sources de vérité (ne pas les confondre)** :

| Domaine | Fichier canonique |
| -------- | ----------------- |
| **Produit / périmètre** | `_bmad-output/planning-artifacts/prd.md` |
| **Découpage épics & titres longs** | `_bmad-output/planning-artifacts/epics.md` |
| **État d’avancement sprint (instantané)** | `_bmad-output/implementation-artifacts/sprint-status.yaml` — cle **`last_updated`** **racine** + mapping **`development_status`** |

Ce guide **ne recopie pas** un état story par story (il vieillit). Il pose **principes de pilotage**, **chemins canoniques**, **rituel léger**, **frictions**, **prompt superviseur** et renvoie au YAML pour tout fait d’état.

**Mise à jour** : **2026-04-23** (alignée sur `last_updated` racine de `sprint-status.yaml`). Maintenir ce guide aux **jalons** (convergence, fin d’epic majeur, gate bandeau), pas à chaque story.

---

## 1. Ordre de chargement recommandé (agent)

1. **`_bmad-output/implementation-artifacts/sprint-status.yaml`** — qui est **done / backlog / in-progress**, fraîcheur **`last_updated`** racine (les lignes `# last_updated:` en tête du fichier sont un **journal**, pas l’état normatif ; voir commentaire YAML « Lecture canonique »).
2. **`references/ou-on-en-est.md`** — journal daté et paragraphe **Pilotage BMAD** / instantané.
3. **`_bmad-output/planning-artifacts/guide-pilotage-v2.md`** (ce fichier) — règles A/B, convergences, emplacements, frictions.
4. **`_bmad-output/planning-artifacts/epics.md`** + éventuellement fichier story sous `_bmad-output/implementation-artifacts/{story-key}.md` — détail et critères d’acceptation.

---

## 2. Quand charger ce document

- Pilotage **multi-chantiers** (Piste A Peintre / Piste B Recyclique).
- Agent **superviseur** ou reprise après plusieurs branches / fenêtres Cursor.
- Besoin de savoir **où ranger** un livrable (audit, schéma BDD, handoff, rapport de tests).
- Doute sur la **coexistence** de la séquence « idéale » PRD et du **parallèle** autorisé par les epics.

---

## 3. Les deux récits de rythme

| Récit | Source | Intention |
| ----- | ------ | --------- |
| **Préférence séquentielle** | Décision directrice v2, PRD §12 | Réduire le risque systémique : auditer données / API / Paheko, figer contrats, puis prouver le socle UI et le bandeau avant les gros flows. |
| **Exécution parallèle** | `epics.md` (overview pistes), [`project-structure-boundaries.md`](./architecture/project-structure-boundaries.md) | Piste A peut avancer avec **mocks** ; Piste B livre OpenAPI, `ContextEnvelope`, sync — **Convergence 1** (types + hooks réels), **2** (bandeau live bout en bout), **3** (flows critiques + contrat données / PRD §10). |

**Règle d’or** : le parallèle est sain tant que la **Piste B** livre des morceaux de **contrat reviewables** qui **ancrent** la Piste A (pas de mocks qui dérivent sans OpenAPI / enveloppe de contexte).

**Question hebdo** : *Le rail B a-t-il produit cette semaine un artefact contractuel qui contraint ou valide ce que fait le rail A ?*

---

## 4. Rituel léger — quoi mettre à jour quand

| Événement | Action obligatoire | Ce guide (cases §5) |
| --------- | ------------------- | --------------------- |
| **Fin de session utile** | Journal daté dans `references/ou-on-en-est.md` | Optionnel (synthèse humaine) |
| **Changement de statut story / epic** | **`sprint-status.yaml`** : `development_status` + **`last_updated`** racine | Non (pas de doublon d’état) |
| **Jalon convergence ou gate objectivement franchi** | YAML si stories impactées ; journal | Cocher **uniquement** si critère **objectivement** rempli |
| **Fin d’epic majeur** | YAML + entrée dans `ou-on-en-est.md` | Cases jalons si critère epic/convergence associé franchi |

---

## 5. Jalons — cases à cocher

**État des epics** : tout détail **`epic-*` / stories** vit dans **`development_status`** du YAML. Ci-dessous : **critères de jalon** ; les cocher quand le critère est **objectivement** rempli (livrable reviewable ou gate franchi).

### 5.1 Convergences

- **Convergence 1** — Types / client depuis OpenAPI + hooks réels (plus seulement mocks pour les slices concernés) ; `ContextEnvelope` aligné serveur / UI.  
  *État fichier : epics **1–4** sont **`done`** au YAML au 2026-04-23. Pour une session qui rouvre les slices concernés, **à vérifier contre critères ci-dessous** et contre le code / contrats vivants.*

- **Convergence 2** — **Bandeau live** : chaîne complète backend → contrat → manifest CREOS → registre Peintre → slot → rendu → fallback (gate décision directrice). Preuve technique historique : `references/artefacts/2026-04-07_03_preuve-convergence-2-bandeau-live.md` + E2E `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` (story 4.6), puis validation humaine sur l’application réellement servie (story 4.6b).

- **Convergence 3** — Flows **cashflow** et **réception** avec données réelles, `data_contract` / `DATA_STALE` ou équivalents selon PRD §10.  
  *État fichier : epics **6** et **7** sont **`done`** au YAML au 2026-04-23. La **correspondance exacte** avec chaque sous-critère PRD / enrichissements ultérieurs (ex. Epic 25) relève d’une **revue critères** si un chantier rouvre caisse ou réception — **à vérifier contre critères ci-dessous** plutôt que d’inférer depuis ce guide seul.*

### 5.2 Carte condensée des epics (sans dupliquer les stories)

Titres et profondeur : **`epics.md`**. Statut **`done` / `backlog` / `in-progress`** : **`sprint-status.yaml` uniquement**.

**Instantané aligné avec `development_status` au 2026-04-23** (à recroiser systématiquement avec le YAML avant toute décision) :

| Position | Epics (`epic-*`) | Commentaire |
| -------- | ---------------- | ----------- |
| **Encore `backlog` (cle epic)** | **9**, **10**, **12**, **20**, **21** | L’Epic **10** mélange stories déjà **`done`** (ex. **10.6b–10.6e**) et stories **`backlog`** — seul le YAML fait foi. |
| **`done` (cle epic)** | **1–8**, **11**, **13–19**, **22–26** | Nombre total d’epics documentés > **10** ; ne pas se limiter à la numérotation 1–10 pour le pilotage. |

Pour toute **create-story / dev-story** sur les stories **6.x à 10.x**, conserver les repères : [pack 02](../../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md) et [tableau 03](../../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md).

---

## 6. Cartographie documentaire — où ça vit

**Règle** : décrire ici les **emplacements canoniques**. Mettre à jour les **index** des dossiers `references/*` **uniquement** lorsque tu **ajoutes** un nouveau fichier dans ce dossier (convention projet — voir `references/INSTRUCTIONS-PROJET.md`).

| Type de livrable | Emplacement canonique | Index |
| ---------------- | --------------------- | ----- |
| Audits / journaux brownfield **1.4.4** | `references/consolidation-1.4.5/` | `references/consolidation-1.4.5/index.md` |
| Schémas / notes BDD (non sensibles) | `references/dumps/` (`schema-*.md`) | Résumé dans `references/index.md` |
| Décisions courtes, handoffs agents | `references/artefacts/` (`YYYY-MM-DD_NN_…`) | `references/artefacts/index.md` **obligatoire à chaque nouvel artefact** |
| Recherche externe | `references/recherche/` | `references/recherche/index.md` à l’ajout |
| Interop Paheko / éco-organismes | `references/migration-paheko/`, `references/paheko/` | Index de chaque dossier |
| PRD, archi, epics, readiness, **ce guide** | `_bmad-output/planning-artifacts/` | `_bmad-output/README.md` ; archi : `planning-artifacts/architecture/index.md` |
| Stories / sprint | `_bmad-output/implementation-artifacts/` | **`sprint-status.yaml`** |
| **Tests (code)** | Backend API : `recyclique/api/` ; compose racine : `docker-compose.yml` ; raccourci `recyclique-1.4.4/docker-compose.yml` ; front v2 `peintre-nano/` (port **4444**) + legacy **4445** contre la même API | — |
| **Rapports / stratégie de tests** (synthèse) | Consolidation 1.4.4 ; **v2** : artefacts datés dans `references/artefacts/` par défaut | Première fois : créer l’artefact **et** une entrée dans `references/artefacts/index.md` |

**Repère Epics 6 à 10** : pour une session BMAD orientée `caisse`, `reception`, `Paheko`, modules complémentaires ou readiness sur cette plage, charger aussi :

- [`references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`](../../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md)
- [`references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`](../../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md)

---

## 7. Frictions connues (rappel)

Le détail produit est dans **PRD** et **epics** :

- Deux récits (séquentiel vs A/B) — ne pas ignorer l’un au profit de l’autre sans **gate** (bandeau).
- **Epic 1** (historiquement chargé) : découper en livrables reviewables, éviter l’analyse infinie.
- **Gate bandeau** : ne pas élargir aux gros flows si la chaîne modulaire n’est pas prouvée.
- Discipline **OpenAPI unique** + **CREOS** dans `contracts/` — pas de double définition à la main.
- Intégrations **Paheko** / **HelloAsso** : découvertes réelles, **correct course** si l’API impose.
- **FR73** vs vélocité : fermer le **minimum** contractuel avant implémentation **large** des modules.
- **Agnosticité Peintre** : ne pas confondre extractibilité future et travail v2 immédiat ; [`references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`](../../references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md).

---

## 8. Prompt type — agent superviseur

Copier-coller et adapter l’epic / la branche en cours :

```text
Tu pilotes une session JARVOS Recyclique v2. Charge dans l'ordre :
1) _bmad-output/implementation-artifacts/sprint-status.yaml (last_updated racine + development_status)
2) references/ou-on-en-est.md
3) _bmad-output/planning-artifacts/guide-pilotage-v2.md
4) epics.md + sprint-status / fichier story si besoin

Règles :
- Respecter la règle d'or Piste A/B (contrat B qui ancère A).
- Ne pas déclarer un jalon coché sans livrable reviewable ou sans recoupement YAML.
- Si la session touche Peintre_nano sur les Epics 5 à 10 (et extensions parité), charger aussi references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md.
- Si la session touche les stories 6.x à 10.x, charger aussi references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md et references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md.
- En fin de session : mettre à jour references/ou-on-en-est.md ; mettre à jour sprint-status.yaml pour tout changement de statut ; ne mettre à jour les cases jalons du guide que si un critère objectivement franchi.
```

---

## 9. Correct course

Si un audit ou la réalité contredit le plan : arbitrer, documenter, ajuster le backlog — ne pas forcer le plan.

### Gate Epic 6 — Parité workflow brownfield caisse

Avant toute validation terrain Epic 6, vérifier explicitement :

- la route `/caisse` sert un **point d’entrée opératoire** et pas seulement un slice nominal isolé ;
- l’opératrice retrouve un continuum **dashboard → ouverture → vente → finalisation → clôture** ;
- le couple **gestionnaire admin → détail session** existe comme prolongement exploitable de la caisse ;
- les variantes réel / virtuel / différé, ainsi que les cas 6.3 / 6.4 / 6.5 / 6.6, restent lisibles comme **variantes du poste caisse** ;
- **Registres caisse Epic 6 — deux rôles :** [`2026-04-08_04_caisse-v2-exploitabilite-terrain-epic6.md`](../../references/artefacts/2026-04-08_04_caisse-v2-exploitabilite-terrain-epic6.md) = structure / critères d’exploitabilité et **instantané intermédiaire**, pas validation terrain finale tant que ce gate n’est pas franchi ; [`2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md`](../../references/artefacts/2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md) = registre **brownfield-first** après story **6.10** (gaps assumés nommés). Pour auditer la parité caisse, **ouvrir les deux** et ne pas inférer depuis un seul fichier.
- Exemple de proposition documentée : [`sprint-change-proposal-2026-04-01.md`](sprint-change-proposal-2026-04-01.md)
- Proposition agnosticité `Peintre_nano` : [`sprint-change-proposal-2026-04-07-peintre-agnosticite-sans-extraction.md`](./sprint-change-proposal-2026-04-07-peintre-agnosticite-sans-extraction.md)
- Proposition correct course Epic 6 brownfield-first : [`sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md`](./sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md)
- Workflow BMAD : skill **bmad-correct-course** ; procédure habituelle du dépôt.

### Règle caisse Peintre vs legacy (2026-04-12)

- **En bref** : équivalence utilisateur legacy → **traduite dans** Peintre (CREOS, widgets, slots, API) — pas de contournement du modèle contractuel ; texte complet et DoD : [`sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`](./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md).
- **Preuve visuelle / structurelle (gate stories parité caisse)** : outil MCP Cursor **user-chrome-devtools** (flux `list_pages` → `select_page` → `navigate_page` → `take_snapshot` ; réseau seulement si requêtes listées) — **obligatoire à chaque PR** qui touche une ligne `ui-pilote-03*` caisse, `ui-pilote-03a`–`03e`, ou une story **Epic 11 / Epic 13** caisse ; exécution **locale ou CI** selon disponibilité MCP. Optionnel : même scénario sur **main** en **nightly** si la chaîne CI expose le MCP (sinon gate manuel documenté).

---

## Liens rapides

| Document | Chemin relatif (depuis ce fichier) |
| -------- | ---------------------------------- |
| PRD | `./prd.md` |
| Epics | `./epics.md` |
| Architecture (index) | `./architecture/index.md` |
| Sprint status (**vérité d’état**) | `../implementation-artifacts/sprint-status.yaml` |
| Décision directrice v2 | `../../references/vision-projet/2026-03-31_decision-directrice-v2.md` |
| Index references | `../../references/index.md` |
| Pack lecture Epics 6–10 | `../../references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` |
| Tableau ultra opérationnel Epics 6–10 | `../../references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` |
| Correct course parité caisse | [`./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`](./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md) |
