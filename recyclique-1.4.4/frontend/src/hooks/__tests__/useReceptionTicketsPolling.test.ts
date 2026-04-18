import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useReceptionTicketsPolling } from '../useReceptionTicketsPolling';

describe('useReceptionTicketsPolling', () => {
  const mockData = { tickets: [{ id: '1', status: 'open' }] };
  let mockFetchFunction: vi.MockedFunction<() => Promise<typeof mockData>>;
  let originalNavigatorOnLine: boolean;

  beforeEach(() => {
    mockFetchFunction = vi.fn().mockResolvedValue(mockData);
    originalNavigatorOnLine = navigator.onLine;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Use fake timers for polling tests
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    // Restore original navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalNavigatorOnLine,
    });
  });

  it('should fetch data immediately on mount', async () => {
    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { pollInterval: 1000 })
    );

    // Initial state should be loading
    expect(result.current.loading).toBe(true);

    // Wait for the async operation to complete
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should not fetch immediately if immediate is false', () => {
    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { immediate: false })
    );

    expect(result.current.loading).toBe(false);
    expect(mockFetchFunction).not.toHaveBeenCalled();
  });

  it('should poll at specified interval', async () => {
    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { pollInterval: 1000 })
    );

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(1);

    // Advance time by poll interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Wait for the polling call to complete
    await waitFor(
      () => {
        expect(mockFetchFunction).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 }
    );
  });

  it('should not poll when disabled', async () => {
    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { enabled: false, pollInterval: 1000 })
    );

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(1); // Only initial call

    // Advance time - should not trigger additional calls
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Give a small delay to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should not have been called again
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should not poll when offline', async () => {
    // Set offline before rendering
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { pollInterval: 1000 })
    );

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(1); // Only initial call

    // Advance time - should not trigger additional calls when offline
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Give a small delay to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should not have been called again
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockFetchFunction.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should allow manual refetch', async () => {
    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { enabled: false })
    );

    // Wait for initial load to complete
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(1);

    // Manual refetch
    act(() => {
      result.current.refetch();
    });

    // Wait for refetch to complete
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(2);
  });

  it('should resume polling when coming back online', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() =>
      useReceptionTicketsPolling(mockFetchFunction, { pollInterval: 1000 })
    );

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 }
    );

    expect(mockFetchFunction).toHaveBeenCalledTimes(1);

    // Advance time - should not poll while offline
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Small delay to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);

    // Come back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger online event
      window.dispatchEvent(new Event('online'));
    });

    // Should fetch immediately when coming back online
    await waitFor(
      () => {
        expect(mockFetchFunction).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 }
    );

    // Should resume polling
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(
      () => {
        expect(mockFetchFunction).toHaveBeenCalledTimes(3);
      },
      { timeout: 1000 }
    );
  });
});
