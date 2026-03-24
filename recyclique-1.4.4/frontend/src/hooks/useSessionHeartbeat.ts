import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { isTokenExpiringSoon, getTimeUntilExpiration, getTokenExpiration } from '../utils/jwt';
import axiosClient from '../api/axiosClient';
import { useActivityDetector } from './useActivityDetector';

interface UseSessionHeartbeatOptions {
  /**
   * Minutes before token expiration to trigger proactive refresh
   * Default: 2 minutes
   */
  refreshBeforeExpiryMinutes?: number;
  
  /**
   * Interval in milliseconds to check token expiration
   * Default: 60000 (1 minute)
   */
  checkInterval?: number;
  
  /**
   * Whether to send activity pings
   * Default: true
   */
  enablePing?: boolean;
  
  /**
   * Interval in milliseconds for activity pings
   * Default: 300000 (5 minutes)
   */
  pingInterval?: number;
}

interface UseSessionHeartbeatReturn {
  /**
   * Manually trigger a token refresh
   * Returns true if successful, false otherwise
   */
  refreshToken: () => Promise<boolean>;
  
  /**
   * Manually send an activity ping
   */
  sendPing: () => Promise<void>;
  
  /**
   * Time until token expiration in milliseconds
   * Returns null if token is invalid
   */
  timeUntilExpiration: number | null;
  
  /**
   * Whether token is expiring soon
   */
  isExpiringSoon: boolean;
  
  /**
   * Whether a refresh is currently in progress
   */
  isRefreshing: boolean;
  
  /**
   * Whether the tab is currently visible
   */
  isTabVisible: boolean;
  
  /**
   * Whether user has recent activity
   */
  hasRecentActivity: boolean;
  
  /**
   * Whether refresh failed (for banner display)
   */
  refreshFailed: boolean;
}

/**
 * Hook to manage session heartbeat, token refresh, and activity pings
 * 
 * Features:
 * - Proactive token refresh (2 min before expiration) - only if user is active
 * - Reactive token refresh (on 401 errors via axiosClient)
 * - Intelligent activity pings (triggered by user activity, not periodic)
 * - Pause/resume on tab visibility changes
 * - Prevents double pings when refresh is happening
 * 
 * B42-P6: Now uses activity detector for intelligent pings and refresh
 * 
 * @param options Configuration options
 * @returns Session heartbeat controls and state
 */
export function useSessionHeartbeat(
  options: UseSessionHeartbeatOptions = {}
): UseSessionHeartbeatReturn {
  const {
    refreshBeforeExpiryMinutes = 2,
    checkInterval = 60000, // 1 minute
    enablePing = true,
    pingInterval = 300000 // 5 minutes (used as minPingInterval for activity-based pings)
  } = options;

  const token = useAuthStore((state) => state.token);
  const refreshPending = useAuthStore((state) => state.refreshPending);
  const tokenExpiration = useAuthStore((state) => state.tokenExpiration);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  
  // B42-P6: Use activity detector (only if authenticated to avoid issues on login page)
  const { hasRecentActivity, lastActivityTime } = useActivityDetector({
    minPingInterval: pingInterval,
    recentActivityThreshold: 300000 // 5 minutes
  });
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(0);
  const lastRefreshTimeRef = useRef<number>(0);
  const isTabVisibleRef = useRef<boolean>(!document.hidden);
  const [refreshFailed, setRefreshFailed] = useState<boolean>(false);

  /**
   * Send activity ping to server
   * B42-P6: Only ping if user has recent activity and enough time has passed
   */
  const sendPing = useCallback(async () => {
    if (!isAuthenticated || document.hidden) {
      return;
    }

    // B42-P6: Don't ping if user is inactive
    if (!hasRecentActivity) {
      return;
    }

    // Don't ping if we just refreshed (refresh includes activity update)
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 10000) { // 10 seconds grace period
      return;
    }

    // B42-P6: Respect minimum ping interval (30 seconds default)
    if (now - lastPingTimeRef.current < pingInterval) {
      return;
    }

    try {
      await axiosClient.post('/v1/activity/ping');
      lastPingTimeRef.current = now;
    } catch (error) {
      console.debug('Activity ping failed', error);
    }
  }, [isAuthenticated, hasRecentActivity, pingInterval]);

  /**
   * Check token expiration and trigger refresh if needed
   * B42-P6: Only refresh automatically if user has recent activity
   */
  const checkAndRefresh = useCallback(async () => {
    if (!token || !isAuthenticated || refreshPending) {
      return;
    }

    // Get token expiration time
    const expiration = getTimeUntilExpiration(token);
    if (expiration === null || expiration <= 0) {
      // Token already expired or invalid
      return;
    }

    // B42-P6: Only refresh automatically if user has recent activity
    if (!hasRecentActivity) {
      console.debug('User inactive, skipping automatic refresh');
      return;
    }

    // Check if token is expiring soon - if so, trigger automatic refresh
    // We don't need to check "canAutoRefresh" because if the token is expiring soon,
    // we should refresh it regardless of the total session duration
    if (isTokenExpiringSoon(token, refreshBeforeExpiryMinutes)) {
      console.debug('Token expiring soon, triggering automatic refresh (user active)');
      try {
        const success = await refreshToken();
        if (success) {
          lastRefreshTimeRef.current = Date.now();
          setRefreshFailed(false);
          // Skip ping after refresh (refresh includes activity update)
        } else {
          setRefreshFailed(true);
          console.warn('Automatic refresh failed, but user is active - banner will show');
        }
      } catch (error) {
        setRefreshFailed(true);
        console.error('Error during automatic refresh:', error);
        // Don't throw - let the banner handle the error display
      }
    }
  }, [token, isAuthenticated, refreshPending, refreshBeforeExpiryMinutes, refreshToken, hasRecentActivity]);

  /**
   * Handle tab visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isTabVisibleRef.current = isVisible;

      if (isVisible && isAuthenticated) {
        // Tab became visible, check token and send ping if needed
        checkAndRefresh();
        if (enablePing && hasRecentActivity) {
          const now = Date.now();
          // Send ping if last ping was more than pingInterval ago
          if (now - lastPingTimeRef.current > pingInterval) {
            sendPing();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, enablePing, pingInterval, checkAndRefresh, sendPing, hasRecentActivity]);

  /**
   * Set up intervals for token checking and pings
   */
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Clear intervals if not authenticated
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Set up token expiration check interval
    checkIntervalRef.current = setInterval(() => {
      if (!document.hidden) {
        checkAndRefresh();
      }
    }, checkInterval);

    // B42-P6: Activity-based pings (no periodic interval)
    // Pings are triggered by activity detector via useEffect on lastActivityTime

    // Initial check
    checkAndRefresh();
    if (enablePing && !document.hidden && hasRecentActivity) {
      sendPing();
    }

    // Reset refreshFailed when token changes (new login or successful refresh)
    // This ensures the banner doesn't show "Connexion perdue" after a successful refresh
    setRefreshFailed(false);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, token, checkInterval, enablePing, checkAndRefresh, sendPing, hasRecentActivity]);

  /**
   * B42-P6: Trigger ping when activity is detected (activity-based, not periodic)
   */
  useEffect(() => {
    if (!enablePing || !isAuthenticated || document.hidden || !hasRecentActivity) {
      return;
    }

    // Trigger ping when activity is detected (with debounce via minPingInterval)
    const now = Date.now();
    if (now - lastPingTimeRef.current >= pingInterval) {
      sendPing();
    }
  }, [lastActivityTime, enablePing, isAuthenticated, hasRecentActivity, pingInterval, sendPing]);

  // Calculate time until expiration - recalculate dynamically
  // Use state to ensure it updates every second for accurate countdown
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<number | null>(() => {
    if (!tokenExpiration) return null;
    const now = Date.now();
    return tokenExpiration > now ? tokenExpiration - now : 0;
  });
  
  // Update timeUntilExpiration when tokenExpiration changes or every second
  useEffect(() => {
    if (!tokenExpiration) {
      setTimeUntilExpiration(null);
      return;
    }
    
    const updateTimeUntilExpiration = () => {
      const now = Date.now();
      const remaining = tokenExpiration > now ? tokenExpiration - now : 0;
      setTimeUntilExpiration(remaining);
    };
    
    // Update immediately
    updateTimeUntilExpiration();
    
    // Update every second for accurate countdown
    const interval = setInterval(updateTimeUntilExpiration, 1000);
    
    return () => clearInterval(interval);
  }, [tokenExpiration]);
  
  // Calculate isExpiringSoon dynamically (recalculated with timeUntilExpiration)
  const isExpiringSoon = useMemo(() => {
    if (!timeUntilExpiration) return false;
    const bufferMs = refreshBeforeExpiryMinutes * 60 * 1000;
    return timeUntilExpiration <= bufferMs;
  }, [timeUntilExpiration, refreshBeforeExpiryMinutes]);

  /**
   * Clear refresh failed state
   */
  const clearRefreshFailed = useCallback(() => {
    setRefreshFailed(false);
  }, []);

  /**
   * Wrapper for manual refresh that properly handles refreshFailed state
   * Distinguishes between inactivity (403) and real errors (network/server)
   * Calls API directly to catch error status codes
   */
  const manualRefresh = useCallback(async (): Promise<boolean> => {
    // Check if refresh is already in progress
    if (refreshPending) {
      console.debug('Refresh already in progress, skipping manual refresh');
      return false;
    }
    
    // Clear refresh failed state before attempting
    setRefreshFailed(false);
    
    // Set refresh pending in store to prevent concurrent refreshes
    const { setRefreshPending } = useAuthStore.getState();
    setRefreshPending(true);
    
    try {
      // B42-P6: Send activity ping before manual refresh to update server-side activity
      // This helps if the user was inactive but is now active
      if (hasRecentActivity && isAuthenticated && !document.hidden) {
        try {
          await axiosClient.post('/v1/activity/ping');
          console.debug('Activity ping sent before manual refresh');
          // Small delay to ensure server processes the ping
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (pingError) {
          // Ping failure is not critical, continue with refresh
          console.debug('Activity ping failed before refresh, continuing anyway');
        }
      }
      
      // Call refresh API directly to catch error status codes
      // This allows us to distinguish 403 (inactivity) from other errors
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1] || null;
      
      // Get refresh token from store
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        console.error('No refresh token available for manual refresh');
        setRefreshFailed(true);
        setRefreshPending(false);
        return false;
      }
      
      const response = await axiosClient.post(
        '/v1/auth/refresh',
        { refresh_token: refreshToken }, // B42-P6: Send refresh token in body
        {
          headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
          withCredentials: true
        }
      );
      
      // Refresh succeeded - update token in store (same as authStore.refreshToken does)
      const newToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token; // B42-P6: Get new refresh token (rotation)
      const newExpiration = getTokenExpiration(newToken);
      const newCsrfToken = response.data.csrf_token || 
        document.cookie.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1] || null;
      
      // Update token in localStorage and memory (same as authStore)
      localStorage.setItem('token', newToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      if (axiosClient.defaults?.headers?.common) {
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
      
      // Update store state directly (same as authStore.refreshToken) to ensure immediate update
      // This ensures tokenExpiration is updated immediately and triggers re-render
      useAuthStore.setState({
        token: newToken,
        refreshToken: newRefreshToken || refreshToken, // Update with new one or keep old one
        tokenExpiration: newExpiration,
        csrfToken: newCsrfToken,
        refreshPending: false,
        error: null
      });
      
      lastRefreshTimeRef.current = Date.now();
      setRefreshFailed(false);
      
      console.debug('Token refreshed successfully, new expiration:', newExpiration, 'timeUntilExpiration will be:', newExpiration ? newExpiration - Date.now() : null);
      return true;
    } catch (error: any) {
      // Always clear refreshPending on error
      setRefreshPending(false);
      
      // Check error type to distinguish inactivity from real errors
      const statusCode = error?.response?.status;
      
      if (statusCode === 403) {
        // 403 = inactivity - not a real error, don't set refreshFailed
        // User can try again after being active
        console.warn('Refresh refused due to inactivity (403) - not a real error');
        setRefreshFailed(false);
        return false;
      } else if (statusCode === 401) {
        // 401 = invalid/expired token - critical error, logout is handled by authStore
        console.error('Refresh failed - invalid token (401)');
        setRefreshFailed(true);
        // Call authStore refreshToken to trigger logout
        await refreshToken();
        return false;
      } else {
        // Real error (network, server, rate limit, etc.) - set refreshFailed
        setRefreshFailed(true);
        console.error('Manual refresh error (non-403/401):', error);
        return false;
      }
    }
  }, [hasRecentActivity, isAuthenticated, refreshToken, refreshPending]);

  return {
    refreshToken: manualRefresh,
    sendPing,
    timeUntilExpiration,
    isExpiringSoon,
    isRefreshing: refreshPending,
    isTabVisible: isTabVisibleRef.current,
    hasRecentActivity,
    refreshFailed,
    clearRefreshFailed
  };
}

