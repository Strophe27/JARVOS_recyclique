import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { DashboardPage } from './DashboardPage';

vi.mock('recharts', () => {
  const Original = vi.importActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockGetCashSessionStats = vi.fn();
const mockGetReceptionSummary = vi.fn();
const mockGetReceptionByCategory = vi.fn();
const mockGetSalesByCategory = vi.fn();

vi.mock('../api/stats', () => ({
  getCashSessionStats: (...args: unknown[]) => mockGetCashSessionStats(...args),
  getReceptionSummary: (...args: unknown[]) => mockGetReceptionSummary(...args),
  getReceptionByCategory: (...args: unknown[]) => mockGetReceptionByCategory(...args),
  getSalesByCategory: (...args: unknown[]) => mockGetSalesByCategory(...args),
}));

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { first_name: 'Alex', username: 'adupont' },
      accessToken: 'bff-session',
    });
    mockGetCashSessionStats.mockResolvedValue({
      total_sales: 1234.56,
      total_donations: 78.9,
      total_weight_sold: 42.3,
    });
    mockGetReceptionSummary.mockResolvedValue({
      total_weight: 150.5,
      total_items: 37,
    });
    mockGetReceptionByCategory.mockResolvedValue([]);
    mockGetSalesByCategory.mockResolvedValue([]);
  });

  it('affiche le conteneur principal avec data-testid', async () => {
    renderPage();
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('affiche le message de bienvenue avec le prenom', async () => {
    renderPage();
    const welcome = await screen.findByTestId('dashboard-welcome');
    expect(welcome).toHaveTextContent('Bienvenue sur RecyClique, Alex');
  });

  it('affiche le lien dashboard personnel', async () => {
    renderPage();
    const link = await screen.findByTestId('personal-dashboard-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/profil');
  });

  it('affiche les 5 boutons de filtre de periode', async () => {
    renderPage();
    expect(await screen.findByTestId('filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-today')).toBeInTheDocument();
    expect(screen.getByTestId('filter-week')).toBeInTheDocument();
    expect(screen.getByTestId('filter-month')).toBeInTheDocument();
    expect(screen.getByTestId('filter-year')).toBeInTheDocument();
  });

  it('affiche les date pickers et le bouton appliquer', async () => {
    renderPage();
    expect(await screen.findByTestId('filter-start-date')).toBeInTheDocument();
    expect(screen.getByTestId('filter-end-date')).toBeInTheDocument();
    expect(screen.getByTestId('filter-apply-custom')).toBeInTheDocument();
  });

  it('affiche les stat cards de ventes', async () => {
    renderPage();
    const revenue = await screen.findByTestId('stat-sales-revenue');
    expect(revenue).toHaveTextContent('1234.56');
    expect(revenue).toHaveTextContent("Chiffre d'affaires");

    const donations = screen.getByTestId('stat-sales-donations');
    expect(donations).toHaveTextContent('78.90');
    expect(donations).toHaveTextContent('Total des dons');

    const weight = screen.getByTestId('stat-sales-weight');
    expect(weight).toHaveTextContent('42.3');
    expect(weight).toHaveTextContent('Poids vendu');
  });

  it('affiche les stat cards de reception', async () => {
    renderPage();
    const weight = await screen.findByTestId('stat-reception-weight');
    expect(weight).toHaveTextContent('150.5');
    expect(weight).toHaveTextContent('Poids recu');

    const items = screen.getByTestId('stat-reception-items');
    expect(items).toHaveTextContent('37');
    expect(items).toHaveTextContent('Lignes de reception');
  });

  it('recharge les stats quand on change de filtre', async () => {
    renderPage();
    await screen.findByTestId('stat-sales-revenue');
    expect(mockGetCashSessionStats).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('filter-today'));
    expect(mockGetCashSessionStats).toHaveBeenCalledTimes(2);
  });

  it('affiche un message quand aucune donnee categorie', async () => {
    renderPage();
    expect(
      await screen.findByText(/Aucune donnee de categorie disponible/),
    ).toBeInTheDocument();
  });

  it('gere gracieusement les API qui retournent null', async () => {
    mockGetCashSessionStats.mockResolvedValue(null);
    mockGetReceptionSummary.mockResolvedValue(null);
    renderPage();
    const revenue = await screen.findByTestId('stat-sales-revenue');
    expect(revenue).toHaveTextContent('0');
  });

  it('affiche un message si pas de user', async () => {
    mockUseAuth.mockReturnValue({ user: null, accessToken: null });
    renderPage();
    const welcome = await screen.findByTestId('dashboard-welcome');
    expect(welcome).toHaveTextContent('Bienvenue sur RecyClique');
    expect(welcome).not.toHaveTextContent(',');
  });
});
