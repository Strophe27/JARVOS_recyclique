"""
Module de logging transactionnel pour le monitoring des bugs de tickets fantômes.

Ce module fournit un logger dédié `transaction_audit` qui écrit dans un fichier rotatif
avec format JSON structuré pour faciliter l'analyse des événements transactionnels.
"""
import logging
import json
import queue
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional
from logging.handlers import RotatingFileHandler, QueueHandler, QueueListener

# Configuration du logger
# Utiliser un chemin absolu basé sur le répertoire de travail courant
# En Docker, WORKDIR est /app, donc logs sera dans /app/logs
# En développement local, logs sera dans le répertoire racine du projet
import os
BASE_DIR = Path(os.getcwd())
TRANSACTION_LOG_DIR = BASE_DIR / "logs"
TRANSACTION_LOG_FILE = TRANSACTION_LOG_DIR / "transactions.log"
MAX_BYTES = 10 * 1024 * 1024  # 10MB
BACKUP_COUNT = 5  # 5 fichiers de backup

# Queue pour logging asynchrone
_log_queue: Optional[queue.Queue] = None
_queue_listener: Optional[QueueListener] = None


class JSONFormatter(logging.Formatter):
    """Formatter personnalisé pour produire des logs au format JSON."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Formate un log record en JSON."""
        # record.msg peut être:
        # 1. Une string JSON (quand on passe json.dumps())
        # 2. Un dict (quand on passe directement un dict - Python le convertit en string avec repr())
        # 3. Une string Python représentant un dict (avec quotes simples)
        
        log_data = None
        
        if isinstance(record.msg, str):
            # Essayer de parser comme JSON d'abord
            try:
                log_data = json.loads(record.msg)
            except json.JSONDecodeError:
                # Si ce n'est pas du JSON valide, essayer d'évaluer comme Python dict
                try:
                    import ast
                    parsed = ast.literal_eval(record.msg)
                    if isinstance(parsed, dict):
                        log_data = parsed
                    else:
                        log_data = {"message": record.msg}
                except (ValueError, SyntaxError):
                    # Fallback: créer un dict avec le message
                    log_data = {"message": record.msg}
        elif isinstance(record.msg, dict):
            # Si c'est un dict (peu probable car Python le convertit en string)
            log_data = record.msg.copy()
        else:
            # Autre type: convertir en string
            log_data = {"message": str(record.msg)}
        
        # S'assurer que log_data est un dict
        if not isinstance(log_data, dict):
            log_data = {"message": str(log_data)}
        
        # Le timestamp et event sont déjà dans log_data depuis log_transaction_event()
        # On ne les ajoute que s'ils sont absents (pour compatibilité)
        if "timestamp" not in log_data:
            log_data["timestamp"] = datetime.now(timezone.utc).isoformat() + "Z"
        
        if "level" not in log_data:
            log_data["level"] = record.levelname
        
        # Retourner le JSON sur une seule ligne (sans indentation)
        return json.dumps(log_data, ensure_ascii=False, separators=(',', ':'))


def _setup_transaction_logger() -> logging.Logger:
    """Configure le logger transaction_audit avec rotation et format JSON."""
    standard_logger = logging.getLogger(__name__)
    
    try:
        # Créer le répertoire logs s'il n'existe pas
        TRANSACTION_LOG_DIR.mkdir(parents=True, exist_ok=True)
        standard_logger.info(f"Transaction log directory: {TRANSACTION_LOG_DIR.absolute()}")
        
        # Créer le handler rotatif
        file_handler = RotatingFileHandler(
            str(TRANSACTION_LOG_FILE),
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setFormatter(JSONFormatter())
        file_handler.setLevel(logging.INFO)
        
        # Créer la queue et le queue handler pour logging asynchrone
        global _log_queue, _queue_listener
        _log_queue = queue.Queue(-1)  # Queue illimitée
        queue_handler = QueueHandler(_log_queue)
        
        # Créer le queue listener pour écrire dans le fichier depuis un thread séparé
        _queue_listener = QueueListener(_log_queue, file_handler)
        _queue_listener.start()
        
        # Créer et configurer le logger
        logger = logging.getLogger('transaction_audit')
        logger.setLevel(logging.INFO)
        logger.addHandler(queue_handler)
        # Empêcher la propagation vers le logger root
        logger.propagate = False
        
        standard_logger.info(f"Transaction logger initialized. Log file: {TRANSACTION_LOG_FILE.absolute()}")
        return logger
    except Exception as e:
        standard_logger.error(f"Failed to setup transaction logger: {e}", exc_info=True)
        # Retourner un logger null qui ne fait rien plutôt que de planter
        null_logger = logging.getLogger('transaction_audit_null')
        null_logger.addHandler(logging.NullHandler())
        return null_logger


# Initialiser le logger au chargement du module
_transaction_logger: Optional[logging.Logger] = None


def get_transaction_logger() -> logging.Logger:
    """Récupère le logger transaction_audit (initialisé si nécessaire)."""
    global _transaction_logger
    if _transaction_logger is None:
        _transaction_logger = _setup_transaction_logger()
    return _transaction_logger


def log_transaction_event(event_type: str, data: Dict[str, Any]) -> None:
    """
    Helper function pour logger un événement transactionnel.
    
    Args:
        event_type: Type d'événement (SESSION_OPENED, TICKET_OPENED, etc.)
        data: Données de l'événement (sera formaté en JSON)
    
    Cette fonction est best-effort: les erreurs de logging n'interrompent pas les opérations.
    """
    try:
        logger = get_transaction_logger()
        
        # Construire le payload JSON
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "event": event_type,
            **data
        }
        
        # IMPORTANT: logger.info() convertit les dicts en string Python (avec repr())
        # Il faut sérialiser en JSON string pour que le JSONFormatter puisse le parser correctement
        json_string = json.dumps(log_data, ensure_ascii=False, separators=(',', ':'))
        logger.info(json_string)
    except Exception as e:
        # Best-effort: ne pas interrompre les opérations si le logging échoue
        # Mais logger l'erreur dans le logger standard pour diagnostic
        standard_logger = logging.getLogger(__name__)
        standard_logger.error(
            f"Erreur lors du logging transactionnel (event={event_type}): {e}",
            exc_info=True
        )


def shutdown_transaction_logger() -> None:
    """Arrête proprement le queue listener (utile pour les tests)."""
    global _queue_listener
    if _queue_listener is not None:
        _queue_listener.stop()
        _queue_listener = None

