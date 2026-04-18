import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useReceptionKPILiveStats } from '../../hooks/useReceptionKPILiveStats';
import * as api from '../../services/api';

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { currentUser: { id: '1', role: 'admin' as string } },
}));

vi.mock('../../services/api', () => ({
  getUnifiedLiveStats: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: typeof mockAuthState) => unknown) =>
    selector(mockAuthState)
  ),
}));

const defaultUnified = {
  tickets_open: 5,
  tickets_closed_24h: 23,
  tickets_count: 0,
  items_received: 156,
  ca: 1247.5,
  donations: 45.8,
  weight_in: 1250.75,
  weight_out: 890.25,
  period_end: '2026-01-01T12:00:00.000Z',
};

const expectedKpiFromUnified = (u: typeof defaultUnified) => ({
  tickets_open: u.tickets_open,
  tickets_closed_24h: u.tickets_closed_24h,
  tickets_count: u.tickets_count,
  items_received: u.items_received,
  turnover_eur: u.ca,
  donations_eur: u.donations,
  weight_in: u.weight_in,
  weight_out: u.weight_out,
});

describe('useReceptionKPILiveStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.currentUser.role = 'admin';
    vi.mocked(api.getUnifiedLiveStats).mockResolvedValue({ ...defaultUnified });
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should fetch data on mount', async () => {
    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedKpiFromUnified(defaultUnified));
    });

    expect(api.getUnifiedLiveStats).toHaveBeenCalledWith('daily');
    expect(result.current.isPolling).toBe(true);
    expect(result.current.isOnline).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('Network error');
    vi.mocked(api.getUnifiedLiveStats).mockRejectedValue(error);

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Erreur réseau');
  });

  it('should handle 403 errors', async () => {
    const error = {
      response: { status: 403 },
    };
    vi.mocked(api.getUnifiedLiveStats).mockRejectedValue(error);

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toContain('Accès non autorisé');
  });

  it('should handle offline mode', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isPolling).toBe(false);
  });

  it('should stop polling when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useReceptionKPILiveStats({ enabled }),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => {
      expect(result.current.isPolling).toBe(true);
    });

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });
  });

  it('should provide refresh function', async () => {
    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedKpiFromUnified(defaultUnified));
    });

    const unifiedSecond = {
      ...defaultUnified,
      tickets_closed_24h: 30,
      items_received: 200,
      ca: 2000.0,
      donations: 50.0,
      weight_in: 1500.0,
      weight_out: 1000.0,
    };

    vi.mocked(api.getUnifiedLiveStats).mockResolvedValue(unifiedSecond);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(expectedKpiFromUnified(unifiedSecond));
    });
  });

  it('should use custom interval', () => {
    vi.useFakeTimers();
    renderHook(() => useReceptionKPILiveStats({ intervalMs: 5000, enabled: true }));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(api.getUnifiedLiveStats).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('should not poll if user is not admin', () => {
    mockAuthState.currentUser.role = 'user';

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    expect(result.current.isPolling).toBe(false);
    expect(api.getUnifiedLiveStats).not.toHaveBeenCalled();
  });
});
