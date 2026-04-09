import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import type { AuthContextPort, AuthSessionState } from './auth-context-port';
import type { ContextEnvelopeStub } from '../../types/context-envelope';
import { AuthRuntimeProvider } from './AuthRuntimeProvider';
import {
  fetchRecycliqueContextEnvelope,
  LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY,
  postRecycliqueLogin,
  postRecycliqueLogout,
} from '../../api/recyclique-auth-client';

type Phase = 'idle' | 'restoring' | 'ready';

function readStoredAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const t = sessionStorage.getItem(LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY)?.trim();
  return t || null;
}

function persistAccessToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  if (token) sessionStorage.setItem(LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY, token);
  else sessionStorage.removeItem(LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY);
}

function initialPhase(): Phase {
  if (typeof window === 'undefined') return 'idle';
  return readStoredAccessToken() ? 'restoring' : 'idle';
}

export type LiveAuthShellProps = {
  readonly children: ReactNode;
};

/**
 * Parcours terrain minimal : formulaire → `POST /v1/auth/login` → `GET /v1/users/me/context` → même port {@link AuthContextPort} que la démo (Bearer + `credentials: 'include'`).
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
    setAccessToken(token);
    setEnvelope(env);
    setSession({
      authenticated: true,
      userId: userId?.trim() || undefined,
    });
    setPhase('ready');
    setFormError(null);
  }, []);

  const clearSession = useCallback(() => {
    persistAccessToken(null);
    setAccessToken(undefined);
    setEnvelope(null);
    setSession({ authenticated: false });
    setPhase('idle');
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
    const hasStored = Boolean(readStoredAccessToken());
    return (
      <Stack p="lg" maw={420} mx="auto" gap="md">
        <Title order={3}>Connexion Recyclique</Title>
        <Text size="sm" c="dimmed">
          Auth réelle contre l’API (`VITE_RECYCLIQUE_API_PREFIX`, défaut `/api`). Pas de Swagger requis.
        </Text>
        {formError ? (
          <Alert color="red" title="Erreur">
            {formError}
          </Alert>
        ) : null}
        {hasStored ? (
          <Group gap="sm">
            <Button type="button" variant="light" loading={busy} onClick={onRetryStoredToken}>
              Réessayer avec le jeton enregistré
            </Button>
            <Button type="button" variant="subtle" color="gray" onClick={() => clearSession()}>
              Effacer la session locale
            </Button>
          </Group>
        ) : null}
        <form onSubmit={onSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Identifiant"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(ev) => setUsername(ev.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Mot de passe"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.currentTarget.value)}
              required
            />
            <Button type="submit" loading={busy}>
              Se connecter
            </Button>
          </Stack>
        </form>
      </Stack>
    );
  }

  return (
    <AuthRuntimeProvider adapter={adapter}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          background: 'var(--mantine-color-body)',
        }}
        data-testid="live-auth-toolbar"
      >
        <Text size="sm" c="dimmed">
          Auth live — contexte serveur (`GET /v1/users/me/context`)
        </Text>
        <Button type="button" variant="light" size="xs" onClick={() => void onLogout()}>
          Déconnexion
        </Button>
      </div>
      {children}
    </AuthRuntimeProvider>
  );
}
