# Prompt LLM - Analyse Complète de Réunion (Comparaison Single-Pass)

**Version :** 1.0  
**Usage :** Comparaison avec workflow BMAD multi-étapes  
**Format :** Prêt pour ChatGPT, Claude, ou autre LLM

---

## Prompt Complet

```
Tu es un expert en analyse de réunions professionnelles. Je vais te fournir les transcriptions brutes d'une réunion (format JSON AssemblyAI avec diarisation) et je te demande de produire un compte-rendu structuré et complet en une seule passe.

## Contexte

J'ai une réunion enregistrée qui a été transcrite via AssemblyAI avec diarisation (identification des speakers). Les transcriptions brutes sont fournies ci-dessous au format JSON.

**Objectif :** Produire un compte-rendu professionnel structuré qui :
1. Identifie et extrait l'ordre du jour
2. Reclasse toutes les discussions par sujet
3. Extrait les décisions, actions, questions ouvertes
4. Vérifie la cohérence et complétude
5. Produit un document final exploitable

## Format des Transcriptions

Les transcriptions sont au format JSON AssemblyAI avec la structure suivante :
- `utterances` : Liste des interventions avec :
  - `text` : Texte transcrit
  - `speaker` : Identifiant du speaker (A, B, C, etc.)
  - `start` : Timestamp de début (millisecondes)
  - `end` : Timestamp de fin (millisecondes)

**Note :** Les transcriptions sont fournies dans les fichiers joints ou dans le message suivant.

## Instructions Détaillées

### 1. Analyse Initiale

- **Lire toutes les transcriptions** : Parcourir l'ensemble des utterances dans l'ordre chronologique
- **Identifier les speakers** : Noter les différents speakers (A, B, C, etc.) et leurs interventions
- **Détecter l'ordre du jour** : Identifier les sujets principaux abordés (explicitement mentionnés ou implicitement déduits)
- **Repérer les transitions** : Identifier les moments où la discussion change de sujet

### 2. Extraction de l'Ordre du Jour

- **Sujets explicites** : Si l'ordre du jour est mentionné au début, l'utiliser tel quel
- **Sujets implicites** : Si non mentionné, déduire l'ordre du jour depuis les sujets récurrents
- **Organisation** : Lister les sujets dans l'ordre chronologique d'apparition dans la réunion
- **Format** : Liste numérotée claire

### 3. Reclassement par Sujet

Pour chaque sujet identifié dans l'ordre du jour :

- **Collecter toutes les interventions** : Regrouper toutes les utterances liées à ce sujet (même si dispersées dans le temps)
- **Respecter la chronologie** : Garder l'ordre temporel des interventions pour chaque sujet
- **Identifier les sous-sujets** : Si un sujet principal contient plusieurs sous-thèmes, les organiser logiquement

### 4. Extraction des Informations Clés

Pour chaque sujet, extraire :

#### Décisions prises
- **Décisions formelles** : Décisions explicitement prises ou validées
- **Décisions implicites** : Décisions déduites du contexte (à marquer comme telles)
- **Format** : Puces claires avec contexte si nécessaire

#### Actions (RACI)
- **Actions identifiées** : Tâches ou actions à réaliser
- **Responsables** : Personnes assignées (si mentionnées)
- **Format** : "- [Action] - Responsable: [Nom]" ou "- [Action]" si pas de responsable
- **Grouper par responsable** : Si possible, organiser les actions par personne responsable

#### Questions ouvertes
- **Questions posées** : Questions sans réponse immédiate
- **Sujets à clarifier** : Points nécessitant des précisions
- **Format** : Puces avec contexte

#### Risques et préoccupations
- **Risques identifiés** : Problèmes ou risques mentionnés
- **Préoccupations** : Sujets de préoccupation exprimés
- **Format** : Puces descriptives

### 5. Vérification et Validation

- **Cohérence** : Vérifier que toutes les décisions/actions mentionnées sont bien présentes dans les transcriptions
- **Complétude** : S'assurer qu'aucun élément important n'a été oublié
- **Précision** : Vérifier que les extractions sont fidèles aux transcriptions (ne pas inventer)
- **Chronologie** : Vérifier que l'ordre des sujets respecte la chronologie de la réunion

### 6. Points Divers

- **Sujets hors ordre du jour** : Identifier les sujets abordés mais non prévus
- **Digressions** : Noter les digressions importantes
- **Format** : Section dédiée avec même structure (décisions, actions, questions)

### 7. Prochaines Étapes

- **Synthèse globale** : Lister les actions prioritaires à réaliser
- **Échéances** : Noter les échéances mentionnées (si any)
- **Format** : Liste numérotée ou puces

## Format de Sortie Requis

Produis un compte-rendu en Markdown avec la structure suivante :

```markdown
# Compte-rendu - [Nom de la Réunion]

**Date :** YYYY-MM-DD
**Participants :** [Liste des participants - utiliser les speakers identifiés]
**Durée :** XhYm (calculée depuis les timestamps)
**Meeting ID :** [si disponible]

---

## Ordre du jour

1. [Sujet 1]
2. [Sujet 2]
3. [Sujet 3]
...

---

## Sujet 1 : [Titre du Sujet]

### Points discutés

- [Point principal 1]
- [Point principal 2]
...

### Décisions prises

- [Décision 1]
- [Décision 2]
...

### Actions (RACI)

- [Action 1] - Responsable: [Nom]
- [Action 2] - Responsable: [Nom]
- [Action 3] (pas de responsable assigné)
...

### Questions ouvertes

- [Question 1 avec contexte]
- [Question 2 avec contexte]
...

### Risques et préoccupations

- [Risque 1]
- [Préoccupation 1]
...

---

## Sujet 2 : [Titre du Sujet]

[Même structure que Sujet 1]

---

## Points divers

### [Sujet non prévu 1]

[Même structure : Points discutés, Décisions, Actions, Questions, Risques]

---

## Prochaines étapes

1. [Action prioritaire 1]
2. [Action prioritaire 2]
3. [Action prioritaire 3]
...

---

## Notes de validation

- **Cohérence vérifiée** : ✅ Toutes les décisions/actions sont présentes dans les transcriptions
- **Complétude** : ✅ Tous les sujets importants ont été traités
- **Précision** : ✅ Aucune information inventée, tout est extrait des transcriptions

---

*Compte-rendu généré automatiquement à partir des transcriptions brutes de la réunion.*
```

## Règles Importantes

1. **Fidélité aux transcriptions** : Ne rien inventer, tout doit être extrait des transcriptions fournies
2. **Conserver les noms originaux** : Ne pas reformuler les prénoms ou noms de personnes
3. **Chronologie respectée** : Garder l'ordre temporel des sujets et interventions
4. **Clarté** : Utiliser un langage clair et professionnel
5. **Complétude** : Ne pas oublier d'informations importantes
6. **Structure cohérente** : Respecter la structure demandée pour tous les sujets
7. **Vérification** : Inclure une section de validation pour montrer que tu as vérifié la cohérence

## Informations Supplémentaires (si disponibles)

- **Mapping speakers** : Si tu as des informations sur qui est qui (ex: A = Alice, B = Bob), utilise-les
- **Ordre du jour initial** : Si un ordre du jour a été fourni séparément, utilise-le comme référence
- **Contexte** : Si tu as des informations sur le contexte de la réunion, utilise-les pour mieux comprendre

## Début de l'Analyse

Je vais maintenant te fournir les transcriptions brutes. Analyse-les complètement et produis le compte-rendu structuré selon les instructions ci-dessus.

**Transcriptions brutes :**

[ICI, JOINDRE OU COLLER LES FICHIERS JSON DE TRANSCRIPTION]

---

**Note finale :** Ce compte-rendu sera comparé avec un workflow multi-étapes (segmentation, résumés par lots, agrégation de threads, validation inverse). Produis un travail de qualité professionnelle qui démontre ce qu'un LLM peut faire en une seule passe.
```

---

## Instructions d'Utilisation

### Pour ChatGPT / Claude

1. **Copier le prompt complet** ci-dessus
2. **Remplacer la section** `[ICI, JOINDRE OU COLLER LES FICHIERS JSON DE TRANSCRIPTION]` par :
   - Soit les fichiers JSON joints
   - Soit le contenu des fichiers JSON collé dans le message
3. **Envoyer le prompt** au LLM
4. **Attendre le compte-rendu** structuré

### Format des Fichiers à Joindre

Si tu as plusieurs fichiers de transcription (un par fichier audio) :

**Option 1 : Joindre les fichiers**
- Joindre tous les fichiers JSON de transcription
- Le LLM les lira automatiquement

**Option 2 : Consolider en un seul fichier**
- Si tu as `full-transcript.json`, joindre uniquement ce fichier
- Sinon, consolider tous les JSON en un seul fichier avec toutes les `utterances`

**Option 3 : Coller le contenu**
- Ouvrir `full-transcript.json` (ou les fichiers individuels)
- Copier le contenu JSON
- Coller dans le prompt à la place de `[ICI, JOINDRE...]`

### Exemple de Structure JSON Attendue

```json
{
  "utterances": [
    {
      "text": "Bonjour, commençons la réunion.",
      "speaker": "A",
      "start": 0,
      "end": 2000
    },
    {
      "text": "D'accord, on va parler de...",
      "speaker": "B",
      "start": 2500,
      "end": 5000
    }
  ]
}
```

---

## Points de Comparaison avec Workflow BMAD

Ce prompt permet de comparer :

1. **Single-pass vs Multi-étapes** : Un LLM fait tout en une fois vs workflow BMAD en 7 étapes
2. **Qualité d'extraction** : Capacité à extraire décisions/actions/questions
3. **Organisation** : Capacité à reclasser par sujet
4. **Vérification** : Capacité à vérifier la cohérence
5. **Complétude** : Rien d'oublié vs workflow avec validation inverse

---

**Document créé le :** 2025-12-06  
**Auteur :** BMad Analyst

