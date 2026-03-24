<!-- Powered by BMAD™ Core -->

# Inverse Validation

**Agent:** QA  
**Workflow:** meeting-transcription  
**Stage:** validation

## Description

Compare les documents finaux (résumés, threads) avec les transcriptions brutes pour détecter incohérences, oublis, divergences.

**Script disponible :** `scripts/meeting-transcription/inverse_validation.py`

## Process

1. **Lire les documents à valider**
   - Résumés dans `working/summaries/`
   - Threads dans `working/threads.md`
   - Transcription complète dans `transcriptions/full-transcript.json`

2. **Pour chaque résumé :**
   - Extraire les points clés, décisions, actions
   - Vérifier dans la transcription brute que ces éléments existent
   - Détecter les incohérences (décisions non présentes, actions inventées)

3. **Pour les threads :**
   - Vérifier que les segments référencés existent bien
   - Vérifier que l'évolution décrite correspond aux transcriptions
   - Détecter les divergences

4. **Détecter les oublis**
   - Identifier des éléments importants dans les transcriptions qui n'apparaissent pas dans les résumés
   - Détecter les décisions ou actions mentionnées mais non extraites

5. **Générer le rapport de validation**
   - Fichier: `working/validation-report.md`
   - Format:
     ```markdown
     # Rapport de Validation
     
     ## Incohérences détectées
     - [Description] - Segment X - Justification - Action recommandée
     
     ## Oublis détectés
     - [Élément manquant] - Segment X - Action recommandée
     
     ## Divergences
     - [Description] - Justification - Action recommandée
     
     ## Validation globale
     - Score: X/Y éléments validés
     - Statut: OK / Attention / Erreurs
     ```

6. **Afficher le résumé**
   - Afficher nombre d'incohérences, oublis, divergences
   - Statut global de validation

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/inverse_validation.py <meeting-id>
```
Le script génère automatiquement le rapport de validation dans `working/validation-report.md`.

## Output

- Fichier `working/validation-report.md` avec rapport complet
- Message de confirmation avec statut de validation

## Notes

- Validation inverse = partir des documents finaux pour vérifier les transcriptions
- Détection basée sur similarité sémantique et matching de texte
- Rapport clair avec actions recommandées pour chaque problème





