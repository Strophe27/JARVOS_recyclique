<!-- Powered by BMAD™ Core -->

# Build Threads

**Agent:** Analyst  
**Workflow:** meeting-transcription  
**Stage:** analysis

## Description

Agrège les sujets récurrents (threads) à partir des résumés de segments en analysant les tags et sujets similaires.

**Script disponible :** `scripts/meeting-transcription/build_threads.py`

## Process

1. **Lire tous les résumés**
   - Charger tous les fichiers dans `working/summaries/`
   - Extraire les tags de chaque résumé

2. **Identifier les threads (sujets récurrents)**
   - Grouper les segments par tags similaires
   - Détecter les sujets qui apparaissent dans plusieurs segments
   - Créer des groupes de segments liés

3. **Pour chaque thread identifié :**
   - Analyser l'évolution du sujet au fil des segments
   - Identifier les décisions finales
   - Extraire les actions et questions ouvertes

4. **Créer le fichier threads.md**
   - Fichier: `working/threads.md`
   - Format:
     ```markdown
     # Sujets Récurrents (Threads)
     
     ## Thread #sujet1
     - **Apparu dans segments:** 001, 005, 012
     - **Évolution:** [description de l'évolution]
     - **Décisions finales:** [liste des décisions]
     - **Actions:** [liste des actions]
     - **Questions ouvertes:** [liste]
     
     ## Thread #sujet2
     ...
     ```

5. **Confirmer création**
   - Afficher nombre de threads identifiés
   - Confirmer création du fichier

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/build_threads.py <meeting-id>
```
Le script lit automatiquement tous les résumés et génère `working/threads.md`.

## Output

- Fichier `working/threads.md` avec tous les threads agrégés
- Message de confirmation avec nombre de threads

## Notes

- Threads = sujets qui reviennent plusieurs fois dans la réunion
- Agrégation basée sur tags similaires et analyse sémantique
- Permet de comprendre l'évolution des sujets au fil de la réunion





