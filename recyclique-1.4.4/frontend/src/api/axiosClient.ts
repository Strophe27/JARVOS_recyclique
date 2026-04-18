// Fichier : frontend/src/api/axiosClient.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
// OPTIMIZATION: Import auth store to read cached token from memory instead of localStorage
import { useAuthStore } from '../stores/authStore';
import { navigateToLoginReplace } from './authNavigation';

// B42-P3: Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

/**
 * B42-P3: Process queued requests after token refresh
 */
const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// 1. Création de l'instance unique
const rawBaseURL = import.meta.env.VITE_API_URL ?? '/api';
const normalizedBaseURL = rawBaseURL.startsWith('http')
    ? rawBaseURL
    : rawBaseURL.startsWith('/')
        ? rawBaseURL
        : `/${rawBaseURL}`;

const axiosClient = axios.create({
    // La baseURL est lue UNE SEULE FOIS ici, depuis la variable d'environnement.
    // C'est la seule source de vérité pour l'URL de l'API.
    baseURL: normalizedBaseURL,
});

// 2. Intercepteur pour ajouter le token d'authentification et CSRF token
// Ce code s'exécutera avant CHAQUE requête envoyée par cette instance.
axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Lorsque la baseURL est relative (ex: '/api'), s'assurer que les URLs
        // de requête ne commencent pas par un slash pour éviter de retomber sur '/v1/...'
        if (
            typeof config.url === 'string' &&
            config.url.startsWith('/') &&
            typeof config.baseURL === 'string' &&
            config.baseURL.startsWith('/')
        ) {
            config.url = config.url.replace(/^\/+/, '');
        }

        // OPTIMIZATION: Get token from memory cache (Zustand store) instead of localStorage
        // This avoids reading from localStorage on every single API request
        const token = useAuthStore.getState().getToken();

        if (token) {
            // Si un token existe, l'ajoute à l'en-tête Authorization
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // B42-P3: Add CSRF token to headers if available
        const csrfToken = useAuthStore.getState().csrfToken;
        if (csrfToken && config.headers) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }
        
        // B42-P3: Include credentials (cookies) for all requests
        config.withCredentials = true;
        
        // console.log(config.baseURL, config.url)
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// B42-P3: Intercepteur de réponse pour gérer les erreurs d'authentification et refresh automatique
axiosClient.interceptors.response.use(
    (response) => {
        // B42-P3: Update CSRF token from response headers if present
        const csrfTokenHeader = response.headers['x-csrf-token'];
        if (csrfTokenHeader) {
            useAuthStore.getState().setCsrfToken(csrfTokenHeader);
        }
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // B42-P3: Handle 401 with automatic token refresh (single retry)
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            // Ne pas enchaîner un refresh sur login/refresh (boucles) ; laisser logout() finir sur /auth/logout
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
                await useAuthStore.getState().logout();
                navigateToLoginReplace();
                return Promise.reject(error);
            }
            if (originalRequest.url?.includes('/auth/logout')) {
                return Promise.reject(error);
            }

            // Prevent concurrent refresh attempts
            if (isRefreshing) {
                // Queue this request to retry after refresh
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // Retry the original request with new token
                        const token = useAuthStore.getState().getToken();
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return axiosClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshSuccess = await useAuthStore.getState().refreshToken();
                
                if (refreshSuccess) {
                    // Process queued requests
                    processQueue();
                    
                    // Retry the original request with new token
                    const token = useAuthStore.getState().getToken();
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return axiosClient(originalRequest);
                } else {
                    processQueue(error);
                    isRefreshing = false;
                    await useAuthStore.getState().logout();
                    navigateToLoginReplace();
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                processQueue(refreshError);
                isRefreshing = false;
                await useAuthStore.getState().logout();
                navigateToLoginReplace();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        // Ne PAS déconnecter sur 403 (permissions insuffisantes) - laisser le composant gérer l'erreur
        // For other errors, just reject
        return Promise.reject(error);
    }
);

// 3. Exporter l'instance pour que toute l'application puisse l'utiliser
export default axiosClient;
