/**
 * UserRuntimePrefs — personnalisation **locale non métier** (densité UI, panneaux, onboarding…).
 * Propriétaire : runtime frontend. Ne doit **jamais** devenir une seconde source de vérité pour permissions ou navigation.
 *
 * **Exclu volontairement :** `permissionKeys`, routes, `siteId` métier, ou tout champ confondable avec `ContextEnvelope`.
 */

export type UiDensity = 'comfortable' | 'compact';

export function isUiDensity(value: string): value is UiDensity {
  return value === 'comfortable' || value === 'compact';
}

export interface UserRuntimePrefs {
  readonly uiDensity: UiDensity;
  /** Présentation : panneau latéral (aside) ouvert — n’ouvre aucune route ni permission supplémentaire. */
  readonly sidebarPanelOpen: boolean;
  readonly onboardingCompleted: boolean;
}

export const DEFAULT_USER_RUNTIME_PREFS: UserRuntimePrefs = {
  uiDensity: 'comfortable',
  sidebarPanelOpen: true,
  onboardingCompleted: false,
};

/** Fusionne une valeur JSON stockée avec les défauts ; ignore les champs inconnus ou invalides. */
export function normalizeUserRuntimePrefs(input: unknown): UserRuntimePrefs {
  if (input === null || typeof input !== 'object') {
    return { ...DEFAULT_USER_RUNTIME_PREFS };
  }
  const o = input as Record<string, unknown>;
  const uiDensity =
    typeof o.uiDensity === 'string' && isUiDensity(o.uiDensity)
      ? o.uiDensity
      : DEFAULT_USER_RUNTIME_PREFS.uiDensity;
  const sidebarPanelOpen =
    typeof o.sidebarPanelOpen === 'boolean'
      ? o.sidebarPanelOpen
      : DEFAULT_USER_RUNTIME_PREFS.sidebarPanelOpen;
  const onboardingCompleted =
    typeof o.onboardingCompleted === 'boolean'
      ? o.onboardingCompleted
      : DEFAULT_USER_RUNTIME_PREFS.onboardingCompleted;
  return { uiDensity, sidebarPanelOpen, onboardingCompleted };
}
