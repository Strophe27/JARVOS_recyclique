# Fixtures pour tests des scripts CLI (bootstrap_superadmin).

from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from api.tests.conftest import Base, TEST_ENGINE, TestingSessionLocal


def _reset_db() -> None:
    with TEST_ENGINE.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def script_db_session() -> Generator[Session, None, None]:
    """Session DB propre pour tests de scripts (bootstrap_superadmin)."""
    _reset_db()
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        _reset_db()
