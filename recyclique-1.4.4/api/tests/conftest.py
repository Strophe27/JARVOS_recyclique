"""
Configuration des tests pour l'API Recyclic

Lot C pilote (TEST-01 + extension) : isolation DB pour un sous-ensemble de
modules auth/infra, admin utilisateur, ``test_refresh_token_service`` et
``test_refresh_token_endpoint`` (voir ``_PILOT_DB_ISOLATION_BASENAMES`` et
``_cleanup_pilot_db_tables``). Le
nettoyage s'exécute dans le ``finally`` de ``_db_autouse`` après fermeture
session + connexion du test (évite les verrous SQLite avec un hook teardown).
Un échec de cleanup (inspect schéma ou ``DELETE``) est journalisé et fait
échouer le teardown du test pilote (plus de best-effort silencieux).
"""

import logging
import os
import sys
from pathlib import Path

# Ajouter la racine du projet au PYTHONPATH pour résoudre les imports
# /app/tests/conftest.py -> /app
sys.path.insert(0, str(Path(__file__).parent.parent))

# --- Avant tout import recyclic_api : Settings, engine applicatif, client Redis ---
# Sinon DATABASE_URL / TESTING ne sont pas appliqués par config.py au chargement des modules.
os.environ["TESTING"] = "true"
os.environ.setdefault("SECRET_KEY", "pytest-secret-key-do-not-use-in-production")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

_api_dir = Path(__file__).parent.parent
_default_sqlite = "sqlite:///" + str((_api_dir / "pytest_recyclic.db").resolve()).replace("\\", "/")

test_db_url = os.getenv("TEST_DATABASE_URL")
if not test_db_url:
    db_url = os.getenv("DATABASE_URL", "")
    if db_url.startswith("sqlite"):
        test_db_url = db_url
    elif db_url and "/recyclic" in db_url:
        test_db_url = db_url.rsplit("/", 1)[0] + "/recyclic_test"
    else:
        test_db_url = _default_sqlite

os.environ["TEST_DATABASE_URL"] = test_db_url
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = test_db_url

import types

if "reportlab" not in sys.modules:
    reportlab = types.ModuleType("reportlab")
    lib = types.ModuleType("reportlab.lib")
    colors = types.ModuleType("reportlab.lib.colors")
    colors.HexColor = lambda value: value
    pagesizes = types.ModuleType("reportlab.lib.pagesizes")
    pagesizes.A4 = (0, 0)
    styles = types.ModuleType("reportlab.lib.styles")
    class _Dummy:
        def __init__(self, *args, **kwargs):
            pass

    styles.getSampleStyleSheet = lambda: {}
    styles.ParagraphStyle = _Dummy
    units = types.ModuleType("reportlab.lib.units")
    units.cm = 1
    enums = types.ModuleType("reportlab.lib.enums")
    enums.TA_CENTER = 1
    enums.TA_LEFT = 0
    platypus = types.ModuleType("reportlab.platypus")
    platypus.SimpleDocTemplate = _Dummy
    platypus.Table = _Dummy
    platypus.TableStyle = _Dummy
    platypus.Paragraph = _Dummy
    platypus.Spacer = _Dummy
    platypus.PageBreak = _Dummy
    platypus.KeepTogether = _Dummy
    sys.modules["reportlab"] = reportlab
    sys.modules["reportlab.lib"] = lib
    sys.modules["reportlab.lib.colors"] = colors
    sys.modules["reportlab.lib.pagesizes"] = pagesizes
    sys.modules["reportlab.lib.styles"] = styles
    sys.modules["reportlab.lib.units"] = units
    sys.modules["reportlab.lib.enums"] = enums
    sys.modules["reportlab.platypus"] = platypus

if "openpyxl" not in sys.modules:
    class _DummyCell:
        def __init__(self):
            self.font = None
            self.fill = None
            self.alignment = None

    class _DummyColumn:
        def __init__(self):
            self.width = None

    class _DummyWorksheet:
        def __init__(self):
            self.title = ""
            self._rows = []
            self.column_dimensions = {chr(ord('A') + i): _DummyColumn() for i in range(26)}

        def append(self, row):
            self._rows.append(row)

        def __getitem__(self, key):
            index = int(key) - 1 if not isinstance(key, int) else key - 1
            row = self._rows[index] if 0 <= index < len(self._rows) else []
            return [_DummyCell() for _ in row]

        @property
        def max_row(self):
            return len(self._rows)

        def iter_rows(self, min_row=1, max_row=None):
            max_row = max_row or self.max_row
            for idx in range(min_row - 1, max_row):
                row = self._rows[idx] if 0 <= idx < len(self._rows) else []
                yield [_DummyCell() for _ in row]

    class _DummyWorkbook:
        def __init__(self):
            self.active = _DummyWorksheet()

        def save(self, _buffer):
            pass

    class _DummyFont:
        def __init__(self, *args, **kwargs):
            pass

    class _DummyAlignment:
        def __init__(self, *args, **kwargs):
            pass

    class _DummyPatternFill:
        def __init__(self, *args, **kwargs):
            pass

    def _dummy_load_workbook(*args, **kwargs):
        """Mock pour load_workbook qui retourne un workbook vide."""
        return _DummyWorkbook()

    openpyxl = types.ModuleType("openpyxl")
    styles_module = types.ModuleType("openpyxl.styles")
    styles_module.Font = _DummyFont
    styles_module.Alignment = _DummyAlignment
    styles_module.PatternFill = _DummyPatternFill

    sys.modules["openpyxl"] = openpyxl
    sys.modules["openpyxl.styles"] = styles_module
    openpyxl.styles = styles_module

    def _workbook_factory():
        return _DummyWorkbook()

    openpyxl.Workbook = _DummyWorkbook
    openpyxl.load_workbook = _dummy_load_workbook

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
from typing import Generator
import uuid

from recyclic_api.main import app
from recyclic_api.core.database import get_db, Base
from sqlalchemy.orm import Session

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.login_history import LoginHistory
from recyclic_api.models.site import Site
from recyclic_api.models.deposit import Deposit
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.sync_log import SyncLog
from recyclic_api.models.registration_request import RegistrationRequest
from recyclic_api.models.user_status_history import UserStatusHistory
from recyclic_api.models.category import Category
from recyclic_api.models.user_session import UserSession  # noqa: F401 — table login / refresh
from recyclic_api.models.setting import Setting  # noqa: F401 — refresh_token_max_hours (RefreshTokenService)
from recyclic_api.models.email_log import EmailLog  # noqa: F401 — tests email_logs (SQLite partiel)
from recyclic_api.models.permission import Group, user_groups  # noqa: F401 — tests groupes / permissions (SQLite)
from recyclic_api.core.security import create_access_token, hash_password

logger = logging.getLogger(__name__)

# SQLite ne conserve pas le tz des colonnes DateTime(timezone=True) : l'ORM peut
# renvoyer des datetimes naïfs, ce qui casse les comparaisons avec ``datetime.now(timezone.utc)``.
_USER_SESSION_UTC_ATTRS = (
    "expires_at",
    "issued_at",
    "last_used_at",
    "revoked_at",
    "created_at",
    "updated_at",
)


def _coerce_user_session_datetimes_utc(target: UserSession) -> None:
    from datetime import timezone as _tz

    for attr in _USER_SESSION_UTC_ATTRS:
        val = getattr(target, attr, None)
        if val is not None and getattr(val, "tzinfo", None) is None:
            setattr(target, attr, val.replace(tzinfo=_tz.utc))

# Modules du pilote isolation DB (Lot C / TEST-01 + TEST-02 admin) : nettoyage post-test ciblé.
_PILOT_DB_ISOLATION_BASENAMES = frozenset(
    {
        "test_infrastructure.py",
        "test_auth_login_endpoint.py",
        "test_auth_logging.py",
        "test_auth_inactive_user_middleware.py",
        "test_auth_login_username_password.py",
        "test_admin_user_status_endpoint.py",
        "test_admin_user_management.py",
        "test_refresh_token_service.py",
        "test_refresh_token_endpoint.py",
    }
)

# Ordre : enfants (FK vers users) puis users. Ignoré si la table n'existe pas (SQLite minimal).
# ``settings`` : clés globales (ex. refresh_token_max_hours) — évite qu'un test pilote
# impose la valeur au suivant après commit + DELETE users/sessions.
_PILOT_CLEANUP_TABLES_ORDER = (
    "audit_logs",
    "user_sessions",
    "login_history",
    "user_status_history",
    "settings",
    "users",
)

SQLALCHEMY_DATABASE_URL = os.environ["TEST_DATABASE_URL"]

engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # timeout : file-lock SQLite quand le pilote enchaîne connexion test + nettoyage
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(UserSession, "load")
    def _sqlite_user_session_load_utc(target, context):  # noqa: ARG001
        _coerce_user_session_datetimes_utc(target)

    @event.listens_for(UserSession, "refresh")
    def _sqlite_user_session_refresh_utc(target, context, attrs):  # noqa: ARG001
        _coerce_user_session_datetimes_utc(target)


def _cleanup_pilot_db_tables() -> None:
    """
    Supprime les lignes des tables les plus touchées par auth/login dans le pilote.

    Objectif : annuler les effets des ``commit()`` applicatifs entre tests du pilote,
    sans refactorer toute la suite. Limite : exécution mixte avec d'autres tests
    dans le même processus pytest peut voir ces tables vidées après un test pilote
    (voir doc équipe / résumé Lot C).

    Chaque ``DELETE`` s'exécute dans sa propre transaction : un échec n'empêche pas
    de tenter les tables suivantes, et n'abort pas silencieusement une transaction
    globale (comportement critique sous PostgreSQL). Tout échec est loggé ; au
    moins une erreur lève ``RuntimeError`` pour que le teardown pilote soit visible.
    """
    from sqlalchemy import inspect

    try:
        insp = inspect(engine)
        existing = set(insp.get_table_names())
    except Exception as e:
        logger.error(
            "Pilote Lot C (cleanup): impossible d'inspecter le schéma: %s",
            e,
            exc_info=True,
        )
        raise RuntimeError(
            "Pilote Lot C (cleanup): échec inspect(engine) — isolation non garantie."
        ) from e

    delete_errors: list[tuple[str, Exception]] = []
    for table in _PILOT_CLEANUP_TABLES_ORDER:
        if table not in existing:
            continue
        try:
            with engine.begin() as conn:
                conn.execute(text(f"DELETE FROM {table}"))
        except Exception as e:
            logger.error(
                "Pilote Lot C (cleanup): DELETE FROM %s a échoué: %s",
                table,
                e,
                exc_info=True,
            )
            delete_errors.append((table, e))

    if delete_errors:
        summary = "; ".join(f"{name}: {err}" for name, err in delete_errors)
        raise RuntimeError(
            f"Pilote Lot C (cleanup): {len(delete_errors)} DELETE en échec — {summary}"
        ) from delete_errors[0][1]

    # Cache classe ActivityService (seuil lu depuis ``settings``) : sans reset, une valeur
    # mise en cache peut survivre au DELETE ``settings`` jusqu'à expiration TTL (60 s).
    try:
        from recyclic_api.services.activity_service import (
            ActivityService,
            DEFAULT_ACTIVITY_THRESHOLD_MINUTES,
        )

        ActivityService._cached_threshold_minutes = DEFAULT_ACTIVITY_THRESHOLD_MINUTES
        ActivityService._cache_expiration_timestamp = 0.0
    except Exception as e:
        logger.error(
            "Pilote Lot C (cleanup): impossible de réinitialiser le cache ActivityService: %s",
            e,
            exc_info=True,
        )
        raise RuntimeError(
            "Pilote Lot C (cleanup): reset du cache ActivityService en échec — isolation non garantie."
        ) from e


def _request_is_pilot_db_isolation(request) -> bool:
    try:
        path = getattr(request.node, "path", None) or getattr(request.node, "fspath", None)
        name = path.name if path is not None else ""
    except Exception:
        return False
    return name in _PILOT_DB_ISOLATION_BASENAMES


# Fonction pour créer les tables
def create_tables_if_not_exist():
    """Créer les tables si elles n'existent pas"""
    try:
        print("🔧 Création des tables...")
        # Créer les types ENUM PostgreSQL nécessaires avant de créer les tables
        # (Base.metadata.create_all() ne les crée pas automatiquement)
        if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
            with engine.connect() as conn:
                # Créer le type ENUM cashsessionstep s'il n'existe pas
                conn.execute(text("""
                    DO $$ BEGIN
                        CREATE TYPE cashsessionstep AS ENUM ('ENTRY', 'SALE', 'EXIT');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """))
                conn.commit()
        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
            # Les imports ci-dessus enregistrent aussi des modèles JSONB (ex. cash_registers) : create_all
            # complet échoue sur SQLite ; le bloc try/except masquait l erreur et laissait user_sessions absent.
            Base.metadata.create_all(
                bind=engine,
                tables=[
                    User.__table__,
                    UserStatusHistory.__table__,
                    LoginHistory.__table__,
                    UserSession.__table__,
                    Setting.__table__,
                    EmailLog.__table__,
                    Group.__table__,
                    user_groups,
                    # Sessions caisse / ventes (tests admin maintenance, cash_session_*, etc.)
                    Site.__table__,
                    CashSession.__table__,
                    Sale.__table__,
                ],
            )
        else:
            Base.metadata.create_all(bind=engine)
        print("✅ Tables créées avec succès")
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables: {e}")

@pytest.fixture(scope="session")
def db_engine():
    """Crée les tables une seule fois pour toute la session de test."""
    print("🔧 (tests) Moteur de base de données de test prêt.")
    create_tables_if_not_exist()
    return engine


@pytest.fixture(autouse=True)
def _sqlite_skip_audit_log_commit(request):
    """
    Sous SQLite, audit_logs (JSONB) n'est pas créé ; log_audit() et dérivés
    (log_role_change, etc.) font un commit() ou échouent sur insert. On neutralise
    log_audit dans core.audit (imports dynamiques ex. users), auth,     admin_users_credentials et
    admin_activity_threshold (rollback d'insert audit annulerait la session SQLite).
    """
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        yield
        return
    if request.node.get_closest_marker("no_db"):
        yield
        return
    from unittest.mock import patch

    from recyclic_api.core import audit as audit_core
    from recyclic_api.api.api_v1.endpoints import (
        admin_users_credentials as admin_users_credentials_endpoints,
    )
    from recyclic_api.api.api_v1.endpoints import admin_activity_threshold as admin_activity_threshold_endpoints
    from recyclic_api.api.api_v1.endpoints import auth as auth_endpoints
    from recyclic_api.services import sale_service as sale_service_mod

    _noop = lambda *args, **kwargs: None

    with (
        patch.object(audit_core, "log_audit", _noop),
        patch.object(auth_endpoints, "log_audit", _noop),
        patch.object(admin_users_credentials_endpoints, "log_audit", _noop),
        patch.object(admin_activity_threshold_endpoints, "log_audit", _noop),
        patch.object(sale_service_mod, "log_audit", _noop),
    ):
        yield

@pytest.fixture(scope="function", autouse=True)
def _db_autouse(db_engine, request):
    """
    Prépare, pour chaque test, une connexion SQLAlchemy + une Session ORM et branche l'app dessus.

    **Ce que cette fixture garantit**
    - Une connexion dédiée au test et une ``Session`` liée à cette connexion.
    - Au début du test, une transaction est ouverte sur la connexion via ``connection.begin()`` ;
      le retour n'est pas utilisé dans le teardown (**ni commit ni rollback explicites** sur cet
      objet — comportement historique volontairement inchangé).
    - L'override FastAPI ``get_db`` injecte cette ``Session`` pour ``TestClient`` / les endpoints.

    **Ce qu'elle ne garantit pas**
    - **Pas d'isolation « rollback entre tests »** via cette fixture seule : tout ``commit()``
      laisse les données visibles sur la connexion / le moteur tant que la connexion vit.
    - **Pilote Lot C (TEST-01)** : pour les modules listés dans
      ``_PILOT_DB_ISOLATION_BASENAMES``, après fermeture de la connexion du test, un
      ``DELETE`` ciblé sur ``audit_logs``, ``user_sessions``, ``login_history``,
      ``user_status_history``, ``settings``, ``users``
      (tables présentes uniquement). Cela compense les commits du login / audit pour ce
      sous-ensemble seulement ; ce n'est pas un rollback transactionnel et d'autres tables
      peuvent encore conserver des lignes si un test pilote les remplit.

    Tests marqués ``@pytest.mark.no_db`` : pas de setup DB, la fixture produit ``None``.
    """
    if request.node.get_closest_marker("no_db"):
        yield None
        return

    connection = db_engine.connect()
    # Transaction racine ouverte ; l'objet n'est pas commit/rollback dans le teardown (voir docstring).
    _ = connection.begin()

    session = TestingSessionLocal(bind=connection)

    def override_get_db():
        try:
            yield session
        finally:
            pass

    # Override ciblé (pas de clear global)
    app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        # Pas de transaction.rollback() / commit() ici : stratégie transactionnelle inchangée
        # (voir docstring). Fermeture connexion uniquement.
        connection.close()
        # Pilote TEST-01 : nettoyage après libération de la connexion du test (ordre critique SQLite).
        if _request_is_pilot_db_isolation(request):
            _cleanup_pilot_db_tables()

@pytest.fixture(scope="function")
def db_session(_db_autouse):
    """Même session que ``_db_autouse`` (alias explicite pour les tests). Voir docstring de ``_db_autouse``."""
    return _db_autouse

@pytest.fixture(scope="function")
def client(db_session):
    """Fixture pour le client de test FastAPI qui utilise la session de test."""
    return TestClient(app)


@pytest.fixture(scope="function")
def client_with_jwt_auth(db_session):
    """Fixture pour un client de test avec utilisateur authentifié (compatible avec les tests existants)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def admin_client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Fixture pour un client de test avec les droits d'administrateur.
    Crée un utilisateur admin, génère un token JWT et configure le client.
    """
    # Vérifier si un admin existe déjà
    admin_user = db_session.query(User).filter(User.role == UserRole.ADMIN).first()

    if admin_user is None:
        # Création de l'utilisateur admin
        admin_username = f"admin_{uuid.uuid4().hex}@test.com"
        admin_password = "admin_password"
        hashed_password = hash_password(admin_password)

        admin_user = User(
            username=admin_username,
            hashed_password=hashed_password,
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            telegram_id=999999999  # integer comme attendu par les tests
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

    # Génération du token
    access_token = create_access_token(data={"sub": str(admin_user.id)})

    # Configuration du client de test avec headers par défaut
    # TestClient n'utilise pas automatiquement client.headers, il faut passer headers dans chaque requête
    # On crée un wrapper qui injecte automatiquement le header
    class AuthenticatedTestClient:
        """Wrapper pour TestClient qui injecte automatiquement le header Authorization."""
        def __init__(self, client: TestClient, token: str):
            self._client = client
            self._auth_header = {"Authorization": f"Bearer {token}"}
        
        def get(self, url: str, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._auth_header)
            return self._client.get(url, headers=headers, **kwargs)
        
        def post(self, url: str, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._auth_header)
            return self._client.post(url, headers=headers, **kwargs)
        
        def patch(self, url: str, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._auth_header)
            return self._client.patch(url, headers=headers, **kwargs)
        
        def put(self, url: str, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._auth_header)
            return self._client.put(url, headers=headers, **kwargs)
        
        def delete(self, url: str, **kwargs):
            headers = kwargs.pop("headers", {})
            headers.update(self._auth_header)
            return self._client.delete(url, headers=headers, **kwargs)
    
    client = TestClient(app)
    authenticated_client = AuthenticatedTestClient(client, access_token)

    yield authenticated_client

@pytest.fixture(scope="function")
def super_admin_client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Fixture pour un client de test avec les droits de super-administrateur.
    Crée un utilisateur super-admin, génère un token JWT et configure le client.
    """
    # Création de l'utilisateur super-admin
    super_admin_username = f"superadmin_{uuid.uuid4().hex}@test.com"
    super_admin_password = "superadmin_password"
    hashed_password = hash_password(super_admin_password)

    super_admin_user = User(
        username=super_admin_username,
        hashed_password=hashed_password,
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        telegram_id=888888888  # integer comme attendu par les tests
    )
    db_session.add(super_admin_user)
    db_session.commit()
    db_session.refresh(super_admin_user)

    # Génération du token
    access_token = create_access_token(data={"sub": str(super_admin_user.id)})

    # Configuration du client de test
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {access_token}"

    yield client

@pytest.fixture(scope="function")
def async_client():
    """Fixture pour le client de test asynchrone FastAPI."""
    return AsyncClient(app=app, base_url="http://testserver")


@pytest.fixture(scope="session")
def openapi_schema():
    """Fixture pour le schéma OpenAPI (généré dynamiquement, pas depuis fichier)."""
    return app.openapi()

