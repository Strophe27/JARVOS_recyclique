import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useReceptionKPILiveStats } from '../../../hooks/useReceptionKPILiveStats';
import * as api from '../../../services/api';

// Mock des services API
vi.mock('../../../services/api', () => ({
  getReceptionLiveStats: vi.fn(),
}));

// Mock du store auth
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const mockState = {
      currentUser: { id: '1', role: 'admin' },
    };
    return selector(mockState);
  }),
}));

describe('useReceptionKPILiveStats', () => {
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
    vi.clearAllTimers();
  });

  it('should fetch data on mount', async () => {
    const mockData = {
      tickets_open: 5,
      tickets_closed_24h: 23,
      items_received: 156,
      turnover_eur: 1247.50,
      donations_eur: 45.80,
      weight_in: 1250.75,
      weight_out: 890.25,
    };

    vi.mocked(api.getReceptionLiveStats).mockResolvedValue(mockData);

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(api.getReceptionLiveStats).toHaveBeenCalled();
    expect(result.current.isPolling).toBe(true);
    expect(result.current.isOnline).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('Network error');
    vi.mocked(api.getReceptionLiveStats).mockRejectedValue(error);

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
    vi.mocked(api.getReceptionLiveStats).mockRejectedValue(error);

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

  it('should stop polling when disabled', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useReceptionKPILiveStats({ enabled }),
      { initialProps: { enabled: true } }
    );

    expect(result.current.isPolling).toBe(true);

    rerender({ enabled: false });

    expect(result.current.isPolling).toBe(false);
  });

  it('should provide refresh function', async () => {
    const mockData = {
      tickets_open: 5,
      tickets_closed_24h: 23,
      items_received: 156,
      turnover_eur: 1247.50,
      donations_eur: 45.80,
      weight_in: 1250.75,
      weight_out: 890.25,
    };

    vi.mocked(api.getReceptionLiveStats).mockResolvedValue(mockData);

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    const newData = {
      tickets_open: 5,
      tickets_closed_24h: 30,
      items_received: 200,
      turnover_eur: 2000.00,
      donations_eur: 50.00,
      weight_in: 1500.00,
      weight_out: 1000.00,
    };

    vi.mocked(api.getReceptionLiveStats).mockResolvedValue(newData);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(newData);
    });
  });

  it('should use custom interval', () => {
    vi.useFakeTimers();
    const mockData = {
      tickets_open: 5,
      tickets_closed_24h: 23,
      items_received: 156,
      turnover_eur: 1247.50,
      donations_eur: 45.80,
      weight_in: 1250.75,
      weight_out: 890.25,
    };

    vi.mocked(api.getReceptionLiveStats).mockResolvedValue(mockData);

    renderHook(() => useReceptionKPILiveStats({ intervalMs: 5000, enabled: true }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Le polling devrait avoir été appelé plusieurs fois
    expect(api.getReceptionLiveStats).toHaveBeenCalledTimes(2); // Initial + after interval
  });

  it('should not poll if user is not admin', () => {
    const { useAuthStore } = require('../../../stores/authStore');
    useAuthStore.mockReturnValue({
      currentUser: { id: '1', role: 'user' },
    });

    const { result } = renderHook(() => useReceptionKPILiveStats({ enabled: true }));

    expect(result.current.isPolling).toBe(false);
    expect(api.getReceptionLiveStats).not.toHaveBeenCalled();
  });
});

