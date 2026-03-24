<!-- Powered by BMAD™ Core -->

# Compute Metrics

**Agent:** SM (Dev)  
**Workflow:** meeting-transcription  
**Stage:** prepare_segments

## Description

Calcule les métriques des segments (tokens, taille, overlap) et crée l'index JSON.

**Note :** Cette tâche est automatiquement exécutée par `scripts/meeting-transcription/prepare_segments.py` qui combine préparation des segments et calcul des métriques.

## Process

1. **Lire tous les segments créés**
   - Lister les fichiers dans `working/segments/`
   - Parser chaque segment pour extraire métadonnées

2. **Calculer les métriques par segment**
   - **Tokens**: Estimer nombre de tokens (approximation: ~4 chars/token)
   - **Taille**: Nombre de caractères
   - **Durée**: Timestamp end - start
   - **Speakers**: Liste des speakers dans le segment
   - **Overlap**: Segments précédents/suivants qui se chevauchent

3. **Créer l'index JSON**
   - Fichier: `working/index.json`
   - Structure:
     ```json
     {
       "meeting_id": "<meeting-id>",
       "total_segments": 12,
       "total_duration_seconds": 3600,
       "segments": [
         {
           "id": "segment-001",
           "file": "working/segments/segment-001.md",
           "start": 1000,
           "end": 4000,
           "duration": 3000,
           "tokens": 750,
           "size_chars": 3000,
           "speakers": ["A", "B"],
           "overlap_prev": null,
           "overlap_next": "segment-002"
         }
       ]
     }
     ```

4. **Calculer métriques globales**
   - Total tokens, durée totale, nombre de speakers
   - Ajouter dans l'index JSON

5. **Afficher résumé**
   - Afficher les métriques principales
   - Confirmer création de l'index

## Output

- Fichier `working/index.json` avec toutes les métadonnées
- Message de confirmation avec métriques principales

## Notes

- Estimation tokens: approximation (peut être ajustée)
- Index JSON permet accès rapide aux segments
- Métriques utiles pour décider taille de lots pour LLM





