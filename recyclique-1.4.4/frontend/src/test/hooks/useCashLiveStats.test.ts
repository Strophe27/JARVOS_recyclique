import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCashLiveStats } from '../../hooks/useCashLiveStats';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  getUnifiedLiveStats: vi.fn(),
}));

const defaultUnified = {
  tickets_count: 12,
  last_ticket_amount: 42.5,
  ca: 980.25,
  donations: 33.0,
  weight_out: 400.0,
  weight_in: 600.5,
  period_end: '2026-01-01T12:00:00.000Z',
};

const expectedCashFromUnified = (u: typeof defaultUnified) => ({
  ticketsCount: u.tickets_count,
  lastTicketAmount: u.last_ticket_amount,
  ca: u.ca,
  donations: u.donations,
  weightOut: u.weight_out,
  weightIn: u.weight_in,
  timestamp: u.period_end,
});

describe('useCashLiveStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getUnifiedLiveStats).mockResolvedValue({ ...defaultUnified });
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should fetch and map unified live stats on mount', async () => {
    const { result } = renderHook(() => useCashLiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedCashFromUnified(defaultUnified));
    });

    expect(api.getUnifiedLiveStats).toHaveBeenCalledWith('daily');
    expect(result.current.isPolling).toBe(true);
    expect(result.current.isOnline).toBe(true);
  });

  it('should map generic API errors via mapLiveNetworkStatsError', async () => {
    vi.mocked(api.getUnifiedLiveStats).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCashLiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Erreur réseau');
  });

  it('should map 403 errors via mapLiveNetworkStatsError', async () => {
    vi.mocked(api.getUnifiedLiveStats).mockRejectedValue({
      response: { status: 403 },
    });

    const { result } = renderHook(() => useCashLiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toContain('Accès non autorisé');
  });

  it('should not poll when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useCashLiveStats({ enabled: true }));

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isPolling).toBe(false);
  });

  it('should refresh on demand', async () => {
    const { result } = renderHook(() => useCashLiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedCashFromUnified(defaultUnified));
    });

    const second = {
      ...defaultUnified,
      ca: 1100,
      tickets_count: 15,
    };
    vi.mocked(api.getUnifiedLiveStats).mockResolvedValue(second);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedCashFromUnified(second));
    });
  });
});
