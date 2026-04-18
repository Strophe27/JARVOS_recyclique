import { describe, it, expect, vi } from 'vitest';
import { useFeatureFlag, getAllFeatureFlags, isFeatureEnabled } from '../features';

// Mock Vite env
const mockEnv = vi.fn((key: string) => {
  const envMap: Record<string, string> = {
    'VITE_FEATURE_CASH_CHEQUES_V2': 'true',
    'VITE_FEATURE_LIVE_RECEPTION_STATS': 'false',
  };
  return envMap[key];
});

vi.mock('import.meta', () => ({
  env: new Proxy({}, {
    get: (_target, prop) => mockEnv(prop as string)
  })
}));

describe('Feature Flags', () => {
  it('should import zod without errors', () => {
    // This test will fail if zod import fails
    expect(() => {
      require('../features');
    }).not.toThrow();
  });

  it('should have cashChequesV2 feature flag', () => {
    const flags = getAllFeatureFlags();
    expect(flags).toHaveProperty('cashChequesV2');
    expect(typeof flags.cashChequesV2).toBe('boolean');
  });

  it('should read cashChequesV2 from env var', () => {
    // With our mock, VITE_FEATURE_CASH_CHEQUES_V2 = 'true'
    const value = useFeatureFlag('cashChequesV2');
    expect(value).toBe(true);
  });

  it('should have all expected feature flags', () => {
    const flags = getAllFeatureFlags();
    const expectedFlags = ['liveReceptionStats', 'guidedTours', 'enableCashHotkeys', 'cashChequesV2'];

    expectedFlags.forEach(flag => {
      expect(flags).toHaveProperty(flag);
      expect(typeof flags[flag as keyof typeof flags]).toBe('boolean');
    });
  });

  it('should use default values when env vars not set', () => {
    // Mock env to return undefined for all
    mockEnv.mockReturnValue(undefined);

    const flags = getAllFeatureFlags();

    // All should be their default values (false)
    Object.values(flags).forEach(value => {
      expect(value).toBe(false);
    });
  });

  it('isFeatureEnabled should be alias for useFeatureFlag', () => {
    expect(isFeatureEnabled).toBe(useFeatureFlag);
  });
});















