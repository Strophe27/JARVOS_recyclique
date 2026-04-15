import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

/**
 * `POST /v1/activity/ping` — aligné backend `recyclic_api.api.api_v1.endpoints.activity` (non exposé
 * dans le bundle OpenAPI reviewable courant ; voir legacy `useSessionHeartbeat` / doc architecture).
 * Met à jour la présence « en ligne » (Redis via `ActivityService`).
 */
export async function postActivityPing(auth: Pick<AuthContextPort, 'getAccessToken'>): Promise<boolean> {
  const token = auth.getAccessToken?.()?.trim();
  if (!token) return false;

  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/activity/ping`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
