"""
Database import endpoint for SuperAdmins.
Allows secure import of PostgreSQL dump files (.dump format).
Uses pg_restore for reliable binary dump restoration.
"""

import logging
import os
import shutil
import subprocess
import tempfile
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, unquote
from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from recyclic_api.core.database import get_db, SessionLocal
from recyclic_api.core.auth import require_super_admin_role
from recyclic_api.core.config import settings
from recyclic_api.core.redis import get_redis
from recyclic_api.core.step_up import (
    SENSITIVE_OPERATION_DB_IMPORT,
    STEP_UP_PIN_HEADER,
    verify_step_up_pin_header,
)
from recyclic_api.models.user import User
from recyclic_api.core.audit import log_system_action
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.services.idempotency_support import (
    body_fingerprint_db_import,
    get_cached_idempotent_close,
    redis_key_db_import_idempotent,
    store_idempotent_close,
    validate_or_raise_idempotency_conflict,
)

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


@router.post(
    "/db/import",
    summary="Import de sauvegarde de base de données (Super Admin uniquement)",
    description="Importe un fichier .dump de sauvegarde PostgreSQL et remplace la base de données existante. Action irréversible.",
    status_code=status.HTTP_200_OK
)
async def import_database(
    request: Request,
    file: UploadFile = File(..., description="Fichier .dump de sauvegarde PostgreSQL à importer"),
    current_user: User = Depends(require_super_admin_role()),
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
):
    """
    Importe un fichier .dump de sauvegarde PostgreSQL et remplace la base de données existante.
    
    Restrictions:
    - Accessible uniquement aux Super-Admins
    - Action irréversible - remplace complètement la base de données
    - Le fichier doit être un fichier .dump valide (format binaire PostgreSQL)
    - L'opération peut prendre plusieurs minutes selon la taille du fichier
    
    Sécurité:
    - Validation du type de fichier (.dump uniquement)
    - Validation du fichier avec pg_restore --list avant restauration
    - Sauvegarde automatique avant import (format .dump dans /backups)
    - Exécution via pg_restore (outil système éprouvé)
    """
    verify_step_up_pin_header(
        user=current_user,
        pin_header_value=request.headers.get(STEP_UP_PIN_HEADER),
        redis_client=redis_client,
        operation=SENSITIVE_OPERATION_DB_IMPORT,
    )
    idem_raw = request.headers.get("Idempotency-Key")
    if not idem_raw or not str(idem_raw).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_REQUIRED",
                "message": "En-tête Idempotency-Key requis pour l'import de base (Story 16.3).",
            },
        )
    idempotency_key = str(idem_raw).strip()

    # Capturer le temps de début pour calculer la durée
    start_time = time.time()
    file_size = 0
    error_message = None
    
    try:
        logger.warning(f"Database import requested by user {current_user.id} ({current_user.username})")
        
        # Validation du fichier
        if not file.filename:
            error_message = "Aucun fichier fourni"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        if not file.filename.lower().endswith('.dump'):
            error_message = "Le fichier doit être un fichier .dump (format binaire PostgreSQL)"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Vérifier la taille du fichier (limite à 500MB pour les dumps compressés)
        file_content = await file.read()
        file_size = len(file_content)

        body_fp = body_fingerprint_db_import(file.filename, file_size)
        rkey = redis_key_db_import_idempotent(str(current_user.id), idempotency_key)
        cached = get_cached_idempotent_close(redis_client, rkey)
        if cached:
            status_c, body = validate_or_raise_idempotency_conflict(cached, body_fp)
            return JSONResponse(status_code=status_c, content=body)
        if file_size > 500 * 1024 * 1024:  # 500MB
            error_message = f"Le fichier est trop volumineux (limite: 500MB, reçu: {file_size / (1024*1024):.2f}MB)"
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=error_message
            )
        
        # Parse DATABASE_URL to extract connection parameters using urllib.parse
        db_url = settings.DATABASE_URL

        try:
            parsed = urlparse(db_url)
            
            # Validate scheme
            if parsed.scheme not in ("postgresql", "postgres"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid database URL scheme (must be postgresql:// or postgres://)"
                )
            
            # Extract credentials
            db_user = unquote(parsed.username) if parsed.username else ""
            db_password = unquote(parsed.password) if parsed.password else ""
            
            # Extract host and port
            db_host = parsed.hostname or "localhost"
            db_port = str(parsed.port) if parsed.port else "5432"
            
            # Extract database name (remove leading slash)
            db_name = parsed.path.lstrip("/") if parsed.path else ""
            
            if not db_name:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database name is required in DATABASE_URL"
                )
            
            if not db_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database user is required in DATABASE_URL"
                )
            
            logger.info(f"Extracted database credentials - User: {db_user}, Password length: {len(db_password)}")
                
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid database URL format: {str(e)}"
            )

        # Créer un fichier temporaire pour le dump uploadé
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.dump', delete=False) as temp_file:
            temp_file.write(file_content)
            temp_dump_path = temp_file.name

        try:
            # Étape 1: Validation du fichier avec pg_restore --list
            logger.info(f"Validating dump file: {temp_dump_path}")
            env = os.environ.copy()
            env["PGPASSWORD"] = db_password

            validate_cmd = [
                "pg_restore",
                "--list",
                temp_dump_path
            ]

            validate_result = subprocess.run(
                validate_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=60,  # 1 minute timeout pour la validation
                check=False
            )

            if validate_result.returncode != 0:
                error_message = "Le fichier .dump n'est pas valide ou est corrompu."
                logger.error("Dump file validation failed: %s", validate_result.stderr)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_message
                )

            logger.info("Dump file validation successful")

            # Étape 2: Créer une sauvegarde de sécurité avant restauration
            # Utiliser /backups (volume monté) pour persistance
            backups_dir = "/backups"
            os.makedirs(backups_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"pre_restore_{timestamp}.dump"
            backup_path = os.path.join(backups_dir, backup_filename)

            logger.info(f"Creating safety backup before import: {backup_path}")

            backup_cmd = [
                "pg_dump",
                "-h", db_host,
                "-p", db_port,
                "-U", db_user,
                "-d", db_name,
                "-F", "c",  # Custom format (binary)
                "-Z", "9",  # Compression level 9
                "-f", backup_path,
                "--clean",
                "--if-exists",
                "--no-owner",
                "--no-privileges"
            ]

            backup_result = subprocess.run(
                backup_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minutes timeout
                check=False
            )

            if backup_result.returncode != 0:
                error_message = "Impossible de créer la sauvegarde automatique avant import."
                logger.error("Backup creation failed: %s", backup_result.stderr)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=error_message
                )

            logger.info(f"Safety backup created successfully: {backup_path}")

            # Étape 3: Copier le fichier dump dans /backups pour qu'il soit accessible depuis le conteneur PostgreSQL
            dump_in_backups = os.path.join(backups_dir, f"import_{timestamp}.dump")
            shutil.copy2(temp_dump_path, dump_in_backups)
            logger.info(f"Copied dump file to {dump_in_backups} for PostgreSQL container access")

            # Étape 4: Fermer les connexions actives pour éviter les verrous
            # IMPORTANT: --clean nécessite des verrous exclusifs qui peuvent être bloqués par des connexions actives
            logger.info("Terminating active connections to allow clean restore")
            terminate_cmd = [
                "psql",
                "-h", db_host,
                "-p", db_port,
                "-U", db_user,
                "-d", "postgres",  # Se connecter à la base postgres pour pouvoir terminer les connexions
                "-c", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}' AND pid <> pg_backend_pid();"
            ]
            
            terminate_result = subprocess.run(
                terminate_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=30,
                check=False
            )
            
            if terminate_result.returncode != 0:
                logger.warning(f"Could not terminate all connections: {terminate_result.stderr}")
            else:
                logger.info("Active connections terminated, waiting 2 seconds for cleanup")
                time.sleep(2)  # Attendre que les connexions se ferment proprement
            
            # Étape 5: Restauration avec pg_restore directement depuis l'API
            # Le conteneur API a postgresql-client installé, donc pg_restore est disponible
            # Le fichier dump est dans /backups, accessible depuis l'API
            logger.info(f"Executing database restore from {dump_in_backups} using pg_restore from API container")
            
            # Utiliser pg_restore directement depuis l'API
            # db_host devrait être "postgres" (nom du service Docker) depuis le conteneur API
            # Utiliser --clean --if-exists pour nettoyer avant restauration
            # Le flag --if-exists évite les erreurs si l'objet n'existe pas
            # IMPORTANT: Ne pas utiliser --exit-on-error car certains paramètres peuvent ne pas être reconnus
            # (ex: transaction_timeout dans certaines versions de PostgreSQL)
            # IMPORTANT: Utiliser --disable-triggers pour éviter les problèmes avec les contraintes FK
            # lors de la restauration, puis réactiver les triggers après
            restore_cmd = [
                "pg_restore",
                "-h", db_host,
                "-p", db_port,
                "-U", db_user,
                "-d", db_name,
                "--clean",
                "--if-exists",
                "--no-owner",
                "--no-privileges",
                "--disable-triggers",  # Désactiver les triggers/contraintes pendant la restauration
                "--verbose",
                "--jobs=1",  # Utiliser un seul job pour éviter les deadlocks
                dump_in_backups
            ]
            
            restore_env = os.environ.copy()
            restore_env["PGPASSWORD"] = db_password
            
            restore_result = subprocess.run(
                restore_cmd,
                env=restore_env,
                capture_output=True,
                text=True,
                timeout=1200,  # 20 minutes timeout (peut être long pour bases avec beaucoup de contraintes)
                check=False
            )
            
            # Nettoyer le fichier copié dans /backups après restauration
            try:
                os.unlink(dump_in_backups)
            except Exception as e:
                logger.warning(f"Could not delete copied dump file {dump_in_backups}: {e}")

            # pg_restore peut retourner un code non-zéro même en cas de succès si il y a des warnings
            # Vérifier si c'est vraiment une erreur ou juste des warnings
            restore_success = True
            if restore_result.returncode != 0:
                # Analyser la sortie pour déterminer si c'est une vraie erreur ou juste des warnings
                stderr_lower = restore_result.stderr.lower() if restore_result.stderr else ""
                stdout_lower = restore_result.stdout.lower() if restore_result.stdout else ""
                combined_output = stderr_lower + " " + stdout_lower
                
                # Détecter les warnings non-bloquants (comme "errors ignored on restore")
                has_ignored_warnings = "errors ignored on restore" in combined_output or "warning:" in combined_output
                
                # Détecter les vraies erreurs critiques (mais pas les warnings ignorés)
                has_critical_errors = any(
                    keyword in stderr_lower and "ignored" not in stderr_lower
                    for keyword in ["error:", "fatal:", "could not", "unable to", "failed to"]
                ) and "errors ignored on restore" not in combined_output
                
                # Si on a seulement des warnings ignorés, considérer comme succès
                if has_ignored_warnings and not has_critical_errors:
                    # Juste des warnings ignorés, considérer comme succès
                    logger.warning(f"Database restore completed with ignored warnings: {restore_result.stderr[:500] if restore_result.stderr else 'N/A'}")
                    restore_success = True  # Continuer normalement
                else:
                    # Vraie erreur
                    restore_success = False
                    error_message = "La restauration de la base de données a échoué. Consulter les journaux serveur."
                    logger.error(
                        "Database restore failed (stderr excerpt): %s",
                        (restore_result.stderr or "")[:2000],
                    )
                    # En cas d'échec, le backup de sécurité est disponible dans /backups
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=error_message
                    )
            
            # Si on arrive ici, la restauration a réussi (avec ou sans warnings)
            if not restore_success:
                # Ne devrait jamais arriver ici, mais par sécurité
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Erreur inattendue lors de la restauration"
                )

            # Calculer la durée d'exécution
            duration_seconds = time.time() - start_time
            
            logger.warning(f"Database import completed successfully by user {current_user.id}")
            
            # La restauration peut invalider la session ORM injectée par FastAPI : audit sur session dédiée si besoin.
            audit_db = db
            own_audit_session = False
            try:
                db.execute(text("SELECT 1"))
            except Exception:
                logger.warning("Database session unusable after restore; opening SessionLocal for audit")
                audit_db = SessionLocal()
                own_audit_session = True
            try:
                log_system_action(
                    action_type=AuditActionType.DB_IMPORT,
                    actor=current_user,
                    target_type="database",
                    details={
                        "filename": file.filename,
                        "file_size_bytes": file_size,
                        "file_size_mb": round(file_size / (1024 * 1024), 2),
                        "duration_seconds": round(duration_seconds, 2),
                        "backup_created": backup_filename,
                        "backup_path": backup_path,
                        "success": True
                    },
                    description=f"Import de base de données réussi: {file.filename} ({round(file_size / (1024 * 1024), 2)}MB) en {round(duration_seconds, 2)}s",
                    db=audit_db
                )
            except Exception as audit_error:
                logger.error("Failed to log audit entry after successful import: %s", audit_error)
            finally:
                if own_audit_session:
                    audit_db.close()
            
            success_payload = {
                "message": "Import de la base de données effectué avec succès",
                "imported_file": file.filename,
                "backup_created": backup_filename,
                "backup_path": backup_path,
                "timestamp": datetime.utcnow().isoformat()
            }
            try:
                store_idempotent_close(redis_client, rkey, body_fp, 200, success_payload)
            except Exception as idem_err:
                logger.warning("idempotency store failed after import success: %s", type(idem_err).__name__)
            return success_payload

        finally:
            # Nettoyer le fichier temporaire
            try:
                os.unlink(temp_dump_path)
            except Exception as e:
                logger.warning(f"Could not delete temporary file {temp_dump_path}: {e}")

    except subprocess.TimeoutExpired:
        duration_seconds = time.time() - start_time
        error_message = (
            "L'import de la base de données a dépassé la limite de temps autorisée pour une étape (timeout). "
            "Les opérations de validation, sauvegarde ou restauration peuvent être longues ; consulter les journaux serveur."
        )
        logger.error("Database import timed out")
        
        # Enregistrer l'audit en cas de timeout
        log_system_action(
            action_type=AuditActionType.DB_IMPORT,
            actor=current_user,
            target_type="database",
            details={
                "filename": file.filename if file.filename else "unknown",
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2) if file_size > 0 else 0,
                "duration_seconds": round(duration_seconds, 2),
                "success": False,
                "error_type": "timeout",
                "error_message": error_message
            },
            description=f"Échec import de base de données (timeout): {file.filename if file.filename else 'unknown'}",
            db=db
        )
        
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=error_message
        )
    except HTTPException as e:
        # Enregistrer l'audit pour les erreurs HTTP (validation, etc.)
        duration_seconds = time.time() - start_time
        if not error_message:
            error_message = e.detail if hasattr(e, 'detail') else str(e)
        
        log_system_action(
            action_type=AuditActionType.DB_IMPORT,
            actor=current_user,
            target_type="database",
            details={
                "filename": file.filename if file.filename else "unknown",
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2) if file_size > 0 else 0,
                "duration_seconds": round(duration_seconds, 2),
                "success": False,
                "error_type": "http_exception",
                "error_message": error_message,
                "status_code": e.status_code if hasattr(e, 'status_code') else None
            },
            description=f"Échec import de base de données: {file.filename if file.filename else 'unknown'} - {error_message}",
            db=db
        )
        raise
    except Exception as e:
        duration_seconds = time.time() - start_time
        error_message = str(e)
        logger.error(f"Unexpected error during database import: {error_message}", exc_info=True)
        
        # Enregistrer l'audit pour les erreurs inattendues
        log_system_action(
            action_type=AuditActionType.DB_IMPORT,
            actor=current_user,
            target_type="database",
            details={
                "filename": file.filename if file.filename else "unknown",
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2) if file_size > 0 else 0,
                "duration_seconds": round(duration_seconds, 2),
                "success": False,
                "error_type": "unexpected_exception",
                "error_message": error_message
            },
            description=f"Échec import de base de données (erreur inattendue): {file.filename if file.filename else 'unknown'} - {error_message}",
            db=db
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur inattendue s'est produite lors de l'import. Consulter les journaux serveur.",
        )
