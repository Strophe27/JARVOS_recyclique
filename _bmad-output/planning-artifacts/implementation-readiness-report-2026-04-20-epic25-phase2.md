---
stepsCompleted:
  - step-01
  - step-02
  - step-03
  - step-04
  - step-05
  - step-06
workflowType: implementation-readiness
date: '2026-04-20'
project_name: JARVOS_recyclique
assessment_scope: 'Epic 25 — stories 25.6 à 25.15 (phase 2 impl.)'
communication_language: French
document_output_language: French
assessor: 'Agent BMAD (workflow check-implementation-readiness) + bmad_init load --all'
documentsIncluded:
  prd_primary: '{planning_artifacts}/prd.md'
  epics_primary: '{planning_artifacts}/epics.md'
  architecture_canonical: '{planning_artifacts}/architecture/index.md'
  architecture_archive_note: '{planning_artifacts}/archive/architecture.md'
  ux_primary: null
---

# Rapport de préparation à l’implémentation (Implementation Readiness)

**Date :** 2026-04-20  
**Projet :** JARVOS_recyclique  
**Périmètre :** Epic 25, stories 25.6–25.15

## Inventaire — Étape 1 (Document Discovery)

### PRD

**Documents entiers :**

| Fichier | Taille | Dernière modification |
|--------|--------|------------------------|
| `prd.md` | 92 774 octets | 2026-04-20 |

**Documents connexes (hors PRD canon, traçabilité / validation) :**

- `prd-validation-report-2026-04-01.md`, `prd-validation-report-2026-04-01-post-edit.md`, `prd-validation-report-2026-04-15-post-edit.md`
- `sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` (référence PRD / gel)
- `research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`

**Dossiers shardés PRD :** aucun (`*prd*/index.md` introuvable).

### Architecture

**Dossier shardé actif :** `architecture/`

- Point d’entrée : `architecture/index.md`
- Fichiers notables (non exhaustif) : `core-architectural-decisions.md`, `project-structure-boundaries.md`, `implementation-patterns-consistency-rules.md`, ADR et spec 2026-04-19 / 2026-04-20 (PIN, outbox async, spec socle multisite, etc.)

**Documents entiers « architecture » hors dossier :**

- `architecture/architecture-workflow-completion.md`
- `architecture/architecture-validation-results.md`

**Archive :** `archive/architecture.md` — **doublon potentiel** avec le corpus shardé `architecture/` ; version retenue pour l’évaluation : **`architecture/index.md` + fichiers du dossier `architecture/`** (l’archive sert d’historique, pas de source canonique).

### Epics et stories

**Document entier :** `epics.md` (Epic 25 §25.6–25.15 à analyser aux étapes suivantes).

**Dossiers shardés epics :** aucun.

### UX

**Documents entiers correspondant au motif `*ux*.md` :** aucun fichier dédié clairement identifié comme livrable UX dans `planning-artifacts`.

**Avertissement :** les spécifications d’expérience pour le kiosque / poste semblent **dispersées** dans le PRD, les epics, la spec socle multisite et les ADR. Impact : l’étape d’alignement UX devra s’appuyer sur ces sources et signaler les **lacunes UX** explicites.

### Synthèse des problèmes (étape 1)

| Type | Détail |
|------|--------|
| Doublon format | `archive/architecture.md` vs corpus `architecture/` — résolution : canon = dossier `architecture/`. |
| Manquant (motif) | Pas de dossier ou fichier UX dédié type `*ux*.md` / `ux/index.md`. |

**Sélection pour la suite du workflow :** PRD = `prd.md` ; Epics = `epics.md` ; Architecture = `architecture/index.md` et documents du même dossier référencés par l’index ; artefacts additionnels listés dans la mission utilisateur (note readiness, DAG, matrice vision, sprint-status, etc.) seront croisés aux étapes 2–6.

**Menu étape 1 :** poursuite avec **[C] Continuer** (mandat utilisateur : enchaîner le workflow sans halte).

## Analyse PRD — Étape 2

### Exigences fonctionnelles et non fonctionnelles

Le `prd.md` indique que les identifiants stables **FR1 à FR73** et **NFR1 à NFR28** sont définis dans l’inventaire de `epics.md` (sections *Functional Requirements* et *NonFunctional Requirements*) ; le PRD en est la **source narrative** et `epics.md` fait foi pour les **ID machine** et le découpage story.

Pour l’évaluation de couverture (étape 3), la liste complète retenue est donc celle de `epics.md` (FR1–FR73, NFR1–NFR28, plus AR* additionnelles dans le même inventaire).

### Contraintes et exigences additionnelles (PRD, périmètre Epic 25 / kiosque)

Issues du corps et du frontmatter du PRD, pertinentes pour la phase **25.6–25.15** :

- **Gel d’exécution** (correct course 2026-04-19) : `bmad-dev-story` hors stories **25-\*** est gelé tant que la décision de levée n’est pas tracée ; le YAML peut garder des epics `in-progress` à titre historique.
- **Précédence documentaire** : décision directrice → `prd.md` → PRD spécialisés / architecture BMAD → `epics.md` / stories ; PRD vision 2026-04-19 = cible complémentaire non canonique tant que non absorbée par les ADR.
- **PWA / kiosque** : le rapport readiness 2026-04-19 est cité comme classant l’extension PWA **non prête** / **NOT READY** ; les stories ne doivent pas présupposer une **PWA de production** sans lever ce gate.
- **Deux familles PIN** : PIN opérateur caisse (canon brownfield) vs PIN kiosque (cible) — l’ADR PIN kiosque était requis avant code large ; désormais **ADR 25-2** est acceptée (hors redébat sauf incohérence bloquante).
- **Sync Paheko** : chemin nominal **outbox durable PostgreSQL** ; formulation « file Redis » du PRD vision **non canonique** sans ADR sync — **ADR 25-3** async/outbox acceptée.
- **Gate API (chantier refactor / audit P0)** : garde-fou pour PR touchant Paheko / caisse (orthogonal au PRD produit mais **bloquant process** pour surfaces sensibles).
- **Gate readiness** : avant d’épaissir massivement les stories kiosque, exécuter `bmad-check-implementation-readiness` (alignement PRD + architecture + epics).

### Évaluation préliminaire de complétude du PRD (Epic 25)

Le PRD est **cohérent et explicite** sur les verrous process (gel, NOT READY PWA, gate API, précédence). La granularité opérationnelle pour poste kiosque / multisite est **reportée** vers l’architecture (spec 25.4, ADR 25-2 / 25-3) et l’Epic 25, ce qui est **volontaire** et non un « trou » du PRD seul.

## Validation couverture FR (Epics) — Étape 3

### Méthode

Comparaison des **FR1–FR73** du PRD / `epics.md` avec la section **`### FR Coverage Map`** de `epics.md` (lignes ~246–320).

### Résultat

Chaque **FR1 à FR73** apparaît dans la carte avec **au moins un epic** assigné. Les FR concernés par la vision kiosque / multisite / sync incluent explicitement **Epic 25** là où le map le prévoit : **FR11, FR12, FR14, FR15, FR20, FR39, FR41, FR71, FR73** (ainsi que des epics partenaires 1, 2, 8, 10 selon le FR).

### Statistiques (niveau epic)

| Indicateur | Valeur |
|------------|--------|
| Total FR PRD | 73 |
| FR avec au moins un epic dans la carte | 73 |
| FR sans couverture epic | **0** |
| Couverture (niveau epic) | **100 %** |

### Manques au niveau « story 25.6–25.15 »

L’étape 3 ne valide **pas** encore la qualité story par story ; elle constate seulement qu’**il n’y a pas de trou de couverture FR au niveau epic**. La chaîne **25.6 → 25.15** opérationnalise les décisions déjà cartographiées sur Epic 25 + Epics 2 / 8 / etc., sans introduire de nouveaux ID FR hors inventaire.

## Alignement UX — Étape 4

### Statut document UX dédié

**Non trouvé** : aucun fichier unique `*ux*.md` ni dossier `ux/` dans `planning-artifacts` identifié comme livrable UX « produit ».

### UX implicite et substituts documentaires

- **`epics.md`** : section **UX Coverage Map** (UX-DR1–UX-DR16) avec mapping vers epics ; plusieurs principes touchent **Epic 2, 5, 6, 7, 8** (contexte, erreurs, step-up, bandeau live).
- **PRD** : parcours caisse / réception, actions sensibles, dégradations — exigences d’expérience intégrées au narratif.
- **Spec 25.4** + **ADR 25-2** : comportements attendus post-changement de contexte, step-up, distinction identités — **supportent** les stories **25.8**, **25.14** (matrice de preuve, erreurs corrélées).
- **Stories 25.10** (taxonomie causes) : dimension « opération / supervision » plutôt que wireframe ; acceptable pour la phase mais **pas** un design d’écran complet.

### Écarts / avertissements

| Sujet | Gravité | Commentaire |
|-------|---------|-------------|
| Absence de doc UX « écran par écran » pour supervision / quarantaine | **Avertissement** | Les AC de **25.10** exigent une taxonomie documentée, pas une refonte UI ; risque résiduel de dette UX si des équipes inventent des libellés hors spec. |
| Parcours step-up (**25.14**) | **Avertissement mineur** | Matrice scenario → preuve documentée + tests ; pas de maquette dédiée dans les artefacts listés — acceptable si l’équipe réutilise les patterns admin/caisse existants. |

### Conclusion étape 4

L’UI est **impliquée** et **partiellement** couverte par epics (UX-DR) + spec 25.4 + stories ; **pas de blocage NO-GO** uniquement pour absence de fichier UX isolé, sous réserve de respecter les AC **25.7–25.14** sur explicitation et tests.

## Revue qualité Epic / stories (Epic 25 phase 2) — Étape 5

### Cadre

Revue ciblée sur **Epic 25** et les stories **25.6–25.15** selon les critères du workflow *create-epics-and-stories* (valeur livrable, dépendances, taille, AC).

### Points conformes

- **Valeur / rôles** : stories formulées en **As a … I want … So that …** avec rôles métier ou pilotage (pilote BMAD, tech lead, steward backend) — cohérent avec un epic de **socle et gouvernance** post–correct course.
- **AC** : structure **Given / When / Then** ; périmètres **hors scope** explicites (pas de PWA, pas de offline PIN avancé, pas de levée NOT READY déguisée pour **25.15**, etc.).
- **Dépendances intra-epic** : graphe **acyclique** ; pas de « story future » requise pour finir une story antérieure dans le sens interdit. Fichier machine `epic-25-phase2-dag-2026-04-21.yaml` aligné avec les AC (ex. **25.14** après **25.8** et **25.13**).
- **Parallélisme autorisé** : **25-12** peut avancer en parallèle serré avec **25-7** (note DAG + commentaire `sprint-status.yaml`) — pas de violation d’indépendance si les équipes respectent la condition de ressource.
- **Prérequis externe Epic 8** : story **25.9** suppose **8-3** à **8-6** livrées — dans `sprint-status.yaml`, ces clés sont en **`done`** (instantané analysé) : **pas de violation forward** détectée.

### Écarts / vigilances (non bloquants si pilotés)

| Sévérité | Observation |
|----------|-------------|
| 🟡 Mineur | Epic 25 phase 2 mélange **spikes** (**25.11**, **25.15**) et **livraisons comportementales** ; acceptable car périmètres bornés et AC anti-dérapage (pas de livraison PWA). |
| 🟡 Mineur | Part des stories est **process / conformité** (**25.6** levée de gel, **25.12** audit Redis) plutôt que bénéfice utilisateur final — acceptable dans le contexte **gel + ADR** mais à ne pas généraliser comme modèle d’epic produit. |
| 🟡 Mineur | **25.10** : livrable « taxonomie » sans maquette UI — risque de **divergence de libellés** si la supervision n’ancre pas les chaînes affichées sur la spec ; mitiger par revue UX légère ou design system existant. |

### Violations critiques (🔴)

**Aucune** identifiée sur la structure des stories **25.6–25.15** (pas d’epic « pure milestone technique » sans livrable vérifiable, pas de dépendance circulaire dans le DAG).

## Synthèse et recommandations — Étape 6

### Verdict pour enchaîner `bmad-create-story` / dev sur **25.6 → 25.15**

**GO conditionnel** (équivalent « **NEEDS WORK** » du gabarit d’étape 6 : prêt sous conditions explicites, pas NO-GO sur la qualité documentaire du train).

| Dimension | Verdict |
|-----------|---------|
| **Gel correct course** | Tant que **25.6** n’est pas livrée avec levée **tracée** dans les artefacts attendus (addendum + cohérence `sprint-status.yaml` / pas « papier seul »), le gel **hors `25-*`** reste **actif** — **première promotion logique : 25-6**. |
| **NOT READY programme PWA** | **Inchangé** au sens du rapport **2026-04-19** et de la note **2026-04-20** (addendum **2026-04-21**) : **pas de NO-GO** pour exécuter **25.6–25.15** tant que les stories **respectent leurs exclusions** (pas de SW / IndexedDB prod / livraison offline-first déguisée). **25.15** doit **réaffirmer** explicitement qu’elle ne lève pas seule le verdict programme. |
| **Gate API P0** | **Orthogonal** à la complétude des specs Epic 25, **bloquant** pour **merges / promos** sur surfaces **Paheko / caisse sensibles** ; la story **25.11** le rappelle dans ses AC — à traiter comme **checklist release** pour les PR concernées. |
| **DAG / dépendances** | Ordre **25-6 → 25-7 → 25-8 → 25-9 → 25-10** ; branche **25-7 → 25-11 → (25-13, 25-15)** ; **25-14** après **25-8 + 25-13** ; **25-12** en parallèle possible avec **25-7** — **cohérent** avec `epics.md` §25 et le YAML. |
| **Trous UX** | Pas de doc UX dédiée ; **mitigation** : UX-DR dans `epics.md`, spec **25.4**, AC **25.8 / 25.14** — **avertissement** maintenu, pas de NO-GO seul sur ce point. |
| **Risques d’automatisation** | (1) Tri des clés **25-10** vs **25-2** si tri alphabétique ; (2) risque de **décalage** entre commentaires YAML et fichier DAG ; (3) Story Runner : s’assurer que **gates** et **`gates_skipped_with_hitl`** restent traçables pour les stories touchant Paheko. |

### Prochaines actions recommandées

1. **Lancer `bmad-create-story` puis dev pour 25.6** en premier : documenter la levée (ou le périmètre exact levé) et refléter la vérité dans **`sprint-status.yaml`**.
2. **Produire la checklist 25.7** liée aux ancres de la spec **25.4** §2–3 avant d’engager le code large dépendant des invariants.
3. **Pour toute promotion `ready-for-dev` touchant Paheko/caisse** : croiser le **chantier audit API P0** (arbitrage ou report avec propriétaire), comme rappelé en **25.11** et dans la note readiness **§2 gates**.

### Statut global (gabarit étape 6)

- **NEEDS WORK** au sens BMAD étape 6 : conditions de gel, gate API et NOT READY PWA **restent** des garde-fous actifs pendant l’exécution du train.
- **Pas de NOT READY** sur la **seule** question « les stories **25.6–25.15** sont-elles assez cadrées pour démarrer l’implémentation encadrée ? » : **oui**, sous les conditions ci-dessus.

### Note finale

Cette passe **complète** le workflow *Implementation Readiness* pour le périmètre **Epic 25 phase 2** ; elle **ne remplace pas** la lecture de l’encadré post-20 du rapport **2026-04-19** pour la baseline **NOT READY** / **GO conditionnel** cœur v2. Fichier de sortie : **`_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-20-epic25-phase2.md`**.

**Workflow terminé** — pour orientation produit générale ensuite, le skill **`bmad-help`** peut être invoqué.
