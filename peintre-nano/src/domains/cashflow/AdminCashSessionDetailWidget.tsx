import {
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
} from '@mantine/core';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Heart,
  Package,
  Scale,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCashSessionDetail,
  type CashSessionDetailV1,
} from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  getSale,
  putSaleNote,
  type SaleItemResponseV1,
  type SaleResponseV1,
} from '../../api/sales-client';
import {
  PERMISSION_CASHFLOW_SALE_CORRECT,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowSaleCorrectionWizard } from './CashflowSaleCorrectionWizard';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

function sessionIdFromPath(pathname: string): string | null {
  const m = /^\/admin\/cash-sessions\/([^/]+)\/?$/.exec(pathname);
  return m?.[1]?.trim() ? m[1]!.trim() : null;
}

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(s: string): boolean {
  return UUID_LIKE.test(s.trim());
}

function saleLifecycle(s: Record<string, unknown>): string {
  return typeof s.lifecycle_status === 'string' ? s.lifecycle_status : '';
}

function saleIdOf(s: Record<string, unknown>): string {
  return typeof s.id === 'string' ? s.id : '';
}

function getPaymentMethodLabel(code?: string | null): string {
  if (!code) return 'Non spécifié';
  const labels: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte bancaire',
    check: 'Chèque',
    free: 'Sans paiement',
    espèces: 'Espèces',
    'carte bancaire': 'Carte bancaire',
    chèque: 'Chèque',
  };
  return labels[code] ?? code;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0,00 kg';
  }
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

function lifecyclePresentation(code: string): string {
  if (code === 'completed') return 'Encaissée';
  if (code === 'held') return 'En attente';
  if (code === 'abandoned') return 'Abandonnée';
  return code ? code : '—';
}

function paymentSummaryForRow(row: Record<string, unknown>): ReactNode {
  const payments = row.payments;
  if (Array.isArray(payments) && payments.length > 0) {
    return (
      <Stack gap={2}>
        {payments.map((p, index) => {
          const pr = p as Record<string, unknown>;
          const method = typeof pr.payment_method === 'string' ? pr.payment_method : '';
          const amount = typeof pr.amount === 'number' ? pr.amount : Number(pr.amount);
          return (
            <Text key={typeof pr.id === 'string' ? pr.id : index} size="sm">
              {getPaymentMethodLabel(method)} : {formatCurrency(Number.isFinite(amount) ? amount : 0)}
            </Text>
          );
        })}
      </Stack>
    );
  }
  const legacy = typeof row.payment_method === 'string' ? row.payment_method : undefined;
  return <Text size="sm">{getPaymentMethodLabel(legacy)}</Text>;
}

function saleRowDate(row: Record<string, unknown>): string {
  const saleDate = typeof row.sale_date === 'string' ? row.sale_date : '';
  const created = typeof row.created_at === 'string' ? row.created_at : '';
  return saleDate || created;
}

function totalDonationsFromSales(sales: ReadonlyArray<Record<string, unknown>>): number {
  return sales.reduce((acc, s) => {
    const d = s.donation;
    const n = typeof d === 'number' ? d : typeof d === 'string' ? Number(d) : 0;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function categoryCellLabel(category: string): string {
  const t = category.trim();
  if (!t) return '—';
  if (isUuidLike(t)) return 'Catégorie';
  return t;
}

function stripPresetNoise(notes: string | undefined): string {
  if (!notes) return '';
  return notes.replace(/preset_type:[^;]+;?\s*/g, '').trim();
}

type TicketPeekState =
  | { phase: 'idle' }
  | { phase: 'loading'; saleId: string; operatorLabel: string }
  | { phase: 'ready'; saleId: string; operatorLabel: string; sale: SaleResponseV1 & { sale_date?: string | null; payment_method?: string | null } }
  | { phase: 'error'; message: string };

/** Détail session caisse admin — lecture journal, ticket, correction encadrée si autorisée, note (PUT legacy) si vue admin. */
export function AdminCashSessionDetailWidget(_props: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const canCorrect = envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_SALE_CORRECT);
  const canEditSaleNote = envelope.permissions.permissionKeys.includes(TRANSVERSE_PERMISSION_ADMIN_VIEW);

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
  const [ticketPeek, setTicketPeek] = useState<TicketPeekState>({ phase: 'idle' });

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

  const ticketLoadingSaleId = ticketPeek.phase === 'loading' ? ticketPeek.saleId : null;
  const ticketLoadingOperatorLabel = ticketPeek.phase === 'loading' ? ticketPeek.operatorLabel : '';

  useEffect(() => {
    if (!ticketLoadingSaleId) return;
    const saleId = ticketLoadingSaleId;
    const operatorLabel = ticketLoadingOperatorLabel;
    let cancelled = false;
    void (async () => {
      const res = await getSale(saleId, auth);
      if (cancelled) return;
      if (!res.ok) {
        setTicketPeek({ phase: 'error', message: res.detail });
        return;
      }
      setTicketPeek({
        phase: 'ready',
        saleId,
        operatorLabel,
        sale: res.sale,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketLoadingSaleId, ticketLoadingOperatorLabel, auth]);

  const openTicket = useCallback((saleId: string, operatorLabel: string) => {
    if (!saleId) return;
    setTicketPeek({ phase: 'loading', saleId, operatorLabel });
  }, []);

  const closeTicketModal = useCallback(() => {
    setTicketPeek({ phase: 'idle' });
  }, []);

  const onTicketNoteSaved = useCallback((updated: SaleResponseV1) => {
    setTicketPeek((prev) => {
      if (prev.phase !== 'ready' || prev.saleId !== updated.id) return prev;
      return { ...prev, sale: updated };
    });
    void loadSession();
  }, [loadSession]);

  if (!sessionId) {
    return (
      <Alert color="gray" title="Adresse incomplète" data-testid="admin-cash-session-bad-url">
        <Text size="sm">
          Ouvrez cette page depuis le gestionnaire de sessions (lien « Détail » sur une ligne), ou via un favori
          d'administration qui pointe vers une session précise.
        </Text>
      </Alert>
    );
  }

  const sales = Array.isArray(session?.sales) ? (session!.sales as ReadonlyArray<Record<string, unknown>>) : [];
  const donationsTotal =
    session?.total_donations != null && session.total_donations !== undefined
      ? Number(session.total_donations)
      : totalDonationsFromSales(sales);

  const initialLoad = busy && !session;

  return (
    <Stack gap="lg" data-testid="admin-cash-session-detail">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="md" align="center">
          <Button
            type="button"
            variant="default"
            size="sm"
            leftSection={<ArrowLeft size={16} aria-hidden />}
            onClick={() => spaNavigateTo('/admin/session-manager')}
            data-testid="admin-cash-session-back"
          >
            Retour
          </Button>
        </Group>
        <Button
          type="button"
          size="xs"
          variant="light"
          loading={busy}
          onClick={() => void loadSession()}
          data-testid="admin-cash-session-refresh"
        >
          Rafraîchir
        </Button>
      </Group>

      <CashflowClientErrorAlert error={error} testId="admin-cash-session-error" />

      {initialLoad ? (
        <Stack align="center" py="xl" gap="sm" data-testid="admin-cash-session-loading">
          <Loader size="md" />
          <Text c="dimmed">Chargement…</Text>
        </Stack>
      ) : null}

      {!initialLoad && session ? (
        <>
          <Paper withBorder shadow="xs" p="lg" radius="md" data-testid="admin-cash-session-summary">
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Group gap="sm" wrap="nowrap">
                  <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                    <User size={20} aria-hidden />
                  </Paper>
                  <div>
                    <Text size="xs" c="dimmed">
                      Opérateur
                    </Text>
                    <Text fw={600}>{session.operator_name?.trim() || 'Inconnu'}</Text>
                  </div>
                </Group>
              </Grid.Col>
              {session.site_name ? (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Group gap="sm" wrap="nowrap">
                    <Paper bg="gray.1" c="gray.8" p="sm" radius="md">
                      <Package size={20} aria-hidden />
                    </Paper>
                    <div>
                      <Text size="xs" c="dimmed">
                        Site
                      </Text>
                      <Text fw={600}>{session.site_name}</Text>
                    </div>
                  </Group>
                </Grid.Col>
              ) : null}
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Group gap="sm" wrap="nowrap">
                  <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                    <Calendar size={20} aria-hidden />
                  </Paper>
                  <div>
                    <Text size="xs" c="dimmed">
                      Ouverture
                    </Text>
                    <Text fw={600}>{formatDate(session.opened_at)}</Text>
                  </div>
                </Group>
              </Grid.Col>
              {session.closed_at ? (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Group gap="sm" wrap="nowrap">
                    <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                      <Clock size={20} aria-hidden />
                    </Paper>
                    <div>
                      <Text size="xs" c="dimmed">
                        Fermeture
                      </Text>
                      <Text fw={600}>{formatDate(session.closed_at)}</Text>
                    </div>
                  </Group>
                </Grid.Col>
              ) : null}
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Group gap="sm" wrap="nowrap">
                  <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                    <DollarSign size={20} aria-hidden />
                  </Paper>
                  <div>
                    <Text size="xs" c="dimmed">
                      Montant initial (fond de caisse)
                    </Text>
                    <Text fw={600}>{formatCurrency(session.initial_amount)}</Text>
                  </div>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Group gap="sm" wrap="nowrap">
                  <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                    <DollarSign size={20} aria-hidden />
                  </Paper>
                  <div>
                    <Text size="xs" c="dimmed">
                      Total des ventes
                    </Text>
                    <Text fw={600}>{formatCurrency(session.total_sales ?? 0)}</Text>
                  </div>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Group gap="sm" wrap="nowrap">
                  <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                    <Heart size={20} aria-hidden />
                  </Paper>
                  <div>
                    <Text size="xs" c="dimmed">
                      Total des dons
                    </Text>
                    <Text fw={600}>{formatCurrency(donationsTotal)}</Text>
                  </div>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Group gap="sm" wrap="nowrap">
                  <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                    <Package size={20} aria-hidden />
                  </Paper>
                  <div>
                    <Text size="xs" c="dimmed">
                      Nombre de paniers
                    </Text>
                    <Text fw={600}>{sales.length}</Text>
                  </div>
                </Group>
              </Grid.Col>
              {typeof session.total_weight_out === 'number' ? (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Group gap="sm" wrap="nowrap">
                    <Paper bg="blue.0" c="blue.8" p="sm" radius="md">
                      <Scale size={20} aria-hidden />
                    </Paper>
                    <div>
                      <Text size="xs" c="dimmed">
                        Poids vendus ou donnés (sorties)
                      </Text>
                      <Text fw={600}>{formatWeight(session.total_weight_out)}</Text>
                    </div>
                  </Group>
                </Grid.Col>
              ) : null}
            </Grid>

            <Group gap="sm" align="center" mt="lg">
              <Text size="sm" c="dimmed" fw={500}>
                Statut :
              </Text>
              {session.status === 'open' ? (
                <Button type="button" size="sm" color="green" onClick={() => spaNavigateTo('/cash-register/sale')}>
                  Retour à la caisse
                </Button>
              ) : (
                <Badge color="red" variant="light" size="lg" radius="xl">
                  Fermée
                </Badge>
              )}
            </Group>

            {session.variance !== undefined && session.variance !== null ? (
              <Paper
                mt="md"
                p="md"
                radius="md"
                style={{
                  border: `1px solid ${session.variance === 0 ? 'var(--mantine-color-green-3)' : 'var(--mantine-color-red-3)'}`,
                  background:
                    session.variance === 0 ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)',
                }}
                data-testid="admin-cash-session-variance"
              >
                <Text size="sm" c="dimmed" mb={6}>
                  Contrôle de caisse
                </Text>
                <Text size="sm">Montant théorique : {formatCurrency(session.closing_amount ?? 0)}</Text>
                <Text size="sm">Montant physique : {formatCurrency(session.actual_amount ?? 0)}</Text>
                <Text size="sm" fw={700} c={session.variance === 0 ? 'green.8' : 'red.8'}>
                  Écart : {formatCurrency(session.variance)}
                </Text>
                {session.variance_comment ? (
                  <Text size="sm" fs="italic" mt="xs">
                    Commentaire : {session.variance_comment}
                  </Text>
                ) : null}
              </Paper>
            ) : null}
          </Paper>

          <Paper withBorder shadow="xs" p="lg" radius="md">
            <Group gap="sm" mb="md" align="center">
              <Package size={22} aria-hidden />
              <Text fw={600} size="md" my={0}>
                Journal des ventes ({sales.length} vente{sales.length > 1 ? 's' : ''})
              </Text>
            </Group>

            {sales.length === 0 ? (
              <Text size="sm" c="dimmed" data-testid="admin-cash-session-empty-sales">
                Aucune vente enregistrée pour cette session.
              </Text>
            ) : (
              <Table striped highlightOnHover data-testid="admin-cash-session-sales-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Heure</Table.Th>
                    <Table.Th>Montant</Table.Th>
                    <Table.Th>Don</Table.Th>
                    <Table.Th>Poids</Table.Th>
                    <Table.Th>Paiement</Table.Th>
                    <Table.Th>Opérateur</Table.Th>
                    <Table.Th>Notes</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sales.map((raw) => {
                    const row = raw;
                    const sid = saleIdOf(row);
                    const life = saleLifecycle(row);
                    const total =
                      typeof row.total_amount === 'number'
                        ? row.total_amount
                        : typeof row.total_amount === 'string'
                          ? Number(row.total_amount)
                          : NaN;
                    const w = row.total_weight;
                    const weight =
                      typeof w === 'number' ? w : typeof w === 'string' ? Number(w) : 0;
                    const donation = row.donation;
                    const don =
                      typeof donation === 'number'
                        ? donation
                        : typeof donation === 'string'
                          ? Number(donation)
                          : 0;
                    const opName =
                      typeof row.operator_name === 'string' && row.operator_name.trim()
                        ? row.operator_name.trim()
                        : '—';
                    const note = typeof row.note === 'string' ? row.note : '';
                    const canRow = canCorrect && life === 'completed' && sid.length > 0;
                    const rowDate = saleRowDate(row);
                    return (
                      <Table.Tr
                        key={sid || JSON.stringify(row)}
                        data-testid={sid ? `admin-cash-session-sale-row-${sid}` : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (sid) openTicket(sid, opName);
                        }}
                      >
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Text size="sm">{formatDate(rowDate)}</Text>
                            {life && life !== 'completed' ? (
                              <Badge size="xs" color="orange" variant="light">
                                {lifecyclePresentation(life)}
                              </Badge>
                            ) : null}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{Number.isFinite(total) ? formatCurrency(total) : '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{don > 0 ? formatCurrency(don) : '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatWeight(Number.isFinite(weight) ? weight : 0)}</Text>
                        </Table.Td>
                        <Table.Td>{paymentSummaryForRow(row)}</Table.Td>
                        <Table.Td>
                          <Text size="sm">{opName}</Text>
                        </Table.Td>
                        <Table.Td maw={220}>
                          <Text size="sm" lineClamp={1}>
                            {note || '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              size="xs"
                              variant="light"
                              leftSection={<Eye size={14} aria-hidden />}
                              onClick={() => {
                                if (sid) openTicket(sid, opName);
                              }}
                              data-testid={sid ? `admin-cash-session-view-ticket-${sid}` : undefined}
                            >
                              Voir le ticket
                            </Button>
                            {canRow ? (
                              <Button
                                type="button"
                                size="xs"
                                variant="light"
                                color="orange"
                                onClick={() => setCorrectionSaleId(sid)}
                                data-testid={`admin-cash-session-correct-${sid}`}
                              >
                                Corriger
                              </Button>
                            ) : null}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </>
      ) : !initialLoad && !session && !error ? (
        <Text size="sm" c="dimmed" data-testid="admin-cash-session-meta">
          Session introuvable.
        </Text>
      ) : null}

      <Modal
        opened={correctionSaleId !== null}
        onClose={() => setCorrectionSaleId(null)}
        title="Corriger une vente"
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

      <Modal
        opened={ticketPeek.phase !== 'idle'}
        onClose={closeTicketModal}
        title="Ticket de caisse"
        size="lg"
        data-testid="admin-cash-session-ticket-modal"
      >
        {ticketPeek.phase === 'loading' ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Chargement du ticket…
            </Text>
          </Group>
        ) : null}
        {ticketPeek.phase === 'error' ? (
          <Alert color="red" title="Lecture impossible">
            {ticketPeek.message}
          </Alert>
        ) : null}
        {ticketPeek.phase === 'ready' ? (
          <TicketDetailBody
            sale={ticketPeek.sale}
            operatorLabel={ticketPeek.operatorLabel}
            canEditNote={canEditSaleNote}
            onNoteSaved={onTicketNoteSaved}
          />
        ) : null}
      </Modal>
    </Stack>
  );
}

function TicketDetailBody(props: {
  sale: SaleResponseV1;
  operatorLabel: string;
  canEditNote: boolean;
  onNoteSaved: (sale: SaleResponseV1) => void;
}): ReactNode {
  const { sale: initialSale, operatorLabel, canEditNote, onNoteSaved } = props;
  const auth = useAuthPort();
  const [sale, setSale] = useState<SaleResponseV1>(initialSale);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    setSale(initialSale);
    setEditingNote(false);
    setNoteDraft('');
    setNoteError(null);
    setNoteBusy(false);
  }, [initialSale]);

  const operatorDisplay =
    typeof sale.operator_name === 'string' && sale.operator_name.trim()
      ? sale.operator_name.trim()
      : operatorLabel;
  const saleDate = sale.sale_date ?? sale.created_at ?? '';
  const items = Array.isArray(sale.items) ? sale.items : [];
  const trimmedDisplayNote = (sale.note ?? '').trim();
  const startEditNote = useCallback(() => {
    setNoteDraft(sale.note ?? '');
    setNoteError(null);
    setEditingNote(true);
  }, [sale.note]);

  const cancelEditNote = useCallback(() => {
    setEditingNote(false);
    setNoteDraft('');
    setNoteError(null);
  }, []);

  const saveNote = useCallback(async () => {
    setNoteBusy(true);
    setNoteError(null);
    const res = await putSaleNote(sale.id, noteDraft, auth);
    setNoteBusy(false);
    if (!res.ok) {
      setNoteError(res.detail);
      return;
    }
    setSale(res.sale);
    onNoteSaved(res.sale);
    setEditingNote(false);
    setNoteDraft('');
  }, [auth, noteDraft, onNoteSaved, sale.id]);

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="gray.0">
        <Group justify="space-between">
          <Text size="sm">Heure de vente</Text>
          <Text size="sm" fw={600}>
            {formatDate(saleDate)}
          </Text>
        </Group>
        <Group justify="space-between" mt="xs">
          <Text size="sm">Opérateur</Text>
          <Text size="sm" fw={600}>
            {operatorDisplay}
          </Text>
        </Group>
        <Group justify="space-between" mt="xs">
          <Text size="sm">Paiement</Text>
          <div style={{ textAlign: 'right' }}>
            {Array.isArray(sale.payments) && sale.payments.length > 0 ? (
              <Stack gap={4} align="flex-end">
                {(sale.payments as Array<{ payment_method?: string; amount?: number }>).map((p, i) => (
                  <Text key={i} size="sm">
                    {getPaymentMethodLabel(p.payment_method)} : {formatCurrency(p.amount ?? 0)}
                  </Text>
                ))}
                <Text size="sm" fw={700} pt={4} style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                  Total :{' '}
                  {formatCurrency(
                    (sale.payments as Array<{ amount?: number }>).reduce((s, p) => s + (p.amount ?? 0), 0),
                  )}
                </Text>
              </Stack>
            ) : (
              <Text size="sm" fw={600}>
                {getPaymentMethodLabel(sale.payment_method)}
              </Text>
            )}
          </div>
        </Group>
        <Group justify="space-between" mt="xs">
          <Text size="sm">Don</Text>
          <Text size="sm" fw={600}>
            {sale.donation != null && sale.donation > 0 ? formatCurrency(sale.donation) : 'Aucun'}
          </Text>
        </Group>
        <Group justify="space-between" mt="xs">
          <Text size="sm">Total</Text>
          <Text size="sm" fw={700}>
            {formatCurrency(sale.total_amount)}
          </Text>
        </Group>
        <Group justify="space-between" mt="xs" align="flex-start" wrap="nowrap" gap="md">
          <Text size="sm" style={{ flexShrink: 0 }}>
            Note
          </Text>
          <Stack gap="xs" align="flex-end" style={{ flex: 1, minWidth: 0 }}>
            {noteError ? (
              <Alert color="red" variant="light" title="Enregistrement impossible" w="100%">
                <Text size="sm">{noteError}</Text>
              </Alert>
            ) : null}
            {editingNote ? (
              <Stack gap="xs" w="100%">
                <Textarea
                  data-testid="admin-cash-session-note-input"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.currentTarget.value)}
                  placeholder="Ajouter une note…"
                  minRows={2}
                  autosize
                  maxRows={6}
                  disabled={noteBusy}
                />
                <Group gap="xs" justify="flex-end">
                  <Button type="button" variant="default" size="xs" onClick={cancelEditNote} disabled={noteBusy}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => void saveNote()}
                    loading={noteBusy}
                    data-testid="admin-cash-session-save-note"
                  >
                    Enregistrer
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Group gap="xs" wrap="wrap" justify="flex-end" w="100%">
                <Text size="sm" fw={600} ta="right" style={{ flex: '1 1 120px' }}>
                  {trimmedDisplayNote ? trimmedDisplayNote : 'Aucune note'}
                </Text>
                {canEditNote ? (
                  <Button type="button" size="xs" variant="light" onClick={startEditNote} data-testid="admin-cash-session-edit-note">
                    {trimmedDisplayNote ? 'Modifier la note' : 'Ajouter une note'}
                  </Button>
                ) : null}
              </Group>
            )}
          </Stack>
        </Group>
      </Paper>

      <div>
        <Text fw={600} mb="sm" size="sm">
          Articles vendus ({items.length})
        </Text>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Aucun article enregistré pour cette vente.
          </Text>
        ) : (
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Catégorie</Table.Th>
                <Table.Th>Poids (kg)</Table.Th>
                <Table.Th>Prix unitaire</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Notes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((it: SaleItemResponseV1, idx: number) => {
                const rawNotes = (it as unknown as { notes?: unknown }).notes;
                const lineNotes = typeof rawNotes === 'string' ? rawNotes : '';
                return (
                  <Table.Tr key={it.id ?? `${idx}`}>
                    <Table.Td>
                      <Text size="sm">{categoryCellLabel(String(it.category ?? ''))}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{(it.weight ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatCurrency(it.unit_price)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatCurrency(it.total_price)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{stripPresetNoise(lineNotes)}</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </div>
    </Stack>
  );
}
