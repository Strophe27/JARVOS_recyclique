import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getLiveSnapshotBasePrefix', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('accepte un chemin relatif sain', async () => {
    vi.stubEnv('VITE_RECYCLIQUE_API_PREFIX', '/api/v1');
    const { getLiveSnapshotBasePrefix } = await import('../../src/api/live-snapshot-client');
    expect(getLiveSnapshotBasePrefix()).toBe('/api/v1');
  });

  it('refuse un chemin avec ..', async () => {
    vi.stubEnv('VITE_RECYCLIQUE_API_PREFIX', '/api/../x');
    const { getLiveSnapshotBasePrefix } = await import('../../src/api/live-snapshot-client');
    expect(() => getLiveSnapshotBasePrefix()).toThrow(/invalide/);
  });
});
