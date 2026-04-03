"""Invariants de layout mono-repo (story 2.2b) — racine backend unique sous recyclique/api."""

from pathlib import Path


def test_recyclic_api_package_resolved_under_repackaged_root():
    """Le package importé doit résoudre sous recyclique/api, jamais depuis recyclique-1.4.4/api."""
    import recyclic_api

    pkg_file = Path(recyclic_api.__file__).resolve()
    normalized = str(pkg_file).replace("\\", "/").lower()
    assert "recyclique/api" in normalized, (
        f"recyclic_api doit vivre sous recyclique/api, obtenu: {pkg_file}"
    )
    assert "recyclique-1.4.4" not in normalized, (
        f"Le package ne doit pas être chargé depuis recyclique-1.4.4: {pkg_file}"
    )


def test_pyproject_at_canonical_api_root_next_to_tests():
    """Gate Story Runner : pyproject.toml au même arbre que tests/ (recyclique/api)."""
    tests_dir = Path(__file__).resolve().parent
    api_root = tests_dir.parent
    assert api_root.name == "api"
    assert api_root.parent.name == "recyclique"
    assert (api_root / "pyproject.toml").is_file()
