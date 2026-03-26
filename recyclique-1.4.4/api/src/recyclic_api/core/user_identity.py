"""Identifiants utilisateur pour journaux / audit (logique pure, sans ORM)."""


def username_or_telegram_id(username: str | None, telegram_id: str | None) -> str | None:
    """
    Équivalent strict de ``username or telegram_id`` (chaîne vide → repli sur telegram_id).
    """
    return username or telegram_id
