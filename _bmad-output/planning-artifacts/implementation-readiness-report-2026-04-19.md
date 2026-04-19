---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
workflowType: implementation-readiness
date: 2026-04-19
project_name: JARVOS_recyclique
assessor: Strophe (assisté agent BMAD)
scope_note: >-
  Passage readiness après éditions PRD (2026-04-19) et recherche technique alignement
  brownfield / PRD vision kiosque multisite. Confirmation utilisateur équivalente [C]
  sur l’ensemble du workflow.
---

# Rapport — implémentation prête (readiness globale v2 + extension kiosque)

**Date :** 2026-04-19  
**Projet :** JARVOS_recyclique  
**Module BMAD :** BMM — phase 3 → 4 (gate avant implémentation large)  
**Langue :** français (`communication_language` / `document_output_language`)

---

## Synthèse exécutive

| Artefact | État | Commentaire |
|----------|------|-------------|
| PRD canonique (`_bmad-output/planning-artifacts/prd.md`) | **OK** | Révisions 2026-04-19 : bloc PRD vision kiosque / multisite, gate readiness, PIN opérateur vs cible kiosque, outbox Paheko vs « file Redis », chantier audit API. Annexe C trace FR/NFR vers `epics.md`. |
| PRD vision kiosque (`references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`) | **Extension non décomposée** | Référencé depuis `prd.md` ; **pas** intégré comme nouveaux FR1–FN dans `epics.md` — attendu tant que les ADR (PIN kiosque, async Paheko) ne sont pas tranchés. |
| Recherche technique | **OK** | `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` — tableau priorités / risques. |
| Architecture (dossier `architecture/`) | **OK** | Index à jour ; ADR caisse/Paheko, PG17, chaîne canonique ; **AR11–AR12** dans `epics.md` cadrant outbox PostgreSQL et rôle auxiliaire de Redis — cohérent avec l’edit PRD récent. |
| Epics (`epics.md`) | **OK (cœur v2)** | Inventaire **FR1–FR73**, **NFR1–NFR28**, exigences additionnelles **AR*** ; cartographie FR → epics présente après l’inventaire. |
| UX dédiée (`*ux*.md` sous `planning_artifacts`) | **Absent** | UI fortement impliquée ; acceptable brownfield si parcours + AC dans stories (cf. rapport 2026-04-18 opérations spéciales). |
| Extension **PWA offline-first** (PRD vision) | **NON PRÊTE** | Pas d’epic dédié aligné sur les epics 1–4 du PRD vision ; recherche : pas de SW/IndexedDB identifiés dans le périmètre scanné. |

**Verdict global :** **GO conditionnel** pour poursuivre l’implémentation selon la **décision directrice v2** et les epics déjà séquencés (y compris chantiers caisse / Epic 24, etc.). **NO-GO** pour un **programme d’implémentation massif** centré sur le **PRD vision kiosque PWA** tant que : (1) les ADR ouverts (PIN kiosque, file vs outbox) ne sont pas clos, (2) les FR/epics ne reflètent pas explicitement cette extension, (3) le gate qualité API P0 (audit brownfield) n’est pas arbitré pour les équipes qui touchent Paheko/caisse.

---

## 1. Découverte des documents (étape 1)

### PRD

**Document entier :**

- `prd.md` — PRD canonique JARVOS Recyclique v2 (révision documentaire 2026-04-19).

**Fragmenté :** non (pas de dossier `prd/` avec `index.md` actif en parallèle).

**Rapports de validation PRD (même dossier) :** `prd-validation-report-2026-04-15-post-edit.md` (et versions 2026-04-01) — utiles pour edits futurs, pas bloquants à ce gate.

### Architecture

**Fragmenté (référence principale) :**

- Dossier `architecture/` avec `index.md` et sous-documents (ADR, chaîne Paheko, patterns, etc.).

**Archive :** `archive/architecture.md` — **ne constitue pas** un doublon conflictuel avec la doc active ; traiter comme historique.

### Epics et stories

**Document entier :**

- `epics.md` — découpage epics + stories + inventaire FR/NFR/AR.

### UX

**Aucun fichier** correspondant aux motifs `*ux*.md` ou `*ux*/index.md` sous `_bmad-output/planning-artifacts/`.

### Doublons critiques

**Aucun** conflit « même PRD en entier + dossier shardé » détecté.

---

## 2. Analyse PRD (étape 2)

### Modèle de traçabilité

Le `prd.md` **ne reduplique pas** la liste complète des FR dans son corps principal : l’**Annexe C** (vers fin de document) renvoie explicitement vers **`epics.md`** pour les **identifiants stables FR1–FR73** et **NFR1–NFR28**, avec une table de correspondance thématique (sections PRD → plages FR).

Cette séparation est **volontaire** et **cohérente** pour la traçabilité machine, à condition que `epics.md` reste synchronisé avec toute évolution majeure du `prd.md`.

### Synthèse des exigences (source `epics.md`, alignée Annexe C)

| Catégorie | Quantité | Source dans `epics.md` |
|-----------|----------|-------------------------|
| FR | **73** | Section *Functional Requirements* (FR1–FR73) |
| NFR | **28** | Section *NonFunctional Requirements* |
| Exigences additionnelles | **AR*** (dont AR11 outbox PostgreSQL, AR12 Redis auxiliaire) | Section *Additional Requirements* |

### Compléments documentaires récents (hors numérotation FR)

- **PRD vision** kiosque / multisite / permissions (fichier `references/vision-projet/2026-04-19_...`).
- **Recherche technique** alignement brownfield.
- **Politique PIN** dans `prd.md` §11.2 : distinction **PIN opérateur** (canon v2) vs extension **PIN kiosque PWA** soumise à ADR — bonne clarification pour éviter les contradictions avec FR71.

### Complétude PRD (évaluation initiale)

- **Cœur v2** : dense, hiérarchie de lecture multi-PRD caisse, opérations spéciales, migration Paheko — **mature**.
- **Extension kiosque PWA** : **documentée** comme cible mais **non** encore absorbée dans la chaîne FR → epics — **écart assumé** jusqu’à décision produit/architecture.

---

## 3. Validation couverture epics (étape 3)

### Principe

Les FR du PRD canonique sont **repris textuellement** dans `epics.md` puis **mappés** à des epics (bloc de cartographie après l’inventaire — ex. FR1 → Epic 2, FR4 → Epic 8, etc.).

### Résultat

| Contrôle | Résultat |
|----------|----------|
| FR1–FR73 présents dans `epics.md` | **Oui** |
| NFR1–NFR28 présents | **Oui** |
| Cartographie FR → epic | **Oui** (structure BMAD respectée) |
| Exigences du **PRD vision 2026-04-19** (epics 1–4 type device, offline, PIN kiosque, plages horaires…) dans `epics.md` | **Non** — **hors périmètre** du découpage actuel ; à planifier après ADR / `bmad-correct-course` ou extension d’epics |

### Statistiques de couverture (PRD canonique ↔ epics)

- **FR PRD canonique couverts par le mécanisme epics** : **73 / 73** (via inventaire + mapping dans `epics.md`).
- **FR « PRD vision kiosque »** : **0 / n** (non encore exprimés en FR numérotés dans ce dépôt).

### Manques (à traiter si la priorité produit est le kiosque PWA)

1. Dériver des **FR ou epics explicites** depuis le PRD vision (ou un epic parent « Kiosque PWA ») avec AC testables.
2. Mettre à jour **Annexe C** ou l’inventaire `epics.md` pour inclure les nouveaux IDs une fois stabilisés.
3. Produire **ADR** listés dans la recherche technique (PIN, async Paheko).

---

## 4. Alignement UX (étape 4)

### Statut du document UX

**Non trouvé** sous `_bmad-output/planning-artifacts/` (pas de livrable `*ux*.md` dédié).

### UI implicite

Le PRD et les epics décrivent des parcours **cashflow**, **réception**, **bandeau live**, **kiosque** (observabilité Peintre), etc. — l’UX est donc **implicite** et portée en grande partie par les **stories** et le PRD canonique.

### Alignement PRD ↔ architecture (aperçu UX technique)

- **Peintre_nano** + **React** + contraintes **AR3** (stack CSS) : supportée par l’architecture et les ADR Peintre.
- **Offline-first PWA** du PRD vision : **non** encore reflétée dans l’architecture indexée (pas d’ADR « Service Worker / sync client » dans l’index actuel).

### Avertissements

- **Avertissement modéré** : absence de doc UX formelle — acceptable si chaque story terrain inclut critères d’acceptation visibles (états, clavier, dégradations).
- **Avertissement fort** si lancement **programme PWA** : prévoir au minimum un **spike UX+archi** (wireframes ou spec flux offline) avant sprint planning massif.

---

## 5. Revue qualité des epics (étape 5)

### Points conformes (échantillon / structure)

- Découpage **epic → stories** avec **critères d’acceptation** sur les epics récents (ex. Epic 24 documenté dans un rapport readiness précédent).
- **FR71** (PIN minimal) aligné avec la clarification **PIN opérateur** du PRD — limite le risque de double sémantique avant ADR kiosque.
- **AR11 / AR12** : ancre technique compatible avec l’edit PRD sur l’outbox vs Redis.

### Signaux d’attention (bonnes pratiques create-epics)

| Type | Observation |
|------|-------------|
| Epics « techniques » | Certains epics portent le **socle** (ex. backend brownfield — Epic 2) : acceptable en **brownfield**, à condition que chaque story reste livrable et vérifiable côté utilisateur ou intégration. |
| Dépendances | Le pilotage **`guide-pilotage-v2.md`** et les **Convergence 1–3** imposent une **lecture séquentielle** des dépendances entre epics — pas un défaut de qualité intrinsèque, mais un **risque de planification** si le sprint-status ignore l’ordre. |
| Taille du fichier `epics.md` | Très volumineux : risque de **dérive** non détectée entre sections ; recommander des **revues par tranche** (par epic) à chaque correct course. |

### Violations critiques constatées dans cette passe

**Aucune violation bloquante** sur la structure générale (pas d’epic « Setup database » isolé sans livrable, pas de contresens manifeste avec le PRD canonique).

---

## 6. Synthèse finale et recommandations (étape 6)

### Statut global de readiness

| Périmètre | Statut |
|-----------|--------|
| **Implémentation v2 selon `prd.md` + `epics.md` + architecture index** | **NEEDS WORK mineur** — GO conditionnel (UX formelle absente, mitigé par stories) |
| **Extension PRD vision kiosque PWA / offline-first** | **NOT READY** — attend ADR + découpage FR/epic + preuve archi front |

### Actions critiques avant « gros » développement kiosque

1. **Trancher les ADR** : PIN kiosque vs PIN opérateur ; formulation durable pour **async Paheko** (outbox SQL actuelle vs exigence « file Redis » du PRD vision).
2. **`bmad-create-epics-and-stories`** ou **`bmad-correct-course`** : intégrer la cible PRD vision dans `epics.md` et le sprint si la priorité produit le confirme.
3. **Gate qualité API** : traiter ou tracer les **P0** du chantier audit (`pytest`, `AdminService`, etc.) pour les équipes qui modifient Paheko/caisse en parallèle.

### Prochaines étapes BMAD suggérées

1. Si la priorité est le **kiosque** : **`bmad-correct-course`** ou ré-exécution ciblée de **`bmad-create-epics-and-stories`** après ADR.  
2. Si la priorité reste **caisse / opérations spéciales / convergence** : enchaîner **`bmad-sprint-status`** puis **`bmad-create-story`** / **`bmad-dev-story`** sur l’epic courant — le présent rapport **n’interdit pas** cette voie.  
3. Optionnel : **`bmad-create-ux-design`** si vous voulez un livrable UX sous `planning_artifacts` avant d’alourdir les stories terrain.

### Note de clôture

Cette évaluation recense **deux niveaux** de readiness : le **socle documentaire v2** (globalement **aligné** et **traçable**) et l’**extension kiosque PWA** (**non encore** intégrée au découpage epics). Adressez les points **NOT READY** avant d’engager un volume important de développement sur le périmètre PWA ; pour le reste, les **conditions de GO** restent celles de chaque epic (tests, ADR de domaine, charge équipe).

---

**Rapport généré :** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`

Pour la suite orientée « quoi lancer dans le chat », invoquer le skill **`bmad-help`** avec votre contexte (epic en cours ou priorité kiosque).
