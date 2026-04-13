/**
 * Libellés affichés quand l’enveloppe ne fournit pas (ou vide) `presentation_labels` pour une `label_key` CREOS.
 * Présentation uniquement — ne remplace pas les valeurs non vides servies par le backend.
 */
export const NAV_LABEL_PRESENTATION_FALLBACKS: Readonly<Record<string, string>> = {
  'nav.home': 'Accueil',
  'nav.runtimeDemo': 'Parcours démo',
  'nav.demoUnknownWidget': 'Démo — cas limite',
  'nav.demoGuardedPage': 'Démo — accès restreint',
  'nav.admin': 'Administration (démo)',
  'nav.transverse.dashboard': 'Tableau de bord',
  'nav.transverse.dashboard.benevole': 'Dashboard personnel',
  'nav.transverse.dashboard.personal': 'Dashboard personnel',
  'nav.transverse.admin': 'Administration',
  'nav.transverse.admin.access': 'Accès et visibilité',
  'nav.transverse.admin.site': 'Site et périmètre',
  'nav.transverse.admin.users': 'Utilisateurs',
  'nav.transverse.admin.cashRegisters': 'Caisses enregistrées',
  'nav.transverse.admin.sites': 'Sites enregistrés',
  'nav.transverse.admin.sessionManager': 'Sessions de Caisse',
  'nav.transverse.admin.receptionStats': 'Statistiques réception (supervision)',
  'nav.transverse.admin.receptionSessions': 'Sessions de réception (tickets)',
  'nav.transverse.admin.reportsSupervision': 'Rapports et supervision caisse',
  'nav.transverse.listings.articles': 'Articles (stock)',
  'nav.transverse.listings.dons': 'Dons (entrée)',
  'nav.transverse.consultation.article': 'Fiche article',
  'nav.transverse.consultation.don': 'Fiche don',
  'nav.bandeauLiveSandbox': 'Bandeau temps réel',
  'nav.cashflow.nominal': 'Caisse',
  'nav.cashflow.refund': 'Remboursement',
  'nav.cashflow.close': 'Clôture de caisse',
  'nav.reception.nominal': 'Réception',
};
