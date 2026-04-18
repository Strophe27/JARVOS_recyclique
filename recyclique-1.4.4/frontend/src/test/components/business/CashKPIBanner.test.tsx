import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import CashKPIBanner from '../../../components/business/CashKPIBanner';
import * as api from '../../../services/api';

// Mock des services API
vi.mock('../../../services/api', () => ({
  getCashLiveStats: vi.fn(),
  getReceptionLiveStats: vi.fn(),
}));

// Mock du hook useCashLiveStats
vi.mock('../../../hooks/useCashLiveStats', () => ({
  useCashLiveStats: vi.fn(),
}));

// Mock du hook useVirtualCashLiveStats
vi.mock('../../../hooks/useVirtualCashLiveStats', () => ({
  useVirtualCashLiveStats: vi.fn(),
}));

// Mock des stores
vi.mock('../../../stores/virtualCashSessionStore', () => ({
  useVirtualCashSessionStore: vi.fn(),
}));

vi.mock('../../../stores/cashSessionStore', () => ({
  useCashSessionStore: vi.fn(),
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock de react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CashKPIBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render all KPI labels', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 5,
        lastTicketAmount: 0,
        ca: 150.50,
        donations: 10.00,
        weightOut: 25.5,
        weightIn: 30.0,
        timestamp: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner />);

    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Dernier ticket')).toBeInTheDocument();
    expect(screen.getByText('CA jour')).toBeInTheDocument();
    expect(screen.getByText('Dons jour')).toBeInTheDocument();
    expect(screen.getByText('Poids sortis')).toBeInTheDocument();
    expect(screen.getByText('Poids rentrés')).toBeInTheDocument();
  });

  it('should display KPI values correctly', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 10,
        lastTicketAmount: 0,
        ca: 250.75,
        donations: 15.50,
        weightOut: 45.2,
        weightIn: 60.8,
        timestamp: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('250,75 €')).toBeInTheDocument();
    expect(screen.getByText('15,50 €')).toBeInTheDocument();
    expect(screen.getByText('45,2 kg')).toBeInTheDocument();
    expect(screen.getByText('60,8 kg')).toBeInTheDocument();
  });

  it('should display last ticket amount from props', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 5,
        lastTicketAmount: 0,
        ca: 150.50,
        donations: 10.00,
        weightOut: 25.5,
        weightIn: 30.0,
        timestamp: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner lastTicketAmount={42.50} />);

    expect(screen.getByText('42,50 €')).toBeInTheDocument();
  });

  it('should display offline status when not online', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 5,
        lastTicketAmount: 0,
        ca: 150.50,
        donations: 10.00,
        weightOut: 25.5,
        weightIn: 30.0,
        timestamp: new Date().toISOString(),
      },
      isLoading: false,
      error: 'Connexion perdue',
      isPolling: false,
      isOnline: false,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner />);

    expect(screen.getByText('Hors ligne')).toBeInTheDocument();
  });

  it('should display live indicator when online', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 5,
        lastTicketAmount: 0,
        ca: 150.50,
        donations: 10.00,
        weightOut: 25.5,
        weightIn: 30.0,
        timestamp: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should display timestamp when available', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    const testDate = new Date('2025-01-27T14:30:00');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 5,
        lastTicketAmount: 0,
        ca: 150.50,
        donations: 10.00,
        weightOut: 25.5,
        weightIn: 30.0,
        timestamp: testDate.toISOString(),
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: testDate,
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner />);

    // Le timestamp devrait être affiché au format HH:MM
    expect(screen.getByText(/14:30/)).toBeInTheDocument();
  });

  it('should display "--" for last ticket when amount is 0', () => {
    const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
    useCashLiveStats.mockReturnValue({
      data: {
        ticketsCount: 0,
        lastTicketAmount: 0,
        ca: 0,
        donations: 0,
        weightOut: 0,
        weightIn: 0,
        timestamp: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<CashKPIBanner />);

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  describe('Admin Session Link', () => {
    beforeEach(() => {
      // Setup default mocks
      const { useCashLiveStats } = require('../../../hooks/useCashLiveStats');
      const { useVirtualCashLiveStats } = require('../../../hooks/useVirtualCashLiveStats');
      const { useVirtualCashSessionStore } = require('../../../stores/virtualCashSessionStore');
      const { useCashSessionStore } = require('../../../stores/cashSessionStore');
      const { useAuthStore } = require('../../../stores/authStore');

      useCashLiveStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        isOnline: true,
        lastUpdate: new Date(),
      });

      useVirtualCashLiveStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        isOnline: true,
        lastUpdate: new Date(),
      });

      useVirtualCashSessionStore.mockReturnValue({
        isVirtualMode: false,
      });

      useCashSessionStore.mockReturnValue({
        currentSession: null,
      });

      useAuthStore.mockReturnValue({
        currentUser: null,
      });
    });

    it('should not show admin link when user is not admin', () => {
      const { useAuthStore } = require('../../../stores/authStore');
      useAuthStore.mockReturnValue({
        currentUser: { id: '1', role: 'user' },
      });

      render(<CashKPIBanner />);

      expect(screen.queryByText('Session')).not.toBeInTheDocument();
    });

    it('should not show admin link when no current session', () => {
      const { useAuthStore } = require('../../../stores/authStore');
      useAuthStore.mockReturnValue({
        currentUser: { id: '1', role: 'admin' },
      });

      render(<CashKPIBanner />);

      expect(screen.queryByText('Session')).not.toBeInTheDocument();
    });

    it('should show admin link for admin users with active session', () => {
      const { useAuthStore } = require('../../../stores/authStore');
      const { useCashSessionStore } = require('../../../stores/cashSessionStore');

      useAuthStore.mockReturnValue({
        currentUser: { id: '1', role: 'admin' },
      });

      useCashSessionStore.mockReturnValue({
        currentSession: { id: 'session-123' },
      });

      render(<CashKPIBanner />);

      expect(screen.getByText('Session')).toBeInTheDocument();
    });

    it('should show admin link for super-admin users with active session', () => {
      const { useAuthStore } = require('../../../stores/authStore');
      const { useCashSessionStore } = require('../../../stores/cashSessionStore');

      useAuthStore.mockReturnValue({
        currentUser: { id: '1', role: 'super-admin' },
      });

      useCashSessionStore.mockReturnValue({
        currentSession: { id: 'session-456' },
      });

      render(<CashKPIBanner />);

      expect(screen.getByText('Session')).toBeInTheDocument();
    });

    it('should navigate to admin session page when clicked', async () => {
      const { useAuthStore } = require('../../../stores/authStore');
      const { useCashSessionStore } = require('../../../stores/cashSessionStore');
      const { userEvent } = await import('@testing-library/user-event');

      useAuthStore.mockReturnValue({
        currentUser: { id: '1', role: 'admin' },
      });

      useCashSessionStore.mockReturnValue({
        currentSession: { id: 'session-789' },
      });

      const user = userEvent.setup();
      render(<CashKPIBanner />);

      const sessionButton = screen.getByText('Session');
      await user.click(sessionButton);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/cash-sessions/session-789');
    });
  });
});

