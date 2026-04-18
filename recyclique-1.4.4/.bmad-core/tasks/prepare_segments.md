<!-- Powered by BMAD™ Core -->

# Prepare Segments

**Agent:** SM (Dev)  
**Workflow:** meeting-transcription  
**Stage:** prepare_segments

## Description

Découpe les transcriptions en segments exploitables (fenêtres temporelles) pour traitement par lots.

**Script disponible :** `scripts/meeting-transcription/prepare_segments.py`

## Process

1. **Lire les fichiers JSON de transcription**
   - Lire tous les fichiers dans `transcriptions/*.json`
   - Parser la structure AssemblyAI (`utterances`, `speakers`, `text`)

2. **Consolider toutes les transcriptions**
   - Fusionner toutes les `utterances` en une liste chronologique
   - Trier par timestamp (`start`)
   - Créer une transcription complète consolidée

3. **Découper en segments**
   - Fenêtre temporelle: 5 minutes par segment
   - Overlap: 30 secondes entre segments
   - Format segment: `segment-{num:03d}.md`

4. **Créer les fichiers segments**
   - Pour chaque segment, créer `working/segments/segment-{num}.md`
   - Format:
     ```markdown
     # Segment {num}
     
     **Timestamp :** {start} - {end}
     **Speaker :** {speaker} ({speaker_name})
     **Durée :** {duration}
     
     ## Texte
     
     {texte_du_segment}
     ```

5. **Sauvegarder la transcription consolidée**
   - Créer `transcriptions/full-transcript.json` avec toutes les utterances

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/prepare_segments.py <meeting-id>
```
Le script effectue automatiquement toutes les étapes ci-dessus.

## Output

- Fichiers segments dans `working/segments/segment-{num}.md`
- Transcription consolidée dans `transcriptions/full-transcript.json`
- Message de confirmation avec nombre de segments créés

## Notes

- Taille segment: 5 min (ajustable si nécessaire)
- Overlap: 30s pour préserver contexte
- Format Markdown pour faciliter lecture par agents suivants





