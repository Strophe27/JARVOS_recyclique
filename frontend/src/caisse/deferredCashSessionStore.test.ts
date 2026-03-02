/**
 * Tests unitaires deferredCashSessionStore — Story 18-10.
 * Vitest + mock API caisse + cleanup localStorage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDeferredCashSessionStore } from './deferredCashSessionStore';
import * as caisseApi from '../api/caisse';
import type { CashSessionItem } from '../api/caisse';

vi.mock('../api/caisse', () => ({
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
}));

const fakeSession: CashSessionItem = {
  id: 'dsession-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 0,
  current_amount: 0,
  status: 'open',
  opened_at: '2026-01-15T00:00:00.000Z',
  closed_at: null,
  current_step: 'sale',
  closing_amount: null,
  actual_amount: null,
  variance: null,
  variance_comment: null,
  session_type: 'deferred',
  total_sales: null,
  total_items: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

describe('useDeferredCashSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useDeferredCashSessionStore.getState().reset();
  });

  it('état initial : currentSession null, deferredDate null, isDeferred true', () => {
    const state = useDeferredCashSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.deferredDate).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.isDeferred).toBe(true);
  });

  it('setDeferredDate met à jour deferredDate', () => {
    useDeferredCashSessionStore.getState().setDeferredDate('2026-01-15');
    expect(useDeferredCashSessionStore.getState().deferredDate).toBe('2026-01-15');
    expect(useDeferredCashSessionStore.getState().isDeferred).toBe(true);
  });

  it('openSession force session_type = deferred et passed opened_at', async () => {
    vi.mocked(caisseApi.openCashSession).mockResolvedValueOnce(fakeSession);
    useDeferredCashSessionStore.getState().setDeferredDate('2026-01-15');

    await useDeferredCashSessionStore.getState().openSession('token', {
      initial_amount: 1000,
      register_id: 'reg-1',
      opened_at: '2026-01-15T00:00:00.000Z',
    });

    expect(caisseApi.openCashSession).toHaveBeenCalledWith('token', {
      initial_amount: 1000,
      register_id: 'reg-1',
      session_type: 'deferred',
      opened_at: '2026-01-15T00:00:00.000Z',
    });
  });

  it('openSession sans opened_at : error, pas d appel API', async () => {
    await useDeferredCashSessionStore.getState().openSession('token', {
      initial_amount: 0,
      register_id: 'reg-1',
      opened_at: '',
    });

    expect(caisseApi.openCashSession).not.toHaveBeenCalled();
    expect(useDeferredCashSessionStore.getState().error).toBeTruthy();
  });

  it('openSession success : currentSession mise à jour', async () => {
    vi.mocked(caisseApi.openCashSession).mockResolvedValueOnce(fakeSession);

    await useDeferredCashSessionStore.getState().openSession('token', {
      initial_amount: 0,
      register_id: 'reg-1',
      opened_at: '2026-01-15T00:00:00.000Z',
    });

    const state = useDeferredCashSessionStore.getState();
    expect(state.currentSession).toEqual(fakeSession);
    expect(state.loading).toBe(false);
  });

  it('closeSession success : currentSession null, deferredDate conservée', async () => {
    useDeferredCashSessionStore.setState({ currentSession: fakeSession, deferredDate: '2026-01-15' });
    vi.mocked(caisseApi.closeCashSession).mockResolvedValueOnce({ ...fakeSession, status: 'closed' });

    const ok = await useDeferredCashSessionStore.getState().closeSession('token', 'dsession-1', {
      closing_amount: 0,
      actual_amount: 0,
    });

    expect(ok).toBe(true);
    const state = useDeferredCashSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.deferredDate).toBe('2026-01-15');
  });

  it('closeSession error : retourne false', async () => {
    useDeferredCashSessionStore.setState({ currentSession: fakeSession });
    vi.mocked(caisseApi.closeCashSession).mockRejectedValueOnce(new Error('Fermeture impossible'));

    const ok = await useDeferredCashSessionStore.getState().closeSession('token', 'dsession-1', {});

    expect(ok).toBe(false);
    expect(useDeferredCashSessionStore.getState().error).toBe('Fermeture impossible');
  });

  it('reset() remet currentSession et deferredDate à null', () => {
    useDeferredCashSessionStore.setState({ currentSession: fakeSession, deferredDate: '2026-01-15' });

    useDeferredCashSessionStore.getState().reset();

    const state = useDeferredCashSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.deferredDate).toBeNull();
    expect(state.error).toBeNull();
  });

  it('clearError() vide l erreur', () => {
    useDeferredCashSessionStore.setState({ error: 'err' });
    useDeferredCashSessionStore.getState().clearError();
    expect(useDeferredCashSessionStore.getState().error).toBeNull();
  });

  it('isDeferred reste true après setDeferredDate', () => {
    useDeferredCashSessionStore.getState().setDeferredDate('2026-03-01');
    expect(useDeferredCashSessionStore.getState().isDeferred).toBe(true);
  });
});
