import type { AuthContextPort } from '../app/auth/auth-context-port';
import {
  type ExploitationLiveSnapshot,
  liveSnapshotFromJsonBody,
} from '../domains/bandeau-live/live-snapshot-normalize';

/** Aligné sur `widgets-catalog-bandeau-live.json` (`polling_interval_s`). */
export const DEFAULT_LIVE_SNAPSHOT_POLLING_INTERVAL_S = 30;

/**
 * Préfixe API same-origin : en dev Vite/Docker, proxy `/api` → backend (voir `vite.config.ts`).
 * Surcharge : `VITE_RECYCLIQUE_API_PREFIX` (sans slash final).
 */
export function getLiveSnapshotBasePrefix(): string {
  const raw = import.meta.env.VITE_RECYCLIQUE_API_PREFIX as string | undefined;
  const trimmed = (raw ?? '/api').replace(/\/$/, '');
  return trimmed || '/api';
}

export function getLiveSnapshotUrl(): string {
  return `${getLiveSnapshotBasePrefix()}/v2/exploitation/live-snapshot`;
}

export type FetchLiveSnapshotResult =
  | { ok: true; snapshot: ExploitationLiveSnapshot; correlationId: string; degradedEmpty: boolean }
  | { ok: false; kind: 'http'; status: number; correlationId: string; retryable?: boolean }
  | { ok: false; kind: 'network'; correlationId: string; message: string }
  | { ok: false; kind: 'parse'; correlationId: string; message: string };

function parseRetryable(text: string): boolean | undefined {
  try {
    const o = JSON.parse(text) as { retryable?: unknown };
    return typeof o.retryable === 'boolean' ? o.retryable : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Un tick de poll : `X-Correlation-ID` = UUID v4 par requête (Story 4.3).
 * Auth : `credentials: 'include'` (cookies) + en-tête `Authorization` si le port expose un jeton Bearer.
 */
export async function fetchLiveSnapshot(
  signal: AbortSignal,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<FetchLiveSnapshotResult> {
  const correlationId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `corr-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId,
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = getLiveSnapshotUrl();

  try {
    const res = await fetch(url, { method: 'GET', credentials: 'include', headers, signal });
    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        kind: 'http',
        status: res.status,
        correlationId,
        retryable: parseRetryable(text),
      };
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, kind: 'parse', correlationId, message: 'Réponse JSON invalide' };
    }

    const snapshot = liveSnapshotFromJsonBody(json);
    const degradedEmpty = snapshot === null;
    return {
      ok: true,
      snapshot: snapshot ?? {},
      correlationId,
      degradedEmpty,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw e;
    }
    if (e instanceof Error && e.name === 'AbortError') {
      throw e;
    }
    const message = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, kind: 'network', correlationId, message };
  }
}
