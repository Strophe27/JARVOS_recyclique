# Brainstorming Session Results

**Session Date:** 2025-01-27
**Facilitator:** 📊 Business Analyst Mary
**Participant:** User

---

## Executive Summary

**Topic:** Système de transcription et analyse de réunions avec Assembly.ai

**Session Goals:** 
- Exploration d'une nouvelle fonctionnalité nécessitant une intégration API externe (Assembly.ai)
- Idéation ciblée sur un domaine précis (workflow de transcription → analyse → validation)
- Génération d'idées pour développement d'un EPIC
- Mode développement dans IDE Cursor (pas d'intégration interface pour l'instant)

**Techniques Used:** 
- Question Storming (exploration large)
- Brain Dump puis Structuration (approche utilisateur)

**Total Ideas Generated:** 12+ composants identifiés

**Key Themes Identified:**
- Workflow multi-agents BMAD pour traitement de réunions
- Transcription diarisée avec timestamps
- Extraction et organisation par sujets/ordre du jour
- Validation inverse (documents → transcriptions)
- Gestion de la non-linéarité des conversations

---

## Technique Sessions

### Session 1: Question Storming + Brain Dump

**Technique:** Exploration large via questions, puis structuration d'un brain dump utilisateur

**Durée:** ~15 minutes

**Idées générées par l'utilisateur:**

#### Contexte et contraintes
- Mode développement uniquement (IDE Cursor, pas d'intégration interface)
- Workflow BMAD pour agents
- Intégration API Assembly.ai pour transcription diarisée
- 4 fichiers audio d'une réunion avec 4 speakers différents

#### Composants identifiés

**1. Déclaration de réunion**
- Création d'un espace/dossier sur disque dur
- Structure organisée pour stocker fichiers audio et résultats
- Pour l'instant dans l'IDE (disque dur local)

**2. Upload fichiers audio**
- Placer fichiers audio dans le dossier de réunion créé
- Support de multiples fichiers (ex: 4 fichiers pour 4 speakers)

**3. Agent transcription (Assembly.ai)**
- Script/workflow BMAD pour envoyer fichiers à l'API Assembly.ai
- Récupération de transcriptions diarisées (speakers identifiés)
- Format de sortie: fichiers .md ou .txt
- Timestamps potentiels (à confirmer)

**4. Agent analyse initiale**
- Détection automatique de l'ordre du jour OU
- Réception de l'ordre du jour via:
  - Chat (prompt utilisateur)
  - Fichier texte séparé
- Génération de structure de comptes-rendus

**5. Agent extraction par sujet**
- Parcours des transcriptions diarisées
- Extraction des éléments pertinents par sujet
- Création de fichiers séparés (un fichier par sujet)
- Gestion de la non-linéarité:
  - Sujets peuvent être abordés plusieurs fois
  - Retours en arrière dans la conversation
  - Validations en fin de réunion qui contredisent début

**6. Importance de la diarisation et timestamps**
- Identifier qui a dit quoi (speakers)
- Connaître l'ordre chronologique des échanges
- Comprendre l'évolution des décisions
- Traçabilité des validations finales

**7. Agent vérificateur (validation inverse)**
- Une fois tout traité, relit l'ensemble
- Part des documents de synthèse finaux
- Vérifie dans les transcriptions que tout est correct
- Détection de litiges/incohérences

**8. Interface de validation utilisateur**
- Présentation des litiges détectés
- Propositions de correction formatées:
  - "Il a été dit X mais il semble que ce soit Y"
  - Options multiples: "Réponse 1, 2, 3, etc."
- Validation finale par l'utilisateur (celui qui a fait la prise de notes)

**Insights découverts:**
- Les réunions humaines sont non-linéaires même avec ordre du jour
- Les sujets sont souvent interconnectés
- Les décisions peuvent évoluer entre début et fin de réunion
- La chronologie est cruciale pour comprendre le contexte

**Connexions notables:**
- Diarisation + timestamps = traçabilité complète
- Extraction par sujet + vérification inverse = qualité garantie
- Validation utilisateur avec propositions = réduction de la charge cognitive

---

## Idea Categorization

### Immediate Opportunities
*Ideas ready to implement now*

1. **Workflow BMAD de base : Déclaration + Upload**
   - Création de structure de dossiers pour réunion
   - Upload fichiers audio dans le dossier
   - Description: Fondation du système, nécessaire pour tout le reste
   - Pourquoi immédiat: Simple à implémenter, pas de dépendance externe

2. **Intégration Assembly.ai basique**
   - Script Python pour appeler API Assembly.ai
   - Upload fichiers audio
   - Récupération transcriptions diarisées
   - Sauvegarde en fichiers .md/.txt
   - Description: Core fonctionnel du système
   - Pourquoi immédiat: API documentée, intégration directe possible

3. **Agent extraction simple par sujet**
   - Lecture transcriptions
   - Extraction basique par mots-clés/sujets
   - Création fichiers séparés
   - Description: MVP de l'extraction, peut être amélioré ensuite
   - Ressources nécessaires: Accès API Assembly.ai, clé API

### Future Innovations
*Ideas requiring development/research*

4. **Agent analyse intelligent avec détection ordre du jour**
   - Détection automatique de l'ordre du jour dans transcriptions
   - Utilisation LLM pour comprendre structure de réunion
   - Description: Nécessite modélisation de la compréhension de réunions
   - Développement nécessaire: Intégration LLM, prompt engineering

5. **Gestion avancée de la non-linéarité**
   - Détection des retours en arrière sur sujets
   - Consolidation des décisions évolutives
   - Gestion des contradictions début/fin
   - Description: Complexe, nécessite compréhension contextuelle
   - Timeline estimate: 2-3 semaines après MVP

6. **Agent vérificateur avec validation inverse**
   - Parcours documents → transcriptions
   - Détection automatique de litiges
   - Scoring de confiance
   - Description: Nécessite logique de comparaison sophistiquée
   - Développement nécessaire: Algorithmes de matching et validation

7. **Interface de validation avec propositions intelligentes**
   - Présentation contextuelle des litiges
   - Génération de propositions de correction multiples
   - Format interactif (choix 1, 2, 3)
   - Description: UX avancée, nécessite design d'interface
   - Timeline estimate: 3-4 semaines après vérificateur

### Moonshots
*Ambitious, transformative concepts*

8. **Système de suivi de décisions multi-réunions**
   - Traçabilité des décisions sur plusieurs réunions
   - Détection d'évolution de décisions dans le temps
   - Description: Nécessite base de données et historique
   - Potentiel transformateur: Système de mémoire organisationnelle
   - Défis: Gestion de la complexité temporelle, matching inter-réunions

9. **Génération automatique de comptes-rendus exécutifs**
   - Synthèse automatique pour management
   - Extraction des points clés et actions
   - Format adapté au niveau hiérarchique
   - Description: Nécessite compréhension sémantique avancée
   - Potentiel transformateur: Réduction drastique du temps de rédaction CR

10. **Intégration avec calendrier et participants**
    - Détection automatique des participants depuis calendrier
    - Association speakers → participants
    - Envoi automatique des CR aux participants
    - Description: Nécessite intégrations multiples (calendrier, email)
    - Défis: Privacy, gestion des identités

### Insights & Learnings
*Key realizations from the session*

- **Les réunions sont intrinsèquement non-linéaires** : Même avec ordre du jour, les sujets s'entremêlent naturellement
- **La chronologie est critique** : Les timestamps et la diarisation permettent de comprendre l'évolution des décisions
- **La validation inverse est innovante** : Partir des documents finaux pour vérifier les transcriptions est une approche qualité efficace
- **L'utilisateur reste au centre** : Malgré l'automatisation, la validation humaine finale est essentielle
- **Workflow BMAD adapté** : La structure multi-agents BMAD correspond parfaitement à ce type de pipeline de traitement

---

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Workflow BMAD de base + Intégration Assembly.ai
- **Rationale:** 
  - Fondation nécessaire pour tout le reste
  - Permet de valider l'approche technique rapidement
  - Débloque les étapes suivantes
  - MVP fonctionnel en quelques jours
- **Next steps:** 
  1. Créer structure de dossiers pour réunions
  2. Script Python pour upload fichiers audio vers Assembly.ai
  3. Récupération et sauvegarde des transcriptions diarisées
  4. Workflow BMAD simple pour orchestrer ces étapes
- **Resources needed:** 
  - Clé API Assembly.ai
  - Documentation API Assembly.ai
  - Python avec bibliothèque requests/httpx
  - Structure BMAD workflow
- **Timeline:** 3-5 jours

#### #2 Priority: Agent extraction par sujet (MVP)
- **Rationale:** 
  - Valeur métier immédiate (comptes-rendus organisés)
  - Peut fonctionner avec ordre du jour manuel simple
  - Base pour améliorations futures (détection auto, non-linéarité)
- **Next steps:** 
  1. Parser transcriptions diarisées
  2. Extraction basique par mots-clés/sujets
  3. Création fichiers séparés par sujet
  4. Intégration dans workflow BMAD
- **Resources needed:** 
  - Logique d'extraction de texte (regex ou simple matching)
  - Format d'ordre du jour défini
  - Structure de sortie des fichiers CR
- **Timeline:** 5-7 jours après #1

#### #3 Priority: Agent vérificateur avec validation inverse
- **Rationale:** 
  - Garantit la qualité des comptes-rendus
  - Approche innovante et différenciante
  - Réduit le risque d'erreurs dans les CR finaux
  - Prérequis pour l'interface de validation utilisateur
- **Next steps:** 
  1. Développer logique de comparaison documents → transcriptions
  2. Détection de litiges/incohérences
  3. Génération de rapports de validation
  4. Format de présentation des litiges à l'utilisateur
- **Resources needed:** 
  - Algorithmes de matching texte (similarité sémantique ?)
  - Logique de détection de contradictions
  - Format de rapport de validation
- **Timeline:** 7-10 jours après #2 

---

## Reflection & Follow-up

### What Worked Well
- Approche "brain dump" efficace pour capturer toutes les idées rapidement
- Structuration progressive permettant d'identifier clairement les composants
- Identification naturelle des dépendances entre composants
- Questions émergentes bien structurées pour la phase de clarification

### Areas for Further Exploration
- Détection automatique de l'ordre du jour avec LLM
- Gestion avancée de la non-linéarité (retours en arrière, évolutions)
- Format optimal des comptes-rendus (structure, métadonnées)
- Intégration future avec calendrier et système de notifications
- Possibilité de génération de CR exécutifs automatiques

### Recommended Follow-up Techniques
- **Morphological Analysis** : Explorer les différentes combinaisons de formats (transcription, CR, validation)
- **Role Playing** : Se mettre dans la peau de différents utilisateurs (organisateur réunion, participant, lecteur CR)
- **Assumption Reversal** : Questionner les hypothèses (ex: "Et si on ne faisait PAS de validation inverse ?")
- **SCAMPER Method** : Explorer comment adapter/adapter d'autres systèmes de transcription existants

### Questions That Emerged

**Questions techniques à clarifier:**

1. **Structure des dossiers/répertoires** ✅ CLARIFIÉ
   - Dossiers dans Gitignore (pas versionnés)
   - Intégrés à la structure du projet (phase développement/maquette)
   - Structure interne à définir (voir discussion ci-dessous)

2. **Format des transcriptions Assembly.ai** ✅ PARTIELLEMENT CLARIFIÉ
   - API déjà testée en sandbox par l'utilisateur
   - Détails techniques à fournir en temps voulu
   - Format exact à confirmer (JSON avec speakers + timestamps attendu)

3. **Gestion de l'ordre du jour** ✅ CLARIFIÉ
   - Format très clair pour les agents (structure précise à définir)
   - Récupérable dans la synthèse finale
   - Document de travail pour les agents (pas final)

4. **Extraction par sujet**
   - Comment identifier les transitions entre sujets dans la transcription ?
   - Que faire des segments qui parlent de plusieurs sujets à la fois ?
   - Comment gérer les références croisées entre sujets ?

5. **Validation inverse**
   - Quel niveau de granularité pour la vérification ? (phrase, paragraphe, section ?)
   - Comment détecter les "litiges" ? (différences sémantiques, contradictions factuelles ?)
   - Que faire si une information dans le CR n'apparaît nulle part dans les transcriptions ?

6. **Workflow BMAD**
   - Quels agents BMAD utiliser ? (orchestrator, analyst, dev ?)
   - Comment structurer le workflow ? (séquentiel, parallèle, conditionnel ?)
   - Gestion des erreurs API ? (retry, fallback, notification ?)

7. **Authentification Assembly.ai** ✅ CLARIFIÉ
   - Clé API dans fichier `.env` (comme les autres APIs du projet)

8. **Format des comptes-rendus finaux** ✅ CLARIFIÉ
   - Markdown simple avec sections (lisible humainement)
   - Contenu : participants, ordre du jour, date, sujets, CR sur tous sujets
   - Sections dynamiques par sujet : décisions prises, questions ouvertes, chantiers ouverts, choses à résoudre
   - Structure intelligente et dynamique (peut varier selon l'état de chaque sujet)
   - Document final récapitulatif (pas les documents de travail)

### Next Session Planning
- **Suggested topics:** 
  - Clarification des questions techniques identifiées
  - Définition précise du workflow BMAD
  - Spécification de l'API Assembly.ai et format de données
  - Design de la structure de dossiers et fichiers
- **Recommended timeframe:** 
  - Session de clarification: 30-45 min
  - Puis création de l'EPIC avec toutes les spécifications
- **Preparation needed:**
  - Documentation API Assembly.ai consultée
  - Exemple de transcription Assembly.ai (si disponible)
  - Structure BMAD workflows existants à référencer
  - Décision sur l'emplacement des dossiers de réunion 

---

*Session facilitated using the BMAD-METHOD™ brainstorming framework*

