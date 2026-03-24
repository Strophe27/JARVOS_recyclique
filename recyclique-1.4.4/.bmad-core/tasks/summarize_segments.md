<!-- Powered by BMAD™ Core -->

# Summarize Segments

**Agent:** Analyst  
**Workflow:** meeting-transcription  
**Stage:** analysis

## Description

Résume chaque segment en utilisant un prompt LLM standard pour extraire points clés, décisions, actions, risques, questions.

**Script disponible :** `scripts/meeting-transcription/summarize_segments.py`

## Process

1. **Lire l'index des segments**
   - Charger `working/index.json`
   - Lister tous les segments à traiter

2. **Pour chaque segment :**
   - Lire le fichier `working/segments/segment-{num}.md`
   - Extraire le texte et métadonnées (timestamp, speaker)

3. **Appeler LLM avec prompt Analyst**
   - Utiliser le prompt standard (voir `docs/prompts/analyst-summary.md`)
   - Input: Texte du segment + métadonnées
   - Output: Résumé structuré en Markdown

4. **Sauvegarder le résumé**
   - Créer `working/summaries/summary-{num}.md`
   - Format structuré avec sections:
     - Points discutés
     - Décisions
     - Actions (RACI)
     - Risques
     - Questions ouvertes
     - Tags (3-5)
     - Tableau chronologique

5. **Afficher progression**
   - Afficher "Segment X/Y traité..." pour suivi

6. **Confirmer complétion**
   - Afficher nombre de résumés créés
   - Confirmer que tous les segments sont traités

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/summarize_segments.py <meeting-id>
```
Le script lit automatiquement l'index et crée les résumés pour tous les segments.

## Output

- Fichiers résumés dans `working/summaries/summary-{num}.md`
- Message de confirmation avec nombre de résumés créés

## Notes

- Utiliser prompt Analyst standard (voir `docs/prompts/analyst-summary.md`)
- Format Markdown structuré pour faciliter traitement suivant
- Conserver noms originaux (ne pas reformuler prénoms)





