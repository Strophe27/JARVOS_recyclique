/**
 * Tests useCashSessionStore — Story 18-9 (Vitest).
 * Teste les actions du store en isolation avec API mockée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCashSessionStore } from './useCashSessionStore';

const mockSession = {
  id: 'sess-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 5000,  // 50€ en centimes
  current_amount: 5000,
  status: 'open' as const,
  opened_at: '2026-03-01T10:00:00Z',
  closed_at: null,
  current_step: 'sale',
  closing_amount: null,
  actual_amount: null,
  variance: null,
  variance_comment: null,
  session_type: 'real',
  total_sales: 3000,  // 30€
  total_items: 5,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
};

vi.mock('../api/caisse', () => ({
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
  getCurrentCashSession: vi.fn(),
  getCashSession: vi.fn(),
  getCashRegisters: vi.fn(),
  getCashSessionStatus: vi.fn(),
  getCashSessionDeferredCheck: vi.fn(),
  updateCashSessionStep: vi.fn(),
}));

describe('useCashSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCashSessionStore.setState({
      currentSession: null,
      loading: false,
      error: null,
    });
  });

  describe('openSession', () => {
    it('happy path: appelle openCashSession, stocke dans currentSession et localStorage', async () => {
      const { openCashSession } = await import('../api/caisse');
      vi.mocked(openCashSession).mockResolvedValue(mockSession);

      const store = useCashSessionStore.getState();
      const result = await store.openSession('token-123', {
        initial_amount: 5000,
        register_id: 'reg-1',
        session_type: 'real',
      });

      expect(openCashSession).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ initial_amount: 5000, register_id: 'reg-1' })
      );
      expect(result).toEqual(mockSession);
      expect(useCashSessionStore.getState().currentSession).toEqual(mockSession);
      expect(useCashSessionStore.getState().loading).toBe(false);
      expect(useCashSessionStore.getState().error).toBeNull();
    });

    it('erreur API (ex: 409 déjà ouverte): retourne null, stocke error', async () => {
      const { openCashSession } = await import('../api/caisse');
      vi.mocked(openCashSession).mockRejectedValue(new Error('Session déjà ouverte'));

      const store = useCashSessionStore.getState();
      const result = await store.openSession('token-123', {
        initial_amount: 5000,
        register_id: 'reg-1',
        session_type: 'real',
      });

      expect(result).toBeNull();
      expect(useCashSessionStore.getState().currentSession).toBeNull();
      expect(useCashSessionStore.getState().error).toBe('Session déjà ouverte');
    });
  });

  describe('closeSession', () => {
    it('happy path: appelle closeCashSession, vide currentSession', async () => {
      const { closeCashSession } = await import('../api/caisse');
      vi.mocked(closeCashSession).mockResolvedValue({ ...mockSession, status: 'closed' });

      useCashSessionStore.setState({ currentSession: mockSession });

      const store = useCashSessionStore.getState();
      const result = await store.closeSession('token-123', 'sess-1', {
        closing_amount: 8000,
        actual_amount: 7500,
        variance_comment: 'Erreur de rendu',
      });

      expect(closeCashSession).toHaveBeenCalledWith(
        'token-123',
        'sess-1',
        expect.objectContaining({
          closing_amount: 8000,
          actual_amount: 7500,
          variance_comment: 'Erreur de rendu',
        })
      );
      expect(result).toBe(true);
      expect(useCashSessionStore.getState().currentSession).toBeNull();
    });

    it('écart documenté: fond 50€ + ventes 30€ = théorique 80€, compté 75€ → écart -5€ (body transmis correctement)', async () => {
      const { closeCashSession } = await import('../api/caisse');
      vi.mocked(closeCashSession).mockResolvedValue({ ...mockSession, status: 'closed' });

      useCashSessionStore.setState({ currentSession: mockSession });

      const store = useCashSessionStore.getState();
      // fond 50€ + ventes 30€ = 80€ théorique, compté 75€ → écart -500 centimes
      await store.closeSession('token-123', 'sess-1', {
        closing_amount: 8000,   // 80€ théorique
        actual_amount: 7500,    // 75€ compté
        variance_comment: 'Manque 5€ en caisse',
      });

      expect(closeCashSession).toHaveBeenCalledWith(
        'token-123',
        'sess-1',
        expect.objectContaining({
          actual_amount: 7500,
          variance_comment: 'Manque 5€ en caisse',
        })
      );
    });

    it('erreur API: retourne false, conserve error', async () => {
      const { closeCashSession } = await import('../api/caisse');
      vi.mocked(closeCashSession).mockRejectedValue(new Error('Erreur serveur'));

      useCashSessionStore.setState({ currentSession: mockSession });

      const store = useCashSessionStore.getState();
      const result = await store.closeSession('token-123', 'sess-1', {});

      expect(result).toBe(false);
      expect(useCashSessionStore.getState().error).toBe('Erreur serveur');
    });
  });

  describe('refreshSession', () => {
    it('appelle getCurrentCashSession, met à jour currentSession', async () => {
      const { getCurrentCashSession } = await import('../api/caisse');
      vi.mocked(getCurrentCashSession).mockResolvedValue(mockSession);

      const store = useCashSessionStore.getState();
      await store.refreshSession('token-123');

      expect(getCurrentCashSession).toHaveBeenCalledWith('token-123');
      expect(useCashSessionStore.getState().currentSession).toEqual(mockSession);
    });

    it('session null: currentSession devient null', async () => {
      const { getCurrentCashSession } = await import('../api/caisse');
      vi.mocked(getCurrentCashSession).mockResolvedValue(null);

      useCashSessionStore.setState({ currentSession: mockSession });

      const store = useCashSessionStore.getState();
      await store.refreshSession('token-123');

      expect(useCashSessionStore.getState().currentSession).toBeNull();
    });
  });

  describe('resumeSession', () => {
    it('session open → charge dans currentSession, retourne true', async () => {
      const { getCashSession } = await import('../api/caisse');
      vi.mocked(getCashSession).mockResolvedValue(mockSession);

      const store = useCashSessionStore.getState();
      const result = await store.resumeSession('token-123', 'sess-1');

      expect(getCashSession).toHaveBeenCalledWith('token-123', 'sess-1');
      expect(result).toBe(true);
      expect(useCashSessionStore.getState().currentSession).toEqual(mockSession);
    });

    it('session closed → currentSession inchangé, retourne false', async () => {
      const { getCashSession } = await import('../api/caisse');
      vi.mocked(getCashSession).mockResolvedValue({ ...mockSession, status: 'closed' });

      const store = useCashSessionStore.getState();
      const result = await store.resumeSession('token-123', 'sess-closed');

      expect(result).toBe(false);
      expect(useCashSessionStore.getState().currentSession).toBeNull();
    });
  });

  describe('clearError', () => {
    it('vide le champ error', () => {
      useCashSessionStore.setState({ error: 'Une erreur' });
      useCashSessionStore.getState().clearError();
      expect(useCashSessionStore.getState().error).toBeNull();
    });
  });
});
