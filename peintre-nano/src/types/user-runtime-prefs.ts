/**
 * UserRuntimePrefs — personnalisation **locale non métier** (densité UI, panneaux, onboarding…).
 * Propriétaire : runtime frontend. Ne doit **jamais** devenir une seconde source de vérité pour permissions ou navigation.
 */

export type UiDensity = 'comfortable' | 'compact';

export function isUiDensity(value: string): value is UiDensity {
  return value === 'comfortable' || value === 'compact';
}

export interface UserRuntimePrefs {
  readonly uiDensity: UiDensity;
  readonly onboardingCompleted: boolean;
}
