import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNTING_EXPERT_STEP_UP_HEADER,
  createAccountingExpertPaymentMethod,
  listAccountingExpertPaymentMethods,
  patchAccountingExpertPaymentMethod,
  publishAccountingExpertRevision,
  setAccountingExpertPaymentMethodActive,
} from '../../src/api/admin-accounting-expert-client';

const fetchMock = vi.fn();

describe('admin-accounting-expert-client', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('liste : GET /v1/admin/accounting-expert/payment-methods', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          code: 'cb',
          label: 'CB',
          kind: 'bank',
          paheko_debit_account: '512',
          paheko_refund_credit_account: '707',
          min_amount: null,
          max_amount: null,
          display_order: 1,
          notes: null,
          active: true,
          archived_at: null,
        },
      ],
    });
    const auth = { getAccessToken: () => 'tok' };
    const res = await listAccountingExpertPaymentMethods(auth);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/v1\/admin\/accounting-expert\/payment-methods$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('création : POST + X-Step-Up-Pin', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        code: 'x',
        label: 'X',
        kind: 'other',
        paheko_debit_account: '512',
        paheko_refund_credit_account: '707',
        min_amount: null,
        max_amount: null,
        display_order: 0,
        notes: null,
        active: false,
        archived_at: null,
      }),
    });
    const auth = { getAccessToken: () => 'tok' };
    const res = await createAccountingExpertPaymentMethod(
      auth,
      {
        code: 'x',
        label: 'X',
        kind: 'other',
        paheko_debit_account: '512',
        paheko_refund_credit_account: '707',
        display_order: 0,
        active: false,
      },
      { stepUpPin: '4242' },
    );
    expect(res.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const h = new Headers(init.headers as HeadersInit);
    expect(h.get(ACCOUNTING_EXPERT_STEP_UP_HEADER)).toBe('4242');
    expect(init.method).toBe('POST');
  });

  it('refuse création sans PIN', async () => {
    vi.stubGlobal('fetch', fetchMock);
    const auth = { getAccessToken: () => 'tok' };
    const res = await createAccountingExpertPaymentMethod(
      auth,
      {
        code: 'x',
        label: 'X',
        kind: 'other',
        paheko_debit_account: '512',
        paheko_refund_credit_account: '707',
        display_order: 0,
        active: false,
      },
      { stepUpPin: '   ' },
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.detail).toMatch(/PIN/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PATCH moyen : en-tête step-up', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        code: 'cb',
        label: 'CB',
        kind: 'bank',
        paheko_debit_account: '512',
        paheko_refund_credit_account: '707',
        min_amount: null,
        max_amount: null,
        display_order: 2,
        notes: null,
        active: true,
        archived_at: null,
      }),
    });
    const auth = { getAccessToken: () => 'tok' };
    const res = await patchAccountingExpertPaymentMethod(
      auth,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      { display_order: 2 },
      { stepUpPin: '1' },
    );
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/payment-methods\/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa$/);
    expect(init.method).toBe('PATCH');
    const h = new Headers(init.headers as HeadersInit);
    expect(h.get(ACCOUNTING_EXPERT_STEP_UP_HEADER)).toBe('1');
  });

  it('POST active : query active + step-up', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const auth = { getAccessToken: () => 'tok' };
    await setAccountingExpertPaymentMethodActive(auth, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false, {
      stepUpPin: '9',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/active?');
    expect(url).toContain('active=false');
    const h = new Headers(init.headers as HeadersInit);
    expect(h.get(ACCOUNTING_EXPERT_STEP_UP_HEADER)).toBe('9');
  });

  it('liste : corps non-JSON (HTML) → message court', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '<html><body>Bad Gateway</body></html>',
    });
    const auth = { getAccessToken: () => 'tok' };
    const res = await listAccountingExpertPaymentMethods(auth);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.detail).toMatch(/illisible/);
    expect(res.detail).toMatch(/502/);
    expect(res.detail).not.toMatch(/<html/);
  });

  it('publish révision : POST body + step-up', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        revision_seq: 3,
        published_at: '2026-04-16T12:00:00.000Z',
        snapshot: {},
      }),
    });
    const auth = { getAccessToken: () => 'tok' };
    await publishAccountingExpertRevision(auth, { stepUpPin: '0000', note: 'ok' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ note: 'ok' });
    const h = new Headers(init.headers as HeadersInit);
    expect(h.get(ACCOUNTING_EXPERT_STEP_UP_HEADER)).toBe('0000');
  });
});
