/**
 * En-têtes Bearer et login direct via le même client Axios que l’API générée.
 * Connexion écran Login : `useAuthStore().login(username, password)` → `AuthApi.apiv1authloginpost`
 * (`POST /v1/auth/login`). Les types reprennent le contrat OpenAPI pour éviter une copie locale divergente.
 */
export type { AuthUser, LoginRequest, LoginResponse } from '../generated/types';

import axiosClient from '../api/axiosClient';
import type { LoginRequest, LoginResponse } from '../generated/types';

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await axiosClient.post<LoginResponse>('/v1/auth/login', request);
  const data = response.data;
  localStorage.setItem('token', data.access_token);
  return data;
}

export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
