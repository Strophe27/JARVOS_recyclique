// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { putSaleNote } from '../../src/api/sales-client';

const SALE_ID = 'eeeeeeee-eeee-4eee-8eee-555555555555';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('putSaleNote', () => {
  it('envoie PUT /v1/sales/{id} avec corps { note } et renvoie la vente', async () => {
    const payload = {
      id: SALE_ID,
      cash_session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      total_amount: 12,
      items: [],
      note: 'Rappel caisse',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const auth = { getAccessToken: () => 'tok' };
    const res = await putSaleNote(SALE_ID, 'Rappel caisse', auth);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.sale.note).toBe('Rappel caisse');
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain(`/v1/sales/${SALE_ID}`);
    expect(call[1]?.method).toBe('PUT');
    expect(JSON.parse(String(call[1]?.body))).toEqual({ note: 'Rappel caisse' });
  });

  it('propage une erreur HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Insufficient permissions. Admin access required.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const res = await putSaleNote(SALE_ID, 'x', {});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(403);
      expect(res.detail.length).toBeGreaterThan(0);
    }
  });
});
