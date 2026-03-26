"""Identifiants utilisateur pour journaux / audit (logique pure, sans ORM).

Le nom ``username_or_telegram_id`` est historique ; un refactor d'import global
(admin) est volontairement évité — le second argument reste ignoré.
"""


def username_or_telegram_id(username: str | None, _telegram_id: str | None) -> str | None:
    """
    Chaîne d'audit / libellé court : **username** non vide après ``strip`` uniquement.

    Le second argument reste pour la compatibilité d'appel historique et est **ignoré**
    (ne plus servir de pseudo de secours dans les journaux).
    """
    if username is None:
        return None
    s = username.strip()
    return s if s else None
