import { Alert, Button, Modal, Table, Text } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCashSessionDetail,
  type CashSessionDetailV1,
} from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { PERMISSION_CASHFLOW_SALE_CORRECT } from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowSaleCorrectionWizard } from './CashflowSaleCorrectionWizard';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

function sessionIdFromPath(pathname: string): string | null {
  const m = /^\/admin\/cash-sessions\/([^/]+)\/?$/.exec(pathname);
  return m?.[1]?.trim() ? m[1]!.trim() : null;
}

function saleLifecycle(s: Record<string, unknown>): string {
  return typeof s.lifecycle_status === 'string' ? s.lifecycle_status : '';
}

function saleIdOf(s: Record<string, unknown>): string {
  return typeof s.id === 'string' ? s.id : '';
}

/**
 * Story 6.8 — journal session admin : chargement GET détail session, liste ventes, correction par ligne (wizard réutilisé).
 */
export function AdminCashSessionDetailWidget(_props: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const canCorrect = envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_SALE_CORRECT);

  const [pathname, setPathname] = useState(
    () => (typeof window !== 'undefined' ? window.location.pathname : ''),
  );
  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const sessionId = useMemo(() => sessionIdFromPath(pathname), [pathname]);

  const [session, setSession] = useState<CashSessionDetailV1 | null>(null);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [correctionSaleId, setCorrectionSaleId] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await getCashSessionDetail(sessionId, auth);
      if (!res.ok) {
        setSession(null);
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      setSession(res.session);
    } finally {
      setBusy(false);
    }
  }, [sessionId, auth]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (!sessionId) {
    return (
      <Alert color="gray" title="URL attendue" data-testid="admin-cash-session-bad-url">
        <Text size="sm">
          Ouvrez une URL du type <code>/admin/cash-sessions/&lt;id&gt;</code> (ex. lien après clôture ou bookmark
          admin).
        </Text>
      </Alert>
    );
  }

  const sales = Array.isArray(session?.sales) ? session!.sales! : [];

  return (
    <div data-testid="admin-cash-session-detail">
      <Text fw={600} mb="xs">
        Session {sessionId}
      </Text>
      {session ? (
        <Text size="sm" c="dimmed" mb="sm" data-testid="admin-cash-session-meta">
          Statut : {session.status}
          {session.opened_at ? ` — ouverte ${session.opened_at}` : ''}
          {session.operator_name ? ` — opérateur : ${session.operator_name}` : ''}
        </Text>
      ) : null}
      <Button
        type="button"
        size="xs"
        variant="light"
        mb="sm"
        loading={busy}
        onClick={() => void loadSession()}
        data-testid="admin-cash-session-refresh"
      >
        Rafraîchir
      </Button>
      <CashflowClientErrorAlert error={error} testId="admin-cash-session-error" />
      {!busy && session && sales.length === 0 ? (
        <Text size="sm" c="dimmed" data-testid="admin-cash-session-empty-sales">
          Aucune vente sur cette session.
        </Text>
      ) : null}
      {sales.length > 0 ? (
        <Table striped highlightOnHover data-testid="admin-cash-session-sales-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Vente</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sales.map((raw) => {
              const row = raw as Record<string, unknown>;
              const sid = saleIdOf(row);
              const life = saleLifecycle(row);
              const total =
                typeof row.total_amount === 'number'
                  ? row.total_amount
                  : typeof row.total_amount === 'string'
                    ? row.total_amount
                    : '—';
              const canRow = canCorrect && life === 'completed' && sid.length > 0;
              return (
                <Table.Tr key={sid || JSON.stringify(row)} data-testid={`admin-cash-session-sale-row-${sid}`}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {sid || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>{life || '—'}</Table.Td>
                  <Table.Td>{total}</Table.Td>
                  <Table.Td>
                    {canRow ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="light"
                        onClick={() => setCorrectionSaleId(sid)}
                        data-testid={`admin-cash-session-correct-${sid}`}
                      >
                        Corriger
                      </Button>
                    ) : null}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      ) : null}
      {!canCorrect ? (
        <Text size="xs" c="dimmed" mt="sm" data-testid="admin-cash-session-no-correct-perm">
          La clé « {PERMISSION_CASHFLOW_SALE_CORRECT} » est absente — pas d’action correction (enveloppe serveur).
        </Text>
      ) : null}

      <Modal
        opened={correctionSaleId !== null}
        onClose={() => setCorrectionSaleId(null)}
        title="Correction sensible (audit + PIN)"
        size="lg"
      >
        {correctionSaleId ? (
          <CashflowSaleCorrectionWizard
            key={correctionSaleId}
            widgetProps={{
              initial_sale_id: correctionSaleId,
              lock_sale_id: true,
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
