/**
 * Feature flags pour le frontend Recyclic
 * Centralise la gestion des fonctionnalités expérimentales/optionnelles
 */

import { z } from 'zod';

// Schéma de validation pour les feature flags
const FeatureFlagsSchema = z.object({
  liveReceptionStats: z.boolean().default(false),
  guidedTours: z.boolean().default(false),
  enableCashHotkeys: z.boolean().default(false),
  cashChequesV2: z.boolean().default(false), // B39-P6: Nouveau mode paiement chèque aligné sur espèces
  // Ajouter d'autres flags ici selon les besoins
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// Valeurs par défaut des feature flags
const FEATURE_DEFAULTS: Record<keyof FeatureFlags, boolean> = {
  liveReceptionStats: false,
  guidedTours: false,
  enableCashHotkeys: true, // B39-P1: Raccourcis clavier AZERTY pour alignement avec réception
  cashChequesV2: false,
};

/**
 * Récupère la valeur d'un feature flag depuis les variables d'environnement
 * Format: VITE_FEATURE_{FLAG_NAME} (convention Vite)
 */
function getFeatureFlag(flagName: keyof FeatureFlags): boolean {
  const envVar = `VITE_FEATURE_${flagName.toUpperCase()}`;
  const value = import.meta.env[envVar];

  // Validation stricte de la valeur
  if (value === undefined || value === null) {
    // Valeur par défaut si non défini
    return FEATURE_DEFAULTS[flagName];
  }

  const trimmedValue = value.trim().toLowerCase();

  // Parse la valeur string en boolean
  if (trimmedValue === 'true' || trimmedValue === '1' || trimmedValue === 'yes' || trimmedValue === 'on') {
    return true;
  }
  if (trimmedValue === 'false' || trimmedValue === '0' || trimmedValue === 'no' || trimmedValue === 'off') {
    return false;
  }

  // Valeur invalide, utiliser la valeur par défaut
  console.warn(`Invalid feature flag value for ${flagName}: "${value}". Using default.`);
  return FEATURE_DEFAULTS[flagName];
}

/**
 * Hook pour utiliser un feature flag
 * @param flagName - Nom du feature flag
 * @returns Valeur booléenne du flag
 */
export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
  return getFeatureFlag(flagName);
}

/**
 * Récupère tous les feature flags actifs
 * Utile pour le debugging ou les logs
 */
export function getAllFeatureFlags(): FeatureFlags {
  const flags = Object.keys(FeatureFlagsSchema.shape) as (keyof FeatureFlags)[];
  return flags.reduce((acc, flag) => {
    acc[flag] = getFeatureFlag(flag);
    return acc;
  }, {} as FeatureFlags);
}

/**
 * Vérifie si un feature flag est activé
 * Alias pour useFeatureFlag pour une utilisation plus directe
 */
export const isFeatureEnabled = useFeatureFlag;
