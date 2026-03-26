import { describe, it, expect, beforeEach, vi } from 'vitest';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../authStore';
import { AuthApi } from '../../generated/api';

vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
}));

// Mock du client API
vi.mock('../../generated/api', () => ({
  AuthApi: {
    apiv1authloginpost: vi.fn(),
  },
}));

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { permissions: [] } });
    vi.mocked(axiosClient.post).mockResolvedValue({});
    // Reset du store (évite les fuites d'état entre tests, y compris métadonnées session B42-P3)
    useAuthStore.setState({
      currentUser: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      token: null,
      refreshTokenValue: null,
      permissions: [],
      tokenExpiration: null,
      refreshPending: false,
      csrfToken: null,
      lastRefreshAttempt: null,
    });
  });

  describe('login', () => {
    it('devrait appeler l\'API avec les bonnes données', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: '1',
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(AuthApi.apiv1authloginpost).mockResolvedValue(mockResponse);

      const { login } = useAuthStore.getState();
      await login('testuser', 'testpass');

      expect(AuthApi.apiv1authloginpost).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
      });
    });

    it('devrait stocker le token dans localStorage', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: '1',
          username: 'testuser',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(AuthApi.apiv1authloginpost).mockResolvedValue(mockResponse);

      const { login } = useAuthStore.getState();
      await login('testuser', 'testpass');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
    });

    it('devrait mettre à jour l\'état du store après une connexion réussie', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: '1',
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(AuthApi.apiv1authloginpost).mockResolvedValue(mockResponse);

      const { login } = useAuthStore.getState();
      await login('testuser', 'testpass');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toEqual({
        id: '1',
        telegram_id: undefined,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        status: 'approved',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      });
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('devrait gérer les erreurs de connexion', async () => {
      const mockError = {
        detail: 'Invalid credentials',
      };

      vi.mocked(AuthApi.apiv1authloginpost).mockRejectedValue(mockError);

      const { login } = useAuthStore.getState();
      
      try {
        await login('testuser', 'wrongpass');
      } catch {
        // Expected to throw
      }

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBe(null);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('devrait définir loading à true pendant la connexion', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(AuthApi.apiv1authloginpost).mockReturnValue(promise as any);

      const { login } = useAuthStore.getState();
      const loginPromise = login('testuser', 'testpass');

      // Vérifier que loading est true pendant l'appel
      expect(useAuthStore.getState().loading).toBe(true);

      // Résoudre la promesse
      resolvePromise!({
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: '1',
          username: 'testuser',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      });

      await loginPromise;

      // Vérifier que loading est false après la connexion
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('login sans telegram_id dans la réponse : currentUser sans telegram_id', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: '1',
          username: 'tgui',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(AuthApi.apiv1authloginpost).mockResolvedValue(mockResponse);

      const { login } = useAuthStore.getState();
      await login('tgui', 'testpass');

      expect(useAuthStore.getState().currentUser?.telegram_id).toBeUndefined();
    });
  });

  describe('initializeAuth', () => {
    it('sans token : n\'appelle pas GET /me et laisse la session vide', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();

      expect(axiosClient.get).not.toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBe(null);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.tokenExpiration).toBe(null);
      expect(state.refreshPending).toBe(false);
      expect(state.csrfToken).toBe(null);
      expect(state.lastRefreshAttempt).toBe(null);
    });

    it('avec token valide : charge /v1/users/me puis /v1/users/me/permissions', async () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'token') return 'jwt-test';
        if (key === 'refreshToken') return 'refresh-test';
        return null;
      });

      const me = {
        id: 'user-42',
        username: 'volunteer',
        role: 'user',
        status: 'approved',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(axiosClient.get).mockImplementation(async (path: string) => {
        if (path === '/v1/users/me/permissions') {
          return { data: { permissions: ['reception.access'] } };
        }
        if (path === '/v1/users/me') {
          return { data: me };
        }
        return { data: {} };
      });

      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();

      expect(axiosClient.get).toHaveBeenCalledWith('/v1/users/me');
      expect(axiosClient.get).toHaveBeenCalledWith('/v1/users/me/permissions');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser?.id).toBe('user-42');
      expect(state.permissions).toEqual(['reception.access']);
      expect(state.loading).toBe(false);
      expect(state.token).toBe('jwt-test');
    });

    it('conserve un telegram_id alphanumerique depuis GET /v1/users/me', async () => {
      localStorageMock.getItem.mockImplementation((key: string) =>
        key === 'token' ? 'jwt-test' : null
      );

      const me = {
        id: 'user-99',
        telegram_id: 'tg_me_alpha',
        username: 'volunteer',
        role: 'user',
        status: 'approved',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(axiosClient.get).mockImplementation(async (path: string) => {
        if (path === '/v1/users/me/permissions') {
          return { data: { permissions: [] } };
        }
        if (path === '/v1/users/me') {
          return { data: me };
        }
        return { data: {} };
      });

      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();

      expect(useAuthStore.getState().currentUser?.telegram_id).toBe('tg_me_alpha');
    });

    it('échec /v1/users/me : déclenche logout (nettoyage local)', async () => {
      localStorageMock.getItem.mockImplementation((key: string) =>
        key === 'token' ? 'bad-jwt' : null
      );

      vi.mocked(axiosClient.get).mockRejectedValue({ response: { status: 401 } });

      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('échec API (403) : retourne false, lève refreshPending, ne vide pas la session (nettoyage = intercepteur)', async () => {
      vi.mocked(axiosClient.post).mockRejectedValueOnce({ response: { status: 403 } });

      useAuthStore.setState({
        refreshTokenValue: 'refresh-secret',
        refreshPending: false,
        lastRefreshAttempt: null,
        token: 'access-jwt',
        isAuthenticated: true,
      });

      const ok = await useAuthStore.getState().refreshToken();

      expect(ok).toBe(false);
      expect(useAuthStore.getState().refreshPending).toBe(false);
      expect(useAuthStore.getState().refreshTokenValue).toBe('refresh-secret');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    it('échec API (401) : même contrat — pas de logout dans le store', async () => {
      vi.mocked(axiosClient.post).mockRejectedValueOnce({ response: { status: 401 } });

      useAuthStore.setState({
        refreshTokenValue: 'refresh-secret',
        refreshPending: false,
        lastRefreshAttempt: null,
        isAuthenticated: true,
      });

      const ok = await useAuthStore.getState().refreshToken();

      expect(ok).toBe(false);
      expect(useAuthStore.getState().refreshPending).toBe(false);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('devrait réinitialiser l\'état et supprimer le token', async () => {
      // État initial avec utilisateur connecté
      useAuthStore.setState({
        currentUser: {
          id: '1',
          username: 'testuser',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        error: 'Some error',
      });

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.currentUser).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('computed properties', () => {
    it('devrait calculer isAdmin correctement', () => {
      const { isAdmin } = useAuthStore.getState();

      // Pas d'utilisateur
      expect(isAdmin()).toBe(false);

      // Utilisateur normal
      useAuthStore.setState({
        currentUser: {
          id: '1',
          username: 'user',
          role: 'user',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      });
      expect(isAdmin()).toBe(false);

      // Admin
      useAuthStore.setState({
        currentUser: {
          id: '1',
          username: 'admin',
          role: 'admin',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      });
      expect(isAdmin()).toBe(true);

      // Super admin
      useAuthStore.setState({
        currentUser: {
          id: '1',
          username: 'superadmin',
          role: 'super-admin',
          status: 'approved',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      });
      expect(isAdmin()).toBe(true);
    });
  });
});