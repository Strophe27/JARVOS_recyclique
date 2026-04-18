<!-- Powered by BMAD™ Core -->

# Generate Meeting Report

**Agent:** PM  
**Workflow:** meeting-transcription  
**Stage:** synthesis

## Description

Consolide les résumés et threads pour produire le compte-rendu final structuré en Markdown.

**Script disponible :** `scripts/meeting-transcription/generate_meeting_report.py`

## Process

1. **Lire tous les inputs**
   - Résumés dans `working/summaries/`
   - Threads dans `working/threads.md`
   - Index dans `working/index.json`
   - Rapport de validation dans `working/validation-report.md` (optionnel)

2. **Extraire les métadonnées**
   - Meeting ID → Date, nom réunion
   - Speakers détectés depuis transcriptions
   - Durée totale depuis index

3. **Consolider les informations**
   - Détecter l'ordre du jour (depuis threads ou résumés)
   - Consolider toutes les décisions (éliminer redites)
   - Consolider toutes les actions (RACI)
   - Consolider questions ouvertes et chantiers

4. **Générer le compte-rendu structuré**
   - Fichier: `final/compte-rendu.md`
   - Utiliser prompt PM standard (voir `docs/prompts/pm-synthesis.md`)
   - Structure:
     ```markdown
     # Compte-rendu - [Nom Réunion]
     
     **Date :** YYYY-MM-DD
     **Participants :** [Liste]
     **Durée :** XhYm
     
     ## Ordre du jour
     1. Sujet 1
     2. Sujet 2
     
     ## Sujet 1 : [Titre]
     ### Décisions prises
     - [Décision]
     
     ### Actions (RACI)
     - [Action] - Responsable: [Nom]
     
     ### Questions ouvertes
     - [Question]
     
     ### Chantiers ouverts
     - [Chantier]
     
     ## Sujet 2 : [Titre]
     ...
     
     ## Points divers
     [Sujets non prévus]
     
     ## Prochaines étapes
     [Synthèse globale]
     ```

5. **Éliminer redites**
   - Ne pas répéter les mêmes décisions/actions
   - Ordonner chronologiquement
   - Garder cohérence des tags

6. **Confirmer création**
   - Afficher confirmation avec chemin du fichier

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/generate_meeting_report.py <meeting-id>
```
Le script consolide automatiquement les résumés, threads et index pour générer `final/compte-rendu.md`.

## Output

- Fichier `final/compte-rendu.md` avec compte-rendu complet
- Message de confirmation

## Notes

- Utiliser prompt PM standard pour consolidation
- Structure dynamique (sections optionnelles selon contenu)
- Format Markdown lisible humainement





