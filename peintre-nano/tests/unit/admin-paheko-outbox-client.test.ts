import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import {
  getPahekoOutboxCorrelationTimeline,
  getPahekoOutboxItem,
  listPahekoOutboxItems,
  postPahekoOutboxLiftQuarantine,
} from '../../src/api/admin-paheko-outbox-client';

const authStub: Pick<AuthContextPort, 'getAccessToken'> = {
  getAccessToken: () => 'tok',
};

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('admin-paheko-outbox-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('liste, charge, relance et lit la timeline d une ligne outbox', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/admin/paheko-outbox/items?')) {
        expect(url).toContain('operation_type=cash_session_close');
        return okJson({
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              operation_type: 'cash_session_close',
              idempotency_key: 'cash_session_close:abc',
              cash_session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              site_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              outbox_status: 'pending',
              sync_state_core: 'a_reessayer',
              local_session_persisted: true,
              remote_attempt_count: 1,
              last_remote_http_status: 503,
              last_error: 'http_status_503',
              next_retry_at: '2026-04-14T18:30:00.000Z',
              rejection_reason: null,
              mapping_resolution_error: null,
              correlation_id: 'corr-123',
              created_at: '2026-04-14T18:20:00.000Z',
              updated_at: '2026-04-14T18:21:00.000Z',
            },
          ],
          total: 1,
          skip: 0,
          limit: 10,
        });
      }
      if (url.endsWith('/lift-quarantine')) {
        expect(JSON.parse(String(init?.body))).toEqual({
          reason: 'Relance contrôlée depuis le panel super-admin Paheko',
        });
        return okJson({
          id: '11111111-1111-4111-8111-111111111111',
          operation_type: 'cash_session_close',
          idempotency_key: 'cash_session_close:abc',
          cash_session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          site_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          outbox_status: 'pending',
          sync_state_core: 'a_reessayer',
          local_session_persisted: true,
          remote_attempt_count: 1,
          last_remote_http_status: 503,
          last_error: null,
          next_retry_at: '2026-04-14T18:35:00.000Z',
          rejection_reason: null,
          mapping_resolution_error: null,
          correlation_id: 'corr-123',
          created_at: '2026-04-14T18:20:00.000Z',
          updated_at: '2026-04-14T18:22:00.000Z',
          payload: { total_amount: 15 },
          last_response_snippet: null,
          recent_sync_transitions: [],
        });
      }
      if (url.endsWith('/v1/admin/paheko-outbox/items/11111111-1111-4111-8111-111111111111')) {
        return okJson({
          id: '11111111-1111-4111-8111-111111111111',
          operation_type: 'cash_session_close',
          idempotency_key: 'cash_session_close:abc',
          cash_session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          site_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          outbox_status: 'delivered',
          sync_state_core: 'resolu',
          local_session_persisted: true,
          remote_attempt_count: 1,
          last_remote_http_status: 200,
          last_error: null,
          next_retry_at: null,
          rejection_reason: null,
          mapping_resolution_error: null,
          correlation_id: 'corr-123',
          created_at: '2026-04-14T18:20:00.000Z',
          updated_at: '2026-04-14T18:21:00.000Z',
          payload: { total_amount: 15 },
          last_response_snippet: '{"id":134}',
          recent_sync_transitions: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              transition_name: 'auto_sync_delivered_resolu',
              from_sync_state: 'a_reessayer',
              to_sync_state: 'resolu',
              from_outbox_status: 'processing',
              to_outbox_status: 'delivered',
              actor_user_id: null,
              occurred_at: '2026-04-14T18:21:00.000Z',
              reason: 'http_delivered_status=200',
              correlation_id: 'corr-123',
              context_json: {},
            },
          ],
        });
      }
      if (url.endsWith('/v1/admin/paheko-outbox/by-correlation/corr-123')) {
        return okJson({
          correlation_id: 'corr-123',
          items: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              operation_type: 'cash_session_close',
              idempotency_key: 'cash_session_close:abc',
              cash_session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              site_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              outbox_status: 'delivered',
              sync_state_core: 'resolu',
              local_session_persisted: true,
              remote_attempt_count: 1,
              last_remote_http_status: 200,
              last_error: null,
              next_retry_at: null,
              rejection_reason: null,
              mapping_resolution_error: null,
              correlation_id: 'corr-123',
              created_at: '2026-04-14T18:20:00.000Z',
              updated_at: '2026-04-14T18:21:00.000Z',
            },
          ],
          sync_transitions: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              transition_name: 'auto_sync_delivered_resolu',
              from_sync_state: 'a_reessayer',
              to_sync_state: 'resolu',
              from_outbox_status: 'processing',
              to_outbox_status: 'delivered',
              actor_user_id: null,
              occurred_at: '2026-04-14T18:21:00.000Z',
              reason: 'http_delivered_status=200',
              correlation_id: 'corr-123',
              context_json: {},
            },
          ],
          sync_transitions_total: 1,
          sync_transitions_skip: 0,
          sync_transitions_limit: 200,
        });
      }
      return okJson({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const listed = await listPahekoOutboxItems(authStub, { limit: 10, operation_type: 'cash_session_close' });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.outbox_status).toBe('pending');

    const detail = await getPahekoOutboxItem(authStub, '11111111-1111-4111-8111-111111111111');
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.item.outbox_status).toBe('delivered');
    expect(detail.item.recent_sync_transitions).toHaveLength(1);

    const timeline = await getPahekoOutboxCorrelationTimeline(authStub, 'corr-123');
    expect(timeline.ok).toBe(true);
    if (!timeline.ok) return;
    expect(timeline.timeline.sync_transitions_total).toBe(1);

    const lifted = await postPahekoOutboxLiftQuarantine(authStub, '11111111-1111-4111-8111-111111111111', {
      reason: 'Relance contrôlée depuis le panel super-admin Paheko',
    });
    expect(lifted.ok).toBe(true);
    if (lifted.ok) expect(lifted.item.sync_state_core).toBe('a_reessayer');
  });
});
