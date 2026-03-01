/**
 * Tests du helper buildUrl — Story 15.0.
 * Vérifie : base définie (VITE_API_BASE_URL), base vide (fallback origin), path avec params.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildUrl } from './_buildUrl';

describe('buildUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ne lance pas "Failed to construct URL" quand base est vide', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(() => buildUrl('/v1/categories')).not.toThrow();
  });

  it('retourne une URL valide avec path correct (base vide, fallback origin)', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const url = buildUrl('/v1/categories');
    expect(url).toBeInstanceOf(URL);
    expect(url.pathname).toBe('/v1/categories');
    expect(url.origin).toBe(window.location.origin);
  });

  it('utilise VITE_API_BASE_URL quand défini', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const url = buildUrl('/v1/categories');
    expect(url.origin).toBe('https://api.example.com');
    expect(url.pathname).toBe('/v1/categories');
  });

  it('ajoute les paramètres query quand params fourni', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const url = buildUrl('/v1/admin/reports/cash-sessions', {
      limit: '10',
      offset: '0',
    });
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('0');
  });

  it('gère un path avec segment dynamique', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const url = buildUrl('/v1/categories/abc-123');
    expect(url.pathname).toBe('/v1/categories/abc-123');
  });

  it('retourne une URL utilisable pour fetch (toString)', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const url = buildUrl('/v1/categories');
    const href = url.toString();
    expect(href).toContain('/v1/categories');
    expect(() => new URL(href)).not.toThrow();
  });
});
