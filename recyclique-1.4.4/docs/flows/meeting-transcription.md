# Flow - Meeting Transcription & Compte-Rendu

**Version :** 1.0  
**Workflow :** meeting-transcription  
**Date :** 2025-01-27

---

## Vue d'Ensemble du Flux

Ce document décrit le flux complet du workflow de transcription de réunions, étape par étape, avec les handoffs entre agents.

**Flux complet :**
```
Epic → Workflow déclenché → Génération Stories → Setup → Transcription → Segmentation → Analyse → Validation → Synthèse → Clôture
```

---

## Étape 0 : Génération Stories (Orchestrator)

### Objectif
Générer les 7 stories spécifiques à la réunion à partir des templates génériques.

### Tasks exécutées
1. `generate_meeting_stories` : Génère les stories avec placeholders remplacés

### Input
- Meeting ID (ex: `2025-01-27-reunion-strategique`)
- Participants (saisis manuellement par l'utilisateur)

### Output
- 7 stories concrètes dans `docs/stories/meeting-transcription/<meeting-id>/`
- Log dans `logs/generate_meeting_stories_<meeting-id>.log`

### Handoff vers Setup
```
Stories générées pour réunion <meeting-id>.
7 fichiers créés dans docs/stories/meeting-transcription/<meeting-id>/.
Prêt pour setup de la réunion.
```

---

## Étape 1 : Setup (Orchestrator)

### Objectif
Créer la structure de dossiers et valider la présence des fichiers audio.

### Tasks exécutées
1. `create_meeting_folder` : Crée `./meetings/<meeting-id>/` avec structure complète
2. `prompt_copy_audio` : Invite utilisateur à copier fichiers audio
3. `validate_audio_presence` : Vérifie présence d'au moins 1 fichier audio

### Input
- Stories spécifiques générées (étape 0)
- Meeting ID (déjà utilisé pour génération stories)

### Output
- Structure dossiers créée
- Fichiers audio dans `audio/`
- Validation OK

### Handoff vers Dev
```
Structure de réunion créée dans meetings/<meeting-id>/.
Fichiers audio présents dans audio/.
Prêt pour transcription AssemblyAI.
```

---

## Étape 2 : Transcription (Dev)

### Objectif
Transcrire les fichiers audio via AssemblyAI.

### Tasks exécutées
1. `transcribe_aai` : Lance script `aai_transcribe.py`

### Input
- Fichiers audio dans `audio/`
- Clé API AssemblyAI dans `.env`

### Output
- Fichiers JSON dans `transcriptions/` (un par fichier audio)
- Logs dans `logs/run-YYYYMMDD.log`

### Handoff vers SM
```
Transcription complète. Fichiers JSON disponibles dans transcriptions/.
Prêt pour découpage en segments.
```

---

## Étape 3 : Préparation Lots (SM)

### Objectif
Découper les transcriptions en segments exploitables.

### Tasks exécutées
1. `prepare_segments` : Découpe transcriptions en segments de 5 min
2. `compute_metrics` : Calcule métriques et crée index.json

### Input
- Fichiers JSON dans `transcriptions/`

### Output
- Segments dans `working/segments/segment-{num}.md`
- Index dans `working/index.json`
- Transcription consolidée dans `transcriptions/full-transcript.json`

### Handoff vers Analyst
```
Segments créés dans working/segments/.
Index disponible dans working/index.json.
Prêt pour analyse et résumés.
```

---

## Étape 4 : Analyse (Analyst)

### Objectif
Résumer chaque segment et agréger les sujets récurrents.

### Tasks exécutées
1. `summarize_segments` : Résume chaque segment avec prompt Analyst
2. `build_threads` : Agrège sujets récurrents en threads

### Input
- Segments dans `working/segments/`
- Index dans `working/index.json`

### Output
- Résumés dans `working/summaries/summary-{num}.md`
- Threads dans `working/threads.md`

### Handoff vers QA
```
Résumés disponibles dans working/summaries/.
Threads agrégés dans working/threads.md.
Prêt pour validation inverse.
```

---

## Étape 5 : Validation (QA)

### Objectif
Valider la cohérence des documents finaux avec les transcriptions.

### Tasks exécutées
1. `inverse_validation` : Compare documents ↔ transcriptions

### Input
- Résumés dans `working/summaries/`
- Threads dans `working/threads.md`
- Transcription complète dans `transcriptions/full-transcript.json`

### Output
- Rapport de validation dans `working/validation-report.md`

### Handoff vers PM
```
Validation terminée. Rapport disponible dans working/validation-report.md.
Prêt pour synthèse finale.
```

---

## Étape 6 : Synthèse (PM)

### Objectif
Consolider les résumés et threads en compte-rendu final.

### Tasks exécutées
1. `generate_meeting_report` : Produit compte-rendu structuré

### Input
- Résumés dans `working/summaries/`
- Threads dans `working/threads.md`
- Index dans `working/index.json`
- Rapport de validation (optionnel)

### Output
- Compte-rendu final dans `final/compte-rendu.md`

### Handoff vers PO
```
Compte-rendu final généré dans final/compte-rendu.md.
Prêt pour vérification et clôture.
```

---

## Étape 7 : Clôture (PO)

### Objectif
Vérifier la cohérence finale et clôturer le workflow.

### Tasks exécutées
1. `verify_artifacts_consistency` : Vérifie cohérence artefacts
2. `approve_and_archive` : Clôture et archive (optionnel)

### Input
- Tous les artefacts produits

### Output
- Rapport de vérification
- Validation finale
- Archivage (si demandé)

### Fin du workflow
```
Workflow terminé avec succès.
Tous les artefacts disponibles dans meetings/<meeting-id>/.
Compte-rendu final validé et prêt.
```

---

## Diagramme de Flux Simplifié

```
[Utilisateur] → Orchestrator (Génération Stories)
                ↓
            [Stories spécifiques générées]
                ↓
            Orchestrator (Setup)
                ↓
            [Fichiers audio]
                ↓
            Dev (Transcription)
                ↓
            [Transcripts JSON]
                ↓
            SM (Segmentation)
                ↓
            [Segments]
                ↓
            Analyst (Analyse)
                ↓
            [Résumés + Threads]
                ↓
            QA (Validation)
                ↓
            [Rapport validation]
                ↓
            PM (Synthèse)
                ↓
            [Compte-rendu final]
                ↓
            PO (Clôture)
                ↓
            [Workflow terminé]
```

---

## Gestion des Erreurs

### Erreurs temporaires
- **429, 503, timeout** : Retry automatique (max 3, backoff exponentiel)
- **Workflow continue** après retry réussi

### Erreurs définitives
- **400, 401, 404** : Log + notification utilisateur
- **Workflow arrêté** avec état sauvegardé
- **Reprise possible** depuis l'étape en échec

### Erreurs de validation
- **Incohérences détectées** : Rapport généré, workflow continue
- **PO décide** de clôture ou correction

---

## Points d'Attention

1. **Handoffs par fichiers** : Chaque agent lit les fichiers produits par les précédents
2. **Pas de contexte partagé** : Chaque agent travaille indépendamment
3. **Validation continue** : Chaque étape produit des artefacts validables
4. **Reprise possible** : État sauvegardé dans `working/index.json`

---

**Fin du Flow**

