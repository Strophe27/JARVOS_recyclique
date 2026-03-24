import { describe, it, expect, beforeEach, vi } from 'vitest';
import { decodeJWT, getTokenExpiration, isTokenExpiringSoon, getTimeUntilExpiration } from '../jwt';

describe('JWT Utils', () => {
  // Helper to create a JWT token with custom payload
  function createJWT(payload: any, exp: number): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify({ ...payload, exp }));
    const signature = 'signature';
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  describe('decodeJWT', () => {
    it('should decode a valid JWT token', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createJWT({ sub: 'user123', role: 'admin' }, exp);
      const decoded = decodeJWT(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user123');
      expect(decoded?.role).toBe('admin');
      expect(decoded?.exp).toBe(exp);
    });

    it('should return null for invalid token format', () => {
      expect(decodeJWT('invalid.token')).toBeNull();
      expect(decodeJWT('not-a-jwt')).toBeNull();
      expect(decodeJWT('')).toBeNull();
    });

    it('should handle tokens with special characters in payload', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = createJWT({ name: 'John Doe', email: 'john@example.com' }, exp);
      const decoded = decodeJWT(token);
      
      expect(decoded?.name).toBe('John Doe');
      expect(decoded?.email).toBe('john@example.com');
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration timestamp in milliseconds', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createJWT({ sub: 'user123' }, exp);
      const expiration = getTokenExpiration(token);
      
      expect(expiration).toBe(exp * 1000);
    });

    it('should return null for token without exp claim', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: 'user123' }));
      const token = `${header}.${payload}.signature`;
      
      expect(getTokenExpiration(token)).toBeNull();
    });

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid')).toBeNull();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return true if token expires within buffer time', () => {
      const exp = Math.floor((Date.now() + 60000) / 1000); // 1 minute from now
      const token = createJWT({ sub: 'user123' }, exp);
      
      expect(isTokenExpiringSoon(token, 2)).toBe(true); // 2 minute buffer
    });

    it('should return false if token expires after buffer time', () => {
      const exp = Math.floor((Date.now() + 300000) / 1000); // 5 minutes from now
      const token = createJWT({ sub: 'user123' }, exp);
      
      expect(isTokenExpiringSoon(token, 2)).toBe(false); // 2 minute buffer
    });

    it('should return true if token is already expired', () => {
      const exp = Math.floor((Date.now() - 1000) / 1000); // 1 second ago
      const token = createJWT({ sub: 'user123' }, exp);
      
      expect(isTokenExpiringSoon(token, 2)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpiringSoon('invalid', 2)).toBe(true);
    });

    it('should use default buffer of 2 minutes', () => {
      const exp = Math.floor((Date.now() + 60000) / 1000); // 1 minute from now
      const token = createJWT({ sub: 'user123' }, exp);
      
      expect(isTokenExpiringSoon(token)).toBe(true);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return positive milliseconds for future expiration', () => {
      const exp = Math.floor((Date.now() + 3600000) / 1000); // 1 hour from now
      const token = createJWT({ sub: 'user123' }, exp);
      const timeUntil = getTimeUntilExpiration(token);
      
      expect(timeUntil).toBeGreaterThan(3590000); // ~1 hour
      expect(timeUntil).toBeLessThan(3610000);
    });

    it('should return negative milliseconds for expired token', () => {
      const exp = Math.floor((Date.now() - 1000) / 1000); // 1 second ago
      const token = createJWT({ sub: 'user123' }, exp);
      const timeUntil = getTimeUntilExpiration(token);
      
      expect(timeUntil).toBeLessThan(0);
    });

    it('should return -1 for invalid token', () => {
      expect(getTimeUntilExpiration('invalid')).toBe(-1);
    });
  });
});
















