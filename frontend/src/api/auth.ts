/**
 * Client API auth — Story 3.1, 3.3, 11.1.
 * POST /v1/auth/login, pin, signup, forgot-password, reset-password.
 */

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

export interface UserInToken {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserInToken;
  permissions?: string[];
}

export interface SessionResponse {
  authenticated: boolean;
  user: UserInToken | null;
  permissions: string[];
}

/**
 * Connexion classique — POST /v1/auth/login.
 */
export async function postLogin(username: string, password: string): Promise<LoginResponse> {
  const base = getBase();
  const res = await fetch(`${base}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.detail === 'string' ? data.detail : 'Identifiant ou mot de passe incorrect';
    throw new Error(message);
  }
  return res.json() as Promise<LoginResponse>;
}

export function getSsoStartUrl(nextPath = '/'): string {
  const base = getBase();
  const qs = new URLSearchParams({ next: nextPath });
  return `${base}/v1/auth/sso/start?${qs.toString()}`;
}

export async function getSession(): Promise<SessionResponse> {
  const base = getBase();
  const res = await fetch(`${base}/v1/auth/session`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Erreur de session');
  }
  return res.json() as Promise<SessionResponse>;
}

/**
 * Inscription — POST /v1/auth/signup.
 */
export async function postSignup(body: {
  username: string;
  email: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
}): Promise<{ message: string }> {
  const base = getBase();
  const res = await fetch(`${base}/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : 'Erreur d\'inscription';
    throw new Error(message);
  }
  return data as { message: string };
}

/**
 * Mot de passe oublié — POST /v1/auth/forgot-password.
 */
export async function postForgotPassword(email: string): Promise<{ message: string }> {
  const base = getBase();
  const res = await fetch(`${base}/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : 'Erreur';
    throw new Error(message);
  }
  return data as { message: string };
}

/**
 * Réinitialisation mot de passe — POST /v1/auth/reset-password.
 */
export async function postResetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const base = getBase();
  const res = await fetch(`${base}/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : 'Token invalide ou expiré';
    throw new Error(message);
  }
  return data as { message: string };
}

export interface PinLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserInToken;
  permissions?: string[];
}

/**
 * Déverrouillage caisse par PIN — POST /v1/auth/pin.
 * En cas de succès : tokens + user. 401 si PIN invalide, 403 si pas permission caisse.
 */
export async function postPinUnlock(pin: string): Promise<PinLoginResponse> {
  const base = getBase();
  const res = await fetch(`${base}/v1/auth/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.detail === 'string' ? data.detail : 'Erreur de déverrouillage';
    throw new Error(message);
  }
  return res.json() as Promise<PinLoginResponse>;
}

/**
 * Déconnexion — POST /v1/auth/logout (invalide le refresh_token).
 */
export async function postLogout(refresh_token?: string): Promise<void> {
  const base = getBase();
  const body = refresh_token ? JSON.stringify({ refresh_token }) : undefined;
  const res = await fetch(`${base}/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Erreur de déconnexion');
  }
}
