/**
 * Utility functions for JWT token handling
 */

/**
 * Decode JWT token without verification (client-side only)
 * Returns the payload as an object
 */
export function decodeJWT(token: string): { [key: string]: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Get expiration timestamp from JWT token
 * Returns expiration time in milliseconds, or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  // exp is in seconds, convert to milliseconds
  return decoded.exp * 1000;
}

/**
 * Check if token is expired or will expire soon
 * @param token JWT token
 * @param bufferMinutes Minutes before expiration to consider as "expiring soon"
 * @returns true if token is expired or expiring soon
 */
export function isTokenExpiringSoon(token: string, bufferMinutes: number = 2): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true; // Consider invalid tokens as expiring
  }
  const now = Date.now();
  const bufferMs = bufferMinutes * 60 * 1000;
  return expiration <= now + bufferMs;
}

/**
 * Get time until token expiration in milliseconds
 * Returns negative value if already expired
 */
export function getTimeUntilExpiration(token: string): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return -1;
  }
  return expiration - Date.now();
}
















