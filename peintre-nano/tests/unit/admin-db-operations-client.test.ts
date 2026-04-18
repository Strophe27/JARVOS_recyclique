import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import {
  postAdminDbExportBlob,
  postAdminDbImportDump,
  postAdminDbPurgeTransactions,
} from '../../src/api/admin-db-operations-client';

const authStub: Pick<AuthContextPort, 'getAccessToken'> = {
  getAccessToken: () => 'tok-db',
};

describe('admin-db-operations-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('export : refuse sans PIN', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await postAdminDbExportBlob(authStub, { stepUpPin: '   ' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.detail).toMatch(/PIN/i);
  });

  it('export : POST + X-Step-Up-Pin + octet-stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        expect(url).toMatch(/\/v1\/admin\/db\/export$/);
        expect(init?.method).toBe('POST');
        const h = new Headers(init?.headers as HeadersInit);
        expect(h.get('X-Step-Up-Pin')).toBe('4242');
        expect(h.get('Authorization')).toBe('Bearer tok-db');
        expect(h.get('Accept')).toBe('application/octet-stream');
        return new Response(new Blob([Uint8Array.from([7])]), {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const res = await postAdminDbExportBlob(authStub, { stepUpPin: '4242' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.filename).toMatch(/dump/);
    }
  });

  it('purge : Idempotency-Key tronquée à 128', async () => {
    const longKey = 'a'.repeat(130);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        expect(url).toMatch(/\/v1\/admin\/db\/purge-transactions$/);
        const h = new Headers(init?.headers as HeadersInit);
        expect(h.get('X-Step-Up-Pin')).toBe('1');
        expect((h.get('Idempotency-Key') ?? '').length).toBe(128);
        return new Response(JSON.stringify({ message: 'ok', deleted_records: {}, timestamp: 't' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    const res = await postAdminDbPurgeTransactions(authStub, {
      stepUpPin: '1',
      idempotencyKey: longKey,
    });
    expect(res.ok).toBe(true);
  });

  it('import : FormData fichier + en-têtes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        expect(url).toMatch(/\/v1\/admin\/db\/import$/);
        expect(init?.body).toBeInstanceOf(FormData);
        const fd = init?.body as FormData;
        expect(fd.get('file')).toBeInstanceOf(File);
        const h = new Headers(init?.headers as HeadersInit);
        expect(h.get('X-Step-Up-Pin')).toBe('9');
        expect(h.get('Idempotency-Key')).toBeTruthy();
        return new Response(JSON.stringify({ message: 'imported' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    const file = new File([Uint8Array.from([1])], 'test.dump', { type: 'application/octet-stream' });
    const res = await postAdminDbImportDump(authStub, { stepUpPin: '9', file });
    expect(res.ok).toBe(true);
  });
});
