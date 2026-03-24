# Résumé d'Intégration - Meeting Transcription

**Version :** 1.0  
**Workflow :** meeting-transcription  
**Date :** 2025-01-27

---

## Guide pour Chaque Agent

Ce document explique comment chaque agent doit ouvrir son chat, lire la Story correspondante, et produire ses artefacts.

---

## Agent Orchestrator - Story S1

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent Orchestrator** : `@orchestrator` ou `/BMad/agents/orchestrator`
3. **Lire la Story** : `docs/stories/meeting-transcription/S1-setup-reunion.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape setup)

### Tasks à exécuter

1. `create_meeting_folder` : Créer structure dossiers
2. `prompt_copy_audio` : Inviter copie fichiers audio
3. `validate_audio_presence` : Valider présence fichiers

### Livrables attendus

- Structure `meetings/<meeting-id>/` créée
- Fichiers audio dans `audio/`
- Validation OK

### Handoff

Une fois terminé, dire : "Structure de réunion créée dans meetings/<meeting-id>/. Fichiers audio présents dans audio/. Prêt pour transcription AssemblyAI."

---

## Agent Dev - Story S2

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent Dev** : `@dev` ou `/BMad/agents/dev`
3. **Lire la Story** : `docs/stories/meeting-transcription/S2-transcription.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape transcription)

### Tasks à exécuter

1. `transcribe_aai` : Créer et exécuter script `aai_transcribe.py`

### Livrables attendus

- Script `scripts/aai_transcribe.py` fonctionnel
- Fichiers JSON dans `transcriptions/`
- Logs dans `logs/run-YYYYMMDD.log`

### Handoff

Une fois terminé, dire : "Transcription complète. Fichiers JSON disponibles dans transcriptions/. Prêt pour découpage en segments."

---

## Agent SM - Story S3

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent SM** : `@sm` ou `/BMad/agents/sm`
3. **Lire la Story** : `docs/stories/meeting-transcription/S3-preparation-lots.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape prepare_segments)

### Tasks à exécuter

1. `prepare_segments` : Découper transcriptions en segments
2. `compute_metrics` : Calculer métriques et créer index

### Livrables attendus

- Segments dans `working/segments/segment-{num}.md`
- Index dans `working/index.json`
- Transcription consolidée dans `transcriptions/full-transcript.json`

### Handoff

Une fois terminé, dire : "Segments créés dans working/segments/. Index disponible dans working/index.json. Prêt pour analyse et résumés."

---

## Agent Analyst - Story S4

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent Analyst** : `@analyst` ou `/BMad/agents/analyst`
3. **Lire la Story** : `docs/stories/meeting-transcription/S4-analyse-resumes.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape analysis)
5. **Lire le prompt** : `docs/prompts/analyst-summary.md`

### Tasks à exécuter

1. `summarize_segments` : Résumer chaque segment avec prompt Analyst
2. `build_threads` : Agrégation sujets récurrents

### Livrables attendus

- Résumés dans `working/summaries/summary-{num}.md`
- Threads dans `working/threads.md`

### Handoff

Une fois terminé, dire : "Résumés disponibles dans working/summaries/. Threads agrégés dans working/threads.md. Prêt pour validation inverse."

---

## Agent QA - Story S5

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent QA** : `@qa` ou `/BMad/agents/qa`
3. **Lire la Story** : `docs/stories/meeting-transcription/S5-validation-inverse.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape validation)
5. **Lire le prompt** : `docs/prompts/qa-validation.md`

### Tasks à exécuter

1. `inverse_validation` : Comparer documents ↔ transcriptions

### Livrables attendus

- Rapport de validation dans `working/validation-report.md`

### Handoff

Une fois terminé, dire : "Validation terminée. Rapport disponible dans working/validation-report.md. Prêt pour synthèse finale."

---

## Agent PM - Story S6

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent PM** : `@pm` ou `/BMad/agents/pm`
3. **Lire la Story** : `docs/stories/meeting-transcription/S6-synthese-finale.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape synthesis)
5. **Lire le prompt** : `docs/prompts/pm-synthesis.md`

### Tasks à exécuter

1. `generate_meeting_report` : Produire compte-rendu structuré

### Livrables attendus

- Compte-rendu final dans `final/compte-rendu.md`

### Handoff

Une fois terminé, dire : "Compte-rendu final généré dans final/compte-rendu.md. Prêt pour vérification et clôture."

---

## Agent PO - Story S7

### Comment démarrer

1. **Ouvrir nouveau chat** dans Cursor
2. **Activer agent PO** : `@po` ou `/BMad/agents/po`
3. **Lire la Story** : `docs/stories/meeting-transcription/S7-verification-cloture.md`
4. **Lire le workflow** : `.bmad-core/workflows/meeting-transcription.yaml` (étape closure)

### Tasks à exécuter

1. `verify_artifacts_consistency` : Vérifier cohérence artefacts
2. `approve_and_archive` : Clôture et archive

### Livrables attendus

- Rapport de vérification
- Validation finale
- Archivage (si demandé)

### Fin du workflow

Une fois terminé, dire : "Workflow terminé avec succès. Tous les artefacts disponibles dans meetings/<meeting-id>/. Compte-rendu final validé et prêt."

---

## Points Importants

### Handoffs par fichiers

- **Ne pas injecter de contexte massif** dans les chats
- **Lire les fichiers produits** par les agents précédents
- **Les fichiers sont la mémoire** du workflow

### Un chat = Une story

- **Ne pas mélanger les stories** dans le même chat
- **Créer un nouveau chat** pour chaque story
- **Rester focalisé** sur la story en cours

### Lecture des documents

- **Toujours lire la Story** correspondante avant de commencer
- **Lire le workflow** pour comprendre le contexte
- **Lire les prompts** si nécessaire (Analyst, PM, QA)

### Gestion des erreurs

- **Si erreur détectée** : Notifier utilisateur et arrêter workflow
- **Si retry possible** : Retry automatique (max 3)
- **Si reprise nécessaire** : Reprendre depuis l'étape en échec

---

## Checklist Générale

Avant de commencer chaque story :

- [ ] Nouveau chat créé
- [ ] Agent correct activé
- [ ] Story lue et comprise
- [ ] Workflow consulté
- [ ] Prompt lu (si applicable)
- [ ] Fichiers d'input vérifiés (produits par étape précédente)
- [ ] Tasks identifiées et comprises

Après chaque story :

- [ ] Tous les livrables produits
- [ ] Fichiers sauvegardés aux bons emplacements
- [ ] Handoff effectué (message à l'utilisateur)
- [ ] Story marquée comme complète (si système de tracking)

---

**Fin du Résumé d'Intégration**





