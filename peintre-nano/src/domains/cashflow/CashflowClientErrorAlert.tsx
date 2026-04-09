import { Alert, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { RecycliqueClientFailure } from '../../api/recyclique-api-error';
import { labelSyncOperationalState } from '../../api/recyclique-api-error';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

export type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

function failureTitle(f: RecycliqueClientFailure): string {
  if (f.networkError) return 'Réseau ou serveur injoignable';
  if (f.httpStatus === 401 || f.httpStatus === 403) return 'Contexte ou permissions';
  if (f.httpStatus >= 500) return 'Erreur serveur';
  return 'Opération refusée ou invalide';
}

function FailureBody(props: { readonly failure: RecycliqueClientFailure }): ReactNode {
  const { failure: f } = props;
  const stateLabel = labelSyncOperationalState(f.state ?? undefined);
  return (
    <>
      {f.httpStatus > 0 ? (
        <Text size="xs" c="dimmed" mb={4} data-testid="cashflow-error-http-status">
          Statut HTTP {f.httpStatus}
        </Text>
      ) : null}
      <Text size="sm" data-testid="cashflow-error-primary">
        {f.code ? (
          <>
            <strong>{f.code}</strong> — {f.message}
          </>
        ) : (
          f.message
        )}
      </Text>
      {f.retryable ? (
        <Text size="xs" c="dimmed" mt="xs">
          Nouvel essai possible — réessayez ou rafraîchissez le contexte si le problème persiste.
        </Text>
      ) : (
        <Text size="xs" c="dimmed" mt="xs">
          Si le problème continue, vérifiez le contexte caisse ou contactez le support avec la référence ci-dessous.
        </Text>
      )}
      {stateLabel ? (
        <Text size="xs" mt="xs" data-testid="cashflow-error-sync-state">
          État signalé par le serveur (sync) : {stateLabel}
        </Text>
      ) : null}
      {f.correlationId ? (
        <Text size="xs" mt="xs" ff="monospace" data-testid="cashflow-error-correlation-id">
          Réf. support : {f.correlationId}
        </Text>
      ) : null}
    </>
  );
}

/**
 * Affichage défensif des erreurs API caisse (AR21) ou messages de validation locale.
 */
export function CashflowClientErrorAlert(props: {
  readonly error: CashflowSubmitSurfaceError | null;
  readonly testId?: string;
}): ReactNode {
  const { error, testId = 'cashflow-submit-error' } = props;
  if (!error) return null;
  if (error.kind === 'local') {
    return (
      <Alert color="red" title="Saisie ou contexte" mt="sm" data-testid={testId}>
        <Text size="sm">{error.message}</Text>
      </Alert>
    );
  }
  return (
    <Alert color="red" title={failureTitle(error.failure)} mt="sm" data-testid={testId}>
      <FailureBody failure={error.failure} />
    </Alert>
  );
}
