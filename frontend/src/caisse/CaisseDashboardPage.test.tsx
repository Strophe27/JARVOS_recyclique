/**
 * Tests CaisseDashboardPage — Story 5.1, 11.2 (Vitest + RTL + MantineProvider).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import * as caisseApi from '../api/caisse';
import type { CashRegisterItem } from '../api/caisse';
import { CaisseDashboardPage } from './CaisseDashboardPage';
import styles from './CaisseDashboardPage.module.css';

const setCurrentRegisterMock = vi.fn();

vi.mock('../api/caisse', () => ({
  getCashRegisters: vi.fn().mockResolvedValue([]),
  getCashRegistersStatus: vi.fn().mockResolvedValue([]),
  getCashSessionStatus: vi.fn().mockResolvedValue({
    has_open_session: false,
    register_id: '',
    session_id: null,
    opened_at: null,
  }),
  getCurrentCashSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'bff-session',
  }),
}));
vi.mock('./CaisseContext', () => ({
  useCaisse: () => ({
    setCurrentRegister: setCurrentRegisterMock,
    currentRegisterId: null,
  }),
}));

function renderWithRouter() {
  return render(
    <MantineProvider>
      <BrowserRouter>
        <CaisseDashboardPage />
      </BrowserRouter>
    </MantineProvider>
  );
}

describe('CaisseDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard title', async () => {
    renderWithRouter();
    expect(
      await screen.findByRole('heading', { name: /sélection du poste de caisse/i })
    ).toBeInTheDocument();
  });

  it('has dashboard page test id', async () => {
    renderWithRouter();
    expect(await screen.findByTestId('caisse-dashboard-page')).toBeInTheDocument();
  });

  it('renders virtual and deferred cards', async () => {
    renderWithRouter();
    const virtualTitle = await screen.findByText(/caisse virtuelle/i);
    expect(virtualTitle).toBeInTheDocument();
    expect(await screen.findByText(/simulation/i)).toBeInTheDocument();
    const deferredTitle = await screen.findByText(/saisie différée/i);
    expect(deferredTitle).toBeInTheDocument();
    expect(await screen.findByText('ADMIN')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /simuler/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /accéder/i })).toBeInTheDocument();
    const virtualCard = virtualTitle.closest(`.${styles.cardBase}`);
    const deferredCard = deferredTitle.closest(`.${styles.cardBase}`);
    expect(virtualCard).toHaveClass(styles.virtualCard);
    expect(deferredCard).toHaveClass(styles.deferredCard);
  });

  it('AC4 : affiche un message explicite quand aucun poste retourne', async () => {
    vi.mocked(caisseApi.getCashRegisters).mockResolvedValue([]);
    renderWithRouter();
    expect(
      await screen.findByText(/aucun poste de caisse disponible/i)
    ).toBeInTheDocument();
    expect(await screen.findByTestId('caisse-dashboard-empty')).toBeInTheDocument();
  });

  it('AC4 : les cards Caisse Virtuelle et Saisie differee restent visibles quand registers est vide', async () => {
    vi.mocked(caisseApi.getCashRegisters).mockResolvedValue([]);
    renderWithRouter();
    expect(await screen.findByText(/caisse virtuelle/i)).toBeInTheDocument();
    expect(await screen.findByText(/saisie diff/i)).toBeInTheDocument();
  });

  it('renders status badges and action buttons for registers', async () => {
    const registers: CashRegisterItem[] = [
      {
        id: 'reg-open',
        site_id: 'site-1',
        name: 'Poste ouvert',
        location: 'Site 1',
        is_active: true,
        enable_virtual: true,
        enable_deferred: true,
        started_at: null,
        started_by_user_id: null,
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
      {
        id: 'reg-closed',
        site_id: 'site-1',
        name: 'Poste fermé',
        location: 'Site 1',
        is_active: true,
        enable_virtual: true,
        enable_deferred: true,
        started_at: null,
        started_by_user_id: null,
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
    ];

    vi.mocked(caisseApi.getCashRegisters).mockResolvedValue(registers);
    vi.mocked(caisseApi.getCashRegistersStatus).mockResolvedValue([
      {
        register_id: 'reg-open',
        status: 'started',
        started_at: '2026-03-01T10:00:00Z',
        started_by_user_id: 'user-1',
      },
      {
        register_id: 'reg-closed',
        status: 'free',
        started_at: null,
        started_by_user_id: null,
      },
    ]);
    vi.mocked(caisseApi.getCashSessionStatus).mockImplementation(async (_token, registerId) => {
      if (registerId === 'reg-open') {
        return {
          register_id: registerId,
          has_open_session: true,
          session_id: 'session-1',
          opened_at: '2026-03-01T10:00:00Z',
        };
      }
      return {
        register_id: registerId,
        has_open_session: false,
        session_id: null,
        opened_at: null,
      };
    });

    renderWithRouter();

    expect(await screen.findByText('OUVERTE')).toBeInTheDocument();
    expect(await screen.findByText('FERMÉE')).toBeInTheDocument();
    expect(await screen.findByTestId('caisse-poste-reg-open')).toHaveTextContent(/accéder/i);
    expect(await screen.findByTestId('caisse-open-session-reg-closed')).toHaveTextContent(/ouvrir/i);
  });
});
