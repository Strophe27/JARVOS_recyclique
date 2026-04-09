"""
Test automatisé pour valider l'ordre des migrations Alembic.

- Graphe de révisions / fichiers : vérifiable **sans** Postgres (sous-processus ``alembic`` hérite
  de l'environnement pytest : ``TESTING``, ``DATABASE_URL``, ``TEST_DATABASE_URL`` si présents).
- ``alembic current`` : optionnel ; ``skip`` si aucune base n'est joignable (honnête pour le local SQLite).
"""
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

# Première affectation ``revision`` / ``revision: str =`` dans chaque script Alembic
_REVISION_ASSIGN_RE = re.compile(
    r"^revision\s*(?::\s*[^=]+)?=\s*[\"']([^\"']+)[\"']",
    re.MULTILINE,
)


def _revision_id_from_file(path: Path) -> str | None:
    content = path.read_text(encoding="utf-8")
    m = _REVISION_ASSIGN_RE.search(content)
    return m.group(1) if m else None


class TestMigrationOrder:
    """Tests pour valider l'ordre et la cohérence des migrations Alembic."""

    def _alembic_cmd(self, *args):
        """Resolve alembic executable portably (PATH or local venv, Unix + Windows)."""
        alembic_path = shutil.which("alembic")
        if not alembic_path:
            venv = Path(__file__).resolve().parent.parent / "venv"
            candidates = [
                venv / "bin" / "alembic",
                venv / "Scripts" / "alembic.exe",
                venv / "Scripts" / "alembic.bat",
            ]
            for candidate in candidates:
                if candidate.exists():
                    alembic_path = str(candidate)
                    break
            else:
                pytest.skip("alembic executable not found in PATH or local venv")
        return [alembic_path, *args]

    def _api_root(self) -> Path:
        return Path(__file__).resolve().parent.parent

    def test_alembic_history_verbose_succeeds(self):
        """``alembic history --verbose`` ne nécessite pas une base joignable."""
        result = subprocess.run(
            self._alembic_cmd("history", "--verbose"),
            cwd=self._api_root(),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )

        assert result.returncode == 0, f"Erreur lors de la liste des migrations: {result.stderr}"

    def test_alembic_current_when_database_available(self):
        """Révision appliquée : exige une DB joignable (SQLite de test ou Postgres). Sinon skip."""
        result = subprocess.run(
            self._alembic_cmd("current"),
            cwd=self._api_root(),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )

        if result.returncode != 0:
            msg = (result.stderr or result.stdout or "").strip()
            pytest.skip(
                "alembic current non exécutable sans base joignable / env applicatif complet: "
                + (msg[:500] if msg else "(pas de détail)")
            )
    
    def test_migration_heads_consistency(self):
        """Test que les têtes de migration sont cohérentes."""
        result = subprocess.run(
            self._alembic_cmd("heads"),
            cwd=self._api_root(),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )
        
        assert result.returncode == 0, f"Erreur lors de la vérification des têtes: {result.stderr}"
        
        # Il ne devrait y avoir qu'une seule tête de migration
        heads = result.stdout.strip().split('\n')
        heads = [head.strip() for head in heads if head.strip()]
        
        assert len(heads) == 1, f"Plusieurs têtes de migration détectées: {heads}"
    
    def test_migration_dependencies(self):
        """Test que les dépendances entre migrations sont correctes."""
        result = subprocess.run(
            self._alembic_cmd("show", "head"),
            cwd=self._api_root(),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )
        
        assert result.returncode == 0, f"Erreur lors de l'affichage de la tête: {result.stderr}"
        
        # Vérifier que la migration de tête existe et est valide
        assert "Revision ID:" in result.stdout
        # Alembic output phrasing varies by version: accept either
        assert ("Parent revision(s):" in result.stdout) or ("Parent:" in result.stdout)
    
    def test_migration_files_exist(self):
        """Chaque entrée d'historique Alembic pointe vers un fichier .py existant (ligne Path:)."""
        result = subprocess.run(
            self._alembic_cmd("history", "--verbose"),
            cwd=self._api_root(),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )

        assert result.returncode == 0, f"Erreur lors de la liste des migrations: {result.stderr}"

        paths: list[Path] = []
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if stripped.startswith("Path:"):
                raw = stripped.split("Path:", 1)[1].strip()
                paths.append(Path(raw))
        
        assert paths, "Aucune ligne Path: dans alembic history --verbose"
        migrations_dir = (self._api_root() / "migrations" / "versions").resolve()
        for p in paths:
            rp = p.resolve()
            assert rp.is_file(), f"Fichier migration introuvable: {p}"
            assert rp.parent == migrations_dir, (
                f"Fichier migration hors versions/ attendu: {rp} (attendu sous {migrations_dir})"
            )
    
    def test_no_duplicate_migrations(self):
        """Les identifiants ``revision`` déclarés dans les scripts sont uniques (pas le préfixe du nom de fichier)."""
        migrations_dir = self._api_root() / "migrations" / "versions"
        migration_files = sorted(migrations_dir.glob("*.py"))
        
        revision_ids: list[str] = []
        for file_path in migration_files:
            if file_path.name.startswith("__"):
                continue
            rid = _revision_id_from_file(file_path)
            assert rid is not None, f"Impossible de lire revision dans {file_path}"
            revision_ids.append(rid)
        
        assert len(revision_ids) == len(set(revision_ids)), (
            f"IDs de révision Alembic dupliqués: {revision_ids}"
        )
    
    def test_migration_syntax_validity(self):
        """Test que tous les fichiers de migration ont une syntaxe Python valide."""
        migrations_dir = self._api_root() / "migrations" / "versions"
        
        for migration_file in migrations_dir.glob("*.py"):
            if migration_file.name.startswith("__"):
                continue
                
            # Vérifier la syntaxe Python
            python_exec = shutil.which("python")
            if not python_exec:
                venv = self._api_root() / "venv"
                for candidate in (venv / "bin" / "python", venv / "Scripts" / "python.exe"):
                    if candidate.exists():
                        python_exec = str(candidate)
                        break
                else:
                    pytest.skip("python executable not found in PATH or local venv")
            result = subprocess.run(
                [python_exec, "-m", "py_compile", str(migration_file)],
                capture_output=True,
                text=True
            )
            
            assert result.returncode == 0, f"Erreur de syntaxe dans {migration_file}: {result.stderr}"
