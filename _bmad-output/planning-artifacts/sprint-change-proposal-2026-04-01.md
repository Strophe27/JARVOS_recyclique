# Sprint Change Proposal — JARVOS_recyclique

**Date :** 2026-04-01  
**Révision :** 2026-04-01 (QA §8 + **implémentation §9** + **correctifs QA §10** + **§11 Piste A/B**)  
**Auteur (workflow) :** Correct Course (BMAD)  
**Destinataire :** Strophe  

---

## 1. Résumé du problème

### Énoncé

Les décisions **P1 (stack CSS / styling Peintre_nano)** et **P2 (configuration admin)** ont été **figées** par l’ADR `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`, avec une **instruction agents** `references/peintre/2026-04-01_instruction-cursor-p1-p2.md` (ne pas réécrire le cadrage daté du dossier `references/peintre/` ; l’ADR se superpose).

Les artefacts de planification sous `_bmad-output/planning-artifacts/` décrivent encore **Mantine comme choix provisoire** et laissent **Tailwind / CSS Modules** comme « décision d’implémentation » non tranchée. Cela crée une **incohérence documentaire** : un agent ou un développeur qui ne lit que le PRD / l’architecture BMAD peut **contredire** l’ADR et les garde-fous CI attendus.

### Contexte de découverte

- Synthèse recherche : `references/recherche/2026-03-31_peintre-nano-p1-stack-css-styling_perplexity_reponse.md`  
- Clôture formelle : ADR + instruction + index Peintre mis à jour.

### Preuves / exemples

- `architecture/core-architectural-decisions.md`, `architecture/starter-template-evaluation.md`, `archive/architecture.md` : formulations « décision provisoire », « Tailwind / CSS Modules / autre », Mantine « transitoire » sans alignement sur P1 (CSS Modules + `tokens.css` + Mantine v8 comme lib de composants, interdits listés dans l’ADR).  
- `epics.md` : AR3 / AR15 encore formulés comme si la décision styling / Mantine était **à trancher** dans l’Epic 3.

---

## 2. Analyse d’impact

### Impact sur les epics

| Epic | Impact |
|------|--------|
| **Epic 3** (Peintre_nano) | Les stories restent valides ; les **critères d’acceptation** et les **références d’architecture** doivent refléter P1/P2 **fermés**, pas « à décider ». |
| **Epic 5** (présent dans `epics.md`, ex. UX-DR / AR15) | Même logique : pas d’invalidation, mais **alignement** sur l’ADR pour éviter double vérité. |
| Autres epics | Impact faible direct ; impact indirect si des stories frontend citent une stack obsolète. |

**L’epic peut-il se terminer comme prévu ?** Oui, à condition de **mettre à jour la documentation de planification** et, le cas échéant, les AC des stories Epic 3 (notamment shell / layout / styling).

### Impact sur les stories

- Stories **3-0** à **3-7** : vérifier les descriptions qui impliquent un choix UI encore ouvert ; les **compléter** avec le renvoi explicite à l’ADR P1 (sans dupliquer tout le texte de l’ADR dans chaque story).  
- Aucun **rollback** de code n’est requis si aucune implémentation n’a encore divergé ; l’enjeu est surtout **cadrage + conformité future**.

### Conflits d’artefacts

| Artefact | Conflit |
|----------|---------|
| **PRD** | Peu de mentions directes de la stack ; ajouter une **référence unique** (section Peintre ou contraintes transverses) pointant vers l’ADR P1/P2 + instruction. |
| **Architecture — stack ouverte (Tailwind / trancher / provisoire)** | `core-architectural-decisions.md`, `starter-template-evaluation.md` : retirer le langage « décision provisoire » / « Tailwind / CSS Modules / autre » comme choix non figé ; remplacer par **décision ADR P1** + lien. |
| **Architecture — couche Mantine / arborescence** | `implementation-patterns-consistency-rules.md` : **ne contient pas** les chaînes « provisoire » / « Tailwind » / « à trancher » — l’alignement consiste à **harmoniser les règles de couche d’adaptation Mantine** avec l’ADR P1 (Mantine v8, CSS Modules, tokens, interdits), pas à « supprimer du texte absent ». `project-structure-boundaries.md` : présence de `mantine-adapters/` dans l’arbre — **ajouter renvoi ADR** pour éviter une lecture « Mantine structurel sans P1 ». |
| **Archive** `archive/architecture.md` | Ajouter bannière ou note : **supersédé pour P1/P2** par l’ADR du 2026-04-01 (éviter double vérité). |
| **epics.md** | Mettre à jour AR3, AR15 (et toute phrase équivalente) : décisions **fermées** ; renvoi ADR. |
| **UX** | Aucun fichier nommé `*ux*.md` sous `planning-artifacts/` (vérifié) ; l’UX est portée notamment par `epics.md` (UX-DR, FR). Après mise à jour archi/PRD/epics, **revérifier la cohérence** des passages UI avec P1 (pas de nouveau livrable `*ux*.md` requis par ce changement). |

### Impact technique

- **CI / garde-fous** : aligner les messages d’échec avec les termes de l’ADR (déjà en partie dans l’instruction Cursor).  
- **Scaffold** : package.json et structure `tokens.css` + CSS Modules — conformes P1.  
- **P2** : stratégie admin PostgreSQL + fusion manifests + traçabilité — à refléter dans les sections **données / déploiement** de l’architecture si encore génériques.

---

## 3. Approche recommandée

**Option retenue : ajustement direct (Option 1)** — mettre à jour les artefacts BMAD et les AC de stories concernées **sans** changer la structure des epics ni réduire le périmètre MVP.

| Option | Viabilité | Commentaire |
|--------|-----------|--------------|
| 1. Ajustement direct | **Oui** | Effort **moyen**, risque **faible**. |
| 2. Rollback | **Non** | Pas de livrable code à annuler pour cette cause. |
| 3. Révision MVP PRD | **Non** | Le MVP reste atteignable ; il s’agit de **précision** architecturale. |

**Justification :** l’ADR est la source de vérité opérationnelle ; les documents BMAD doivent la **citer** et **retirer** le langage « en attente de décision » pour P1/P2. Aucun réordonnancement d’epics n’est nécessaire.

**Effort / risque / délai :** ~0,5–1,5 j documentaire ; risque résiduel si une story fichier (`.md` sous `implementation-artifacts`) contient encore d’anciennes formulations — à passer en revue lors de la prochaine création de story.

---

## 4. Propositions de modification détaillées (mode Batch)

### 4.1 PRD (`prd.md`)

**Ancrage recommandé :** immédiatement après le paragraphe **« Documentation de travail Peintre… »** (référence à `references/peintre/index.md`, début du document) ou en tête de **§ 3.3 Peintre_nano** — choisir **un seul** emplacement pour éviter la double vérité.

**Ajout proposé (substance) :**

- Référencer explicitement l’ADR P1/P2 et l’instruction agents.  
- Une phrase du type : *Pour Peintre_nano, la stack CSS/styling et la configuration admin sont définies par l’ADR du 2026-04-01 ; en cas d’écart avec d’anciens extraits, l’ADR et cette instruction priment.*

**Hors périmètre de ce sprint change (sauf décision d’élargir) :** ailleurs dans le PRD, des blocs « À trancher » concernent d’autres sujets (ex. schémas, OpenAPI, CREOS, CI vers ~L.868) — **ne pas les confondre** avec la fermeture P1/P2.

### 4.2 Architecture

**Fichiers — langage stack encore « ouvert » ou « provisoire » :**  
`architecture/core-architectural-decisions.md`,  
`architecture/starter-template-evaluation.md`,  
`archive/architecture.md`.

**Changements sur ce groupe :**

- Remplacer les paragraphes « Mantine provisoire / Tailwind ou CSS Modules à décider » par un **bloc unique** aligné P1 : CSS Modules, `tokens.css`, Mantine v8 comme lib de composants, interdits (Tailwind, layout DSL maison, CSS-in-JS runtime, etc.) — **ou** paragraphe court + lien vers l’ADR.  
- Pour **P2** : résumer en 2–3 bullets (PostgreSQL, fusion manifests, traçabilité) + lien ADR.  
- **Archive :** note en tête ou encadré « P1/P2 : voir ADR 2026-04-01 ».

**Fichiers — alignement couche Mantine / structure (sans les mêmes chaînes « Tailwind / à trancher ») :**  
`architecture/implementation-patterns-consistency-rules.md` : réconcilier les règles « couche d’adaptation / migration Mantine » avec l’ADR P1 (rôle autorisé de Mantine v8, pas de contournement des interdits).  
`architecture/project-structure-boundaries.md` : conserver ou ajuster l’arborescence `mantine-adapters/` **avec** une phrase de renvoi explicite à l’ADR P1 pour qu’un lecteur BMAD-only ne déduise pas un choix de stack encore ouvert.

### 4.3 Epics (`epics.md`)

**Sections prioritaires :** AR3, AR15, et toute occurrence du type « à trancher explicitement » pour Mantine / styling / stack UI Peintre.  
**Note :** AR26 fixe déjà une règle sur `Zustand` (état UI éphémère) ; ne pas la confondre avec un « sujet ouvert » — **harmoniser** seulement si une phrase dupliquée contredit l’ADR ou l’instruction P1/P2.

**Ancien sens (résumé) :** décisions styling / Mantine encore ouvertes dans Epic 3.  

**Nouveau sens :** décisions **fermées** par ADR 2026-04-01 ; Epic 3 **implémente** sous ces contraintes ; renvoi ADR + instruction.

### 4.4 Stories (fichiers futurs ou existants)

Pour chaque story Epic 3 touchant le shell ou le CSS (ex. **3-1** layout) :

- **Section :** Notes d’implémentation ou AC.  
- **Ajout :** *Conforme ADR P1 (`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`) — CSS Modules, tokens, Mantine v8, interdits listés dans l’ADR.*

### 4.5 `sprint-status.yaml`

- **Pas de renumérotation d’epics.**  
- Optionnel : commentaire YAML ou entrée de changelog interne si vous tracez les révisions de cadrage (non obligatoire pour ce changement).

### 4.6 Rapport implementation readiness

- Après application des §4.1–4.3 et §4.2, **relancer** `check implementation readiness` pour régénérer `implementation-readiness-report-*.md`.  
- **Note méthodologique :** le rapport actuel ne signalait pas l’écart ADR ↔ langage « provisoire » dans les shards d’architecture ; un simple re-run sans édition préalable **reproduirait** ce trou. Le critère de succès est donc : **édits BMAD d’abord**, puis re-run.  
- Le `product-brief-*.md` peut contenir des « restent à trancher » **généraux** : hors périmètre P1/P2 sauf décision d’harmonisation globale.

---

## 5. Transfert (handoff)

| Classification | **Modérée** |
|----------------|-------------|
| **Raisons** | Plusieurs fichiers de planification à éditer ; coordination PO/SM + relecture architecte pour éviter réintroduction de formulations « provisoires ». |

| Rôle | Responsabilité |
|------|----------------|
| **PM / Architecte (Winston)** | Valider les paragraphes d’architecture et l’alignement avec l’ADR. |
| **SM / PO** | Mettre à jour `epics.md`, PRD, et stories lors de leur prochaine édition ; lancer un **re-run** `check implementation readiness` après sync. |
| **Dev (Amelia / Barry)** | Appliquer P1 à l’implémentation ; ne pas traiter Mantine/Tailwind comme sujet ouvert. |

**Critères de succès (périmètre explicite : P1/P2 Peintre uniquement) :**

1. **Architecture active** : dans `architecture/core-architectural-decisions.md` et `architecture/starter-template-evaluation.md`, plus de formulation équivalente à « Tailwind / CSS Modules / autre » comme choix non figé pour Peintre_nano ; renvoi à l’ADR P1 présent. `implementation-patterns-consistency-rules.md` et `project-structure-boundaries.md` : cohérents avec l’ADR (couche Mantine + arborescence).  
2. **`epics.md`** : AR3 et AR15 reflètent les décisions **fermées** P1/P2 + lien ADR ; plus de « à trancher » sur le styling / Mantine **dans ce sens**. AR26 reste la règle Zustand existante, réalignée seulement si contradiction vérifiée avec l’ADR.  
3. **`prd.md`** : au moins **un** lien explicite vers l’ADR P1/P2 + instruction (un paragraphe suffit).  
4. **Vérification suggérée (preuve)** : recherche ciblée (`rg` ou équivalent) sur les fichiers listés en §4.2–4.3 pour les motifs résiduels « provisoire » / « Tailwind / CSS Modules / autre » / « à trancher » **dans le contexte stack Peintre** — zéro hit attendu sauf dans citations historiques explicitement marquées « archive / historique ».  
5. **Readiness** : re-run après édits ; pas d’objectif de « tout fermer » dans le PRD (ex. blocs schémas/OpenAPI « À trancher ») ni dans le product brief, sauf chantier distinct.

**Documents hors périmètre par défaut :** `prd.md` (autres « À trancher » non UI), `product-brief-JARVOS_recyclique-2026-03-31.md` (formulations générales ouvertes).

---

## 6. Checklist Correct Course (statut)

### Section 1 — Déclencheur et contexte

| ID | Statut | Note |
|----|--------|------|
| 1.1 | **N/A** | Pas une story unique ; clôture ADR + recherche. |
| 1.2 | **Fait** | Type : précision stratégique / alignement doc après décision. |
| 1.3 | **Fait** | ADR, instruction, index Peintre, recherche Perplexity. |

### Section 2 — Epics

| ID | Statut |
|----|--------|
| 2.1 | **Fait** — Epics réalisables avec mise à jour doc. |
| 2.2 | **Fait** — Modifier portée documentaire / AC, pas structure epics. |
| 2.3 | **Fait** — Epic 3 (+ touches Epic 5 si mention Mantine). |
| 2.4 | **Fait** — Aucun epic invalidé. |
| 2.5 | **Fait** — Pas de réordonnancement requis. |

### Section 3 — Conflits d’artefacts

| ID | Statut |
|----|--------|
| 3.1 | **Fait** — PRD : ajout référence ADR. |
| 3.2 | **Fait** — Architecture : plusieurs fichiers. |
| 3.3 | **N/A** — Pas de spec UX dédiée trouvée. |
| 3.4 | **Fait** — CI, stories, readiness. |

### Section 4 — Piste

| ID | Statut |
|----|--------|
| 4.1 | **Viable** — Effort moyen, risque faible. |
| 4.2 | **Non viable** |
| 4.3 | **Non viable** (MVP inchangé). |
| 4.4 | **Fait** — Option 1. |

### Section 5 — Composants proposition

| ID | Statut |
|----|--------|
| 5.1–5.5 | **Fait** — Voir sections 1–5 ci-dessus. |

### Section 6 — Revue finale

| ID | Statut |
|----|--------|
| 6.1 | **Fait** |
| 6.2 | **Fait** — Revu après QA (§8) ; intégrité factuelle et périmètre P1/P2 resserrés. |
| 6.3 | **Fait** — Approuvé par Strophe ; edits §4 appliqués le 2026-04-01 (voir §9). |
| 6.4 | **N/A** — Pas d’ajout/suppression d’epic dans `sprint-status.yaml`. |
| 6.5 | **Fait** — Prochaine action : re-run **implementation readiness** (recommandé) ; enchaîner Create Story / dev selon `sprint-status.yaml`. |

---

## 7. Suite (workflow étapes 5–6) — **clôturé**

**Approbation :** **oui** — mise en œuvre documentaire réalisée (§9).  

**Reste hors ce workflow :** régénérer `implementation-readiness-report-*.md` via **check implementation readiness** ; aucun fichier story `3-*.md` à la racine de `implementation-artifacts/` au moment de l’implémentation — §4.4 s’appliquera à la création des stories Epic 3.

**Mode :** Batch (livré en une passe).

---

## 8. Revue QA (pipelines validation + adversarial ciblé)

**Méta :** types PRD + architecture ; criticité medium ; mode validation + stress hypothèses (skill qa-agent) ; deux passes explore en parallèle sur le dépôt (lecture seule).

**Axes traités dans ce document :**

| Finding (origine QA) | Traitement |
|----------------------|------------|
| `implementation-patterns-consistency-rules.md` amalgamé aux fichiers « provisoire / Tailwind » | **Corrigé** : §2 et §4.2 distinguent stack ouverte vs règles couche Mantine + arborescence. |
| Critères de succès confondant P1/P2 avec autres « À trancher » (PRD ~L.868, product brief) | **Corrigé** : §4.1 hors périmètre explicite ; §5 critères numérotés avec périmètre P1/P2 ; §4.6 readiness + product brief. |
| UX : `*ux*.md` absent mais UX dans `epics.md` | **Corrigé** : §2 tableau UX. |
| Fichiers grep « oubliés » : `prd.md` / product brief | **Documenté** comme hors périmètre stack Peintre (sauf élargissement). |
| `project-structure-boundaries.md` (Mantine dans l’arbre) absent de §4.2 | **Ajouté** §4.2 + critère §5.1. |
| `implementation-readiness-report` : ne signalait pas l’écart ADR ↔ BMAD | **Ajouté** §4.6 (édits d’abord, re-run ensuite). |
| Ancrage vague pour l’edit PRD | **Corrigé** §4.1 (emplacements concrets). |
| AR26 présenté à tort comme « à trancher » | **Corrigé** §4.3 et §5.2 (AR26 = règle existante, harmonisation seulement si contradiction). |

**Décision PRD (reco « standard ») :** §4.1 implémentée avec **titre** « Stack Peintre_nano (figée) » + liens ADR et instruction.

---

## 9. Implémentation réalisée (2026-04-01)

| Artefact | Modification |
|----------|----------------|
| `prd.md` | Section **Stack Peintre_nano (figée)** ; `inputDocuments` : ADR + instruction. |
| `architecture/core-architectural-decisions.md` | P1/P2 intégrés (Important, Data, Frontend, Handoff) ; « provisoire » stack retiré. |
| `architecture/starter-template-evaluation.md` | Styling aligné ADR P1 ; hors périmètre P1/P2 sur « Restent à trancher ». |
| `architecture/implementation-patterns-consistency-rules.md` | Renvoi ADR P1 sur couche Mantine. |
| `architecture/project-structure-boundaries.md` | Commentaire `mantine-adapters/` + lien ADR. |
| `archive/architecture.md` | Bannière **P1/P2** supersède formulations archive. |
| `epics.md` | AR3, AR15 + lignes de mapping epic. |
| `references/ou-on-en-est.md` | Journal « Correct Course » + suite recommandée. |

**Non modifié (N/A au moment du run initial P1/P2) :** fichiers `*-story*.md` Epic 3 (aucun présent) ; `sprint-status.yaml` sans renumérotation des cles (statut inchangé).

**Mise a jour posterieure (extension §11) :** `sprint-status.yaml` a recu des **commentaires** de repere Piste A/B et jalons de convergence — voir §11.5 ; ne pas lire la ligne ci-dessus comme « YAML inchange » au sens strict.

---

## 10. Correctifs post-QA (2026-04-01)

Suite a la passe **qa-agent** : **PRD** (titre figée, priorite P1/P2, §7.1 P2 vs super-admin) ; **epics** (**AR45**, chemins `migration/mantine-adapters/`, `inputDocuments`, **Story 9.6** AC P2) ; **archive/architecture.md** (banniere Zustand/historique) ; **implementation-readiness-report** (addendum alignement ADR) ; **ou-on-en-est** (note au-dessus de « Prochaine etape »).

---

## 11. Extension Correct Course — developpement parallele Piste A / Piste B (2026-04-01)

### 11.1 Resume du probleme

Le cadrage co-architecte (session Opus + documents `references/peintre/` et decision directrice v2) formalise une **execution en deux pistes paralleles** avec **points de convergence**, des **decisions P1/P2 deja fermees** par ADR, et une **extension CREOS** `data_contract` + etats `WidgetDataState`. Les artefacts BMAD devaient **refleter** cette organisation **sans** modifier les documents de cadrage dates explicitement preserves (concept 2026-03-31, pipeline 2026-04-01, decision directrice 2026-03-31, etc.).

### 11.2 Analyse d'impact

| Zone | Impact |
|------|--------|
| **PRD** | Lien `data_contract` ; matrice §10.1 enrichie (WidgetDataState) ; emplacement `contracts/` ; `inputDocuments` instruction contrats. |
| **Architecture** | Nouvelle section Piste A/B + convergences dans `project-structure-boundaries.md` ; `recyclique-api.yaml` dans l'arbre ; `navigation-structure-contract.md` (fraicheur, `data_contract`, `operation_id`). |
| **Epics** | **AR46** ; etiquettes Piste A/B sur epics 1–4, 6, 7 ; assouplissement Story 3.0 (mocks Piste A) ; Story 1.4 / 3.4 / 6.1 / 6.9 completees ; clarification phases Peintre vs sequence decision directrice. |
| **sprint-status.yaml** | Commentaires de repere Piste A/B et jalons (pas de renumérotation). |
| **Code repo** | Creation `contracts/` : OpenAPI draft, schemas CREOS `widget-declaration`, `widget-data-states`. |

### 11.3 Approche recommandee

**Ajustement direct (Option 1)** + **documentation** : pas de rollback d'epics ; harmonisation du **gate** bandeau live avec la decision directrice ; les **phases Peintre** restent documentaires de maturite moteur, pas calendrier sprint.

### 11.4 Livrables et handoff

| Portee | Classification | Handoff |
|--------|----------------|---------|
| Mise a jour BMAD + `contracts/` | **Moderee** | PO/SM pour ordonnancement des convergences ; **Dev** pour implementation Piste A/B. |

### 11.4 bis Correctifs post-QA multi-agents (2026-04-01)

Apres rapport QA fusionne : chaine **OpenAPI** unifiee (`core-architectural-decisions.md`, `project-structure-boundaries.md`) ; **`built_at`** + regle **mutations backend** (`navigation-structure-contract.md`) ; **PRD §10.1** lexique `stale` / `DATA_STALE` ; **epics** (corps Epic 3, intro Epic 4 + Stories **4.3** / **4.6**, corps Epic 6 + **6.1**, AR46 mapping, libelle **Convergence 2**) ; **§9** ci-dessus (chronologie `sprint-status.yaml`) ; schemas **polling** + titre etats ; **`contracts/README.md`** (convention `source` / tags).

### 11.5 Fichiers touches (cette extension)

| Fichier | Role |
|---------|------|
| `contracts/README.md` | Point d'entree contrats |
| `contracts/openapi/recyclique-api.yaml` | Draft OpenAPI (Piste B) |
| `contracts/creos/schemas/widget-declaration.schema.json` | Extension `data_contract` |
| `contracts/creos/schemas/widget-data-states.schema.json` | Enum DATA_* |
| `prd.md`, `epics.md`, `architecture/project-structure-boundaries.md`, `architecture/navigation-structure-contract.md`, `architecture/core-architectural-decisions.md` | Alignement BMAD (+ passe QA) |
| `contracts/creos/schemas/README.md` | Notes validation schema (optionnel) |
| `implementation-artifacts/sprint-status.yaml` | Commentaires pistes / jalons |

---

*Fin du document — Correct Course, 2026-04-01 — workflow etendu §11.*
