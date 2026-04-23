"""
Tests directs du service d'assignation de groupes (story 26.2, non-régression extraction).
Les scénarios HTTP complets restent dans ``test_user_groups`` et le contract dans
``test_groups_and_permissions``."""
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.security import hash_password
from recyclic_api.models.permission import Group
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.permission import UserGroupUpdateRequest
from recyclic_api.services.admin_user_groups_assignment_service import (
    GroupNotFoundForAssignment,
    InvalidGroupIdForAssignment,
    UserNotFoundForAssignment,
    update_user_groups_assignment,
)


def _user(username_suffix: str, role: UserRole = UserRole.USER) -> User:
    return User(
        id=uuid4(),
        username=f"svc_ug_{username_suffix}_{uuid4().hex[:8]}@test.local",
        hashed_password=hash_password("p"),
        role=role,
        status=UserStatus.APPROVED if role == UserRole.USER else UserStatus.ACTIVE,
        is_active=True,
    )


class TestUpdateUserGroupsAssignmentService:
    def test_success_assigns_groups(self, db_session: Session):
        admin = _user("admin", role=UserRole.ADMIN)
        target = _user("target")
        g1 = Group(id=uuid4(), name="SG1", description="a")
        g2 = Group(id=uuid4(), name="SG2", description="b")
        db_session.add_all([admin, target, g1, g2])
        db_session.commit()
        db_session.refresh(target)

        req = UserGroupUpdateRequest(
            group_ids=[str(g1.id), str(g2.id)],
        )
        out = update_user_groups_assignment(
            db_session,
            user_id=str(target.id),
            group_update=req,
            admin_user=admin,
        )

        assert out.success is True
        assert set(out.data["group_ids"]) == {str(g1.id), str(g2.id)}
        db_session.refresh(target)
        assert {g.id for g in target.groups} == {g1.id, g2.id}

    def test_user_not_found(self, db_session: Session):
        admin = _user("admin2", role=UserRole.ADMIN)
        db_session.add(admin)
        db_session.commit()

        with pytest.raises(UserNotFoundForAssignment):
            update_user_groups_assignment(
                db_session,
                user_id=str(uuid4()),
                group_update=UserGroupUpdateRequest(group_ids=[]),
                admin_user=admin,
            )

    def test_invalid_user_id_uuid(self, db_session: Session):
        admin = _user("admin3", role=UserRole.ADMIN)
        db_session.add(admin)
        db_session.commit()

        with pytest.raises(UserNotFoundForAssignment):
            update_user_groups_assignment(
                db_session,
                user_id="not-a-uuid",
                group_update=UserGroupUpdateRequest(group_ids=[]),
                admin_user=admin,
            )

    def test_invalid_group_id_raises(self, db_session: Session):
        admin = _user("admin4", role=UserRole.ADMIN)
        target = _user("t2")
        db_session.add_all([admin, target])
        db_session.commit()

        with pytest.raises(InvalidGroupIdForAssignment) as ei:
            update_user_groups_assignment(
                db_session,
                user_id=str(target.id),
                group_update=UserGroupUpdateRequest(group_ids=["bad-uuid"]),
                admin_user=admin,
            )
        assert ei.value.group_id == "bad-uuid"

    def test_group_not_found_raises(self, db_session: Session):
        admin = _user("admin5", role=UserRole.ADMIN)
        target = _user("t3")
        db_session.add_all([admin, target])
        db_session.commit()
        missing = str(uuid4())

        with pytest.raises(GroupNotFoundForAssignment) as ei:
            update_user_groups_assignment(
                db_session,
                user_id=str(target.id),
                group_update=UserGroupUpdateRequest(group_ids=[missing]),
                admin_user=admin,
            )
        assert ei.value.group_id == missing
