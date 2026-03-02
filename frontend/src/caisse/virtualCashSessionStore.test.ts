/**
 * Tests unitaires virtualCashSessionStore — Story 18-10.
 * Vitest + mock API caisse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVirtualCashSessionStore } from './virtualCashSessionStore';
import * as caisseApi from '../api/caisse';
import type { CashSessionItem } from '../api/caisse';

vi.mock('../api/caisse', () => ({
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
}));

const fakeSession: CashSessionItem = {
  id: 'vsession-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 0,
  current_amount: 0,
  status: 'open',
  opened_at: '2026-01-01T10:00:00Z',
  closed_at: null,
  current_step: 'sale',
  closing_amount: null,
  actual_amount: null,
  variance: null,
  variance_comment: null,
  session_type: 'virtual',
  total_sales: null,
  total_items: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

describe('useVirtualCashSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVirtualCashSessionStore.getState().reset();
  });

  it('état initial : currentSession null, loading false, isVirtual true', () => {
    const state = useVirtualCashSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.isVirtual).toBe(true);
  });

  it('openSession success : currentSession mise à jour', async () => {
    vi.mocked(caisseApi.openCashSession).mockResolvedValueOnce(fakeSession);

    await useVirtualCashSessionStore.getState().openSession('token', {
      initial_amount: 0,
      register_id: 'reg-1',
    });

    const state = useVirtualCashSessionStore.getState();
    expect(state.currentSession).toEqual(fakeSession);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('openSession force session_type = virtual dans le payload', async () => {
    vi.mocked(caisseApi.openCashSession).mockResolvedValueOnce(fakeSession);

    await useVirtualCashSessionStore.getState().openSession('token', {
      initial_amount: 500,
      register_id: 'reg-2',
    });

    expect(caisseApi.openCashSession).toHaveBeenCalledWith('token', {
      initial_amount: 500,
      register_id: 'reg-2',
      session_type: 'virtual',
    });
  });

  it('openSession error : error mise à jour, loading false', async () => {
    vi.mocked(caisseApi.openCashSession).mockRejectedValueOnce(new Error('Erreur API'));

    await useVirtualCashSessionStore.getState().openSession('token', {
      initial_amount: 0,
      register_id: 'reg-1',
    });

    const state = useVirtualCashSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.error).toBe('Erreur API');
    expect(state.loading).toBe(false);
  });

  it('closeSession success : currentSession null', async () => {
    useVirtualCashSessionStore.setState({ currentSession: fakeSession });
    vi.mocked(caisseApi.closeCashSession).mockResolvedValueOnce({ ...fakeSession, status: 'closed' });

    const ok = await useVirtualCashSessionStore.getState().closeSession('token', 'vsession-1', {
      closing_amount: 0,
      actual_amount: 0,
    });

    expect(ok).toBe(true);
    expect(useVirtualCashSessionStore.getState().currentSession).toBeNull();
  });

  it('closeSession error : retourne false, error mise à jour', async () => {
    useVirtualCashSessionStore.setState({ currentSession: fakeSession });
    vi.mocked(caisseApi.closeCashSession).mockRejectedValueOnce(new Error('Fermeture impossible'));

    const ok = await useVirtualCashSessionStore.getState().closeSession('token', 'vsession-1', {});

    expect(ok).toBe(false);
    expect(useVirtualCashSessionStore.getState().error).toBe('Fermeture impossible');
  });

  it('reset() remet tout à null', () => {
    useVirtualCashSessionStore.setState({ currentSession: fakeSession, error: 'err' });

    useVirtualCashSessionStore.getState().reset();

    const state = useVirtualCashSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('clearError() vide l erreur', () => {
    useVirtualCashSessionStore.setState({ error: 'some error' });
    useVirtualCashSessionStore.getState().clearError();
    expect(useVirtualCashSessionStore.getState().error).toBeNull();
  });

  it('isVirtual reste true après openSession', async () => {
    vi.mocked(caisseApi.openCashSession).mockResolvedValueOnce(fakeSession);
    await useVirtualCashSessionStore.getState().openSession('token', {
      initial_amount: 0,
      register_id: 'reg-1',
    });
    expect(useVirtualCashSessionStore.getState().isVirtual).toBe(true);
  });
});
