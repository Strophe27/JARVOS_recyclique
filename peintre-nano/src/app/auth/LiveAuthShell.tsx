import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Stack, Text } from '@mantine/core';
import classes from './LiveAuthShell.module.css';
import type { AuthContextPort, AuthSessionState } from './auth-context-port';
import type { ContextEnvelopeStub } from '../../types/context-envelope';
import type { PageManifest } from '../../types/page-manifest';
import { AuthRuntimeProvider } from './AuthRuntimeProvider';
import {
  fetchRecycliqueContextEnvelope,
  LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY,
  persistUserDisplay,
  postRecycliqueLogin,
  postRecycliqueLogout,
  readStoredUserDisplay,
} from '../../api/recyclique-auth-client';
import pageLoginPublicJson from '../../../../contracts/creos/manifests/page-login-public.json';
import { parsePageManifestJson } from '../../validation/page-manifest-ingest';
import { buildPageManifestRegions } from '../PageRenderer';
import { LiveAuthLoginControllerProvider, type LiveAuthLoginController } from './LiveAuthLoginControllerContext';
import { LiveAuthActionsProvider } from './LiveAuthActionsContext';

type Phase = 'idle' | 'restoring' | 'ready';

function readStoredAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const t = sessionStorage.getItem(LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY)?.trim();
  return t || null;
}

function persistAccessToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  if (token) sessionStorage.setItem(LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY, token);
  else {
    sessionStorage.removeItem(LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY);
    persistUserDisplay(undefined);
  }
}

function initialPhase(): Phase {
  if (typeof window === 'undefined') return 'idle';
  return readStoredAccessToken() ? 'restoring' : 'idle';
}

function replacePath(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', path);
}

/**
 * Route canonique post-login côté CREOS : entrée `transverse-dashboard` sur `/dashboard`
 * (`navigation-transverse-served.json` + `page-transverse-dashboard.json`).
 * Le legacy Recyclique 1.4.x ancre l’accueil authentifié sur `/` et un lien « Tableau de bord » peut
 * pointer vers `/` — écart accepté et documenté (matrice `ui-pilote-02-dashboard-unifie-standard`, doc `03-contrats-creos-et-donnees.md`).
 */
const CANONICAL_POST_LOGIN_PATH = '/dashboard';

const pageLoginPublicParsed = parsePageManifestJson(
  JSON.stringify(pageLoginPublicJson),
  'contracts/creos/manifests/page-login-public.json',
);
if (!pageLoginPublicParsed.manifest || pageLoginPublicParsed.issues.length) {
  const msg = pageLoginPublicParsed.issues.map((i) => i.message).join('; ') || 'manifeste login public invalide';
  throw new Error(`page-login-public: ${msg}`);
}
const pageLoginPublicManifest: PageManifest = pageLoginPublicParsed.manifest;

export type LiveAuthShellProps = {
  readonly children: ReactNode;
};

/**
 * Parcours terrain : formulaire (CREOS `page-login-public.json` + `auth.live.public-login`) →
 * `POST /v1/auth/login` (`recyclique_auth_login`) → `GET /v1/users/me/context` (`recyclique_users_getContextEnvelope`) →
 * même port {@link AuthContextPort} que la démo (Bearer + `credentials: 'include'`).
 * Activé depuis la racine quand `VITE_LIVE_AUTH` vaut `true` ou `1`.
 */
export function LiveAuthShell({ children }: LiveAuthShellProps) {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [session, setSession] = useState<AuthSessionState>({ authenticated: false });
  const [envelope, setEnvelope] = useState<ContextEnvelopeStub | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyAuthenticated = useCallback((token: string, env: ContextEnvelopeStub, userId?: string) => {
    persistAccessToken(token);
    const userDisplayLabel = readStoredUserDisplay();
    setAccessToken(token);
    setEnvelope(env);
    setSession({
      authenticated: true,
      userId: userId?.trim() || undefined,
      userDisplayLabel,
    });
    setPhase('ready');
    setFormError(null);
    replacePath(CANONICAL_POST_LOGIN_PATH);
  }, []);

  const clearSession = useCallback(() => {
    persistAccessToken(null);
    setAccessToken(undefined);
    setEnvelope(null);
    setSession({ authenticated: false });
    setPhase('idle');
    replacePath('/login');
  }, []);

  const loadContextForToken = useCallback(
    async (token: string, userIdHint?: string): Promise<boolean> => {
      const ctx = await fetchRecycliqueContextEnvelope(token);
      if (!ctx.ok) {
        if (ctx.status === 401) {
          clearSession();
        }
        setFormError(ctx.message);
        return false;
      }
      applyAuthenticated(token, ctx.envelope, userIdHint);
      return true;
    },
    [applyAuthenticated, clearSession],
  );

  useEffect(() => {
    const stored = readStoredAccessToken();
    if (!stored) {
      setPhase('idle');
      return;
    }
    void loadContextForToken(stored).then((ok) => {
      if (!ok) setPhase('idle');
    });
  }, [loadContextForToken]);

  /** Hors session : URL attendue `/login` (parité legacy). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (phase === 'restoring' || phase === 'ready') return;
    const path = window.location.pathname;
    if (path !== '/login') {
      replacePath('/login');
    }
  }, [phase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (phase !== 'ready') return;
    if (window.location.pathname === '/login') {
      replacePath(CANONICAL_POST_LOGIN_PATH);
    }
  }, [phase]);

  const adapter: AuthContextPort | null = useMemo(() => {
    if (!envelope) return null;
    return {
      getSession: () => session,
      getContextEnvelope: () => envelope,
      getAccessToken: () => accessToken,
    };
  }, [session, envelope, accessToken]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setBusy(true);
      try {
        const login = await postRecycliqueLogin(username, password, { useWebSessionCookies: false });
        if (!login.ok) {
          setFormError(login.message);
          return;
        }
        persistUserDisplay(login.userDisplayLabel);
        await loadContextForToken(login.accessToken, login.userId);
      } finally {
        setBusy(false);
      }
    },
    [username, password, loadContextForToken],
  );

  const onLogout = useCallback(async () => {
    const t = accessToken ?? readStoredAccessToken();
    if (t) await postRecycliqueLogout(t);
    clearSession();
    setPassword('');
  }, [accessToken, clearSession]);

  const onRetryStoredToken = useCallback(() => {
    const t = readStoredAccessToken();
    if (!t) return;
    setFormError(null);
    setBusy(true);
    void loadContextForToken(t).finally(() => setBusy(false));
  }, [loadContextForToken]);

  const loginController: LiveAuthLoginController = useMemo(
    () => ({
      username,
      password,
      setUsername,
      setPassword,
      onSubmit,
      formError,
      busy,
      hasStoredToken: Boolean(readStoredAccessToken()),
      onRetryStoredToken,
      onClearStoredSession: clearSession,
    }),
    [username, password, onSubmit, formError, busy, onRetryStoredToken, clearSession, phase],
  );

  const loginPublicRegions = useMemo(
    () => buildPageManifestRegions(pageLoginPublicManifest),
    [],
  );

  if (phase === 'restoring') {
    return (
      <Stack p="lg" align="center" gap="md">
        <Text size="sm" c="dimmed">
          Restauration de session…
        </Text>
      </Stack>
    );
  }

  if (phase !== 'ready' || !envelope || !adapter) {
    return (
      <LiveAuthLoginControllerProvider value={loginController}>
        <div
          className={classes.liveAuthPublicRoot}
          data-testid="live-auth-public-shell"
          data-creos-page-key="login-public"
        >
          {loginPublicRegions.mainWidgets}
        </div>
      </LiveAuthLoginControllerProvider>
    );
  }

  return (
    <LiveAuthActionsProvider value={{ requestLogout: () => void onLogout() }}>
      <AuthRuntimeProvider adapter={adapter}>{children}</AuthRuntimeProvider>
    </LiveAuthActionsProvider>
  );
}
