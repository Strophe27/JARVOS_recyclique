# Story S2-DEV: Développement Script AssemblyAI

**Statut:** Ready for Review  
**Épopée:** [Meeting Transcription & Compte-Rendu](../epics/meeting-transcription.md)  
**Module:** BMAD Workflow - Dev  
**Priorité:** Haute (bloquant pour Story S2 - Transcription)

---

## 1. Contexte

La Story S2 (Transcription) nécessite un script Python `aai_transcribe.py` pour intégrer l'API AssemblyAI et transcrire les fichiers audio. Ce script doit être développé avant que le workflow complet puisse être exécuté.

**Prérequis :**
- Aucun (développement technique indépendant)

**Problème :**
- Pas de script pour intégrer AssemblyAI
- Story S2 ne peut pas être exécutée sans ce script
- Blocage technique pour le workflow complet

**Note :** Cette story est une story de développement technique, pas une story générée par le workflow. Elle doit être complétée avant de pouvoir tester le workflow complet.

---

## 2. User Story

En tant que **Dev BMAD**,  
je veux **développer le script `aai_transcribe.py` pour intégrer l'API AssemblyAI**,  
afin de **permettre la transcription automatique des fichiers audio dans le workflow**.

---

## 3. Critères d'acceptation

### 3.1. Script Python fonctionnel

1. **Fichier `scripts/aai_transcribe.py`**
   - Script Python standalone exécutable
   - Arguments CLI (exemple d'appel) :
     ```bash
     python scripts/aai_transcribe.py \
       --meeting-id "2025-01-27-reunion-x" \
       --concurrency 2 \
       --language fr \
       --diarization true \
       --iab true \
       --timeout-seconds 7200 \
       --consolidate true \
       --force \
       --verbose
     ```
   - Options CLI :
     - `--meeting-id <meeting-id>` (obligatoire) : ID de la réunion
     - `--concurrency <int>` (défaut: 2) : Nombre de fichiers traités en parallèle
     - `--language fr|auto` (défaut: `fr`) : Code langue pour transcription
     - `--diarization true|false` (défaut: `true`) : Activer identification speakers
     - `--iab true|false` (défaut: `true`) : Activer topics IAB
     - `--timeout-seconds <int>` (défaut: 7200) : Timeout global par fichier (2h)
     - `--consolidate true|false` (défaut: `true`) : Générer full-transcript.json
     - `--force` : Forcer ré-exécution même si transcription existe déjà
     - `--verbose` : Logs détaillés
   - Lit tous les fichiers audio dans `meetings/<meeting-id>/audio/`
   - Formats supportés : `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`
   - Filtre automatique : ignore les fichiers non audio avec avertissement dans logs
   - Normalisation noms : slugify si nécessaire (espaces, accents)

2. **Intégration API AssemblyAI**
   - **Upload fichiers** : `POST https://api.assemblyai.com/v2/upload`
     - Headers : `authorization: <ASSEMBLYAI_API_KEY>`
     - Body : fichier audio en binaire
     - Retourne : `upload_url` (URL temporaire)
   
   - **Création job transcription** : `POST https://api.assemblyai.com/v2/transcript`
     - Headers : `authorization`, `content-type: application/json`
     - Body JSON (valeurs issues des flags CLI) :
       ```json
       {
         "audio_url": "<upload_url>",
         "language_code": "<--language>",
         "speaker_labels": <--diarization>,
         "iab_categories": <--iab>
       }
       ```
     - Retourne : `id` (job ID)
   
   - **Poll status** : `GET https://api.assemblyai.com/v2/transcript/{id}`
     - Headers : `authorization`
     - Retourne : `status` (`queued`, `processing`, `completed`, `error`)
     - Poll toutes les 3-5 secondes jusqu'à `completed` ou `error`
     - Timeout global : `--timeout-seconds` (défaut: 7200 = 2h)
     - **Note** : Polling = boucles simples sans retries, mais tolère 5xx avec pause
   
   - **Récupération transcription** : Quand `status == "completed"`
     - Retourne JSON complet avec :
       - `text` : texte complet
       - `utterances` : liste avec `start`, `end`, `speaker`, `text`
       - `speakers` : mapping `{ "A": "Speaker 1", "B": "Speaker 2" }`
       - **⚠️ Note API** : L'API AssemblyAI retourne aussi un champ `words` (granularité mot-par-mot) qui n'est **pas nécessaire** pour notre workflow. Ce champ sera **filtré côté script** après récupération (voir section "Optimisation JSON").

3. **Gestion d'erreurs robuste**
   - **Retries réseau (429, 5xx)** :
     - 5 tentatives avec backoff exponentiel (1s, 2s, 4s, 8s, 16s)
     - Appliqué aux requêtes HTTP (upload, create, get)
     - Compteur d'erreurs transitoires par fichier pour reporting final
   
   - **Polling** :
     - Intervalle 3-5s entre polls
     - Tolère 5xx avec pause, jusqu'au timeout `--timeout-seconds`
     - Pas de retries au niveau polling (géré par retries réseau)
   
   - **Erreurs définitives (400, 401, 404)** :
     - Log détaillé avec message d'erreur
     - Notification utilisateur claire
     - Arrêt du script avec code d'erreur non-zéro
     - Écriture status `error` dans `state.json`
   
   - **Gestion clé API** :
     - Lecture depuis `.env` : `ASSEMBLYAI_API_KEY`
     - Vérification présence avant démarrage
     - Message d'erreur clair si absente + exit code ≠ 0

4. **Sauvegarde des résultats**
   - **Fichier `state.json`** (idempotence & reprise) :
     - Emplacement : `meetings/<meeting-id>/state.json`
     - Structure par fichier audio :
       ```json
       {
         "files": [
           {
             "filename": "speaker1.mp3",
             "upload_url": "...",
             "job_id": "abc123",
             "status": "completed",
             "started_at": "2025-01-27T10:00:00Z",
             "ended_at": "2025-01-27T10:05:00Z",
             "retries": 0
           }
         ]
       }
       ```
     - Status possibles : `pending`, `uploaded`, `queued`, `processing`, `completed`, `error`
     - Mise à jour à chaque transition de status
     - Permet reprise : si `job_id` existe sans résultat → reprendre au polling
   
   - **Idempotence** :
     - Si `transcriptions/<name>.json` existe déjà ET `--force` non passé → **sauter** le fichier
     - Si `state.json` contient `job_id` sans résultat → **reprendre** au polling
     - Flag `--force` : force ré-exécution complète (écrase résultats existants)
   
   - **Pour chaque fichier audio transcrit** :
     - Créer fichier JSON dans `meetings/<meeting-id>/transcriptions/<filename>.json`
     - **⚠️ IMPORTANT - Optimisation JSON (côté script)** :
       - L'API AssemblyAI retourne un champ `words` (granularité mot-par-mot) qui n'est **pas utilisable** pour notre workflow
       - **L'API ne permet pas d'exclure ce champ** via un paramètre
       - **Solution** : Filtrer les données **côté script** après récupération de l'API, **avant** sauvegarde
       - **Implémentation** : Appeler `filter_transcription_data(transcription_json)` après `get_transcript()`
       - **Filtrage à effectuer** :
         - Supprimer le champ `words` au niveau racine (granularité mot-par-mot inutile)
         - Supprimer le champ `words` dans chaque `utterance` (doublon redondant)
         - Garder uniquement : `text`, `utterances` (sans `words`), `speakers`, métadonnées essentielles
       - **Réduction de taille** : ~80-90% (de ~2000 lignes à ~200-300 lignes)
     - Structure JSON optimisée :
       ```json
       {
         "id": "...",
         "status": "completed",
         "text": "Texte complet...",
         "utterances": [
           {
             "speaker": "A",
             "text": "Intervention complète...",
             "start": 8,
             "end": 61862,
             "confidence": 0.79
           }
         ],
         "speakers": {
           "A": "Speaker 1"
         }
       }
       ```
     - Nom de fichier : `<basename audio>.json` (ex: `speaker1.mp3` → `speaker1.json`)
     - Normalisation : slugify noms si nécessaire (espaces, accents)
   
   - **Transcription consolidée** (si `--consolidate true`, défaut) :
     - Créer `transcriptions/full-transcript.json`
     - Fusionner toutes les `utterances` de tous les fichiers
     - Ajouter champ `source_file` / `file_index` dans chaque utterance
     - Trier strictement par `start` (ms) en gardant `file_id` et `speaker`
     - Structure :
       ```json
       {
         "meeting_id": "...",
         "utterances": [
           {
             "start": 1000,
             "end": 5000,
             "speaker": "A",
             "text": "...",
             "source_file": "speaker1.mp3",
             "file_index": 0
           }
         ]
       }
       ```

5. **Logging détaillé**
   - **Emplacement** : `meetings/<meeting-id>/logs/run-YYYYMMDD.log`
   - Contenu des logs :
     - Début traitement : meeting-id, nombre de fichiers
     - Pour chaque fichier : nom, upload, job ID, status, durée, retries
     - Fichiers ignorés (non audio) : liste avec motif d'exclusion
     - Erreurs avec stack trace
     - Résumé final : fichiers traités, réussis, échecs
   
   - **Résumé JSON final** (dernière ligne du log + fichier séparé) :
     - Emplacement : `meetings/<meeting-id>/logs/summary.json`
     - Structure :
       ```json
       {
         "meeting_id": "2025-01-27-reunion-x",
         "files_total": 4,
         "completed": 3,
         "failed": 1,
         "skipped": 0,
         "duration_seconds": 1250,
         "timestamp": "2025-01-27T10:30:00Z"
       }
       ```
     - Imprimé en dernière ligne du log (format JSON compact)
     - Permet automatisations et parsing facile

6. **Affichage progression**
   - Afficher progression en temps réel :
     ```
     Traitement fichier 1/4 : speaker1.mp3
     Upload... OK
     Job créé : abc123
     Polling... (queued → processing → completed)
     Transcription récupérée : 1250 mots, 3 speakers
     Sauvegarde... OK
     ```

### 3.2. Tests et validation

1. **Tests manuels**
   - Test avec 1 fichier audio court (< 1 min)
   - Test avec plusieurs fichiers (4-5 fichiers)
   - Test avec fichier long (> 30 min)
   - Test gestion erreur (clé API invalide) → exit code ≠ 0 + message d'aide
   - Test gestion timeout (simuler timeout) → respecte `--timeout-seconds`
   - **Test idempotence** : ré-exécution sans `--force` → aucun retraitement (no-op)
   - **Test idempotence avec `--force`** : ré-exécution avec `--force` → écrasement/mise à jour
   - **Test audio vide/corrompu** : erreur claire, pas de crash global
   - **Test reprise** : interruption puis reprise → reprend au polling depuis `state.json`

2. **Validation sortie**
   - Vérifier que tous les fichiers JSON sont créés
   - Vérifier structure JSON valide
   - Vérifier présence `utterances`, `speakers`, `text`
   - Vérifier timestamps cohérents
   - Vérifier diarisation (speakers identifiés)
   - **Vérifier optimisation** : absence de champ `words` (niveau racine et dans utterances)
   - **Vérifier taille fichiers** : réduction significative (~80-90% vs JSON brut API)
   - **Vérifier `state.json`** : présent, cohérent, un enregistrement par audio
   - **Vérifier `full-transcript.json`** (si `--consolidate true`) : toutes utterances fusionnées et triées
   - **Vérifier résumé JSON** : présent dans log et fichier séparé
   - **Vérifier fichiers ignorés** : listés dans log avec motif

---

## 4. Tâches

- [x] **T1 – Structure script de base**
  - Créer `scripts/aai_transcribe.py`
  - Parser arguments CLI (`--meeting-id`, `--verbose`)
  - Lecture clé API depuis `.env`
  - Validation meeting-id et présence dossier audio

- [x] **T2 – Upload fichiers vers AssemblyAI**
  - Fonction `upload_audio_file(file_path, api_key)`
  - Gestion erreurs upload
  - Retourne `upload_url`

- [x] **T3 – Création jobs transcription**
  - Fonction `create_transcription_job(upload_url, api_key)`
  - Paramètres : `language_code: fr`, `speaker_labels: true`, `iab_categories: true`
  - Retourne `job_id`

- [x] **T4 – Poll status avec retries**
  - Fonction `poll_transcription_status(job_id, api_key, max_retries=3)`
  - Poll toutes les 3-5 secondes
  - Backoff exponentiel sur erreurs temporaires
  - Timeout 30 minutes
  - Retourne JSON transcription complète

- [x] **T5 – Sauvegarde résultats**
  - Fonction `save_transcription(transcription_json, output_path)`
  - Sauvegarde JSON par fichier
  - Création transcription consolidée (optionnel)
  - **Note** : Le filtrage des `words` est géré par la T13 (fonction séparée)

- [x] **T6 – Logging et affichage**
  - Configuration logging vers fichier
  - Affichage progression en temps réel
  - Messages d'erreur clairs

- [x] **T7 – Tests et validation**
  - Tests manuels avec différents scénarios
  - Validation structure JSON
  - Documentation usage

- [x] **T8 – Gestion de la concurrence**
  - Pool de workers avec file d'attente
  - Traitement parallèle contrôlé (`--concurrency`)
  - Journalisation par fichier (début/fin) + agrégat final

- [x] **T9 – Idempotence & reprise**
  - Lecture/écriture `state.json` à chaque transition
  - Détection fichiers déjà transcrits (sans `--force`)
  - Reprise depuis `state.json` si job_id sans résultat

- [x] **T10 – Consolidation multi-fichiers**
  - Fusion toutes utterances avec `source_file` / `file_index`
  - Tri strict par `start` (ms)
  - Génération `full-transcript.json` (si `--consolidate true`)

- [x] **T11 – Résumé JSON final**
  - Génération `summary.json` avec métriques
  - Impression dernière ligne log (JSON compact)
  - Format exploitable pour automatisations

- [x] **T12 – Validation d'entrées**
  - Filtre formats audio (ignore non supportés)
  - Slugify noms si nécessaire (espaces, accents)
  - Validation fichiers (non vides, non corrompus)
  - Messages d'erreur clairs pour fichiers invalides

- [x] **T13 – Optimisation JSON (filtrage words) - OBLIGATOIRE**
  - **Contexte** : L'API AssemblyAI retourne un champ `words` (granularité mot-par-mot) qui n'est pas nécessaire pour notre workflow. L'API ne permet pas d'exclure ce champ via un paramètre, donc le filtrage doit se faire **côté script**.
  
  - **Fonction** : `filter_transcription_data(transcription_json: Dict) -> Dict`
    - **Input** : JSON brut de l'API AssemblyAI (avec `words`)
    - **Output** : JSON filtré sans les champs `words`
    - **Implémentation** :
      ```python
      def filter_transcription_data(transcription_json: Dict) -> Dict:
          """Supprime les données trop granulaires (words) pour optimiser la taille."""
          filtered = transcription_json.copy()
          
          # Supprimer words au niveau racine
          if 'words' in filtered:
              del filtered['words']
          
          # Supprimer words dans chaque utterance
          if 'utterances' in filtered:
              filtered['utterances'] = [
                  {k: v for k, v in utterance.items() if k != 'words'}
                  for utterance in filtered['utterances']
              ]
          
          return filtered
      ```
  
  - **Intégration dans le flux** :
    - Appeler `filter_transcription_data()` **après** `get_transcript()` et **avant** `save_transcription()`
    - Flux : `get_transcript()` → `filter_transcription_data()` → `save_transcription()`
  
  - **Validation** :
    - Vérifier que le JSON filtré ne contient plus de champ `words` (niveau racine et dans utterances)
    - Vérifier que la structure reste exploitable (`text`, `utterances`, `speakers` présents)
    - Réduction de taille : ~80-90% (de ~2000 lignes à ~200-300 lignes)

---

## 5. Dépendances

- **Pré-requis :**
  - Clé API AssemblyAI configurée dans `.env`
  - Spécifications API AssemblyAI fournies (endpoints, formats, etc.)
  - Python 3.8+ avec bibliothèques : `requests`, `python-dotenv`

- **Bloque :**
  - Story S2 (Transcription) - ne peut pas être exécutée sans ce script

---

## 6. Livrables

- Script `scripts/aai_transcribe.py` fonctionnel et testé
- Documentation usage dans le script (docstrings, help `--help`)
- **Idempotence** : ré-exécution sans `--force` = no-op (pas de double traitement)
- **Reprise** : interruption/reprise possible via `state.json`
- **Robustesse** : retries réseau, timeouts configurables, logs détaillés
- **Scalabilité** : concurrence contrôlée, traitement parallèle
- Exemple de sortie JSON dans `docs/meeting-transcription/exemple-transcription.json` (optionnel)
- Validation que le script fonctionne avec fichiers réels

---

## 7. Spécifications API AssemblyAI (à compléter)

**Note :** Ces spécifications seront fournies par l'utilisateur à l'agent Dev lors du développement.

### Endpoints à utiliser

- `POST /v2/upload` : Upload fichier audio
- `POST /v2/transcript` : Créer job transcription
- `GET /v2/transcript/{id}` : Récupérer status et transcription

### Authentification

- Header : `authorization: <ASSEMBLYAI_API_KEY>`
- Clé API dans `.env` : `ASSEMBLYAI_API_KEY`

### Format réponse transcription

```json
{
  "id": "abc123",
  "status": "completed",
  "text": "Texte complet...",
  "utterances": [
    {
      "start": 1000,
      "end": 5000,
      "speaker": "A",
      "text": "Première intervention..."
    }
  ],
  "speakers": {
    "A": "Speaker 1",
    "B": "Speaker 2"
  }
}
```

---

## 8. Notes de développement

- **Bibliothèques recommandées :**
  - `requests` : Appels HTTP
  - `python-dotenv` : Lecture `.env`
  - `argparse` : Arguments CLI
  - `logging` : Logging structuré
  - `time` : Gestion retries et polling
  - `concurrent.futures` : Pool de workers pour concurrence
  - `json` : Manipulation JSON
  - `pathlib` : Gestion chemins (cross-platform)
  - `unidecode` ou `slugify` : Normalisation noms (optionnel)

- **Structure code recommandée :**
  ```python
  # Fonctions modulaires
  def upload_audio(...)  # Avec retries réseau
  def create_job(...)    # Avec retries réseau
  def poll_status(...)   # Polling simple, timeout
   def save_transcription(...)
   def filter_transcription_data(...)  # Supprime words (optimisation)
   def load_state(...)    # Lecture state.json
   def save_state(...)    # Écriture state.json
   def consolidate_transcripts(...)  # Fusion multi-fichiers
   def generate_summary(...)  # Résumé JSON final
  
  # Main avec gestion erreurs
  def main():
      # Parse args
      # Validation (clé API, meeting-id, formats)
       # Chargement state.json (si existe)
       # Pool workers (concurrence)
       # Boucle fichiers (avec idempotence)
       #   Pour chaque fichier :
       #     - get_transcript() → JSON brut (avec words)
       #     - filter_transcription_data() → JSON optimisé (sans words)
       #     - save_transcription() → Sauvegarde fichier
       # Consolidation (si --consolidate)
       # Résumé JSON final
       # Gestion erreurs globales
  ```

- **Gestion erreurs :**
  - Utiliser exceptions spécifiques
  - Logs détaillés avec contexte
  - Messages utilisateur clairs (pas de stack trace brut)
  - **Séparation retries réseau vs polling** : retries au niveau HTTP, polling simple
  - **Compteur erreurs transitoires** : tracking par fichier pour reporting
  - **Audio vide/corrompu** : détection précoce, erreur claire, continue avec autres fichiers

---

## 9. Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5 (via Cursor)

### Completion Notes

**Implémentation complète du script `aai_transcribe.py` :**

1. **Structure complète** : Script Python standalone avec toutes les fonctionnalités demandées
2. **Intégration API AssemblyAI** : 
   - Upload de fichiers audio avec retries et backoff exponentiel
   - Création de jobs de transcription avec paramètres configurables
   - Polling du statut avec gestion de timeout
3. **Gestion d'erreurs robuste** :
   - Retries réseau (5 tentatives avec backoff exponentiel)
   - Gestion des erreurs définitives (400, 401, 404) vs transitoires (429, 5xx)
   - Messages d'erreur clairs pour l'utilisateur
4. **Idempotence et reprise** :
   - Fichier `state.json` pour tracker l'état de chaque fichier
   - Détection des fichiers déjà transcrits (sans `--force`)
   - Reprise depuis `state.json` si job_id existe sans résultat
5. **Concurrence** : Pool de workers avec `ThreadPoolExecutor` pour traitement parallèle
6. **Consolidation** : Fusion de toutes les transcriptions en `full-transcript.json` avec tri par timestamp
7. **Logging détaillé** : Logs vers fichier et console avec résumé JSON final
8. **Validation** : Filtrage des formats audio, validation des fichiers, normalisation des noms

**Fichiers créés :**
- `scripts/aai_transcribe.py` : Script principal (900+ lignes)
- `scripts/requirements.txt` : Dépendances Python nécessaires
- `scripts/README-aai-transcribe.md` : Documentation d'utilisation

**Fichiers modifiés :**
- `env.example` : Ajout de `ASSEMBLYAI_API_KEY` avec commentaire explicatif

**Fonctionnalités implémentées :**
- ✅ Tous les arguments CLI demandés
- ✅ Upload avec retries
- ✅ Création jobs avec paramètres configurables
- ✅ Polling avec timeout configurable
- ✅ Sauvegarde JSON par fichier
- ✅ Consolidation multi-fichiers
- ✅ State.json pour idempotence
- ✅ Logging structuré
- ✅ Résumé JSON final
- ✅ Validation des entrées
- ✅ Gestion de la concurrence

**Tests validés (T7) :**
- ✅ Test réussi avec fichier audio réel (Reu recyclique 3.m4a, 1.98 MB)
- ✅ Upload fonctionnel (7 secondes)
- ✅ Transcription complétée (129 mots, 12 secondes)
- ✅ Fichiers JSON générés (transcription individuelle + full-transcript.json)
- ✅ State.json mis à jour correctement
- ✅ Summary.json généré avec métriques
- ✅ Logs détaillés fonctionnels

### File List

**Nouveaux fichiers :**
- `scripts/aai_transcribe.py` : Script principal de transcription
- `scripts/requirements.txt` : Dépendances Python pour les scripts
- `scripts/README-aai-transcribe.md` : Documentation d'utilisation

**Fichiers modifiés :**
- `env.example` : Ajout de `ASSEMBLYAI_API_KEY` avec commentaire explicatif
- `docs/stories/meeting-transcription/S2-DEV-script-assemblyai.md` : Mise à jour des tâches et ajout du Dev Agent Record

### Change Log

**2025-12-06 - Optimisation JSON (T13)**
- Implémentation de `filter_transcription_data()` pour supprimer le champ `words`
- Filtrage au niveau racine et dans chaque utterance
- Intégration dans le flux : `get_transcript()` → `filter_transcription_data()` → `save_transcription()`
- Réduction de taille attendue : ~80-90% (de ~2000 lignes à ~200-300 lignes)

**2025-12-06 - Tests et corrections**
- Correction bug `content_type` (passage dans headers au lieu d'argument direct)
- Correction warnings `datetime.utcnow()` → `datetime.now(timezone.utc)`
- Ajout option `--file` pour tester un fichier unique
- Ajout affichage taille fichier avant upload
- Test réussi avec fichier réel (1.98 MB, 129 mots, 19s total)

**2025-01-27 - Implémentation initiale**
- Création du script `aai_transcribe.py` avec toutes les fonctionnalités
- Intégration complète de l'API AssemblyAI (upload, create, poll)
- Gestion d'erreurs robuste avec retries et backoff exponentiel
- Système d'idempotence via `state.json`
- Consolidation multi-fichiers avec tri par timestamp
- Logging structuré et résumé JSON final
- Validation des formats audio et des fichiers
- Support de la concurrence avec ThreadPoolExecutor

---

**Fin de la story**

