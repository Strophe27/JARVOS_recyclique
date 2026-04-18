<!-- Powered by BMAD™ Core -->

# Verify Artifacts Consistency

**Agent:** PO  
**Workflow:** meeting-transcription  
**Stage:** closure

## Description

Vérifie la cohérence finale de tous les artefacts produits (chemins, métadonnées, structure).

**Script disponible :** `scripts/meeting-transcription/verify_and_close.py`

## Process

1. **Vérifier la structure de dossiers**
   - Vérifier que tous les dossiers attendus existent
   - Vérifier que les fichiers attendus sont présents

2. **Vérifier les métadonnées**
   - Meeting ID cohérent dans tous les fichiers
   - Timestamps cohérents entre segments et index
   - Speakers cohérents entre transcriptions et résumés

3. **Vérifier les chemins**
   - Tous les chemins référencés dans index.json existent
   - Tous les segments référencés dans threads.md existent
   - Compte-rendu final présent

4. **Vérifier la complétude**
   - Tous les segments ont un résumé correspondant
   - Tous les résumés sont référencés dans threads ou CR final
   - Aucun fichier orphelin

5. **Générer rapport de vérification**
   - Liste des vérifications effectuées
   - Problèmes détectés (si any)
   - Statut global: OK / Attention / Erreurs

6. **Afficher résumé**
   - Afficher statut de vérification
   - Confirmer ou demander corrections

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/verify_and_close.py <meeting-id>
```
Le script effectue toutes les vérifications et affiche un résumé complet.

## Output

- Rapport de vérification (affiché ou fichier)
- Statut global de cohérence
- Liste des problèmes (si any)

## Notes

- Vérification finale avant clôture
- Détecte problèmes de structure ou métadonnées
- Permet correction avant archivage





