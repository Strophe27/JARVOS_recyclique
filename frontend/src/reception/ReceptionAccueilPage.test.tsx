import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { ReceptionAccueilPage } from './ReceptionAccueilPage';
import * as receptionApi from '../api/reception';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'fake-token',
    user: {
      id: 'u1',
      username: 'TestUser',
      email: 'test@test.fr',
      role: 'admin',
      status: 'active',
      first_name: null,
      last_name: null,
    },
  }),
}));

function renderPage() {
  return render(
    <MantineProvider>
      <BrowserRouter>
        <ReceptionAccueilPage />
      </BrowserRouter>
    </MantineProvider>
  );
}

const MOCK_STATS = { tickets_today: 0, total_weight_kg: 0, lines_count: 0 };

const MOCK_POSTE = {
  id: 'poste-1',
  opened_by_user_id: 'user-1',
  opened_at: '2026-02-27T10:00:00Z',
  closed_at: null,
  status: 'opened',
  created_at: '2026-02-27T10:00:00Z',
  updated_at: '2026-02-27T10:00:00Z',
};

const MOCK_TICKET_OPENED = {
  id: 'ticket-aabbccdd-1111',
  poste_id: 'poste-1',
  benevole_user_id: 'user-1',
  created_at: '2026-02-27T12:00:00Z',
  closed_at: null,
  status: 'opened',
  updated_at: '2026-02-27T12:00:00Z',
  lignes: [
    { id: 'l1', ticket_id: 'ticket-aabbccdd-1111', poids_kg: 2.5, category_id: null, destination: 'stock', notes: null, is_exit: false, created_at: '', updated_at: '' },
    { id: 'l2', ticket_id: 'ticket-aabbccdd-1111', poids_kg: 1.0, category_id: null, destination: 'stock', notes: null, is_exit: false, created_at: '', updated_at: '' },
  ],
};

const MOCK_TICKET_CLOSED = {
  id: 'ticket-eeffgghh-2222',
  poste_id: 'poste-1',
  benevole_user_id: 'user-2',
  created_at: '2026-02-27T13:00:00Z',
  closed_at: '2026-02-27T14:00:00Z',
  status: 'closed',
  updated_at: '2026-02-27T14:00:00Z',
  lignes: [],
};

describe('ReceptionAccueilPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(receptionApi, 'getCurrentPoste');
    vi.spyOn(receptionApi, 'getTickets');
    vi.spyOn(receptionApi, 'getReceptionStatsLive');
    vi.spyOn(receptionApi, 'closeTicket');
  });

  it('affiche le header "Module de Reception" et le username', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();
    expect(await screen.findByTestId('reception-accueil-page')).toBeInTheDocument();
    expect(screen.getByTestId('reception-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /module de reception/i })).toBeInTheDocument();
    expect(screen.getByTestId('reception-greeting')).toHaveTextContent('TestUser');
  });

  it('affiche le bouton "Ouvrir un poste de reception"', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();
    expect(await screen.findByTestId('reception-open-poste-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reception-open-poste-btn')).toHaveTextContent(/ouvrir un poste/i);
  });

  it('affiche le bouton "Saisie differee"', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();
    expect(await screen.findByTestId('reception-deferred-btn')).toBeInTheDocument();
  });

  it('affiche le bouton "Voir tous les tickets"', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();
    expect(await screen.findByTestId('reception-view-all-tickets')).toBeInTheDocument();
  });

  it('affiche les KPI live', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue({
      tickets_today: 5, total_weight_kg: 120.5, lines_count: 42,
    });
    renderPage();
    const banner = await screen.findByTestId('reception-kpi-banner');
    expect(banner).toHaveTextContent('5');
    expect(banner).toHaveTextContent('120.5');
    expect(banner).toHaveTextContent('42');
  });

  it('affiche Creer ticket et Fermer poste quand un poste est ouvert', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_POSTE);
    (receptionApi.getTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [], total: 0, page: 1, page_size: 5,
    });
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();
    expect(await screen.findByTestId('reception-create-ticket-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reception-close-poste-btn')).toBeInTheDocument();
  });

  it('affiche les tickets avec cards, badges et boutons action', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_POSTE);
    (receptionApi.getTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [MOCK_TICKET_OPENED, MOCK_TICKET_CLOSED],
      total: 2,
      page: 1,
      page_size: 5,
    });
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();

    expect(await screen.findByTestId('reception-tickets-section')).toBeInTheDocument();

    const cardOpen = screen.getByTestId(`reception-ticket-card-${MOCK_TICKET_OPENED.id}`);
    expect(cardOpen).toBeInTheDocument();
    expect(cardOpen).toHaveTextContent('#ticket-a');

    const badgeOpen = screen.getByTestId(`reception-ticket-status-${MOCK_TICKET_OPENED.id}`);
    expect(badgeOpen).toHaveTextContent('Ouvert');

    const actionOpen = screen.getByTestId(`reception-ticket-action-${MOCK_TICKET_OPENED.id}`);
    expect(actionOpen).toHaveTextContent('Modifier');

    expect(cardOpen).toHaveTextContent('2 articles');
    expect(cardOpen).toHaveTextContent('3.50 kg');

    const cardClosed = screen.getByTestId(`reception-ticket-card-${MOCK_TICKET_CLOSED.id}`);
    expect(cardClosed).toBeInTheDocument();

    const badgeClosed = screen.getByTestId(`reception-ticket-status-${MOCK_TICKET_CLOSED.id}`);
    expect(badgeClosed).toHaveTextContent('Ferme');

    const actionClosed = screen.getByTestId(`reception-ticket-action-${MOCK_TICKET_CLOSED.id}`);
    expect(actionClosed).toHaveTextContent('Voir les details');
  });

  it('affiche la pagination quand il y a des tickets', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_POSTE);
    (receptionApi.getTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [MOCK_TICKET_OPENED],
      total: 12,
      page: 1,
      page_size: 5,
    });
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    renderPage();
    const pagination = await screen.findByTestId('reception-pagination');
    expect(pagination).toBeInTheDocument();
    expect(pagination).toHaveTextContent(/affichage de 1 a/i);
    expect(screen.getByTestId('reception-page-size-select')).toBeInTheDocument();
    expect(screen.getByTestId('reception-pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('reception-pagination-next')).not.toBeDisabled();
  });

  it('clic Fermer sur un ticket ouvert appelle closeTicket', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_POSTE);
    (receptionApi.getTickets as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [MOCK_TICKET_OPENED],
      total: 1,
      page: 1,
      page_size: 5,
    });
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    (receptionApi.closeTicket as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_TICKET_OPENED, status: 'closed',
    });
    const u = userEvent.setup();
    renderPage();
    await screen.findByTestId(`reception-ticket-card-${MOCK_TICKET_OPENED.id}`);
    const closeBtn = screen.getByTestId(`reception-close-ticket-${MOCK_TICKET_OPENED.id}`);
    await u.click(closeBtn);
    await waitFor(() => {
      expect(receptionApi.closeTicket).toHaveBeenCalledWith('fake-token', MOCK_TICKET_OPENED.id);
    });
  });

  it('ouvre le modal saisie differee avec date pre-remplie', async () => {
    (receptionApi.getCurrentPoste as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (receptionApi.getReceptionStatsLive as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_STATS);
    const u = userEvent.setup();
    renderPage();
    await screen.findByTestId('reception-deferred-btn');
    await u.click(screen.getByTestId('reception-deferred-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-open-poste-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('reception-opened-at-input')).not.toHaveValue('');
  });
});
