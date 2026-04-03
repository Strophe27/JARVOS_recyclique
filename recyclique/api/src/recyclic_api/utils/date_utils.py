"""
Utilitaires pour le formatage et le parsing de dates.

Standard ISO 8601 pour la communication frontend/backend.
B50-P2: Standardisation du format de dates pour éviter les problèmes de parsing.
"""
from datetime import datetime, timezone
from typing import Optional


def parse_iso_datetime(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parse une string ISO 8601 en datetime.
    
    Supporte les formats suivants :
    - ISO 8601 avec 'Z' (UTC) : "2025-12-10T00:00:00.000Z"
    - ISO 8601 avec timezone : "2025-12-10T00:00:00.000+00:00"
    - ISO 8601 sans timezone : "2025-12-10T00:00:00.000"
    
    Args:
        date_str: String ISO 8601 à parser, ou None
        
    Returns:
        datetime object (timezone-aware si possible), ou None si date_str est None
        
    Raises:
        ValueError: Si le format de date est invalide
        
    Example:
        >>> parse_iso_datetime("2025-12-10T00:00:00.000Z")
        datetime.datetime(2025, 12, 10, 0, 0, 0, tzinfo=timezone.utc)
    """
    if date_str is None:
        return None
    
    if not isinstance(date_str, str):
        raise ValueError(f"Expected string, got {type(date_str)}")
    
    # Normaliser le format 'Z' (UTC) en '+00:00' pour compatibilité Python < 3.11
    # datetime.fromisoformat() ne supporte pas 'Z' directement avant Python 3.11
    normalized = date_str
    if normalized.endswith('Z'):
        normalized = normalized.replace('Z', '+00:00')
    
    try:
        parsed = datetime.fromisoformat(normalized)
        # S'assurer que le datetime est timezone-aware
        if parsed.tzinfo is None:
            # Si pas de timezone, assumer UTC
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError as e:
        raise ValueError(f"Format de date invalide: {date_str}. Erreur: {e}")


def format_iso_datetime(dt: Optional[datetime]) -> Optional[str]:
    """
    Formate un datetime en string ISO 8601 avec 'Z' (UTC).
    
    Format standard : "YYYY-MM-DDTHH:MM:SS.sssZ"
    
    Args:
        dt: datetime object à formater, ou None
        
    Returns:
        String ISO 8601 avec 'Z' (UTC), ou None si dt est None
        
    Example:
        >>> dt = datetime(2025, 12, 10, 0, 0, 0, tzinfo=timezone.utc)
        >>> format_iso_datetime(dt)
        "2025-12-10T00:00:00.000Z"
    """
    if dt is None:
        return None
    
    # Convertir en UTC si nécessaire
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    
    # Formater en ISO 8601 avec 'Z'
    iso_str = dt.isoformat()
    # Remplacer '+00:00' par 'Z' pour le format standard
    if iso_str.endswith('+00:00'):
        iso_str = iso_str.replace('+00:00', 'Z')
    elif iso_str.endswith('-00:00'):
        iso_str = iso_str.replace('-00:00', 'Z')
    
    return iso_str


def parse_iso_date_only(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parse une date seule (YYYY-MM-DD) en datetime à minuit UTC.
    
    Args:
        date_str: String date seule (YYYY-MM-DD), ou None
        
    Returns:
        datetime object à minuit UTC, ou None si date_str est None
        
    Raises:
        ValueError: Si le format de date est invalide
        
    Example:
        >>> parse_iso_date_only("2025-12-10")
        datetime.datetime(2025, 12, 10, 0, 0, 0, tzinfo=timezone.utc)
    """
    if date_str is None:
        return None
    
    if not isinstance(date_str, str):
        raise ValueError(f"Expected string, got {type(date_str)}")
    
    try:
        # Parser la date seule
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        # Convertir en UTC à minuit
        return dt.replace(tzinfo=timezone.utc)
    except ValueError as e:
        raise ValueError(f"Format de date invalide (attendu YYYY-MM-DD): {date_str}. Erreur: {e}")

