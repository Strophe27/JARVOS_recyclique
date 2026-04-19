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

> **État final aligné sur `sprint-status.yaml` (2026-04-20)** — Vérité opérationnelle : **`epic-25` : `done`** ; stories **`25-1`** à **`25-5`** : **`done`** chacune. Les sections ci-dessous qui décrivent une séquence « en cours » (ex. **25-5** en review, epic en in-progress) reflètent le **fil chronologique de rédaction** ; pour l’audit et QA2, **priorité au YAML** et à cet encadré.

**Objectif :** rejouer le raisonnement du rapport de readiness du **2026-04-19** à la lumière des livrables **25.1 à 25.4** (sans refaire tout le workflow readiness global), puis **rebaseliner** la séquence **`25-*`** et le pilotage (`sprint-status`, candidat première story d'impl).

**Périmètre :** documentaire uniquement ; aucune nouvelle ADR (trace **ADR N/A** — décisions structurantes portées par **ADR 25-2** et **ADR 25-3**).

---

## 1. Synthèse — état vs rapport du 2026-04-19

Le rapport `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` posait deux niveaux :

| Niveau | Verdict 2026-04-19 | Après livrables 25.1–25.4 (2026-04-20) |
|--------|-------------------|----------------------------------------|
| **Cœur v2** (`prd.md`, `epics.md`, architecture index) | **GO conditionnel** (UX formelle absente, mitigée par stories) | **Inchangé** : le GO conditionnel reste valable ; la note Epic 25 **ne le transforme pas** en GO aveugle sur tout le périmètre produit. |
| **Extension PWA / kiosque / offline-first** (PRD vision) | **NON PRÊTE** / **NOT READY** ; synthèse exécutive et §6 (extension PWA offline-first, synthèse finale) | **Toujours NOT READY** pour un **programme massif** PWA : l'absorption des exigences vision en FR numérotés / epics dédiés et la preuve archi front (SW / IndexedDB, etc.) ne sont **pas** réalisées par les seuls livrables 25.1–25.4. |
| **Verdict global** | GO conditionnel v2 + **NO-GO** programme PWA centré tant qu'ADR ouverts, FR/epics non alignés, gate API P0 non arbitré | **Affiné** : les **ADR structurantes** et la **spec convergée** sont **rédigées** et traçables, mais en statut **`proposed`** — la **fermeture humaine** (*accepted*) et la **levée du gel** process restent des **prérequis** avant toute promesse de **delivery** kiosque/PWA. |

**Écart clé conservé :** le rapport du 19 exigeait notamment la **clôture des ADR** (PIN kiosque, async Paheko) et l'**alignement FR/epics** pour lever le **NOT READY** PWA. Les stories **25.2** et **25.3** ont **fermé la rédaction** des ADR au sens **story done** ; elles n'équivalent **pas** à une acceptation formelle **`accepted`** dans les métadonnées YAML des ADR (toujours `status: proposed` au 2026-04-20).

---

## 2. Gates — fermés, ouverts, première impl « autorisée » au sens pilotage

| Gate | État | Commentaire opérationnel |
|------|------|---------------------------|
| **Matrice alignement vision → canon (25.1)** | **Fermé (doc)** | Livrable : `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` ; YAML `25-1` → **done**. |
| **ADR PIN kiosque / opérateur / secret de poste / offline (25-2)** | **Fermé (rédaction)** / **Ouvert (gouvernance impl)** | Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` ; `status: proposed` — **acceptation humaine requise** avant code qui **matérialise** PIN kiosque, secret de poste, lockout métier ou offline au sens ADR. |
| **ADR async Paheko / outbox / Redis auxiliaire (25-3)** | **Fermé (rédaction)** / **Ouvert (gouvernance impl)** | Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` ; `status: proposed` — idem. |
| **Spec convergée multisite / permissions / kiosque / Paheko (25.4)** | **Fermé (doc)** | Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` ; index architecture mis à jour (story 25.4). |
| **Readiness ciblée + rebaselining `25-*` (25.5)** | **Fermé (doc)** après publication de **cette note** et synchronisation story **25-5** + YAML (**`done`** au sens `development_status`, cf. sprint-status). | Ne substitue pas au **readiness global** du 19 ; **actualise** le pilotage post-Epic 25 documentaire. |
| **Readiness globale extension PWA / kiosque** | **Ouvert** | Toujours **NOT READY** au sens du rapport 19 tant que FR vision, preuves techniques PWA et arbitrages restants ne sont pas clos. |
| **Gate qualité API (audit brownfield P0)** | **Ouvert** | Rappel rapport 19 : traiter ou tracer les P0 pour équipes Paheko/caisse — **orthogonal** à Epic 25 mais **condition de GO** sur chantiers sensibles. |
| **Gel process correct course (hors `25-*`)** | **Ouvert** | `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` : pas de **nouveau** `bmad-dev-story` hors clés **`25-*`** tant que la levée n'est pas documentée ; le YAML conserve les statuts existants des epics **10 / 12 / 13 / 14 / 15** à titre de **preuve d'état**, pas de rétroconduction. |
| **UX dédiée sous planning-artifacts** | **Ouvert (mineur)** | Absence notée dans le rapport 19 ; acceptable brownfield si AC dans les stories — **avertissement fort** si programme PWA massif. |

**Première story d'implémentation pertinente — peut-elle passer en `ready-for-dev` « légalement » (gel + ADR + readiness) ?**

- **Pour une nouvelle promotion** ou un **élargissement** du périmètre **kiosque / PWA delivery** (ex. repartir de zéro sur une clé encore en **backlog** dans la zone gelée) : **non**, tant que **(1)** ADR **25-2** et **25-3** ne sont pas **acceptés** (ou équivalent documenté), **(2)** la **levée du gel** n'est pas tracée, **(3)** l'extension PWA reste **NOT READY** au sens du rapport du 19.
- **Pour le cœur v2** et travaux **non contraires** au gel (hors périmètre gelé) : le **GO conditionnel** du 19 continue de s'appliquer ; le gel **interdit** surtout d'**ouvrir** de nouvelles exécutions **DS** hors **`25-*`** sans levée.
- **Cas `13-8`** : la clé `13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano` est déjà en **`review`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` (travaux amorcés avant gel / cycle existant). La note **ne** promeut **pas** une nouvelle vague kiosque **sans** les prérequis ci-dessus ; le **candidat** pour une future passe **`bmad-create-story`** (rafraîchissement de contexte, suites) reste **13-8**, aligné spec **25.4** §5 (« Gated — extension PWA / kiosque delivery ») et `epics.md` Epic 13.

---

## 3. Rebaselining backlog `25-*` (pilotage)

**Séquence post-décisions documentaires (ordre métier `25-*`) :**

1. **25-1** — `25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique` → **done**  
2. **25-2** — `25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste` → **done** (ADR **proposed**)  
3. **25-3** — `25-3-fermer-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride` → **done** (ADR **proposed**)  
4. **25-4** — `25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19` → **done**  
5. **25-5** — `25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions` → **done** (Story Runner fin de cycle ; présente note + artefacts associés ; cf. YAML).

**Epic** : `epic-25` → **`done`** (toutes les stories **25-1** à **25-5** en **`done`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` ; rétro epic **optionnelle** inchangée côté statut YAML).

**Ce qui ne change pas sans instruction Story Runner / correct course :** le contenu de `epics.md` ; seul le **pilotage** et les **conditions** de la prochaine story sont explicites ici.

---

## 4. Citations obligatoires — sources dans le corps de la note

Les trois sources suivantes sont rappelées **ici** (exigence AC story 25.5), avec usage :

1. **`_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`** — baseline **NOT READY** PWA / kiosque, **GO conditionnel** v2, **NO-GO** programme massif ; référence § synthèse exécutive, § extension PWA offline-first, § synthèse finale (étape 6).  
2. **`_bmad-output/implementation-artifacts/sprint-status.yaml`** — vérité opérationnelle des clés `development_status` (dont **`25-1`** à **`25-5`** et **`epic-25`** en **`done`**, gel commenté sous epics 10/12/13/14/15, **`13-8`** en **review**).  
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

**Conditions avant de relancer une chaîne impl lourde sur ce périmètre :** ADR **25-2** et **25-3** **acceptés** (ou équivalent), story **25.5** **done** au sens YAML (gates/QA/CR Story Runner si applicable — statut final cohérent sprint-status), **levée du gel** tracée si requise pour sortir du seul rail **`25-*`**.

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

**Non** pour une **nouvelle** story ou un **nouveau** volume **kiosque / PWA delivery** tant que les ADR **25-2** et **25-3** ne sont pas **acceptés**, que le **gel** correct course n'est pas **levé** de façon tracée, et que l'extension PWA n'a pas levé le statut **NOT READY** du rapport **2026-04-19** par les mécanismes qu'il identifie (FR/epics, preuves, gate API). **Oui** pour poursuivre le **socle v2** déjà couvert par le **GO conditionnel**, sous respect du **gel** sur les **nouvelles** exécutions DS hors **`25-*`**.

---

**Fichier note :** `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`  
**Généré dans le cadre de :** story **25.5** — DS `bmad-dev-story`.
