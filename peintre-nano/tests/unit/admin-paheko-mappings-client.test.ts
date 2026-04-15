import { describe, expect, it, vi, afterEach } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import {
  createPahekoCashSessionCloseMapping,
  listPahekoCashSessionCloseMappings,
  resolvePahekoCashSessionCloseMapping,
  updatePahekoCashSessionCloseMapping,
} from '../../src/api/admin-paheko-mappings-client';

const authStub: Pick<AuthContextPort, 'getAccessToken'> = {
  getAccessToken: () => 'tok',
};

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('admin-paheko-mappings-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('liste, cree, met a jour et resout les mappings de cloture', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/admin/paheko-mappings/cash-session-close') && method === 'GET') {
        return okJson({
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              site_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              register_id: null,
              enabled: true,
              label: 'Défaut site',
              destination_params: { journal_code: 'VE' },
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-02T00:00:00.000Z',
            },
            {
              id: '22222222-2222-4222-8222-222222222222',
              site_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              register_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              enabled: true,
              label: 'Caisse 1',
              destination_params: { journal_code: 'VE', account_code: '707100' },
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-02T00:00:00.000Z',
            },
          ],
          total: 2,
          skip: 0,
          limit: 200,
        });
      }
      if (url.includes('/v1/admin/paheko-mappings/cash-session-close') && method === 'POST') {
        expect(JSON.parse(String(init?.body))).toEqual({
          site_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          register_id: null,
          enabled: true,
          label: 'Créé',
          destination_params: { journal_code: 'VE' },
        });
        return okJson({
          id: '33333333-3333-4333-8333-333333333333',
          site_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          register_id: null,
          enabled: true,
          label: 'Créé',
          destination_params: { journal_code: 'VE' },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        });
      }
      if (url.includes('/22222222-2222-4222-8222-222222222222') && method === 'PATCH') {
        expect(JSON.parse(String(init?.body))).toEqual({ enabled: false });
        return okJson({
          id: '22222222-2222-4222-8222-222222222222',
          site_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          register_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          enabled: false,
          label: 'Caisse 1',
          destination_params: { journal_code: 'VE', account_code: '707100' },
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-03T00:00:00.000Z',
        });
      }
      return okJson({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const listed = await listPahekoCashSessionCloseMappings(authStub, { limit: 200 });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data).toHaveLength(2);

    const resolvedExact = resolvePahekoCashSessionCloseMapping(
      listed.data,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );
    expect(resolvedExact?.id).toBe('22222222-2222-4222-8222-222222222222');

    const resolvedFallback = resolvePahekoCashSessionCloseMapping(
      listed.data,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    );
    expect(resolvedFallback?.id).toBe('11111111-1111-4111-8111-111111111111');

    const created = await createPahekoCashSessionCloseMapping(authStub, {
      site_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      register_id: null,
      enabled: true,
      label: 'Créé',
      destination_params: { journal_code: 'VE' },
    });
    expect(created.ok).toBe(true);

    const updated = await updatePahekoCashSessionCloseMapping(authStub, '22222222-2222-4222-8222-222222222222', {
      enabled: false,
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.mapping.enabled).toBe(false);
  });
});
