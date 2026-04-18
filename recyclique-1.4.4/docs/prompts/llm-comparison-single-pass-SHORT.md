# Prompt Court - Prêt à Copier-Coller

**Usage :** Copier-coller directement dans ChatGPT, Claude, ou autre LLM

---

## Prompt à Copier-Coller

```
Tu es un expert en analyse de réunions professionnelles. Je vais te fournir les transcriptions brutes d'une réunion (format JSON AssemblyAI avec diarisation) et je te demande de produire un compte-rendu structuré et complet en une seule passe.

## Objectif

Produire un compte-rendu professionnel qui :
1. Identifie et extrait l'ordre du jour
2. Reclasse toutes les discussions par sujet
3. Extrait les décisions, actions, questions ouvertes
4. Vérifie la cohérence et complétude
5. Produit un document final exploitable

## Format des Transcriptions

Les transcriptions sont au format JSON AssemblyAI avec :
- `utterances` : Liste des interventions avec `text`, `speaker` (A, B, C...), `start`, `end` (timestamps en ms)

## Instructions

### 1. Analyse
- Lire toutes les transcriptions dans l'ordre chronologique
- Identifier les speakers et leurs interventions
- Détecter l'ordre du jour (explicite ou implicite)
- Repérer les transitions entre sujets

### 2. Extraction par Sujet
Pour chaque sujet de l'ordre du jour, extraire :
- **Décisions prises** : Formelles ou implicites
- **Actions (RACI)** : Tâches avec responsables si mentionnés
- **Questions ouvertes** : Questions sans réponse
- **Risques** : Problèmes ou préoccupations

### 3. Vérification
- Vérifier que toutes les décisions/actions sont présentes dans les transcriptions
- S'assurer qu'aucun élément important n'est oublié
- Vérifier la fidélité aux transcriptions (ne rien inventer)

## Format de Sortie

Produis un compte-rendu en Markdown avec cette structure :

```markdown
# Compte-rendu - [Nom Réunion]

**Date :** YYYY-MM-DD
**Participants :** [Liste speakers]
**Durée :** XhYm

---

## Ordre du jour

1. [Sujet 1]
2. [Sujet 2]
...

---

## Sujet 1 : [Titre]

### Points discutés
- [Point 1]
- [Point 2]

### Décisions prises
- [Décision 1]
- [Décision 2]

### Actions (RACI)
- [Action 1] - Responsable: [Nom]
- [Action 2]

### Questions ouvertes
- [Question 1]
- [Question 2]

### Risques et préoccupations
- [Risque 1]
...

---

## Sujet 2 : [Titre]
[Même structure]

---

## Points divers
[Sujets non prévus avec même structure]

---

## Prochaines étapes

1. [Action prioritaire 1]
2. [Action prioritaire 2]
...

---

## Notes de validation

- ✅ Cohérence vérifiée
- ✅ Complétude vérifiée
- ✅ Précision vérifiée (rien d'inventé)
```

## Règles

1. **Fidélité** : Ne rien inventer, tout extrait des transcriptions
2. **Noms originaux** : Ne pas reformuler les prénoms
3. **Chronologie** : Respecter l'ordre temporel
4. **Complétude** : Ne rien oublier d'important

---

**Transcriptions brutes :**

[ICI, JOINDRE OU COLLER LES FICHIERS JSON]

---

Analyse maintenant les transcriptions et produis le compte-rendu structuré.
```

---

## Instructions Rapides

1. **Copier le prompt ci-dessus**
2. **Remplacer** `[ICI, JOINDRE OU COLLER LES FICHIERS JSON]` par :
   - Soit joindre le fichier `full-transcript.json`
   - Soit coller le contenu JSON du fichier
3. **Envoyer** dans ChatGPT/Claude
4. **Récupérer** le compte-rendu structuré

---

**Note :** Ce compte-rendu sera comparé avec le workflow BMAD multi-étapes pour évaluer la qualité et complétude.

