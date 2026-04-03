from logging.config import fileConfig
from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from recyclic_api.core.config import settings
from recyclic_api.core.database import Base
from recyclic_api.models import *  # Import all models

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def get_url():
    # TEST_DATABASE_URL : uniquement en contexte test explicite. Le service compose `api`
    # l'exporte toujours pour pytest ; sans ce garde-fou, un `alembic` lancé dans ce
    # conteneur viserait recyclic_test au lieu de POSTGRES_DB.
    test_url = os.getenv("TEST_DATABASE_URL")
    if test_url and (
        os.getenv("TESTING") == "true"
        or os.getenv("ENVIRONMENT", "").lower() == "test"
    ):
        return test_url

    # First priority: build URL from individual environment variables (for Docker)
    postgres_host = os.getenv("POSTGRES_HOST")
    postgres_user = os.getenv("POSTGRES_USER")
    postgres_password = os.getenv("POSTGRES_PASSWORD")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")
    # Doit être le même nom de base que POSTGRES_DB du service postgres et le path de DATABASE_URL
    postgres_db = os.getenv("POSTGRES_DB")

    if postgres_host and postgres_user and postgres_password and postgres_db:
        return f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"

    # Même priorité qu'avant le chargement Alembic : DATABASE_URL sur l'INI
    env_database_url = os.getenv("DATABASE_URL")
    if env_database_url:
        return env_database_url

    # Sinon, préférer alembic.ini sqlalchemy.url si défini
    cfg_url = config.get_main_option("sqlalchemy.url")
    if cfg_url:
        return cfg_url

    # Fallback to application settings
    return settings.DATABASE_URL

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Même résolution d'URL que le mode offline (TEST_DATABASE_URL si test explicite, POSTGRES_*, etc.)
    section = dict(config.get_section(config.config_ini_section) or {})
    section["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
