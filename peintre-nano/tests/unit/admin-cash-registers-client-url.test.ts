import { afterEach, describe, expect, it, vi } from 'vitest';
import { listCashRegistersForAdmin } from '../../src/api/admin-cash-registers-client';

describe('admin-cash-registers-client — URL liste', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('appelle GET /v1/cash-registers/ (slash avant la query)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });
    vi.stubGlobal('fetch', fetchSpy);

    const auth = { getAccessToken: () => undefined as string | undefined };
    await listCashRegistersForAdmin(auth, { limit: 10 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/v1/cash-registers/?');
    expect(calledUrl).not.toContain('/v1/cash-registers?limit');
  });

  it('sans query conserve le slash final', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });
    vi.stubGlobal('fetch', fetchSpy);

    const auth = { getAccessToken: () => undefined as string | undefined };
    await listCashRegistersForAdmin(auth, {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl.endsWith('/v1/cash-registers/')).toBe(true);
  });
});
