import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AuthApi } from '../generated/api';
import { LoginRequest, LoginResponse, UserRole } from '../generated/types';
import axiosClient from '../api/axiosClient';
import { getTokenExpiration } from '../utils/jwt';

export interface User {
  id: string;
  /** Identifiant Telegram : nombre (API historique) ou chaîne (ex. id non numérique / test). */
  telegram_id?: string | number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  site_id?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  // State
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null; // OPTIMIZATION: Cache token in memory to avoid repeated localStorage reads
  refreshTokenValue: string | null; // B42-P6: Store refresh token for rotation
  permissions: string[]; // NEW: Stocker les permissions de l'utilisateur
  loading: boolean;
  error: string | null;
  
  // B42-P3: Session metadata for sliding session
  tokenExpiration: number | null; // Expiration timestamp in milliseconds
  refreshPending: boolean; // Flag to prevent concurrent refresh attempts
  csrfToken: string | null; // CSRF token for double-submit pattern
  lastRefreshAttempt: number | null; // Timestamp of last refresh attempt to prevent loops

  // Actions
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, email?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setToken: (token: string | null) => void; // OPTIMIZATION: Set cached token
  getToken: () => string | null; // OPTIMIZATION: Get cached token
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  
  // B42-P3: Refresh token actions
  refreshToken: () => Promise<boolean>; // Attempt to refresh access token, returns success
  setRefreshPending: (pending: boolean) => void;
  setCsrfToken: (token: string | null) => void;
  updateTokenExpiration: (token: string | null) => void; // Update expiration from token

  // Computed
  isAdmin: () => boolean;
  hasPermission: (permission: string) => boolean; // NEW: Vérifier une permission
  hasCashAccess: () => boolean;
  hasVirtualCashAccess: () => boolean; // B50-P4: Vérifier accès caisse virtuelle
  hasDeferredCashAccess: () => boolean; // B50-P4: Vérifier accès caisse différée
  hasReceptionAccess: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentUser: null,
        isAuthenticated: false,
        token: null, // OPTIMIZATION: Cached token in memory
        refreshTokenValue: null, // B42-P6
        permissions: [], // NEW
        loading: false,
        error: null,
        
        // B42-P3: Session metadata
        tokenExpiration: null,
        refreshPending: false,
        csrfToken: null,
        lastRefreshAttempt: null,

        // Actions
        login: async (username: string, password: string) => {
          set({ loading: true, error: null });
          try {
            const loginData: LoginRequest = { username, password };
            const response = await AuthApi.apiv1authloginpost(loginData) as LoginResponse & {
              refresh_token?: string | null;
            };
            
            // OPTIMIZATION: Store token in both localStorage (persistence) and memory (cache)
            localStorage.setItem('token', response.access_token);
            if (response.refresh_token) {
              localStorage.setItem('refreshToken', response.refresh_token);
            }
            if (axiosClient.defaults?.headers?.common) {
              axiosClient.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;
            }

            // Récupérer les permissions de l'utilisateur
            let userPermissions: string[] = [];
            try {
              const permissionsResponse = await axiosClient.get('/v1/users/me/permissions');
              userPermissions = permissionsResponse.data.permissions || [];
            } catch (permError) {
              console.error("Could not fetch user permissions", permError);
              // Ne pas bloquer le login si les permissions ne peuvent être récupérées
            }
            
            const user = mapApiUserToUser(response.user as unknown as Record<string, unknown>);
            
            // B42-P3: Update token expiration and CSRF token
            const expiration = getTokenExpiration(response.access_token);
            // CSRF token will be set by the backend via cookie, we'll read it from cookie
            const csrfToken = getCsrfTokenFromCookie();
            
            set({
              currentUser: user,
              isAuthenticated: true,
              token: response.access_token, // OPTIMIZATION: Cache token in memory
              refreshTokenValue: response.refresh_token || null, // B42-P6
              permissions: userPermissions, // NEW
              tokenExpiration: expiration,
              csrfToken: csrfToken,
              loading: false,
              error: null
            });
          } catch (error: any) {
            let errorMessage = 'Erreur de connexion';
            if (error?.detail) {
              errorMessage = Array.isArray(error.detail) ? error.detail.map((e: any) => e.msg).join(', ') : error.detail;
            } else if (error?.message) {
              errorMessage = error.message;
            }
            set({ error: errorMessage, loading: false });
            throw new Error(errorMessage);
          }
        },

        signup: async (username: string, password: string, email?: string) => {
          set({ loading: true, error: null });
          try {
            const signupData = { username, password, email };
            await AuthApi.apiv1authsignuppost(signupData);
            set({ loading: false, error: null });
          } catch (error: any) {
            let errorMessage = "Erreur lors de l'inscription";
            
            // Gestion spécifique de l'erreur 409 Conflict pour email dupliqué
            if (error?.response?.status === 409) {
              errorMessage = error?.response?.data?.detail || 'Un compte avec cet email existe déjà';
            } else if (error?.detail) {
              errorMessage = Array.isArray(error.detail) ? error.detail.map((e: any) => e.msg).join(', ') : error.detail;
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            set({ error: errorMessage, loading: false });
            throw error;
          }
        },

        forgotPassword: async (email: string) => {
          set({ loading: true, error: null });
          try {
            await axiosClient.post('/v1/auth/forgot-password', { email });
            set({ loading: false, error: null });
          } catch (error: any) {
            const errorMessage = error?.response?.data?.detail || error?.message || "Erreur lors de l'envoi de l'email";
            set({ error: errorMessage, loading: false });
            throw error;
          }
        },

        resetPassword: async (token: string, newPassword: string) => {
          set({ loading: true, error: null });
          try {
            await axiosClient.post('/v1/auth/reset-password', { token, new_password: newPassword });
            set({ loading: false, error: null });
          } catch (error: any) {
            const errorMessage = error?.response?.data?.detail || error?.message || "Erreur lors de la réinitialisation";
            set({ error: errorMessage, loading: false });
            throw error;
          }
        },

        setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
        setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
        setToken: (token) => {
          const expiration = token ? getTokenExpiration(token) : null;
          set({ token, tokenExpiration: expiration });
        }, // OPTIMIZATION: Set cached token and update expiration
        getToken: () => get().token, // OPTIMIZATION: Get cached token from memory
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        
        logout: async () => {
          try {
            // Appeler l'API de logout pour enregistrer l'événement d'audit
            // Même si l'appel échoue, on procède quand même à la déconnexion locale
            try {
              await axiosClient.post('/v1/auth/logout');
            } catch (apiError) {
              // Log l'erreur mais ne pas bloquer la déconnexion
              console.warn('Logout API call failed, proceeding with local logout:', apiError);
            }
          } catch (error) {
            // En cas d'erreur, on continue quand même la déconnexion locale
            console.warn('Logout API call failed, proceeding with local logout:', error);
          } finally {
            // Toujours procéder à la déconnexion locale
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken'); // B42-P6
            // B42-P3: Clear session metadata
            // Safely delete Authorization header if axiosClient is configured
            if (axiosClient.defaults?.headers?.common) {
              delete axiosClient.defaults.headers.common['Authorization'];
            }
            set({ 
              currentUser: null, 
              isAuthenticated: false, 
              token: null, 
              refreshTokenValue: null, // B42-P6
              permissions: [], 
              error: null,
              tokenExpiration: null,
              refreshPending: false,
              csrfToken: null,
              lastRefreshAttempt: null
            }); // OPTIMIZATION: Clear cached token and session metadata
          }
        },

        initializeAuth: async () => {
          // OPTIMIZATION: Read from localStorage only once on app init, then cache in memory
          const token = localStorage.getItem('token');
          const refreshToken = localStorage.getItem('refreshToken'); // B42-P6
          if (!token) {
            set({
              currentUser: null,
              isAuthenticated: false,
              token: null,
              refreshTokenValue: null,
              permissions: [],
              loading: false,
              error: null,
              tokenExpiration: null,
              refreshPending: false,
              csrfToken: null,
              lastRefreshAttempt: null,
            });
            return;
          }
          if (axiosClient.defaults?.headers?.common) {
            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          const expiration = getTokenExpiration(token);
          const csrfToken = getCsrfTokenFromCookie();

          set({
            token,
            refreshTokenValue: refreshToken,
            tokenExpiration: expiration,
            csrfToken,
            loading: true,
            error: null,
          });

          try {
            const { data: me } = await axiosClient.get('/v1/users/me');
            const user = mapApiUserToUser(me as Record<string, unknown>);

            let userPermissions: string[] = [];
            try {
              const permissionsResponse = await axiosClient.get('/v1/users/me/permissions');
              userPermissions = permissionsResponse.data.permissions || [];
            } catch (permError) {
              console.error('Could not fetch user permissions', permError);
            }

            set({
              currentUser: user,
              isAuthenticated: true,
              token,
              refreshTokenValue: refreshToken,
              permissions: userPermissions,
              tokenExpiration: expiration,
              csrfToken: getCsrfTokenFromCookie() ?? csrfToken,
              loading: false,
              error: null,
            });
          } catch (error: unknown) {
            console.error('initializeAuth: échec /v1/users/me', error);
            await get().logout();
            set({ loading: false });
          }
        },

        // Computed
        isAdmin: () => {
          const { currentUser } = get();
          return (
            currentUser?.role === UserRole.ADMIN ||
            currentUser?.role === UserRole.SUPER_ADMIN
          );
        },

        hasPermission: (permission: string) => {
          const { permissions, currentUser } = get();
          // Admins and Super-admins have all permissions
          if (
            currentUser?.role === UserRole.ADMIN ||
            currentUser?.role === UserRole.SUPER_ADMIN
          ) {
            return true;
          }
          return permissions.includes(permission);
        },

        hasCashAccess: () => {
          const { permissions, currentUser } = get();
          // Admins and Super-admins always have access
          if (
            currentUser?.role === UserRole.ADMIN ||
            currentUser?.role === UserRole.SUPER_ADMIN
          ) {
            return true;
          }
          // Volunteers need at least one of the cash permissions
          return permissions.includes('caisse.access') || 
                 permissions.includes('caisse.virtual.access') || 
                 permissions.includes('caisse.deferred.access');
        },

        hasVirtualCashAccess: () => {
          const { permissions, currentUser } = get();
          // Admins and Super-admins always have access
          if (
            currentUser?.role === UserRole.ADMIN ||
            currentUser?.role === UserRole.SUPER_ADMIN
          ) {
            return true;
          }
          // Volunteers need the permission
          return permissions.includes('caisse.virtual.access');
        },

        hasDeferredCashAccess: () => {
          const { permissions, currentUser } = get();
          // Admins and Super-admins always have access
          if (
            currentUser?.role === UserRole.ADMIN ||
            currentUser?.role === UserRole.SUPER_ADMIN
          ) {
            return true;
          }
          // Volunteers need the permission
          return permissions.includes('caisse.deferred.access');
        },

        hasReceptionAccess: () => {
          const { permissions, currentUser } = get();
          // Admins and Super-admins always have access
          if (
            currentUser?.role === UserRole.ADMIN ||
            currentUser?.role === UserRole.SUPER_ADMIN
          ) {
            return true;
          }
          // Volunteers need the permission
          return permissions.includes('reception.access');
        },
        
        // B42-P3: Refresh token actions
        refreshToken: async () => {
          const { refreshPending, lastRefreshAttempt, csrfToken, refreshTokenValue } = get();
          
          // Prevent concurrent refresh attempts
          if (refreshPending) {
            console.debug('Refresh already in progress, skipping');
            return false;
          }
          
          // Check if we have a refresh token
          if (!refreshTokenValue) {
            console.error('No refresh token available');
            return false;
          }
          
          // Prevent refresh loops (min 5 seconds between attempts)
          const now = Date.now();
          if (lastRefreshAttempt && now - lastRefreshAttempt < 5000) {
            console.debug('Refresh attempted too recently, skipping');
            return false;
          }
          
          set({ refreshPending: true, lastRefreshAttempt: now });
          
          try {
            // Get CSRF token from cookie if not in state
            const currentCsrfToken = csrfToken || getCsrfTokenFromCookie();
            
            const response = await axiosClient.post(
              '/v1/auth/refresh',
              { refresh_token: refreshTokenValue }, // B42-P6: Send refresh token in body
              {
                headers: currentCsrfToken ? {
                  'X-CSRF-Token': currentCsrfToken
                } : {},
                withCredentials: true // Include HTTP-only cookies
              }
            );
            
            const newToken = response.data.access_token;
            const newRefreshToken = response.data.refresh_token; // B42-P6: Get new refresh token (rotation)
            const newExpiration = getTokenExpiration(newToken);
            const newCsrfToken = response.data.csrf_token || getCsrfTokenFromCookie();
            
            // Update token in localStorage and memory
            localStorage.setItem('token', newToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            if (axiosClient.defaults?.headers?.common) {
              axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            }
            
            set({
              token: newToken,
              refreshTokenValue: newRefreshToken || refreshTokenValue, // Update with new one or keep old one
              tokenExpiration: newExpiration,
              csrfToken: newCsrfToken,
              refreshPending: false,
              error: null
            });
            
            return true;
          } catch (error: unknown) {
            console.error('Token refresh failed:', error);
            set({ refreshPending: false });
            // Nettoyage + redirection : uniquement dans l'intercepteur axios après `false`
            // (évite déconnexion partielle et incohérence 401/403 vs intercepteur).
            return false;
          }
        },
        
        setRefreshPending: (pending) => set({ refreshPending: pending }),
        setCsrfToken: (token) => set({ csrfToken: token }),
        updateTokenExpiration: (token) => {
          const expiration = token ? getTokenExpiration(token) : null;
          set({ tokenExpiration: expiration });
        }
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({ 
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
          permissions: state.permissions // NEW
        })
      }
    ),
    {
      name: 'auth-store'
    }
  )
);

const KNOWN_USER_ROLES = new Set<string>(Object.values(UserRole));

function parseApiUserRole(raw: unknown): UserRole {
  if (typeof raw === 'string' && KNOWN_USER_ROLES.has(raw)) {
    return raw as UserRole;
  }
  return UserRole.USER;
}

/** Extrait `telegram_id` depuis la réponse API sans perdre les valeurs non numériques. */
function parseTelegramIdFromApi(raw: unknown): string | number | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return undefined;
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return Number.isSafeInteger(n) ? n : s;
    }
    return s;
  }
  return undefined;
}

/** Réponse API user (login ou `GET /v1/users/me`) → modèle du store. */
function mapApiUserToUser(raw: Record<string, unknown>): User {
  const telegram_id = parseTelegramIdFromApi(raw.telegram_id);

  const user: User = {
    id: String(raw.id),
    telegram_id,
    username: (raw.username as string | undefined) ?? undefined,
    first_name: (raw.first_name as string | undefined) ?? undefined,
    last_name: (raw.last_name as string | undefined) ?? undefined,
    email: (raw.email as string | undefined) ?? undefined,
    phone_number: (raw.phone_number as string | undefined) ?? undefined,
    address: (raw.address as string | undefined) ?? undefined,
    role: parseApiUserRole(raw.role),
    status: raw.status as User['status'],
    is_active: Boolean(raw.is_active),
    created_at: (raw.created_at as string) || new Date().toISOString(),
    updated_at: (raw.updated_at as string) || new Date().toISOString(),
  };

  if (raw.site_id != null && raw.site_id !== '') {
    user.site_id = String(raw.site_id);
  }

  return user;
}

/**
 * Helper function to get CSRF token from cookie
 * CSRF token is set by backend in cookie named 'csrf_token'
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token' || name === 'X-CSRF-Token') {
      return value || null;
    }
  }
  return null;
}

export default useAuthStore;
