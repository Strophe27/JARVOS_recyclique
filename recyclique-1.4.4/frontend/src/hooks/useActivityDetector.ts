import { useEffect, useRef, useState, useCallback } from 'react';

interface UseActivityDetectorOptions {
  /**
   * Debounce delay for activity detection (ms)
   * Default: 1000 (1 second)
   */
  debounceMs?: number;
  
  /**
   * Minimum time between activity pings (ms)
   * Default: 30000 (30 seconds)
   */
  minPingInterval?: number;
  
  /**
   * Whether to trigger automatic refresh on activity
   * Default: true
   */
  enableAutoRefresh?: boolean;
  
  /**
   * Time threshold for "recent activity" (ms)
   * Default: 300000 (5 minutes)
   */
  recentActivityThreshold?: number;
}

interface UseActivityDetectorReturn {
  /**
   * Last activity timestamp
   */
  lastActivityTime: number | null;
  
  /**
   * Whether user has recent activity (< threshold)
   */
  hasRecentActivity: boolean;
  
  /**
   * Manually record activity
   */
  recordActivity: () => void;
}

/**
 * Hook to detect user activity (mouse, keyboard, touch, scroll)
 * 
 * Features:
 * - Detects user events: mousemove, click, keypress, scroll, touchstart, focus
 * - Debounces activity detection to avoid excessive updates
 * - Tracks last activity time and recent activity status
 * - Can be used to trigger intelligent pings and refresh
 * 
 * @param options Configuration options
 * @returns Activity detection state and controls
 */
export function useActivityDetector(
  options: UseActivityDetectorOptions = {}
): UseActivityDetectorReturn {
  const {
    debounceMs = 1000, // 1 second debounce
    minPingInterval = 30000, // 30 seconds minimum between pings
    recentActivityThreshold = 300000 // 5 minutes
  } = options;

  // Initialize with current time (user is present on mount)
  // Use lazy initialization to avoid issues during SSR or initial render
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      return Date.now();
    }
    return null;
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(0);

  /**
   * Record activity with debounce
   */
  const recordActivity = useCallback(() => {
    const now = Date.now();
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      setLastActivityTime(now);
      debounceTimerRef.current = null;
    }, debounceMs);
  }, [debounceMs]);

  /**
   * Throttled scroll handler (scroll can be very frequent)
   */
  const handleScroll = useCallback(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    // Throttle scroll to 500ms
    if (now - lastPingTimeRef.current < 500) {
      return;
    }
    lastPingTimeRef.current = now;
    recordActivity();
  }, [recordActivity]);

  /**
   * Set up event listeners for user activity
   */
  useEffect(() => {
    // Safety check for SSR/initial render
    if (typeof window === 'undefined') return;

    // Events to detect
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'click',
      'keypress',
      'touchstart',
      'focus'
    ];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    // Add scroll listener with throttle
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial activity on mount (user is present)
    recordActivity();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, recordActivity);
      });
      window.removeEventListener('scroll', handleScroll);
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [recordActivity, handleScroll]);

  // Calculate hasRecentActivity with periodic updates
  // Initialize as true since lastActivityTime is initialized with Date.now()
  const [hasRecentActivity, setHasRecentActivity] = useState<boolean>(true);

  // Update hasRecentActivity periodically to reflect time passing
  useEffect(() => {
    const updateHasRecentActivity = () => {
      const isRecent = lastActivityTime !== null 
        ? Date.now() - lastActivityTime < recentActivityThreshold
        : false;
      setHasRecentActivity(isRecent);
    };

    // Initial calculation
    updateHasRecentActivity();

    // Update every second to reflect time passing
    const interval = setInterval(updateHasRecentActivity, 1000);

    return () => clearInterval(interval);
  }, [lastActivityTime, recentActivityThreshold]);

  return {
    lastActivityTime,
    hasRecentActivity,
    recordActivity
  };
}
