# Brief BMAD Master - Projet Meeting Transcription & Compte-Rendu

**Date :** 2025-01-27  
**Source :** BMAD Master  
**Destinataire :** Agent Analyst BMAD

---

Parfait. Voici une **grande sortie complète et structurée** — un **brief intégral pour ton agent Analyste BMAD dans Cursor**, qui lui permettra de **concevoir tout le flux**, d'écrire les **tasks**, les **workflows**, les **scripts**, et les **documents de référence**, en conformité avec la **méthode BMAD**.

Tu pourras littéralement **coller tout ce texte dans Cursor** dans un nouveau chat avec ton agent `@analyst` (ou `*agent analyst`) — il aura tout le contexte, toutes les attentes, toutes les dépendances.

---

# 📘 BRIEF ANALYSTE — PROJET "MEETING TRANSCRIPTION & COMPTE-RENDU" (BMAD / CURSOR)

## 🔹 Objectif général

Développer et formaliser l'**ensemble du flux BMAD** pour la **transcription, analyse, et synthèse de réunions** à partir d'audios multiples (FR), via **AssemblyAI** et un enchaînement **d'agents BMAD** (Orchestrator, Dev, Analyst, QA, PM, PO).

Le système doit produire automatiquement un **compte-rendu structuré et validé**, à partir d'une réunion contenant plusieurs audios.

---

## 🔹 Contexte opérationnel

* **Environnement :** IDE Cursor, orchestration manuelle (pas d'auto-spawn d'agents).

* **Méthode :** BMAD v3 — flux *Epic → Stories → Tasks → Workflows → Scripts*.

* **Architecture projet :**

  ```
  ./meetings/
  └── <meeting-id>/
      ├── audio/
      ├── transcriptions/
      ├── working/
      │   ├── segments/
      │   ├── summaries/
      │   ├── threads.md
      │   ├── index.json
      │   └── report.md
      └── final/
          └── compte-rendu.md
  ```

* **Langue :** Français (AssemblyAI Universal model)

* **API externe :** AssemblyAI (transcription, diarisation, topics IAB)

* **Agents utilisés :**

  * Orchestrator (coordination)

  * Dev (implémentation scripts, automatisations)

  * Analyst (analyse, structuration, prompts)

  * QA (validation inverse, conformité)

  * PM (synthèse, reporting)

  * PO (contrôle final)

* **Mode d'exécution :**

  * 1 chat = 1 story = 1 étape claire du flux

  * Les fichiers sont la mémoire, pas les prompts

  * Handoffs entre agents = passage de livrables

---

## 🔹 Objectif du travail de l'Analyst

L'Analyst doit :

1. **Définir et documenter** les *tasks* et *workflows* nécessaires à ce flux.

2. **Cartographier les dépendances** entre eux.

3. **Préparer les fichiers BMAD** correspondants :

   * `.bmad-core/workflows/meeting-transcription.yaml`

   * `.bmad-core/tasks/*.md` pour chaque action

   * `docs/epics/meeting-transcription.md` (epic)

   * `docs/stories/meeting-transcription/*.md` (stories)

4. **Préparer les prompts standards** utilisés par les agents (Analyst, PM, QA).

5. **Formaliser la logique du script** de transcription AssemblyAI (mais pas son code complet ; il sera fourni séparément).

6. **Assurer la cohérence BMAD complète** : clean handoffs, docs-first, contextual minimality.

---

## 🔹 Références internes BMAD à utiliser / s'inspirer

### Tasks BMAD existantes à cloner ou adapter :

| Nom existant               | Rôle         | Adaptation attendue                                    |
| -------------------------- | ------------ | ------------------------------------------------------ |
| `create-meeting-folder.md` | Orchestrator | Gérer création + structure dossier                     |
| `prompt-copy-audio.md`     | Orchestrator | Ajouter invite utilisateur à copier les fichiers audio |
| `create-brownfield-prd.md` | PM           | Exemple de structuration PRD/story                     |
| `validate-deliverables.md` | QA           | Modèle pour la validation inverse                      |
| `generate-summary.md`      | PM           | Modèle pour le CR final                                |
| `brainstorm.md`            | Analyst      | Inspiration pour prompts multi-niveaux                 |

### Workflows BMAD existants à suivre :

| Fichier                                | Contenu clé                                   |
| -------------------------------------- | --------------------------------------------- |
| `.bmad-core/workflows/brownfield.yaml` | Structure d'étapes séquentielles multi-agents |
| `.bmad-core/workflows/devloop.yaml`    | Enchaînement Dev → QA → PM typique            |
| `.bmad-core/workflows/create-prd.yaml` | Bon exemple de "handoffs" propres             |

---

## 🔹 Workflow cible à créer : `meeting-transcription.yaml`

### Structure proposée :

```yaml
id: meeting-transcription
name: Meeting Transcription & Analysis
stages:
  - id: setup
    owner: orchestrator
    actions:
      - create_meeting_folder
      - prompt_copy_audio
      - validate_audio_presence
  - id: transcription
    owner: dev
    actions:
      - transcribe_aai
  - id: prepare_lots
    owner: sm
    actions:
      - prepare_segments
      - compute_metrics
  - id: analysis
    owner: analyst
    actions:
      - summarize_segments
      - build_threads
  - id: validation
    owner: qa
    actions:
      - inverse_validation
  - id: synthesis
    owner: pm
    actions:
      - generate_meeting_report
  - id: closure
    owner: po
    actions:
      - verify_artifacts_consistency
      - approve_and_archive
```

---

## 🔹 Tasks à créer (dans `.bmad-core/tasks/`)

| Fichier                           | Rôle         | Description synthétique                           |
| --------------------------------- | ------------ | ------------------------------------------------- |
| `create_meeting_folder.md`        | Orchestrator | Crée arborescence `meetings/<id>/...`             |
| `prompt_copy_audio.md`            | Orchestrator | Invite utilisateur à copier ses audios            |
| `validate_audio_presence.md`      | Orchestrator | Vérifie la présence d'au moins 1 fichier audio    |
| `transcribe_aai.md`               | Dev          | Lance script `aai_transcribe.py`                  |
| `prepare_segments.md`             | Dev          | Coupe le texte en segments (via script ou manuel) |
| `compute_metrics.md`              | Dev          | Évalue tokens, taille de lots, overlap            |
| `summarize_segments.md`           | Analyst      | Résume par lot (prompt FR standard)               |
| `build_threads.md`               | Analyst      | Agrège sujets récurrents (threads.md)             |
| `inverse_validation.md`           | QA           | Compare docs ↔ transcriptions                     |
| `generate_meeting_report.md`      | PM           | Produit compte-rendu structuré final              |
| `verify_artifacts_consistency.md` | PO           | Vérifie cohérence, chemins, métadonnées           |
| `approve_and_archive.md`          | PO           | Clôture la réunion, archive dossiers              |

---

## 🔹 Script à concevoir (futur : fourni par Dev)

### Nom : `aai_transcribe.py`

**Responsable :** agent Dev

**Rôle :** appel API AssemblyAI → JSON transcriptions

**Entrée :**

* dossier audio (4–5 fichiers)

* paramètres (`lang=fr`, `diarization=True`, `iab=True`)

**Sortie :**

* `transcriptions/<file>.json`

* log d'exécution (`logs/run-YYYYMMDD.log`)

**Fonctions :**

1. upload audio files

2. poll job status (avec retries)

3. récupérer JSON brut

4. écrire fichier + nom cohérent

⚠️ Les **références concrètes d'API** seront ajoutées **manuellement** par le PO après validation de la structure.

---

## 🔹 Stories à créer (dans `docs/stories/meeting-transcription/`)

| ID | Titre                  | Agent        | Sorties attendues                 |
| -- | ---------------------- | ------------ | --------------------------------- |
| S1 | Setup réunion          | Orchestrator | Structure dossier + audio présent |
| S2 | Transcription          | Dev          | 1 JSON/Audio                      |
| S3 | Préparation lots       | Dev          | Segments + index + metrics        |
| S4 | Analyse & Résumés      | Analyst      | Résumés + threads                 |
| S5 | Validation inverse     | QA           | Rapport de conformité             |
| S6 | Synthèse finale        | PM           | `final/compte-rendu.md`           |
| S7 | Vérification & clôture | PO           | Validation finale                 |

---

## 🔹 Prompts standard à documenter

### Prompt Analyst (résumé de lot)

> Tu es Analyste. Tu reçois des segments FR (texte, speaker, timestamps).

> Produis un **résumé clair et structuré** en Markdown :

>
> * Sections : *Points discutés, Décisions, Actions (RACI), Risques, Questions ouvertes*

> * Ajoute **3–5 tags de sujet** cohérents

> * Ajoute un **tableau (timestamp, speaker, résumé phrase)**

> * Ne reformule pas les prénoms, conserve les noms originaux

> * Garde le style concis, FR correct, Markdown lisible

### Prompt PM (synthèse finale)

> Tu es PM. Consolide les résumés & threads pour produire un **compte-rendu final**.

> Structure : *Participants, Contexte, Ordre du jour, Décisions, Actions RACI, Sujets récurrents, Questions ouvertes, Risques.*

> Elimine redites, ordonne chronologiquement, garde cohérence des tags.

### Prompt QA (validation inverse)

> Tu es QA. Compare les documents de référence (ordre du jour, docs cités) avec les transcriptions résumées.

> Objectif : repérer incohérences, oublis, divergences.

> Sors un rapport clair : *écarts détectés / justification / action recommandée.*

---

## 🔹 Documentation à produire (Analyst)

* `docs/epics/meeting-transcription.md`

  → Définir contexte, objectifs, risques, livrables, KPIs.

* `docs/architecture/meeting-transcription.md`

  → Schéma global + diagramme séquentiel des agents (Orchestrator→Dev→Analyst→QA→PM→PO)

* `docs/prompts/`

  → 3 prompts standard ci-dessus, versionnés.

* `docs/scripts/`

  → placeholders pour `aai_transcribe.py`, `segmenter_minimal.py`

* `docs/flows/meeting-transcription.md`

  → représentation texte du workflow YAML.

---

## 🔹 Livrables attendus (sortie Analyst)

L'agent Analyst doit livrer :

1. `.bmad-core/workflows/meeting-transcription.yaml`

2. `.bmad-core/tasks/*.md` (12 fichiers)

3. `docs/epics/meeting-transcription.md`

4. `docs/stories/meeting-transcription/S1–S7.md`

5. `docs/architecture/meeting-transcription.md`

6. `docs/prompts/*.md` (analyst, pm, qa)

7. `docs/flows/meeting-transcription.md`

8. Un **plan de tests** (checklist par étape)

9. Un **résumé d'intégration** : comment chaque agent doit ouvrir son chat, lire la Story, et produire ses artefacts.

---

## 🔹 Points d'attention

* **Ne pas saturer la fenêtre** → chaque Story = chat distinct.

* **Un seul workflow global** pour le moment.

* **Les scripts ne sont pas exécutés automatiquement** → ils sont appelés à la main.

* **Les handoffs** se font via fichiers (`transcriptions/`, `working/`, `final/`), jamais par injection massive dans le contexte.

* **Tout document doit être Markdown clair, français, versionnable.**

---

## 🔹 Objectif final

À partir de ce brief, l'Analyst doit être capable de :

1. **Concevoir tout le flux BMAD** (workflows, tasks, stories, prompts).

2. **Poser la base documentaire complète** du projet "meeting-transcription".

3. **Préparer le terrain** pour que le Dev et le PM puissent implémenter et livrer rapidement les premières réunions.

4. **Assurer la compatibilité totale avec BMAD existant** (structure YAML, nommage, handoffs, méthodologie brownfield).

---





