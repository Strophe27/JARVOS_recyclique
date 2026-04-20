---
type: note-readiness-cible
date: 2026-04-20
story: 25.5
epic: epic-25
sources:
  - implementation-readiness-report-2026-04-19
  - sprint-status.yaml
  - livrables-25-1-a-25-4
---

# Note de readiness ciblée — post-décisions documentaires Epic 25

> **ARCHIVÉ — photo du 2026-04-20 seulement (ce n’est pas l’état courant après le 2026-04-21).** À cette date, après clôture documentaire des stories **25-1** à **25-5** : dans `sprint-status.yaml`, **`epic-25` : `done`** et **`25-1`** … **`25-5`** : **`done`** chacune. Les phrases plus bas dans ce fichier qui racontent une séquence « en cours » (ex. **25-5** en review) sont le **fil de rédaction** au moment de la rédaction. **État courant (ancre)** : **`_bmad-output/implementation-artifacts/sprint-status.yaml`** (clé racine `last_updated` + `development_status`) — **ne pas** conclure depuis ce seul encadré.

**Addendum (2026-04-21)** — La tranche **documentaire 25.1–25.5** reste décrite par l’instantané archivé ci-dessus. **Post–story 25.6 livrée** : la **levée process** du gel hors `25-*` est documentée dans **`_bmad-output/planning-artifacts/2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md`** (`GEL_DOC`) ; les stories **25-7 à 25-15** (phase **impl**) sont dans **`epics.md`** §25 et en **`backlog`** dans **`sprint-status.yaml`** sauf **`25-6`** → **`done`** ; **`epic-25`** est **`in-progress`** pour cette phase. Voir **§3.a** / **§3.b**, le rapport **`implementation-readiness-report-2026-04-20-epic25-phase2.md`**, et le fichier machine **`_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`** (ordre des dépendances).

**Objectif :** rejouer le raisonnement du rapport de readiness du **2026-04-19** à la lumière des livrables **25.1 à 25.4** (sans refaire tout le workflow readiness global), puis **rebaseliner** la séquence **`25-*`** et le pilotage (`sprint-status`, candidat première story d'impl).

**Périmètre :** documentaire uniquement ; aucune nouvelle ADR (trace **ADR N/A** — décisions structurantes portées par **ADR 25-2** et **ADR 25-3**).

---

## 1. Synthèse — état vs rapport du 2026-04-19

Le rapport `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` posait deux niveaux :

| Niveau | Verdict 2026-04-19 | Après livrables 25.1–25.4 (2026-04-20) |
|--------|-------------------|----------------------------------------|
| **Cœur v2** (`prd.md`, `epics.md`, architecture index) | **GO conditionnel** (UX formelle absente, mitigée par stories) | **Inchangé** : le GO conditionnel reste valable ; la note Epic 25 **ne le transforme pas** en GO aveugle sur tout le périmètre produit. |
| **Extension PWA / kiosque / offline-first** (PRD vision) | **NON PRÊTE** / **NOT READY** ; synthèse exécutive et §6 (extension PWA offline-first, synthèse finale) | **Toujours NOT READY** pour un **programme massif** PWA : l'absorption des exigences vision en FR numérotés / epics dédiés et la preuve archi front (SW / IndexedDB, etc.) ne sont **pas** réalisées par les seuls livrables 25.1–25.4. |
| **Verdict global** | GO conditionnel v2 + **NO-GO** programme PWA centré tant qu'ADR ouverts, FR/epics non alignés, gate API P0 non arbitré | **Affiné** : les **ADR structurantes** (PIN, async Paheko) et la **spec convergée** sont **rédigées** ; les ADR **25-2** et **25-3** sont passées en **`accepted`** (2026-04-20) côté métadonnées — la **levée du gel** process et le **NOT READY** PWA massif restent des sujets **distincts** (correct course + readiness). |

**Écart clé conservé :** lever le **NOT READY** PWA massif et l'**alignement FR/epics** vision restent ouverts ; la **clôture documentaire** des ADR PIN et async Paheko est désormais au statut **`accepted`** dans les fichiers ADR (2026-04-20).

---

## 2. Gates — fermés, ouverts, première impl « autorisée » au sens pilotage

| Gate | État | Commentaire opérationnel |
|------|------|---------------------------|
| **Matrice alignement vision → canon (25.1)** | **Fermé (doc)** | Livrable : `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` ; YAML `25-1` → **done**. |
| **ADR PIN kiosque / opérateur / secret de poste / offline (25-2)** | **Fermé (accepté)** | Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` ; `status: accepted` — toute implémentation doit respecter l’ADR ; paramétrage SuperAdmin lockout : stories aval. |
| **ADR async Paheko / outbox / Redis auxiliaire (25-3)** | **Fermé (accepté)** | Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` ; `status: accepted`. |
| **Spec convergée multisite / permissions / kiosque / Paheko (25.4)** | **Fermé (doc)** | Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` ; index architecture mis à jour (story 25.4). |
| **Readiness ciblée + rebaselining `25-*` (25.5)** | **Fermé (doc)** après publication de **cette note** et synchronisation story **25-5** + YAML (**`done`** au sens `development_status`, cf. sprint-status). | Ne substitue pas au **readiness global** du 19 ; **actualise** le pilotage post-Epic 25 documentaire. |
| **Readiness globale extension PWA / kiosque** | **Ouvert** | Toujours **NOT READY** au sens du rapport 19 tant que FR vision, preuves techniques PWA et arbitrages restants ne sont pas clos. |
| **Gate qualité API (audit brownfield P0)** | **Ouvert** | **Orthogonal** au périmètre *décisionnel* Epic 25 (matrices, ADR, spec) : ne bloque pas la **rédaction documentaire** des stories **25.6+**. En revanche il reste une **condition de GO** pour les **promotions** `ready-for-dev` / merges **qui touchent Paheko ou caisse** tant que les P0 du chantier audit ne sont pas traités ou explicitement reportés avec propriétaire (cf. story **25.11** AC). |
| **Gel process correct course (hors `25-*`)** | **Fermé (doc)** — **post–25.6** | Source du gel : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`. **Levée traçable** : addendum **`2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md`** + commentaires / clés dans **`sprint-status.yaml`** — nouvelles exécutions **`bmad-dev-story`** hors **`25-*`** **réautorisées** sous les **conditions** du `GEL_DOC` (NOT READY PWA massif, gate API P0 si applicable, ADR **25-2** / **25-3** non rouvertes). Le YAML conserve les statuts des epics **10 / 12 / 13 / 14 / 15** comme **preuve d'état** (pas de rétroconduction). |
| **UX dédiée sous planning-artifacts** | **Ouvert (mineur)** | Absence notée dans le rapport 19 ; acceptable brownfield si AC dans les stories — **avertissement fort** si programme PWA massif. |

**Première story d'implémentation pertinente — peut-elle passer en `ready-for-dev` « légalement » (gel + ADR + readiness) ?**

- **Pour une nouvelle promotion** ou un **élargissement** du périmètre **kiosque / PWA delivery** : les ADR **25-2** et **25-3** sont **acceptés** ; la **levée process** du gel hors `25-*` est **documentée** (**`GEL_DOC`** / **25.6**) ; reste l'extension PWA **NOT READY** au sens du rapport du 19 tant que FR/preuves techniques ne sont pas clos.
- **Pour le cœur v2** : le **GO conditionnel** du 19 continue de s'appliquer ; les **nouveaux** DS hors **`25-*`** sont **autorisés** sous les **conditions** du **`GEL_DOC`** (distinct du verdict **NOT READY** PWA massif).
- **Cas `13-8`** : la clé `13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano` est déjà en **`review`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` (travaux amorcés avant gel / cycle existant). La note **ne** promeut **pas** une nouvelle vague kiosque **sans** les prérequis ci-dessus ; le **candidat** pour une future passe **`bmad-create-story`** (rafraîchissement de contexte, suites) reste **13-8**, aligné spec **25.4** §5 (« Gated — extension PWA / kiosque delivery ») et `epics.md` Epic 13.

---

## 3. Rebaselining backlog `25-*` (pilotage)

### 3.a Instantané archivé au **2026-04-20** (ne pas confondre avec l’état courant)

**Séquence post-décisions documentaires (ordre métier `25-*`) — valide au moment de la clôture documentaire :**

1. **25-1** — `25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique` → **done**  
2. **25-2** — `25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste` → **done** (ADR **accepted**)  
3. **25-3** — `25-3-fermer-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride` → **done** (ADR **accepted**)  
4. **25-4** — `25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19` → **done**  
5. **25-5** — `25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions` → **done** (Story Runner fin de cycle ; présente note + artefacts associés ; cf. YAML).

**Epic au 2026-04-20** : `epic-25` → **`done`** pour la **seule tranche documentaire** **25-1** à **25-5** (toutes en **`done`** dans `sprint-status.yaml` à cette date ; rétro epic **optionnelle** inchangée).

### 3.b État courant (**après 2026-04-21**)

**Source de vérité opérationnelle** : `_bmad-output/implementation-artifacts/sprint-status.yaml` (champ `last_updated` et clés sous `epic-25`).

À partir du **2026-04-21** : stories **25-6** à **25-15** rédigées dans `_bmad-output/planning-artifacts/epics.md` §25 ; **`25-6`** → **`done`** au pilotage (levée **process** tracée) ; **`25-7`** … **`25-15`** en **`backlog`** sauf promotion ultérieure ; **`epic-25`** → **`in-progress`** (phase implementation). Les paragraphes **3.a** ci-dessus restent un **historique** ; toute décision pilotée se lit d’abord dans le **YAML** puis dans **epics.md**.

**Ce qui ne change pas sans instruction Story Runner / correct course :** les **gates** readiness PWA massif et gate API P0 (distincts de la levée **process** documentée dans **`GEL_DOC`**) ; seules les **promotions de statut** et les **levées** documentées mettent à jour le pilotage.

---

## 4. Citations obligatoires — sources dans le corps de la note

Les trois sources suivantes sont rappelées **ici** (exigence AC story 25.5), avec usage :

1. **`_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`** — baseline **NOT READY** PWA / kiosque, **GO conditionnel** v2, **NO-GO** programme massif ; référence § synthèse exécutive, § extension PWA offline-first, § synthèse finale (étape 6).  
2. **`_bmad-output/implementation-artifacts/sprint-status.yaml`** — vérité opérationnelle des clés `development_status` (instantané **post–25.6 livrée** : **`25-1`** … **`25-6`** en **`done`**, **`25-7`** … **`25-15`** en **`backlog`**, **`epic-25`** en **`in-progress`** ; commentaires de levée sous epics **10 / 13–15** ; **`13-8`** selon valeur courante dans le YAML — **toujours** rouvrir le fichier pour l’instantané exact).  
3. **Livrables Epic 25 approuvés pour le pilotage (chemins)** :  
   - **25.1** — `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`  
   - **25.2** — `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`  
   - **25.3** — `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`  
   - **25.4** — `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`  

---

## 5. Candidat principal pour une future passe `bmad-create-story` (impl kiosque Peintre)

**Clé story :** `13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano`

**Références :**

- `_bmad-output/planning-artifacts/epics.md` — Epic 13, story **13.8**  
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — clé ci-dessus (**review** au 2026-04-20)  
- Spec **25.4** — `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` §5 (ligne « **Gated — extension PWA / kiosque delivery** », epics type **13.8**)

**Si le produit tranche un autre ordre** (ex. **12-1** réception avant **13-8**) : justifier dans un futur brief en croisant `epics.md` et `guide-pilotage-v2.md` ; la présente note conserve **13-8** comme **candidat principal** aligné sur la trajectoire documentée spec 25.4.

**Conditions avant de relancer une chaîne impl lourde sur ce périmètre :** ADR **25-2** et **25-3** **acceptés** ; stories **25.5** et **25.6** **done** au sens YAML ; **levée du gel** tracée via **`GEL_DOC`** (addendum **25.6**) pour les **nouveaux** DS hors **`25-*`**. Le **NOT READY** programme PWA massif et le **gate API P0** restent des **garde-fous** distincts (voir rapport **2026-04-20** phase 2 Epic 25).

### DoD Story Runner (brief futur)

Source normative : `references/automatisation-bmad/epic-story-runner-spec.md`.

- **§6.2** `story_run` : YAML minimal avec `story_key`, `project_root`, `resume_at`, `paths`, `mode_create_story`, compteurs `vs_loop` / `qa_loop` / `cr_loop`, `gates` ou `gates_skipped_with_hitl` explicite.  
- **§5** : graphe **CS → VS → DS → GATE → QA → CR** ; après correctif CR : **DS → GATE → QA → CR** (pas de saut de QA si politique projet).  
- **§7** / **§7.1** : sorties **PASS** | **FAIL** | **NEEDS_HITL** ; rapport final avec compteurs finaux, fichiers touchés, prochaine action Epic Runner.

**Exemple de squelette `story_run` (à compléter par chemins absolus réels au moment du run) :**

```yaml
story_key: "13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano"
epic_id: epic-13
project_root: "<absolu-projet>"
resume_at: CS
paths:
  sprint_status: "<absolu>/_bmad-output/implementation-artifacts/sprint-status.yaml"
  story_file: "<absolu>/_bmad-output/implementation-artifacts/13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano.md"
skill_paths:
  create_story: "<absolu>/.cursor/skills/bmad-create-story/SKILL.md"
  dev_story: "<absolu>/.cursor/skills/bmad-dev-story/SKILL.md"
  qa_e2e: "<absolu>/.cursor/skills/bmad-qa-generate-e2e-tests/SKILL.md"
  code_review: "<absolu>/.cursor/skills/bmad-code-review/SKILL.md"
mode_create_story: create
gates_skipped_with_hitl: false
vs_loop: 0
qa_loop: 0
cr_loop: 0
```

---

## 6. Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR pour 25.5 ? | **ADR N/A** — story documentaire ; pas d'arbitrage structurant supplémentaire. |
| ADR **25-2** | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` |
| ADR **25-3** | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |

*(Les chemins Windows ci-dessus sont ceux du dépôt local ; équivalents relatifs dans le repo : préfixe `_bmad-output/planning-artifacts/architecture/`.)*

---

## 7. Phrase explicite — promotion `ready-for-dev` kiosque / PWA

**Ancre état courant :** `sprint-status.yaml` + addendum **`GEL_DOC`** (levée **process** post–**25.6**).

**Gates §2 encore ouverts** (indépendamment de la levée **process**) : **readiness** programme PWA / kiosque massif (**NOT READY** rapport 19) ; **gate qualité API P0** pour promotions qui touchent Paheko/caisse ; **UX** dédiée planning-artifacts (mineur). **Fermés (doc)** : matrice **25.1**, ADR **25-2** / **25-3** acceptés, spec **25.4**, stories **25.5** / **25.6**, **gel process** hors `25-*` au sens **addendum 25.6** + YAML.

**Non** pour un **nouveau** volume **kiosque / PWA delivery** « massif » tant que l'extension PWA n'a pas levé le statut **NOT READY** du rapport **2026-04-19** par les mécanismes qu'il identifie (FR/epics, preuves, gate API) — **sans contredire** le **GO conditionnel** sur le **cœur v2**. **Oui** pour des **nouveaux** DS **hors `25-*`** lorsque les **conditions** du **`GEL_DOC`** sont respectées (et le **GO conditionnel** le cas échéant).

---

**Fichier note :** `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`  
**Généré dans le cadre de :** story **25.5** — DS `bmad-dev-story`.
