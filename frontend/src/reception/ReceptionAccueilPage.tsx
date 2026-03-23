import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  Stack,
  Title,
  Text,
  Group,
  TextInput,
  Alert,
  Loader,
  Badge,
  Select,
} from '@mantine/core';
import {
  getCurrentPoste,
  openPoste,
  closePoste,
  getTickets,
  createTicket,
  closeTicket,
  getReceptionStatsLive,
  exportLignesCsv,
} from '../api/reception';
import type { PosteReceptionItem, TicketDepotItem, ReceptionStatsLive } from '../api/reception';
import { useAuth } from '../auth/AuthContext';
import styles from './ReceptionAccueilPage.module.css';

export function ReceptionAccueilPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  const [poste, setPoste] = useState<PosteReceptionItem | null | undefined>(undefined);
  const [tickets, setTickets] = useState<TicketDepotItem[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openedAtValue, setOpenedAtValue] = useState('');
  const [deferredMode, setDeferredMode] = useState(false);
  const [stats, setStats] = useState<ReceptionStatsLive | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exportLignesFrom, setExportLignesFrom] = useState('');
  const [exportLignesTo, setExportLignesTo] = useState('');
  const [exportLignesPending, setExportLignesPending] = useState(false);
  const [exportLignesModal, setExportLignesModal] = useState(false);
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const ticketsSectionRef = useRef<HTMLDivElement>(null);

  const loadPoste = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const p = await getCurrentPoste(accessToken);
      setPoste(p);
      return p;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement poste');
      setPoste(null);
      return null;
    }
  }, [accessToken]);

  const loadTickets = useCallback(
    async (posteId: string, page: number, size: number) => {
      if (!accessToken) return;
      try {
        const res = await getTickets(accessToken, { poste_id: posteId, page, page_size: size });
        setTickets(res.items);
        setTotalTickets(res.total);
      } catch {
        setTickets([]);
        setTotalTickets(0);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    loadPoste().then((p) => {
      if (p?.id) loadTickets(p.id, 1, pageSize);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageSize initial seulement
  }, [accessToken, loadPoste, loadTickets]);

  const loadStats = useCallback(async () => {
    if (!accessToken) return;
    setStatsLoading(true);
    try {
      const s = await getReceptionStatsLive(accessToken);
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    loadStats();
    const interval = setInterval(loadStats, 30_000);
    return () => clearInterval(interval);
  }, [accessToken, loadStats]);

  const handleExportLignes = useCallback(async () => {
    if (!accessToken || !exportLignesFrom || !exportLignesTo) return;
    setExportLignesPending(true);
    try {
      await exportLignesCsv(accessToken, exportLignesFrom, exportLignesTo);
      setExportLignesModal(false);
      setExportLignesFrom('');
      setExportLignesTo('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export lignes');
    } finally {
      setExportLignesPending(false);
    }
  }, [accessToken, exportLignesFrom, exportLignesTo]);

  const handleOpenPoste = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const openedAt = openedAtValue.trim()
        ? new Date(openedAtValue).toISOString()
        : undefined;
      const p = await openPoste(accessToken, openedAt ? { opened_at: openedAt } : undefined);
      setPoste(p);
      setOpenModal(false);
      setOpenedAtValue('');
      setDeferredMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur ouverture poste');
    } finally {
      setLoading(false);
    }
  }, [accessToken, openedAtValue]);

  const handleClosePoste = useCallback(async () => {
    if (!accessToken || !poste?.id) return;
    setError(null);
    setLoading(true);
    try {
      await closePoste(accessToken, poste.id);
      setPoste(null);
      setTickets([]);
      setTotalTickets(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur fermeture poste');
    } finally {
      setLoading(false);
    }
  }, [accessToken, poste?.id]);

  const handleCreateTicket = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const t = await createTicket(accessToken);
      navigate(`/reception/tickets/${t.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur creation ticket');
    } finally {
      setLoading(false);
    }
  }, [accessToken, navigate]);

  const handleCloseTicket = useCallback(
    async (t: TicketDepotItem) => {
      if (!accessToken || t.status !== 'opened') return;
      setClosingTicketId(t.id);
      setError(null);
      try {
        await closeTicket(accessToken, t.id);
        setTickets((prev) => prev.filter((x) => x.id !== t.id));
        setTotalTickets((n) => Math.max(0, n - 1));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur fermeture ticket');
      } finally {
        setClosingTicketId(null);
      }
    },
    [accessToken]
  );

  const handleOpenDeferredModal = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const iso = now.toISOString().slice(0, 16);
    setOpenedAtValue(iso);
    setDeferredMode(true);
    setOpenModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (poste?.id) loadTickets(poste.id, page, pageSize);
  };

  const handlePageSizeChange = (value: string | null) => {
    const size = Number(value) || 5;
    setPageSize(size);
    setCurrentPage(1);
    if (poste?.id) loadTickets(poste.id, 1, size);
  };

  const totalPages = Math.ceil(totalTickets / pageSize) || 1;
  const rangeStart = totalTickets > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(currentPage * pageSize, totalTickets);

  const getArticleCount = (t: TicketDepotItem) =>
    t.lignes ? t.lignes.length : null;

  const getTotalWeight = (t: TicketDepotItem): number | null =>
    t.lignes
      ? t.lignes.reduce((sum, l) => sum + Number(l.poids_kg ?? 0), 0)
      : null;

  return (
    <div className={styles.page} data-testid="reception-accueil-page">
      {loading && <Loader size="sm" data-testid="reception-loading" />}
      {error && (
        <Alert color="red" data-testid="reception-error">
          {error}
        </Alert>
      )}

      {/* ── Header ── */}
      <div className={styles.header} data-testid="reception-header">
        <div className={styles.headerLeft}>
          <ClipboardIcon />
          <Title order={2}>Module de Reception</Title>
        </div>
        <Text data-testid="reception-greeting" size="sm" c="dimmed">
          Bonjour, {user?.username ?? '...'}
        </Text>
        <Button
          variant="outline"
          color="green"
          data-testid="reception-view-all-tickets"
          onClick={() => {
            ticketsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Voir tous les tickets
        </Button>
      </div>

      {/* ── Action buttons ── */}
      <div className={styles.actions}>
        <Button
          className={styles.openPosteBtn}
          data-testid="reception-open-poste-btn"
          onClick={() => { setDeferredMode(false); setOpenModal(true); }}
          loading={loading}
          fullWidth
          leftSection={<PlusIcon />}
        >
          Ouvrir un poste de reception
        </Button>
        <Button
          className={styles.deferredBtn}
          variant="outline"
          data-testid="reception-deferred-btn"
          onClick={handleOpenDeferredModal}
          leftSection={<ClockIcon />}
        >
          Saisie differee
        </Button>
      </div>

      {/* ── Poste status (compact) ── */}
      {!loading && poste && (
        <Group mb="md" gap="sm">
          <Text data-testid="reception-poste-status" size="sm">
            Poste ouvert le {new Date(poste.opened_at).toLocaleString()} — statut : {poste.status}
          </Text>
          <Button
            size="compact-sm"
            data-testid="reception-create-ticket-btn"
            onClick={handleCreateTicket}
            loading={loading}
          >
            Creer ticket
          </Button>
          <Button
            variant="light"
            color="red"
            size="compact-sm"
            data-testid="reception-close-poste-btn"
            onClick={handleClosePoste}
            loading={loading}
          >
            Fermer poste
          </Button>
          <Button
            variant="light"
            size="compact-sm"
            data-testid="reception-export-lignes-btn"
            onClick={() => setExportLignesModal(true)}
          >
            Export lignes
          </Button>
        </Group>
      )}

      {/* ── KPI banner ── */}
      {stats && !statsLoading && (
        <Group mb="md" gap="lg" data-testid="reception-kpi-banner">
          <Text size="sm">
            <strong>Tickets aujourd&apos;hui :</strong> {stats.tickets_today}
          </Text>
          <Text size="sm">
            <strong>Poids total (kg) :</strong> {Number(stats.total_weight_kg ?? 0).toFixed(1)}
          </Text>
          <Text size="sm">
            <strong>Lignes :</strong> {stats.lines_count}
          </Text>
        </Group>
      )}

      {/* ── Tickets Recents ── */}
      <div
        ref={ticketsSectionRef}
        className={styles.ticketsSection}
        data-testid="reception-tickets-section"
      >
        <div className={styles.ticketsSectionTitle}>
          <ListIcon />
          <Title order={3}>Tickets Recents</Title>
        </div>

        {tickets.length === 0 && !loading && (
          <Text size="sm" c="dimmed">Aucun ticket pour le moment.</Text>
        )}

        {tickets.map((t) => {
          const articleCount = getArticleCount(t);
          const totalWeight = getTotalWeight(t);
          const isOpen = t.status === 'opened';
          return (
            <div
              key={t.id}
              className={styles.ticketCard}
              data-testid={`reception-ticket-card-${t.id}`}
            >
              <div className={styles.ticketInfo}>
                <Text fw={700} size="sm">
                  Ticket #{t.id.slice(0, 8)}
                </Text>
                <span className={styles.ticketMeta}>
                  <CalendarIcon />
                  {new Date(t.created_at).toLocaleString()}
                </span>
                <span className={styles.ticketMeta}>
                  <UserIcon />
                  {t.benevole_user_name ?? t.benevole_user_id?.slice(0, 8) ?? '—'}
                </span>
                <span className={styles.ticketMeta}>
                  <ArticlesIcon />
                  {articleCount != null ? `${articleCount} article${articleCount > 1 ? 's' : ''}` : '—'}
                </span>
                <span className={styles.ticketMeta}>
                  <WeightIcon />
                  {totalWeight != null ? `${Number(totalWeight).toFixed(2)} kg` : '—'}
                </span>
                <Badge
                  color={isOpen ? 'green' : 'gray'}
                  variant="filled"
                  size="sm"
                  data-testid={`reception-ticket-status-${t.id}`}
                >
                  {isOpen ? 'Ouvert' : 'Ferme'}
                </Badge>
              </div>
              <Group gap="xs">
                <Button
                  component={Link}
                  to={`/reception/tickets/${t.id}`}
                  variant="light"
                  color="green"
                  size="compact-sm"
                  data-testid={`reception-ticket-action-${t.id}`}
                  leftSection={<EyeIcon />}
                >
                  {isOpen ? 'Modifier' : 'Voir les details'}
                </Button>
                {isOpen && (
                  <Button
                    variant="light"
                    color="red"
                    size="compact-sm"
                    loading={closingTicketId === t.id}
                    onClick={() => handleCloseTicket(t)}
                    data-testid={`reception-close-ticket-${t.id}`}
                  >
                    Fermer
                  </Button>
                )}
              </Group>
            </div>
          );
        })}

        {/* ── Pagination ── */}
        {totalTickets > 0 && (
          <div className={styles.pagination} data-testid="reception-pagination">
            <Text className={styles.paginationInfo}>
              Affichage de {rangeStart} a {rangeEnd} sur {totalTickets} tickets
            </Text>
            <div className={styles.paginationCenter}>
              <Text size="sm">Par page</Text>
              <Select
                data={['5', '10', '20', '50']}
                value={String(pageSize)}
                onChange={handlePageSizeChange}
                size="xs"
                w={70}
                data-testid="reception-page-size-select"
              />
            </div>
            <div className={styles.paginationButtons}>
              <Button
                variant="default"
                size="compact-sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                data-testid="reception-pagination-prev"
              >
                Precedent
              </Button>
              <Button
                color="green"
                size="compact-sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                data-testid="reception-pagination-next"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ouverture poste ── */}
      <Modal
        opened={openModal}
        onClose={() => { setOpenModal(false); setOpenedAtValue(''); setDeferredMode(false); }}
        title={deferredMode ? 'Saisie differee — Ouverture de poste' : 'Ouverture de poste'}
        data-testid="reception-open-poste-modal"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Date d&apos;ouverture {deferredMode ? '(saisie differee)' : '(optionnel)'} :
          </Text>
          <TextInput
            type="datetime-local"
            data-testid="reception-opened-at-input"
            value={openedAtValue}
            onChange={(e) => setOpenedAtValue(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => { setOpenModal(false); setOpenedAtValue(''); setDeferredMode(false); }}>
              Annuler
            </Button>
            <Button data-testid="reception-open-poste-submit" onClick={handleOpenPoste} loading={loading}>
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Modal export lignes ── */}
      <Modal
        opened={exportLignesModal}
        onClose={() => { setExportLignesModal(false); setExportLignesFrom(''); setExportLignesTo(''); }}
        title="Export lignes (periode)"
        data-testid="reception-export-lignes-modal"
      >
        <Stack gap="sm">
          <TextInput
            type="date"
            label="Du"
            value={exportLignesFrom}
            onChange={(e) => setExportLignesFrom(e.currentTarget.value)}
            data-testid="reception-export-lignes-date-from"
          />
          <TextInput
            type="date"
            label="Au"
            value={exportLignesTo}
            onChange={(e) => setExportLignesTo(e.currentTarget.value)}
            data-testid="reception-export-lignes-date-to"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => { setExportLignesModal(false); setExportLignesFrom(''); setExportLignesTo(''); }}>
              Annuler
            </Button>
            <Button
              data-testid="reception-export-lignes-submit"
              onClick={handleExportLignes}
              loading={exportLignesPending}
              disabled={!exportLignesFrom || !exportLignesTo}
            >
              Telecharger CSV
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

/* ── Inline SVG icons ── */

function ClipboardIcon() {
  return (
    <svg className={styles.headerIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V5h2v2h10V5h2v14z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className={styles.ticketsSectionIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className={styles.ticketMetaIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className={styles.ticketMetaIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function ArticlesIcon() {
  return (
    <svg className={styles.ticketMetaIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z" />
    </svg>
  );
}

function WeightIcon() {
  return (
    <svg className={styles.ticketMetaIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3c-1.1 0-2 .9-2 2 0 .74.4 1.38 1 1.72V8H5v2h2l-3 9h5.5c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2H20l-3-9h2V8h-6V6.72c.6-.34 1-.98 1-1.72 0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}
