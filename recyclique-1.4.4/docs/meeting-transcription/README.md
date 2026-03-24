# Meeting Transcription & Compte-Rendu Automatisé

**Version :** 1.0  
**Workflow BMAD :** `meeting-transcription`  
**Statut :** ✅ Opérationnel  
**Date de création :** 2025-12-06

---

## 📋 Vue d'Ensemble

Fonctionnalité complète de **transcription automatique de réunions** avec génération de comptes-rendus structurés via un workflow BMAD multi-agents.

### Fonctionnalités

- ✅ **Transcription automatique** : Upload fichiers audio vers AssemblyAI avec diarisation
- ✅ **Segmentation intelligente** : Découpe en segments de 5 min avec overlap
- ✅ **Analyse par lots** : Résumés structurés de chaque segment
- ✅ **Agrégation de threads** : Identification des sujets récurrents
- ✅ **Validation inverse** : Vérification cohérence documents ↔ transcriptions
- ✅ **Compte-rendu final** : Synthèse structurée et exploitable
- ✅ **Scripts réutilisables** : 100% génériques pour toutes les réunions

---

## 🚀 Démarrage Rapide

### 1. Prérequis

- Clé API AssemblyAI dans `.env` : `ASSEMBLYAI_API_KEY=your_key`
- Fichiers audio de la réunion dans un dossier
- Agents BMAD configurés (orchestrator, dev, sm, analyst, qa, pm, po)

### 2. Lancer le Workflow

**Option A : Via Workflow BMAD (Recommandé)**

1. Activer l'agent Orchestrator : `@orchestrator`
2. Lancer le workflow :
   ```
   Lance le workflow meeting-transcription pour la réunion <meeting-id>
   
   Meeting ID : YYYY-MM-DD-nom-reunion
   Participants : [liste des participants]
   ```
3. Suivre les étapes guidées par les agents

**Option B : Via Scripts Python (Avancé)**

```bash
# 1. Transcription
python scripts/meeting-transcription/aai_transcribe.py --meeting-id "YYYY-MM-DD-nom-reunion"

# 2. Préparation segments
python scripts/meeting-transcription/prepare_segments.py "YYYY-MM-DD-nom-reunion"

# 3. Résumé segments
python scripts/meeting-transcription/summarize_segments.py "YYYY-MM-DD-nom-reunion"

# 4. Construction threads
python scripts/meeting-transcription/build_threads.py "YYYY-MM-DD-nom-reunion"

# 5. Validation inverse
python scripts/meeting-transcription/inverse_validation.py "YYYY-MM-DD-nom-reunion"

# 6. Génération compte-rendu
python scripts/meeting-transcription/generate_meeting_report.py "YYYY-MM-DD-nom-reunion"

# 7. Vérification finale
python scripts/meeting-transcription/verify_and_close.py "YYYY-MM-DD-nom-reunion"
```

---

## 📁 Structure des Fichiers

```
meetings/
└── <meeting-id>/
    ├── audio/                          # Fichiers audio originaux
    ├── transcriptions/                 # Transcriptions JSON AssemblyAI
    │   ├── <fichier1>.json
    │   ├── <fichier2>.json
    │   └── full-transcript.json        # Transcription consolidée
    ├── working/
    │   ├── segments/                   # Segments temporels (5 min)
    │   │   ├── segment-001.md
    │   │   ├── segment-002.md
    │   │   └── ...
    │   ├── summaries/                  # Résumés de segments
    │   │   ├── summary-001.md
    │   │   ├── summary-002.md
    │   │   └── ...
    │   ├── index.json                  # Métadonnées et métriques
    │   ├── threads.md                  # Sujets récurrents agrégés
    │   └── validation-report.md        # Rapport de validation
    ├── final/
    │   └── compte-rendu.md             # Compte-rendu final structuré
    ├── config.json                     # Configuration (participants, mapping, agenda)
    └── logs/                           # Logs d'exécution
```

---

## 🔧 Configuration

### Fichier `config.json`

Créé automatiquement lors de la génération des stories, ou manuellement :

```json
{
  "meeting_id": "2025-01-27-test-transcription",
  "date": "2025-01-27",
  "participants": ["Alice", "Bob", "Chloé"],
  "speaker_mapping": {
    "A": "Alice",
    "B": "Bob",
    "C": "Chloé"
  },
  "agenda": [
    "Sujet 1",
    "Sujet 2"
  ]
}
```

---

## 📚 Documentation

### Documents Principaux

- **[Epic](epics/meeting-transcription.md)** : Vue d'ensemble et objectifs
- **[Architecture](architecture/meeting-transcription.md)** : Diagrammes et flux
- **[Workflow BMAD](../.bmad-core/workflows/meeting-transcription.yaml)** : Définition du workflow
- **[Résumé d'Intégration](resume-integration.md)** : Guide pour chaque agent

### Documentation Technique

- **[Scripts - README](../scripts/meeting-transcription/README.md)** : Documentation des scripts
- **[Scripts - Réutilisabilité](scripts-reutilisabilite.md)** : Analyse de réutilisabilité
- **[Scripts - Validation](scripts-validation.md)** : Corrections et validations
- **[Scripts - Intégration BMAD](scripts-integration-bmad.md)** : Intégration dans workflow

### Prompts Standards

- **[Analyst Summary](../prompts/analyst-summary.md)** : Prompt pour résumé de segments
- **[PM Synthesis](../prompts/pm-synthesis.md)** : Prompt pour synthèse finale
- **[QA Validation](../prompts/qa-validation.md)** : Prompt pour validation inverse
- **[LLM Comparison](../prompts/llm-comparison-single-pass.md)** : Prompt pour comparaison single-pass

---

## 🎯 Workflow BMAD

### Étapes du Workflow

1. **generate_stories** (Orchestrator) : Génère les 7 stories spécifiques
2. **setup** (Orchestrator) : Crée structure et valide fichiers audio
3. **transcription** (Dev) : Upload et transcription via AssemblyAI
4. **prepare_segments** (SM) : Découpe en segments et calcule métriques
5. **analysis** (Analyst) : Résume segments et agrège threads
6. **validation** (QA) : Validation inverse des documents
7. **synthesis** (PM) : Génère compte-rendu final
8. **closure** (PO) : Vérifie et archive

### Agents Impliqués

- **Orchestrator** : Setup et génération stories
- **Dev** : Scripts de transcription
- **SM** : Segmentation et métriques
- **Analyst** : Analyse et résumés
- **QA** : Validation inverse
- **PM** : Synthèse finale
- **PO** : Clôture et archivage

---

## 🛠️ Scripts Python

### Emplacement

Tous les scripts sont dans `scripts/meeting-transcription/` :

- `aai_transcribe.py` - Transcription AssemblyAI
- `prepare_segments.py` - Découpe en segments
- `summarize_segments.py` - Résumé de segments
- `build_threads.py` - Agrégation threads
- `inverse_validation.py` - Validation inverse
- `generate_meeting_report.py` - Compte-rendu final
- `verify_and_close.py` - Vérification finale
- `config_loader.py` - Module utilitaire

### Caractéristiques

- ✅ **100% réutilisables** : Fonctionnent pour toutes les réunions
- ✅ **Config.json** : Utilisent config.json avec valeurs par défaut
- ✅ **Validation** : Vérifient inputs et gèrent erreurs
- ✅ **Documentation** : README complet dans le dossier

Voir [scripts/meeting-transcription/README.md](../scripts/meeting-transcription/README.md) pour détails.

---

## 📊 Format de Sortie

### Compte-Rendu Final

Le compte-rendu final (`final/compte-rendu.md`) contient :

- **En-tête** : Date, participants, durée
- **Ordre du jour** : Sujets identifiés
- **Sections par sujet** :
  - Points discutés
  - Décisions prises
  - Actions (RACI)
  - Questions ouvertes
  - Risques et préoccupations
- **Points divers** : Sujets hors ordre du jour
- **Prochaines étapes** : Actions prioritaires

---

## 🔍 Comparaison Single-Pass vs Multi-Étapes

Un prompt LLM single-pass est disponible pour comparer avec le workflow BMAD :

- **[Prompt Single-Pass](../prompts/llm-comparison-single-pass.md)** : Version complète
- **[Prompt Court](../prompts/llm-comparison-single-pass-SHORT.md)** : Version prête à copier-coller

Permet de comparer :
- Qualité d'extraction
- Organisation et reclassement
- Vérification et complétude
- Temps de traitement

---

## ✅ État Actuel

### Fonctionnalités Implémentées

- ✅ Workflow BMAD complet (8 étapes)
- ✅ Scripts Python réutilisables (7 scripts)
- ✅ Intégration AssemblyAI avec diarisation
- ✅ Segmentation temporelle intelligente
- ✅ Analyse par lots avec prompts standards
- ✅ Validation inverse automatique
- ✅ Génération compte-rendu structuré
- ✅ Documentation complète

### Améliorations Futures

- 🔄 Intégration LLM réelle dans `summarize_segments.py`
- 🔄 Extraction automatique ordre du jour depuis threads
- 🔄 Détection automatique participants depuis transcriptions
- 🔄 Interface utilisateur (optionnel)

---

## 📞 Support

### Questions Fréquentes

**Q : Comment lancer le workflow ?**  
R : Activer `@orchestrator` et demander "Lance le workflow meeting-transcription"

**Q : Où sont les scripts ?**  
R : `scripts/meeting-transcription/`

**Q : Comment configurer les participants ?**  
R : Via `config.json` dans le dossier de la réunion

**Q : Les scripts sont-ils réutilisables ?**  
R : Oui, 100% génériques pour toutes les réunions

### Documentation Complémentaire

- Voir [resume-integration.md](resume-integration.md) pour guide détaillé par agent
- Voir [scripts-validation.md](scripts-validation.md) pour corrections apportées
- Voir [epics/meeting-transcription.md](../epics/meeting-transcription.md) pour contexte complet

---

**Document créé le :** 2025-12-06  
**Dernière mise à jour :** 2025-12-06  
**Auteur :** BMad Team

