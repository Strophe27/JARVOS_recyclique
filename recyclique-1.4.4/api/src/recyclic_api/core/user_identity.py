"""Identifiants utilisateur pour journaux / audit (logique pure, sans ORM).

Libellé court : **username** non vide après ``strip`` uniquement. Un second argument
optionnel reste accepté pour compatibilité d'appel historique et est **ignoré**.
"""


def username_for_audit(username: str | None, _ignored_legacy_contact: str | None = None) -> str | None:
    """
    Chaîne d'audit / libellé court : **username** non vide après ``strip`` uniquement.

    Le second argument est **ignoré** (plus de repli sur un identifiant externe hérité).
    """
    if username is None:
        return None
    s = username.strip()
    return s if s else None
