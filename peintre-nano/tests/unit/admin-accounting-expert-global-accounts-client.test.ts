import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNTING_EXPERT_STEP_UP_HEADER,
  getGlobalAccounts,
  patchGlobalAccounts,
} from '../../src/api/admin-accounting-expert-client';

const authStub = { getAccessToken: () => 'tok' };

describe('admin-accounting-expert-client global-accounts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('GET global-accounts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          default_sales_account: '707',
          default_donation_account: '756',
          prior_year_refund_account: '512',
          updated_at: '2026-04-16T10:00:00.000Z',
        }),
      json: async () => ({
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
        updated_at: '2026-04-16T10:00:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await getGlobalAccounts(authStub);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.default_sales_account).toBe('707');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v1/admin/accounting-expert/global-accounts');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined();
  });

  it('PATCH global-accounts envoie X-Step-Up-Pin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          default_sales_account: '707',
          default_donation_account: '756',
          prior_year_refund_account: '512',
          updated_at: '2026-04-16T10:00:00.000Z',
        }),
      json: async () => ({
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
        updated_at: '2026-04-16T10:00:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await patchGlobalAccounts(
      authStub,
      {
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
      },
      { stepUpPin: '4242' },
    );
    expect(res.ok).toBe(true);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('PATCH');
    const h = init.headers as Record<string, string>;
    expect(h[ACCOUNTING_EXPERT_STEP_UP_HEADER]).toBe('4242');
  });

  it('PATCH refuse un PIN vide', async () => {
    const res = await patchGlobalAccounts(
      authStub,
      {
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
      },
      { stepUpPin: '   ' },
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.detail).toMatch(/PIN/i);
  });
});
