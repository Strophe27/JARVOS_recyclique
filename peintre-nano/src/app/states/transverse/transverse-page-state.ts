import type { RuntimeRejectionSeverity } from '../../../runtime/report-runtime-fallback';

/**
 * Configuration d’état de surface pour le slot transverse (5.7) — aucune permission ni vérité métier.
 */
export type TransversePageStateConfig =
  | { readonly kind: 'nominal' }
  | { readonly kind: 'loading'; readonly message?: string }
  | { readonly kind: 'empty'; readonly title?: string; readonly message?: string }
  | {
      readonly kind: 'error';
      readonly message: string;
      readonly code: string;
      readonly severity?: RuntimeRejectionSeverity;
    };

export const DEFAULT_TRANSVERSE_PAGE_STATE: TransversePageStateConfig = { kind: 'nominal' };
