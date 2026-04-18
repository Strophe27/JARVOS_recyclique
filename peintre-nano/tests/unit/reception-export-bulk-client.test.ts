import { describe, expect, it, vi, afterEach } from 'vitest';
import { postReceptionTicketsExportBulk } from '../../src/api/reception-client';

describe('postReceptionTicketsExportBulk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('refuse sans code administrateur (pas d’appel réseau)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const res = await postReceptionTicketsExportBulk({ getAccessToken: () => 't' }, {
      stepUpPin: '   ',
      format: 'csv',
      filters: {},
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.detail).toMatch(/confirmation obligatoire/i);
    }
  });

  it('POST le corps attendu avec en-têtes PIN et idempotence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        expect(String(url)).toMatch(/\/v1\/admin\/reports\/reception-tickets\/export-bulk$/);
        expect(init?.method).toBe('POST');
        const h = init?.headers as Record<string, string>;
        expect(h['X-Step-Up-Pin']).toBe('4242');
        expect(h['Idempotency-Key']).toBe('idem-test-key');
        expect(h['Content-Type']).toBe('application/json');
        const body = JSON.parse(String(init?.body)) as { format: string; filters: Record<string, unknown> };
        expect(body.format).toBe('excel');
        expect(body.filters.include_empty).toBe(false);
        expect(body.filters.status).toBe('opened');
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="export_tickets_reception_20260101.xlsx"',
          },
        });
      }),
    );

    const res = await postReceptionTicketsExportBulk({ getAccessToken: () => 'tok' }, {
      stepUpPin: '4242',
      format: 'excel',
      idempotencyKey: 'idem-test-key',
      filters: { status: 'opened', date_from: '2026-01-15' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.filename).toBe('export_tickets_reception_20260101.xlsx');
      expect(res.blob.size).toBe(3);
    }
  });
});
