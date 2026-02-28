/**
 * Tests CaisseDashboardPage — Story 5.1, 11.2 (Vitest + RTL + MantineProvider).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CaisseDashboardPage } from './CaisseDashboardPage';

vi.mock('../api/caisse', () => ({
  getCashRegisters: vi.fn().mockResolvedValue([]),
  getCashRegistersStatus: vi.fn().mockResolvedValue([]),
  getCashSessionStatus: vi.fn().mockResolvedValue({ has_open_session: false, register_id: '', session_id: null, opened_at: null }),
  getCurrentCashSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'bff-session',
  }),
}));
vi.mock('./CaisseContext', () => ({
  useCaisse: () => ({
    setCurrentRegister: vi.fn(),
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
    expect(await screen.findByRole('heading', { name: /dashboard caisses/i })).toBeInTheDocument();
  });

  it('has dashboard page test id', async () => {
    renderWithRouter();
    expect(await screen.findByTestId('caisse-dashboard-page')).toBeInTheDocument();
  });
});
