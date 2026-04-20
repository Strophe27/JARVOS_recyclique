# Récapitulatif — warnings et restes (Epic 25 phase 2, depuis story 25.6)

**Date de synthèse :** 2026-04-21  
**Périmètre narratif :** fil d’orchestration BMAD depuis **25.6** jusqu’à **25.15** **done** dans `development_status` (phase 2 stories **25.6–25.15** bouclées côté YAML à la date de MAJ ci-dessous ; `epic-25` peut rester **in-progress** jusqu’à rétro / décision de clôture).  
**Usage :** mémoire pour clôture d’epic, QA agrégée optionnelle, et reprise sans perdre les réserves non bloquantes.

---

## 1. Warnings récurrents ou transverses (QA2 / orchestration)

| Thème | Description | Gravité habituelle |
|--------|-------------|---------------------|
| **`epics.md` ↔ `sprint-status.yaml`** | Risque de lecture contradictoire si on ne lit que l’un des deux (ex. « tout backlog » vs clés **done**). Des passes DS ont aligné §25 ; la **source de faits** reste **`development_status`**. | Doc / pilotage |
| **`last_updated` YAML** | Tension possible entre commentaires `# last_updated` et la clé racine `last_updated:` — harmonisations faites à plusieurs reprises ; à surveiller lors des prochains commits. | Mineur |
| **Docs « satellites »** (note readiness, rapport readiness phase 2, formulations « gel ») | Avant vague satellites post-25.6 : texte figé pré-levée ; une vague DS a rapproché addendum / note / rapport / spec / ADR (cohérence **post–25.6**). Résidu possible sur formulations figées ou copies hors dépôt (si diffusion PDF ou autre — **dans le repo**, ce sont des **Markdown**). | P2 doc |
| **QA2 variabilité** | Selon le run : faux positifs (fichiers « absents » alors qu’ils existent), ou **FAIL** puis **PASS** après correction périmètre / `readonly: false` pour le parent QA2. **Règle apprise :** parent QA2 avec **`readonly: false`** pour permettre planner + workers. | Process |
| **Gate « tout le repo » vs story** | Stories **doc** ou **spike** bloquées si GATE impose **pytest API entier + lint Peintre** alors que la story ne touche pas ces zones — nécessité de **baseline verte** ou gates ciblés (brief Story Runner). | CI / gates |
| **Contrats doubles** | **`contracts/openapi/recyclique-api.yaml`** (canon codegen) vs **`recyclique/api/openapi.json`** (export FastAPI) — dérive signalée en **P1** QA2 puis traitée par **régénération** (`generate_openapi.py`, commit dédié). À regénérer après changements schémas FastAPI significatifs. | Contrat |
| **YAML OpenAPI** | Une description non quotée avec `**` a **cassé le parseur** — correctif de forme (bloc / guillemets). Prévenir toute réintroduction de markdown brut dans `description:` sans quoting. | Bloquant pipeline |
| **Adversarial QA « sans fin »** | Plusieurs passes : objectif **P1 = 0** puis traitement **P2** ; une partie des **P2** relève du **polissage** ou du **périmètre programme** (matrice exhaustive de tests). | Charge |

---

## 2. Warnings par plage de stories (mémo conversation)

### 25.6 — Levée gel / pilotage

- Premier QA2 : désync **epics** vs **sprint** sur **25-6 done** → corrigé par DS + re-QA2.
- Second QA2 (satellites) : puis **PASS** ; réserves mineures (mini-tableau QA vs addendum, shell bash vs PowerShell dans exemples).

### 25.7 — Checklist spec §2–3

- Premier QA2 : contradiction epics/sprint → alignement **epics §25** puis **PASS** clôture + ADRs dans le scope.

### 25.8 — CONTEXT_STALE / garde contexte

- Enchaînements multiples : OpenAPI **finalize-held**, **PATCH** items/notes/poids, **cash_sessions**, clients Peintre (**sales-client**, **cash-session-client**), wizards cashflow, **correct_sale_sensitive**, décorateurs FastAPI **409** sur **step** / **exceptional-refund**, etc.
- **P2** successifs (reversals, `detail` oneOf, GET sans 409 — **comportement voulu** documenté, pas de 409 inventé sur GET).
- **Décision explicite** : matrice pytest exhaustive sur **toutes** les routes vente → report **supervision / story 25.10** (texte dans story / test-summary), pas blocage **25.8** « papier ».
- **Baseline gate 25.11** (hors délégation stricte dans un passage) : **SaleDetail** + `lifecycle_status` dans tests ; **`notes`** sur `SaleItemCreateBody` ; **category-hierarchy-display** typage — corrigés pour **tsc** / pytest (à considérer comme dette de process si certains commits ont été faits hors sous-agent uniquement).

### 25.9 — Outbox / mapping Paheko

- QA2 initial **FAIL** : preuves non versionnées + trace sprint → **DS** correctif puis **PASS** ; commit.

### 25.10 — Taxonomie `root_cause` admin outbox

- QA2 : **P1 = 0** ; réserves **N+1** liste admin, règle **4** (builder vs dernière transition), couverture branches, ambiguïtés **context_json**.
- Lot **DS** réserves : batch transitions (**edb841e**), doc + tests.
- QA2 suivant : **P1** sur **`openapi.json`** export vs runtime → **régénération FastAPI** (**5456849**).
- **Warnings QA2 post-5456849** (synthèse agent) : chemins absolus dans doc, harmonisation commandes pytest, limites garde-fou statique `_REL_PATHS` / `_FORBIDDEN`, cohérence **ADR** vs phase Redis dans les formulations.

### 25.11 — Spike contrats enveloppe

- Gate initial **FAIL** (pytest + **tsc**) jusqu’à baseline verte ; puis **PASS** ; commit **1a0f85e**.

### 25.12 — Audit AR12 Redis / async Paheko

- QA2 **PASS**, **P1 = 0** ; warnings non bloquants : mêmes familles que ci-dessus (chemins, pytest, garde-fou statique, ADR↔Redis).

### 25.13 — Journalisation opérateur vs poste / kiosque (tranche minimale)

- **Livré** dans le dépôt (trace **2026-04-20** en tête de `sprint-status.yaml` ; clé **`25-13` → `done`**).
- Story Runner **reprise 2026-04-21** : constat **aligné** — **PASS** ; rappel agent : **vs_loop = 1** (retry **VS** après alignement formulation **post** → **poste** dans le BDD).
- Périmètre : politique champs audit / `PAYMENT_VALIDATED` / `merge_critical_audit_fields`, pytest `recyclique/api/tests/test_story_25_13_journalisation_identite_operateur_poste_kiosque.py`, test-summary associé.

### 25.14 — Step-up et revalidation après changement de contexte sensible

- **Livré** dans le dépôt (trace **2026-04-20** ; **`25-14` → `done`**). Session Story Runner **2026-04-21** : **PASS** (cohérence avec état déjà présent ; **vs_loop = 0** selon rapport).
- **Coup de sonde local** : `pytest` ciblé **25-14** — **5** tests verts.
- Livrables typiques : matrice `_bmad-output/implementation-artifacts/2026-04-20-matrice-step-up-revalidation-contexte-sensible-25-14.md`, module `step_up.py`, pytest `test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py`, test-summary BMAD.

### 25.15 — Spike faisabilité IndexedDB / cache local (sans livraison PWA)

- **Livré** (`2026-04-20`) ; finalisation Story Runner **2026-04-21** : **CR APPROVE** puis **GATE** (compileall + pytest) → **`25-15` → `done`** dans le YAML.
- Rapport spike : `_bmad-output/implementation-artifacts/2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md` ; story + test-summary BMAD ; pytest gate `test_story_25_15_spike_faisabilite_indexeddb_cache_local_sans_pwa.py` (**14** tests au dernier run local).

---

## 3. Ce qui reste à faire ou est interrompu (état « fin de conversation »)

| Item | Statut | Détail |
|------|--------|--------|
| **Stories 25.13–25.15** | **Done** (YAML) | Implémentations principalement tracées **2026-04-20** ; orchestration **2026-04-21** = reprises Story Runner + contrôles pytest locaux (**25-14** : **5** tests ; **25-15** : **14** tests). |
| **Suite epic-25** | **Hors stories 25.x phase 2** | **`epic-25` : in-progress** dans le YAML tant qu’aucune **rétro / décision** n’a clôturé l’epic ; ne pas confondre avec la seule tranche **25.1–25.5** déjà close historiquement. |
| **QA2 agrégé** optionnel (paquet **25.6–25.15**) | Non exécuté | Mentionné dans le brief orchestrateur initial. |
| **Push `origin`** | À ta charge (Cursor) | Branche **`epic/25-socle-alignement-prd-architecture`** avec plusieurs commits **ahead** — pas poussés par l’orchestrateur. |
| **Clôture `epic-25`** | **À arbitrer** | Les clés **25.6–25.15** sont **done** ; la clôture **`epic-25: done`** reste une **décision produit / rétro** (phase 2 impl bouclée côté stories). |
| **Verdict programme PWA** | Inchangé | Brief : **NOT READY** ; **25.15** = spike **sans** levée de verdict programme seule. |
| **Gate API P0** | Rappel permanent | Stories touchant **Paheko / caisse / contrats** sensibles — vigilance **promo / merge** (rappel initial **25.9–25.11** et au-delà si touché). |

---

## 4. Liste brute des thèmes « warnings » à réutiliser pour audit final

- Désynchronisation rédactionnelle **epics / sprint** (mitigé, à re-vérifier à chaque story **done**).
- Commentaires YAML **vs** clés `development_status`.
- Docs readiness / gel / post-levée (satellites ; **Markdown** dans le dépôt — pas de chaîne « PDF » côté ce fil).
- **OpenAPI** : parsing YAML, alignement **YAML canon** ↔ **openapi.json** FastAPI.
- Gates **globaux** vs périmètre story (baseline pytest + **tsc** Peintre).
- **N+1** admin outbox (batch **edb841e** — surveiller autres listes admin).
- **QA2** : `readonly`, périmètre **scope_paths**, hallucinations « fichier absent ».
- **Matrice exhaustive tests CONTEXT_STALE** : explicitement **non** clôturée dans **25.8** ; renvoi **25.10** / supervision.
- **Garde-fou pytest statique AR12** (25.12) : limites `_REL_PATHS` / modules dynamiques.
- **IndexedDB / 25.15** : hors livraison PWA ; reste exploration.

---

## 5. Fichier et maintenance

- **Chemin :** `_bmad-output/planning-artifacts/2026-04-21-recap-warnings-et-restes-epic-25-phase2-depuis-25-6.md`
- **Mise à jour recommandée :** après chaque story **done** (dont **25.14–25.15**), et éventuel **QA2 agrégé** ; ajouter une section « Changelog » datée plutôt que d’effacer l’historique.

---

## 6. Compléments après relecture du document + du fil de conversation

*Cette section corrige les **manques de précision**, **oublis** et **incohérences** du brouillon initial.*

### 6.1 Règles du brief orchestrateur (chat initial) peu ou pas reflétées plus haut

| Règle (rappel) | Précision / oubli dans le récap initial |
|----------------|----------------------------------------|
| **Gel** jusqu’à **25.6** livrée proprement | Mentionné indirectement ; rappel explicite : toute exécution DS hors **`25-*`** était gelée avant la levée documentée. |
| **Parallèle 25-7 + 25-12** | Le **DAG** l’autorise sur le papier ; le brief disait **défaut : non** sans **oui** explicite de Strophe — **non exercé** dans ce fil (séquentiel). |
| **`epic-25: done`** | Ne pas repasser **done** sans décision explicite de **fin d’epic** — aligné §3 ; à ne pas confondre avec les stories **phase 1** déjà **done** avant le démarrage de la **phase 2** courante. |
| **Tri numérique** des clés `25-*` | Non détaillé dans le v1 du récap : un tri alphabétique place **25-10** avant **25-2** — risque d’erreur d’outillage. |
| **ADR 25-2 / 25-3** | Acceptés — **pas** rouvrir sans incohérence bloquante + preuve `[fichier:ligne]` ; nouvelle ADR seulement si réelle (rare). |
| **Anti-patterns** | Graphe entier dans un message sans Task ; `gates` vide sans justification ; Story Runner **et** QA2 en parallèle sur la **même** story ; éditer `SPRINT_STATUS` à la main hors Story Runner — utile pour audit post-mortem. |
| **Brief YAML Story Runner** | Runs avec **`gates`** / **`policy`** incomplets → ambiguïté ; recommandation agents : compléter le brief (mentionnée par les sous-agents). |
| **Init BMAD** | `python ... bmad_init.py load --project-root ... --all` si besoin — pas utilisé dans le récap v1. |
| **Chemins QA2 machine** | Skills sous `C:\Users\Strophe\.cursor\skills\...` — si chemins absents → **NEEDS_HITL** (pas improvisation). |

### 6.2 Process : délégation vs édition par le chat orchestrateur

- **Demande utilisateur explicite (fil ultérieur) :** tout passe par **Task / agents** ; **pas** d’édition directe des fichiers repo par le modèle conversation **principal**, pour préserver le contexte et la traçabilité.
- **Constat dans le fil :** à un moment, des **correctifs baseline** (pytest **SaleDetail** / `lifecycle_status`, **`SaleItemCreateBody.notes`**, **`category-hierarchy-display`**, et une ligne **YAML OpenAPI** injoignable au parseur) ont été appliqués **sans** passer uniquement par un sous-agent — **écart** par rapport à la délégation stricte. À tracer comme **dette de gouvernance** (à reproduire via Story Runner / shell / git-specialist si on refaisait la même séquence « by the book »).
- **Runs Story Runner** qui indiquent « exécuté dans ce contexte » / **Plan B** sans spawn Task à chaque skill : **écart** vis-à-vis de la spec « Task par étape » — fiabilité et prévisibilité moindres.

### 6.3 Technique et environnement (précisions absentes du v1)

| Sujet | Détail |
|--------|--------|
| **PowerShell** | Chaînage avec **`;`** plutôt que **`&&`** (sinon erreur parser sur certaines sessions Windows). |
| **`generate_openapi.py`** | Sous Windows, **`PYTHONUTF8=1`** (ou équivalent) peut être nécessaire pour éviter **`UnicodeEncodeError`** sur les **prints** avec caractères hors **cp1252** dans le terminal. |
| **Git** | Avertissements **CRLF** sur fichiers générés (**`recyclique-api.ts`**, etc.) — habituel sous Windows ; pas bloquant mais bruit de review. |
| **Cursor / GitHub** | Trailer **`Co-authored-by: Cursor`** — procédure projet : désactiver **Paramètres → Agents → Attribution** et redémarrer Cursor si besoin (`references/procedure-git-cursor.md`). |

### 6.4 « Un commit par story » vs réalité du dépôt

- Le brief orchestrateur visait **un commit par story** lorsque tout est vert.
- **Réalité du fil :** plusieurs commits par story (ex. **satellites** post-QA2, **openapi.json** séparé **5456849**, correctifs **25.8** en vagues, **25.9** P2 doc, etc.). Le récap v1 simplifiait trop — à assumer comme **granularité choisie** pour isoler risques (contrat / baseline).

### 6.5 Agents et QA2 (précision)

- **IDs Task** cités dans les sorties agents : **non recopiés** dans le récap v1 (volontairement) ; recherchables dans l’historique Cursor si besoin.
- **QA2** : scores de confiance **~72–88** selon passes (mentions dans rapports fusionnés) — pas des garde-fous **CI** automatiques.
- Certaines passes **QA2** ont utilisé des chaînes **generalPurpose** / fusion **atypique** quand le routeur parent ne suivait pas à la lettre **qa2-agent** — à garder en tête pour la **fiabilité** des verdicts « PASS ».
- **Limite de passe :** exemple agent — une passe **sans** `sprint-status.yaml` dans le scope → intention « pas de régression sprint » **non auditée** sur cette passe seule (complétée par une autre passe).

### 6.6 Interruptions **Task** (état réel)

| Story | Événement | Précision manquante en v1 |
|-------|-----------|---------------------------|
| **25.10** | Première session **interrompue**, puis **reprise** DS → **PASS** | Le récap ne disait pas qu’il y avait eu **deux vagues** (interruption + reprise). |
| **25.11** | Gate puis baseline puis clôture | Chronologie **FAIL gate → correctifs baseline → GATE vert → QA/CR** méritait une ligne dédiée. |
| **25.13** | **Terminé (dépôt)** | L’interruption évoquée dans les handoffs précédents était **obsolète** : livraison déjà tracée **2026-04-20** ; reprise **2026-04-21** = contrôle Story Runner **PASS**. |

### 6.7 DAG et dépendances (complément)

- **25.14** : `depends_on` **25-8** et **25-13** — les deux doivent être **done** avant promotion sûre.
- **25.15** : dépend de **25-11** ; indépendant de **25.13** dans le fichier DAG — ne pas confondre avec **25.14**.
- Remarque **DAG** sur **25-12** : peut être mené en parallèle serré avec **25-7** si ressource — **non fait** ici (ordre séquentiel conversationnel).

### 6.8 Livrables et constantes de pilotage (références projet)

À lier pour audits futurs (chemins typiques, non dupliqués en entier ici) :

- `DAG_PHASE2` : `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`
- Readiness phase 2, note readiness, gel doc, spec **25.4**, ADR PIN / ADR Async — comme dans le tableau constantes du brief utilisateur.

### 6.9 Incohérences internes corrigées dans ce complément

- Suppression de l’ambiguïté « **PDF** » pour les docs satellites : il s’agit de **fichiers Markdown** dans le repo.
- Distinction **contrat YAML** (`contracts/…`) vs **openapi.json** export FastAPI : deux pipelines ; le récap v1 les mélangeait parfois sous « OpenAPI » sans dire **quel** fichier servait au **finding P1** (**openapi.json**).

---

## 7. Changelog du présent document

| Date | Changement |
|------|------------|
| 2026-04-21 | Création initiale (récap warnings + restes). |
| 2026-04-21 | Ajout §6–§7 : relecture conversation + fichier — oublis, imprécisions, incohérences. |
| 2026-04-21 | Harmonisation ligne « satellites » §1 (Markdown vs diffusion externe) ; typo **epic-25** (phase 1 vs « 25.6–25.5 »). |
| 2026-04-21 | Post **25.13** : §2 sous-section 25.13 ; §3–§6.6 alignés **done** ; prochain focus **25.14** (Story Runner session utilisateur). |
| 2026-04-21 | Post **25.14** : §2 sous-section 25.14 ; §3 **25-14 done** ; enchaînement **25.15** (Story Runner). |
| 2026-04-21 | Post **25.15** : §2 sous-section 25.15 ; §3 synthèse **25.13–25.15 done** + note clôture epic ; reprise Task **CR/GATE** pour passer **review → done**. |

---

*Document produit sur demande utilisateur — synthèse conversationnelle ; les hashes de commit précis évoluent avec la branche : utiliser **`git log epic/25-socle-alignement-prd-architecture`** pour la vérité audit. Les **warnings** listés ne préjugent pas d’un futur état « réglé » ou « ouvert » sans re-run QA2 / revue humaine.*
