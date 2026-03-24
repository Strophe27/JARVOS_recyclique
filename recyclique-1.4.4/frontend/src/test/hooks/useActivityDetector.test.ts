import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useActivityDetector } from '../../hooks/useActivityDetector';

describe('useActivityDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should detect activity on mousemove', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 100 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();
    expect(result.current.hasRecentActivity).toBe(true);

    // Simulate mousemove
    await act(async () => {
      const event = new MouseEvent('mousemove', { bubbles: true });
      window.dispatchEvent(event);
    });

    // Should not update immediately (debounce)
    expect(result.current.lastActivityTime).toBe(initialTime);

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should have updated after debounce
    expect(result.current.lastActivityTime).not.toBe(initialTime);
    expect(result.current.hasRecentActivity).toBe(true);
  });

  it('should detect activity on click', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 100 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();

    // Simulate click
    await act(async () => {
      const event = new MouseEvent('click', { bubbles: true });
      window.dispatchEvent(event);
    });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should have updated after debounce
    expect(result.current.lastActivityTime).not.toBe(initialTime);
    expect(result.current.hasRecentActivity).toBe(true);
  });

  it('should detect activity on keypress', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 100 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();

    // Simulate keypress
    await act(async () => {
      const event = new KeyboardEvent('keypress', { bubbles: true });
      window.dispatchEvent(event);
    });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should have updated after debounce
    expect(result.current.lastActivityTime).not.toBe(initialTime);
    expect(result.current.hasRecentActivity).toBe(true);
  });

  it('should detect activity on scroll', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 100 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();

    // Simulate scroll
    await act(async () => {
      const event = new Event('scroll', { bubbles: true });
      window.dispatchEvent(event);
    });

    // Fast-forward past debounce (scroll is throttled to 500ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Should have updated after debounce
    expect(result.current.lastActivityTime).not.toBe(initialTime);
    expect(result.current.hasRecentActivity).toBe(true);
  });

  it('should detect activity on touchstart', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 100 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();

    // Simulate touchstart
    await act(async () => {
      const event = new TouchEvent('touchstart', { bubbles: true });
      window.dispatchEvent(event);
    });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should have updated after debounce
    expect(result.current.lastActivityTime).not.toBe(initialTime);
    expect(result.current.hasRecentActivity).toBe(true);
  });

  it('should debounce activity detection', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 1000 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();

    // Simulate multiple rapid events
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        vi.advanceTimersByTime(100);
      }
    });

    // Should still be initial time (debounce not passed)
    expect(result.current.lastActivityTime).toBe(initialTime);

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should have updated only once (debounced)
    expect(result.current.lastActivityTime).not.toBe(initialTime);
  });

  it('should return hasRecentActivity true when activity is recent', async () => {
    const { result } = renderHook(() => 
      useActivityDetector({ 
        debounceMs: 100,
        recentActivityThreshold: 5000 // 5 seconds
      })
    );

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should be true after initial activity
    expect(result.current.hasRecentActivity).toBe(true);

    // Simulate activity
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should be true after activity
    expect(result.current.hasRecentActivity).toBe(true);

    // Fast-forward past threshold (5 seconds)
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    // Should be false after threshold
    expect(result.current.hasRecentActivity).toBe(false);
  });

  it('should return hasRecentActivity false when activity is old', async () => {
    const { result } = renderHook(() => 
      useActivityDetector({ 
        debounceMs: 100,
        recentActivityThreshold: 2000 // 2 seconds
      })
    );

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Simulate activity
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should be true after activity
    expect(result.current.hasRecentActivity).toBe(true);

    // Fast-forward past threshold (2 seconds)
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Should be false after threshold
    expect(result.current.hasRecentActivity).toBe(false);
  });

  it('should allow manual activity recording', async () => {
    const { result } = renderHook(() => useActivityDetector({ debounceMs: 100 }));

    // Fast-forward past initial debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const initialTime = result.current.lastActivityTime;
    expect(initialTime).not.toBeNull();

    // Manually record activity
    await act(async () => {
      result.current.recordActivity();
    });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should have updated after debounce
    expect(result.current.lastActivityTime).not.toBe(initialTime);
    expect(result.current.hasRecentActivity).toBe(true);
  });

  it('should clean up event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useActivityDetector());

    // Should have added event listeners
    expect(addEventListenerSpy).toHaveBeenCalled();

    unmount();

    // Should have removed event listeners
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});

