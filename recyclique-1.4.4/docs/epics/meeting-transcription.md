# EPIC: Meeting Transcription & Compte-Rendu Automatisé

**Statut:** Draft  
**Module:** BMAD Workflow System  
**Priorité:** Moyenne  
**Type:** Brownfield Enhancement (nouveau workflow BMAD)

---

## 1. Contexte

**Problème identifié :**
Les réunions d'équipe génèrent des enregistrements audio multiples (4-5 fichiers par réunion) qui nécessitent une transcription manuelle fastidieuse et une synthèse en compte-rendu structuré. Le processus actuel est :
- Chronophage (transcription manuelle)
- Subjectif (interprétation variable selon le rédacteur)
- Incomplet (informations perdues, décisions non tracées)
- Non structuré (format libre, difficile à exploiter)

**Besoin métier :**
1. Automatiser la transcription de réunions à partir d'audios multiples
2. Produire des comptes-rendus structurés et validés automatiquement
3. Extraire et organiser les informations par sujet/ordre du jour
4. Tracer les décisions, actions, questions ouvertes, chantiers
5. Valider la cohérence entre transcriptions et documents finaux

---

## 2. Objectif de l'Epic

Mettre en place un **workflow BMAD complet** pour la transcription, analyse, et synthèse automatique de réunions à partir d'audios multiples (FR), via **AssemblyAI** et un enchaînement d'agents BMAD (Orchestrator, Dev, Analyst, QA, PM, PO).

**Valeur ajoutée :**
- Gain de temps : transcription automatique (vs manuelle)
- Qualité : validation inverse garantit la cohérence
- Structure : comptes-rendus standardisés et exploitables
- Traçabilité : décisions, actions, questions ouvertes clairement identifiées
- Réutilisabilité : workflow BMAD réutilisable pour toutes les réunions

---

## 3. Portée

**Inclus dans cet epic :**

### Phase 1 : Setup & Transcription
- Création automatique de structure de dossiers pour réunion
- Upload fichiers audio vers API AssemblyAI
- Récupération transcriptions diarisées (speakers + timestamps)

### Phase 2 : Préparation & Segmentation
- Découpage transcriptions en segments exploitables
- Calcul de métriques (tokens, taille de lots, overlap)
- Indexation des segments pour traitement par lots

### Phase 3 : Analyse & Résumés
- Résumé intelligent de chaque segment (prompt Analyst)
- Agrégation des sujets récurrents (threads)
- Détection automatique de l'ordre du jour (optionnel)

### Phase 4 : Validation Inverse
- Comparaison documents finaux ↔ transcriptions
- Détection d'incohérences, oublis, divergences
- Rapport de conformité avec actions recommandées

### Phase 5 : Synthèse Finale
- Génération compte-rendu structuré (Markdown)
- Consolidation des résumés et threads
- Structure dynamique par sujet (décisions, actions RACI, questions ouvertes, risques)

### Phase 6 : Vérification & Clôture
- Vérification cohérence des artefacts
- Validation finale par PO
- Archivage des dossiers

**Exclus (hors scope immédiat) :**
- Intégration interface utilisateur (phase développement uniquement)
- Transcription en temps réel (post-réunion uniquement)
- Gestion de calendrier et notifications automatiques
- Export vers formats autres que Markdown

---

## 4. Critères d'acceptation de l'Epic

1. **Workflow BMAD fonctionnel** : Tous les agents peuvent exécuter leurs tasks dans l'ordre défini
2. **Transcription réussie** : 100% des fichiers audio transcrits avec diarisation correcte
3. **Résumés de qualité** : Résumés structurés par segment avec tags et métadonnées
4. **Validation inverse opérationnelle** : Détection d'au moins 80% des incohérences majeures
5. **Compte-rendu final complet** : Document Markdown structuré avec toutes les sections requises
6. **Handoffs propres** : Chaque agent peut reprendre le travail à partir des fichiers produits
7. **Documentation complète** : Tous les prompts, workflows, tasks documentés
8. **Aucune régression** : Le workflow n'impacte pas les autres workflows BMAD existants

---

## 5. Architecture du Système

### Structure de dossiers

```
./meetings/
└── <meeting-id>/              # Format: YYYY-MM-DD-nom-reunion
    ├── audio/                 # Fichiers audio originaux
    │   ├── speaker1.mp3
    │   ├── speaker2.mp3
    │   └── ...
    ├── transcriptions/        # Transcripts bruts AssemblyAI
    │   ├── speaker1.json
    │   ├── speaker2.json
    │   └── full-transcript.json
    ├── working/               # Documents de travail pour agents
    │   ├── segments/          # Segments découpés
    │   │   ├── segment-001.md
    │   │   └── ...
    │   ├── summaries/         # Résumés par segment
    │   │   ├── summary-001.md
    │   │   └── ...
    │   ├── threads.md         # Sujets récurrents agrégés
    │   ├── index.json         # Index des segments avec métadonnées
    │   └── report.md          # Rapport intermédiaire
    └── final/                 # Document final récapitulatif
        └── compte-rendu.md
```

### Flux des agents

```
Orchestrator → Dev → SM → Analyst → QA → PM → PO
     ↓          ↓     ↓      ↓       ↓    ↓    ↓
   Setup    Transcr. Segm.  Analyse Valid. Synth. Clôture
```

### Technologies

- **API externe** : AssemblyAI (transcription, diarisation, topics IAB)
- **Langue** : Français (AssemblyAI Universal model)
- **Format documents** : Markdown
- **Orchestration** : BMAD v3 (workflows YAML, tasks, handoffs fichiers)

---

## 6. Stories (Ordre d'exécution)

### Story S1 : Setup Réunion
**Agent :** Orchestrator  
**Objectif :** Créer structure dossier + valider présence fichiers audio

**Livrables :**
- Structure `meetings/<meeting-id>/` créée
- Fichiers audio présents dans `audio/`
- Validation de la présence d'au moins 1 fichier audio

---

### Story S2 : Transcription AssemblyAI
**Agent :** Dev  
**Objectif :** Transmettre fichiers audio à AssemblyAI et récupérer transcriptions

**Livrables :**
- Script `aai_transcribe.py` fonctionnel
- Fichiers JSON de transcription dans `transcriptions/`
- Logs d'exécution dans `logs/run-YYYYMMDD.log`

---

### Story S3 : Préparation Lots & Segmentation
**Agent :** Dev (SM)  
**Objectif :** Découper transcriptions en segments exploitables

**Livrables :**
- Segments dans `working/segments/`
- Fichier `working/index.json` avec métadonnées
- Métriques calculées (tokens, taille lots, overlap)

---

### Story S4 : Analyse & Résumés
**Agent :** Analyst  
**Objectif :** Résumer chaque segment et agréger les sujets récurrents

**Livrables :**
- Résumés structurés dans `working/summaries/`
- Fichier `working/threads.md` avec sujets agrégés
- Tags et métadonnées par segment

---

### Story S5 : Validation Inverse
**Agent :** QA  
**Objectif :** Comparer documents finaux avec transcriptions pour détecter incohérences

**Livrables :**
- Rapport de validation dans `working/validation-report.md`
- Liste des écarts détectés avec justifications
- Actions recommandées pour chaque écart

---

### Story S6 : Synthèse Finale
**Agent :** PM  
**Objectif :** Produire compte-rendu structuré final consolidé

**Livrables :**
- `final/compte-rendu.md` avec structure complète
- Participants, ordre du jour, décisions, actions RACI
- Questions ouvertes, chantiers, risques

---

### Story S7 : Vérification & Clôture
**Agent :** PO  
**Objectif :** Vérifier cohérence finale et archiver

**Livrables :**
- Rapport de vérification des artefacts
- Validation finale du compte-rendu
- Archivage des dossiers (si nécessaire)

---

## 7. Risques & Mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| API AssemblyAI indisponible | Blocant | Faible | Retry automatique + notification utilisateur |
| Transcription de mauvaise qualité | Élevé | Moyen | Validation inverse + correction manuelle possible |
| Speakers non identifiés correctement | Moyen | Moyen | Vérification manuelle des speakers dans validation |
| Segments trop longs/courts | Moyen | Moyen | Ajustement dynamique de la taille des segments |
| Perte de contexte entre segments | Élevé | Faible | Threads agrégés + index avec métadonnées |
| Incohérences non détectées | Élevé | Moyen | Validation inverse multi-niveaux + checklist QA |

---

## 8. KPIs de Succès

- **Taux de transcription** : > 95% des fichiers audio transcrits avec succès
- **Qualité diarisation** : > 90% des speakers correctement identifiés
- **Temps de traitement** : < 30 min pour une réunion de 1h (4 fichiers audio)
- **Taux de détection incohérences** : > 80% des incohérences majeures détectées
- **Satisfaction utilisateur** : Compte-rendu final jugé complet et exploitable
- **Réutilisabilité** : Workflow exécutable pour 3+ réunions différentes sans modification

---

## 9. Dépendances

**Pré-requis :**
- Clé API AssemblyAI configurée dans `.env`
- Structure BMAD v3 opérationnelle (workflows, tasks, agents)
- Accès IDE Cursor avec agents BMAD configurés

**Bloque :**
- Aucune dépendance critique (workflow autonome)

**Intégrations futures (hors scope) :**
- Interface utilisateur pour déclencher le workflow
- Intégration calendrier pour récupération automatique des participants
- Export vers formats autres (PDF, DOCX)

---

## 10. Documentation Requise

- **Workflow YAML** : `.bmad-core/workflows/meeting-transcription.yaml`
- **Tasks** : 12 tasks dans `.bmad-core/tasks/`
- **Stories** : 7 stories dans `docs/stories/meeting-transcription/`
- **Architecture** : `docs/architecture/meeting-transcription.md`
- **Prompts** : 3 prompts dans `docs/prompts/`
- **Flow** : `docs/flows/meeting-transcription.md`
- **Plan de tests** : Checklist par étape
- **Résumé d'intégration** : Guide pour chaque agent

---

**Fin de l'Epic**





