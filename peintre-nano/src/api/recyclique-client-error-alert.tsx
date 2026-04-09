import { Alert, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { CashflowSubmitSurfaceError } from '../domains/cashflow/cashflow-submit-error';
import type { RecycliqueClientFailure } from './recyclique-api-error';
import { labelSyncOperationalState } from './recyclique-api-error';

function failureTitle(f: RecycliqueClientFailure): string {
  if (f.networkError) return 'Réseau ou serveur injoignable';
  if (f.httpStatus === 401 || f.httpStatus === 403) return 'Contexte ou permissions';
  if (f.httpStatus >= 500) return 'Erreur serveur';
  return 'Opération refusée ou invalide';
}

function FailureBody(props: {
  readonly failure: RecycliqueClientFailure;
  readonly ids: {
    readonly httpStatus: string;
    readonly primary: string;
    readonly syncState: string;
    readonly correlationId: string;
  };
  readonly supportContextHint?: string;
}): ReactNode {
  const { failure: f, ids, supportContextHint } = props;
  const stateLabel = labelSyncOperationalState(f.state ?? undefined);
  const hint = supportContextHint?.trim() || 'le contexte';
  return (
    <>
      {f.httpStatus > 0 ? (
        <Text size="xs" c="dimmed" mb={4} data-testid={ids.httpStatus}>
          Statut HTTP {f.httpStatus}
        </Text>
      ) : null}
      <Text size="sm" data-testid={ids.primary}>
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
          Nouvel essai possible — réessayez ou rafraîchissez {hint} si le problème persiste.
        </Text>
      ) : (
        <Text size="xs" c="dimmed" mt="xs">
          Impossible de confirmer côté serveur — vérifiez {hint} ou contactez le support avec la référence ci-dessous
          si besoin.
        </Text>
      )}
      {stateLabel ? (
        <Text size="xs" mt="xs" data-testid={ids.syncState}>
          État signalé par le serveur (sync) : {stateLabel}
        </Text>
      ) : null}
      {f.correlationId ? (
        <Text size="xs" mt="xs" ff="monospace" data-testid={ids.correlationId}>
          Réf. support : {f.correlationId}
        </Text>
      ) : null}
    </>
  );
}

/**
 * Alerte erreur API / locale alignée AR21 — partagée caisse, réception, etc.
 * @param detailTestIdPrefix — préfixes des `data-testid` internes (ex. `cashflow-error` pour rétrocompat tests caisse).
 * @param supportContextHint — phrase courte : « le contexte caisse », « le contexte réception » (sinon générique).
 */
export function RecycliqueClientErrorAlert(props: {
  readonly error: CashflowSubmitSurfaceError | null;
  readonly testId?: string;
  /** Préfixe pour `-http-status`, `-primary`, `-sync-state`, `-correlation-id` (défaut = testId). */
  readonly detailTestIdPrefix?: string;
  readonly supportContextHint?: string;
}): ReactNode {
  const { error, testId = 'recyclique-client-error', detailTestIdPrefix, supportContextHint } = props;
  const prefix = detailTestIdPrefix ?? testId;
  const ids = {
    httpStatus: `${prefix}-http-status`,
    primary: `${prefix}-primary`,
    syncState: `${prefix}-sync-state`,
    correlationId: `${prefix}-correlation-id`,
  };
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
      <FailureBody failure={error.failure} ids={ids} supportContextHint={supportContextHint} />
    </Alert>
  );
}
