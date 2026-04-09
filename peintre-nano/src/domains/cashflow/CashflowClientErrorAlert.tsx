import type { ReactNode } from 'react';
import { RecycliqueClientErrorAlert } from '../../api/recyclique-client-error-alert';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

export type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

/**
 * Affichage défensif des erreurs API caisse (AR21) ou messages de validation locale.
 * Délègue à `RecycliqueClientErrorAlert` avec préfixes de test historiques `cashflow-error-*`.
 */
export function CashflowClientErrorAlert(props: {
  readonly error: CashflowSubmitSurfaceError | null;
  readonly testId?: string;
}): ReactNode {
  const { error, testId = 'cashflow-submit-error' } = props;
  return (
    <RecycliqueClientErrorAlert
      error={error}
      testId={testId}
      detailTestIdPrefix="cashflow-error"
      supportContextHint="le contexte caisse"
    />
  );
}
