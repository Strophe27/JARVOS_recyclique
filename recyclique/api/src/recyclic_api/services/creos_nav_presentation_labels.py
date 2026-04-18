"""
Libellés présentation pour les `label_key` du manifeste CREOS navigation-transverse-served.

Aligné sur `contracts/creos/manifests/navigation-transverse-served.json` (Story 5.5).
Ne porte aucune sémantique d'autorisation : uniquement pour résoudre l'affichage côté Peintre_nano.
"""

from __future__ import annotations

from typing import Final

# Clés = `label_key` CREOS ; valeurs = texte UI français (équivalent legacy lisible).
CREOS_NAV_PRESENTATION_LABELS: Final[dict[str, str]] = {
    "nav.home": "Accueil",
    # Clés historiques (parcours démo / fixtures) — absentes de navigation-transverse-served.json servi produit.
    "nav.runtimeDemo": "Démo runtime",
    "nav.demoUnknownWidget": "Widget inconnu",
    "nav.demoGuardedPage": "Démo — accès restreint",
    "nav.admin": "Administration",
    "nav.transverse.dashboard": "Tableau de bord",
    "nav.transverse.admin": "Administration",
    "nav.transverse.admin.access": "Accès et visibilité",
    "nav.transverse.admin.site": "Site et périmètre",
    "nav.transverse.listings.articles": "Articles",
    "nav.transverse.listings.dons": "Dons",
    "nav.transverse.consultation.article": "Fiche article",
    "nav.transverse.consultation.don": "Fiche don",
    "nav.bandeauLiveSandbox": "Exploitation (live)",
    "nav.cashflow.nominal": "Caisse",
    "nav.cashflow.refund": "Remboursement",
    "nav.cashflow.close": "Clôture de caisse",
    "nav.reception.nominal": "Réception",
}
