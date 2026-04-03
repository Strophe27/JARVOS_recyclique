from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from recyclic_api.utils.rate_limit import limiter, conditional_rate_limit
import logging
import time
import uuid
from datetime import datetime, timezone

from recyclic_api.core.database import get_db
from recyclic_api.core.security import create_access_token, verify_password, hash_password, create_password_reset_token, verify_reset_token
from recyclic_api.core.audit import log_audit, AuditActionType
from recyclic_api.core.auth import get_current_user
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.login_history import LoginHistory
from recyclic_api.schemas.auth import LoginRequest, LoginResponse, AuthUser, SignupRequest, SignupResponse, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse, LogoutResponse, RefreshTokenRequest, RefreshTokenResponse
from recyclic_api.schemas.pin import PinAuthRequest, PinAuthResponse
from recyclic_api.utils.auth_metrics import auth_metrics
from recyclic_api.core.uuid_validation import validate_and_convert_uuid
from recyclic_api.utils.password_reset_email import send_password_reset_email_safe
from recyclic_api.core.config import get_effective_frontend_url, settings
from recyclic_api.core.web_session_cookies import (
    attach_web_session_cookies,
    clear_web_session_cookies,
)
from recyclic_api.services.activity_service import ActivityService
from recyclic_api.services.refresh_token_service import RefreshTokenService
from recyclic_api.core.security import get_token_expiration_minutes

router = APIRouter(tags=["auth"])

# Configure logger for authentication events
logger = logging.getLogger(__name__)

# Add rate limit exception handler (should be added to main app, not router)
# router.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/login", response_model=LoginResponse)
@conditional_rate_limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    """Authentifie un utilisateur via son nom d'utilisateur et mot de passe, et retourne un JWT."""

    start_time = time.time()
    client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'

    # S'assurer que la session est propre avant la requête
    # Si la session est dans un état invalide (rollback précédent), on la réinitialise
    try:
        db.expire_all()
    except Exception as expire_error:
        logger.warning(f"Erreur expire_all, rollback de la session: {expire_error}")
        try:
            db.rollback()
        except Exception:
            pass
    
    # Requête SQL texte puis ORM (comportement historique ; évite de changer la résolution utilisateur)
    user = None
    try:
        from sqlalchemy import text
        result = db.execute(
            text("SELECT id, username, is_active, status FROM users WHERE username = :username"),
            {"username": payload.username},
        )
        row = result.first()
        if row:
            raw_id = row[0]
            user_id = raw_id if isinstance(raw_id, uuid.UUID) else uuid.UUID(str(raw_id))
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(
                    "Utilisateur présent en SQL brut mais introuvable via ORM pour id=%s",
                    row[0],
                )
        else:
            logger.debug("Aucun utilisateur pour le username fourni (SQL brut)")
    except Exception as sql_error:
        logger.error(f"Erreur avec requête SQL brute: {sql_error}", exc_info=True)
    
    # Si toujours pas trouvé, essayer avec select() (fallback)
    if not user:
        try:
            result = db.execute(select(User).where(User.username == payload.username))
            user = result.scalar_one_or_none()
        except Exception as select_error:
            logger.error(f"Erreur avec select(): {select_error}", exc_info=True)
    
    # Vérifier si l'utilisateur existe et est actif
    if not user:
        logger.warning(
            "Failed login attempt: user not found (username length=%s), IP: %s",
            len(payload.username),
            client_ip,
        )
    elif not user.is_active:
        logger.warning(
            "Failed login attempt: inactive user (username length=%s), IP: %s",
            len(payload.username),
            client_ip,
        )
    
    if not user or not user.is_active:

        # Record metrics for failed login
        elapsed_ms = (time.time() - start_time) * 1000
        auth_metrics.record_login_attempt(
            username=payload.username,
            success=False,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type="invalid_user_or_inactive"
        )

        # Persist failed login attempt
        try:
            db.add(LoginHistory(
                id=__import__("uuid").uuid4(),
                user_id=None,
                username=payload.username,
                success=False,
                client_ip=client_ip,
                error_type="invalid_user_or_inactive",
            ))
            db.commit()
        except Exception:
            db.rollback()

        # Log audit for failed login
        log_audit(
            action_type=AuditActionType.LOGIN_FAILED,
            actor=None,
            details={"username": payload.username, "error_type": "invalid_user_or_inactive"},
            description=f"Tentative de connexion échouée pour l'utilisateur {payload.username}",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
            db=db
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides ou utilisateur inactif",
        )

    # Vérifier le mot de passe
    logger.debug(f"Vérification du mot de passe pour username: {payload.username}, user_id: {user.id}")
    password_valid = verify_password(payload.password, user.hashed_password)
    logger.debug(f"Résultat vérification mot de passe: {password_valid}")
    
    if not password_valid:
        # Log failed login attempt due to invalid password
        logger.warning(f"Failed login attempt: invalid password for username: {payload.username}, IP: {client_ip}")

        # Record metrics for failed login
        elapsed_ms = (time.time() - start_time) * 1000
        auth_metrics.record_login_attempt(
            username=payload.username,
            success=False,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type="invalid_password"
        )

        # Persist failed login attempt
        try:
            db.add(LoginHistory(
                id=__import__("uuid").uuid4(),
                user_id=user.id if user else None,
                username=payload.username,
                success=False,
                client_ip=client_ip,
                error_type="invalid_password",
            ))
            db.commit()
        except Exception:
            db.rollback()

        # Log audit for failed login
        log_audit(
            action_type=AuditActionType.LOGIN_FAILED,
            actor=user,
            details={"username": payload.username, "error_type": "invalid_password"},
            description=f"Tentative de connexion échouée pour l'utilisateur {payload.username} (mot de passe invalide)",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent"),
            db=db
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides ou utilisateur inactif",
        )

    # Créer le token JWT
    token = create_access_token({"sub": str(user.id)})

    # Créer un refresh token (Story B42-P2)
    refresh_service = RefreshTokenService(db)
    refresh_token = None
    user_agent = request.headers.get("user-agent")
    
    try:
        refresh_token = refresh_service.generate_refresh_token()
        logger.debug(f"Refresh token généré pour user_id: {user.id}")
        
        refresh_service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        logger.debug("Refresh token créé pour user_id=%s", user.id)
    except Exception as exc:
        # Capturer user_id avant d'accéder à user.id (qui peut échouer si la session DB est invalide)
        user_id_str = str(user.id) if user and hasattr(user, 'id') else 'unknown'
        logger.error(
            f"Erreur lors de la création du refresh token pour user_id={user_id_str}: {exc}",
            exc_info=True
        )
        # Ne pas bloquer le login si la création du refresh token échoue
        refresh_token = None
        # IMPORTANT: Faire un rollback pour nettoyer la session DB en cas d'erreur
        try:
            db.rollback()
        except Exception:
            pass  # Ignorer les erreurs de rollback

    # Log successful login
    logger.info(f"Successful login for user_id: {user.id}")

    # Record metrics for successful login
    elapsed_ms = (time.time() - start_time) * 1000
    auth_metrics.record_login_attempt(
        username=payload.username,
        success=True,
        elapsed_ms=elapsed_ms,
        client_ip=client_ip,
        user_id=str(user.id)
    )

    # Persist successful login
    try:
        db.add(LoginHistory(
            id=__import__("uuid").uuid4(),
            user_id=user.id,
            username=payload.username,
            success=True,
            client_ip=client_ip,
            error_type=None,
        ))
        db.commit()
    except Exception:
        db.rollback()

    # Log audit for successful login
    log_audit(
        action_type=AuditActionType.LOGIN_SUCCESS,
        actor=user,
        details={"username": payload.username, "user_role": user.role.value},
        description=f"Connexion réussie pour l'utilisateur {payload.username}",
        ip_address=client_ip,
        user_agent=user_agent,
        db=db
    )

    # B42-P6: Record initial activity on login
    # This initializes the activity timer in Redis so subsequent refreshes can validate inactivity
    try:
        activity_service = ActivityService(db)
        activity_service.record_user_activity(str(user.id))
    except Exception as act_exc:
        logger.warning(f"Failed to record initial activity on login: {act_exc}")

    # Calculer expires_in en secondes
    expires_in = get_token_expiration_minutes() * 60

    try:
        # Construire AuthUser d'abord pour détecter les erreurs de sérialisation tôt
        # Utiliser model_validate pour une meilleure gestion des types SQLAlchemy
        try:
            auth_user = AuthUser.model_validate(user)
        except Exception as validation_error:
            logger.warning(f"Erreur lors de model_validate, fallback sur construction manuelle: {validation_error}")
            # Fallback: construction manuelle si model_validate échoue
            auth_user = AuthUser(
                id=str(user.id),
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role.value if hasattr(user.role, "value") else str(user.role),
                status=user.status.value if hasattr(user.status, "value") else str(user.status),
                is_active=user.is_active,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
        logger.debug(f"AuthUser créé avec succès pour user_id={user.id}")

        # Créer LoginResponse
        body = LoginResponse(
            access_token=token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=auth_user,
        )
        json_response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder(body),
        )
        if payload.use_web_session_cookies:
            refresh_max_age = refresh_service._get_refresh_token_max_hours() * 3600
            attach_web_session_cookies(
                json_response,
                access_token=token,
                refresh_token=refresh_token,
                access_max_age_seconds=expires_in,
                refresh_max_age_seconds=refresh_max_age,
            )
        return json_response

    except Exception as e:
        logger.error(
            f"Erreur lors de la sérialisation de LoginResponse pour user_id={user.id}: {e}",
            exc_info=True
        )
        
        # Si un refresh token a été créé, tenter de le révoquer pour éviter une session orpheline
        if refresh_token:
            try:
                from recyclic_api.models.user_session import UserSession
                token_hash = refresh_service._hash_refresh_token(refresh_token)
                session = (
                    db.query(UserSession)
                    .filter(UserSession.refresh_token_hash == token_hash)
                    .first()
                )
                if session:
                    session.revoked_at = datetime.now(timezone.utc)
                    db.commit()
                    logger.info(f"Session orpheline révoquée pour user_id={user.id}")
            except Exception as revoke_error:
                logger.warning(f"Impossible de révoquer la session orpheline: {revoke_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération de la réponse de connexion",
        )


@router.post("/signup", response_model=SignupResponse)
@conditional_rate_limit("5/minute")
async def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)) -> SignupResponse:
    """Crée un nouveau compte utilisateur en attente de validation."""

    # Validation simple de l'email si fourni
    if payload.email is not None:
        email_val = str(payload.email)
        if "@" not in email_val or "." not in email_val:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email invalide",
            )

    # Vérifier si le nom d'utilisateur existe déjà
    result = db.execute(select(User).where(User.username == payload.username))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce nom d'utilisateur est déjà pris",
        )

    # Vérifier si l'email existe déjà (si fourni)
    if payload.email is not None:
        result = db.execute(select(User).where(User.email == payload.email))
        existing_email_user = result.scalar_one_or_none()
        
        if existing_email_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un compte avec cet email existe déjà",
            )

    # Hasher le mot de passe
    hashed_password = hash_password(payload.password)

    # Créer le nouvel utilisateur
    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed_password,
        role=UserRole.USER,
        status=UserStatus.PENDING,
        is_active=True
    )

    # Sauvegarder en base de données
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return SignupResponse(
        message="Compte créé avec succès. Votre compte est en attente de validation par un administrateur.",
        user_id=str(new_user.id),
        status=new_user.status.value
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@conditional_rate_limit("5/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> ForgotPasswordResponse:
    """Génère un token de réinitialisation et l'envoie par email."""

    # Rechercher l'utilisateur par email
    # Note: En cas de doublons d'email (problème de contrainte d'unicité), on prend le premier
    result = db.execute(select(User).where(User.email == payload.email))
    user = result.first()
    if user:
        user = user[0]  # Extraire l'objet User du tuple

    # Toujours retourner le même message, même si l'utilisateur n'existe pas
    # (pour éviter l'énumération d'emails)
    response_message = "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé."

    if user and user.is_active:
        base_url = get_effective_frontend_url()
        if not base_url:
            logger.error(
                "Mot de passe oublié : FRONTEND_URL non configurée en environnement non-dev ; "
                "email de réinitialisation non envoyé (utilisateur %s).",
                user.email,
            )
        else:
            reset_token = create_password_reset_token(str(user.id))
            reset_link = f"{base_url}/reset-password?token={reset_token}"

            try:
                email_sent = send_password_reset_email_safe(
                    to_email=user.email,
                    reset_link=reset_link,
                    user_name=user.first_name or user.username
                )

                if email_sent:
                    logger.info(f"Password reset email sent successfully to {user.email}")

                    log_audit(
                        action_type=AuditActionType.PASSWORD_RESET,
                        actor=user,
                        details={"email": user.email, "reset_link_generated": True},
                        description=f"Demande de réinitialisation de mot de passe pour {user.email}",
                        ip_address=getattr(request.client, 'host', 'unknown') if request.client else 'unknown',
                        user_agent=request.headers.get("user-agent"),
                        db=db
                    )
                else:
                    logger.error(f"Failed to send password reset email to {user.email}")

            except Exception as e:
                logger.error(f"Error sending password reset email to {user.email}: {e}")
                # Ne pas exposer l'erreur à l'utilisateur pour des raisons de sécurité

    return ForgotPasswordResponse(message=response_message)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> ResetPasswordResponse:
    """Réinitialise le mot de passe avec un token valide."""

    # Vérifier et décoder le token
    user_id = verify_reset_token(payload.token)

    # Récupérer l'utilisateur
    result = db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable ou inactif",
        )

    # Valider la force du nouveau mot de passe
    from recyclic_api.core.security import validate_password_strength
    is_valid, errors = validate_password_strength(payload.new_password)
    if not is_valid:
        # Translate common English messages to French keywords expected by tests
        translations = {
            "Password must be at least 8 characters long": "Le mot de passe doit contenir au moins 8 caractères",
            "Password must contain at least one uppercase letter": "Le mot de passe doit contenir au moins une lettre majuscule",
            "Password must contain at least one lowercase letter": "Le mot de passe doit contenir au moins une lettre minuscule",
            "Password must contain at least one digit": "Le mot de passe doit contenir au moins un chiffre",
            "Password must contain at least one special character": "Le mot de passe doit contenir au moins un caractère spécial",
        }
        fr_errors = [translations.get(e, e) for e in errors]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Mot de passe invalide: {' '.join(fr_errors)}",
        )

    # Hasher le nouveau mot de passe
    new_hashed_password = hash_password(payload.new_password)

    # Mettre à jour le mot de passe
    user.hashed_password = new_hashed_password
    db.commit()

    return ResetPasswordResponse(message="Mot de passe réinitialisé avec succès.")


@router.post("/pin", response_model=PinAuthResponse)
@conditional_rate_limit("5/minute")
async def authenticate_with_pin(
    request: Request,
    payload: PinAuthRequest,
    db: Session = Depends(get_db)
) -> PinAuthResponse:
    """Authentifie un utilisateur via son ID et PIN, et retourne un JWT.

    Cette route est utilisée pour le changement d'opérateur en caisse.
    Rate limited à 5 tentatives par minute pour éviter le bruteforce.
    """
    start_time = time.time()
    client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'

    # Validate and convert user_id to UUID
    user_uuid = validate_and_convert_uuid(payload.user_id)

    # Récupérer l'utilisateur par son ID
    result = db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    # Vérifier si l'utilisateur existe, est actif et a un PIN défini
    if not user or not user.is_active or not user.hashed_pin:
        logger.warning(f"Failed PIN auth attempt for user_id: {payload.user_id}, IP: {client_ip}")

        # Record metrics for failed PIN auth
        elapsed_ms = (time.time() - start_time) * 1000
        auth_metrics.record_login_attempt(
            username=f"pin_auth_{payload.user_id}",
            success=False,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type="invalid_user_or_no_pin"
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur invalide, inactif ou PIN non défini",
        )

    # Vérifier le PIN
    if not verify_password(payload.pin, user.hashed_pin):
        logger.warning(f"Failed PIN auth attempt for user_id: {payload.user_id}, IP: {client_ip}")

        # Record metrics for failed PIN auth
        elapsed_ms = (time.time() - start_time) * 1000
        auth_metrics.record_login_attempt(
            username=f"pin_auth_{payload.user_id}",
            success=False,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type="invalid_pin"
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN invalide",
        )

    # Créer le token JWT
    token = create_access_token({"sub": str(user.id)})

    # Log successful PIN auth
    logger.info(f"Successful PIN authentication for user_id: {user.id}")

    # Record metrics for successful PIN auth
    elapsed_ms = (time.time() - start_time) * 1000
    auth_metrics.record_login_attempt(
        username=f"pin_auth_{user.username}",
        success=True,
        elapsed_ms=elapsed_ms,
        client_ip=client_ip,
        user_id=str(user.id)
    )

    return PinAuthResponse(
        access_token=token,
        token_type="bearer",
        user_id=str(user.id),
        username=user.username or "",
        role=user.role.value if hasattr(user.role, "value") else str(user.role)
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> LogoutResponse:
    """Deconnexion auditee d'un utilisateur authentifie."""
    from recyclic_api.utils.session_metrics import session_metrics

    client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
    user_agent = request.headers.get('user-agent', 'unknown')

    # Révoquer tous les refresh tokens de l'utilisateur (Story B42-P2)
    try:
        refresh_service = RefreshTokenService(db)
        revoked_count = refresh_service.revoke_all_user_sessions(current_user.id)
        logger.info(f"Révoqué {revoked_count} session(s) pour user_id={current_user.id}")
    except Exception as exc:
        logger.warning(f"Erreur lors de la révocation des refresh tokens: {exc}")

    # B42-P4: Record manual logout metric
    session_metrics.record_logout(
        user_id=str(current_user.id),
        forced=False,
        client_ip=client_ip
    )

    # Audit de la deconnexion
    log_audit(
        action_type=AuditActionType.LOGOUT,
        actor=current_user,
        details={
            'username': current_user.username,
            'user_id': str(current_user.id),
            'user_role': current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        },
        description=f"Deconnexion de l'utilisateur {current_user.username}",
        ip_address=client_ip,
        user_agent=user_agent,
        db=db
    )

    logger.info('User %s (ID: %s) logged out from IP: %s', current_user.username, current_user.id, client_ip)

    logout_body = LogoutResponse(message='Deconnexion reussie')
    json_response = JSONResponse(content=jsonable_encoder(logout_body))

    # Enregistrer la deconnexion dans login_history
    try:
        logout_entry = LoginHistory(
            id=uuid.uuid4(),
            user_id=current_user.id,
            username=current_user.username,
            success=True,
            client_ip=client_ip,
            error_type='logout',
        )
        db.add(logout_entry)
        db.commit()
    except Exception as exc:
        logger.warning("Impossible d'enregistrer la deconnexion dans login_history: %s", exc)
        db.rollback()

    clear_web_session_cookies(json_response)

    # Nettoyer l'activite temps reel
    try:
        ActivityService().clear_user_activity(str(current_user.id))
        logger.info("Activite Redis supprimee pour l'utilisateur %s", current_user.username)
    except Exception as exc:
        logger.warning("Erreur lors de la suppression de l'activite Redis: %s", exc)

    return json_response


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Renouveler l'access token",
    description="""
    Renouvelle l'access token en utilisant un refresh token valide.
    
    **Fonctionnalités:**
    - Rotation automatique du refresh token (chaque utilisation génère un nouveau token)
    - Vérification de l'activité récente de l'utilisateur (via ActivityService)
    - Refus si l'utilisateur est inactif depuis plus de `token_expiration_minutes`
    - Refus si le refresh token est expiré (TTL max atteint)
    - Refus si le refresh token a déjà été utilisé (protection contre replay)
    
    **Codes de réponse:**
    - `200 OK`: Refresh réussi, nouveaux tokens retournés
    - `401 Unauthorized`: Refresh token invalide, expiré ou déjà utilisé
    - `403 Forbidden`: Utilisateur inactif depuis trop longtemps
    - `429 Too Many Requests`: Limite de taux dépassée (10 requêtes/minute)
    - `500 Internal Server Error`: Erreur serveur
    
    **Story B42-P2:** Refresh token avec rotation et vérification d'activité.
    **Story B42-P4:** Instrumentation des métriques de session.
    """,
    responses={
        200: {
            "description": "Refresh réussi, nouveaux tokens retournés",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "new_refresh_token_after_rotation",
                        "token_type": "bearer",
                        "expires_in": 14400
                    }
                }
            }
        },
        401: {
            "description": "Refresh token invalide, expiré ou déjà utilisé",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Refresh token invalide ou expiré"
                    }
                }
            }
        },
        403: {
            "description": "Utilisateur inactif depuis trop longtemps",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Session expirée - inactivité trop longue"
                    }
                }
            }
        },
        429: {
            "description": "Limite de taux dépassée",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Rate limit exceeded: 10 per minute"
                    }
                }
            }
        },
        500: {
            "description": "Erreur interne du serveur",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Erreur interne lors du renouvellement du token"
                    }
                }
            }
        }
    }
)
@conditional_rate_limit("10/minute")
async def refresh_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> RefreshTokenResponse:
    """
    Renouvelle l'access token en utilisant un refresh token.
    
    Story B42-P2: Refresh token avec rotation et vérification d'activité.
    Story B42-P4: Instrumentation des métriques de session.
    """
    import time
    from recyclic_api.utils.session_metrics import session_metrics
    
    start_time = time.time()
    client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
    user_agent = request.headers.get('user-agent', 'unknown')

    refresh_service = RefreshTokenService(db)

    body_tok = (payload.refresh_token or "").strip() or None
    cookie_tok = request.cookies.get(settings.WEB_SESSION_REFRESH_COOKIE_NAME)
    cookie_tok = (cookie_tok or "").strip() or None
    used_cookie_transport = False
    effective_refresh = body_tok
    if not effective_refresh:
        effective_refresh = cookie_tok
        used_cookie_transport = bool(effective_refresh)
    if not effective_refresh:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Refresh token requis",
        )

    try:
        # Valider et faire la rotation du refresh token
        new_session, new_refresh_token = refresh_service.validate_and_rotate(
            refresh_token=effective_refresh,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        # Créer un nouveau access token
        new_access_token = create_access_token({"sub": str(new_session.user_id)})

        # Calculer expires_in en secondes
        expires_in = get_token_expiration_minutes() * 60

        # Log audit pour le refresh
        try:
            from recyclic_api.models.user import User
            user = db.query(User).filter(User.id == new_session.user_id).first()
            if user:
                # B42-P6: Update activity on successful refresh
                # This ensures that refreshing keeps the session alive in terms of inactivity
                try:
                    activity_service = ActivityService(db)
                    activity_service.record_user_activity(str(user.id))
                except Exception as act_exc:
                    logger.warning(f"Failed to update activity during refresh: {act_exc}")

                log_audit(
                    action_type=AuditActionType.LOGIN_SUCCESS,  # Utiliser LOGIN_SUCCESS pour l'audit
                    actor=user,
                    details={
                        "action": "token_refresh",
                        "session_id": str(new_session.id),
                    },
                    description=f"Refresh token réussi pour l'utilisateur {user.username}",
                    ip_address=client_ip,
                    user_agent=user_agent,
                    db=db
                )
        except Exception as exc:
            logger.warning(f"Erreur lors de l'audit du refresh token: {exc}")

        # B42-P4: Record successful refresh metric
        elapsed_ms = (time.time() - start_time) * 1000
        session_metrics.record_refresh(
            user_id=str(new_session.user_id),
            success=True,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            site_id=None  # TODO: Extract site_id from session if available
        )

        logger.info(f"Refresh token réussi pour user_id={new_session.user_id}")

        refresh_body = RefreshTokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )
        if used_cookie_transport:
            refresh_max_age = refresh_service._get_refresh_token_max_hours() * 3600
            jr = JSONResponse(content=jsonable_encoder(refresh_body))
            attach_web_session_cookies(
                jr,
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                access_max_age_seconds=expires_in,
                refresh_max_age_seconds=refresh_max_age,
            )
            return jr
        return refresh_body

    except ValueError as e:
        error_message = str(e)
        logger.warning(f"Échec du refresh token: {error_message}, IP: {client_ip}")

        # B42-P4: Record failed refresh metric
        elapsed_ms = (time.time() - start_time) * 1000
        error_type = "inactivity" if "inactivité" in error_message.lower() else "invalid_token"
        session_metrics.record_refresh(
            user_id=None,
            success=False,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type=error_type
        )

        # Log audit pour échec
        try:
            log_audit(
                action_type=AuditActionType.LOGIN_FAILED,
                actor=None,
                details={
                    "action": "token_refresh_failed",
                    "error": error_message,
                },
                description=f"Échec du refresh token: {error_message}",
                ip_address=client_ip,
                user_agent=user_agent,
                db=db
            )
        except Exception as exc:
            logger.warning(f"Erreur lors de l'audit de l'échec du refresh: {exc}")

        # Retourner 401 pour token invalide/expiré, 403 pour inactivité
        status_code = status.HTTP_403_FORBIDDEN if "inactivité" in error_message.lower() else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(
            status_code=status_code,
            detail=error_message,
        )

    except Exception as exc:
        # B42-P4: Record failed refresh metric for unexpected errors
        elapsed_ms = (time.time() - start_time) * 1000
        session_metrics.record_refresh(
            user_id=None,
            success=False,
            elapsed_ms=elapsed_ms,
            client_ip=client_ip,
            error_type="internal_error"
        )
        
        logger.error(f"Erreur inattendue lors du refresh token: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne lors du renouvellement du token",
        )


