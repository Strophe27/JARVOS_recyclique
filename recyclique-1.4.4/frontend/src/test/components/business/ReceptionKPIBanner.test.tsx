import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ReceptionKPIBanner from '../../../components/business/ReceptionKPIBanner';

// Mock du hook useReceptionKPILiveStats
vi.mock('../../../hooks/useReceptionKPILiveStats', () => ({
  useReceptionKPILiveStats: vi.fn(),
}));

describe('ReceptionKPIBanner', () => {
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
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    useReceptionKPILiveStats.mockReturnValue({
      data: {
        tickets_open: 5,
        tickets_closed_24h: 23,
        items_received: 156,
        turnover_eur: 1247.50,
        donations_eur: 45.80,
        weight_in: 1250.75,
        weight_out: 890.25,
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<ReceptionKPIBanner />);

    expect(screen.getByText('Tickets caisse')).toBeInTheDocument();
    expect(screen.getByText('CA jour')).toBeInTheDocument();
    expect(screen.getByText('Dons jour')).toBeInTheDocument();
    expect(screen.getByText('Poids sortis')).toBeInTheDocument();
    expect(screen.getByText('Poids rentrés')).toBeInTheDocument();
    expect(screen.getByText('Objets')).toBeInTheDocument();
  });

  it('should display KPI values correctly', () => {
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    useReceptionKPILiveStats.mockReturnValue({
      data: {
        tickets_open: 5,
        tickets_closed_24h: 23,
        items_received: 156,
        turnover_eur: 2500.75,
        donations_eur: 150.50,
        weight_in: 2000.5,
        weight_out: 1200.8,
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<ReceptionKPIBanner />);

    expect(screen.getByText('23')).toBeInTheDocument(); // tickets_closed_24h
    expect(screen.getByText('156')).toBeInTheDocument(); // items_received
    expect(screen.getByText('2 500,75 €')).toBeInTheDocument();
    expect(screen.getByText('150,50 €')).toBeInTheDocument();
    expect(screen.getByText('1200,8 kg')).toBeInTheDocument(); // weight_out (poids sortis)
    expect(screen.getByText('2000,5 kg')).toBeInTheDocument(); // weight_in (poids rentrés)
  });

  it('should display offline status when not online', () => {
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    useReceptionKPILiveStats.mockReturnValue({
      data: {
        tickets_open: 5,
        tickets_closed_24h: 23,
        items_received: 156,
        turnover_eur: 1247.50,
        donations_eur: 45.80,
        weight_in: 1250.75,
        weight_out: 890.25,
      },
      isLoading: false,
      error: 'Connexion perdue',
      isPolling: false,
      isOnline: false,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<ReceptionKPIBanner />);

    expect(screen.getByText('Hors ligne')).toBeInTheDocument();
  });

  it('should display live indicator when online', () => {
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    useReceptionKPILiveStats.mockReturnValue({
      data: {
        tickets_open: 5,
        tickets_closed_24h: 23,
        items_received: 156,
        turnover_eur: 1247.50,
        donations_eur: 45.80,
        weight_in: 1250.75,
        weight_out: 890.25,
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<ReceptionKPIBanner />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should display timestamp when available', () => {
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    const testDate = new Date('2025-01-27T14:30:00');
    useReceptionKPILiveStats.mockReturnValue({
      data: {
        tickets_open: 5,
        tickets_closed_24h: 23,
        items_received: 156,
        turnover_eur: 1247.50,
        donations_eur: 45.80,
        weight_in: 1250.75,
        weight_out: 890.25,
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: testDate,
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<ReceptionKPIBanner />);

    // Le timestamp devrait être affiché au format HH:MM
    expect(screen.getByText(/14:30/)).toBeInTheDocument();
  });

  it('should display zero values when data is null', () => {
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    useReceptionKPILiveStats.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    render(<ReceptionKPIBanner />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0,00 €')).toBeInTheDocument();
    expect(screen.getByText('0,0 kg')).toBeInTheDocument();
  });

  it('should have correct test id', () => {
    const { useReceptionKPILiveStats } = require('../../../hooks/useReceptionKPILiveStats');
    useReceptionKPILiveStats.mockReturnValue({
      data: {
        tickets_open: 5,
        tickets_closed_24h: 23,
        items_received: 156,
        turnover_eur: 1247.50,
        donations_eur: 45.80,
        weight_in: 1250.75,
        weight_out: 890.25,
      },
      isLoading: false,
      error: null,
      isPolling: true,
      isOnline: true,
      lastUpdate: new Date(),
      togglePolling: vi.fn(),
      refresh: vi.fn(),
    });

    const { container } = render(<ReceptionKPIBanner />);
    const banner = container.querySelector('[data-testid="reception-kpi-banner"]');
    expect(banner).toBeInTheDocument();
  });
});

