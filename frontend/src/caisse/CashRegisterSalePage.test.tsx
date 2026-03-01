/**
 * Tests Story 15.3 — layout saisie vente parite 1.4.4 + flux offline (5.4, 11.2).
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CashRegisterSalePage } from './CashRegisterSalePage';
import * as caisseApi from '../api/caisse';
import * as offlineQueue from './offlineQueue';

// Mock auth — expose user pour CaisseHeader
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'mock-token',
    user: { id: 'u1', username: 'alex', email: 'a@b.c', role: 'admin', status: 'active', first_name: 'Alex', last_name: 'Dupont' },
  }),
}));

let mockOnline = true;
vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnline,
}));

const mockGetCurrentCashSession = vi.spyOn(caisseApi, 'getCurrentCashSession');
const mockGetPresetsActive = vi.spyOn(caisseApi, 'getPresetsActive');
const mockGetCategoriesSaleTickets = vi.spyOn(caisseApi, 'getCategoriesSaleTickets');
const mockPostSale = vi.spyOn(caisseApi, 'postSale');
const mockUpdateCashSessionStep = vi.spyOn(caisseApi, 'updateCashSessionStep');

const mockAddTicket = vi.spyOn(offlineQueue, 'addTicket');
const mockGetPendingCount = vi.spyOn(offlineQueue, 'getPendingCount');
const mockSyncOfflineQueue = vi.spyOn(offlineQueue, 'syncOfflineQueue');

const fakeSession = {
  id: 'session-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 1000,
  current_amount: 1000,
  status: 'open',
  opened_at: '2026-01-01T10:00:00Z',
  closed_at: null,
  current_step: 'sale',
  closing_amount: null,
  actual_amount: null,
  variance: null,
  variance_comment: null,
  session_type: 'real',
  total_sales: null,
  total_items: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

const fakePresets = [
  {
    id: 'preset-1',
    name: 'Preset 1',
    category_id: null,
    preset_price: 500,
    button_type: 'sale',
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const fakeCategories = [
  {
    id: 'cat-1',
    name: 'Cat 1',
    parent_id: null,
    official_name: null,
    is_visible_sale: true,
    is_visible_reception: false,
    display_order: 0,
    display_order_entry: 0,
    deleted_at: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat-2',
    name: 'Bijoux',
    parent_id: null,
    official_name: null,
    is_visible_sale: true,
    is_visible_reception: false,
    display_order: 1,
    display_order_entry: 1,
    deleted_at: null,
    created_at: '',
    updated_at: '',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockOnline = true;
  mockGetCurrentCashSession.mockResolvedValue(fakeSession as caisseApi.CashSessionItem);
  mockGetPresetsActive.mockResolvedValue(fakePresets as caisseApi.PresetItem[]);
  mockGetCategoriesSaleTickets.mockResolvedValue(fakeCategories as caisseApi.CategoryItem[]);
  mockUpdateCashSessionStep.mockResolvedValue(fakeSession as caisseApi.CashSessionItem);
  mockGetPendingCount.mockResolvedValue(0);
  mockSyncOfflineQueue.mockResolvedValue({ sent: 0, failed: 0, errors: [] });
});

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <CashRegisterSalePage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('CashRegisterSalePage — Story 15.3 layout', () => {
  it('affiche la page avec le data-testid page-cash-register-sale', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
  });

  it('affiche le header caisse dedie avec username et session', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-header')).toBeInTheDocument();
    });
    expect(screen.getByTestId('caisse-header')).toHaveTextContent('Alex Dupont');
    expect(screen.getByTestId('caisse-header')).toHaveTextContent('session-1'.slice(0, 8));
    expect(screen.getByTestId('caisse-header-close')).toBeInTheDocument();
  });

  it('affiche la barre de stats', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-stats-bar')).toBeInTheDocument();
    });
  });

  it('affiche les onglets de saisie', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-sale-tabs')).toBeInTheDocument();
    });
    expect(screen.getByText('Categorie')).toBeInTheDocument();
    expect(screen.getByText('Sous-categorie')).toBeInTheDocument();
    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('Prix')).toBeInTheDocument();
  });

  it('affiche la zone article en cours de saisie', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-item')).toBeInTheDocument();
    });
    expect(screen.getByTestId('caisse-current-item')).toHaveTextContent('ARTICLE EN COURS DE SAISIE');
  });

  it('affiche la grille de categories avec cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-category-grid')).toBeInTheDocument();
    });
    expect(screen.getByTestId('category-card-cat-1')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-cat-2')).toBeInTheDocument();
  });

  it('affiche le panneau ticket', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('caisse-ticket-panel')).toBeInTheDocument();
    });
    expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument();
    expect(screen.getByTestId('cart-empty')).toHaveTextContent('Aucun article');
    expect(screen.getByTestId('caisse-ticket-submit')).toBeInTheDocument();
  });
});

describe('CashRegisterSalePage — offline & sync (Story 5.4)', () => {
  it('affiche le bandeau hors ligne quand useOnlineStatus est false', async () => {
    mockOnline = false;
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByText(/Hors ligne/)).toBeInTheDocument();
  });

  it('en ligne sans tickets en attente : pas de bandeau sync', async () => {
    mockOnline = true;
    mockGetPendingCount.mockResolvedValue(0);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-cash-register-sale')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('sync-pending-banner')).not.toBeInTheDocument();
  });

  it('en ligne avec tickets en attente : affiche bandeau synchronisation', async () => {
    mockOnline = true;
    mockGetPendingCount.mockResolvedValue(2);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('sync-pending-banner')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 ticket\(s\) a envoyer/)).toBeInTheDocument();
  });

  it('soumission en ligne appelle POST /v1/sales et pas addTicket', async () => {
    mockPostSale.mockResolvedValue({} as caisseApi.SaleResponseItem);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    fireEvent.click(screen.getByTestId('caisse-ticket-submit'));

    await waitFor(() => {
      expect(mockPostSale).toHaveBeenCalledWith(
        'mock-token',
        expect.objectContaining({
          cash_session_id: 'session-1',
          items: expect.any(Array),
          payments: expect.any(Array),
        })
      );
    });
    expect(mockAddTicket).not.toHaveBeenCalled();
  });

  it('soumission hors ligne appelle addTicket avec offline_id et pas postSale', async () => {
    mockOnline = false;
    mockAddTicket.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('preset-preset-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('preset-preset-1'));
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('add-payment'));
    fireEvent.click(screen.getByTestId('caisse-ticket-submit'));

    await waitFor(() => {
      expect(mockAddTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          cash_session_id: 'session-1',
          items: expect.any(Array),
          payments: expect.any(Array),
          offline_id: expect.any(String),
          created_at: expect.any(String),
        })
      );
    });
    expect(mockPostSale).not.toHaveBeenCalled();
  });
});
