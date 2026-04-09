import { describe, expect, it } from 'vitest';
import { contextEnvelopeStubFromApi } from '../../src/api/context-envelope-from-api';

describe('contextEnvelopeStubFromApi', () => {
  it('mappe une enveloppe minimale valide', () => {
    const stub = contextEnvelopeStubFromApi({
      runtime_state: 'ok',
      permission_keys: ['caisse.access'],
      computed_at: '2026-01-15T12:00:00.000Z',
      context: {
        site_id: '11111111-1111-4111-8111-111111111111',
        cash_register_id: '22222222-2222-4222-8222-222222222222',
        cash_session_id: null,
        reception_post_id: null,
      },
    });
    expect(stub).not.toBeNull();
    expect(stub!.siteId).toBe('11111111-1111-4111-8111-111111111111');
    expect(stub!.activeRegisterId).toBe('22222222-2222-4222-8222-222222222222');
    expect(stub!.permissions.permissionKeys).toEqual(['caisse.access']);
    expect(stub!.runtimeStatus).toBe('ok');
    expect(stub!.issuedAt).toBe(Date.parse('2026-01-15T12:00:00.000Z'));
  });

  it('retourne null si runtime_state invalide', () => {
    expect(
      contextEnvelopeStubFromApi({
        runtime_state: 'weird',
        permission_keys: [],
        computed_at: '2026-01-15T12:00:00.000Z',
      }),
    ).toBeNull();
  });
});
