#!/usr/bin/env python3
"""
Script pour transcrire des fichiers audio via l'API AssemblyAI.

Usage:
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
"""

import argparse
import json
import logging
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    print("❌ Erreur: Le module 'requests' n'est pas installé.")
    print("   Installation: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ Erreur: Le module 'python-dotenv' n'est pas installé.")
    print("   Installation: pip install python-dotenv")
    sys.exit(1)

try:
    from unidecode import unidecode
except ImportError:
    print("⚠️  Avertissement: Le module 'unidecode' n'est pas installé.")
    print("   Installation: pip install unidecode")
    print("   Le script fonctionnera mais la normalisation des noms sera limitée.")
    # Fallback: fonction simple sans unidecode
    def unidecode(text):
        return text.encode('ascii', 'ignore').decode('ascii')

# Charger les variables d'environnement
load_dotenv()

# Configuration
ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com"
ASSEMBLYAI_EU_BASE_URL = "https://api.eu.assemblyai.com"

# Formats audio supportés
SUPPORTED_AUDIO_FORMATS = {".mp3", ".wav", ".m4a", ".flac", ".ogg"}

# Status possibles pour state.json
STATUS_PENDING = "pending"
STATUS_UPLOADED = "uploaded"
STATUS_QUEUED = "queued"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_ERROR = "error"


class AssemblyAIClient:
    """Client pour interagir avec l'API AssemblyAI."""

    def __init__(self, api_key: str, use_eu: bool = False):
        self.api_key = api_key
        self.base_url = ASSEMBLYAI_EU_BASE_URL if use_eu else ASSEMBLYAI_BASE_URL
        self.headers = {"authorization": api_key}

    def upload_audio_file(self, file_path: Path) -> str:
        """
        Upload un fichier audio vers AssemblyAI.
        
        Args:
            file_path: Chemin vers le fichier audio
            
        Returns:
            upload_url: URL temporaire du fichier uploadé
            
        Raises:
            requests.RequestException: En cas d'erreur HTTP
        """
        url = urljoin(self.base_url, "/v2/upload")
        
        with open(file_path, "rb") as f:
            # Utiliser headers pour content-type au lieu d'un argument direct
            headers = self.headers.copy()
            headers["Content-Type"] = "application/octet-stream"
            
            response = self._request_with_retry(
                "POST",
                url,
                headers=headers,
                data=f
            )
        
        if response.status_code != 200:
            raise requests.RequestException(
                f"Upload failed: {response.status_code} - {response.text}"
            )
        
        return response.json()["upload_url"]

    def create_transcription_job(
        self,
        upload_url: str,
        language_code: str = "fr",
        speaker_labels: bool = True,
        iab_categories: bool = True
    ) -> str:
        """
        Crée un job de transcription.
        
        Args:
            upload_url: URL du fichier uploadé
            language_code: Code langue (fr, auto, etc.)
            speaker_labels: Activer la diarisation
            iab_categories: Activer les topics IAB
            
        Returns:
            job_id: ID du job de transcription
            
        Raises:
            requests.RequestException: En cas d'erreur HTTP
        """
        url = urljoin(self.base_url, "/v2/transcript")
        
        payload = {
            "audio_url": upload_url,
            "language_code": language_code,
            "speaker_labels": speaker_labels,
            "iab_categories": iab_categories
        }
        
        response = self._request_with_retry(
            "POST",
            url,
            headers={**self.headers, "content-type": "application/json"},
            json=payload
        )
        
        if response.status_code != 200:
            raise requests.RequestException(
                f"Create job failed: {response.status_code} - {response.text}"
            )
        
        return response.json()["id"]

    def get_transcript(self, job_id: str) -> Dict:
        """
        Récupère le statut et la transcription d'un job.
        
        Args:
            job_id: ID du job de transcription
            
        Returns:
            transcript: Dictionnaire avec status, text, utterances, etc.
            
        Raises:
            requests.RequestException: En cas d'erreur HTTP
        """
        url = urljoin(self.base_url, f"/v2/transcript/{job_id}")
        
        response = self._request_with_retry(
            "GET",
            url,
            headers=self.headers
        )
        
        if response.status_code != 200:
            raise requests.RequestException(
                f"Get transcript failed: {response.status_code} - {response.text}"
            )
        
        return response.json()

    def _request_with_retry(
        self,
        method: str,
        url: str,
        max_retries: int = 5,
        backoff_base: float = 1.0,
        **kwargs
    ) -> requests.Response:
        """
        Effectue une requête HTTP avec retries et backoff exponentiel.
        
        Args:
            method: Méthode HTTP (GET, POST, etc.)
            url: URL de la requête
            max_retries: Nombre maximum de tentatives
            backoff_base: Base pour le backoff exponentiel (1s, 2s, 4s, 8s, 16s)
            **kwargs: Arguments supplémentaires pour requests
            
        Returns:
            response: Réponse HTTP
            
        Raises:
            requests.RequestException: En cas d'erreur définitive ou après épuisement des retries
        """
        retries = 0
        last_exception = None
        
        while retries < max_retries:
            try:
                response = requests.request(method, url, **kwargs, timeout=30)
                
                # Succès
                if response.status_code < 400:
                    return response
                
                # Erreurs définitives (400, 401, 404) - pas de retry
                if response.status_code in (400, 401, 404):
                    return response
                
                # Erreurs transitoires (429, 5xx) - retry avec backoff
                # 502 Bad Gateway est aussi une erreur transitoire (serveur intermédiaire)
                if response.status_code in (429, 500, 502, 503, 504):
                    retries += 1
                    if retries < max_retries:
                        wait_time = backoff_base * (2 ** (retries - 1))
                        logging.debug(f"Erreur transitoire {response.status_code}, retry {retries}/{max_retries} dans {wait_time:.1f}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        return response
                
                # Autres erreurs - retourner directement
                return response
                
            except (requests.ConnectionError, requests.Timeout) as e:
                last_exception = e
                retries += 1
                if retries < max_retries:
                    wait_time = backoff_base * (2 ** (retries - 1))
                    time.sleep(wait_time)
                else:
                    raise requests.RequestException(
                        f"Request failed after {max_retries} retries: {str(e)}"
                    ) from e
        
        if last_exception:
            raise last_exception
        
        raise requests.RequestException(f"Request failed after {max_retries} retries")


def slugify_filename(filename: str) -> str:
    """
    Normalise un nom de fichier (supprime accents, espaces, etc.).
    
    Args:
        filename: Nom de fichier original
        
    Returns:
        Nom de fichier normalisé
    """
    # Extraire le nom et l'extension
    path = Path(filename)
    stem = path.stem
    suffix = path.suffix
    
    # Normaliser le nom (supprimer accents, remplacer espaces par underscores)
    normalized = unidecode(stem).lower()
    normalized = normalized.replace(" ", "_")
    normalized = "".join(c for c in normalized if c.isalnum() or c in ("_", "-"))
    
    return f"{normalized}{suffix}"


def is_audio_file(file_path: Path) -> bool:
    """
    Vérifie si un fichier est un fichier audio supporté.
    
    Args:
        file_path: Chemin vers le fichier
        
    Returns:
        True si le fichier est supporté, False sinon
    """
    return file_path.suffix.lower() in SUPPORTED_AUDIO_FORMATS


def validate_audio_file(file_path: Path) -> Tuple[bool, Optional[str]]:
    """
    Valide qu'un fichier audio est valide (non vide, non corrompu).
    
    Args:
        file_path: Chemin vers le fichier
        
    Returns:
        (is_valid, error_message): Tuple avec validité et message d'erreur éventuel
    """
    if not file_path.exists():
        return False, f"Fichier introuvable: {file_path}"
    
    if not file_path.is_file():
        return False, f"N'est pas un fichier: {file_path}"
    
    # Vérifier que le fichier n'est pas vide
    if file_path.stat().st_size == 0:
        return False, f"Fichier vide: {file_path}"
    
    # Vérifier taille minimale (160ms d'audio minimum selon AssemblyAI)
    # On considère qu'un fichier < 1KB est probablement corrompu
    if file_path.stat().st_size < 1024:
        return False, f"Fichier trop petit (probablement corrompu): {file_path}"
    
    return True, None


def load_state(meeting_dir: Path) -> Dict:
    """
    Charge le fichier state.json s'il existe.
    
    Args:
        meeting_dir: Dossier de la réunion
        
    Returns:
        state: Dictionnaire avec l'état des fichiers
    """
    state_file = meeting_dir / "state.json"
    if state_file.exists():
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logging.warning(f"Erreur lors du chargement de state.json: {e}")
            return {"files": []}
    return {"files": []}


def save_state(meeting_dir: Path, state: Dict):
    """
    Sauvegarde le fichier state.json.
    
    Args:
        meeting_dir: Dossier de la réunion
        state: Dictionnaire avec l'état des fichiers
    """
    state_file = meeting_dir / "state.json"
    meeting_dir.mkdir(parents=True, exist_ok=True)
    
    with open(state_file, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def update_file_state(
    state: Dict,
    filename: str,
    status: str,
    upload_url: Optional[str] = None,
    job_id: Optional[str] = None,
    started_at: Optional[str] = None,
    ended_at: Optional[str] = None,
    retries: int = 0
):
    """
    Met à jour l'état d'un fichier dans state.json.
    
    Args:
        state: Dictionnaire d'état
        filename: Nom du fichier
        status: Nouveau statut
        upload_url: URL d'upload (optionnel)
        job_id: ID du job (optionnel)
        started_at: Date de début (optionnel)
        ended_at: Date de fin (optionnel)
        retries: Nombre de retries (optionnel)
    """
    # Trouver ou créer l'entrée pour ce fichier
    file_entry = None
    for entry in state.get("files", []):
        if entry.get("filename") == filename:
            file_entry = entry
            break
    
    if file_entry is None:
        file_entry = {"filename": filename}
        if "files" not in state:
            state["files"] = []
        state["files"].append(file_entry)
    
    # Mettre à jour les champs
    file_entry["status"] = status
    if upload_url:
        file_entry["upload_url"] = upload_url
    if job_id:
        file_entry["job_id"] = job_id
    if started_at:
        file_entry["started_at"] = started_at
    if ended_at:
        file_entry["ended_at"] = ended_at
    file_entry["retries"] = retries


def find_file_state(state: Dict, filename: str) -> Optional[Dict]:
    """
    Trouve l'état d'un fichier dans state.json.
    
    Args:
        state: Dictionnaire d'état
        filename: Nom du fichier
        
    Returns:
        file_entry: Entrée du fichier ou None
    """
    for entry in state.get("files", []):
        if entry.get("filename") == filename:
            return entry
    return None


def get_existing_transcriptions(transcriptions_dir: Path) -> set:
    """
    Liste les fichiers de transcription existants dans le dossier.
    
    Args:
        transcriptions_dir: Dossier des transcriptions
        
    Returns:
        set: Ensemble des noms de fichiers JSON (sans extension)
    """
    if not transcriptions_dir.exists():
        return set()
    
    existing = set()
    for json_file in transcriptions_dir.glob("*.json"):
        # Exclure full-transcript.json
        if json_file.name != "full-transcript.json":
            existing.add(json_file.stem)
    
    return existing


def get_existing_transcriptions(transcriptions_dir: Path) -> set:
    """
    Liste les fichiers de transcription existants dans le dossier.
    
    Args:
        transcriptions_dir: Dossier des transcriptions
        
    Returns:
        set: Ensemble des noms de fichiers JSON (sans extension)
    """
    if not transcriptions_dir.exists():
        return set()
    
    existing = set()
    for json_file in transcriptions_dir.glob("*.json"):
        # Exclure full-transcript.json
        if json_file.name != "full-transcript.json":
            existing.add(json_file.stem)
    
    return existing


def poll_transcription_status(
    client: AssemblyAIClient,
    job_id: str,
    timeout_seconds: int = 7200,
    poll_interval: int = 5
) -> Dict:
    """
    Poll le statut d'une transcription jusqu'à completion ou timeout.
    
    Args:
        client: Client AssemblyAI
        job_id: ID du job
        timeout_seconds: Timeout maximum en secondes
        poll_interval: Intervalle entre les polls en secondes
        
    Returns:
        transcript: Dictionnaire avec la transcription complète
        
    Raises:
        TimeoutError: Si le timeout est dépassé
        RuntimeError: Si la transcription échoue
    """
    start_time = time.time()
    
    while True:
        # Vérifier le timeout
        elapsed = time.time() - start_time
        if elapsed > timeout_seconds:
            raise TimeoutError(
                f"Timeout après {timeout_seconds}s pour le job {job_id}"
            )
        
        # Récupérer le statut
        transcript = client.get_transcript(job_id)
        status = transcript.get("status")
        
        if status == STATUS_COMPLETED:
            return transcript
        elif status == STATUS_ERROR:
            error_msg = transcript.get("error", "Erreur inconnue")
            raise RuntimeError(f"Transcription échouée: {error_msg}")
        elif status in (STATUS_QUEUED, STATUS_PROCESSING):
            # Attendre avant le prochain poll
            time.sleep(poll_interval)
        else:
            # Statut inattendu
            logging.warning(f"Statut inattendu: {status} pour job {job_id}")
            time.sleep(poll_interval)


def filter_transcription_data(transcription_json: Dict) -> Dict:
    """
    Supprime les données trop granulaires (words) et construit le champ speakers.
    
    L'API AssemblyAI retourne un champ `words` (granularité mot-par-mot) qui
    n'est pas nécessaire pour notre workflow. Cette fonction filtre ces données
    pour réduire la taille des fichiers JSON de ~80-90%.
    
    L'API ne retourne pas de champ `speakers` (mapping), donc cette fonction
    construit ce mapping en extrayant les identifiants uniques depuis les utterances.
    
    Args:
        transcription_json: JSON brut de l'API AssemblyAI (avec `words`)
        
    Returns:
        JSON filtré sans les champs `words`, avec champ `speakers` construit
    """
    filtered = transcription_json.copy()
    
    # Supprimer words au niveau racine
    if 'words' in filtered:
        del filtered['words']
    
    # Supprimer words dans chaque utterance et construire le mapping speakers
    speakers_map = {}
    if 'utterances' in filtered and filtered['utterances']:
        filtered_utterances = []
        for utterance in filtered['utterances']:
            # Supprimer words de l'utterance
            filtered_utterance = {k: v for k, v in utterance.items() if k != 'words'}
            filtered_utterances.append(filtered_utterance)
            
            # Extraire l'identifiant du speaker
            speaker_id = filtered_utterance.get('speaker')
            if speaker_id and speaker_id not in speakers_map:
                # Construire le nom du speaker (ex: "Speaker A", "Speaker B")
                speakers_map[speaker_id] = f"Speaker {speaker_id}"
        
        filtered['utterances'] = filtered_utterances
    
    # Ajouter le champ speakers construit
    if speakers_map:
        filtered['speakers'] = speakers_map
    
    return filtered


def save_transcription(transcript: Dict, output_path: Path):
    """
    Sauvegarde une transcription dans un fichier JSON.
    
    Args:
        transcript: Dictionnaire avec la transcription (déjà filtré)
        output_path: Chemin de sortie
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(transcript, f, indent=2, ensure_ascii=False)


def consolidate_transcripts(
    meeting_dir: Path,
    transcriptions: List[Dict],
    filenames: List[str]
) -> Dict:
    """
    Consolide plusieurs transcriptions en une seule.
    
    Args:
        meeting_dir: Dossier de la réunion
        transcriptions: Liste des transcriptions (une par fichier)
        filenames: Liste des noms de fichiers correspondants
        
    Returns:
        consolidated: Transcription consolidée avec toutes les utterances et speakers
    """
    all_utterances = []
    speakers_map = {}
    
    for idx, (transcript, filename) in enumerate(zip(transcriptions, filenames)):
        utterances = transcript.get("utterances", [])
        
        for utterance in utterances:
            # Ajouter les métadonnées de source
            utterance_with_source = utterance.copy()
            utterance_with_source["source_file"] = filename
            utterance_with_source["file_index"] = idx
            all_utterances.append(utterance_with_source)
            
            # Extraire les speakers uniques
            speaker_id = utterance.get("speaker")
            if speaker_id and speaker_id not in speakers_map:
                speakers_map[speaker_id] = f"Speaker {speaker_id}"
    
    # Trier par timestamp start (ms)
    all_utterances.sort(key=lambda u: u.get("start", 0))
    
    consolidated = {
        "meeting_id": meeting_dir.name,
        "utterances": all_utterances
    }
    
    # Ajouter le champ speakers si des speakers ont été détectés
    if speakers_map:
        consolidated["speakers"] = speakers_map
    
    return consolidated


def process_audio_file(
    file_path: Path,
    meeting_dir: Path,
    client: AssemblyAIClient,
    state: Dict,
    language_code: str,
    speaker_labels: bool,
    iab_categories: bool,
    timeout_seconds: int,
    force: bool,
    logger: logging.Logger
) -> Tuple[bool, Optional[str], int]:
    """
    Traite un fichier audio (upload, transcription, sauvegarde).
    
    Args:
        file_path: Chemin vers le fichier audio
        meeting_dir: Dossier de la réunion
        client: Client AssemblyAI
        state: Dictionnaire d'état
        language_code: Code langue
        speaker_labels: Activer diarisation
        iab_categories: Activer topics IAB
        timeout_seconds: Timeout pour la transcription
        force: Forcer ré-exécution même si déjà transcrit
        logger: Logger pour les logs
        
    Returns:
        (success, error_message, retries): Tuple avec résultat
    """
    filename = file_path.name
    normalized_filename = slugify_filename(filename)
    transcriptions_dir = meeting_dir / "transcriptions"
    output_path = transcriptions_dir / f"{Path(normalized_filename).stem}.json"
    
    # Vérifier si le fichier JSON existe vraiment dans transcriptions/
    json_file_exists = output_path.exists()
    
    # Si le fichier n'existe pas avec le nom normalisé, vérifier s'il existe avec un nom similaire
    if not json_file_exists and transcriptions_dir.exists():
        existing_transcriptions = get_existing_transcriptions(transcriptions_dir)
        expected_stem = Path(normalized_filename).stem
        if expected_stem in existing_transcriptions:
            # Le fichier existe mais avec un nom légèrement différent → considérer comme existant
            logger.debug(f"🔍 Fichier JSON trouvé avec nom similaire dans transcriptions/")
            json_file_exists = True
            # Trouver le fichier réel
            for json_file in transcriptions_dir.glob("*.json"):
                if json_file.stem == expected_stem:
                    output_path = json_file
                    break
    
    # Log de debug pour vérifier le nom de fichier recherché
    if not json_file_exists:
        logger.debug(f"🔍 Fichier JSON recherché: {output_path.name} (existe: {json_file_exists})")
    
    # Vérifier idempotence (sauf si --force)
    if not force and json_file_exists:
        logger.info(f"⏭️  Fichier déjà transcrit (fichier JSON présent: {output_path.name}), ignoré: {filename}")
        return True, None, 0
    
    # Vérifier si on peut reprendre depuis state.json (sauf si --force)
    file_state = find_file_state(state, filename)
    job_id = None
    upload_url = None
    
    if file_state and not force:
        job_id = file_state.get("job_id")
        upload_url = file_state.get("upload_url")
        status = file_state.get("status")
        
        # Si on a un job_id mais pas de résultat, reprendre au polling
        if job_id and status not in (STATUS_COMPLETED, STATUS_ERROR):
            logger.info(f"🔄 Reprise du job existant: {job_id} pour {filename}")
        elif status == STATUS_ERROR:
            # Fichier en erreur → retraiter automatiquement
            logger.info(f"🔄 Fichier précédemment en erreur, retraitement de {filename}...")
            # Réinitialiser l'état pour forcer le retraitement complet
            file_state = None
            job_id = None
            upload_url = None
        elif status == STATUS_COMPLETED:
            # Vérifier que le fichier JSON existe vraiment dans transcriptions/
            if json_file_exists:
                logger.info(f"⏭️  Fichier déjà transcrit (state.json + fichier JSON présent), ignoré: {filename}")
                return True, None, file_state.get("retries", 0)
            else:
                # State.json dit "completed" mais le fichier JSON n'existe pas → incohérence, retraiter
                logger.warning(f"⚠️  Incohérence détectée: state.json indique 'completed' mais le fichier JSON est absent dans transcriptions/. Retraitement de {filename}...")
                # Réinitialiser l'état pour forcer le retraitement
                file_state = None
                job_id = None
                upload_url = None
    elif file_state and force:
        # Avec --force, on ignore state.json et on recommence depuis le début
        logger.info(f"🔄 Mode --force: ré-exécution complète de {filename} (ignorant state.json)")
        # Réinitialiser pour forcer le retraitement complet
        file_state = None
        job_id = None
        upload_url = None
    
    started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    retries = 0
    
    try:
        # Upload (si pas déjà fait)
        if not upload_url:
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            logger.info(f"📤 Upload de {filename} ({file_size_mb:.2f} MB)...")
            update_file_state(state, filename, STATUS_PENDING, started_at=started_at)
            save_state(meeting_dir, state)
            
            upload_url = client.upload_audio_file(file_path)
            update_file_state(
                state, filename, STATUS_UPLOADED,
                upload_url=upload_url, started_at=started_at
            )
            save_state(meeting_dir, state)
            logger.info(f"✅ Upload réussi: {upload_url[:50]}...")
        
        # Créer le job (si pas déjà fait)
        if not job_id:
            logger.info(f"🎬 Création du job de transcription pour {filename}...")
            job_id = client.create_transcription_job(
                upload_url,
                language_code=language_code,
                speaker_labels=speaker_labels,
                iab_categories=iab_categories
            )
            update_file_state(
                state, filename, STATUS_QUEUED,
                upload_url=upload_url, job_id=job_id, started_at=started_at
            )
            save_state(meeting_dir, state)
            logger.info(f"✅ Job créé: {job_id}")
        
        # Polling jusqu'à completion
        logger.info(f"⏳ Polling du statut pour {filename} (job: {job_id})...")
        transcript = poll_transcription_status(
            client, job_id, timeout_seconds=timeout_seconds
        )
        
        # Filtrer les données trop granulaires (words) pour optimiser la taille
        logger.debug(f"🔍 Filtrage des données granulaires (words) pour {filename}...")
        transcript = filter_transcription_data(transcript)
        
        # Sauvegarder la transcription
        logger.info(f"💾 Sauvegarde de la transcription pour {filename}...")
        save_transcription(transcript, output_path)
        
        # Mettre à jour l'état
        ended_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        update_file_state(
            state, filename, STATUS_COMPLETED,
            upload_url=upload_url, job_id=job_id,
            started_at=started_at, ended_at=ended_at, retries=retries
        )
        save_state(meeting_dir, state)
        
        # Statistiques
        word_count = len(transcript.get("text", "").split()) if transcript.get("text") else 0
        speaker_count = len(transcript.get("speakers", {}))
        logger.info(
            f"✅ Transcription complète: {word_count} mots, {speaker_count} speakers"
        )
        
        return True, None, retries
        
    except (requests.RequestException, TimeoutError, RuntimeError) as e:
        error_msg = str(e)
        logger.error(f"❌ Erreur lors du traitement de {filename}: {error_msg}")
        
        # Mettre à jour l'état avec l'erreur
        ended_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        update_file_state(
            state, filename, STATUS_ERROR,
            upload_url=upload_url, job_id=job_id,
            started_at=started_at, ended_at=ended_at, retries=retries
        )
        save_state(meeting_dir, state)
        
        return False, error_msg, retries


def setup_logging(meeting_dir: Path, verbose: bool = False) -> logging.Logger:
    """
    Configure le logging vers fichier et console.
    
    Args:
        meeting_dir: Dossier de la réunion
        verbose: Mode verbose
        
    Returns:
        logger: Logger configuré
    """
    logs_dir = meeting_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    # Nom de fichier avec timestamp
    timestamp = datetime.now().strftime("%Y%m%d")
    log_file = logs_dir / f"run-{timestamp}.log"
    
    # Niveau de log
    level = logging.DEBUG if verbose else logging.INFO
    
    # Configuration
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)


def generate_summary(
    meeting_dir: Path,
    total_files: int,
    completed: int,
    failed: int,
    skipped: int,
    duration_seconds: float
) -> Dict:
    """
    Génère un résumé JSON final.
    
    Args:
        meeting_dir: Dossier de la réunion
        total_files: Nombre total de fichiers
        completed: Nombre de fichiers complétés
        failed: Nombre de fichiers échoués
        skipped: Nombre de fichiers ignorés
        duration_seconds: Durée totale en secondes
        
    Returns:
        summary: Dictionnaire avec le résumé
    """
    summary = {
        "meeting_id": meeting_dir.name,
        "files_total": total_files,
        "completed": completed,
        "failed": failed,
        "skipped": skipped,
        "duration_seconds": int(duration_seconds),
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }
    
    # Sauvegarder dans un fichier séparé
    logs_dir = meeting_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    summary_file = logs_dir / "summary.json"
    
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    return summary


def main():
    """Fonction principale."""
    parser = argparse.ArgumentParser(
        description="Transcrire des fichiers audio via AssemblyAI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  # Transcription basique
  python scripts/aai_transcribe.py --meeting-id "2025-01-27-reunion-x"
  
  # Avec options avancées
  python scripts/aai_transcribe.py \\
    --meeting-id "2025-01-27-reunion-x" \\
    --concurrency 2 \\
    --language fr \\
    --diarization true \\
    --iab true \\
    --timeout-seconds 7200 \\
    --consolidate true \\
    --force \\
    --verbose
        """
    )
    
    parser.add_argument(
        "--meeting-id",
        required=True,
        help="ID de la réunion (format: YYYY-MM-DD-nom-reunion)"
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=2,
        help="Nombre de fichiers traités en parallèle (défaut: 2)"
    )
    parser.add_argument(
        "--language",
        default="fr",
        choices=["fr", "auto"],
        help="Code langue pour transcription (défaut: fr)"
    )
    parser.add_argument(
        "--diarization",
        type=lambda x: x.lower() == "true",
        default=True,
        help="Activer identification speakers (défaut: true)"
    )
    parser.add_argument(
        "--iab",
        type=lambda x: x.lower() == "true",
        default=True,
        help="Activer topics IAB (défaut: true)"
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=7200,
        help="Timeout global par fichier en secondes (défaut: 7200 = 2h)"
    )
    parser.add_argument(
        "--consolidate",
        type=lambda x: x.lower() == "true",
        default=True,
        help="Générer full-transcript.json (défaut: true)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Forcer ré-exécution même si transcription existe déjà"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Logs détaillés"
    )
    parser.add_argument(
        "--eu",
        action="store_true",
        help="Utiliser les serveurs EU (api.eu.assemblyai.com)"
    )
    parser.add_argument(
        "--file",
        help="Traiter uniquement ce fichier (nom exact, ex: 'Reu recyclique 3.m4a')"
    )
    
    args = parser.parse_args()
    
    # Vérifier la clé API
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        print("❌ Erreur: ASSEMBLYAI_API_KEY non trouvée dans .env")
        print("   Veuillez ajouter ASSEMBLYAI_API_KEY=your_key dans votre fichier .env")
        sys.exit(1)
    
    # Vérifier le meeting-id et le dossier audio
    meeting_dir = Path("meetings") / args.meeting_id
    audio_dir = meeting_dir / "audio"
    
    if not audio_dir.exists():
        print(f"❌ Erreur: Dossier audio introuvable: {audio_dir}")
        sys.exit(1)
    
    # Configuration logging
    logger = setup_logging(meeting_dir, verbose=args.verbose)
    logger.info(f"🚀 Démarrage transcription pour meeting: {args.meeting_id}")
    logger.info(f"📁 Dossier audio: {audio_dir}")
    
    # Charger l'état existant
    state = load_state(meeting_dir)
    
    # Lister les fichiers audio
    audio_files = [
        f for f in audio_dir.iterdir()
        if f.is_file() and is_audio_file(f)
    ]
    
    # Fichiers ignorés (non audio)
    ignored_files = [
        f for f in audio_dir.iterdir()
        if f.is_file() and not is_audio_file(f)
    ]
    
    if ignored_files:
        logger.warning(f"⚠️  Fichiers ignorés (format non supporté):")
        for f in ignored_files:
            logger.warning(f"   - {f.name} (extension: {f.suffix})")
    
    if not audio_files:
        logger.error("❌ Aucun fichier audio trouvé dans le dossier audio")
        sys.exit(1)
    
    logger.info(f"📊 {len(audio_files)} fichier(s) audio trouvé(s)")
    
    # Filtrer par fichier spécifique si demandé
    if args.file:
        audio_files = [f for f in audio_files if f.name == args.file]
        if not audio_files:
            logger.error(f"❌ Fichier spécifié introuvable: {args.file}")
            logger.info(f"   Fichiers disponibles: {[f.name for f in Path(audio_dir).iterdir() if f.is_file() and is_audio_file(f)]}")
            sys.exit(1)
        logger.info(f"🎯 Mode fichier unique: {args.file}")
    
    # Valider les fichiers
    valid_files = []
    for file_path in audio_files:
        is_valid, error_msg = validate_audio_file(file_path)
        if is_valid:
            valid_files.append(file_path)
        else:
            logger.error(f"❌ {error_msg}")
    
    if not valid_files:
        logger.error("❌ Aucun fichier audio valide")
        sys.exit(1)
    
    # Client AssemblyAI
    client = AssemblyAIClient(api_key, use_eu=args.eu)
    
    # Traitement des fichiers (avec concurrence)
    start_time = time.time()
    completed = 0
    failed = 0
    skipped = 0
    total_retries = 0
    
    transcriptions = []
    filenames = []
    
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        # Soumettre les tâches
        future_to_file = {
            executor.submit(
                process_audio_file,
                file_path,
                meeting_dir,
                client,
                state,
                args.language,
                args.diarization,
                args.iab,
                args.timeout_seconds,
                args.force,
                logger
            ): file_path
            for file_path in valid_files
        }
        
        # Traiter les résultats
        for future in as_completed(future_to_file):
            file_path = future_to_file[future]
            try:
                success, error_msg, retries = future.result()
                total_retries += retries
                
                if success:
                    completed += 1
                    # Charger la transcription pour consolidation
                    normalized_filename = slugify_filename(file_path.name)
                    transcript_path = (
                        meeting_dir / "transcriptions" /
                        f"{Path(normalized_filename).stem}.json"
                    )
                    if transcript_path.exists():
                        with open(transcript_path, "r", encoding="utf-8") as f:
                            transcriptions.append(json.load(f))
                            filenames.append(file_path.name)
                else:
                    failed += 1
                    logger.error(f"❌ Échec: {file_path.name} - {error_msg}")
                    
            except Exception as e:
                failed += 1
                logger.error(f"❌ Exception lors du traitement de {file_path.name}: {e}")
    
    # Consolidation (si demandée)
    if args.consolidate and transcriptions:
        logger.info("🔗 Consolidation des transcriptions...")
        consolidated = consolidate_transcripts(meeting_dir, transcriptions, filenames)
        consolidated_path = meeting_dir / "transcriptions" / "full-transcript.json"
        save_transcription(consolidated, consolidated_path)
        logger.info(f"✅ Transcription consolidée sauvegardée: {consolidated_path}")
    
    # Résumé final
    duration = time.time() - start_time
    skipped = len(valid_files) - completed - failed
    
    summary = generate_summary(
        meeting_dir,
        len(valid_files),
        completed,
        failed,
        skipped,
        duration
    )
    
    # Afficher le résumé
    logger.info("=" * 60)
    logger.info("📊 RÉSUMÉ FINAL")
    logger.info("=" * 60)
    logger.info(f"Fichiers totaux: {summary['files_total']}")
    logger.info(f"✅ Complétés: {summary['completed']}")
    logger.info(f"❌ Échoués: {summary['failed']}")
    logger.info(f"⏭️  Ignorés: {summary['skipped']}")
    logger.info(f"⏱️  Durée: {summary['duration_seconds']}s")
    logger.info(f"🔄 Retries totaux: {total_retries}")
    
    # Imprimer le résumé JSON en dernière ligne (pour parsing automatique)
    summary_json = json.dumps(summary, separators=(",", ":"))
    logger.info(f"JSON:{summary_json}")
    
    # Code de sortie
    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()



