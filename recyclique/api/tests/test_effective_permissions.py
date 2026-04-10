"""Story 2.3 : calcul additif, périmètre site, cohérence enveloppe / get_user_permissions."""

import uuid

import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.auth import get_user_permissions
from recyclic_api.models.permission import Group, Permission
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password
from recyclic_api.services.context_envelope_service import build_context_envelope
from recyclic_api.services.effective_permissions import (
    compute_effective_permission_keys,
    group_in_active_scope,
    user_has_effective_permission,
)


@pytest.fixture
def site_a(db_session: Session) -> Site:
    s = Site(id=uuid.uuid4(), name="Site A", is_active=True)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


@pytest.fixture
def site_b(db_session: Session) -> Site:
    s = Site(id=uuid.uuid4(), name="Site B", is_active=True)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


class TestEffectivePermissions:
    def test_union_multi_groupes(self, db_session: Session):
        p1 = Permission(name="perm.a", description="A")
        p2 = Permission(name="perm.b", description="B")
        db_session.add_all([p1, p2])
        g1 = Group(name="G1", description="x", key="g1-union")
        g2 = Group(name="G2", description="y", key="g2-union")
        g1.permissions = [p1]
        g2.permissions = [p2]
        db_session.add_all([g1, g2])
        u = User(
            id=uuid.uuid4(),
            username="u_union",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        u.groups = [g1, g2]
        db_session.add(u)
        db_session.commit()

        keys = compute_effective_permission_keys(u, db_session)
        assert keys == ["perm.a", "perm.b"]

    def test_groupe_site_exclu_si_utilisateur_autre_site(
        self, db_session: Session, site_a: Site, site_b: Site
    ):
        p_site = Permission(name="perm.site", description="S")
        db_session.add(p_site)
        g_site = Group(
            name="G Site B",
            description="",
            key="g-site-b",
            site_id=site_b.id,
        )
        g_site.permissions = [p_site]
        db_session.add(g_site)
        u = User(
            id=uuid.uuid4(),
            username="u_site_a",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=site_a.id,
        )
        u.groups = [g_site]
        db_session.add(u)
        db_session.commit()

        assert compute_effective_permission_keys(u, db_session) == []

    def test_groupe_global_inclus_sans_site_utilisateur(self, db_session: Session):
        p = Permission(name="perm.global", description="G")
        db_session.add(p)
        g = Group(name="Global", description="", key="g-global", site_id=None)
        g.permissions = [p]
        u = User(
            id=uuid.uuid4(),
            username="u_no_site",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=None,
        )
        u.groups = [g]
        db_session.add(u)
        db_session.commit()

        assert compute_effective_permission_keys(u, db_session) == ["perm.global"]

    def test_enveloppe_egal_get_user_permissions(self, db_session: Session):
        p = Permission(name="perm.env", description="E")
        db_session.add(p)
        g = Group(name="Env", description="", key="g-env")
        g.permissions = [p]
        u = User(
            id=uuid.uuid4(),
            username="u_env",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        u.groups = [g]
        db_session.add(u)
        db_session.commit()

        env = build_context_envelope(db_session, u.id)
        perms = get_user_permissions(u, db_session)
        assert env.permission_keys == perms == ["perm.env"]

    def test_groupe_site_inclus_si_meme_site_que_utilisateur(
        self, db_session: Session, site_a: Site
    ):
        p = Permission(name="perm.meme.site", description="OK")
        db_session.add(p)
        g = Group(
            name="G Site A",
            description="",
            key="g-site-a-match",
            site_id=site_a.id,
        )
        g.permissions = [p]
        u = User(
            id=uuid.uuid4(),
            username="u_match_site",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=site_a.id,
        )
        u.groups = [g]
        db_session.add(u)
        db_session.commit()

        assert compute_effective_permission_keys(u, db_session) == ["perm.meme.site"]

    def test_union_dedup_meme_permission_sur_deux_groupes(self, db_session: Session):
        p = Permission(name="perm.dedup", description="D")
        db_session.add(p)
        g1 = Group(name="Gdup1", description="", key="g-dup-1")
        g2 = Group(name="Gdup2", description="", key="g-dup-2")
        g1.permissions = [p]
        g2.permissions = [p]
        u = User(
            id=uuid.uuid4(),
            username="u_dedup",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        u.groups = [g1, g2]
        db_session.add_all([g1, g2, u])
        db_session.commit()

        assert compute_effective_permission_keys(u, db_session) == ["perm.dedup"]

    def test_utilisateur_sans_groupes_liste_vide(self, db_session: Session):
        u = User(
            id=uuid.uuid4(),
            username="u_no_groups",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()

        assert compute_effective_permission_keys(u, db_session) == []
        assert user_has_effective_permission(u, "any.perm", db_session) is False

    def test_user_has_effective_permission_cohérent_avec_compute(self, db_session: Session):
        p1 = Permission(name="perm.x", description="X")
        p2 = Permission(name="perm.y", description="Y")
        db_session.add_all([p1, p2])
        g = Group(name="Gcoh", description="", key="g-coh")
        g.permissions = [p1, p2]
        u = User(
            id=uuid.uuid4(),
            username="u_coh",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        u.groups = [g]
        db_session.add(u)
        db_session.commit()

        keys = compute_effective_permission_keys(u, db_session)
        assert keys == ["perm.x", "perm.y"]
        for k in keys:
            assert user_has_effective_permission(u, k, db_session) is True
        assert user_has_effective_permission(u, "perm.absent", db_session) is False

    def test_group_in_active_scope_global_toujours_true(self, db_session: Session):
        g = Group(name="Gscope", description="", key="g-scope-global", site_id=None)
        assert group_in_active_scope(g, None) is True
        assert group_in_active_scope(g, uuid.uuid4()) is True

    def test_admin_user_has_permission_true_meme_sans_ligne_permission(
        self, db_session: Session
    ):
        """ADMIN : raccourci rôle — toute clé est acceptée pour le booléen (aligné auth legacy)."""
        u = User(
            id=uuid.uuid4(),
            username="u_admin_scope",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()

        assert user_has_effective_permission(u, "inventee.mais.admin", db_session) is True

    def test_context_envelope_includes_transverse_dashboard_view_for_admin(
        self, db_session: Session
    ):
        """CREOS / Peintre_nano : clé UI `transverse.dashboard.view` émise pour les admins (hors table permissions)."""
        u = User(
            id=uuid.uuid4(),
            username="u_admin_dash",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()
        env = build_context_envelope(db_session, u.id)
        assert "transverse.dashboard.view" in env.permission_keys
        assert "transverse.admin.view" in env.permission_keys

    def test_context_envelope_includes_transverse_dashboard_view_when_reports_view(
        self, db_session: Session, site_a: Site
    ):
        """Utilisateur standard : clé dashboard transverse si `reports.view` est dans le périmètre effectif."""
        p = Permission(name="reports.view", description="Rapports")
        db_session.add(p)
        g = Group(
            name="G reports",
            description="",
            key="g-reports-dash",
            site_id=site_a.id,
        )
        g.permissions = [p]
        u = User(
            id=uuid.uuid4(),
            username="u_reports_dash",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=site_a.id,
        )
        u.groups = [g]
        db_session.add_all([g, u])
        db_session.commit()
        env = build_context_envelope(db_session, u.id)
        assert "reports.view" in env.permission_keys
        assert "transverse.dashboard.view" in env.permission_keys
