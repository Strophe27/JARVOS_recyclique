import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import AdminReceptionDashboard from '../../pages/Admin/ReceptionDashboard';

// Mock des hooks et services
vi.mock('../../hooks/useLiveReceptionStats', () => ({
  useLiveReceptionStats: vi.fn()
}));

vi.mock('../../services/api', () => ({
  getReceptionSummary: vi.fn(),
  getReceptionByCategory: vi.fn()
}));

import { useLiveReceptionStats } from '../../hooks/useLiveReceptionStats';
import { getReceptionSummary, getReceptionByCategory } from '../../services/api';

const mockUseLiveReceptionStats = vi.mocked(useLiveReceptionStats);
const mockGetReceptionSummary = vi.mocked(getReceptionSummary);
const mockGetReceptionByCategory = vi.mocked(getReceptionByCategory);

// Wrapper pour Mantine
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('AdminReceptionDashboard - Live Stats Integration', () => {
  const mockHistoricalStats = {
    total_weight: 100.5,
    total_items: 25,
    unique_categories: 5
  };

  const mockLiveStats = {
    total_weight: 125.5,
    total_items: 42,
    unique_categories: 8,
    timestamp: '2024-01-15T10:30:00.000Z'
  };

  const mockCategories = [
    { category_name: 'Electronique', total_weight: 25.5, total_items: 10 },
    { category_name: 'Vêtements', total_weight: 30.0, total_items: 15 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReceptionSummary.mockResolvedValue(mockHistoricalStats);
    mockGetReceptionByCategory.mockResolvedValue(mockCategories);
  });

  describe('Sans feature flag live', () => {
    beforeEach(() => {
      mockUseLiveReceptionStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        isPolling: false,
        isOnline: true,
        lastUpdate: null,
        togglePolling: vi.fn(),
        refresh: vi.fn(),
        featureEnabled: false
      });
    });

    it('affiche les statistiques historiques quand live est désactivé', async () => {
      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('100,5')).toBeInTheDocument(); // Poids historique
        expect(screen.getByText('25')).toBeInTheDocument(); // Items historique
      });

      expect(screen.queryByText('Live')).not.toBeInTheDocument();
      expect(screen.queryByText('Mode Live KPI')).not.toBeInTheDocument();
    });

    it('n\'affiche pas les contrôles live', () => {
      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      expect(screen.queryByText('Mode Live KPI')).not.toBeInTheDocument();
      expect(screen.queryByText('Activé')).not.toBeInTheDocument();
      expect(screen.queryByText('Désactivé')).not.toBeInTheDocument();
    });
  });

  describe('Avec feature flag live activé', () => {
    beforeEach(() => {
      mockUseLiveReceptionStats.mockReturnValue({
        data: mockLiveStats,
        isLoading: false,
        error: null,
        isPolling: true,
        isOnline: true,
        lastUpdate: new Date(mockLiveStats.timestamp),
        togglePolling: vi.fn(),
        refresh: vi.fn(),
        featureEnabled: true
      });
    });

    it('affiche les contrôles live quand le flag est activé', () => {
      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Mode Live KPI')).toBeInTheDocument();
      expect(screen.getByText(/Activé/)).toBeInTheDocument();
    });

    it('affiche le badge Live et timestamp quand polling actif', () => {
      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('Actualisé')).toBeInTheDocument();
      expect(screen.getByText(/à \d{2}:\d{2}:\d{2}/)).toBeInTheDocument(); // Format HH:MM:SS
    });

    it('affiche les statistiques live avec badge Live', async () => {
      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('125,5')).toBeInTheDocument(); // Poids live
        expect(screen.getByText('42')).toBeInTheDocument(); // Items live
      });

      // Vérifier que les badges Live sont présents sur les cartes KPI
      const liveBadges = screen.getAllByText('Live');
      expect(liveBadges.length).toBeGreaterThan(1); // Badge général + badges sur cartes
    });

    it('affiche "Mise à jour..." pendant le chargement', () => {
      mockUseLiveReceptionStats.mockReturnValue({
        ...mockUseLiveReceptionStats(),
        isLoading: true
      });

      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Mise à jour...')).toBeInTheDocument();
    });

    it('permet de basculer le mode live', () => {
      const mockToggle = vi.fn();
      mockUseLiveReceptionStats.mockReturnValue({
        ...mockUseLiveReceptionStats(),
        togglePolling: mockToggle
      });

      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it('affiche une bannière d\'erreur en cas d\'erreur API', () => {
      mockUseLiveReceptionStats.mockReturnValue({
        ...mockUseLiveReceptionStats(),
        error: 'Erreur serveur, stats live indisponibles'
      });

      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Erreur serveur, stats live indisponibles')).toBeInTheDocument();
    });

    it('affiche une bannière quand hors ligne', () => {
      mockUseLiveReceptionStats.mockReturnValue({
        ...mockUseLiveReceptionStats(),
        isOnline: false,
        error: 'Connexion perdue, polling suspendu'
      });

      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Connexion perdue - Polling suspendu')).toBeInTheDocument();
    });

    it('passe aux stats historiques quand live désactivé par l\'utilisateur', () => {
      mockUseLiveReceptionStats.mockReturnValue({
        ...mockUseLiveReceptionStats(),
        isPolling: false,
        data: null // Pas de données live
      });

      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      // Devrait afficher les stats historiques
      expect(screen.getByText('100,5')).toBeInTheDocument();
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });
  });

  describe('Transitions entre modes', () => {
    it('conserve les stats live quand polling désactivé', () => {
      mockUseLiveReceptionStats.mockReturnValue({
        data: mockLiveStats,
        isLoading: false,
        error: null,
        isPolling: false, // Désactivé par l'utilisateur
        isOnline: true,
        lastUpdate: new Date(mockLiveStats.timestamp),
        togglePolling: vi.fn(),
        refresh: vi.fn(),
        featureEnabled: true
      });

      render(
        <TestWrapper>
          <AdminReceptionDashboard />
        </TestWrapper>
      );

      // Devrait afficher les dernières stats live même si polling arrêté
      expect(screen.getByText('125,5')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument(); // Badge toujours visible
    });
  });
});
