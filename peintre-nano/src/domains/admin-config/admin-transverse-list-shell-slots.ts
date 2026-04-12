/**
 * Convention Story 17.3 — identifiants de slots CREOS partagés pour les pages « liste admin »
 * transverse (`page_key` prefixe `transverse-admin-*`, rail U).
 *
 * Toute nouvelle page liste admin observable doit réutiliser ces trois `slot_id` dans le même ordre :
 * en-tête contextuel (souvent `demo.text.block`), bloc écart contrat, zone liste / placeholder démo.
 *
 * Les contenus `widget_props` restent spécifiques à la route ; seule la structure de slots est homogène.
 */
export const ADMIN_TRANSVERSE_LIST_SHELL_SLOT_IDS = [
  'admin.transverse-list.header',
  'admin.transverse-list.contract-gap',
  'admin.transverse-list.main',
] as const;

export type AdminTransverseListShellSlotId = (typeof ADMIN_TRANSVERSE_LIST_SHELL_SLOT_IDS)[number];
